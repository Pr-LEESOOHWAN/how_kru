// src/firebase/dishService.ts
// Firestore에서 음식 데이터 가져오기

import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebaseConfig";

// ─── 음식 타입 정의 ───────────────────────────────
export type Dish = {
  id: string;
  no: number;
  name_kr: string;
  name_en: string;
  category: string;
  level: number;
  spice_level: number;
  visual_unfamiliarity: number;
  smell_unfamiliarity: number;
  ingredient_unfamiliarity: number;
  difficulty_score: number;
  tags: string[];
  image: string;
  kick_question: string;
  kick_options: string[];
};

export type User = {
  user_id: string;
  current_level: number;
  completed_dishes: string[];
  kick_choices: { dish: string; choice: string }[];
};

// ─── 음식 관련 ────────────────────────────────────

// 특정 레벨의 음식 목록 가져오기
export const getDishesByLevel = async (level: number): Promise<Dish[]> => {
  const q = query(collection(db, "dishes"), where("level", "==", level));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Dish));
};

// 특정 음식 1개 가져오기
export const getDish = async (dishId: string): Promise<Dish | null> => {
  const snap = await getDoc(doc(db, "dishes", dishId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Dish) : null;
};

// ─── 유저 관련 ────────────────────────────────────
// 유저 문서 생성은 src/firebase/authService.ts의 signUp()이 담당한다
// (이전에는 이 파일에도 필드 구성이 다른 createUser()가 있었는데, 아무 데서도
// 호출되지 않는 죽은 코드였고 스키마도 signUp()과 어긋나 있어 혼란을 줄 위험이
// 있었다 — 삭제함).

// 유저 정보 가져오기
export const getUser = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as User) : null;
};

// 미션 완료 시 보상 XP. app/mission/start.tsx, app/mission/complete.tsx의
// "완료 시 보상 +50 XP" 안내 문구와 반드시 같은 값을 유지해야 한다.
const MISSION_COMPLETE_XP = 50;

// 음식 완료만 먼저 처리 (Kick 답변은 별도 화면에서 나중에 받음)
// signUp() 시점에 users 문서에 xp: 0 필드를 만들어두는데도 이 필드를 갱신하는
// 곳이 아무 데도 없어서, 미션 완료 화면에 "+50 XP" 보상을 보여줘 놓고 실제로는
// 영구히 0으로 남아있던 문제가 있었다 (level/levelName을 나중에 동기화해준
// levelUp()과 같은 종류의 문제). 화면에 이미 보여주고 있는 보상 값만큼
// 실제로 xp 필드에 누적되도록 함께 저장한다.
export const markDishCompleted = async (userId: string, dishId: string) => {
  await setDoc(
    doc(db, "users", userId),
    { completed_dishes: arrayUnion(dishId), xp: increment(MISSION_COMPLETE_XP) },
    { merge: true }
  );
};

// "이 요리의 킥이 뭐였나요?" 답변만 별도로 저장
export const saveKickChoice = async (
  userId: string,
  dishId: string,
  choice: string
) => {
  await setDoc(
    doc(db, "users", userId),
    { kick_choices: arrayUnion({ dish: dishId, choice }) },
    { merge: true }
  );
};

// 레벨업 처리
// 다른 쓰기 함수들과 마찬가지로 setDoc(merge: true) 사용.
// updateDoc은 유저 문서가 아직 없으면 "No document to update" 오류로 실패한다.
//
// level / levelName 필드는 화면 계산에는 안 쓰이고(진짜 기준은 current_level) signUp()
// 시점에만 한 번 써지던 죽은 필드였는데, Firestore 콘솔에서 문서를 볼 때 current_level과
// 값이 달라 보여 혼란을 줬다. 그래서 레벨업할 때마다 함께 갱신해 항상 동기화되게 한다.
export const levelUp = async (userId: string, currentLevel: number) => {
  const nextLevel = currentLevel + 1;

  let levelName: string | undefined;
  try {
    const levelSnap = await getDoc(doc(db, "levels", String(nextLevel)));
    levelName = levelSnap.exists() ? (levelSnap.data() as { title?: string }).title : undefined;
  } catch {
    // levels 문서 조회 실패해도 레벨업 자체를 막지는 않음 (levelName만 못 채움)
  }

  await setDoc(
    doc(db, "users", userId),
    {
      current_level: nextLevel,
      level: nextLevel,
      ...(levelName ? { levelName } : {}),
    },
    { merge: true }
  );
};

// ─── 요리 리뷰 + 대댓글 ───────────────────────────
// reviews/{reviewId}            : 요리 하나에 대한 리뷰
// reviews/{reviewId}/replies/*  : 그 리뷰에 달린 대댓글

