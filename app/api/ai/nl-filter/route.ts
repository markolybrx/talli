import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { input, members } = await req.json();
  if (!input?.trim()) return NextResponse.json({ error: "input required" }, { status: 400 });

  const membersStr = (members ?? [])
    .map((m: any) => m.profile?.full_name ?? m.profile?.email)
    .filter(Boolean).join(", ");

  const today = new Date().toISOString().split("T")[0];

  const prompt = `You are a filter parser for a task management app. Parse this natural language filter query into structured filters.

Query: "${input}"
Team members: ${membersStr || "none"}
Today: ${today}

Return ONLY valid JSON, no markdown:
{
  "priority": "high|medium|low or null",
  "category": "recruitment_marketing|recruitment_sourcing|recruitment_agent_hiring|others or null",
  "assignee_name": "exact name from team members list or null",
  "dueSoon": true or false,
  "overdue": true or false,
  "status": "urgent|pending|completed or null",
  "label": "short human-readable description of the filter e.g. 'High priority + overdue'"
}

Rules:
- Only set fields that are clearly mentioned or implied
- "urgent" queries map to priority:high OR status:urgent depending on context
- "due this week" or "due soon" maps to dueSoon:true
- "late" or "overdue" or "past due" maps to overdue:true
- Match assignee_name loosely to the team members list`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ filters: parsed });
  } catch {
    return NextResponse.json({ filters: null }, { status: 500 });
  }
}
