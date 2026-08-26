// 간판/영수증 OCR 텍스트 안에 실제 방문한 식당 이름(Google Places 결과)이
// 들어있는지 판단한다. OCR은 오타/줄바꿈/여백이 섞이기 때문에 완전 일치 대신
// 정규화 + 부분 문자열 포함 + 편집거리 기반 유사도로 판단한다.

export type NameMatchResult = {
  matched: boolean;
  confidence: number; // 0~1
  source: "sign" | "receipt" | "none";
};

const MATCH_THRESHOLD = 0.72;

// 공백/특수문자 제거, 소문자화, 흔히 붙는 지점 표기 제거.
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .replace(/(본점|직영점|지점|매장|셀프)$/u, "");
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    new Array(b.length + 1).fill(0).map((_, j) => (i === 0 ? j : 0))
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// haystack(OCR 전체 텍스트)을 target 길이 근처의 윈도우로 슬라이딩하며
// 가장 비슷한 구간의 유사도를 찾는다. 영수증/간판엔 상호명 앞뒤로 다른
// 텍스트(주소, 전화번호, 품목)가 붙어있어서 전체 문자열끼리 바로 비교하면
// 안 된다.
function bestSubstringSimilarity(target: string, haystack: string): number {
  if (!target || !haystack) return 0;
  if (haystack.includes(target)) return 1;

  const len = target.length;
  let best = 0;
  for (let w = Math.max(1, len - 2); w <= len + 3; w++) {
    for (let i = 0; i + w <= haystack.length; i++) {
      const score = similarity(target, haystack.slice(i, i + w));
      if (score > best) best = score;
      if (best === 1) return 1;
    }
  }
  return best;
}

export function matchRestaurantName(
  expectedName: string,
  ocrTexts: { sign?: string; receipt?: string }
): NameMatchResult {
  const target = normalize(expectedName);
  if (!target) return { matched: false, confidence: 0, source: "none" };

  let best: NameMatchResult = { matched: false, confidence: 0, source: "none" };

  (["sign", "receipt"] as const).forEach((source) => {
    const text = ocrTexts[source];
    if (!text) return;
    const score = bestSubstringSimilarity(target, normalize(text));
    if (score > best.confidence) {
      best = { matched: score >= MATCH_THRESHOLD, confidence: score, source };
    }
  });

  return best;
}
