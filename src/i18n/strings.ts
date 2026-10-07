// 다국어 문구 사전.
// 지금은 설정 화면 + 홈 인사말 등 핵심 화면 일부만 등록되어 있고, 나머지 화면은
// 아직 한국어로 고정되어 있습니다. 새 화면에 다국어를 적용하려면 여기에 키를
// 추가하고 해당 화면에서 useLanguage()의 language 값으로 t(key, language)를 호출하면 됩니다.

import type { Language } from "@/src/contexts/LanguageContext";

const STRINGS = {
  settingsTitle: { ko: "환경설정", en: "Settings" },
  languageSectionTitle: { ko: "언어", en: "Language" },
  languageSectionDesc: {
    ko: "앱에서 사용할 언어를 선택하세요.",
    en: "Choose the language used in the app.",
  },
  languageKorean: { ko: "한국어", en: "Korean" },
  languageEnglish: { ko: "English", en: "English" },
  languageNoteTitle: { ko: "참고", en: "Note" },
  languageNote: {
    ko: "현재는 일부 화면에만 번역이 적용되어 있어요. 전체 화면 번역은 순차적으로 추가될 예정이에요.",
    en: "Only some screens are translated so far. Full app translation is being rolled out gradually.",
  },
  back: { ko: "뒤로", en: "Back" },
  homeGreeting: { ko: "다시 오셨네요", en: "Welcome back" },
} as const;

export type StringKey = keyof typeof STRINGS;

// [임시] 새 다국어 시스템(src/i18n/index.ts)으로 옮기는 중인 레거시 사전. 남은 화면을
// 전환하면 이 파일은 삭제한다. ja/zh는 여기 없으니 영어로 폴백.
export function t(key: StringKey, language: Language): string {
  const entry = STRINGS[key] as Record<string, string>;
  return entry[language] ?? entry.en ?? entry.ko;
}
