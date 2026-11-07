"use client";

import { Check, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  variant?: "success" | "error" | "info";
  icon?: React.ReactNode;
  durationMs?: number;
}

const VARIANT_STYLES: Record<string, string> = {
  success: "text-leaf",
  error: "text-danger",
  info: "text-ink",
};

const VARIANT_ICON: Record<string, React.ReactNode> = {
  success: <Check className="size-5" strokeWidth={2.4} />,
  error: <TriangleAlert className="size-5" strokeWidth={2.2} />,
  info: <Info className="size-5" strokeWidth={2.2} />,
};

export function ToastStack({ toasts }: { toasts: ToastInput[] }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2.5 w-[min(92vw,26rem)] pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "card-print shadow-hard-sm animate-fade-up pointer-events-auto flex items-start gap-3 px-4 py-3",
            VARIANT_STYLES[t.variant ?? "info"],
          )}
        >
          <span className="mt-0.5 shrink-0">{t.icon ?? VARIANT_ICON[t.variant ?? "info"]}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug text-ink">{t.title}</p>
            {t.description ? (
              <p className="mt-0.5 font-mono text-[11px] leading-snug text-ink-soft">{t.description}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
