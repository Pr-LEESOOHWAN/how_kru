// 다국어 진입점.
//
//   const { t, language } = useI18n();
//   t("home.greeting", { name })
//
// 키가 없는 언어는 영어 -> 한국어 순으로 폴백한다(타입상 누락은 불가능하지만, 런타임에
// 사전 객체가 비정상일 때도 화면이 키 문자열을 그대로 노출하지 않도록).

import { useLanguage, type Language } from "@/src/contexts/LanguageContext";

import { format, type Vars } from "./format";
import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { zh } from "./locales/zh";
import type { MessageKey, Plural } from "./types";

export type { MessageKey } from "./types";

const DICTS: Record<Language, Record<string, string | Plural>> = { ko, en, ja, zh };

function pick(entry: string | Plural, vars?: Vars): string {
  if (typeof entry === "string") return entry;
  return vars?.count === 1 ? entry.one : entry.other;
}

export function translate(language: Language, key: MessageKey, vars?: Vars): string {
  const entry = DICTS[language][key] ?? DICTS.en[key] ?? ko[key];
  return format(pick(entry, vars), vars);
}

/** BCP 47 태그 - Intl API(숫자/날짜 포맷)용 */
export const LOCALE_TAG: Record<Language, string> = {
  ko: "ko-KR",
  en: "en-US",
  ja: "ja-JP",
  zh: "zh-CN",
};

export function useI18n() {
  const { language, setLanguage } = useLanguage();
  const t = (key: MessageKey, vars?: Vars) => translate(language, key, vars);
  return { t, language, setLanguage };
}
