// 번역 문구의 변수 치환.
//
//   "{count}개 요리"                  -> { count: 3 }        -> "3개 요리"
//   "{restaurant|으로} 이동"          -> { restaurant: "본가" } -> "본가로 이동"
//
// "|조사" 수식어는 한국어 문구에서만 쓴다 - 식당·요리 이름처럼 데이터에서 오는 값 뒤에
// 조사를 그냥 붙이면 "본가으로" 같은 어색한 문장이 나오기 때문(src/i18n/josa.ts).

import { withJosa, type JosaForm } from "./josa";

export type Vars = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)(?:\|([^}]+))?\}/g;

export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (match, key: string, josaForm?: string) => {
    const value = vars[key];
    if (value === undefined) return match;
    const text = String(value);
    return josaForm ? withJosa(text, josaForm as JosaForm) : text;
  });
}
