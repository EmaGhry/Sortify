"use client";

import { useMemo, useState } from "react";
import { Check, Leaf, Search, X } from "lucide-react";
import { MATERIAL_PROFILES, type MaterialProfile } from "@/lib/materials";
import { MATERIALS, type Material } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { MaterialIcon } from "@/components/material-icon";
import { formatGrams } from "@/lib/utils";

const ALL = MATERIALS as Material[];

export function GuideClient() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");

  const profiles = useMemo(() => ALL.map((m) => MATERIAL_PROFILES[m]), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        p.label[lang].toLowerCase().includes(q) ||
        p.description[lang].toLowerCase().includes(q) ||
        p.dos[lang].join(" ").toLowerCase().includes(q),
    );
  }, [profiles, query, lang]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 max-w-xl">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-leaf">
          {t("guide.kicker")}
        </p>
        <h1 className="mt-2 font-display text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl">
          {t("guide.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">{t("guide.subtitle")}</p>
      </div>

      <div className="card-print mb-8 flex items-center gap-3 rounded-lg px-4 py-3.5 shadow-hard-sm">
        <Search className="size-4.5 shrink-0 text-ink-soft" strokeWidth={2.2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("guide.search")}
          className="w-full bg-transparent font-mono text-sm outline-none placeholder:text-ink-soft"
          type="search"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card-print grid place-items-center rounded-xl py-16 text-center">
          <div>
            <span className="mx-auto grid size-12 -rotate-2 place-items-center rounded-md border-[1.5px] border-ink bg-paper">
              <Leaf className="size-6 text-leaf" />
            </span>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-ink-soft">
              {t("impact.noData")}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((profile) => (
            <GuideCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}

function GuideCard({ profile }: { profile: MaterialProfile }) {
  const { t, lang } = useI18n();
  return (
    <article className="card-print rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-hard">
      <div className="flex items-center gap-3.5 border-b-[1.5px] border-ink pb-4">
        <MaterialIcon material={profile.id} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">{profile.label[lang]}</h2>
          <span
            className="mt-1.5 inline-block -rotate-1 rounded-md border-[1.5px] border-ink px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
            style={{ backgroundColor: `${profile.bin.color}55` }}
          >
            {profile.bin.label[lang]}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{profile.description[lang]}</p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-leaf">
            {t("guide.whatGoes")}
          </h3>
          <ul className="space-y-2">
            {profile.dos[lang].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug">
                <Check className="mt-0.5 size-3.5 shrink-0 text-leaf" strokeWidth={2.4} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-danger">
            {t("guide.whatDoesnt")}
          </h3>
          <ul className="space-y-2">
            {profile.donts[lang].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug">
                <X className="mt-0.5 size-3.5 shrink-0 text-danger" strokeWidth={2.4} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-4 inline-block rounded-md border-[1.5px] border-ink bg-paper px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
        {t("guide.co2Note")}: <span className="text-leaf">{formatGrams(profile.co2PerItemG, lang)} CO2</span>
      </p>
    </article>
  );
}
