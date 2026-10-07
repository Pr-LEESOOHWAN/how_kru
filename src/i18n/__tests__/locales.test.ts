// 번역 사전 무결성 검사.
//
// 키 누락은 타입(Record<MessageKey, ...>)으로 이미 막히지만, 번역문에서 {dish} 같은 변수를
// 빠뜨리거나 오타를 내는 실수는 타입이 못 잡는다 - 그러면 화면에 요리 이름이 빠진 문장이
// 나간다. 여기서 언어마다 변수 이름 집합이 한국어 원문과 같은지 확인한다.

import { en } from "../locales/en";
import { ja } from "../locales/ja";
import { ko } from "../locales/ko";
import { zh } from "../locales/zh";
import type { Plural } from "../types";

type Dict = Record<string, string | Plural>;

const OTHERS: Record<string, Dict> = { en, ja, zh };
const KO = ko as Dict;
const KEYS = Object.keys(KO);

/** "{name}" / "{name|으로}" 에서 변수 이름만 뽑아 정렬 */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)(?:\|[^}]+)?\}/g)].map((m) => m[1]).sort();
}

function forms(entry: string | Plural): string[] {
  return typeof entry === "string" ? [entry] : [entry.one, entry.other];
}

describe("locales", () => {
  it("한국어 사전이 비어 있지 않다", () => {
    expect(KEYS.length).toBeGreaterThan(200);
  });

  describe.each(Object.entries(OTHERS))("%s", (_lang, dict) => {
    it("한국어와 키 집합이 같다(누락도, 남는 키도 없다)", () => {
      expect(Object.keys(dict).sort()).toEqual([...KEYS].sort());
    });

    it("빈 문자열이 없다", () => {
      const empty = KEYS.filter((k) => forms(dict[k]).some((f) => f.trim() === ""));
      expect(empty).toEqual([]);
    });

    it("모든 문구의 변수 이름이 한국어 원문과 같다", () => {
      const mismatched = KEYS.flatMap((k) => {
        const expected = placeholders(KO[k] as string);
        return forms(dict[k])
          .filter((f) => JSON.stringify(placeholders(f)) !== JSON.stringify(expected))
          .map((f) => `${k}: ${f}`);
      });
      expect(mismatched).toEqual([]);
    });

    it("한국어 조사 수식어({x|으로})는 한국어에서만 쓴다", () => {
      const withJosa = KEYS.filter((k) => forms(dict[k]).some((f) => /\{\w+\|/.test(f)));
      expect(withJosa).toEqual([]);
    });
  });

  it("한국어 문구는 복수형 객체를 쓰지 않는다(조수사가 형태를 바꾸지 않는다)", () => {
    expect(KEYS.filter((k) => typeof KO[k] !== "string")).toEqual([]);
  });

  it("영어 복수형 문구는 count 변수를 갖는다", () => {
    const plurals = KEYS.filter((k) => typeof (en as Dict)[k] !== "string");
    expect(plurals.length).toBeGreaterThan(0);
    const missingCount = plurals.filter((k) => !forms((en as Dict)[k]).every((f) => f.includes("{count}")));
    expect(missingCount).toEqual([]);
  });
});
