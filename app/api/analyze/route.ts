import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeImage, ProviderUnavailableError } from "@/lib/ai/classify";
import { profileOf } from "@/lib/materials";
import { clientIp, rateLimit, AI_LIMITS, sameOriginOrExternal, guardHost } from "@/lib/rate-limit";
import type { Language } from "@/lib/types";

export const runtime = "nodejs";

const MAX_BASE64_CHARS = 10_700_000; // ~8 MB binary
const MAX_BODY_BYTES = 11_000_000; // reject early, before parsing megabytes of JSON
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const bodySchema = z.object({
  image: z.string().min(100).max(MAX_BASE64_CHARS),
  mimeType: z.string().max(100),
  language: z.enum(["ro", "en", "de", "hu", "fr", "it", "es"]).default("en"),
});

function limited(req: Request) {
  const ip = clientIp(req);
  // Direct (unproxied) traffic has no client IP — one shared, generous bucket.
  const isDirect = ip === "unknown";
  const perIp = rateLimit(
    isDirect ? "ai:direct" : `ai:${ip}`,
    isDirect ? AI_LIMITS.directPerMinute : AI_LIMITS.perIpPerMinute,
    60_000,
  );
  if (!perIp.ok) return perIp;
  const global = rateLimit("ai:global", AI_LIMITS.globalPerDay, 24 * 60 * 60_000);
  if (!global.ok) return global;
  return perIp;
}

function tooMany(verdict: { retryAfterSec: number }) {
  return NextResponse.json(
    { error: "RATE_LIMIT" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, verdict.retryAfterSec)) } },
  );
}

/** Strips a data-URL prefix if present; returns {base64, mimeType}. */
function normalizeImage(input: string, declaredMime: string): { base64: string; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(input);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(input.slice(0, 512))) return null;
  return { mimeType: declaredMime, base64: input };
}

export async function POST(req: Request) {
  // Cheap guards first: reject oversized bodies and abusive clients before
  // parsing anything into memory.
  if (!guardHost(req) || !sameOriginOrExternal(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }
  // No content-length + chunked = unbounded stream; legitimate clients
  // (browsers/fetch, curl -d) always declare content-length.
  const transferEncoding = req.headers.get("transfer-encoding") ?? "";
  if (!contentLength && transferEncoding.toLowerCase().includes("chunked")) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }

  const verdict = limited(req);
  if (!verdict.ok) return tooMany(verdict);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const img = normalizeImage(parsed.data.image, parsed.data.mimeType);
  if (!img) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  if (!ALLOWED_MIME.includes(img.mimeType)) {
    return NextResponse.json({ error: "BAD_TYPE" }, { status: 415 });
  }
  if (img.base64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "TOO_LARGE" }, { status: 413 });
  }

  const language: Language = parsed.data.language;

  try {
    const { result } = await analyzeImage({
      imageBase64: img.base64,
      mimeType: img.mimeType,
      language,
    });

    // Localize enrichment fields server-side for the requested language.
    const profile = profileOf(result.material);
    return NextResponse.json({
      ...result,
      binLabel: profile.bin.label[language],
      instructions: profile.instructions[language],
    });
  } catch (err) {
    if (err instanceof ProviderUnavailableError) {
      return NextResponse.json({ error: "NO_PROVIDER" }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/429|rate.?limit/i.test(message)) {
      return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
    }
    console.error("[analyze]", message);
    // Upstream error details stay server-side in production — they can echo
    // payload fragments and reveal provider internals.
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json(
      { error: "PROVIDER", ...(isDev ? { detail: message.slice(0, 300) } : {}) },
      { status: 502 },
    );
  }
}
