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
    .from("sprints")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("start_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { workspaceId, name, goal, startDate, endDate } = await req.json();
  if (!workspaceId || !name) return NextResponse.json({ error: "workspaceId and name required" }, { status: 400 });
  const { data: sprint, error } = await supabaseAdmin
    .from("sprints")
    .insert({ workspace_id: workspaceId, name, goal: goal || null, start_date: startDate || null, end_date: endDate || null, status: "active", created_by: session.user.id })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let aiTasks: string[] = [];
  if (goal) {
    try {
      const prompt = `Suggest 5 task titles for a sprint with this goal: "${goal}"\nReturn ONLY valid JSON: {"tasks": ["title1", "title2", ...]}`;
      const text = await callGemini(prompt, { temperature: 0.7, maxTokens: 200 });
      const parsed = JSON.parse(text);
      aiTasks = parsed.tasks ?? [];
    } catch { aiTasks = []; }
  }
  return NextResponse.json({ ...sprint, aiTasks });
}
