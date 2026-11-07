"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BatteryCharging,
  Car,
  Cpu,
  Crown,
  Flame,
  Globe,
  Leaf,
  Lock,
  Medal,
  Recycle,
  Smartphone,
  Sparkles,
  Star,
  Target,
  TreeDeciduous,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SortifyState, SortifyStats } from "@/lib/types";
import { MATERIALS } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { MaterialIcon } from "@/components/material-icon";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { BADGES, levelFor } from "@/lib/gamification";
import { computeStats, loadState } from "@/lib/storage";
import { co2Equivalents } from "@/lib/co2";
import { Ring } from "@/components/ring";
import { cn, formatGrams } from "@/lib/utils";

const BADGE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  recycle: Recycle,
  leaf: Leaf,
  flame: Flame,
  crown: Crown,
  target: Target,
  star: Star,
  trophy: Trophy,
  zap: Zap,
  cpu: Cpu,
  battery: BatteryCharging,
  globe: Globe,
  medal: Medal,
};

const EQUIV_ICONS = { car: Car, smartphone: Smartphone, tree: TreeDeciduous };

export function ImpactClient() {
  const { t, lang } = useI18n();
  const [state, setState] = useState<SortifyState>({ scans: [], badges: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
  }, []);

  const stats: SortifyStats = useMemo(() => computeStats(state.scans), [state.scans]);
  const { level, next, progress } = levelFor(stats.pointsTotal);
  const equivalents = co2Equivalents(stats.co2TotalG);
  const maxMaterial = Math.max(1, ...MATERIALS.map((m) => stats.perMaterial[m] ?? 0));

  const streakDays = useMemo(() => {
    const set = new Set(state.scans.map((s) => new Date(s.createdAt).toDateString()));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return { date: d, active: set.has(d.toDateString()) };
    });
  }, [state.scans]);

  const noData = stats.total === 0;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-xl">
        <p className=" text-xs font-bold uppercase tracking-wider text-leaf">
          {t("impact.kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[0.98] tracking-tight sm:text-6xl">
          {t("impact.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">{t("impact.subtitle")}</p>
      </div>

      {ready && noData ? (
        <div className="card-print grid place-items-center py-20 text-center">
          <div>
            <span className="mx-auto grid size-14 -rotate-2 place-items-center border-[1.5px] border-ink bg-leaf/12">
              <Leaf className="size-7 text-leaf" />
            </span>
            <p className="mt-4 max-w-sm font-semibold text-xs uppercase leading-relaxed tracking-wider text-ink-soft">
              {t("impact.noData")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Spec-sheet stat strip */}
          <div className="grid grid-cols-2 gap-px overflow-hidden border-[1.5px] border-ink bg-ink/25 lg:grid-cols-4">
            <StatCell label={t("impact.scans")} value={String(stats.total)} icon={Recycle} />
            <StatCell label={t("impact.co2")} value={formatGrams(stats.co2TotalG, lang)} icon={Leaf} highlight />
            <StatCell
              label={t("impact.recyclableRate")}
              value={`${Math.round(stats.recyclableRate * 100)}%`}
              icon={Target}
            />
            <StatCell
              label={t("impact.streak")}
              value={`${stats.streakDays} ${t("impact.days")}`}
              icon={Flame}
            />
          </div>

          <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
            {/* Level + punch card */}
            <section className="card-print p-6">
              <div className="flex items-center gap-5">
                <Ring progress={progress} size={104} stroke={9} id="level-ring">
                  <div className="text-center">
                    <p className="font-mono text-2xl font-bold">{stats.pointsTotal}</p>
                    <p className="font-semibold text-xs uppercase tracking-wider text-ink-soft">{t("common.xp")}</p>
                  </div>
                </Ring>
                <div>
                  <p className=" text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t("impact.level")}
                  </p>
                  <p className="font-display text-2xl leading-tight">{level.name[lang]}</p>
                  {next ? (
                    <p className="mt-1.5 font-mono text-[11px] text-ink-soft">
                      {Math.max(0, next.min - stats.pointsTotal)} XP → {next.name[lang]}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-leaf">MAX</p>
                  )}
                </div>
              </div>

              {/* Punch card */}
              <div className="mt-7">
                <p className="mb-2.5 border-b-[1.5px] border-ink pb-1.5 text-xs font-bold uppercase tracking-wider">
                  {t("impact.streakTitle")}
                </p>
                <div className="flex gap-1.5">
                  {streakDays.map(({ date, active }, i) => (
                    <span
                      key={i}
                      title={date.toLocaleDateString()}
                      className={cn(
                        "h-7 flex-1 rounded-[3px] border-[1.5px] border-ink transition-colors",
                        active ? "bg-leaf" : "bg-paper2",
                      )}
                    />
                  ))}
                </div>
                <p className="mt-2 font-semibold text-xs uppercase tracking-wider text-ink-soft">
                  {t("impact.streak")}: {stats.streakDays} {t("impact.days")}
                </p>
              </div>
            </section>

            {/* Equivalents ledger */}
            <section className="card-print overflow-hidden">
              <h2 className="border-b-[1.5px] border-ink bg-paper px-6 py-3.5 font-display text-lg">
                {t("impact.equivalents")}
              </h2>
              <div className="divide-y divide-ink/15">
                {equivalents.length === 0 ? (
                  <p className="px-6 py-6 font-mono text-xs text-ink-soft">{t("impact.noData")}</p>
                ) : (
                  equivalents.map((eq) => {
                    const Icon = EQUIV_ICONS[eq.icon];
                    return (
                      <div key={eq.id} className="flex items-center gap-4 px-6 py-4">
                        <span className="grid size-10 shrink-0 place-items-center border-[1.5px] border-ink bg-leaf/12">
                          <Icon className="size-5 text-leaf" strokeWidth={2} />
                        </span>
                        <p className="text-sm leading-snug">
                          <span className="font-mono text-xl font-bold text-leaf">{eq.value}</span>{" "}
                          <span className="text-ink-soft">{eq.label[lang]}</span>
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* Distribution */}
          <section className="card-print overflow-hidden">
            <h2 className="border-b-[1.5px] border-ink bg-paper px-6 py-3.5 font-display text-lg">
              {t("impact.distribution")}
            </h2>
            <div className="space-y-3 px-6 py-5">
              {MATERIALS.filter((m) => (stats.perMaterial[m] ?? 0) > 0).map((m) => {
                const count = stats.perMaterial[m] ?? 0;
                const profile = MATERIAL_PROFILES[m];
                return (
                  <div key={m} className="flex items-center gap-3.5">
                    <MaterialIcon material={m} size="sm" />
                    <span className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider sm:w-36">
                      {profile.label[lang]}
                    </span>
                    <div className="h-3.5 flex-1 rounded-[3px] border-[1.5px] border-ink bg-paper2">
                      <div
                        className="h-full rounded-[1px] transition-[width] duration-700"
                        style={{
                          width: `${(count / maxMaterial) * 100}%`,
                          backgroundColor: profile.bin.color,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-mono text-sm font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Badge stamps */}
          <section>
            <div className="mb-4 flex items-center justify-between border-b-[1.5px] border-ink pb-2.5">
              <h2 className="font-display text-lg">{t("impact.badges")}</h2>
              <span className="border-[1.5px] border-ink bg-leaf px-3 py-1 text-xs font-bold uppercase tracking-wider text-paper">
                {state.badges.length}/{BADGES.length} {t("impact.badgesUnlocked")}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BADGES.map((badge, i) => {
                const unlocked = state.badges.includes(badge.id);
                const Icon = BADGE_ICONS[badge.icon];
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "border-[1.5px] p-4 transition-transform hover:-translate-y-0.5",
                      unlocked ? "border-ink bg-leaf/10 shadow-hard-sm" : "border-dashed border-ink/40 bg-paper2",
                    )}
                    style={unlocked ? { transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` } : undefined}
                  >
                    <span
                      className={cn(
                        "grid size-10 place-items-center border-[1.5px]",
                        unlocked ? "border-ink bg-ink text-paper" : "border-ink/30 bg-paper text-ink-soft",
                      )}
                    >
                      {unlocked ? <Icon className="size-5" strokeWidth={2} /> : <Lock className="size-4" strokeWidth={2} />}
                    </span>
                    <p className="mt-2.5 text-sm font-bold leading-tight">{badge.name[lang]}</p>
                    <p className="mt-1 font-mono text-[10px] leading-snug text-ink-soft">{badge.desc[lang]}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  highlight?: boolean;
}) {
  return (
    <div className="bg-paper2 p-5">
      <span
        className={cn(
          "mb-3 grid size-9 place-items-center border-[1.5px] border-ink",
          highlight ? "bg-leaf text-paper" : "bg-paper text-leaf",
        )}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </span>
      <p className={cn("font-mono text-2xl font-bold sm:text-3xl", highlight && "text-leaf")}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-soft">{label}</p>
    </div>
  );
}
