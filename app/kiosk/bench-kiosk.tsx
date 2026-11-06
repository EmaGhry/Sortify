"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { observePresence, startPresence, type PresenceState } from "./presence";
import { PresentationScreen, type PresentationView } from "./presentation";

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

const automaticMessages = {
  calibrating: "Lasă zona goală. Se calibrează camera…",
  ready: "Pregătit. Așază un obiect în centrul cadrului.",
  steady: "Ține obiectul nemișcat…",
  remove: "Retrage obiectul pentru următoarea scanare.",
} as const;

function drawSquare(video: HTMLVideoElement, context: CanvasRenderingContext2D, size: number) {
  const side = Math.min(video.videoWidth, video.videoHeight);
  if (!side) throw new Error("Așteaptă pornirea camerei.");
  context.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2,
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
  const stage = useRef<HTMLElement>(null);
  const presentationTrigger = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const scanLock = useRef(false);
  const [station, setStation] = useState<StationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [automatic, setAutomatic] = useState<PresenceState["phase"] | null>(null);
  const [checking, setChecking] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const autoActive = automatic !== null;

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
        setAutomatic(null);
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
    if (scanLock.current) return false;
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
      return data.hardware !== "unconfirmed";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scanarea nu a putut fi terminată.");
      return false;
    } finally {
      scanLock.current = false;
      setBusy(false);
    }
  }, []);

  async function toggleAutomatic() {
    setError(null);
    if (autoActive) {
      setAutomatic(null);
      return;
    }
    if (!station || camera !== "on" || scanLock.current || checking) return;
    if (station.mode === "bench") {
      setChecking(true);
      try {
        const response = await fetch("/api/bench?view=hardware", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ready) {
          throw new Error(data.error ?? "Verifică rețeaua Sortify-Bench și firmware-ul ESP32.");
        }
      } catch (cause) {
        if (mounted.current) setError(cause instanceof Error ? cause.message : "ESP32 nu răspunde.");
        return;
      } finally {
        if (mounted.current) setChecking(false);
      }
    }
    if (mounted.current && !document.hidden && stream.current?.active) setAutomatic("calibrating");
  }

  useEffect(() => {
    if (!autoActive || camera !== "on" || station?.mode === "simulation") return;
    const sample = document.createElement("canvas");
    sample.width = sample.height = 32;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    let presence = startPresence();
    let lastTime = -1;
    let stopped = false;
    const timer = window.setInterval(() => {
      const element = video.current;
      if (stopped || scanLock.current || !element?.videoWidth || element.readyState < 2 || element.currentTime === lastTime) return;
      lastTime = element.currentTime;
      drawSquare(element, context, 32);
      const step = observePresence(presence, context.getImageData(0, 0, 32, 32).data);
      presence = step.state;
      setAutomatic(presence.phase);
      if (step.scan) void scan().then((ok) => {
        if (!ok && !stopped) setAutomatic(null);
      });
    }, 125);
    function onVisibility() {
      if (document.hidden) {
        stopped = true;
        setAutomatic(null);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoActive, camera, scan, station?.mode]);

  const choice = result ? destinations[result.destination] : null;
  const button = "border border-white/25 px-4 py-3 text-sm font-bold hover:bg-white/10 disabled:opacity-40";
  const simulated = station?.mode === "simulation";

  function exitPresentation() {
    setPresenting(false);
    if (document.fullscreenElement === stage.current) void document.exitFullscreen().catch(() => {});
  }

  useEffect(() => {
    if (!presenting) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPresenting(false);
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) setPresenting(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      presentationTrigger.current?.focus();
    };
  }, [presenting]);

  let presentation: PresentationView = {
    title: "Prezintă ambalajul",
    detail: "Așază un singur obiect în centrul zonei de scanare.",
    kind: "ready",
  };
  if (error || result?.hardware === "unconfirmed") {
    presentation = { title: "Verifică stația", detail: error ?? "Comanda ESP32 nu a fost confirmată.", kind: "attention" };
  } else if (busy) {
    presentation = { title: "Se scanează…", detail: "Ține ambalajul nemișcat.", kind: "scanning" };
  } else if (checking || automatic === "calibrating") {
    presentation = { title: "Se pregătește stația", detail: "Lasă zona de scanare goală.", kind: "scanning" };
  } else if (automatic === "steady") {
    presentation = { title: "Ține ambalajul nemișcat", detail: "Camera se pregătește să-l scaneze.", kind: "scanning" };
  } else if (result && choice && automatic !== "ready") {
    const indication = simulated ? "LED simulat" : result.hardware === "acknowledged" ? "LED" : "";
    const next = "Eliberează zona de scanare.";
    presentation = {
      title: choice.name,
      detail: indication ? `${indication} ${choice.led} · ${next}` : next,
      kind: "result",
      color: choice.color,
    };
  } else if (!station || (!simulated && !autoActive)) {
    presentation = { title: "Stația este în pauză", detail: "Deschide Configurare pentru a porni scanarea.", kind: "attention" };
  }

  return (
    <section ref={stage} lang="ro" className="mx-auto my-8 max-w-6xl overflow-auto bg-[#10221a] p-5 text-white sm:p-10">
      <div inert={presenting || undefined}>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4 border-b border-white/20 pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-300">Sortify · Stație de sortare</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">Unde merge ambalajul?</h1>
          <p className="mt-2 text-sm text-emerald-100">
            {station ? `${modelSources[station.model_source]} · ${outputs[station.mode]}` : "Stație locală"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/operator" className={button}>Operator</Link>
          <button ref={presentationTrigger} className={button} onClick={() => {
            setPresenting(true);
            void stage.current?.requestFullscreen?.().catch(() => {});
          }}>Mod prezentare</button>
        </div>
      </header>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <div>
          {station?.mode === "simulation" ? (
            <div className="border border-dashed border-white/30 p-5">
              <p className="mb-4">Alege un caz pentru a verifica interfața.</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(destinations) as Destination[]).map((destination) => (
                  <button key={destination} className={button} disabled={busy} onClick={() => void scan(destination)}>
                    {destinations[destination].name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[48vh] overflow-hidden border border-white/25 bg-black/30">
                <video ref={video} autoPlay muted playsInline className="size-full object-cover" />
                {camera !== "on" && <p className="absolute inset-0 grid place-items-center p-6 text-center">Camera stației</p>}
              </div>
              <p className="my-3 text-sm text-emerald-100">Arată un singur obiect în centrul cadrului.</p>
              {camera === "on" ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <button className={button} disabled={busy || checking || !station || autoActive} onClick={() => void scan()}>
                      {busy ? "Se scanează…" : "Scanează obiectul"}
                    </button>
                    <button className={button} disabled={checking || (!autoActive && (busy || !station))}
                      onClick={() => void toggleAutomatic()}>
                      {autoActive ? "Oprește automatizarea" : checking ? "Se verifică ESP32…" : "Calibrează cu zona goală"}
                    </button>
                  </div>
                  {automatic && <p role="status" className="mt-3 text-sm text-emerald-100">
                    {busy ? "Se scanează…" : automaticMessages[automatic]}
                  </p>}
                </>
              ) : (
                <button className={button} disabled={!station || camera === "starting"} onClick={() => void startCamera()}>
                  {camera === "starting" ? "Se pornește camera…" : "Pornește camera"}
                </button>
              )}
            </>
          )}
        </div>

        <div aria-live="polite" className="min-h-48 border border-white/25 p-6">
          {choice && result ? (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-emerald-100">
                {result.mode === "simulation" ? "Rezultat simulat" : modelSources[result.model_source]}
              </p>
              <h2 className="mt-2 text-3xl font-bold sm:text-5xl" style={{ color: choice.color }}>{choice.name}</h2>
              {result.score !== null && (
                <p className="mt-3 text-sm">{labels[result.label] ?? result.label} · scor {Math.round(result.score * 100)}%</p>
              )}
              <p className="mt-3 text-sm">
                {result.hardware === "acknowledged" && `ESP32 a confirmat comanda · LED ${choice.led}`}
                {result.hardware === "disabled" && "Rezultat pe ecran · ieșiri fizice dezactivate"}
                {result.hardware === "unconfirmed" && "Comanda ESP32 este neconfirmată. Verifică placa înainte de a continua."}
              </p>
              {result.error && <p className="mt-2 text-sm text-amber-200">{result.error}</p>}
              {result.history_saved === false && <p className="mt-2 text-sm text-amber-200">Rezultatul nu s-a salvat în istoric.</p>}
              {result.inference_ms !== null && (
                <p className="mt-4 font-mono text-xs text-emerald-100">
                  Procesare {result.inference_ms} ms · Serviciu {result.elapsed_ms} ms
                </p>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold">{busy ? "Se analizează cadrul…" : "Așteaptă o scanare"}</p>
          )}
          {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
          {!station && <button className={`${button} mt-4`} onClick={() => void refresh()}>Reconectează stația</button>}
        </div>
      </div>
      </div>
      {presenting && (
        <PresentationScreen view={presentation} busy={busy}
          source={simulated ? "Simulare · hardware dezactivat" : station?.mode === "preview" ? "Previzualizare · hardware dezactivat" : "Stație de sortare"}
          onExit={exitPresentation}
          onExample={simulated && !result ? () => void scan("metal") : undefined}
          onReset={simulated && result ? () => setResult(null) : undefined}
        />
      )}
    </section>
  );
}
