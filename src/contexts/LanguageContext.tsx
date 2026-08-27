// 환경설정 > 언어 기능.
//
// 지금 앱 화면 대부분은 한국어로 하드코딩되어 있어서(전체 화면 다국어화는 별도의
// 큰 작업), 이 컨텍스트는 우선 "언어 설정값을 저장/전환하는 기반"을 만드는 역할을
// 합니다. src/i18n/strings.ts에 등록된 문구들은 즉시 언어에 따라 바뀌고,
// 앞으로 다른 화면들도 이 방식으로 하나씩 다국어 지원을 넓혀갈 수 있습니다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "ko" | "en";

const STORAGE_KEY = "how_kru_language";

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
  const [language, setLanguageState] = useState<Language>("ko");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "ko" || saved === "en") {
          setLanguageState(saved);
        }
      } catch {
        // 저장된 값을 못 읽어와도 기본값(한국어)으로 계속 진행
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
