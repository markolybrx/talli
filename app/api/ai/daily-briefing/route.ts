import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isWithin12Hours, isOverdue } from "@/lib/utils";
import type { Task } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tasks, userName } = await req.json();

  const myTasks = tasks.filter((t: Task) => t.assigned_to === session.user!.id && t.status !== "completed");
  const dueSoon = myTasks.filter((t: Task) => t.due_date && isWithin12Hours(t.due_date));
  const overdue = myTasks.filter((t: Task) => t.due_date && isOverdue(t.due_date));
  const urgent = myTasks.filter((t: Task) => t.status === "urgent");

  const prompt = `Generate a personalized daily briefing for ${userName ?? "the user"}.

Their tasks today:
- Total assigned: ${myTasks.length}
- Urgent: ${urgent.length}
- Due within 12 hours: ${dueSoon.length} ${dueSoon.map((t: Task) => `"${t.title}"`).join(", ")}
- Overdue: ${overdue.length} ${overdue.map((t: Task) => `"${t.title}"`).join(", ")}

Write a 2-3 sentence personalized good morning briefing. Be direct and actionable. Use their name if provided. Plain text only.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 150 },
        }),
      }
    );
    const data = await res.json();
    const briefing = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ briefing, stats: { total: myTasks.length, urgent: urgent.length, dueSoon: dueSoon.length, overdue: overdue.length } });
  } catch {
    return NextResponse.json({
      briefing: `Good morning${userName ? ", " + userName : ""}! You have ${myTasks.length} tasks assigned today.${overdue.length > 0 ? ` ${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue.` : ""}`,
      stats: { total: myTasks.length, urgent: urgent.length, dueSoon: dueSoon.length, overdue: overdue.length },
    });
  }
}
