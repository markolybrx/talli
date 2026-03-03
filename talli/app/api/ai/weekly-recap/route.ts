import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Task } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tasks, workspaceName, members } = await req.json();

  const completed = tasks.filter((t: Task) => t.status === "completed");
  const pending = tasks.filter((t: Task) => t.status === "pending");
  const urgent = tasks.filter((t: Task) => t.status === "urgent");

  const prompt = `Generate a professional weekly recap for the workspace "${workspaceName}".

This week's task summary:
- Completed: ${completed.length} tasks
- Pending: ${pending.length} tasks  
- Urgent: ${urgent.length} tasks
- Total team members: ${members?.length ?? 0}

Completed tasks this week:
${completed.slice(0, 5).map((t: Task) => `- ${t.title}`).join("\n") || "None"}

Write a 3-4 sentence weekly recap in a professional, encouraging tone. Highlight achievements, flag what needs attention next week. Plain text only, no markdown.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
        }),
      }
    );
    const data = await res.json();
    const recap = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ recap });
  } catch {
    return NextResponse.json({
      recap: `This week, the team completed ${completed.length} tasks with ${urgent.length} items still marked urgent. There are ${pending.length} pending tasks heading into next week.`,
    });
  }
}
