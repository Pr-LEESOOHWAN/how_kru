#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dishes.json 중 1~72번 요리에 대해 Wikimedia Commons에서 CC0/CC-BY/CC-BY-SA/Public
Domain 실사 이미지를 검색·다운로드하는 스크립트. (한국음식 Level.xlsx 의 Mater100
시트 1~72번과 동일한 목록입니다)

이전 자동 검색에서 엉뚱한 사진이 걸렸던 7개 항목(6,18,29,36,43,49,56번)은
로마자 정식 명칭으로 검색어를 바꿔서 정확도를 높였습니다.

사용법:
    pip install requests
    python fetch_dish_images_1_72.py

- images/ 폴더에 "번호_id.jpg" 로 저장 (기존 파일 덮어씀)
- image_report.csv 의 1~72번 행을 갱신 (73번 이후 행은 그대로 유지)
- 끝나고 나면 node uploadDishImages.js 를 다시 실행해서 Firebase에 반영하세요.
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

MAX_NO = 72

# 이전에 오매칭/실패했던 항목은 로마자 정식 명칭으로 재검색
SEARCH_OVERRIDES = {
    "spicy_pork_stir_fry": ["Jeyuk-bokkeum", "Jeyukbokkeum Korean food"],
    "seasoned_cucumber": ["Oimuchim Korean cucumber", "Oi-muchim"],
    "rolled_omelet": ["Gyeranmari Korean"],
    "raw_fish": ["Saengseon-hoe Korean raw fish", "Korean sliced raw fish sashimi hoe"],
    "steamed_aged_kimchi": ["Mukeunji-jjim", "aged kimchi braised pork Korean"],
    "traditional_tea": ["Korean traditional tea jeontongcha", "Tea of Korea"],
    "seasoned_bracken": ["Gosari-namul Korean", "Gosarinamul"],
}


def load_dishes():
    with open(DISHES_JSON, "r", encoding="utf-8") as f:
        return [d for d in json.load(f) if d["no"] <= MAX_NO]


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
    dishes = load_dishes()
    existing_rows = load_existing_report()

    still_fail = []

    for dish in dishes:
        no = dish["no"]
        did = dish["id"]
        name_en = dish["name_en"]
        name_kr = dish["name_kr"]
        queries = list(SEARCH_OVERRIDES.get(did, [f"{name_en} korean food"]))
        if did in SEARCH_OVERRIDES:
            queries.append(f"{name_en} korean food")  # 최후 fallback

        print(f"[{no:3d}/72] {name_kr} ({name_en}) 검색 중...")

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
            print("    -> 실패. 수동 확인 필요.")
            existing_rows[did] = {
                "no": no, "id": did, "name_kr": name_kr, "name_en": name_en,
                "status": "FAIL", "filename": "", "license": "",
                "artist": "", "source_page": "", "file_url": "",
            }
            still_fail.append((no, name_kr, name_en))

        time.sleep(0.4)

    all_rows = sorted(existing_rows.values(), key=lambda r: int(r["no"]))
    with open(REPORT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "no", "id", "name_kr", "name_en", "status",
            "filename", "license", "artist", "source_page", "file_url",
        ])
        writer.writeheader()
        writer.writerows(all_rows)

    print("\n=================================")
    print(f"1~72번 처리 완료. 실패: {len(still_fail)}개")
    for no, kr, en in still_fail:
        print(f"  - {no}: {kr} ({en})")
    print(f"결과 리포트 갱신됨: {REPORT_CSV}")
    print("다음 단계: node uploadDishImages.js 실행해서 Firebase Storage/Firestore에 반영하세요.")


if __name__ == "__main__":
    main()
