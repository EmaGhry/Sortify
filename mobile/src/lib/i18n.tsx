import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getLocales } from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LOCALES, type Language } from "@shared/types";
import { DICTS } from "@shared/translations";

/**
 * RN i18n — reuses the exact same dictionaries as the web app
 * (locales/dict.*.json). Device locale auto-detect, manual choice persisted.
 */

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
  for (const locale of getLocales()) {
    const code = (locale.languageCode ?? "").slice(0, 2).toLowerCase();
    if (LOCALES.some((l) => l.code === code)) return code as Language;
  }
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && LOCALES.some((l) => l.code === stored)) {
          setLangState(stored as Language);
          return;
        }
      } catch {
        /* fall through to device locale */
      }
      setLangState(detectLanguage());
    })();
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    void AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
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
