import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callGemini } from "@/lib/ai-cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, category, priority, subtasks } = await req.json();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const prompt = `Estimate the effort required for this task.

Title: "${title}"
${
    description ? `Description: "${description}"` : ""
  }
${category ? `Category: ${category}` : ""}
${priority ? `Priority: ${priority}` : ""}
${
    subtasks?.length
      ? `Subtasks (${subtasks.length}): ${subtasks.map((s: any) => s.title).join(", ")}`
      : ""
  }

Return ONLY valid JSON:
{"hours": <number>, "confidence": "low|medium|high", "rationale": "<-20 words->"}

Rules:
- hours must be one of: 0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 40
- Be realistic for a recruitment/HR workflow
- Subtasks add to estimate` ;

  try {
    const text = await callGemini(prompt, { temperature: 0.2, maxTokens: 150 });
    const result = JSON.parse(text);

    const validHours = [0.25, 0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 40];
    const hours = validHours.includes(result.hours) ? result.hours : 2;
    return NextResponse.json({
      hours,
      confidence: result.confidence ?? "medium",
      rationale: result.rationale ?? "",
    });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
