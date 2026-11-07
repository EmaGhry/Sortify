"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const destinations = {
  glass: { name: "Sticlă", color: "#4ade80", led: "verde" },
  metal: { name: "Metal", color: "#f87171", led: "roșu" },
  plastic: { name: "PET / plastic", color: "#facc15", led: "galben" },
  paper: { name: "Hârtie / carton", color: "#60a5fa", led: "albastru" },
  other: { name: "Altele", color: "#f8fafc", led: "alb" },
} as const;

const labels: Record<string, string> = {
  glass: "Sticlă", metal: "Metal", plastic: "PET / plastic", paper: "Hârtie / carton", other: "Altele",
};
const outputs = {
  bench: "ESP32 prin Wi-Fi",
  preview: "Previzualizare fără ESP32",
  simulation: "Exemple predefinite",
} as const;
const modelSources = {
  network: "Modelul echipei prin rețea",
  simulation: "Simulare",
} as const;
type Mode = keyof typeof outputs;
type ModelSource = keyof typeof modelSources;
type StationStatus = { mode: Mode; model_source: ModelSource };
type Destination = keyof typeof destinations;
type Result = StationStatus & {
  label: string;
  destination: Destination;
  score: number | null;
  inference_ms: number | null;
  elapsed_ms: number;
  hardware: "acknowledged" | "disabled" | "unconfirmed";
  error: string | null;
  history_saved?: boolean;
};

/** Zona cu imagine reală din cadrul camerei, fără benzile negre (ex. telefon în portret pus într-un cadru lat). */
function contentRect(video: HTMLVideoElement) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const full = { x: 0, y: 0, w, h };
  const sw = 64;
  const sh = Math.max(8, Math.round((sw * h) / w));
  const probe = document.createElement("canvas");
  probe.width = sw;
  probe.height = sh;
  const context = probe.getContext("2d", { willReadFrequently: true });
  if (!context) return full;
  context.drawImage(video, 0, 0, sw, sh);
  const px = context.getImageData(0, 0, sw, sh).data;
  const dark = (x: number, y: number) => {
    const i = (y * sw + x) * 4;
    return (px[i] + px[i + 1] + px[i + 2]) / 3 < 24;
  };
  // o linie/coloană e "bandă" dacă aproape toți pixelii ei sunt negri
  const colDark = (x: number, y0: number, y1: number) => {
    let n = 0;
    for (let y = y0; y <= y1; y++) if (dark(x, y)) n++;
    return n >= 0.97 * (y1 - y0 + 1);
  };
  const rowDark = (y: number, x0: number, x1: number) => {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (dark(x, y)) n++;
    return n >= 0.97 * (x1 - x0 + 1);
  };
  let left = 0;
  let right = sw - 1;
  while (left < right && colDark(left, 0, sh - 1)) left++;
  while (right > left && colDark(right, 0, sh - 1)) right--;
  let top = 0;
  let bottom = sh - 1;
  while (top < bottom && rowDark(top, left, right)) top++;
  while (bottom > top && rowDark(bottom, left, right)) bottom--;
  const cw = right - left + 1;
  const ch = bottom - top + 1;
  if (cw < sw * 0.3 || ch < sh * 0.3) return full; // aproape tot negru: nu tăiem nimic
  return { x: (left * w) / sw, y: (top * h) / sh, w: (cw * w) / sw, h: (ch * h) / sh };
}

function drawSquare(video: HTMLVideoElement, context: CanvasRenderingContext2D, size: number) {
  if (!Math.min(video.videoWidth, video.videoHeight)) throw new Error("Așteaptă pornirea camerei.");
  const area = contentRect(video);
  const side = Math.min(area.w, area.h);
  context.drawImage(video, area.x + (area.w - side) / 2, area.y + (area.h - side) / 2,
    side, side, 0, 0, size, size);
}

function captureFrame(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 480;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Cadrul nu a putut fi capturat.");
  drawSquare(video, context, 480);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Cadrul nu a putut fi capturat."));
    }, "image/jpeg", 0.88);
  });
}

