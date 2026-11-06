"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALES, type Language } from "./types";
import { DICTS } from "./translations";

interface I18nValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => DICTS.en[key] ?? key,
});

const STORAGE_KEY = "sortify:lang";

function detectLanguage(): Language {
  if (typeof navigator === "undefined") return "en";
  const candidates = (navigator.languages ?? [navigator.language]) as string[];
  for (const candidate of candidates) {
    const code = candidate.slice(0, 2).toLowerCase();
    if (LOCALES.some((l) => l.code === code)) return code as Language;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR + first client render use "en"; auto-detection runs after mount so
  // hydration stays consistent. Romanian browsers snap to RO in one frame.
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LOCALES.some((l) => l.code === stored)) {
      setLangState(stored as Language);
      document.documentElement.lang = stored;
      return;
    }
    const detected = detectLanguage();
    setLangState(detected);
    document.documentElement.lang = detected;
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
