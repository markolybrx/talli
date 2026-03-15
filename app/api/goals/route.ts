import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini } from "@/lib/ai-cache";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("goals")
    .select("*, key_results(*)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, title, description, dueDate, keyResults } = await req.json();
  if (!workspaceId || !title) return NextResponse.json({ error: "workspaceId and title required" }, { status: 400 });
  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({ workspace_id: workspaceId, title, description: description || null, due_date: dueDate || null, status: "on_track", progress: 0, created_by: session.user.id })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let krList = keyResults;
  if (!krList?.length) {
    try {
      const prompt = `Suggest 3 key results for this goal: "${title}"${description ? ` - ${description}` : ""}\nReturn ONLY valid JSON: {"keyResults": ["title1", "title2", "title3"]}`;
      const text = await callGemini(prompt, { temperature: 0.7, maxTokens: 200 });
      const parsed = JSON.parse(text);
      krList = parsed.keyResults?.map((t: string, i: number) => ({ title: t, progress: 0, order: i }));
    } catch { krList = []; }
  }
  if (krList?.length) {
    await supabaseAdmin.from("key_results").insert(krList.map((k: any) => ({ ...k, goal_id: (goal as any).id })));
  }
  const { data: fullGoal } = await supabaseAdmin.from("goals").select("*, key_results(*)").eq("id", (goal as any).id).single();
  return NextResponse.json(fullGoal);
}
