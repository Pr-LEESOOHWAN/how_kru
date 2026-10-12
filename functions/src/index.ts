import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { checkTicket, planCompletion } from "./completion";
import { judgeDishPhoto, type DishMatchResult } from "./dishMatch";
import { matchRestaurantName } from "./nameMatch";
import { extractText } from "./vision";

initializeApp();
const db = getFirestore();

type VerifyMissionRequest = {
  dishId: string;
  restaurantName: string;
  /** Google Places id - 방문 기록(visits)에 식당을 남기기 위함(구버전 앱은 안 보냄) */
  placeId?: string;
  signPhotoBase64: string;
  foodPhotoBase64: string;
  receiptPhotoBase64?: string;
};

type Verdict = "pass" | "uncertain" | "fail";

/**
 * 판정 이유를 언어와 무관한 코드로도 돌려준다(2026-10 다국어화). 새 앱은 이걸 사용자 언어로
 * 번역해서 보여주고, 이미 설치된 구버전 앱은 기존 reasons(한국어 문장)를 계속 그대로 쓴다.
 */
type ReasonCode =
  | { code: "name_not_found" }
  | { code: "name_mismatch"; restaurant: string }
  | { code: DishMatchResult["code"]; terms?: string[] };

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
    const { dishId, restaurantName, placeId, signPhotoBase64, foodPhotoBase64, receiptPhotoBase64 } = data;

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
    const reasonCodes: ReasonCode[] = [];
    if (!nameResult.matched) {
      reasons.push(
        nameResult.source === "none"
          ? "간판/영수증에서 상호명을 확인하지 못했어요."
          : `사진에서 읽은 글자가 '${restaurantName}'와 달라 보여요.`
      );
      reasonCodes.push(
        nameResult.source === "none" ? { code: "name_not_found" } : { code: "name_mismatch", restaurant: restaurantName }
      );
    }
    if (!dishJudgement.matched) {
      reasons.push(dishJudgement.reason || `사진이 '${dish.name_kr}'로 보이지 않아요.`);
      reasonCodes.push({ code: dishJudgement.code, ...(dishJudgement.terms ? { terms: dishJudgement.terms } : {}) });
    }

    // 예전엔 로그가 하나도 안 남아서, 실제로 몇 번 호출됐는데도(functions:log 확인)
    // 그때 무슨 판정이 나왔는지 나중에 전혀 알 수 없었다. base64 이미지 자체는 크고
    // 민감할 수 있어 찍지 않고, 판정에 필요한 값들만 남긴다.
    console.log("[verifyMission] 판정 결과", {
      dishId,
      dishNameKr: dish.name_kr,
      restaurantName,
      verdict,
      nameMatch: nameResult,
      dishMatch: dishJudgement,
    });

    // 인증 티켓: 이 사진 판정을 거쳤다는 증거. completeMission은 이 티켓이 있어야만 완료를
    // 기록한다(앱이 사진 없이 완료를 쓸 수 없게). 판정이 uncertain/fail이어도 사용자가
    // "그래도 인증"을 고를 수 있으므로(관대한 정책) 티켓은 항상 발급하고, 판정은 함께 남겨
    // 나중에 "확실히 인증된 방문"만 따로 셀 수 있게 한다.
    const ticketRef = db.collection("verifications").doc();
    await ticketRef.set({
      uid: request.auth.uid,
      dishId,
      restaurantName,
      placeId: typeof placeId === "string" && placeId ? placeId : null,
      verdict,
      nameMatched: nameResult.matched,
      nameSource: nameResult.source,
      dishCode: dishJudgement.code,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      verdict,
      nameMatch: nameResult,
      dishMatch: dishJudgement,
      reasons,
      reasonCodes,
      verificationId: ticketRef.id,
    };
  }
);

type TicketDoc = {
  uid: string;
  dishId: string;
  restaurantName: string;
  placeId: string | null;
  verdict: Verdict;
  nameMatched: boolean;
  dishCode: DishMatchResult["code"];
  createdAt?: Timestamp;
  result?: CompleteMissionResult;
};

type CompleteMissionResult = {
  alreadyCompleted: boolean;
  xpGained: number;
  leveledUp: boolean;
  /** 완료 반영 후 레벨 */
  level: number;
};

type LevelDoc = { title?: string; required_count?: number };

