import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callGemini } from "@/lib/ai-cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskTitle, taskDescription, category, memberStats } = await req.json();
  if (!taskTitle || !memberStats?.length) {
    return NextResponse.json({ error: "taskTitle and memberStats required" }, { status: 400 });
  }

  const memberSummary = memberStats
    .map((m: any) => `- ${m.name}: ${m.total} tasks (${m.urgent} urgent, ${m.completed} done this week)`)
    .join("\n");

  const prompt = `You are assigning a work task to the best available team member.

Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ""}
${category ? `Category: ${category}` : ""}

Team workload:
${memberSummary}

Choose the best person considering: lowest current workload, fewest urgent tasks, recent completion momentum.
Return ONLY valid JSON with no markdown:
{"name": "exact name from list", "reason": "one short sentence max 12 words"}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.2, maxTokens: 100 });
    const result = JSON.parse(text);

    const matched = memberStats.find((m: any) =>
      m.name?.toLowerCase() === result.name?.toLowerCase()
    );
    if (!matched) return NextResponse.json({ error: "No match" }, { status: 422 });

    return NextResponse.json({
      assignee_id: matched.user_id,
      name: matched.name,
      avatar_url: matched.avatar_url ?? null,
      reason: result.reason ?? "",
    });
  } catch {
    return NextResponse.json({ error: "AI unavailable" }, { status: 500 });
  }
}
