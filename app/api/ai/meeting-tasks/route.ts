import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notes, members } = await req.json();
  if (!notes?.trim()) return NextResponse.json({ error: "notes required" }, { status: 400 });

  const membersStr = (members ?? [])
    .map((m: any) => m.profile?.full_name ?? m.profile?.email)
    .filter(Boolean)
    .join(", ");

  const prompt = `You are an expert at extracting action items from meeting notes.

Meeting notes:
"""
${notes.slice(0, 3000)}
"""

Team members: ${membersStr || "none listed"}
Today: ${new Date().toISOString().split("T")[0]}

Extract all action items and tasks from these notes. For each task identify:
- What needs to be done (clear, specific title)
- Who is responsible (match to team members if mentioned, otherwise leave blank)
- Priority based on language used (urgent/important = high, normal = medium, someday/nice to have = low)
- Due date if mentioned (format YYYY-MM-DD, otherwise leave blank)

Return ONLY valid JSON array, no markdown, no explanation:
[
  {
    "title": "task title",
    "description": "brief context from notes",
    "priority": "high|medium|low",
    "assigned_to_name": "name or empty string",
    "due_date": "YYYY-MM-DD or empty string",
    "category": "recruitment_marketing|recruitment_sourcing|recruitment_agent_hiring|others"
  }
]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const tasks = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ tasks: Array.isArray(tasks) ? tasks.slice(0, 15) : [] });
  } catch {
    return NextResponse.json({ tasks: [] }, { status: 500 });
  }
}
