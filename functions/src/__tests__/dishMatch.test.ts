// judgeDishPhoto 자체는 Cloud Vision을 실제로 호출하지 않고, detectFoodTerms()가
// 반환하는 라벨/웹 엔티티 문자열 배열만 갖고 판정한다. 그래서 vision.ts를 통째로
// 목킹해서 "Vision이 이런 라벨을 감지했다고 치면 판정 로직이 어떻게 반응하는가"만
// 순수하게 테스트한다.

import { judgeDishPhoto } from "../dishMatch";
import { detectFoodTerms } from "../vision";

jest.mock("../vision", () => ({
  detectFoodTerms: jest.fn(),
}));

const mockDetectFoodTerms = detectFoodTerms as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("judgeDishPhoto", () => {
  it("라벨이 요리명(영문)을 그대로 포함하면 high confidence로 매칭된다", async () => {
    mockDetectFoodTerms.mockResolvedValueOnce(["Korean Bibimbap", "rice", "bowl"]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "비빔밥",
      dishNameEn: "Bibimbap",
      category: "rice",
      tags: ["korean", "mixed rice"],
    });
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe("high");
  });

  it("이름은 안 맞아도 등록된 태그와 겹치면 medium confidence로 매칭된다", async () => {
    mockDetectFoodTerms.mockResolvedValueOnce(["grilled fish", "seafood"]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "고등어구이",
      dishNameEn: "Grilled Mackerel",
      category: "fish",
      tags: ["grilled fish", "seafood"],
    });
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe("medium");
  });

  it("회귀: 아주 흔한 한 단어 라벨(예: 'soup')만으로는 요리명에 그 단어가 포함된다는 " +
    "이유로 high confidence 매칭되면 안 된다 (실제 배포 코드에서 있었던 버그)", async () => {
    // 완전히 다른 국물 요리 사진을 찍었는데 Vision이 뭉뚱그려서 "soup"이라고만 감지한 상황.
    // "Bean Sprout Soup"이라는 이름에 "soup"이 부분 포함된다는 이유만으로 매칭돼선 안 된다.
    mockDetectFoodTerms.mockResolvedValueOnce(["soup", "food", "bowl"]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "콩나물국",
      dishNameEn: "Bean Sprout Soup",
      category: "soup",
      tags: ["mild", "bean sprout"], // "soup" 자체는 태그에도 없음 - tier 2로도 안 걸려야 함
    });
    expect(result.matched).toBe(false);
  });

  it("카테고리만 겹치면 '비슷한 종류'로 설명은 하되 matched는 false로 남는다", async () => {
    mockDetectFoodTerms.mockResolvedValueOnce(["soup", "broth"]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "된장찌개",
      dishNameEn: "Doenjang Jjigae",
      category: "soup",
      tags: ["fermented soybean"],
    });
    expect(result.matched).toBe(false);
    expect(result.reason).toContain("비슷한 종류");
  });

  it("아무 특징도 감지되지 않으면 matched는 false이고 그 사실을 알려준다", async () => {
    mockDetectFoodTerms.mockResolvedValueOnce([]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "비빔밥",
      dishNameEn: "Bibimbap",
    });
    expect(result.matched).toBe(false);
    expect(result.reason).toContain("인식하지 못했어요");
  });

  it("완전히 관련 없는 요리 라벨이 감지되면 matched는 false다", async () => {
    mockDetectFoodTerms.mockResolvedValueOnce(["pizza", "cheese", "italian food"]);
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "비빔밥",
      dishNameEn: "Bibimbap",
      category: "rice",
      tags: ["korean"],
    });
    expect(result.matched).toBe(false);
  });

  it("Vision 호출 자체가 실패하면 matched:false, low confidence로 안전하게 처리한다", async () => {
    mockDetectFoodTerms.mockRejectedValueOnce(new Error("Vision API timeout"));
    const result = await judgeDishPhoto({
      imageBase64: "x",
      dishNameKr: "비빔밥",
      dishNameEn: "Bibimbap",
    });
    expect(result.matched).toBe(false);
    expect(result.confidence).toBe("low");
  });
});