// 미션 완료 기록 (2026-10). 예전엔 앱이 users 문서에 완료/XP/레벨을 직접 썼는데, 그러면
// 사진 인증 없이도 완료 처리가 되고 사용자가 자기 레벨을 고칠 수도 있었다(firestore.rules에서
// 이제 막음). verifyMission이 발급한 티켓을 한 번만 쓸 수 있고, 같은 트랜잭션에서
//   - users/{uid}: completed_dishes, xp, (레벨업 시) current_level/level/levelName
//   - visits/{id}: 방문 기록(식당, 판정, 강행 여부) - "인증된 방문" 통계의 원본
//   - verifications/{id}.result: 결과 저장 → 응답이 유실돼 앱이 재시도해도 같은 결과를 돌려줌
// 를 함께 쓴다.
export const completeMission = onCall(
  { timeoutSeconds: 30, memory: "256MiB", region: "asia-northeast3" },
  async (request): Promise<CompleteMissionResult> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요해요.");
    }
    const uid = request.auth.uid;
    const { verificationId } = (request.data ?? {}) as { verificationId?: unknown };
    if (typeof verificationId !== "string" || !verificationId) {
      throw new HttpsError("invalid-argument", "인증 정보가 빠졌어요.");
    }

    const ticketRef = db.collection("verifications").doc(verificationId);
    const userRef = db.collection("users").doc(uid);

    return db.runTransaction(async (tx) => {
      const ticketSnap = await tx.get(ticketRef);
      if (!ticketSnap.exists) {
        throw new HttpsError("not-found", "인증 기록을 찾을 수 없어요.");
      }
      const ticket = ticketSnap.data() as TicketDoc;
      // 같은 티켓으로 다시 부르면(응답 유실 후 재시도) 저장해 둔 결과를 그대로 돌려준다.
      if (ticket.result && ticket.uid === uid) return ticket.result;

      const check = checkTicket(
        { uid: ticket.uid, createdAtMs: ticket.createdAt?.toMillis() ?? 0 },
        uid,
        Date.now()
      );
      if (!check.ok) {
        throw new HttpsError(
          check.reason === "wrong_user" ? "permission-denied" : "failed-precondition",
          check.reason === "wrong_user" ? "다른 사용자의 인증이에요." : "인증한 지 너무 오래됐어요. 다시 인증해 주세요."
        );
      }

      // 트랜잭션 규칙상 읽기를 모두 끝낸 뒤에 쓴다.
      const userSnap = await tx.get(userRef);
      const user = (userSnap.exists ? userSnap.data() : {}) as {
        current_level?: number;
        completed_dishes?: string[];
      };
      const currentLevel = user.current_level ?? 1;
      const [levelSnap, levelDishesSnap] = await Promise.all([
        tx.get(db.collection("levels").doc(String(currentLevel))),
        tx.get(db.collection("dishes").where("level", "==", currentLevel)),
      ]);
      const levelData = (levelSnap.exists ? levelSnap.data() : {}) as LevelDoc;

      const plan = planCompletion({
        completedDishes: user.completed_dishes,
        currentLevel,
        dishId: ticket.dishId,
        levelDishIds: levelDishesSnap.docs.map((d) => d.id),
        requiredCount: levelData.required_count,
      });

      let nextLevelTitle: string | undefined;
      if (plan.leveledUp) {
        const nextSnap = await tx.get(db.collection("levels").doc(String(plan.level)));
        nextLevelTitle = nextSnap.exists ? (nextSnap.data() as LevelDoc).title : undefined;
      }

      tx.set(
        userRef,
        {
          completed_dishes: FieldValue.arrayUnion(ticket.dishId),
          ...(plan.xpGained ? { xp: FieldValue.increment(plan.xpGained) } : {}),
          ...(plan.leveledUp
            ? { current_level: plan.level, level: plan.level, ...(nextLevelTitle ? { levelName: nextLevelTitle } : {}) }
            : {}),
        },
        { merge: true }
      );

      tx.set(db.collection("visits").doc(), {
        uid,
        dishId: ticket.dishId,
        restaurantName: ticket.restaurantName,
        placeId: ticket.placeId,
        verdict: ticket.verdict,
        // 판정이 pass가 아닌데 사용자가 "그래도 인증"으로 진행한 경우
        forced: ticket.verdict !== "pass",
        nameMatched: ticket.nameMatched,
        dishCode: ticket.dishCode,
        firstCompletion: !plan.alreadyCompleted,
        verificationId,
        createdAt: FieldValue.serverTimestamp(),
      });

      const result: CompleteMissionResult = {
        alreadyCompleted: plan.alreadyCompleted,
        xpGained: plan.xpGained,
        leveledUp: plan.leveledUp,
        level: plan.level,
      };
      tx.update(ticketRef, { result, usedAt: FieldValue.serverTimestamp() });

      console.log("[completeMission]", { uid, dishId: ticket.dishId, verdict: ticket.verdict, ...result });
      return result;
    });
  }
);

// 영수증 사진 -> 글자 (인증 화면의 "읽어낸 글자" 미리보기용).
//
// 예전엔 앱이 Vision API를 직접 불렀는데, 그러려면 API 키를 EXPO_PUBLIC_*로 APK 안에 넣어야
// 했다(누구나 APK를 풀어 키를 꺼내 쓸 수 있다). 게다가 Vision 전용 키가 없으면 Places 키로
// 대신 호출해서, 그 키에 Vision 권한이 없으면 미리보기가 늘 "읽지 못했어요"로 끝났다.
// verifyMission과 같은 서비스 계정 인증으로 서버에서 읽어서 돌려준다 - 앱에는 키가 필요 없다.
// 미리보기일 뿐이고 실제 판정은 verifyMission이 사진을 다시 받아 독립적으로 한다.
const MAX_RECEIPT_BASE64 = 8 * 1024 * 1024; // 약 6MB 이미지 - quality 0.6 촬영본은 보통 1MB 안팎

export const readReceipt = onCall(
  { timeoutSeconds: 30, memory: "256MiB", region: "asia-northeast3" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요해요.");
    }
    const { imageBase64 } = (request.data ?? {}) as { imageBase64?: unknown };
    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      throw new HttpsError("invalid-argument", "사진이 빠졌어요.");
    }
    if (imageBase64.length > MAX_RECEIPT_BASE64) {
      throw new HttpsError("invalid-argument", "사진이 너무 커요.");
    }

    try {
      return { text: await extractText(imageBase64) };
    } catch (err) {
      console.error("[readReceipt] OCR 실패:", err);
      throw new HttpsError("internal", "영수증 글자를 읽지 못했어요.");
    }
  }
);
