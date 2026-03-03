import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Task } from "@/types";
import { isWithin12Hours, isOverdue } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tasks, workspaceName } = await req.json();

  if (!tasks || !Array.isArray(tasks)) {
    return NextResponse.json({ error: "tasks array required" }, { status: 400 });
  }

  const urgent = tasks.filter((t: Task) => t.status === "urgent");
  const pending = tasks.filter((t: Task) => t.status === "pending");
  const completed = tasks.filter((t: Task) => t.status === "completed");
  const dueSoon = tasks.filter(
    (t: Task) => t.due_date && isWithin12Hours(t.due_date) && t.status !== "completed"
  );
  const overdue = tasks.filter(
    (t: Task) => t.due_date && isOverdue(t.due_date) && t.status !== "completed"
  );

  const taskSummary = {
    total: tasks.length,
    urgent: urgent.length,
    pending: pending.length,
    completed: completed.length,
    dueSoon: dueSoon.length,
    overdue: overdue.length,
    urgentTitles: urgent.slice(0, 3).map((t: Task) => t.title),
    dueSoonTitles: dueSoon.slice(0, 3).map((t: Task) => ({
      title: t.title,
      due: t.due_date,
    })),
    overdueTitles: overdue.slice(0, 3).map((t: Task) => t.title),
  };

  const prompt = `You are an AI assistant for ${workspaceName || "a workspace"} task management system called Talli.

Here is the current state of workspace tasks:
${JSON.stringify(taskSummary, null, 2)}

Write a concise, helpful 2-3 sentence summary of the current task situation. 
- Mention urgent items and what's due soon if any
- Flag any overdue tasks
- Keep a professional, direct tone
- Do NOT use markdown, bullet points, or formatting — plain sentences only
- Maximum 60 words`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 120,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

    return NextResponse.json({ summary, stats: taskSummary });
  } catch {
    // Fallback summary if AI fails
    const fallback = `${tasks.length} total tasks — ${urgent.length} urgent, ${pending.length} pending, ${completed.length} completed.${dueSoon.length > 0 ? ` ${dueSoon.length} task${dueSoon.length > 1 ? "s" : ""} due within 12 hours.` : ""}${overdue.length > 0 ? ` ${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue.` : ""}`;
    return NextResponse.json({ summary: fallback, stats: taskSummary });
  }
}
