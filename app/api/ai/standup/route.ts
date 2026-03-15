import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { callGemini, getOrGenerateUserCache } from "@/lib/ai-cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, force } = await req.json();
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  // Date-keyed cache key — expires naturally at next day
  const today = new Date().toISOString().split("T")[0];
  const featureKey = `standup:${workspaceId}:${today}`;

  // If force=true (user hit Regenerate), skip cache
  if (!force) {
    const { data: cached } = await supabaseAdmin
      .from("ai_user_cache")
      .select("result, generated_at")
      .eq("user_id", session.user.id)
      .eq("feature_key", featureKey)
      .single()
      .catch(() => ({ data: null }));

    if (cached) return NextResponse.json(cached.result);
  }

  // Fetch user's tasks
  const [{ data: profile }, { data: myTasks }] = await Promise.all([
    supabaseAdmin.from("profiles").select("full_name").eq("id", session.user.id).single(),
    supabaseAdmin
      .from("tasks")
      .select("title, status, priority, due_date, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const name = (profile as any)?.full_name?.split(" ")[0] ?? "there";
  const tasks: any[] = myTasks ?? [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const completed = tasks.filter(
    (t) => t.status === "completed" && new Date(t.updated_at) > yesterday
  );
  const inProgress = tasks.filter((t) => ["pending", "urgent"].includes(t.status));
  const overdue = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"
  );

  const prompt = `Generate a brief daily standup for ${name}.

Completed yesterday (${completed.length}): ${completed.map((t: any) => `"${t.title}"`).join(", ") || "nothing"}
In progress / today (${inProgress.length}): ${inProgress.slice(0, 5).map((t: any) => `"${t.title}"`).join(", ") || "nothing"}
Overdue (${overdue.length}): ${overdue.map((t: any) => `"${t.title}"`).join(", ") || "none"}

Write a natural, human standup in 3 short bullet points:
1. What I completed
2. What I'm working on today  
3. Any blockers or overdue risks

Keep each bullet under 20 words. Warm, direct tone. No intro sentence.
Return ONLY valid JSON:
{"bullets": ["string", "string", "string"]}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.7, maxTokens: 200 });
    const result = JSON.parse(text);
    if (!Array.isArray(result.bullets)) throw new Error("bad response");

    const standup = { bullets: result.bullets.slice(0, 3), generatedAt: new Date().toISOString() };

    // Cache for rest of day
    await supabaseAdmin.from("ai_user_cache").upsert({
      user_id: session.user.id,
      feature_key: featureKey,
      result: standup,
      generated_at: new Date().toISOString(),
    }, { onConflict: "user_id,feature_key" });

    return NextResponse.json(standup);
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
