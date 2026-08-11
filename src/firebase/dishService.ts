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
import { db } from "./firebaseConfig";

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

// 유저 생성 (최초 가입 시)
export const createUser = async (userId: string, name: string) => {
  await setDoc(doc(db, "users", userId), {
    user_id: userId,
    name,
    current_level: 1,
    completed_dishes: [],
    kick_choices: [],
    created_at: new Date().toISOString(),
  });
};

// 유저 정보 가져오기
export const getUser = async (userId: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? (snap.data() as User) : null;
};

// 음식 완료 처리 + Kick 저장 (한 번에 처리하고 싶을 때)
// setDoc(merge: true)를 사용해 유저 문서가 아직 없어도(예: guest 데모 유저) 자동 생성되도록 함.
// updateDoc은 문서가 존재하지 않으면 "No document to update" 오류로 실패한다.
export const completeDish = async (
  userId: string,
  dishId: string,
  kickChoice: string
) => {
  await setDoc(
    doc(db, "users", userId),
    {
      completed_dishes: arrayUnion(dishId),
      kick_choices: arrayUnion({ dish: dishId, choice: kickChoice }),
    },
    { merge: true }
  );
};

// 음식 완료만 먼저 처리 (Kick 답변은 별도 화면에서 나중에 받음)
export const markDishCompleted = async (userId: string, dishId: string) => {
  await setDoc(
    doc(db, "users", userId),
    { completed_dishes: arrayUnion(dishId) },
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
export const levelUp = async (userId: string, currentLevel: number) => {
  await setDoc(
    doc(db, "users", userId),
    { current_level: currentLevel + 1 },
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

// 리뷰 작성
export const addReview = async (
  dishId: string,
  userId: string,
  userName: string,
  content: string
) => {
  await addDoc(collection(db, "reviews"), {
    dishId,
    userId,
    userName,
    content,
    createdAt: serverTimestamp(),
    replyCount: 0,
  });
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