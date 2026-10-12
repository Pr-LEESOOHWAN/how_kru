// planCompletion / checkTicket은 Firestore 접근이 없는 순수 함수라 목킹 없이 테스트한다.

import { checkTicket, MAX_LEVEL, MISSION_COMPLETE_XP, planCompletion, TICKET_TTL_MS } from "../completion";

const LEVEL1 = ["bibimbap", "bulgogi", "gimbap"];

describe("planCompletion", () => {
  it("처음 완료하는 요리는 XP를 주고 진행 개수를 센다", () => {
    const plan = planCompletion({
      completedDishes: ["bulgogi"],
      currentLevel: 1,
      dishId: "bibimbap",
      levelDishIds: LEVEL1,
      requiredCount: 3,
    });
    expect(plan).toEqual({ alreadyCompleted: false, xpGained: MISSION_COMPLETE_XP, progress: 2, leveledUp: false, level: 1 });
  });

  it("이미 완료한 요리는 XP를 다시 주지 않는다", () => {
    const plan = planCompletion({
      completedDishes: ["bibimbap"],
      currentLevel: 1,
      dishId: "bibimbap",
      levelDishIds: LEVEL1,
      requiredCount: 3,
    });
    expect(plan.alreadyCompleted).toBe(true);
    expect(plan.xpGained).toBe(0);
    expect(plan.progress).toBe(1);
  });

  it("기준 개수를 채우면 다음 레벨로 올린다", () => {
    const plan = planCompletion({
      completedDishes: ["bibimbap", "bulgogi"],
      currentLevel: 1,
      dishId: "gimbap",
      levelDishIds: LEVEL1,
      requiredCount: 3,
    });
    expect(plan.leveledUp).toBe(true);
    expect(plan.level).toBe(2);
  });

  it("다른 레벨 요리는 현재 레벨 진행 개수에 들어가지 않는다", () => {
    const plan = planCompletion({
      completedDishes: ["bibimbap", "bulgogi"],
      currentLevel: 1,
      dishId: "sannakji",
      levelDishIds: LEVEL1,
      requiredCount: 3,
    });
    expect(plan.progress).toBe(2);
    expect(plan.leveledUp).toBe(false);
    expect(plan.xpGained).toBe(MISSION_COMPLETE_XP);
  });

  it("required_count를 모르면 레벨업하지 않는다", () => {
    const plan = planCompletion({
      completedDishes: [],
      currentLevel: 1,
      dishId: "bibimbap",
      levelDishIds: LEVEL1,
      requiredCount: undefined,
    });
    expect(plan.leveledUp).toBe(false);
    expect(plan.level).toBe(1);
  });

  it("최고 레벨에서는 더 올라가지 않는다", () => {
    const plan = planCompletion({
      completedDishes: [],
      currentLevel: MAX_LEVEL,
      dishId: "x",
      levelDishIds: ["x"],
      requiredCount: 1,
    });
    expect(plan.leveledUp).toBe(false);
    expect(plan.level).toBe(MAX_LEVEL);
  });

  it("필드가 없는 레거시 유저 문서도 레벨 1, 빈 목록으로 처리한다", () => {
    const plan = planCompletion({
      completedDishes: undefined,
      currentLevel: undefined,
      dishId: "bibimbap",
      levelDishIds: LEVEL1,
      requiredCount: 3,
    });
    expect(plan).toEqual({ alreadyCompleted: false, xpGained: MISSION_COMPLETE_XP, progress: 1, leveledUp: false, level: 1 });
  });

  it("범위를 벗어난 레벨 값은 1~12로 맞춘다", () => {
    expect(planCompletion({ completedDishes: [], currentLevel: 99, dishId: "x", levelDishIds: [], requiredCount: 5 }).level).toBe(MAX_LEVEL);
    expect(planCompletion({ completedDishes: [], currentLevel: 0, dishId: "x", levelDishIds: [], requiredCount: 5 }).level).toBe(1);
  });
});

describe("checkTicket", () => {
  const now = 1_800_000_000_000;

  it("본인 티켓이고 유효 시간 안이면 통과", () => {
    expect(checkTicket({ uid: "u1", createdAtMs: now - 60_000 }, "u1", now)).toEqual({ ok: true });
  });

  it("다른 사람의 티켓은 거절", () => {
    expect(checkTicket({ uid: "u2", createdAtMs: now }, "u1", now)).toEqual({ ok: false, reason: "wrong_user" });
  });

  it("유효 시간이 지난 티켓은 거절", () => {
    expect(checkTicket({ uid: "u1", createdAtMs: now - TICKET_TTL_MS - 1 }, "u1", now)).toEqual({ ok: false, reason: "expired" });
  });
});
