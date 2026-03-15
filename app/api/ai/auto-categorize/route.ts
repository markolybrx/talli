import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callGemini } from "@/lib/ai-cache";

const VALID_CATEGORIES = [
  "recruitment_marketing",
  "recruitment_sourcing",
  "recruitment_agent_hiring",
  "others",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title } = await req.json();
  if (!title || title.length < 4) return NextResponse.json({ category: "others" });

  const prompt = `Classify this task title into exactly one category.

Task: "${title}"

Categories:
- recruitment_marketing: ads, campaigns, social media, employer brand, job posts
- recruitment_sourcing: finding candidates, LinkedIn, CV review, pipelines
- recruitment_agent_hiring: hiring agents, onboarding, contracts, commissions
- others: anything that doesn't clearly fit above

Return ONLY valid JSON: {"category": "category_value"}`;

  try {
    const text = await callGemini(prompt, { temperature: 0.1, maxTokens: 40 });
    const result = JSON.parse(text);
    const category = VALID_CATEGORIES.includes(result.category) ? result.category : "others";
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ category: "others" });
  }
}
