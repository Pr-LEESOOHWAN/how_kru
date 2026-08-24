// resetMyProgress.js
// 테스트 중인 내 계정(sa9seung@gmail.com)의 미션 진행 상태를 전부 초기화하고
// 레벨 1(가입 직후 상태)로 되돌립니다.
//
// firestore.rules상 users/{uid}는 본인만 읽기/쓰기가 가능하지만, 이 스크립트는
// (로그인 세션이 아니라) 서비스 계정으로 직접 접속하므로 규칙과 무관하게 동작합니다.
// migrateDishKicks.js와 동일한 firebase-admin 패턴을 사용합니다.
//
// ─── 준비 ────────────────────────────────────────────────────
// serviceAccountKey.json이 프로젝트 루트에 이미 있다면(이전에 migrateDishKicks.js
// 실행할 때 받아둔 것) 그대로 사용하면 됩니다. 없다면:
//   Firebase 콘솔 → 프로젝트 설정(기어 아이콘) → 서비스 계정 탭 →
//   "새 비공개 키 생성" → 다운로드한 JSON을 프로젝트 루트에
//   serviceAccountKey.json 이름으로 저장하세요. (.gitignore에 이미 등록됨)
//
// 사용법:
//   node resetMyProgress.js
//   node resetMyProgress.js 다른이메일@example.com   (다른 계정을 초기화하고 싶을 때)

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const TARGET_EMAIL = process.argv[2] ?? "sa9seung@gmail.com";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log(`대상 계정: ${TARGET_EMAIL}`);

  const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
  const uid = userRecord.uid;
  console.log(`UID: ${uid}`);

  // signUp() 시점에 만드는 초기 상태와 동일하게 되돌린다.
  // (src/firebase/authService.ts의 signUp() 참고)
  // badges/streak는 더 이상 안 쓰는 죽은 필드라 삭제(FieldValue.delete)한다 —
  // 옛날 문서에 남아있던 값도 이번에 같이 정리됨.
  await db.collection("users").doc(uid).set(
    {
      current_level: 1,
      completed_dishes: [],
      kick_choices: [],
      level: 1,
      levelName: "Rookie",
      xp: 0,
      badges: FieldValue.delete(),
      streak: FieldValue.delete(),
    },
    { merge: true }
  );

  console.log("✅ 초기화 완료: current_level=1, completed_dishes=[], kick_choices=[] (badges/streak 필드 제거)");
}

main().catch((err) => {
  console.error("❌ 오류 발생:", err);
  process.exit(1);
});