export type Review = {
  id: string;
  dishId: string;
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  // 미션 완료 직후 "이 식당에 리뷰 남기기" 흐름으로 작성된 리뷰에만 채워짐 (mission/complete.tsx
  // 참고). restaurantId는 Google Places의 place_id. 일반적으로 요리 상세 > 리뷰 화면에서 바로
  // 쓴 리뷰는 특정 식당과 무관하므로 없을 수 있다.
  restaurantId?: string;
  restaurantName?: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
  replyCount: number;
};

export type ReviewReply = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: { seconds: number; nanoseconds: number } | null;
};

// 특정 요리의 리뷰 목록 (최신순)
export const getReviews = async (dishId: string): Promise<Review[]> => {
  const q = query(collection(db, "reviews"), where("dishId", "==", dishId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return list;
};

// 리뷰 사진 업로드. 리뷰 문서가 생기기 전에 먼저 올려서 URL을 받아와야 하므로
// (addDoc은 문서를 만들면서 동시에 id를 발급하기 때문) 경로는 review-photos/{userId}/...로
// 잡는다 - storage.rules도 이 경로 기준으로 "본인 폴더에만 쓰기"를 검사한다.
export const uploadReviewPhoto = async (userId: string, localUri: string): Promise<string> => {
  const res = await fetch(localUri);
  const blob = await res.blob();
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const storageRef = ref(storage, `review-photos/${userId}/${fileName}`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
};

// 리뷰 작성. restaurant을 넘기면(미션 완료 직후 흐름) 리뷰가 특정 식당에도 연결되어
// getRestaurantThumbnail()의 후보 사진 풀에 들어간다.
export const addReview = async (
  dishId: string,
  userId: string,
  userName: string,
  content: string,
  imageUrl?: string,
  restaurant?: { id: string; name: string }
) => {
  await addDoc(collection(db, "reviews"), {
    dishId,
    userId,
    userName,
    content,
    ...(imageUrl ? { imageUrl } : {}),
    ...(restaurant ? { restaurantId: restaurant.id, restaurantName: restaurant.name } : {}),
    createdAt: serverTimestamp(),
    replyCount: 0,
  });
};

// ─── 리뷰 사진을 썸네일로 재활용 ───────────────────
// 큐레이션된 공식 사진(dish.image / Places 사진)이 없을 때만 유저 리뷰 사진으로
// 보완한다 - 공식 사진이 있으면 그쪽이 항상 우선.

// 공식 사진이 없는 요리의 대체 썸네일. 해당 요리의 리뷰 중 사진이 첨부된 가장 최근
// 것을 사용한다. getReviews()가 이미 createdAt 최신순으로 정렬해주므로 그대로 재사용
// (전용 복합 인덱스를 새로 만들 필요가 없음).
export const getFallbackDishPhoto = async (dishId: string): Promise<string | null> => {
  const reviews = await getReviews(dishId);
  return reviews.find((r) => r.imageUrl)?.imageUrl ?? null;
};

// 식당(place_id) 썸네일. 우리 앱은 식당 사진을 자체적으로 갖고 있지 않으므로(Google Places
// 사진 API는 아직 연동 안 함), 그 식당에서 작성된 리뷰 중 사진이 첨부된 가장 최근 것을 사용한다.
export const getRestaurantThumbnail = async (restaurantId: string): Promise<string | null> => {
  const q = query(collection(db, "reviews"), where("restaurantId", "==", restaurantId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => d.data() as Review);
  list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  return list.find((r) => r.imageUrl)?.imageUrl ?? null;
};

// 특정 리뷰의 대댓글 목록 (오래된순 - 대화 순서대로)
export const getReplies = async (reviewId: string): Promise<ReviewReply[]> => {
  const snap = await getDocs(collection(db, "reviews", reviewId, "replies"));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewReply));
  list.sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  return list;
};

// 대댓글 작성 (리뷰 문서의 replyCount도 함께 증가)
export const addReply = async (
  reviewId: string,
  userId: string,
  userName: string,
  content: string
) => {
  await addDoc(collection(db, "reviews", reviewId, "replies"), {
    userId,
    userName,
    content,
    createdAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "reviews", reviewId),
    { replyCount: increment(1) },
    { merge: true }
  );
};

// 현재 레벨에서 완료된 음식 수 계산
export const getProgressInLevel = async (
  userId: string,
  level: number
): Promise<number> => {
  const user = await getUser(userId);
  if (!user) return 0;

  const levelDishes = await getDishesByLevel(level);
  const levelDishIds = levelDishes.map((d) => d.id);

  return (user.completed_dishes ?? []).filter((id) => levelDishIds.includes(id)).length;
};