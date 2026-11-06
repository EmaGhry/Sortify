import { z } from "zod";
import { MATERIALS, type AIResult, type AnalysisResult, type Language, type Material } from "../types";
import { profileOf } from "../materials";
import { classifyWithGemini } from "./gemini";
import { classifyWithOpenAI } from "./openai";

export class ProviderUnavailableError extends Error {}

const aiResultSchema = z.object({
  material: z.string().transform((v) => {
    const normalized = v.toUpperCase().trim().replace(/\s+/g, "_");
    return (MATERIALS.includes(normalized as Material) ? normalized : "OTHER") as Material;
  }),
  item_name: z.string().min(1).max(120),
  confidence: z.coerce.number().min(0).max(1),
  recyclable: z.coerce.boolean(),
  tips: z.array(z.string().max(160)).max(4).default([]),
  eco_fact: z.string().max(300).optional(),
  reasoning: z.string().max(300).optional(),
});

const rawSchema = z.record(z.string(), z.unknown());

export interface AnalyzeInput {
  imageBase64: string;
  mimeType: string;
  language: Language;
}

export interface AnalyzeOutput {
  result: AnalysisResult;
  provider: "gemini" | "openai";
}

export function hasLiveProvider(): boolean {
  return Boolean(process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY);
}

function parseAIResult(payload: unknown): AIResult {
  const obj = rawSchema.safeParse(payload);
  if (!obj.success) throw new Error("AI response was not a JSON object");
  const parsed = aiResultSchema.safeParse(obj.data);
  if (!parsed.success) {
    throw new Error(`AI response failed validation: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  const d = parsed.data;
  return {
    material: d.material,
    itemName: d.item_name,
    confidence: d.confidence,
    recyclable: d.recyclable,
    tips: d.tips,
    ecoFact: d.eco_fact,
    reasoning: d.reasoning,
  };
}

/**
 * Server-side enrichment: category-specific guidance comes from our own
 * knowledge base (never from the model) for consistent bin colours & advice.
 */
function enrich(ai: AIResult, provider: "gemini" | "openai", demo: boolean): AnalysisResult {
  const profile = profileOf(ai.material);
  return {
    id: `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    provider,
    demo,
    itemName: ai.itemName,
    confidence: ai.confidence,
    recyclable: ai.recyclable,
    reasoning: ai.reasoning,
    aiTips: ai.tips,
    ecoFact: ai.ecoFact,
    material: ai.material,
    binLabel: profile.bin.label.en, // client re-localizes from material id
    binColor: profile.bin.color,
    instructions: profile.instructions.en, // client re-localizes
    co2SavedG: ai.recyclable ? profile.co2PerItemG : 0,
    points: 10 + (ai.recyclable ? 10 : 0),
  };
}

export async function analyzeImage(input: AnalyzeInput): Promise<AnalyzeOutput> {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let provider: "gemini" | "openai";
  let ai: AIResult;

  if (geminiKey) {
    provider = "gemini";
    ai = parseAIResult(await classifyWithGemini(input.imageBase64, input.mimeType, input.language));
  } else if (openaiKey) {
    provider = "openai";
    ai = parseAIResult(await classifyWithOpenAI(input.imageBase64, input.mimeType, input.language));
  } else {
    throw new ProviderUnavailableError(
      "No AI provider configured. Add GOOGLE_AI_API_KEY or OPENAI_API_KEY to .env.local",
    );
  }

  // Defensive floor: never claim near-certain confidence on a guess.
  ai.confidence = Math.min(ai.confidence, ai.material === "OTHER" ? 0.5 : 1);
  return { result: enrich(ai, provider, false), provider };
}
