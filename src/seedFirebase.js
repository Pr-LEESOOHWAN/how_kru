// =============================================
// HOW KRU — Firebase Seed Script
// 사용법: 이 파일을 프로젝트 루트에 놓고 실행
// node seedFirebase.js
// =============================================

import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";
import dishes from "./dishes.json" assert { type: "json" };

// ⚠️ 본인의 Firebase config로 교체하세요
const firebaseConfig = {
  apiKey: "여기에_본인_값",
  authDomain: "여기에_본인_값",
  projectId: "여기에_본인_값",
  storageBucket: "여기에_본인_값",
  messagingSenderId: "여기에_본인_값",
  appId: "여기에_본인_값",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore는 한 번에 최대 500개 batch 가능
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

async function seedDishes() {
  console.log(`📦 총 ${dishes.length}개 음식 데이터 업로드 시작...`);
  const chunks = chunkArray(dishes, 499);

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const dish of chunk) {
      const ref = doc(db, "dishes", dish.id);
      batch.set(ref, dish);
    }
    await batch.commit();
    console.log(`✅ ${chunk.length}개 업로드 완료`);
  }
  console.log("🎉 dishes 컬렉션 업로드 완료!");
}

async function seedLevels() {
  console.log("📦 레벨 데이터 업로드 시작...");
  const batch = writeBatch(db);

  for (let i = 1; i <= 12; i++) {
    const ref = doc(db, "levels", String(i));
    batch.set(ref, {
      level: i,
      required_count: 2,
      title: getLevelTitle(i),
    });
  }
  await batch.commit();
  console.log("🎉 levels 컬렉션 업로드 완료!");
}

function getLevelTitle(level) {
  const titles = {
    1:  "Curious Beginner",
    2:  "Street Food Fan",
    3:  "Local Explorer",
    4:  "Spice Adventurer",
    5:  "Kimchi Lover",
    6:  "Fermentation Fan",
    7:  "Raw Food Brave",
    8:  "Extreme Challenger",
    9:  "Fermented Skate Hero",
    10: "K-Food Course Master",
    11: "Soy Sauce Master",
    12: "Korean Food Legend",
  };
  return titles[level] || `Level ${level}`;
}

async function main() {
  try {
    await seedDishes();
    await seedLevels();
    console.log("\n✅ 모든 데이터 Firebase 업로드 완료!");
    process.exit(0);
  } catch (err) {
    console.error("❌ 오류 발생:", err);
    process.exit(1);
  }
}

main();