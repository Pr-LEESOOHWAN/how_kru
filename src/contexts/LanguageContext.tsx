// 앱 언어 컨텍스트 (한국어 / English / 日本語 / 中文).
//
// 호꾸는 외국인 대상 앱인데 2026-10 다국어화 전까지는 문구가 거의 전부 한국어로 고정돼
// 있었다. 이제 모든 화면 문구는 src/i18n/locales/*의 사전을 거친다.
//
// 기본 언어: 사용자가 환경설정에서 고른 적이 있으면 그 값, 아니면 기기 언어를 따른다
// (지원하지 않는 언어면 영어). 고른 적이 없는 동안은 저장하지 않아서, 기기 언어를 바꾸면
// 앱도 따라 바뀐다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "ko" | "en" | "ja" | "zh";

export const SUPPORTED_LANGUAGES: Language[] = ["ko", "en", "ja", "zh"];

const STORAGE_KEY = "how_kru_language";

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

/** 기기 언어 -> 지원 언어. zh-Hant(대만/홍콩)도 지금은 간체 사전으로 보낸다. */
export function deviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode ?? "";
    return isLanguage(code) ? code : "en";
  } catch {
    return "en";
  }
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  loaded: boolean;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: "ko",
  setLanguage: () => {},
  loaded: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(deviceLanguage);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (isLanguage(saved)) setLanguageState(saved);
      } catch {
        // 저장된 값을 못 읽어오면 기기 언어로 계속 진행
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch((err) => {
      console.error("[LanguageContext] 언어 설정 저장 실패:", err);
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, loaded }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
