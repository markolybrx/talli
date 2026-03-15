import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Task } from "@/types";
import { isWithin12Hours, isOverdue } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tasks, workspaceName } = await req.json();
  if (!tasks || !Array.isArray(tasks)) return NextResponse.json({ error: "tasks array required" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("full_name").eq("id", session.user.id).single();
  const userName = profile?.full_name?.split(" ")[0] ?? "there";

  const urgent = tasks.filter((t: Task) => t.status === "urgent");
  const pending = tasks.filter((t: Task) => t.status === "pending");
  const completed = tasks.filter((t: Task) => t.status === "completed");
  const dueSoon = tasks.filter((t: Task) => t.due_date && isWithin12Hours(t.due_date) && t.status !== "completed");
  const overdue = tasks.filter((t: Task) => t.due_date && isOverdue(t.due_date) && t.status !== "completed");
  const allDone = tasks.length > 0 && completed.length === tasks.length;
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const taskData = {
    total: tasks.length,
    urgent: urgent.length,
    urgentTitles: urgent.slice(0, 3).map((t: Task) => t.title),
    pending: pending.length,
    completed: completed.length,
    dueSoon: dueSoon.length,
    dueSoonTitles: dueSoon.slice(0, 2).map((t: Task) => t.title),
    overdue: overdue.length,
    overdueTitles: overdue.slice(0, 2).map((t: Task) => t.title),
    allCompleted: allDone,
  };

  const prompt = `You are a warm, friendly AI assistant named Talli helping ${userName} manage their tasks at ${workspaceName || "their workspace"}.

Current task snapshot:
${JSON.stringify(taskData, null, 2)}

Time of day: ${timeOfDay}

Write a short, personal 2-3 sentence briefing for ${userName}. Rules:
- Sound like a supportive, smart colleague — not a robot or a corporate tool
- If all tasks are completed, genuinely celebrate and compliment them by name — be warm and enthusiastic
- If there are overdue tasks, mention them by name with a friendly but clear nudge
- If things are manageable, be encouraging and specific
- Use their first name once naturally
- Reference specific task names when relevant
- Under 65 words
- No markdown, no bullet points, plain conversational sentences only
- Do not start the message with "Good ${timeOfDay}" — be more creative`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 140 },
        }),
      }
    );
    if (!response.ok) throw new Error("Gemini error");
    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
    return NextResponse.json({ summary, stats: taskData });
  } catch {
    const fallback = allDone
      ? `Incredible work, ${userName} — every task is marked complete. The board is spotless.`
      : `Hey ${userName}, you have ${urgent.length} urgent and ${pending.length} pending tasks right now.${overdue.length > 0 ? ` "${overdue[0].title}" is overdue and needs attention.` : ""}`;
    return NextResponse.json({ summary: fallback, stats: taskData });
  }
}
