// 미션 인증(사진 3장) -> functions/src/index.ts의 verifyMission Cloud Function 호출.
// 실제 판정 로직(OCR 상호명 대조 + Cloud Vision 요리 사진 판정)은 전부 서버에서 돈다 -
// Vision API 키를 클라이언트에 노출시키지 않기 위함.

import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";

import { functions } from "@/src/firebase/firebaseConfig";
import type { MessageKey } from "@/src/i18n/types";

export type Verdict = "pass" | "uncertain" | "fail";

export type NameMatchResult = {
  matched: boolean;
  confidence: number;
  source: "sign" | "receipt" | "none";
};

export type DishMatchCode =
  | "dish_name_hit"
  | "dish_tag_hit"
  | "dish_similar_category"
  | "dish_mismatch"
  | "dish_nothing_detected"
  | "dish_detect_failed";

export type DishMatchResult = {
  matched: boolean;
  confidence: "high" | "medium" | "low";
  code?: DishMatchCode;
  terms?: string[];
  reason: string;
};

/** 서버가 판정 이유를 언어와 무관하게 돌려주는 형태 (2026-10 다국어화) */
export type ReasonCode =
  | { code: "name_not_found" }
  | { code: "name_mismatch"; restaurant: string }
  | { code: DishMatchCode; terms?: string[] };

export type VerifyMissionResult = {
  verdict: Verdict;
  nameMatch: NameMatchResult;
  dishMatch: DishMatchResult;
  /** 한국어 문장 - 코드를 모르는 구버전 서버 응답일 때의 폴백 */
  reasons: string[];
  reasonCodes?: ReasonCode[];
};

/** key: 화면에 보여줄 번역 키 */
export class MissionVerifyError extends Error {
  constructor(public readonly key: MessageKey) {
    super(key);
  }
}

// functions/src/index.ts가 HttpsError로 던지는 코드 -> 안내 문구. 이 셋은 다시 시도해도
// 해결되지 않는 오류라 "네트워크를 확인하세요"로 뭉뚱그리면 안 된다. 그 외(internal/
// unavailable/deadline-exceeded 등 진짜 통신/서버 장애)는 일반 통신 오류 안내로 보여준다.
const ERROR_KEYS: Record<string, MessageKey> = {
  "functions/unauthenticated": "verify.error.auth",
  "functions/invalid-argument": "verify.error.missingPhotos",
  "functions/not-found": "verify.error.dishNotFound",
};

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
    const key = err instanceof FirebaseError ? ERROR_KEYS[err.code] : undefined;
    throw new MissionVerifyError(key ?? "verify.error.network");
  }
}
