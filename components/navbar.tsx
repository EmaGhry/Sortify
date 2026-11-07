"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronDown, History, Leaf, ScanLine } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LOCALES } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCANNER_LINKS = [
  { href: "/scan", key: "nav.scan", icon: ScanLine },
  { href: "/history", key: "nav.history", icon: History },
  { href: "/impact", key: "nav.impact", icon: Leaf },
  { href: "/guide", key: "nav.guide", icon: BookOpen },
];
const LINKS = [
  { href: "/kiosk", key: "nav.station" },
  { href: "/operator", key: "nav.operator" },
  ...SCANNER_LINKS,
];

function isStationPage(pathname: string) {
  return pathname === "/" || pathname === "/kiosk" || pathname === "/operator";
}

export function Navbar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper2/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-ink shadow-hard-sm transition-transform group-hover:-rotate-3">
            <Leaf className="size-4.5 text-paper" strokeWidth={2.2} />
          </span>
          <span className="font-sans text-lg font-black tracking-tight">
            SORT<span className="text-leaf">IFY</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-3 md:flex lg:gap-6" aria-label="Main">
          {LINKS.map(({ href, key }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "font-semibold text-xs uppercase tracking-wider pb-0.5 border-b-2 transition-colors",
                  active
                    ? "border-leaf text-leaf"
                    : "border-transparent text-ink-soft hover:text-ink hover:border-ink/30",
                )}
              >
                {t(key)}
              </Link>
            );
          })}
        </nav>

        <LanguageSwitch />
      </div>
    </header>
  );
}

function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        aria-label="Language / Limbă / Sprache"
        className="appearance-none rounded-md border-[1.5px] border-ink bg-paper2 py-1.5 pl-3 pr-8 text-xs font-bold uppercase tracking-wider text-ink outline-none transition-colors hover:bg-ink/5 cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-soft" strokeWidth={2.4} />
    </div>
  );
}

/** Scrolling facts strip — the editorial touch under the navbar. */
export function Ticker() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (isStationPage(pathname)) return null;
  const items = t("ticker.items");

  return (
    <div className="border-b-[1.5px] border-ink bg-ink text-paper overflow-hidden" aria-hidden>
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <span
            key={copy}
            className="whitespace-nowrap py-1.5 font-semibold text-xs uppercase tracking-wider"
          >
            {items}
          </span>
        ))}
      </div>
    </div>
  );
}

export function MobileTabbar() {
  const { t } = useI18n();
  const pathname = usePathname();
  if (isStationPage(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-[1.5px] border-ink bg-paper2 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile"
    >
      <div className="mx-auto grid max-w-md grid-cols-4">
        {SCANNER_LINKS.map(({ href, key, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 font-semibold text-xs uppercase tracking-wider transition-colors",
                active ? "text-leaf" : "text-ink-soft",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
