import sharp from "sharp";
import { z } from "zod";
import { profileOf } from "../materials";
import type { AnalysisResult, Language } from "../types";

const stationUrl = "http://127.0.0.1:8765";
const materials = {
  glass: "GLASS",
  metal: "METAL",
  plastic: "PLASTIC",
  paper: "PAPER",
  other: "OTHER",
} as const;
const predictionSchema = z.object({
  destination: z.enum(["glass", "metal", "plastic", "paper", "other"]),
  score: z.number().min(0).max(1),
});

export class ProviderUnavailableError extends Error {}

export async function hasLiveProvider(): Promise<boolean> {
  if (process.env.SORTIFY_BENCH !== "1") return false;
  try {
    const response = await fetch(stationUrl + "/status", {
      cache: "no-store",
      headers: { "X-Sortify-Bench": "1" },
      signal: AbortSignal.timeout(1500),
    });
    return response.ok && (await response.json()).model_source === "network";
  } catch {
    return false;
  }
}

export async function analyzeImage(input: {
  imageBase64: string;
  language: Language;
}): Promise<{ result: AnalysisResult }> {
  if (process.env.SORTIFY_BENCH !== "1") throw new ProviderUnavailableError();
  const jpeg = await sharp(Buffer.from(input.imageBase64, "base64"), { limitInputPixels: 16_000_000 })
    .rotate()
    .resize(900, 900, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  let response: Response;
  try {
    response = await fetch(stationUrl + "/classify", {
      method: "POST",
      headers: { "Content-Type": "image/jpeg", "X-Sortify-Bench": "1" },
      body: new Uint8Array(jpeg),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new ProviderUnavailableError();
  }
  if (response.status === 503) throw new ProviderUnavailableError();
  if (!response.ok) throw new Error("The team model could not classify the image.");

  const prediction = predictionSchema.parse(await response.json());
  const material = materials[prediction.destination];
  const profile = profileOf(material);
  const recyclable = material !== "OTHER";
  return {
    result: {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      provider: "team",
      demo: false,
      itemName: profile.label[input.language],
      confidence: prediction.score,
      recyclable,
      aiTips: [],
      material,
      binLabel: profile.bin.label[input.language],
      binColor: profile.bin.color,
      instructions: profile.instructions[input.language],
      co2SavedG: recyclable ? profile.co2PerItemG : 0,
      points: 10 + (recyclable ? 10 : 0),
    },
  };
}