export function BenchKiosk() {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const scanLock = useRef(false);
  const [station, setStation] = useState<StationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/bench", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (!Object.hasOwn(outputs, data.mode) || !Object.hasOwn(modelSources, data.model_source)) {
        throw new Error("Modul stației este necunoscut.");
      }
      if (mounted.current) setStation(data);
    } catch (cause) {
      if (!mounted.current) return;
      setStation(null);
      setError(cause instanceof Error ? cause.message : "Stația este indisponibilă.");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [refresh]);

  async function startCamera() {
    setError(null);
    setCamera("starting");
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false,
      });
      if (!mounted.current || !video.current) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = next;
      video.current.srcObject = next;
      next.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (!mounted.current || stream.current !== next) return;
        stream.current = null;
        setCamera("off");
        setError("Camera s-a deconectat. Reconecteaz-o și pornește-o din nou.");
      }, { once: true });
      await video.current.play();
      setCamera("on");
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = null;
      setCamera("off");
      setError("Camera nu a pornit. Verifică permisiunea browserului și dacă o folosește altă aplicație.");
    }
  }

  const scan = useCallback(async (example?: Destination) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      let body: string | Blob;
      if (example) {
        body = JSON.stringify({ destination: example });
      } else {
        if (!video.current) throw new Error("Pornește camera.");
        body = await captureFrame(video.current);
      }
      const response = await fetch("/api/bench", {
        method: "POST",
        headers: { "Content-Type": example ? "application/json" : "image/jpeg", "X-Sortify-Kiosk": "1" },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scanarea nu a putut fi terminată.");
    } finally {
      scanLock.current = false;
      setBusy(false);
    }
  }, []);

  const choice = result ? destinations[result.destination] : null;
  const button = "btn-press border-[1.5px] border-ink bg-paper2 px-4 py-3 text-sm font-bold text-ink shadow-hard-sm hover:bg-paper disabled:opacity-40 disabled:shadow-none";
  const primary = "btn-press border-[1.5px] border-ink bg-leaf-deep px-5 py-3 text-sm font-bold text-paper shadow-hard-sm hover:bg-leaf disabled:opacity-40 disabled:shadow-none";

  return (
    <section lang="ro" className="mx-auto max-w-[1200px] overflow-auto px-4 py-8 text-ink sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b-[1.5px] border-ink pb-5">
        <div>
          <p className="font-semibold text-xs uppercase tracking-wider text-leaf">Sortify · Stație de sortare</p>
          <h1 className="mt-2 font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">Unde merge ambalajul?</h1>
          <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-ink-soft">
            <span aria-hidden className={`size-2 rounded-full ${station ? "bg-leaf animate-pulse-soft" : "bg-danger"}`} />
            {station ? `${modelSources[station.model_source]} · ${outputs[station.mode]}` : "Stația nu este conectată"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/operator" className={button}>Statistici operator</Link>
        </div>
      </header>

      <div className="grid items-stretch gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="paper-sheet border-[1.5px] border-ink p-4 shadow-hard sm:p-5">
          {station?.mode === "simulation" ? (
            <div className="border-[1.5px] border-dashed border-ink/40 p-5">
              <p className="mb-4 font-display text-xl">Alege un caz pentru a verifica interfața.</p>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(destinations) as Destination[]).map((destination) => (
                  <button key={destination} className={`${button} inline-flex items-center gap-2`} disabled={busy}
                    onClick={() => void scan(destination)}>
                    <span aria-hidden className="size-3 rounded-full border border-ink" style={{ background: destinations[destination].color }} />
                    {destinations[destination].name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[52vh] overflow-hidden border-[1.5px] border-ink bg-ink">
                <video ref={video} autoPlay muted playsInline className="size-full object-cover" />
                {/* viewfinder corners */}
                <div aria-hidden className="pointer-events-none absolute inset-[12%]">
                  <span className="absolute left-0 top-0 size-8 border-l-4 border-t-4 border-paper/80" />
                  <span className="absolute right-0 top-0 size-8 border-r-4 border-t-4 border-paper/80" />
                  <span className="absolute bottom-0 left-0 size-8 border-b-4 border-l-4 border-paper/80" />
                  <span className="absolute bottom-0 right-0 size-8 border-b-4 border-r-4 border-paper/80" />
                </div>
                {busy && <div aria-hidden className="scan-sweep pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent to-emerald-300/40" />}
                {camera !== "on" && (
                  <p className="absolute inset-0 grid place-items-center p-6 text-center font-semibold text-xs uppercase tracking-wider text-paper/70">
                    Camera stației
                  </p>
                )}
              </div>
              <p className="my-4 text-sm text-ink-soft">Arată un singur obiect în centrul cadrului.</p>
              {camera === "on" ? (
                <button className={primary} disabled={busy || !station} onClick={() => void scan()}>
                  {busy ? "Se scanează…" : "Scanează obiectul"}
                </button>
              ) : (
                <button className={primary} disabled={!station || camera === "starting"} onClick={() => void startCamera()}>
                  {camera === "starting" ? "Se pornește camera…" : "Pornește camera"}
                </button>
              )}
            </>
          )}
        </div>

        <div aria-live="polite" className="flex min-h-72 flex-col border-[1.5px] border-ink shadow-hard">
          {choice && result ? (
            <>
              <div className="relative flex flex-1 flex-col justify-end overflow-hidden p-6 sm:p-8"
                style={{ background: result.destination === "other" ? undefined : choice.color }}>
                <div aria-hidden className="crumple absolute inset-0" />
                <p className="relative text-sm font-bold uppercase tracking-wider text-ink/80">
                  {result.mode === "simulation" ? "Rezultat simulat" : "Aruncă în containerul"}
                </p>
                <h2 className="relative mt-2 break-words font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.95] tracking-tight">
                  {choice.name}
                </h2>
                {result.score !== null && (
                  <div className="relative mt-6 max-w-sm">
                    <div className="flex justify-between font-mono text-xs text-ink/80">
                      <span>{labels[result.label] ?? result.label}</span>
                      <span>încredere {Math.round(result.score * 100)}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 border-[1.5px] border-ink bg-paper2/60">
                      <div className="h-full bg-ink" style={{ width: `${Math.round(result.score * 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="paper-sheet border-t-[1.5px] border-ink px-6 py-4 text-sm sm:px-8">
                <p className="font-bold">
                  {result.hardware === "acknowledged" && `ESP32 a confirmat comanda · LED ${choice.led}`}
                  {result.hardware === "disabled" && "Rezultat pe ecran · ieșiri fizice dezactivate"}
                  {result.hardware === "unconfirmed" && "Comanda ESP32 este neconfirmată. Verifică placa înainte de a continua."}
                </p>
                {result.error && <p className="mt-2 text-warning">{result.error}</p>}
                {result.history_saved === false && <p className="mt-2 text-warning">Rezultatul nu s-a salvat în istoric.</p>}
                {result.inference_ms !== null && (
                  <p className="mt-2 font-mono text-xs text-ink-soft">
                    {modelSources[result.model_source]} · procesare {result.inference_ms} ms · serviciu {result.elapsed_ms} ms
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="paper-sheet flex flex-1 flex-col justify-center p-6 sm:p-8">
              <p className="text-sm font-bold uppercase tracking-wider text-ink/80">Rezultat</p>
              <p className={`mt-2 font-display text-4xl leading-tight sm:text-5xl ${busy ? "animate-pulse-soft" : ""}`}>
                {busy ? "Se analizează cadrul…" : "Așteaptă o scanare"}
              </p>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {(Object.keys(destinations) as Destination[]).map((destination) => (
                  <li key={destination} className="inline-flex items-center gap-2">
                    <span aria-hidden className="size-3 rounded-full border border-ink" style={{ background: destinations[destination].color }} />
                    {destinations[destination].name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(error || !station) && (
            <div className="border-t-[1.5px] border-ink bg-paper2 px-6 py-4 sm:px-8">
              {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}
              {!station && <button className={`${button} mt-3`} onClick={() => void refresh()}>Reconectează stația</button>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
