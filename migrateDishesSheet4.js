// migrateDishesSheet4.js
// "한국음식 Level.xlsx"의 Sheet4 기준으로 Firestore의 dishes 컬렉션을 완전히 교체합니다.
//
// 처리 내용:
//   1) UPDATE: 기존 75개 요리의 no/level/spice_level/visual_unfamiliarity/
//      smell_unfamiliarity/ingredient_unfamiliarity/difficulty_score/tags 갱신
//      (image, name_kr, name_en, category, kick_question, kick_options는 그대로 둠 —
//       특히 image는 이미 Storage에 업로드된 실제 사진 URL이라 건드리지 않습니다)
//   2) DELETE: Sheet4에 없는 기존 25개 요리 문서 삭제
//   3) ADD: Sheet4에만 있는 신규 2개 요리(곰탕/설렁탕, 복국) 문서 생성
//      (사진이 아직 없어서 image: "" 로 생성됩니다 — 추후 사진 소싱 작업 필요)
//
// 사용법:
//   node migrateDishesSheet4.js
//
// 실행 전 백업 권장: Firebase 콘솔에서 dishes 컬렉션을 내보내거나,
// 최소한 지금 dishes.json이 최신 상태인지 확인하세요.

import { initializeApp } from "firebase/app";
import { getFirestore, doc, writeBatch } from "firebase/firestore";

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

