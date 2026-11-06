import type { AIResult } from "../types";
import { buildSystemPrompt } from "./prompt";
import type { Language } from "../types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; status?: string };
}

export async function classifyWithGemini(
  imageBase64: string,
  mimeType: string,
  language: Language,
): Promise<AIResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY!;
  const model = DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildSystemPrompt(language) }],
      },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: "Identify the dominant object and its material. Respond with JSON only." },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as GeminiResponse | null;
    const detail = body?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }
  return JSON.parse(text) as AIResult;
}
