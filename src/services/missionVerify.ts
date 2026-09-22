// 미션 인증(사진 3장) -> functions/src/index.ts의 verifyMission Cloud Function 호출.
// 실제 판정 로직(OCR 상호명 대조 + Claude 요리 사진 판정)은 전부 서버(Functions)에서
// 돈다 - Vision/Anthropic API 키를 클라이언트에 노출시키지 않기 위함.

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/src/firebase/firebaseConfig";

// functions/src/index.ts가 HttpsError로 던지는 코드 중, 서버가 이미 사용자에게 보여줄
// 만한 한국어 메시지를 담아 보내는 것들(로그인 필요/잘못된 요청/존재하지 않는 요리 등).
// 이 코드들은 err.message를 그대로 보여준다. 그 외(internal/unavailable/deadline-exceeded
// 등 진짜 통신/서버 장애)는 아래의 일반 네트워크 안내 문구로 대체한다.
const CLIENT_FACING_FUNCTIONS_ERROR_CODES = new Set([
  "functions/invalid-argument",
  "functions/not-found",
  "functions/already-exists",
  "functions/permission-denied",
  "functions/failed-precondition",
  "functions/resource-exhausted",
  "functions/out-of-range",
  "functions/unauthenticated",
  "functions/unimplemented",
]);

export type Verdict = "pass" | "uncertain" | "fail";

export type NameMatchResult = {
  matched: boolean;
  confidence: number;
  source: "sign" | "receipt" | "none";
};

export type DishMatchResult = {
  matched: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type VerifyMissionResult = {
  verdict: Verdict;
  nameMatch: NameMatchResult;
  dishMatch: DishMatchResult;
  reasons: string[];
};

export class MissionVerifyError extends Error {}

const callVerifyMission = httpsCallable<
  {
    dishId: string;
    restaurantName: string;
    signPhotoBase64: string;
    foodPhotoBase64: string;
    receiptPhotoBase64?: string;
  },
  VerifyMissionResult
>(functions, "verifyMission");

export async function verifyMission(params: {
  dishId: string;
  restaurantName: string;
  signPhotoBase64: string;
  foodPhotoBase64: string;
  receiptPhotoBase64?: string;
}): Promise<VerifyMissionResult> {
  try {
    const res = await callVerifyMission(params);
    return res.data;
  } catch (err) {
    console.error("[verifyMission] 호출 실패:", err);
    // 서버가 이미 사용자 대상 메시지를 담아 보낸 경우(예: "로그인이 필요해요.",
    // "요리 정보를 찾을 수 없어요.")에는 그 메시지를 그대로 보여준다. 예전엔 원인과
    // 무관하게 항상 "네트워크 상태를 확인하고..."로 덮어써서, 실제로는 재시도해도
    // 절대 해결되지 않는 오류(잘못된 요청 등)까지 네트워크 문제인 것처럼 안내했다.
    if (
      err instanceof FirebaseError &&
      CLIENT_FACING_FUNCTIONS_ERROR_CODES.has(err.code) &&
      err.message
    ) {
      throw new MissionVerifyError(err.message);
    }
    throw new MissionVerifyError(
      "인증 서버와 통신하지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요."
    );
  }
}
