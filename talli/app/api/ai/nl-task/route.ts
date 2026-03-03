import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { input, members } = await req.json();
  if (!input) return NextResponse.json({ error: "input required" }, { status: 400 });

  const membersStr = members?.map((m: { profile: { full_name: string | null; email: string } }) =>
    m.profile.full_name ?? m.profile.email
  ).join(", ") || "none";

  const prompt = `Parse this task description into structured data: "${input}"

Team members: ${membersStr}
Today: ${new Date().toISOString().split("T")[0]}

Return ONLY valid JSON (no markdown):
{"title":"...","description":"...","priority":"high|medium|low","category":"recruitment_marketing|recruitment_sourcing|recruitment_agent_hiring|others","due_date":"YYYY-MM-DDTHH:mm or empty","assigned_to_name":"name or empty","tags":[],"subtasks":[]}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ parsed });
  } catch {
    return NextResponse.json({ error: "Failed to parse task" }, { status: 500 });
  }
}
