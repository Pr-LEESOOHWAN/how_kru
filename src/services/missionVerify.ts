// 미션 인증(사진 3장) -> functions/src/index.ts의 verifyMission Cloud Function 호출.
// 실제 판정 로직(OCR 상호명 대조 + Claude 요리 사진 판정)은 전부 서버(Functions)에서
// 돈다 - Vision/Anthropic API 키를 클라이언트에 노출시키지 않기 위함.

import { httpsCallable } from "firebase/functions";
import { functions } from "@/src/firebase/firebaseConfig";

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
    throw new MissionVerifyError(
      "인증 서버와 통신하지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요."
    );
  }
}
