#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1차 실행(fetch_dish_images.py) 결과 중 실패했거나 사진이 요리와 맞지 않았던
19개 항목만 골라서, 이번에는 "한글 키워드" 위주로 Wikimedia Commons를 재검색하는 스크립트.

대상(98~100번 마스터/체험 항목 3개는 이번 재검색에서 제외):
  실패 10개: 43,52,75,79,81,87,89,91,92,96
  오매칭 9개: 6,18,29,36,49,56,63,69,86

사용법:
    pip install requests
    python fetch_dish_images_retry.py

- images/ 폴더의 해당 파일만 새로 덮어씁니다.
- image_report.csv 는 새 결과로 해당 행만 업데이트합니다(나머지 81개 행은 그대로 유지).
- 그래도 실패/애매한 경우는 콘솔과 CSV에 STILL_FAIL 로 표시되니 수동 확인이 필요합니다.
"""

import csv
import json
import os
import re
import time
import unicodedata

import requests

HEADERS = {
    "User-Agent": "HowKruAppImageFetcher/1.0 (contact: sa9seung@gmail.com; personal food-education app project)"
}
API_URL = "https://commons.wikimedia.org/w/api.php"

ACCEPTABLE_LICENSE_KEYWORDS = [
    "cc0", "public domain", "pd-", "cc by", "cc-by", "attribution",
]

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DISHES_JSON = os.path.join(THIS_DIR, "dishes.json")
IMAGES_DIR = os.path.join(THIS_DIR, "images")
REPORT_CSV = os.path.join(THIS_DIR, "image_report.csv")

# 재검색 대상 id 목록 (98~100번 제외)
RETRY_IDS = {
    # 실패했던 것들
    "steamed_aged_kimchi", "pollack_stew", "braised_cutlassfish",
    "bellflower_root_salad", "raw_gizzard_shad", "soft_octopus_soup",
    "young_radish_noodle", "crab_meat_porridge", "spicy_sea_bream_soup",
    "soy_sauce_master",
    # 사진이 요리와 안 맞았던 것들
    "spicy_pork_stir_fry", "seasoned_cucumber", "rolled_omelet", "raw_fish",
    "traditional_tea", "seasoned_bracken", "beef_tripe_hotpot",
    "soy_braised_beans", "tofu_with_kimchi",
}

# 한글 키워드 우선 검색어 (여러 후보를 순서대로 시도)
KOREAN_QUERY_OVERRIDES = {
    "steamed_aged_kimchi": ["묵은지찜", "묵은지 찜", "묵은지"],
    "pollack_stew": ["동태찌개", "동태 찌개"],
    "braised_cutlassfish": ["갈치조림", "갈치 조림"],
    "bellflower_root_salad": ["도라지무침", "도라지 무침"],
    "raw_gizzard_shad": ["전어회", "전어 회"],
    "soft_octopus_soup": ["연포탕"],
    "young_radish_noodle": ["열무국수", "열무 국수"],
    "crab_meat_porridge": ["게살죽", "게살 죽"],
    "spicy_sea_bream_soup": ["도미매운탕", "도미 매운탕"],
    "soy_sauce_master": ["간장 항아리", "장독대 간장", "간장독"],
    "spicy_pork_stir_fry": ["제육볶음", "제육 볶음"],
    "seasoned_cucumber": ["오이무침", "오이 무침"],
    "rolled_omelet": ["계란말이"],
    "raw_fish": ["생선회", "회 물고기", "활어회"],
    "traditional_tea": ["전통차", "한국 전통차", "쌍화차"],
    "seasoned_bracken": ["고사리나물", "고사리 나물"],
    "beef_tripe_hotpot": ["곱창전골", "곱창 전골"],
    "soy_braised_beans": ["콩자반"],
    "tofu_with_kimchi": ["두부김치", "두부 김치"],
}


def load_dishes():
    with open(DISHES_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def is_acceptable_license(license_short_name: str) -> bool:
    if not license_short_name:
        return False
    low = license_short_name.lower()
    return any(kw in low for kw in ACCEPTABLE_LICENSE_KEYWORDS)


def search_commons(query: str, limit: int = 8):
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata|mime",
        "iiurlwidth": 1024,
    }
    resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    pages = data.get("query", {}).get("pages", {})
    results = []
    for _, page in pages.items():
        infos = page.get("imageinfo")
        if not infos:
            continue
        info = infos[0]
        mime = info.get("mime", "")
        if not mime.startswith("image/"):
            continue
        extmeta = info.get("extmetadata", {})
        license_short = extmeta.get("LicenseShortName", {}).get("value", "")
        artist_raw = extmeta.get("Artist", {}).get("value", "")
        artist = re.sub("<[^<]+?>", "", artist_raw).strip()
        width = info.get("width", 0)
        height = info.get("height", 0)
        results.append({
            "title": page.get("title"),
            "url": info.get("thumburl") or info.get("url"),
            "full_url": info.get("url"),
            "descriptionshorturl": info.get("descriptionshorturl") or info.get("descriptionurl"),
            "license": license_short,
            "artist": artist,
            "width": width,
            "height": height,
        })
    return results


def pick_best(results):
    acceptable = [r for r in results if is_acceptable_license(r["license"])]
    if not acceptable:
        return None
    acceptable.sort(key=lambda r: (r["width"] * r["height"]), reverse=True)
    return acceptable[0]


def safe_filename(name: str) -> str:
    name = unicodedata.normalize("NFKD", name)
    return re.sub(r"[^a-zA-Z0-9_\-]", "_", name)


def download(url: str, dest_path: str) -> bool:
    try:
        r = requests.get(url, headers=HEADERS, timeout=30, stream=True)
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"    다운로드 실패: {e}")
        return False


def load_existing_report():
    rows = {}
    if os.path.exists(REPORT_CSV):
        with open(REPORT_CSV, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rows[row["id"]] = row
    return rows


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    dishes = {d["id"]: d for d in load_dishes()}
    existing_rows = load_existing_report()

    still_fail = []

    for did in RETRY_IDS:
        dish = dishes.get(did)
        if not dish:
            print(f"[경고] dishes.json에 없는 id: {did}")
            continue

        no = dish["no"]
        name_en = dish["name_en"]
        name_kr = dish["name_kr"]
        queries = list(KOREAN_QUERY_OVERRIDES.get(did, [name_kr]))
        queries.append(f"{name_en} korean food")  # 최후 fallback

        print(f"[{no:3d}] {name_kr} ({name_en}) 재검색 중...")

        chosen = None
        for q in queries:
            try:
                results = search_commons(q)
                chosen = pick_best(results)
                if chosen:
                    print(f"    '{q}' -> 매칭: {chosen['title']} ({chosen['license']})")
                    break
                else:
                    print(f"    '{q}' -> 적합한 결과 없음")
            except Exception as e:
                print(f"    '{q}' 검색 오류: {e}")
            time.sleep(0.3)

        filename = f"{no:03d}_{safe_filename(did)}.jpg"
        dest_path = os.path.join(IMAGES_DIR, filename)

        if chosen:
            ok = download(chosen["url"], dest_path)
            status = "OK" if ok else "FAIL"
            existing_rows[did] = {
                "no": no, "id": did, "name_kr": name_kr, "name_en": name_en,
                "status": status,
                "filename": filename if ok else "",
                "license": chosen["license"],
                "artist": chosen["artist"],
                "source_page": chosen["descriptionshorturl"],
                "file_url": chosen["full_url"],
            }
            if not ok:
                still_fail.append((no, name_kr, name_en))
        else:
            print("    -> 여전히 실패. 수동 확인 필요.")
            existing_rows[did] = {
                "no": no, "id": did, "name_kr": name_kr, "name_en": name_en,
                "status": "STILL_FAIL", "filename": "", "license": "",
                "artist": "", "source_page": "", "file_url": "",
            }
            still_fail.append((no, name_kr, name_en))

        time.sleep(0.4)

    # 번호순 정렬 후 다시 저장
    all_rows = sorted(existing_rows.values(), key=lambda r: int(r["no"]))
    with open(REPORT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "no", "id", "name_kr", "name_en", "status",
            "filename", "license", "artist", "source_page", "file_url",
        ])
        writer.writeheader()
        writer.writerows(all_rows)

    print("\n=================================")
    print(f"재검색 완료. 총 {len(RETRY_IDS)}개 중 여전히 실패: {len(still_fail)}개")
    for no, kr, en in still_fail:
        print(f"  - {no}: {kr} ({en})")
    print(f"결과 리포트 갱신됨: {REPORT_CSV}")


if __name__ == "__main__":
    main()
