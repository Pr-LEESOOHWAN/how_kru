// firestore.rules 검증 - Firestore 에뮬레이터 위에서 실제 규칙으로 읽기/쓰기를 시도한다.
//
// 실행: npm run test:rules
// (이 PC는 Java 11이라 Java 21이 필요한 최신 firebase-tools 대신 firebase-tools@13의
//  에뮬레이터로 돌린다 - package.json의 test:rules 스크립트 참고)

import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, it } from "node:test";

import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { arrayUnion, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-howkru",
    firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

/** authService.signUp이 만드는 문서와 같은 모양 */
const signupDoc = () => ({
  name: "Tester",
  email: "t@example.com",
  level: 1,
  levelName: "Rookie",
  xp: 0,
  createdAt: serverTimestamp(),
  current_level: 1,
  completed_dishes: [],
  kick_choices: [],
});

async function seedUser(uid, data) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", uid), data);
  });
}

describe("users/{uid}", () => {
  it("가입: 초기값 문서는 만들 수 있다", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "users", "alice"), signupDoc()));
  });

  it("가입: 처음부터 레벨/XP/완료 목록을 올려서 만들 수는 없다", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users", "alice"), { ...signupDoc(), current_level: 5 }));
    await assertFails(setDoc(doc(db, "users", "alice"), { ...signupDoc(), xp: 9999 }));
    await assertFails(setDoc(doc(db, "users", "alice"), { ...signupDoc(), completed_dishes: ["bibimbap"] }));
  });

  it("다른 사람 문서는 읽을 수도 만들 수도 없다", async () => {
    await seedUser("bob", { current_level: 1 });
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "users", "bob")));
    await assertFails(setDoc(doc(db, "users", "mallory"), signupDoc()));
  });

  it("본인 문서는 읽을 수 있다", async () => {
    await seedUser("alice", { current_level: 2 });
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "users", "alice")));
  });

  it("킥 답변 저장(dishService.saveKickChoice)은 허용", async () => {
    await seedUser("alice", { current_level: 1, completed_dishes: ["bibimbap"], kick_choices: [] });
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "alice"), { kick_choices: [{ dish: "bibimbap", choice: "맛" }] }, { merge: true })
    );
  });

  it("문서가 아직 없을 때 킥 답변 merge 저장도 허용(초기값으로 간주)", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", "alice"), { kick_choices: [{ dish: "bibimbap", choice: "맛" }] }, { merge: true })
    );
  });

  it("앱에서 완료 목록·XP·레벨을 직접 바꿀 수 없다(예전 markDishCompleted/levelUp 방식)", async () => {
    await seedUser("alice", { current_level: 1, level: 1, xp: 0, completed_dishes: [], kick_choices: [] });
    const db = env.authenticatedContext("alice").firestore();
    const ref = doc(db, "users", "alice");
    await assertFails(setDoc(ref, { completed_dishes: arrayUnion("bibimbap") }, { merge: true }));
    await assertFails(setDoc(ref, { xp: increment(50) }, { merge: true }));
    await assertFails(updateDoc(ref, { current_level: 2, level: 2 }));
    await assertFails(updateDoc(ref, { levelName: "Master" }));
  });

  it("문서 삭제는 막는다", async () => {
    await seedUser("alice", { current_level: 1 });
    const { deleteDoc } = await import("firebase/firestore");
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(deleteDoc(doc(db, "users", "alice")));
  });
});

describe("verifications / visits (서버 전용)", () => {
  it("앱은 인증 티켓과 방문 기록을 읽거나 쓸 수 없다", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "verifications", "t1"), { uid: "alice", dishId: "bibimbap" }));
    await assertFails(getDoc(doc(db, "verifications", "t1")));
    await assertFails(setDoc(doc(db, "visits", "v1"), { uid: "alice" }));
    await assertFails(getDoc(doc(db, "visits", "v1")));
  });
});

describe("기존 규칙 회귀", () => {
  it("요리 정보는 로그인하면 읽기만 된다", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "dishes", "bibimbap")));
    await assertFails(setDoc(doc(db, "dishes", "bibimbap"), { name_kr: "x" }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "dishes", "bibimbap")));
  });

  it("리뷰는 본인 이름으로만 쓸 수 있다", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, "reviews", "r1"), { userId: "alice", dishId: "bibimbap", content: "맛있어요" }));
    await assertFails(setDoc(doc(db, "reviews", "r2"), { userId: "bob", dishId: "bibimbap", content: "사칭" }));
  });
});
