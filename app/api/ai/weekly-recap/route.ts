import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, workspaceName } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("full_name").eq("id", session.user.id).single();
  const userName = profile?.full_name?.split(" ")[0] ?? "there";

  // Get tasks from last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: tasksRaw } = await supabaseAdmin
    .from("tasks")
    .select("title, status, priority, category, created_at, updated_at, assigned_to")
    .eq("workspace_id", workspaceId)
    .gte("created_at", weekAgo.toISOString());

  const { data: membersRaw } = await supabaseAdmin
    .from("workspace_members")
    .select("user_id, profile:user_id(full_name, email)")
    .eq("workspace_id", workspaceId);

  const tasks: any[] = tasksRaw ?? [];
  const members: any[] = membersRaw ?? [];

  const completed = tasks.filter((t: any) => t.status === "completed");
  const pending = tasks.filter((t: any) => t.status === "pending");
  const urgent = tasks.filter((t: any) => t.status === "urgent");

  // Per-member breakdown
  const memberBreakdown = members.map((m: any) => {
    const mine = tasks.filter((t: any) => t.assigned_to === m.user_id);
    return {
      name: m.profile?.full_name ?? m.profile?.email ?? "Unknown",
      total: mine.length,
      completed: mine.filter((t: any) => t.status === "completed").length,
    };
  }).filter((m: any) => m.total > 0);

  const prompt = `You are writing a warm, honest weekly retrospective for ${userName} at ${workspaceName || "their workspace"}.

This week's data:
- Tasks created: ${tasks.length}
- Completed: ${completed.length}
- Still pending: ${pending.length}
- Urgent/unresolved: ${urgent.length}
- Completion rate: ${tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0}%

Completed tasks: ${completed.slice(0, 5).map((t: any) => `"${t.title}"`).join(", ") || "none"}
Still urgent: ${urgent.slice(0, 3).map((t: any) => `"${t.title}"`).join(", ") || "none"}

Team performance:
${memberBreakdown.map((m: any) => `- ${m.name}: ${m.completed}/${m.total} tasks completed`).join("\n") || "No assignments this week"}

Write a 4-5 sentence retrospective. Be warm and personal — celebrate wins by name, be honest about what didn't get done, and give one specific suggestion for next week. Address ${userName} directly. Plain text only, no markdown, no bullet points.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
        }),
      }
    );
    const data = await res.json();
    const recap = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return NextResponse.json({ recap, stats: { total: tasks.length, completed: completed.length, pending: pending.length, urgent: urgent.length } });
  } catch {
    return NextResponse.json({
      recap: `This week the team created ${tasks.length} tasks and completed ${completed.length}. There are ${pending.length} pending and ${urgent.length} urgent items heading into next week.`,
      stats: { total: tasks.length, completed: completed.length, pending: pending.length, urgent: urgent.length },
    });
  }
}
