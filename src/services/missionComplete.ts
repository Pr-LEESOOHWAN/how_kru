// 미션 완료 기록 -> functions/src/index.ts의 completeMission Cloud Function 호출.
//
// 예전엔 앱이 users 문서에 완료 목록/XP/레벨을 직접 썼다(dishService.markDishCompleted,
// levelUp). 그러면 사진 인증 없이도 완료가 되고 사용자가 레벨을 고칠 수도 있어서, 이제는
// verifyMission이 발급한 인증 티켓(verificationId)을 서버에 넘겨야만 기록된다.
// 레벨업 판정도 서버가 해서 결과로 돌려준다.

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { functions } from "@/src/firebase/firebaseConfig";

export type CompleteMissionResult = {
  /** 이미 완료했던 요리라 XP가 다시 지급되지 않음 */
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  /** 완료 반영 후 레벨 */
  level: number;
};

/**
 * retryable=false: 다시 시도해도 안 되는 경우(티켓 만료/없음 등) - 인증부터 다시 해야 한다.
 */
export class CompleteMissionError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean
  ) {
    super(message);
  }
}

const NOT_RETRYABLE = new Set([
  "functions/not-found",
  "functions/failed-precondition",
  "functions/permission-denied",
  "functions/invalid-argument",
]);

const callCompleteMission = httpsCallable<{ verificationId: string }, CompleteMissionResult>(
  functions,
  "completeMission"
);

export async function completeMission(verificationId: string): Promise<CompleteMissionResult> {
  try {
    const res = await callCompleteMission({ verificationId });
    return res.data;
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : "";
    throw new CompleteMissionError(err instanceof Error ? err.message : String(err), !NOT_RETRYABLE.has(code));
  }
}
