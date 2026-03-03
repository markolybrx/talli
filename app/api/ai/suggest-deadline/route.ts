import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, priority, category } = await req.json();

  const prompt = `Based on this task, suggest a realistic due date.

Task: "${title}"
Priority: ${priority}
Category: ${category}
Today's date: ${new Date().toISOString().split("T")[0]}

Consider:
- High priority = 1-3 days
- Medium priority = 3-7 days
- Low priority = 1-2 weeks

Return ONLY valid JSON (no markdown): {"suggested_date": "YYYY-MM-DD", "reason": "brief explanation"}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 100 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json(result);
  } catch {
    const days = priority === "high" ? 2 : priority === "medium" ? 5 : 10;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return NextResponse.json({
      suggested_date: date.toISOString().split("T")[0],
      reason: `Based on ${priority} priority`,
    });
  }
}
