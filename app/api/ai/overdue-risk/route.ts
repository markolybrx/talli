import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOverdue, isWithin12Hours } from "@/lib/utils";
import type { Task } from "@/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tasks } = await req.json();
  if (!tasks?.length) return NextResponse.json({ risks: [] });

  const atRisk = tasks.filter((t: Task) =>
    t.status !== "completed" && (
      (t.due_date && isWithin12Hours(t.due_date)) ||
      (t.due_date && isOverdue(t.due_date)) ||
      (t.priority === "high" && !t.due_date)
    )
  );

  if (atRisk.length === 0) return NextResponse.json({ risks: [], summary: "No tasks are currently at risk." });

  const prompt = `Analyze these tasks and identify overdue risk levels. For each task provide a brief risk assessment.

Tasks at risk:
${atRisk.map((t: Task) => `- "${t.title}" | Priority: ${t.priority} | Due: ${t.due_date ?? "no date"} | Status: ${t.status}`).join("\n")}

Return ONLY valid JSON array (no markdown):
[{"task_title": "...", "risk_level": "critical|high|medium", "reason": "brief reason"}]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const risks = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ risks });
  } catch {
    return NextResponse.json({ risks: atRisk.map((t: Task) => ({ task_title: t.title, risk_level: "high", reason: "Approaching or past due date" })) });
  }
}
