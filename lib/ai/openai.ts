import type { AIResult, Language } from "../types";
import { buildSystemPrompt } from "./prompt";

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

interface OpenAIResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

export async function classifyWithOpenAI(
  imageBase64: string,
  mimeType: string,
  language: Language,
): Promise<AIResult> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = DEFAULT_MODEL;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(language) },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify the dominant object and its material. Respond with JSON only." },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as OpenAIResponse | null;
    const detail = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(`OpenAI ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as OpenAIResponse;
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }
  return JSON.parse(text) as AIResult;
}
