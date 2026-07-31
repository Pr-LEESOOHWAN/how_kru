// images/ 폴더에 있는 요리 사진들을 Firebase Storage에 업로드하고,
// 각 사진의 다운로드 URL을 Firestore의 dishes/{id} 문서 image 필드에 저장합니다.
//
// 사용법:
//   node uploadDishImages.js
//
// 전제:
//   - fetch_dish_images.py / fetch_dish_images_retry.py 로 images/ 폴더에
//     "번호_id.jpg" 형태 파일들이 이미 채워져 있어야 합니다.
//   - Firebase Storage가 프로젝트에서 활성화되어 있어야 합니다
//     (Firebase 콘솔 > Build > Storage > Get started).
//   - Storage 보안 규칙이 쓰기를 허용해야 합니다. 아래처럼 임시로 열어두고,
//     업로드가 끝나면 다시 잠그는 걸 추천합니다:
//       rules_version = '2';
//       service firebase.storage {
//         match /b/{bucket}/o {
//           match /{allPaths=**} {
//             allow read: if true;
//             allow write: if true; // 업로드 끝나면 false로 되돌리세요
//           }
//         }
//       }

import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyCKs8kRFxfkK8MQcKn2L5wgHAKF2wIk7MA",
  authDomain: "how-kru.firebaseapp.com",
  projectId: "how-kru",
  storageBucket: "how-kru.firebasestorage.app",
  messagingSenderId: "593506366112",
  appId: "1:593506366112:web:05d72a1d0d6dd52649cfc5",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const IMAGES_DIR = path.join(process.cwd(), "images");

function parseIdFromFilename(filename) {
  // "001_bulgogi.jpg" -> "bulgogi"
  const match = filename.match(/^\d+_(.+)\.jpg$/i);
  return match ? match[1] : null;
}

async function uploadOne(filename) {
  const id = parseIdFromFilename(filename);
  if (!id) {
    console.log(`  [건너뜀] 파일명 형식이 다름: ${filename}`);
    return { id: filename, ok: false, reason: "잘못된 파일명" };
  }

  const filePath = path.join(IMAGES_DIR, filename);
  const buffer = readFileSync(filePath);

  try {
    const storagePath = `dishes/${id}.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, buffer, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "dishes", id), { image: url });

    console.log(`  ✅ ${id} -> ${url}`);
    return { id, ok: true, url };
  } catch (err) {
    console.log(`  ❌ ${id} 업로드 실패: ${err.message}`);
    return { id, ok: false, reason: err.message };
  }
}

async function main() {
  const files = readdirSync(IMAGES_DIR).filter((f) => f.toLowerCase().endsWith(".jpg"));
  console.log(`📦 총 ${files.length}개 이미지를 Storage에 업로드합니다...\n`);

  const results = [];
  for (const filename of files) {
    const result = await uploadOne(filename);
    results.push(result);
  }

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;

  console.log("\n=================================");
  console.log(`완료: 성공 ${okCount}개 / 실패 ${failCount}개 (전체 ${results.length}개)`);
  if (failCount > 0) {
    console.log("\n실패 목록:");
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.id}: ${r.reason}`));
    console.log(
      "\n실패 원인이 'permission' 또는 'Missing or insufficient permissions' 라면,\n" +
      "Firebase 콘솔 > Storage > Rules 에서 쓰기 권한을 임시로 열어야 합니다."
    );
  }
}

main();
