import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, category } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const prompt = `You are a task planning assistant. Break down this task into 3-5 specific, actionable subtasks.

Task title: "${title}"
${description ? `Description: "${description}"` : ""}
${category ? `Category: ${category}` : ""}

Return ONLY a valid JSON array of strings. No markdown, no explanation, no backticks.
Example: ["Research competitors","Draft outline","Review with team","Publish final version"]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 250 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const subtasks = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ subtasks: Array.isArray(subtasks) ? subtasks.slice(0, 5) : [] });
  } catch {
    return NextResponse.json({ subtasks: [] }, { status: 500 });
  }
}
