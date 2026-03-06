import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, category, priority } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const prompt = `Write a clear, concise task description for the following task.

Task title: "${title}"
${category ? `Category: ${category.replace(/_/g, " ")}` : ""}
${priority ? `Priority: ${priority}` : ""}

Guidelines:
- 2-3 sentences maximum
- Include what needs to be done, any key considerations, and what a successful outcome looks like
- Professional but direct tone
- Plain text only, no bullet points, no markdown`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 120 },
        }),
      }
    );
    const data = await res.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
    return NextResponse.json({ description });
  } catch {
    return NextResponse.json({ description: "" }, { status: 500 });
  }
}