// ─── 1) 기존 75개 요리: 레벨/난이도 필드만 갱신 ───────────────────────
const UPDATES = [
  {
    "id": "rolled_omelet",
    "no": 1,
    "level": 1,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 0,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 0.2,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "bulgogi",
    "no": 2,
    "level": 1,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 0,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 0.2,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "kalguksu",
    "no": 3,
    "level": 1,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 0.5,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "korean_fried_chicken",
    "no": 4,
    "level": 2,
    "spice_level": 1,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 1.05,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "korean_sweets",
    "no": 5,
    "level": 2,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 1.1,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "galbitang",
    "no": 6,
    "level": 2,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 1.2,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "samgyeopsal",
    "no": 7,
    "level": 2,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 1.25,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "bingsu",
    "no": 8,
    "level": 3,
    "spice_level": 0,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 1.3,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "bibimbap",
    "no": 9,
    "level": 3,
    "spice_level": 2,
    "visual_unfamiliarity": 0,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 1.3,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "buchimgae",
    "no": 11,
    "level": 3,
    "spice_level": 1,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 1.4,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "sikhye",
    "no": 12,
    "level": 4,
    "spice_level": 0,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 5,
    "difficulty_score": 1.45,
    "tags": [
      "mild",
      "exotic_ingredient"
    ]
  },
  {
    "id": "abalone_porridge",
    "no": 13,
    "level": 4,
    "spice_level": 0,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 1.45,
    "tags": [
      "mild",
      "seafood"
    ]
  },
  {
    "id": "gimbap",
    "no": 14,
    "level": 4,
    "spice_level": 1,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 1,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 1.45,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "bindaetteok",
    "no": 15,
    "level": 4,
    "spice_level": 1,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 1.7,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "dak_han_mari",
    "no": 16,
    "level": 4,
    "spice_level": 2,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 1.7,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "suyuk",
    "no": 17,
    "level": 5,
    "spice_level": 2,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 1.7,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "bean_sprout_soup",
    "no": 18,
    "level": 5,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 7,
    "difficulty_score": 1.85,
    "tags": [
      "mild",
      "exotic_ingredient"
    ]
  },
  {
    "id": "traditional_tea",
    "no": 19,
    "level": 5,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 7,
    "difficulty_score": 1.85,
    "tags": [
      "mild",
      "exotic_ingredient"
    ]
  },
  {
    "id": "ssambap",
    "no": 20,
    "level": 5,
    "spice_level": 2,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 1.9,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "fish_cake_soup",
    "no": 21,
    "level": 5,
    "spice_level": 2,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 2,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "kong_guksu",
    "no": 22,
    "level": 5,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 2.1,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "white_kimchi",
    "no": 23,
    "level": 5,
    "spice_level": 0,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 2.15,
    "tags": [
      "mild",
      "fermented"
    ]
  },
  {
    "id": "perilla_soup",
    "no": 24,
    "level": 5,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 2.25,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "jjimdak",
    "no": 25,
    "level": 6,
    "spice_level": 4,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 2.4,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "seaweed_soup",
    "no": 26,
    "level": 6,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 8,
    "difficulty_score": 2.4,
    "tags": [
      "mild",
      "exotic_ingredient"
    ]
  },
  {
    "id": "dried_pollack_soup",
    "no": 27,
    "level": 6,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 8,
    "difficulty_score": 2.4,
    "tags": [
      "mild",
      "exotic_ingredient"
    ]
  },
  {
    "id": "doenjang_jjigae",
    "no": 28,
    "level": 6,
    "spice_level": 2,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 2.65,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "kimchi_jeon",
    "no": 29,
    "level": 6,
    "spice_level": 3,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 2.7,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "kimchi_fried_rice",
    "no": 30,
    "level": 6,
    "spice_level": 4,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 2.85,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "seafood_pancake",
    "no": 31,
    "level": 6,
    "spice_level": 3,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 2.85,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "young_radish_noodle",
    "no": 32,
    "level": 6,
    "spice_level": 3,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 2.85,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "grilled_eel",
    "no": 33,
    "level": 6,
    "spice_level": 1,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 2.85,
    "tags": [
      "mild",
      "seafood",
      "meat"
    ]
  },
  {
    "id": "tofu_with_kimchi",
    "no": 34,
    "level": 6,
    "spice_level": 4,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 2.9,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "raw_fish",
    "no": 35,
    "level": 6,
    "spice_level": 0,
    "visual_unfamiliarity": 7,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 5,
    "difficulty_score": 3.05,
    "tags": [
      "mild",
      "seafood",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "jokbal",
    "no": 36,
    "level": 6,
    "spice_level": 3,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 3.05,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "bossam",
    "no": 37,
    "level": 6,
    "spice_level": 3,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 3.05,
    "tags": [
      "mild",
      "meat"
    ]
  },
  {
    "id": "mussel_soup",
    "no": 38,
    "level": 7,
    "spice_level": 3,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 3.15,
    "tags": [
      "mild",
      "seafood"
    ]
  },
  {
    "id": "soy_pulp_stew",
    "no": 39,
    "level": 7,
    "spice_level": 3,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 3.3,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "bibim_guksu",
    "no": 40,
    "level": 7,
    "spice_level": 6,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 3.6,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "spicy_pork_stir_fry",
    "no": 41,
    "level": 7,
    "spice_level": 6,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 3.6,
    "tags": [
      "spicy",
      "meat"
    ]
  },
  {
    "id": "budae_jjigae",
    "no": 42,
    "level": 7,
    "spice_level": 6,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 3.6,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "raw_beef",
    "no": 43,
    "level": 7,
    "spice_level": 2,
    "visual_unfamiliarity": 7,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 3.6,
    "tags": [
      "mild",
      "meat",
      "unusual_look"
    ]
  },
  {
    "id": "dak_galbi",
    "no": 45,
    "level": 7,
    "spice_level": 6,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 3.8,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "raw_gizzard_shad",
    "no": 46,
    "level": 7,
    "spice_level": 0,
    "visual_unfamiliarity": 8,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 7,
    "difficulty_score": 3.85,
    "tags": [
      "mild",
      "seafood",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "tteokbokki",
    "no": 47,
    "level": 7,
    "spice_level": 7,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 3.95,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "kimchi_jjigae",
    "no": 48,
    "level": 7,
    "spice_level": 6,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 4.05,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "sundubu_jjigae",
    "no": 49,
    "level": 8,
    "spice_level": 7,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 4.15,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "yukgaejang",
    "no": 50,
    "level": 8,
    "spice_level": 7,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 4.15,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "bibim_naengmyeon",
    "no": 51,
    "level": 8,
    "spice_level": 7,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 4.3,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "kimchi_hotpot",
    "no": 52,
    "level": 8,
    "spice_level": 6,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 4.4,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "live_octopus",
    "no": 53,
    "level": 8,
    "spice_level": 2,
    "visual_unfamiliarity": 9,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 7,
    "difficulty_score": 4.45,
    "tags": [
      "mild",
      "seafood",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "spicy_chicken_stew",
    "no": 54,
    "level": 8,
    "spice_level": 7,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 4.45,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "braised_mackerel",
    "no": 55,
    "level": 8,
    "spice_level": 5,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 4.65,
    "tags": [
      "spicy",
      "seafood"
    ]
  },
  {
    "id": "braised_cutlassfish",
    "no": 56,
    "level": 8,
    "spice_level": 6,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 4.7,
    "tags": [
      "spicy",
      "seafood"
    ]
  },
  {
    "id": "pollack_stew",
    "no": 57,
    "level": 8,
    "spice_level": 6,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 4.8,
    "tags": [
      "spicy"
    ]
  },
  {
    "id": "gamjatang",
    "no": 58,
    "level": 8,
    "spice_level": 8,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 4.8,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "kimchi",
    "no": 59,
    "level": 8,
    "spice_level": 5,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 6,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 4.8,
    "tags": [
      "spicy",
      "fermented",
      "strong_smell"
    ]
  },
  {
    "id": "soft_octopus_soup",
    "no": 60,
    "level": 8,
    "spice_level": 5,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 5,
    "difficulty_score": 5,
    "tags": [
      "spicy",
      "seafood",
      "exotic_ingredient"
    ]
  },
  {
    "id": "jeotgal",
    "no": 61,
    "level": 8,
    "spice_level": 6,
    "visual_unfamiliarity": 6,
    "smell_unfamiliarity": 8,
    "ingredient_unfamiliarity": 6,
    "difficulty_score": 6.6,
    "tags": [
      "spicy",
      "fermented",
      "seafood",
      "strong_smell",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "spicy_sea_bream_soup",
    "no": 62,
    "level": 9,
    "spice_level": 7,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 4,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 5.25,
    "tags": [
      "very_spicy"
    ]
  },
  {
    "id": "sundae_soup",
    "no": 63,
    "level": 9,
    "spice_level": 6,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 8,
    "difficulty_score": 5.6,
    "tags": [
      "spicy",
      "exotic_ingredient"
    ]
  },
  {
    "id": "seafood_stew",
    "no": 64,
    "level": 9,
    "spice_level": 7,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 5,
    "difficulty_score": 5.7,
    "tags": [
      "very_spicy",
      "seafood",
      "exotic_ingredient"
    ]
  },
  {
    "id": "beef_tripe_hotpot",
    "no": 65,
    "level": 9,
    "spice_level": 7,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 6,
    "ingredient_unfamiliarity": 3,
    "difficulty_score": 5.7,
    "tags": [
      "very_spicy",
      "strong_smell"
    ]
  },
  {
    "id": "steamed_aged_kimchi",
    "no": 66,
    "level": 9,
    "spice_level": 5,
    "visual_unfamiliarity": 6,
    "smell_unfamiliarity": 7,
    "ingredient_unfamiliarity": 5,
    "difficulty_score": 5.8,
    "tags": [
      "spicy",
      "fermented",
      "strong_smell",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "maeun_tang",
    "no": 67,
    "level": 9,
    "spice_level": 8,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 5.9,
    "tags": [
      "very_spicy",
      "seafood"
    ]
  },
  {
    "id": "gejang",
    "no": 68,
    "level": 10,
    "spice_level": 5,
    "visual_unfamiliarity": 6,
    "smell_unfamiliarity": 7,
    "ingredient_unfamiliarity": 6,
    "difficulty_score": 5.95,
    "tags": [
      "spicy",
      "fermented",
      "seafood",
      "strong_smell",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "cheonggukjang",
    "no": 69,
    "level": 10,
    "spice_level": 4,
    "visual_unfamiliarity": 5,
    "smell_unfamiliarity": 10,
    "ingredient_unfamiliarity": 6,
    "difficulty_score": 6.3,
    "tags": [
      "spicy",
      "fermented",
      "strong_smell",
      "exotic_ingredient"
    ]
  },
  {
    "id": "buldak",
    "no": 70,
    "level": 10,
    "spice_level": 10,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 9,
    "difficulty_score": 6.55,
    "tags": [
      "very_spicy",
      "meat",
      "exotic_ingredient"
    ]
  },
  {
    "id": "spicy_marinated_crab",
    "no": 71,
    "level": 10,
    "spice_level": 7,
    "visual_unfamiliarity": 6,
    "smell_unfamiliarity": 7,
    "ingredient_unfamiliarity": 6,
    "difficulty_score": 6.65,
    "tags": [
      "very_spicy",
      "fermented",
      "seafood",
      "strong_smell",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "fermented_skate",
    "no": 72,
    "level": 10,
    "spice_level": 6,
    "visual_unfamiliarity": 8,
    "smell_unfamiliarity": 9,
    "ingredient_unfamiliarity": 8,
    "difficulty_score": 7.6,
    "tags": [
      "spicy",
      "fermented",
      "seafood",
      "strong_smell",
      "unusual_look",
      "exotic_ingredient"
    ]
  },
  {
    "id": "k_food_course_master",
    "no": 73,
    "level": 10,
    "spice_level": 2,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 0,
    "difficulty_score": 2,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "soy_sauce_master",
    "no": 74,
    "level": 11,
    "spice_level": 0,
    "visual_unfamiliarity": 1,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 1.85,
    "tags": [
      "mild"
    ]
  },
  {
    "id": "traditional_fermented_paste",
    "no": 75,
    "level": 11,
    "spice_level": 0,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 8,
    "ingredient_unfamiliarity": 4,
    "difficulty_score": 3.4,
    "tags": [
      "mild",
      "strong_smell"
    ]
  },
  {
    "id": "doenjang_master",
    "no": 76,
    "level": 12,
    "spice_level": 1,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 7,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 3.15,
    "tags": [
      "mild",
      "strong_smell"
    ]
  },
  {
    "id": "gochujang_master",
    "no": 77,
    "level": 12,
    "spice_level": 6,
    "visual_unfamiliarity": 2,
    "smell_unfamiliarity": 5,
    "ingredient_unfamiliarity": 2,
    "difficulty_score": 4.3,
    "tags": [
      "spicy"
    ]
  }
];

// ─── 2) Sheet4에 없는 기존 25개 요리: 삭제 ─────────────────────────────
const DELETE_IDS = [
  "acorn_jelly",
  "bamboo_shoot",
  "bellflower_root_salad",
  "braised_potato",
  "chicken_noodle_soup",
  "cold_soy_noodle",
  "crab_meat_porridge",
  "doenjang_guk",
  "hanjeongsik",
  "hotteok",
  "injeolmi",
  "jajangmyeon",
  "japchae",
  "multigrain_porridge",
  "multigrain_rice",
  "pork_soup",
  "seasoned_bracken",
  "seasoned_cucumber",
  "seasoned_mung_bean_jelly",
  "seasoned_spinach",
  "simple_dosirak",
  "songpyeon",
  "soy_braised_beans",
  "stir_fried_anchovies",
  "sujeonggwa"
];

// ─── 3) Sheet4에만 있는 신규 2개 요리: 새로 생성 (사진 없음, image: "") ──
const NEW_DISHES = [
  {
    "id": "gomtang_seolleongtang",
    "no": 10,
    "name_kr": "곰탕/설렁탕",
    "name_en": "Gomtang / Seolleongtang",
    "category": "국/육류",
    "level": 3,
    "spice_level": 0,
    "visual_unfamiliarity": 3,
    "smell_unfamiliarity": 2,
    "ingredient_unfamiliarity": 1,
    "difficulty_score": 1.35,
    "tags": [
      "mild"
    ],
    "image": "",
    "kick_question": "What gave this dish its kick?",
    "kick_options": [
      "Flavor",
      "Texture",
      "Smell",
      "Other"
    ]
  },
  {
    "id": "blowfish_soup",
    "no": 44,
    "name_kr": "복국",
    "name_en": "Blowfish Soup",
    "category": "국",
    "level": 7,
    "spice_level": 2,
    "visual_unfamiliarity": 4,
    "smell_unfamiliarity": 3,
    "ingredient_unfamiliarity": 9,
    "difficulty_score": 3.75,
    "tags": [
      "mild",
      "exotic_ingredient"
    ],
    "image": "",
    "kick_question": "What gave this dish its kick?",
    "kick_options": [
      "Flavor",
      "Texture",
      "Smell",
      "Other"
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

async function runUpdates() {
  console.log(`\n📝 기존 요리 ${UPDATES.length}개 레벨/난이도 갱신 시작...`);
  const chunks = chunkArray(UPDATES, 400);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const u of chunk) {
      const { id, ...fields } = u;
      batch.update(doc(db, "dishes", id), fields);
    }
    await batch.commit();
    console.log(`  ✅ ${chunk.length}개 갱신 완료`);
  }
}

async function runDeletes() {
  console.log(`\n🗑️  Sheet4에 없는 요리 ${DELETE_IDS.length}개 삭제 시작...`);
  const chunks = chunkArray(DELETE_IDS, 400);
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const id of chunk) {
      batch.delete(doc(db, "dishes", id));
    }
    await batch.commit();
    console.log(`  ✅ ${chunk.length}개 삭제 완료`);
  }
}

async function runNewDishes() {
  console.log(`\n🆕 신규 요리 ${NEW_DISHES.length}개 추가 시작...`);
  const batch = writeBatch(db);
  for (const dish of NEW_DISHES) {
    const { id, ...fields } = dish;
    batch.set(doc(db, "dishes", id), fields);
  }
  await batch.commit();
  console.log(`  ✅ ${NEW_DISHES.length}개 추가 완료 (사진 없음 — image: "")`);
}

async function main() {
  try {
    await runUpdates();
    await runDeletes();
    await runNewDishes();
    console.log("\n🎉 Sheet4 기준 dishes 컬렉션 마이그레이션 완료!");
    console.log(`   최종 요리 개수: ${UPDATES.length + NEW_DISHES.length}개`);
    console.log("\n⚠️  참고: 신규 요리 2개(곰탕/설렁탕, 복국)는 아직 사진이 없습니다.");
    console.log("   fetch_dish_images*.py + uploadDishImages.js 패턴으로 추후 사진을 채워주세요.");
    process.exit(0);
  } catch (err) {
    console.error("❌ 오류 발생:", err);
    process.exit(1);
  }
}

main();
