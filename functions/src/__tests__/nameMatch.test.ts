// matchRestaurantName은 순수 함수(네트워크/외부 상태 없음)라 목킹 없이 그대로 테스트한다.
// 실제 OCR 결과물의 특성(오타, 줄바꿈, 주소/전화번호가 상호명 앞뒤에 붙어있음, "본점"
// 같은 지점 표기)을 흉내낸 케이스 위주로 구성했다.

import { matchRestaurantName } from "../nameMatch";

describe("matchRestaurantName", () => {
  it("간판 OCR 텍스트에 상호명이 정확히 포함되면 매칭된다", () => {
    const result = matchRestaurantName("김밥천국", { sign: "김밥천국\n영업중 24시간" });
    expect(result.matched).toBe(true);
    expect(result.source).toBe("sign");
  });

  it("OCR 텍스트에 주소/전화번호 등 다른 텍스트가 섞여 있어도 상호명 구간을 찾아낸다", () => {
    const result = matchRestaurantName("전주비빔밥", {
      sign: "서울시 강남구 테헤란로 123\n전주비빔밥\nTEL 02-1234-5678",
    });
    expect(result.matched).toBe(true);
  });

  it("OCR 오타(한두 글자 치환) 정도는 편집거리로 흡수해서 매칭된다", () => {
    // "설렁탕집" -> OCR이 "설령탕집"으로 잘못 읽은 경우
    const result = matchRestaurantName("설렁탕집", { sign: "설령탕집 원조" });
    expect(result.matched).toBe(true);
  });

  it("완전히 다른 상호명이면 매칭되지 않는다", () => {
    const result = matchRestaurantName("김밥천국", { sign: "스타벅스 강남점" });
    expect(result.matched).toBe(false);
  });

  it("'본점/지점/매장/셀프' 같은 흔한 지점 접미사는 제거하고 비교한다", () => {
    // 목표 상호명엔 접미사가 없는데 간판엔 붙어있는 경우
    const result = matchRestaurantName("소문난감자탕", { sign: "소문난감자탕 강남본점" });
    expect(result.matched).toBe(true);
  });

  it("간판/영수증 둘 다 있으면 더 유사도가 높은 쪽을 채택한다", () => {
    const result = matchRestaurantName("행복반점", {
      sign: "행복분식", // 살짝 다름
      receipt: "행복반점 영수증 12,000원",
    });
    expect(result.matched).toBe(true);
    expect(result.source).toBe("receipt");
  });

  it("OCR 텍스트가 둘 다 없으면(둘 다 인식 실패) source가 'none'이고 매칭되지 않는다", () => {
    const result = matchRestaurantName("김밥천국", {});
    expect(result.matched).toBe(false);
    expect(result.source).toBe("none");
    expect(result.confidence).toBe(0);
  });

  it("목표 상호명 자체가 빈 문자열이면 매칭되지 않는다", () => {
    const result = matchRestaurantName("", { sign: "아무거나" });
    expect(result.matched).toBe(false);
    expect(result.source).toBe("none");
  });

  it("임계값(0.72) 근처로 많이 달라진 이름은 매칭되지 않는다", () => {
    // 앞 두 글자만 같고 나머지는 전혀 다른 문자열 - 슬라이딩 윈도우로도 임계값을 못 넘겨야 함
    const result = matchRestaurantName("행복식당", { sign: "행복타워빌딩관리사무소입니다" });
    expect(result.matched).toBe(false);
  });
});
