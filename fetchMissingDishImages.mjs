// 아직 image 필드가 비어있는 요리 6개(blowfish_soup, gomtang_seolleongtang,
// raw_gizzard_shad, soy_sauce_master, spicy_sea_bream_soup, young_radish_noodle)를
// Wikimedia Commons에서 CC0/CC-BY 라이선스 사진으로 채운다.
//
// fetch_dish_images.py / fetch_dish_images_retry.py와 같은 방식(라이선스 필터링)이지만,
// Admin SDK로 검색-다운로드-Storage 업로드-Firestore 반영을 한 스크립트에서 끝낸다
// (uploadDishImages.js처럼 Storage 규칙을 임시로 열 필요가 없음 - 서비스 계정은
// 규칙과 무관하게 접근 가능).
//
// 정확도를 우선한다: 검색어가 그 요리와 명확히 맞는 결과가 없으면 그냥 비워둔다
// (엉뚱한 요리 사진을 억지로 채우지 않음 - 플레이스홀더가 잘못된 사진보다 낫다).
//
// 사용법: node fetchMissingDishImages.mjs

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";

const HEADERS = {
  "User-Agent": "HowKruAppImageFetcher/1.0 (contact: sa9seung@gmail.com; personal food-education app project)",
};
const API_URL = "https://commons.wikimedia.org/w/api.php";
const ACCEPTABLE_LICENSE_KEYWORDS = ["cc0", "public domain", "pd-", "cc by", "cc-by", "attribution"];

// 요리별 한글 우선 검색어 (여러 후보 순서대로 시도). 오탐 방지를 위해 그 요리와
// 직접 관련된 검색어만 넣는다 - "한식 일반" 같은 뭉뚱그린 fallback은 넣지 않는다.
const QUERIES = {
  blowfish_soup: ["복국", "복지리", "복매운탕", "blowfish soup korean"],
  gomtang_seolleongtang: ["설렁탕", "곰탕", "seolleongtang korean"],
  raw_gizzard_shad: ["전어회", "전어 회", "gizzard shad sashimi korean"],
  soy_sauce_master: ["간장 항아리", "장독대", "메주 간장"],
  spicy_sea_bream_soup: ["도미매운탕", "도미 매운탕", "sea bream spicy soup korean"],
  young_radish_noodle: ["열무국수", "열무 국수", "young radish noodle korean"],
};

const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf-8"));
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "how-kru.firebasestorage.app",
});
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

function isAcceptableLicense(licenseShortName) {
  if (!licenseShortName) return false;
  const low = licenseShortName.toLowerCase();
  return ACCEPTABLE_LICENSE_KEYWORDS.some((kw) => low.includes(kw));
}

async function searchCommons(query, limit = 8) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|size|extmetadata|mime",
    iiurlwidth: "1024",
  });
  const res = await fetch(`${API_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Wikimedia API ${res.status}`);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const results = [];
  for (const page of Object.values(pages)) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const mime = info.mime ?? "";
    if (!mime.startsWith("image/")) continue;
    const extmeta = info.extmetadata ?? {};
    const licenseShort = extmeta.LicenseShortName?.value ?? "";
    const artistRaw = extmeta.Artist?.value ?? "";
    results.push({
      title: page.title,
      url: info.thumburl || info.url,
      license: licenseShort,
      artist: artistRaw.replace(/<[^<]+?>/g, "").trim(),
      width: info.width ?? 0,
      height: info.height ?? 0,
    });
  }
  return results;
}

function pickBest(results) {
  const acceptable = results.filter((r) => isAcceptableLicense(r.license));
  if (acceptable.length === 0) return null;
  acceptable.sort((a, b) => b.width * b.height - a.width * a.height);
  return acceptable[0];
}

async function processOne(dishId) {
  const queries = QUERIES[dishId];
  console.log(`\n[${dishId}] 검색 중...`);

  let chosen = null;
  for (const q of queries) {
    try {
      const results = await searchCommons(q);
      chosen = pickBest(results);
      if (chosen) {
        console.log(`  '${q}' -> ${chosen.title} (${chosen.license}, ${chosen.width}x${chosen.height}, by ${chosen.artist})`);
        break;
      }
      console.log(`  '${q}' -> 적합한 결과 없음`);
    } catch (err) {
      console.log(`  '${q}' 검색 오류: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  if (!chosen) {
    console.log(`  -> 실패, 수동 확인 필요 (플레이스홀더 유지)`);
    return { id: dishId, ok: false };
  }

  const imgRes = await fetch(chosen.url, { headers: HEADERS });
  if (!imgRes.ok) {
    console.log(`  다운로드 실패: ${imgRes.status}`);
    return { id: dishId, ok: false };
  }
  const buffer = Buffer.from(await imgRes.arrayBuffer());

  const storagePath = `dishes/${dishId}.jpg`;
  const file = bucket.file(storagePath);
  const token = crypto.randomUUID();
  await file.save(buffer, {
    contentType: "image/jpeg",
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  });
  const encodedPath = encodeURIComponent(storagePath);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

  await db.collection("dishes").doc(dishId).update({ image: url });
  console.log(`  ✅ 업로드 완료: ${url}`);
  return { id: dishId, ok: true, url, license: chosen.license, artist: chosen.artist, source: chosen.title };
}

async function main() {
  const ids = Object.keys(QUERIES);
  const results = [];
  for (const id of ids) {
    results.push(await processOne(id));
  }

  const ok = results.filter((r) => r.ok);
  const fail = results.filter((r) => !r.ok);
  console.log("\n=================================");
  console.log(`완료: 성공 ${ok.length}개 / 실패(수동 확인 필요) ${fail.length}개`);
  if (fail.length > 0) {
    console.log("여전히 비어있는 요리:", fail.map((r) => r.id).join(", "));
  }
}

main().catch((err) => {
  console.error("오류:", err);
  process.exit(1);
});
