import { NextResponse } from "next/server";
import { hasLiveProvider } from "@/lib/ai/classify";

export const runtime = "nodejs";

export async function GET() {
  const live = await hasLiveProvider();
  return NextResponse.json(
    {
      live,
      providers: { team: live },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
