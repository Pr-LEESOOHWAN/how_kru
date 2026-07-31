import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";
import { readFileSync } from "fs";

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

const dishes = JSON.parse(readFileSync("./dishes_800.json", "utf-8"));

// Firestore batch는 최대 499개 제한
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

async function seedDishes800() {
  console.log(`📦 총 ${dishes.length}개 800선 데이터 업로드 시작...`);
  const chunks = chunkArray(dishes, 499);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const batch = writeBatch(db);
    for (const dish of chunk) {
      const ref = doc(db, "dishes_800", dish.id);
      batch.set(ref, dish);
    }
    await batch.commit();
    console.log(`✅ Batch ${i + 1}/${chunks.length} 완료 (${chunk.length}개)`);
  }
  console.log("\n🎉 dishes_800 컬렉션 업로드 완료!");
}

async function main() {
  try {
    await seedDishes800();
    console.log("✅ 모든 데이터 Firebase 업로드 완료!");
    process.exit(0);
  } catch (err) {
    console.error("❌ 오류 발생:", err);
    process.exit(1);
  }
}

main();
