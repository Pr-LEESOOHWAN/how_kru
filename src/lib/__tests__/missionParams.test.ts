import { missionStartParams } from "../missionParams";

const dish = { id: "bibimbap", name_kr: "비빔밥", name_en: "Bibimbap", category: "밥류", level: 1, spice_level: 2 };

describe("missionStartParams", () => {
  it("원재료만 문자열로 넘긴다(표시 문구는 미션 화면이 언어에 맞게 만든다)", () => {
    expect(missionStartParams(dish)).toEqual({
      dishId: "bibimbap",
      name_kr: "비빔밥",
      name_en: "Bibimbap",
      category: "밥류",
      level: "1",
      spice: "2",
    });
  });

  it("썸네일과 완료 여부는 있을 때만 넣는다", () => {
    const params = missionStartParams(dish, { thumb: "https://img/x.jpg", completed: true });
    expect(params.image).toBe("https://img/x.jpg");
    expect(params.completed).toBe("1");

    const bare = missionStartParams(dish, { thumb: null, completed: false });
    expect(bare).not.toHaveProperty("image");
    expect(bare).not.toHaveProperty("completed");
  });

  it("없는 값은 키를 빼고, 맵기는 0으로 채운다", () => {
    const params = missionStartParams({ id: "x", name_kr: "엑스", name_en: "X" });
    expect(params).not.toHaveProperty("category");
    expect(params).not.toHaveProperty("level");
    expect(params.spice).toBe("0");
  });
});
