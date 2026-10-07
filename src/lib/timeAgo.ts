import type { Language } from "@/src/contexts/LanguageContext";
import { LOCALE_TAG, translate } from "@/src/i18n";

type Timestamp = { seconds: number } | null | undefined;

/**
 * "방금 전 / 3분 전 / 2시간 전 / 4일 전", 일주일이 넘으면 그 언어의 날짜 표기("10월 3일",
 * "Oct 3")로. 서버 시간이 아직 안 찍힌(serverTimestamp 대기 중) 방금 쓴 글은 "방금 전".
 */
export function timeAgo(createdAt: Timestamp, language: Language, now = Date.now()): string {
  if (!createdAt) return translate(language, "time.justNow");
  const ms = createdAt.seconds * 1000;
  const diffMin = Math.floor((now - ms) / 60000);
  if (diffMin < 1) return translate(language, "time.justNow");
  if (diffMin < 60) return translate(language, "time.minutesAgo", { count: diffMin });
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return translate(language, "time.hoursAgo", { count: diffHour });
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return translate(language, "time.daysAgo", { count: diffDay });
  try {
    return new Date(ms).toLocaleDateString(LOCALE_TAG[language], { month: "short", day: "numeric" });
  } catch {
    // Intl을 못 쓰는 환경이면 "n일 전"으로 계속 표시
    return translate(language, "time.daysAgo", { count: diffDay });
  }
}
