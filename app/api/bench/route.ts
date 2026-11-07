const stationUrl = "http://127.0.0.1:8765";
const maxBodyBytes = 1_000_000;
const localHost = /^(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export const runtime = "nodejs";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function forward(path: string, init?: RequestInit) {
  try {
    const response = await fetch(stationUrl + path, {
      ...init,
      cache: "no-store",
      headers: { ...init?.headers, "X-Sortify-Bench": "1" },
      signal: AbortSignal.timeout(12_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return error("Serviciul local nu răspunde. Verifică terminalul stației înainte de a scana din nou.", 503);
  }
}

export async function GET(request: Request) {
  if (process.env.SORTIFY_BENCH !== "1" || !localHost.test(request.headers.get("host") ?? "")) {
    return error("Modul de banc se activează local cu SORTIFY_BENCH=1.", 404);
  }
  const view = new URL(request.url).searchParams.get("view");
  if (view === "history") return forward("/history");
  if (view === "hardware") return forward("/hardware");
  return forward("/status");
}

export async function POST(request: Request) {
  const host = request.headers.get("host") ?? "";
  if (process.env.SORTIFY_BENCH !== "1" || !localHost.test(host)) {
    return error("Modul de banc este disponibil local.", 404);
  }
  if (request.headers.get("origin") !== `http://${host}` || request.headers.get("x-sortify-kiosk") !== "1") {
    return error("Deschide interfața kiosk pe același PC.", 403);
  }
  const contentType = request.headers.get("content-type");
  if (contentType !== "image/jpeg" && contentType !== "application/json") {
    return error("Trimite un cadru JPEG sau un caz de simulare.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return error("Lipsește cadrul de scanat.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        await reader.cancel();
        return error("Cadrul depășește 1 MB.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return error("Cadrul nu a putut fi citit.", 400);
  } finally {
    reader.releaseLock();
  }
  if (size === 0) return error("Lipsește cadrul de scanat.", 400);
  const body = new Uint8Array(Buffer.concat(chunks, size));
  return forward("/scan", { method: "POST", body, headers: { "Content-Type": contentType } });
}
