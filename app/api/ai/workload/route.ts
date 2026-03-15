import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberStats } = await req.json();
  if (!memberStats?.length) return NextResponse.json({ insights: [] });

  const statsStr = memberStats.map((m: any) =>
    `${m.name}: ${m.total} tasks total, ${m.urgent} urgent, ${m.completed} completed, ${m.timeLogged}min logged`
  ).join("\n");

  const prompt = `You are a workload analyst for a recruitment team. Analyse this team's task data and provide brief, actionable insights.

Team data:
${statsStr}

Return ONLY a JSON array of up to 3 insights (no markdown):
[
  {
    "type": "warning|tip|praise",
    "member": "name or null for team-wide",
    "message": "one concise sentence (max 12 words)"
  }
]

Focus on: overload warnings, uneven distribution, praise for high completion, idle members.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const insights = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ insights: Array.isArray(insights) ? insights : [] });
  } catch {
    return NextResponse.json({ insights: [] });
  }
}
