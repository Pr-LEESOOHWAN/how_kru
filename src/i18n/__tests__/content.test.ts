import {
  __content,
  categoryLabel,
  dishName,
  dishSubName,
  kickOptionLabel,
  kickQuestion,
  levelTitle,
  tagLabel,
} from "../content";

const bibimbap = { id: "bibimbap", name_kr: "비빔밥", name_en: "Bibimbap" };
const unknownDish = { id: "new_dish_2027", name_kr: "새 요리", name_en: "New Dish" };

describe("dishName / dishSubName", () => {
  it("한국어는 name_kr, 영어는 name_en, 일·중은 번역 사전을 쓴다", () => {
    expect(dishName(bibimbap, "ko")).toBe("비빔밥");
    expect(dishName(bibimbap, "en")).toBe("Bibimbap");
    expect(dishName(bibimbap, "ja")).toBe("ビビンバ");
    expect(dishName(bibimbap, "zh")).toBe("韩式拌饭");
  });

  it("사전에 없는 새 요리는 영어 이름으로 보인다", () => {
    expect(dishName(unknownDish, "ja")).toBe("New Dish");
    expect(dishName(unknownDish, "zh")).toBe("New Dish");
  });

  it("보조 이름은 한국어 사용자에겐 영문, 외국인에겐 한글 원어", () => {
    expect(dishSubName(bibimbap, "ko")).toBe("Bibimbap");
    expect(dishSubName(bibimbap, "en")).toBe("비빔밥");
    expect(dishSubName(bibimbap, "ja")).toBe("비빔밥");
  });
});

describe("categoryLabel", () => {
  it("'/'로 이어진 조각을 각각 번역해 ' · '로 잇는다", () => {
    expect(categoryLabel("구이/육류", "ko")).toBe("구이 · 육류");
    expect(categoryLabel("구이/육류", "en")).toBe("Grilled · Meat");
    expect(categoryLabel("국/탕", "ja")).toBe("汁物 · スープ（タン）");
  });

  it("모르는 조각은 원문 그대로, 값이 없으면 빈 문자열", () => {
    expect(categoryLabel("구이/신메뉴", "en")).toBe("Grilled · 신메뉴");
    expect(categoryLabel(undefined, "en")).toBe("");
  });
});

describe("tag / kick / level", () => {
  it("태그를 번역하고 모르는 태그는 그대로 둔다", () => {
    expect(tagLabel("very_spicy", "en")).toBe("Very spicy");
    expect(tagLabel("mystery_tag", "ja")).toBe("mystery_tag");
  });

  it("기본 킥 질문은 번역하고, 요리별 맞춤 질문은 원문을 쓴다", () => {
    expect(kickQuestion(undefined, "en")).toBe("How did you enjoy this dish?");
    expect(kickQuestion("이 요리를 어떻게 즐겼나요?", "zh")).toBe("你是怎么享用这道菜的？");
    expect(kickQuestion("특별한 질문", "en")).toBe("특별한 질문");
  });

  it("킥 선택지는 한국어 원문을 키로 번역한다(저장값은 그대로)", () => {
    expect(kickOptionLabel("케첩 찍어먹기", "ko")).toBe("케첩 찍어먹기");
    expect(kickOptionLabel("케첩 찍어먹기", "en")).toBe("Dip in ketchup");
    expect(kickOptionLabel("맛", "ja")).toBe("味");
    expect(kickOptionLabel("사전에 없는 답", "en")).toBe("사전에 없는 답");
  });

  it("레벨 칭호: 영어는 Firestore 원문, 나머지는 사전, 없으면 Level n", () => {
    expect(levelTitle(1, "Curious Beginner", "en")).toBe("Curious Beginner");
    expect(levelTitle(1, "Curious Beginner", "ko")).toBe("호기심 많은 입문자");
    expect(levelTitle(99, undefined, "ja")).toBe("Level 99");
    expect(levelTitle(99, undefined, "en")).toBe("Level 99");
  });
});

describe("번역 사전 무결성", () => {
  const { DISH_NAMES, CATEGORY_ATOMS, TAGS, KICK_OPTIONS, LEVEL_TITLES } = __content;
  const blank = (v: string) => v.trim() === "";

  it("요리 이름은 일·중 번역이 모두 있다", () => {
    expect(Object.keys(DISH_NAMES).length).toBeGreaterThanOrEqual(77);
    const bad = Object.entries(DISH_NAMES).filter(([, v]) => blank(v.ja) || blank(v.zh));
    expect(bad).toEqual([]);
  });

  it("카테고리·킥 선택지는 영·일·중 번역이 모두 있다", () => {
    for (const map of [CATEGORY_ATOMS, KICK_OPTIONS]) {
      const bad = Object.entries(map).filter(([, v]) => blank(v.en) || blank(v.ja) || blank(v.zh));
      expect(bad).toEqual([]);
    }
  });

  it("태그는 4개 언어가 모두 있다", () => {
    const bad = Object.entries(TAGS).filter(([, v]) => [v.ko, v.en, v.ja, v.zh].some(blank));
    expect(bad).toEqual([]);
  });

  it("레벨 칭호는 1~12레벨이 모두 있다", () => {
    for (let lvl = 1; lvl <= 12; lvl++) {
      expect(LEVEL_TITLES[lvl]).toBeDefined();
      expect(blank(LEVEL_TITLES[lvl].ko)).toBe(false);
    }
  });
});
