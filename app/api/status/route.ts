import { NextResponse } from "next/server";
import { hasLiveProvider } from "@/lib/ai/classify";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      live: hasLiveProvider(),
      providers: {
        gemini: Boolean(process.env.GOOGLE_AI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
