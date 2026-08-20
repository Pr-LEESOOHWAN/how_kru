// migrateDishKicks.js
// "한국음식 Level.xlsx"의 Sheet4에 새로 추가된 음식별킥1/음식별킥2 컬럼을 반영해서
// Firestore dishes 컬렉션의 kick_question/kick_options를 요리별로 다르게 갱신합니다.
//
// firestore.rules에서 dishes 컬렉션은 클라이언트 SDK로는 쓰기가 막혀 있어서
// (allow write: if false — 일반 유저가 요리 데이터를 못 건드리게 하기 위함),
// 이 스크립트는 규칙을 우회할 수 있는 firebase-admin(서비스 계정)으로 접속합니다.
//
// ─── 준비 ────────────────────────────────────────────────────
// 1) firebase-admin 설치:
//      npm install firebase-admin
// 2) 서비스 계정 키 발급:
//      Firebase 콘솔 → 프로젝트 설정(기어 아이콘) → 서비스 계정 탭 →
//      "새 비공개 키 생성" 클릭 → 다운로드된 JSON을 프로젝트 루트에
//      serviceAccountKey.json 이름으로 저장 (.gitignore에 이미 등록해뒀어요.
//      이 파일은 프로젝트 전체 관리자 권한이라 절대 커밋/공유하면 안 됩니다.)
//
// 사용법:
//   node migrateDishKicks.js

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const UPDATES = [
  {
    "id": "rolled_omelet",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "케첩 찍어먹기",
      "치즈 추가하기"
    ]
  },
  {
    "id": "bulgogi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "상추쌈에 마늘 올리기",
      "국물에 밥 비벼먹기"
    ]
  },
  {
    "id": "kalguksu",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "다대기 넣기",
      "김치 곁들이기"
    ]
  },
  {
    "id": "korean_fried_chicken",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "양념 소스 찍기",
      "무/피클 곁들이기"
    ]
  },
  {
    "id": "korean_sweets",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "아이스크림 곁들이기",
      "따뜻한 차와 함께"
    ]
  },
  {
    "id": "galbitang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "당면 추가하기",
      "파 듬뿍 넣기"
    ]
  },
  {
    "id": "samgyeopsal",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "구운김치 곁들이기",
      "파절이와 먹기"
    ]
  },
  {
    "id": "bingsu",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "인절미 가루 추가",
      "연유 곁들이기"
    ]
  },
  {
    "id": "bibimbap",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "고추장 한 스푼 더하기",
      "참기름 한 스푼 더하기"
    ]
  },
  {
    "id": "gomtang_seolleongtang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "소면 말아먹기",
      "깍두기 국물 넣기"
    ]
  },
  {
    "id": "buchimgae",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "양파 간장 찍기",
      "빠삭할때 바로 먹기"
    ]
  },
  {
    "id": "sikhye",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "잣 띄워 마시기",
      "시원하게 마시기"
    ]
  },
  {
    "id": "abalone_porridge",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "김치 곁들이기",
      "참기름 한 스푼 더하기"
    ]
  },
  {
    "id": "gimbap",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "떡볶이 국물 찍기",
      "단무지와 먹기"
    ]
  },
  {
    "id": "bindaetteok",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "막걸리와 함께",
      "초간장 찍기"
    ]
  },
  {
    "id": "dak_han_mari",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "칼국수 사리 넣기",
      "죽으로 마무리"
    ]
  },
  {
    "id": "suyuk",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "새우젓 찍기",
      "보쌈김치 곁들이기"
    ]
  },
  {
    "id": "bean_sprout_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "청양고추 넣기",
      "밥 말아먹기"
    ]
  },
  {
    "id": "traditional_tea",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "꿀 추가하기",
      "한과자와 곁들이기"
    ]
  },
  {
    "id": "ssambap",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "쌈장 듬뿍 올리기",
      "마늘 추가하기"
    ]
  },
  {
    "id": "fish_cake_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "와사비 간장 찍기",
      "고추 썰어 넣기"
    ]
  },
  {
    "id": "kong_guksu",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "국물 마시기",
      "오이채 곁들이기"
    ]
  },
  {
    "id": "white_kimchi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "들기름 뿌리기",
      "비빔국수와 먹기"
    ]
  },
  {
    "id": "perilla_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 말아먹기",
      "김치 곁들이기"
    ]
  },
  {
    "id": "jjimdak",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "치즈 추가하기",
      "볶음밥으로 마무리"
    ]
  },
  {
    "id": "seaweed_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 말아먹기",
      "김치 곁들이기"
    ]
  },
  {
    "id": "dried_pollack_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "계란 풀어넣기",
      "밥 말아먹기"
    ]
  },
  {
    "id": "doenjang_jjigae",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥에 비벼먹기",
      "청양고추 송송 썰어넣기"
    ]
  },
  {
    "id": "kimchi_jeon",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "막걸리와 함께",
      "초간장 찍기"
    ]
  },
  {
    "id": "kimchi_fried_rice",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "계란후라이와 함께",
      "참기름 한스푼 더하기"
    ]
  },
  {
    "id": "seafood_pancake",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "초간장 찍기",
      "빠삭할때 바로 먹기"
    ]
  },
  {
    "id": "young_radish_noodle",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "삶은 계란 올리기",
      "열무김치 듬뿍"
    ]
  },
  {
    "id": "grilled_eel",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "생강절임과 함께",
      "와사비 얹어먹기"
    ]
  },
  {
    "id": "tofu_with_kimchi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "볶음김치와 먹기",
      "구운 두부로 먹기"
    ]
  },
  {
    "id": "raw_fish",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "초고추장 찍기",
      "간장과 와사비"
    ]
  },
  {
    "id": "jokbal",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "쟁반막국수와 먹기",
      "마늘 얹어먹기"
    ]
  },
  {
    "id": "bossam",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "보쌈김치 얹기",
      "알배기 배추와"
    ]
  },
  {
    "id": "mussel_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "청양고추 넣기",
      "파 듬뿍 넣기"
    ]
  },
  {
    "id": "soy_pulp_stew",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "김치 곁들이기",
      "밥 비벼먹기"
    ]
  },
  {
    "id": "bibim_guksu",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "삶은 계란 올리기",
      "상추에 싸먹기"
    ]
  },
  {
    "id": "spicy_pork_stir_fry",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "상추쌈에 마늘",
      "깻잎에 싸먹기"
    ]
  },
  {
    "id": "budae_jjigae",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "라면 사리 추가",
      "두부 추가하기"
    ]
  },
  {
    "id": "raw_beef",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "배와 함께 먹기",
      "참기름장에 찍기"
    ]
  },
  {
    "id": "blowfish_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "식초 살짝 넣기",
      "와사비 간장 찍기"
    ]
  },
  {
    "id": "dak_galbi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "우동 사리 추가",
      "치즈 추가하기"
    ]
  },
  {
    "id": "raw_gizzard_shad",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "된장 찍기",
      "초고추장 찍기"
    ]
  },
  {
    "id": "tteokbokki",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "튀김 범벅하기",
      "치즈 추가하기"
    ]
  },
  {
    "id": "kimchi_jjigae",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "라면 사리 추가",
      "참치캔 넣기"
    ]
  },
  {
    "id": "sundubu_jjigae",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "날계란 풀어넣기",
      "라면 사리 추가"
    ]
  },
  {
    "id": "yukgaejang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 말아먹기",
      "깍두기 국물 넣기"
    ]
  },
  {
    "id": "bibim_naengmyeon",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "육수 부어먹기",
      "겨자 추가하기"
    ]
  },
  {
    "id": "kimchi_hotpot",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "우동 사리 추가",
      "밥 볶아먹기"
    ]
  },
  {
    "id": "live_octopus",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "참기름장에 찍기",
      "초고추장 찍기"
    ]
  },
  {
    "id": "spicy_chicken_stew",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 볶아먹기",
      "치즈 추가하기"
    ]
  },
  {
    "id": "braised_mackerel",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "무조림과 먹기",
      "국물에 밥 비비기"
    ]
  },
  {
    "id": "braised_cutlassfish",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "무조림과 먹기",
      "국물에 밥 비비기"
    ]
  },
  {
    "id": "pollack_stew",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "수제비 사리 추가",
      "라면 사리 추가"
    ]
  },
  {
    "id": "gamjatang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "들깨가루 추가",
      "볶음밥으로 마무리"
    ]
  },
  {
    "id": "kimchi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "라면에 넣어먹기",
      "참기름 듬뿍 넣기"
    ]
  },
  {
    "id": "soft_octopus_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 말아먹기",
      "칼국수 사리 넣기"
    ]
  },
  {
    "id": "jeotgal",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥이랑 같이 먹기",
      "냄새부터 느껴보기"
    ]
  },
  {
    "id": "spicy_sea_bream_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "수제비 사리 추가",
      "라면 사리 추가"
    ]
  },
  {
    "id": "sundae_soup",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "들깨가루 듬뿍",
      "다대기 듬뿍 넣기"
    ]
  },
  {
    "id": "seafood_stew",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "와사비 간장 찍기",
      "초고추장 찍기"
    ]
  },
  {
    "id": "beef_tripe_hotpot",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "우동 사리 추가",
      "볶음밥으로 마무리"
    ]
  },
  {
    "id": "steamed_aged_kimchi",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "두부 곁들이기",
      "밥 비벼먹기"
    ]
  },
  {
    "id": "maeun_tang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "수제비 사리 추가",
      "볶음밥으로 마무리"
    ]
  },
  {
    "id": "gejang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 비벼먹기",
      "김가루 뿌리기"
    ]
  },
  {
    "id": "cheonggukjang",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "밥 비벼먹기",
      "비빔밥으로 먹기"
    ]
  },
  {
    "id": "buldak",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "치즈/주먹밥",
      "계란찜 곁들이기"
    ]
  },
  {
    "id": "spicy_marinated_crab",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "김가루 비벼먹기",
      "참기름 비벼먹기"
    ]
  },
  {
    "id": "fermented_skate",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "막걸리와 함께",
      "초장 살짝 찍기"
    ]
  },
  {
    "id": "k_food_course_master",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "코스 순서대로 즐기기",
      "가장 기억에 남는 요리 골라보기"
    ]
  },
  {
    "id": "soy_sauce_master",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "숙성 기간 비교해보기",
      "향 먼저 맡아보기"
    ]
  },
  {
    "id": "traditional_fermented_paste",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "장 종류별로 맛 비교하기",
      "만드는 과정 구경하기"
    ]
  },
  {
    "id": "doenjang_master",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "숙성 연도별 맛 비교하기",
      "향 먼저 맡아보기"
    ]
  },
  {
    "id": "gochujang_master",
    "kick_question": "이 요리를 어떻게 즐겼나요?",
    "kick_options": [
      "매운맛 단계별 비교하기",
      "재료에 찍어먹어보기"
    ]
  }
];

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

async function main() {
  console.log(`📝 요리 ${UPDATES.length}개 킥 질문/옵션 갱신 시작...`);
  const chunks = chunkArray(UPDATES, 400);
  for (const chunk of chunks) {
    const batch = db.batch();
    for (const u of chunk) {
      const { id, ...fields } = u;
      batch.update(db.collection("dishes").doc(id), fields);
    }
    await batch.commit();
    console.log(`  ✅ ${chunk.length}개 갱신 완료`);
  }
  console.log("🎉 킥 질문/옵션 요리별로 다르게 갱신 완료!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ 오류 발생:", err);
  process.exit(1);
});
