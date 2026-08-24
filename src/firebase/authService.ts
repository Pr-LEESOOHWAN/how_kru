import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { auth, db } from "./firebaseConfig";

// @ts-expect-error - firebaseConfig.ts와 동일한 이유(RN 빌드에만 존재, 타입 선언 누락)
import { getReactNativePersistence } from "firebase/auth";

// "로그인 상태 유지" 체크 여부에 따라 로그인 지속 방식을 바꾼다.
//   - 체크함(기본값): 기기에 저장(AsyncStorage/localStorage) -> 앱을 껐다 켜도 로그인 유지
//   - 체크 해제: 메모리에만 보관(inMemoryPersistence) -> 앱을 완전히 종료하면 로그아웃됨
function persistenceFor(keepLoggedIn: boolean) {
  if (Platform.OS === "web") {
    return keepLoggedIn ? browserLocalPersistence : browserSessionPersistence;
  }
  return keepLoggedIn ? getReactNativePersistence(AsyncStorage) : inMemoryPersistence;
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName: name });

  await setDoc(doc(db, "users", user.uid), {
    name,
    email,
    // 프로필/홈 화면용 표시 필드
    level: 1,
    levelName: "Rookie",
    xp: 0,
    createdAt: serverTimestamp(),
    // src/firebase/dishService.ts(getUser/markDishCompleted/saveKickChoice/
    // getProgressInLevel 등)가 기대하는 필드. 이게 없으면 로그인 직후
    // 첫 미션에서 레벨/완료 목록이 비어있는 게 아니라 아예 undefined라
    // 화면별 방어 코드에 의존하게 됨 -> 가입 시점에 명시적으로 초기화.
    current_level: 1,
    completed_dishes: [],
    kick_choices: [],
  });

  return user;
}

export async function signIn(
  email: string,
  password: string,
  keepLoggedIn: boolean = true
): Promise<User> {
  await setPersistence(auth, persistenceFor(keepLoggedIn));
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getAuthErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";

  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않아요.";
    case "auth/email-already-in-use":
      return "이미 가입된 이메일이에요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상이어야 해요.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "이메일 또는 비밀번호가 올바르지 않아요.";
    case "auth/too-many-requests":
      return "너무 여러 번 시도했어요. 잠시 후 다시 시도해주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해주세요.";
    default:
      return "문제가 발생했어요. 다시 시도해주세요.";
  }
}
