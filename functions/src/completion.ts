// 미션 완료 계산(순수 함수) - completeMission Cloud Function이 사용한다.
//
// 2026-10 전까지는 앱이 users 문서의 completed_dishes / xp / current_level을 직접 썼다
// (src/firebase/dishService.ts의 markDishCompleted, levelUp). 그래서 사진 인증 없이도 앱에서
// 완료 처리를 할 수 있었고, Firestore 규칙상 사용자가 자기 레벨/XP를 마음대로 바꿀 수도 있었다.
// 이제 진행도는 서버만 쓴다: verifyMission이 사진을 판정하며 발급한 인증 티켓을 받아야만
// 완료가 기록되고, 레벨업 판정도 여기서 한다. Firestore 접근이 없는 계산만 따로 떼어 테스트한다.

export const MISSION_COMPLETE_XP = 50;
export const MAX_LEVEL = 12;

/** 인증 후 이 시간 안에만 완료를 기록할 수 있다(티켓 재사용·묵혀두기 방지). */
export const TICKET_TTL_MS = 6 * 60 * 60 * 1000;

export type CompletionInput = {
  /** users/{uid}.completed_dishes (레거시 문서엔 없을 수 있다) */
  completedDishes: string[] | undefined;
  /** users/{uid}.current_level */
  currentLevel: number | undefined;
  dishId: string;
  /** 현재 레벨에 속한 요리 id 목록 */
  levelDishIds: string[];
  /** levels/{currentLevel}.required_count - 문서가 없거나 값이 없으면 레벨업 판정을 하지 않는다 */
  requiredCount: number | undefined;
};

export type CompletionPlan = {
  alreadyCompleted: boolean;
  xpGained: number;
  /** 이번 완료 반영 후 현재 레벨에서 완료한 개수 */
  progress: number;
  leveledUp: boolean;
  /** 이번 완료 반영 후 레벨 */
  level: number;
};

export function planCompletion(input: CompletionInput): CompletionPlan {
  const completed = input.completedDishes ?? [];
  const alreadyCompleted = completed.includes(input.dishId);
  const after = alreadyCompleted ? completed : [...completed, input.dishId];
  const level = Math.min(Math.max(Math.floor(input.currentLevel ?? 1), 1), MAX_LEVEL);

  const doneSet = new Set(after);
  const progress = input.levelDishIds.filter((id) => doneSet.has(id)).length;

  // required_count를 모르면 레벨업하지 않는다. (예전 앱은 기준치 대신 progress를 써서
  // "progress >= progress"가 항상 참이 되어 설정 문서가 비면 무조건 레벨업되는 버그가 있었다.)
  const leveledUp =
    typeof input.requiredCount === "number" &&
    input.requiredCount > 0 &&
    progress >= input.requiredCount &&
    level < MAX_LEVEL;

  return {
    alreadyCompleted,
    xpGained: alreadyCompleted ? 0 : MISSION_COMPLETE_XP,
    progress,
    leveledUp,
    level: leveledUp ? level + 1 : level,
  };
}

export type TicketCheck =
  | { ok: true }
  | { ok: false; reason: "wrong_user" | "expired" };

/** 인증 티켓이 이 사용자 것이고 아직 유효한지 */
export function checkTicket(ticket: { uid: string; createdAtMs: number }, uid: string, nowMs: number): TicketCheck {
  if (ticket.uid !== uid) return { ok: false, reason: "wrong_user" };
  if (nowMs - ticket.createdAtMs > TICKET_TTL_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
