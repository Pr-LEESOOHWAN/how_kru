import type { ko } from "./locales/ko";

export type MessageKey = keyof typeof ko;

/** 영어처럼 단수/복수가 갈리는 언어용 */
export type Plural = { one: string; other: string };

export type Messages = Record<MessageKey, string>;
export type PluralMessages = Record<MessageKey, string | Plural>;
