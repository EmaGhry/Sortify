"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Material, SortifyState, StoredScan } from "@/lib/types";
import { MATERIALS } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/providers";
import { MaterialIcon } from "@/components/material-icon";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { clearAll, deleteScan, loadState } from "@/lib/storage";
import { cn, formatGrams, timeAgo } from "@/lib/utils";

export function HistoryClient() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [state, setState] = useState<SortifyState>({ scans: [], badges: [] });
  const [filter, setFilter] = useState<Material | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  const filtered = useMemo(
    () => (filter ? state.scans.filter((s) => s.material === filter) : state.scans),
    [state.scans, filter],
  );

  const presentMaterials = useMemo(
    () => MATERIALS.filter((m) => state.scans.some((s) => s.material === m)),
    [state.scans],
  );

  const remove = (id: string) => {
    setState(deleteScan(state, id));
    toast({ title: t("common.delete"), variant: "info" });
  };

  const clear = () => {
    if (window.confirm(t("history.clearConfirm"))) {
      setState(clearAll());
      setFilter(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-leaf">
            {t("history.kicker")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl">
            {t("history.title")}
          </h1>
          <p className="mt-3 text-base text-ink-soft">{t("history.subtitle")}</p>
        </div>
        {state.scans.length > 0 ? (
          <button
            onClick={clear}
            className="btn-press flex items-center gap-2 rounded-md border-[1.5px] border-ink bg-paper2 px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-danger shadow-hard-sm"
          >
            <Trash2 className="size-4" strokeWidth={2.2} /> {t("history.clear")}
          </button>
        ) : null}
      </div>

      {/* Filters */}
      {presentMaterials.length > 1 ? (
        <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("history.filterByMaterial")}>
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            {t("history.all")} · {state.scans.length}
          </FilterChip>
          {presentMaterials.map((m) => {
            const profile = MATERIAL_PROFILES[m];
            const count = state.scans.filter((s) => s.material === m).length;
            return (
              <FilterChip key={m} active={filter === m} onClick={() => setFilter(m)} color={profile.bin.color}>
                {profile.label[lang]} · {count}
              </FilterChip>
            );
          })}
        </div>
      ) : null}

      {/* Ledger-style list */}
      {!ready ? null : filtered.length === 0 ? (
        <div className="card-print grid place-items-center rounded-xl py-16 text-center">
          <div>
            <span className="mx-auto grid size-12 -rotate-2 place-items-center rounded-md border-[1.5px] border-ink bg-paper">
              <Trash2 className="size-6 text-ink-soft" />
            </span>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">{t("history.empty")}</p>
          </div>
        </div>
      ) : (
        <ul className="card-print divide-y divide-ink/15 overflow-hidden rounded-xl">
          {filtered.map((scan: StoredScan, idx) => {
            const profile = MATERIAL_PROFILES[scan.material];
            return (
              <li key={scan.id} className="flex items-center gap-3.5 p-3.5 transition-colors hover:bg-leaf/5 sm:gap-4 sm:px-5">
                <span className="hidden w-7 shrink-0 font-mono text-[10px] font-bold text-ink-soft sm:block">
                  {String(filtered.length - idx).padStart(3, "0")}
                </span>
                {scan.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scan.thumb}
                    alt=""
                    className="size-12 shrink-0 rounded-md border-[1.5px] border-ink object-cover"
                  />
                ) : (
                  <MaterialIcon material={scan.material} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold capitalize">{scan.itemName}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                    <span style={{ color: profile.id === "OTHER" ? undefined : profile.bin.color }} className="font-bold">
                      {profile.label[lang]}
                    </span>
                    {" · "}
                    {timeAgo(scan.createdAt, lang)}
                    {" · "}
                    {Math.round(scan.confidence * 100)}%
                    {scan.demo ? ` · ${t("common.demo")}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-bold text-leaf">+{scan.points}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{formatGrams(scan.co2SavedG, lang)} CO2</p>
                </div>
                <button
                  onClick={() => remove(scan.id)}
                  aria-label={t("common.delete")}
                  className="grid size-9 shrink-0 place-items-center rounded-md border-[1.5px] border-transparent text-ink-soft transition hover:border-ink hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-md border-[1.5px] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/30 bg-paper2 text-ink-soft hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
