import type { Language } from "./types";
import ro from "../locales/dict.ro.json";
import en from "../locales/dict.en.json";
import de from "../locales/dict.de.json";
import hu from "../locales/dict.hu.json";
import fr from "../locales/dict.fr.json";
import it from "../locales/dict.it.json";
import es from "../locales/dict.es.json";

export type Dict = Record<string, string>;

/**
 * Single source of truth for all localized strings (UI chrome, knowledge base,
 * badges, levels, demo items). Files live in `locales/dict.{lang}.json`.
 *
 * Hand-edit `dict.ro.json` / `dict.en.json` freely; the other five are
 * regenerated with `npm run i18n:translate` (AI-translated from these two,
 * validated, then reviewed and committed).
 */
export const DICTS: Record<Language, Dict> = {
  ro: ro as Dict,
  en: en as Dict,
  de: de as Dict,
  hu: hu as Dict,
  fr: fr as Dict,
  it: it as Dict,
  es: es as Dict,
};

/** Translate `key` for `lang`, falling back to EN, then to the key itself. */
export function translate(lang: Language, key: string): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
}

/** Build a full `Record<Language, string>` for one key (used by knowledge base modules). */
export function pick(key: string): Record<Language, string> {
  return {
    ro: translate("ro", key),
    en: translate("en", key),
    de: translate("de", key),
    hu: translate("hu", key),
    fr: translate("fr", key),
    it: translate("it", key),
    es: translate("es", key),
  };
}

/** Build a `Record<Language, string[]>` from indexed keys: `${prefix}.0`, `${prefix}.1`, … */
export function pickList(prefix: string, count: number): Record<Language, string[]> {
  const build = (lang: Language) =>
    Array.from({ length: count }, (_, i) => translate(lang, `${prefix}.${i}`));
  return {
    ro: build("ro"),
    en: build("en"),
    de: build("de"),
    hu: build("hu"),
    fr: build("fr"),
    it: build("it"),
    es: build("es"),
  };
}
