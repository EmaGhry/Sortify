"use client";

import Link from "next/link";
import type { StoredScan } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { MATERIAL_PROFILES } from "@/lib/materials";
import { MaterialIcon } from "@/components/material-icon";
import { timeAgo } from "@/lib/utils";

export function RecentScans({ scans }: { scans: StoredScan[] }) {
  const { t, lang } = useI18n();

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between border-b-[1.5px] border-ink pb-2">
        <h2 className=" text-xs font-bold uppercase tracking-wider">{t("scan.recent")}</h2>
        <Link href="/history" className="font-semibold text-xs uppercase tracking-wider text-leaf hover:underline underline-offset-4">
          {t("nav.history")} →
        </Link>
      </div>
      {scans.length === 0 ? (
        <p className="card-print px-4 py-5 font-mono text-xs text-ink-soft">{t("scan.recentEmpty")}</p>
      ) : (
        <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 pt-1">
          {scans.slice(0, 12).map((scan, idx) => {
            const profile = MATERIAL_PROFILES[scan.material];
            return (
              <Link
                key={scan.id}
                href="/history"
                className="card-print flex w-36 shrink-0 flex-col gap-2 p-2.5 transition-transform hover:-translate-y-0.5"
                title={scan.itemName}
              >
                {scan.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={scan.thumb}
                    alt={scan.itemName}
                    className="h-16 w-full rounded border-[1.5px] border-ink object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-full place-items-center rounded border-[1.5px] border-ink bg-paper">
                    <MaterialIcon material={scan.material} size="sm" />
                  </div>
                )}
                <div className="min-w-0 px-0.5 pb-0.5">
                  <p className="flex items-center justify-between font-semibold text-xs uppercase tracking-wider text-ink-soft">
                    <span>#{String(idx + 1).padStart(2, "0")}</span>
                    <span>{timeAgo(scan.createdAt, lang)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold capitalize" title={scan.itemName}>
                    {scan.itemName}
                  </p>
                  <p className=" text-xs font-bold uppercase tracking-wider" style={{ color: profile.id === "OTHER" ? undefined : profile.bin.color }}>
                    {profile.label[lang]}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
