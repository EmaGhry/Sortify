import { useEffect, useRef } from "react";
import { ArrowDownToLine, CircleAlert, ScanLine, Settings2 } from "lucide-react";

export type PresentationView = {
  title: string;
  detail: string;
  kind: "ready" | "scanning" | "result" | "attention";
  color?: string;
};

export function PresentationScreen({
  view,
  source,
  busy,
  onExit,
  onExample,
  onReset,
}: {
  view: PresentationView;
  source: string;
  busy: boolean;
  onExit: () => void;
  onExample?: () => void;
  onReset?: () => void;
}) {
  const setup = useRef<HTMLButtonElement>(null);
  useEffect(() => setup.current?.focus(), []);
  const Icon = view.kind === "attention" ? CircleAlert : view.kind === "ready" ? ArrowDownToLine : ScanLine;

  return (
    <div role="dialog" aria-modal="true" aria-label="Mod prezentare"
      className="fixed inset-0 z-[100] flex min-h-dvh flex-col overflow-auto bg-[#10221a] px-5 py-5 text-white sm:px-10 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-emerald-300">Sortify</p>
        <button ref={setup} type="button" onClick={onExit} className="inline-flex items-center gap-2 border border-white/25 px-3 py-2 text-sm text-emerald-50 hover:bg-white/10">
          <Settings2 aria-hidden className="size-4" /> Configurare
        </button>
      </header>

      <div role="status" aria-live="polite" aria-atomic="true" className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-12 text-center">
        <div aria-hidden className="grid size-16 place-items-center rounded-full border border-white/25 sm:size-24">
          <Icon className={`size-8 sm:size-12 ${view.kind === "scanning" ? "motion-safe:animate-pulse" : ""}`}
            style={{ color: view.color ?? "#6ee7b7" }} />
        </div>
        <h2 className="mt-6 break-words font-display text-[clamp(2.4rem,9vw,7rem)] leading-[1.02] tracking-tight"
          style={{ color: view.color }}>{view.title}</h2>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-emerald-50/80 sm:text-2xl">{view.detail}</p>
      </div>

      <footer className="flex min-h-11 flex-wrap items-center justify-center gap-3 text-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-200">{source}</span>
        {onExample && (
          <button type="button" disabled={busy} onClick={onExample}
            className="border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">
            Simulează o doză
          </button>
        )}
        {onReset && (
          <button type="button" disabled={busy} onClick={onReset}
            className="border border-white/25 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40">
            Reia simularea
          </button>
        )}
      </footer>
    </div>
  );
}
