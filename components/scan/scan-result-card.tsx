"use client";

import { Check, Lightbulb, Sparkles, XCircle, Zap } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { MaterialIcon } from "@/components/material-icon";
import { Ring } from "@/components/ring";
import { formatGrams } from "@/lib/utils";

export function ScanResultCard({
  result,
  onScanAgain,
}: {
  result: AnalysisResult;
  onScanAgain: () => void;
}) {
  const { t, lang } = useI18n();
  const profile = MATERIAL_PROFILES[result.material];
  const confidencePct = Math.round(result.confidence * 100);

  return (
    <section className="card-print shadow-hard animate-fade-up p-5 sm:p-6" aria-live="polite">
      {/* Header */}
      <div className="reveal-item flex items-start gap-4" style={{ "--d": "30ms" } as React.CSSProperties}>
        <MaterialIcon material={result.material} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* material stamp */}
            <span
              className="-rotate-1 border-[1.5px] border-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ backgroundColor: `${profile.bin.color}55` }}
            >
              {profile.label[lang]}
            </span>
            {result.demo ? (
              <span className="rotate-1 border-[1.5px] border-ink bg-ink px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-paper">
                {t("result.demoBadge")}
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 font-display text-2xl leading-tight capitalize sm:text-3xl">
            {result.itemName}
          </h2>
          {result.reasoning ? (
            <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-soft">
              {t("result.reasoning")}: {result.reasoning}
            </p>
          ) : null}
        </div>
        <Ring progress={result.confidence} size={64} stroke={7} id="conf-ring">
          <div className="text-center">
            <p className="font-mono text-sm font-bold">{confidencePct}%</p>
            <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-ink-soft">{t("result.confidence")}</p>
          </div>
        </Ring>
      </div>

      {/* Bin */}
      <div
        className="reveal-item mt-5 flex items-center gap-3.5 border-[1.5px] border-ink bg-paper p-4"
        style={{ "--d": "90ms" } as React.CSSProperties}
      >
        <span
          className="size-10 shrink-0 border-[1.5px] border-ink"
          style={{ backgroundColor: profile.bin.color }}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-soft">{t("result.bin")}</p>
          <p className="font-display text-lg leading-tight">{result.binLabel || profile.bin.label[lang]}</p>
        </div>
        {!result.recyclable ? (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 border-[1.5px] border-ink bg-danger/12 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-danger">
            <XCircle className="size-3.5" />
            {t("result.notRecyclable")}
          </span>
        ) : null}
      </div>

      {/* Steps */}
      <div
        className="reveal-item mt-5 grid gap-5 sm:grid-cols-2"
        style={{ "--d": "150ms" } as React.CSSProperties}
      >
        <div>
          <h3 className="mb-2.5 border-b-[1.5px] border-ink pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink">
            {t("result.instructions")}
          </h3>
          <ul className="space-y-2">
            {result.instructions.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
                <span className="mt-0.5 font-mono text-[10px] font-bold text-leaf">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2.5 flex items-center gap-1.5 border-b-[1.5px] border-ink pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em]">
            <Sparkles className="size-3.5 text-leaf" />
            {t("result.tips")}
          </h3>
          <ul className="space-y-2">
            {result.aiTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-snug">
                <Zap className="mt-0.5 size-3.5 shrink-0 text-leaf" strokeWidth={2.4} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Eco fact */}
      {result.ecoFact ? (
        <div
          className="reveal-item mt-5 flex items-start gap-3 border-[1.5px] border-ink border-l-4 border-l-leaf bg-paper p-3.5"
          style={{ "--d": "210ms" } as React.CSSProperties}
        >
          <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-leaf" />
          <div>
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-leaf">{t("result.ecoFact")}</p>
            <p className="mt-1 text-sm leading-snug">{result.ecoFact}</p>
          </div>
        </div>
      ) : null}

      {/* Stats + actions */}
      <div
        className="reveal-item mt-5 flex flex-wrap items-center gap-2.5"
        style={{ "--d": "260ms" } as React.CSSProperties}
      >
        <span className="flex items-center gap-2 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-mono text-xs font-bold">
          {t("result.co2")}: <span className="text-leaf">{formatGrams(result.co2SavedG, lang)}</span>
        </span>
        <span className="flex items-center gap-2 border-[1.5px] border-ink bg-paper px-3 py-1.5 font-mono text-xs font-bold">
          {t("result.points")}: <span className="text-leaf">+{result.points}</span>
        </span>
        <button
          onClick={onScanAgain}
          className="btn-press ml-auto border-[1.5px] border-ink bg-leaf px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-paper shadow-hard-sm"
        >
          {t("result.scanAgain")}
        </button>
      </div>
    </section>
  );
}
