// 한국어 조사 자동 선택 유틸.
//
// 식당 이름·요리 이름처럼 값이 데이터(Google Places / Firestore)에서 오는 경우
// 문구에 조사를 그냥 이어붙이면 "본가으로 이동"처럼 어색한 한국어가 나온다.
// 앞 글자의 받침 유무를 보고 알맞은 조사를 골라준다.

const PAIRS = {
  // [받침 있음, 받침 없음]
  "으로": ["으로", "로"],
  "은": ["은", "는"],
  "이": ["이", "가"],
  "을": ["을", "를"],
  "과": ["과", "와"],
} as const;

export type JosaForm = keyof typeof PAIRS;

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const RIEUL = 8; // 종성 인덱스에서 'ㄹ'

/**
 * word 뒤에 붙일 조사를 고른다.
 * 한글 음절이 아닌 글자(영문·숫자 등)로 끝나면 발음을 알 수 없으므로
 * 받침 없는 형태("로", "는", "가", ...)를 기본값으로 쓴다.
 */
export function josa(word: string | undefined | null, form: JosaForm): string {
  const [withBatchim, withoutBatchim] = PAIRS[form];
  const last = (word ?? "").trim().slice(-1);
  if (!last) return withoutBatchim;

  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return withoutBatchim;

  const batchim = (code - HANGUL_START) % 28;
  if (batchim === 0) return withoutBatchim;
  // '으로'만 예외: 받침이 'ㄹ'이면 "서울로"처럼 '로'를 쓴다.
  if (form === "으로" && batchim === RIEUL) return withoutBatchim;
  return withBatchim;
}

/** `${word}${josa(word, form)}` 축약형. 예: withJosa("본가", "으로") → "본가로" */
export function withJosa(word: string | undefined | null, form: JosaForm): string {
  return `${word ?? ""}${josa(word, form)}`;
}
