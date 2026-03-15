import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini } from "@/lib/ai-cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, workspaceId } = await req.json();
  if (!title || !workspaceId) return NextResponse.json({ duplicates: [] });

  const { data: existing } = await supabaseAdmin
    .from("tasks")
    .select("id, title")
    .eq("workspace_id", workspaceId)
    .neq("status", "completed")
    .limit(80);

  if (!existing?.length) return NextResponse.json({ duplicates: [] });

  const list = existing.map((e: any) => `- [${e.id}] ${e.title}`).join("\n");

  const prompt = `Find tasks semantically similar to the new task.

New task: "${title}"

Existing tasks:
${list}

Return ONLY valid JSON with no markdown:
{"duplicates": [{"id": "task-id", "title": "task-title", "similarity": 0.0-1.0}]}

Only include tasks with similarity > 0.7. Max return 3.`;

  try {
    const text = await callGemini(prompt, { temperature: 0.1, maxTokens: 200 });
    const result = JSON.parse(text);
    return NextResponse.json({ duplicates: result.duplicates ?? [] });
  } catch {
    return NextResponse.json({ duplicates: [] });
  }
}
