import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { judgeDishPhoto } from "./dishMatch";
import { matchRestaurantName } from "./nameMatch";
import { extractText } from "./vision";

initializeApp();
const db = getFirestore();

type VerifyMissionRequest = {
  dishId: string;
  restaurantName: string;
  signPhotoBase64: string;
  foodPhotoBase64: string;
  receiptPhotoBase64?: string;
};

type Verdict = "pass" | "uncertain" | "fail";

type DishDoc = {
  name_kr: string;
  name_en: string;
  category?: string;
  tags?: string[];
};

// 사진 3장(간판/요리/영수증(선택)) + 목표 요리/식당 정보를 받아서
//   1) 간판·영수증 OCR 텍스트가 실제 방문한 식당명과 맞는지
//   2) 요리 사진이 목표 요리로 보이는지 (Cloud Vision 라벨/웹 감지)
// 를 확인하고 종합 판정(pass/uncertain/fail)을 돌려준다.
//
// 정책은 관대하게: 하나만 확실히 맞아도 "uncertain"(재촬영 권장, 강행 가능)까지는
// 통과시키고, 둘 다 뚜렷하게 안 맞을 때만 "fail"로 막는다. 최종 강행 여부는
// 클라이언트(app/mission/verify.tsx)에서 사용자가 결정한다.
export const verifyMission = onCall(
  {
    timeoutSeconds: 60,
    memory: "512MiB",
    // 서울 리전 - 클라이언트(src/firebase/firebaseConfig.ts)의 getFunctions(app, region)과
    // 반드시 일치해야 한다. 안 맞으면 클라이언트에서 함수를 못 찾는다.
    region: "asia-northeast3",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요해요.");
    }

    const data = (request.data ?? {}) as Partial<VerifyMissionRequest>;
    const { dishId, restaurantName, signPhotoBase64, foodPhotoBase64, receiptPhotoBase64 } = data;

    if (!dishId || !restaurantName || !signPhotoBase64 || !foodPhotoBase64) {
      throw new HttpsError("invalid-argument", "필요한 정보가 빠졌어요.");
    }

    const dishSnap = await db.collection("dishes").doc(dishId).get();
    if (!dishSnap.exists) {
      throw new HttpsError("not-found", "요리 정보를 찾을 수 없어요.");
    }
    const dish = dishSnap.data() as DishDoc;

    const [signText, receiptText, dishJudgement] = await Promise.all([
      extractText(signPhotoBase64).catch((err) => {
        console.error("[verifyMission] 간판 OCR 실패:", err);
        return "";
      }),
      receiptPhotoBase64
        ? extractText(receiptPhotoBase64).catch((err) => {
            console.error("[verifyMission] 영수증 OCR 실패:", err);
            return "";
          })
        : Promise.resolve(""),
      judgeDishPhoto({
        imageBase64: foodPhotoBase64,
        dishNameKr: dish.name_kr,
        dishNameEn: dish.name_en,
        category: dish.category,
        tags: dish.tags,
      }),
    ]);

    const nameResult = matchRestaurantName(restaurantName, {
      sign: signText,
      receipt: receiptText,
    });

    let verdict: Verdict;
    if (nameResult.matched && dishJudgement.matched) {
      verdict = "pass";
    } else if (!nameResult.matched && !dishJudgement.matched) {
      verdict = "fail";
    } else {
      verdict = "uncertain";
    }

    const reasons: string[] = [];
    if (!nameResult.matched) {
      reasons.push(
        nameResult.source === "none"
          ? "간판/영수증에서 상호명을 확인하지 못했어요."
          : `사진에서 읽은 글자가 '${restaurantName}'와 달라 보여요.`
      );
    }
    if (!dishJudgement.matched) {
      reasons.push(dishJudgement.reason || `사진이 '${dish.name_kr}'로 보이지 않아요.`);
    }

    return { verdict, nameMatch: nameResult, dishMatch: dishJudgement, reasons };
  }
);
