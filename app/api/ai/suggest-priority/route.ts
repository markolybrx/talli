import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, due_date, category } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const today = new Date();
  const dueInfo = due_date
    ? `Due: ${due_date} (${Math.ceil((new Date(due_date).getTime() - today.getTime()) / 86400000)} days away)`
    : "No due date";

  const prompt = `Based on this task, suggest the appropriate priority level.

Task: "${title}"
${dueInfo}
${category ? `Category: ${category}` : ""}

Consider urgency, impact, and timing. Return ONLY valid JSON with no markdown:
{"priority": "high|medium|low", "reason": "one short sentence explaining why"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    const priority = ["high", "medium", "low"].includes(result.priority) ? result.priority : "medium";
    return NextResponse.json({ priority, reason: result.reason ?? "" });
  } catch {
    return NextResponse.json({ priority: "medium", reason: "" }, { status: 500 });
  }
}
