// lib/ai.ts
// ─────────────────────────────────────────────────────────────
// Talli AI Client — Gemini-only model routing layer
// Primary : Gemini 2.0 Flash (speed + generous free tier)
// Research: Gemini 2.0 Flash + Google Search grounding
// JSON    : Gemini native responseMimeType application/json
// ─────────────────────────────────────────────────────────────

export type TaskType =
  | "research"
  | "writing"
  | "planning"
  | "review"
  | "blocked"
  | "general";

export const AI_ROUTES: Record<string, { useSearch: boolean }> = {
  classify:     { useSearch: false },
  summarize:    { useSearch: false },
  research:     { useSearch: true  },
  expand:       { useSearch: false },
  smart_create: { useSearch: false },
  workload:     { useSearch: false },
  bottleneck:   { useSearch: false },
  sprint_retro: { useSearch: false },
  due_nudge:    { useSearch: false },
  weekly_recap: { useSearch: false },
  standup:      { useSearch: false },
};

export type AIFeature = keyof typeof AI_ROUTES;

export interface AIRequest {
  feature: AIFeature;
  prompt: string;
  systemPrompt?: string;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  feature: AIFeature;
  cached: boolean;
  error?: string;
}

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function callGemini(request: AIRequest, useSearch: boolean): Promise<string> {
  const apiKey = getEnv("GEMINI_API_KEY");
  const model  = "gemini-2.0-flash";
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const tools = useSearch ? [{ googleSearch: {} }] : undefined;

  const body = {
    contents: [
      ...(request.systemPrompt
        ? [
            { role: "user",  parts: [{ text: request.systemPrompt }] },
            { role: "model", parts: [{ text: "Understood. I will follow those instructions." }] },
          ]
        : []),
      { role: "user", parts: [{ text: request.prompt }] },
    ],
    generationConfig: {
      maxOutputTokens: request.maxTokens  ?? 1024,
      temperature:     request.temperature ?? 0.7,
      ...(request.jsonMode
        ? { responseMimeType: "application/json" }
        : {}),
    },
    ...(tools ? { tools } : {}),
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

export async function ai(request: AIRequest): Promise<AIResponse> {
  const route     = AI_ROUTES[request.feature] ?? { useSearch: false };
  const useSearch = route.useSearch;

  try {
    const content = await callGemini(request, useSearch);
    return {
      content,
      model:   useSearch ? "gemini-2.0-flash (grounded search)" : "gemini-2.0-flash",
      feature: request.feature,
      cached:  false,
    };
  } catch (error) {
    console.error(`[ai] Gemini call failed for feature "${request.feature}":`, error);
    return {
      content: "",
      model:   "none",
      feature: request.feature,
      cached:  false,
      error:   "AI unavailable. Please try again shortly.",
    };
  }
}

export async function classifyTask(
  title:        string,
  description?: string
): Promise<TaskType> {
  const prompt = `Classify this task into exactly one category.

Task title: "${title}"
${description ? `Task description: "${description}"` : ""}

Categories:
- research  : finding information, investigating, comparing, analysing
- writing   : drafting, writing, documenting, creating content
- planning  : strategising, roadmapping, structuring, outlining
- review    : reviewing, checking, approving, validating
- blocked   : has blocking dependencies, waiting on something external
- general   : anything else

Respond with ONLY the single category word. No punctuation, no explanation.`;

  const response = await ai({ feature: "classify", prompt, maxTokens: 10, temperature: 0.1 });
  const raw      = response.content.trim().toLowerCase() as TaskType;
  const valid: TaskType[] = ["research","writing","planning","review","blocked","general"];
  return valid.includes(raw) ? raw : "general";
}

export async function generateResearchBrief(
  taskTitle:        string,
  taskDescription?: string
): Promise<string> {
  const prompt = `You are a research assistant helping a professional complete an urgent task.

Task: "${taskTitle}"
${taskDescription ? `Context: "${taskDescription}"` : ""}

Using Google Search, find the most relevant and current information for this task.
Return a structured brief:
1. A 2–3 sentence summary of key findings
2. 3–5 bullet points of directly actionable insights
3. 2–3 recommended sources or next steps

Be concise. Focus only on what helps the user complete this specific task today.`;

  const response = await ai({ feature: "research", prompt, maxTokens: 1024, temperature: 0.3 });
  return response.error ? "" : response.content;
}

export async function parseNaturalLanguageTask(input: string): Promise<{
  title:               string;
  description?:        string;
  priority?:           "low" | "medium" | "high" | "urgent";
  due_date?:           string;
  tags?:               string[];
  is_recurring?:       boolean;
  recurrence_pattern?: string;
} | null> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `Parse this natural language task request into structured data.

Today's date: ${today}
User input: "${input}"

Return a JSON object with these fields (omit fields not mentioned):
{
  "title": "concise task title",
  "description": "optional longer description",
  "priority": "low" | "medium" | "high" | "urgent",
  "due_date": "YYYY-MM-DD or null",
  "tags": ["tag1", "tag2"],
  "is_recurring": true | false,
  "recurrence_pattern": "daily" | "weekly" | "monthly" | null
}

Return ONLY valid JSON. No markdown fences, no explanation.`;

  const response = await ai({ feature: "smart_create", prompt, jsonMode: true, maxTokens: 512, temperature: 0.1 });
  if (response.error) return null;
  try {
    return JSON.parse(response.content);
  } catch {
    console.error("[ai] Failed to parse smart_create JSON:", response.content);
    return null;
  }
}

export async function summarizeForFeature(
  feature:       Extract<AIFeature, "summarize"|"workload"|"bottleneck"|"sprint_retro"|"weekly_recap"|"standup">,
  prompt:        string,
  systemPrompt?: string
): Promise<string> {
  const response = await ai({ feature, prompt, systemPrompt, maxTokens: 2048 });
  return response.error ? "" : response.content;
}
