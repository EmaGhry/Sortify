import { NextResponse } from "next/server";
import { z } from "zod";
import { demoResult } from "@/lib/ai/demo";
import { MATERIALS } from "@/lib/types";
import { clientIp, rateLimit, AI_LIMITS, sameOriginOrExternal, guardHost } from "@/lib/rate-limit";

export const runtime = "nodejs";

const bodySchema = z.object({
  language: z.enum(["ro", "en", "de", "hu", "fr", "it", "es"]).default("en"),
  pick: z.enum(MATERIALS as [string, ...string[]]).optional(),
});

export async function POST(req: Request) {
  if (!guardHost(req) || !sameOriginOrExternal(req)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const verdict = rateLimit(`demo:${clientIp(req)}`, AI_LIMITS.demoPerIpPerMinute, 60_000);
  if (!verdict.ok) {
    return NextResponse.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, verdict.retryAfterSec)) } },
    );
  }

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    /* empty body allowed */
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  return NextResponse.json(demoResult(parsed.data.language, parsed.data.pick as never));
}
