"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Medal, ScanLine, ShieldCheck, Upload, WifiOff } from "lucide-react";
import type { AnalysisResult, SortifyState, StoredScan } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { CameraCapture } from "./camera-capture";
import { ScanResultCard } from "./scan-result-card";
import { RecentScans } from "./recent-scans";
import { computeStats, hasScannedToday, loadState, saveScan } from "@/lib/storage";
import { BADGES, evaluateNewBadges, streakBonus } from "@/lib/gamification";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { downscaleImage, formatGrams, uid } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Phase = "idle" | "camera" | "preview" | "busy" | "result";

const STEP_KEYS = ["scan.step.uploading", "scan.step.identifying", "scan.step.matching"] as const;

const SUPPORTED: Array<keyof typeof MATERIAL_PROFILES> = [
  "PLASTIC", "PAPER", "GLASS", "METAL", "ORGANIC", "E_WASTE", "BATTERY", "TEXTILE", "HAZARDOUS",
];

export function ScanPageClient() {
  const { t, lang } = useI18n();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<SortifyState>({ scans: [], badges: [] });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted state + provider status
  useEffect(() => {
    setState(loadState());
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { live?: boolean }) => setLive(Boolean(d?.live)))
      .catch(() => setLive(false));
  }, []);

  // Rotate the "analyzing" step copy
  useEffect(() => {
    if (phase !== "busy") return;
    setStepIndex(0);
    const timer = setInterval(() => setStepIndex((i) => Math.min(i + 1, STEP_KEYS.length - 1)), 1300);
    return () => clearInterval(timer);
  }, [phase]);

  const stats = computeStats(state.scans);

  const acceptCapture = useCallback(async (dataUrl: string) => {
    try {
      const compressed = await downscaleImage(dataUrl, 1024, 0.85);
      setImageData(compressed);
      setPhase("preview");
    } catch {
      toast({ title: t("error.generic"), variant: "error" });
    }
  }, [toast, t]);

  const onPickFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: t("error.badType"), variant: "error" });
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast({ title: t("error.tooLarge"), variant: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => void acceptCapture(reader.result as string);
      reader.onerror = () => toast({ title: t("error.generic"), variant: "error" });
      reader.readAsDataURL(file);
    },
    [acceptCapture, toast, t],
  );

  const commitScan = useCallback(
    (res: AnalysisResult, thumb?: string) => {
      const prev = loadState();
      const points = res.demo ? res.points : res.points + streakBonus(stats.streakDays + (hasScannedToday(prev.scans) ? 0 : 1));
      const scan: StoredScan = {
        id: uid("scan"),
        createdAt: Date.now(),
        material: res.material,
        itemName: res.itemName,
        confidence: res.confidence,
        recyclable: res.recyclable,
        co2SavedG: res.co2SavedG,
        points,
        demo: res.demo,
        thumb,
      };
      const candidateScans = [scan, ...prev.scans];
      const candidateStats = computeStats(candidateScans);
      const newBadges = evaluateNewBadges(candidateScans, candidateStats, prev.badges);
      const nextState = saveScan(prev, scan, [...prev.badges, ...newBadges]);
      setState(nextState);

      for (const badgeId of newBadges) {
        const badge = BADGES.find((b) => b.id === badgeId);
        if (badge) {
          toast({
            title: t("badge.toastTitle"),
            description: badge.name[lang],
            icon: <Medal className="size-5" />,
            variant: "success",
          });
        }
      }
    },
    [stats.streakDays, toast, t, lang],
  );

  const analyze = useCallback(async () => {
    if (!imageData) return;
    setPhase("busy");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, mimeType: "image/jpeg", language: lang }),
        signal: AbortSignal.timeout(45_000), // never let a hung AI call freeze the UI
      });
      const data = (await res.json()) as AnalysisResult & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "GENERIC");
      }
      const thumb = await downscaleImage(imageData, 128, 0.5).catch(() => undefined);
      setResult(data);
      commitScan(data, thumb);
      setPhase("result");
    } catch (err) {
      const timedOut = err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError");
      const code = err instanceof Error ? err.message : "GENERIC";
      const key = timedOut
        ? "error.generic"
        : code === "NO_PROVIDER"
          ? "error.noProvider"
          : code === "RATE_LIMIT"
            ? "error.rateLimit"
            : code === "TOO_LARGE"
              ? "error.tooLarge"
              : code === "BAD_TYPE"
                ? "error.badType"
                : code === "GENERIC"
                  ? "error.generic"
                  : "error.provider";
      toast({ title: t("toast.errorTitle"), description: t(key), variant: "error", durationMs: 7000 });
      setPhase(imageData ? "preview" : "idle");
    }
  }, [imageData, lang, commitScan, toast, t]);

  const runDemo = useCallback(async () => {
    setPhase("busy");
    try {
      const res = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
      commitScan(data);
      setPhase("result");
    } catch {
      toast({ title: t("toast.errorTitle"), description: t("error.generic"), variant: "error" });
      setPhase("idle");
    }
  }, [lang, commitScan, toast, t]);

  const reset = useCallback(() => {
    setImageData(null);
    setResult(null);
    setPhase("idle");
  }, []);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
      {/* Asymmetric hero */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6 md:mb-10">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-leaf">
            {t("scan.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[0.98] tracking-tight sm:text-6xl">
            {t("scan.title")}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
            {t("scan.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2.5 pb-1">
          {live === false ? (
            <span className="flex items-center gap-2 border-[1.5px] border-ink bg-warning/12 px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-warning">
              <WifiOff className="size-3.5" /> {t("common.demo")}
            </span>
          ) : live ? (
            <span className="flex items-center gap-2 border-[1.5px] border-ink bg-leaf px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-paper">
              <ShieldCheck className="size-3.5" /> {t("scan.liveReady")}
            </span>
          ) : null}
        </div>
      </div>

      {live === false ? (
        <div className="mb-7 flex flex-wrap items-center justify-between gap-2 border-[1.5px] border-ink bg-warning/10 px-4 py-3 animate-fade-up">
          <p className="font-mono text-xs leading-relaxed text-ink">{t("scan.demoBanner")}</p>
          <button
            onClick={() => void runDemo()}
            className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-leaf underline underline-offset-4 hover:brightness-110"
          >
            {t("scan.tryExample")} →
          </button>
        </div>
      ) : null}

      {/* Spec-sheet stat strip */}
      <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden border-[1.5px] border-ink bg-ink/25">
        <SpecCell label={t("impact.scans")} value={String(stats.total)} />
        <SpecCell label={t("impact.co2")} value={formatGrams(stats.co2TotalG, lang)} highlight />
        <SpecCell label={t("common.xp")} value={String(stats.pointsTotal)} />
      </div>

      <div className="grid gap-6 md:grid-cols-[1.08fr_1fr] md:gap-8">
        {/* Left: capture panel */}
        <div>
          {phase === "camera" ? (
            <CameraCapture onCapture={acceptCapture} onClose={reset} />
          ) : phase === "preview" || phase === "busy" ? (
            <PreviewPanel
              imageData={imageData}
              busy={phase === "busy"}
              stepIndex={stepIndex}
              stepText={t(STEP_KEYS[stepIndex])}
              onAnalyze={() => void analyze()}
              onRetake={reset}
            />
          ) : phase === "result" && result ? (
            <ResultPreview image={imageData} result={result} onScanAgain={reset} />
          ) : (
            <IdlePanel
              onStartCamera={() => setPhase("camera")}
              onUploadClick={() => fileInputRef.current?.click()}
              onDemo={() => void runDemo()}
              demoMode={live === false}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPickFile(file);
              e.target.value = "";
            }}
          />
        </div>

        {/* Right: result or placeholder */}
        <div>
          {result && phase === "result" ? (
            <ScanResultCard result={result} onScanAgain={reset} />
          ) : (
            <PlaceholderPanel />
          )}
        </div>
      </div>

      <RecentScans scans={state.scans.slice(0, 12)} />
    </div>
  );
}

function SpecCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-paper2 px-4 py-4 sm:px-6">
      <p className={cn("font-mono text-2xl font-bold sm:text-3xl", highlight && "text-leaf")}>{value}</p>
      <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-soft">{label}</p>
    </div>
  );
}

function IdlePanel({
  onStartCamera,
  onUploadClick,
  onDemo,
  demoMode,
}: {
  onStartCamera: () => void;
  onUploadClick: () => void;
  onDemo: () => void;
  demoMode: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="card-print shadow-hard flex flex-col items-center gap-6 p-8 text-center">
      <div className="relative">
        <span className="grid size-20 -rotate-2 place-items-center border-[1.5px] border-ink bg-leaf shadow-hard-sm animate-pulse-soft">
          <ScanLine className="size-10 text-paper" strokeWidth={2} />
        </span>
        <span className="absolute -right-3 -top-2 rotate-6 border-[1.5px] border-ink bg-paper2 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
          AI
        </span>
      </div>
      <button
        onClick={onStartCamera}
        className="btn-press w-full border-[1.5px] border-ink bg-leaf px-6 py-4 font-mono text-sm font-bold uppercase tracking-[0.18em] text-paper shadow-hard"
      >
        {t("scan.startCamera")}
      </button>
      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <button
          onClick={onUploadClick}
          className="btn-press flex flex-1 items-center justify-center gap-2 border-[1.5px] border-ink bg-paper2 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] shadow-hard-sm"
        >
          <Upload className="size-4" strokeWidth={2.2} /> {t("scan.upload")}
        </button>
        <button
          onClick={onDemo}
          className="btn-press flex flex-1 items-center justify-center gap-2 border-[1.5px] border-ink bg-paper2 px-4 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] shadow-hard-sm"
        >
          <ImagePlus className="size-4 text-leaf" strokeWidth={2.2} /> {t("scan.tryExample")}
        </button>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{t("scan.uploadHint")}</p>
    </div>
  );
}

function PreviewPanel({
  imageData,
  busy,
  stepIndex,
  stepText,
  onAnalyze,
  onRetake,
}: {
  imageData: string | null;
  busy: boolean;
  stepIndex: number;
  stepText: string;
  onAnalyze: () => void;
  onRetake: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card-print shadow-hard animate-fade-up overflow-hidden">
      <div className="relative">
        {imageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageData} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full bg-[#10160f]" />
        )}
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-[#10160f]/70 backdrop-blur-[2px]">
            {/* scan sweep gliding over the captured frame */}
            <span className="scan-sweep absolute inset-0" aria-hidden>
              <span className="absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 bg-gradient-to-b from-transparent via-leaf/35 to-transparent" />
            </span>
            <div className="relative flex w-64 flex-col items-center gap-3 border-[1.5px] border-paper/40 bg-paper2 px-5 py-4 text-center shadow-hard-sm">
              <LoaderCircle className="size-7 animate-spin text-leaf" strokeWidth={2.2} />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">{stepText}</p>
              <div className="flex gap-1.5">
                {STEP_KEYS.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-8 rounded-sm transition-colors",
                      i <= stepIndex ? "bg-leaf" : "bg-ink/15",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex gap-3 border-t-[1.5px] border-ink bg-paper2 p-4">
        <button
          onClick={onAnalyze}
          disabled={busy}
          className="btn-press flex-1 border-[1.5px] border-ink bg-leaf px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-paper shadow-hard-sm disabled:opacity-50"
        >
          {busy ? t("scan.analyzing") : t("scan.analyze")}
        </button>
        <button
          onClick={onRetake}
          disabled={busy}
          className="btn-press border-[1.5px] border-ink bg-paper2 px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] shadow-hard-sm disabled:opacity-50"
        >
          {t("scan.retake")}
        </button>
      </div>
    </div>
  );
}

function ResultPreview({
  image,
  result,
  onScanAgain,
}: {
  image: string | null;
  result: AnalysisResult;
  onScanAgain: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="card-print shadow-hard animate-fade-up overflow-hidden">
      <div className="relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="grid aspect-[4/3] w-full place-items-center bg-paper">
            <span className="grid size-16 -rotate-2 place-items-center border-[1.5px] border-ink bg-leaf/12">
              <ScanLine className="size-8 text-leaf" />
            </span>
          </div>
        )}
        <span className="absolute bottom-3 left-3 rotate-[-1deg] border-[1.5px] border-ink bg-ink px-3 py-1.5 font-mono text-xs font-bold text-paper">
          +{result.points} {t("common.points")}
        </span>
      </div>
      <div className="border-t-[1.5px] border-ink bg-paper2 p-4">
        <button
          onClick={onScanAgain}
          className="btn-press w-full border-[1.5px] border-ink bg-leaf px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-paper shadow-hard-sm"
        >
          {t("result.scanAgain")}
        </button>
      </div>
    </div>
  );
}

function PlaceholderPanel() {
  const { t, lang } = useI18n();
  const steps = [t("scan.step1"), t("scan.step2"), t("scan.step3")];

  return (
    <div className="card-print flex h-full min-h-[22rem] flex-col justify-center p-6 sm:p-7">
      <div className="mb-5 flex items-center gap-3.5 border-b-[1.5px] border-ink pb-4">
        <span className="grid size-11 -rotate-2 place-items-center border-[1.5px] border-ink bg-leaf/12">
          <ScanLine className="size-5 text-leaf" />
        </span>
        <div>
          <h2 className="font-display text-xl">{t("scan.title")}</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">{t("app.tagline")}</p>
        </div>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
            <span className="font-mono text-xs font-bold text-leaf">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-ink-soft">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-2 border-t-[1.5px] border-ink pt-4">
        {SUPPORTED.map((m) => {
          const profile = MATERIAL_PROFILES[m];
          return (
            <span
              key={m}
              className="border-[1.5px] border-ink px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: `${profile.bin.color}40` }}
            >
              {profile.label[lang]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
