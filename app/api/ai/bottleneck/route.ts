import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini, getOrGenerateWorkspaceCache } from "@/lib/ai-cache";

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const result = await getOrGenerateWorkspaceCache(
    workspaceId,
    `bottleneck`,
    1440,
    async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const [{ data: tasks }, { data: workload }] = await Promise.all([
        supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, assigned_to, updated_at")
          .eq("workspace_id", workspaceId)
          .neq("status", "completed")
          .limit(100),
        supabaseAdmin
          .from("tasks")
          .select("assigned_to")
          .eq("workspace_id", workspaceId)
          .neq("status", "completed"),
      ]);

      const overdue = (tasks ?? []).filter(
        (t: any) => t.due_date && new Date(t.due_date) < now
      );
      const dueSoon = (tasks ?? []).filter(
        (t: any) =>
          t.due_date &&
          new Date(t.due_date) >= now &&
          new Date(t.due_date) <= soon
      );
      const unassigned = (tasks ?? []).filter((t: any) => !t.assigned_to);

      const loadMap: Record<string, number> = {};
      (workload ?? []).forEach((t: any) => {
        if (t.assigned_to) loadMap[t.assigned_to] = (loadMap[t.assigned_to] || 0) + 1;
      });
      const overloadedUsers = Object.entries(loadMap)
        .filter(([, count]) => count > 10)
        .map(([id, count]) => ({ id, count }));

      const prompt = `Analyze this workspace and identify key bottlenecks.

Overdue tasks (${overdue.length}): ${overdue.slice(0, 5).map((t: any) => t.title).join(", ")}
Due within 48h (${dueSoon.length}): ${dueSoon.slice(0, 5).map((t: any) => t.title).join(", ")}
Unassigned tasks: ${unassigned.length}
Overloaded users (>10 tasks): ${overloadedUsers.length}

Return ONLY valid JSON:
{"alerts": [{"type": "overdue|due_soon|overloaded|unassigned", "title": "<10 words>", "detail": "<20 words>", "severity": "high|medium|low"}]}
Limit to 5 most important alerts.`;

      const text = await callGemini(prompt, { temperature: 0.2, maxTokens: 400 });
      const parsed = JSON.parse(text);
      return parsed;
    }
  );

  return NextResponse.json(result);
}
