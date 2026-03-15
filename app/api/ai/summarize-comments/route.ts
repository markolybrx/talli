import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callGemini } from "@/lib/ai-cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { comments } = await req.json();
  if (!comments?.length || comments.length < 5) {
    return NextResponse.json({ error: "Need at least 5 comments" }, { status: 400 });
  }

  const thread = comments
    .map((c: any) => `${c.author_name ?? "Someone"}: ${c.content}`)
    .join("\n");

  const prompt = `Summarize this task comment thread in 2-3 sentences.

${thread}

Focus on: decisions made, action items, blockers. Be concise.
Return ONLY valid JSON: {"summary": "2-3 sentences"}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.3, maxTokens: 150 });
    const result = JSON.parse(text);
    return NextResponse.json({ summary: result.summary ?? "" });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
