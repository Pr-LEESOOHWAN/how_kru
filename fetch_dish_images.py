#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HOW KRU - dishes.json 100개 요리에 대해 Wikimedia Commons에서
CC0 / CC-BY / CC-BY-SA / Public Domain 라이선스 실사 이미지를 자동으로 검색·다운로드하는 스크립트.

사용법 (본인 컴퓨터 - 인터넷 되는 환경에서 실행):
    pip install requests
    python fetch_dish_images.py

동작:
  1. dishes.json 을 읽어 100개 요리 목록을 가져옵니다.
  2. 각 요리에 대해 Wikimedia Commons API로 이미지를 검색합니다.
     (검색어는 name_en 기준, 일부는 SEARCH_OVERRIDES 로 보정)
  3. 라이선스가 CC0/CC-BY/CC-BY-SA/Public Domain 인 이미지만 후보로 채택합니다.
  4. 가장 적합한 후보 하나를 images/ 폴더에 "번호_id.jpg" 형태로 저장합니다.
  5. 전체 결과(성공/실패, 출처, 라이선스, 저작자)를 image_report.csv 로 남깁니다.
     -> 실패한 항목은 report를 보고 수동으로 사진을 채워 넣으면 됩니다.

주의:
  - 이 스크립트는 상업적으로 안전한 라이선스만 필터링하지만, 실제 사용 전 각
    이미지의 출처 페이지(source_url)에서 라이선스 조건(저작자 표시 등)을 다시 한 번
    확인하는 것을 권장합니다.
  - Wikimedia API 정책상 요청 사이에 약간의 지연(0.4초)을 둡니다. 100개 기준
    전체 실행에 몇 분 정도 걸릴 수 있습니다.
"""

import csv
import json
import os
import re
import time
import unicodedata

import requests

HEADERS = {
    # Wikimedia는 명확한 User-Agent를 요구합니다.
    "User-Agent": "HowKruAppImageFetcher/1.0 (contact: sa9seung@gmail.com; personal food-education app project)"
}

API_URL = "https://commons.wikimedia.org/w/api.php"

ACCEPTABLE_LICENSE_KEYWORDS = [
    "cc0",
    "public domain",
    "pd-",
    "cc by",
    "cc-by",
    "attribution",
]

# dishes.json 의 영어명만으로는 검색이 잘 안 되거나, 실제 "요리 사진"이 아니라
# 개념/성취(마스터, 체험) 항목인 경우를 위한 검색어 보정.
SEARCH_OVERRIDES = {
    "soy_sauce_master": "ganjang soy sauce korean jars",
    "doenjang_master": "doenjang korean soybean paste",
    "gochujang_master": "gochujang korean chili paste",
    "traditional_fermented_paste": "onggi jangdokdae korean fermentation jars",
    "k_food_course_master": "hanjeongsik korean full course meal table",
    "raw_fish": "hoe korean raw fish sashimi",
    "korean_sweets": "hangwa korean traditional sweets",
    "traditional_tea": "korean traditional tea hanguk cha",
    "simple_dosirak": "korean dosirak lunch box",
    "live_octopus": "sannakji korean live octopus dish",
    "beef_tripe_hotpot": "gopchang jeongol korean beef tripe hotpot",
    "fermented_skate": "hongeohoe korean fermented skate",
}

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
DISHES_JSON = os.path.join(THIS_DIR, "dishes.json")
IMAGES_DIR = os.path.join(THIS_DIR, "images")
REPORT_CSV = os.path.join(THIS_DIR, "image_report.csv")


def load_dishes():
    with open(DISHES_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def is_acceptable_license(license_short_name: str) -> bool:
    if not license_short_name:
        return False
    low = license_short_name.lower()
    return any(kw in low for kw in ACCEPTABLE_LICENSE_KEYWORDS)


def search_commons(query: str, limit: int = 8):
    """Wikimedia Commons에서 이미지 파일을 검색하고 imageinfo(URL/라이선스/작가)를 함께 가져온다."""
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": f"{query} filetype:bitmap",
        "gsrnamespace": 6,  # File: namespace
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
    # 라이선스 허용 + 해상도 큰 순
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


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)
    dishes = load_dishes()

    rows = []
    ok_count = 0

    for dish in dishes:
        no = dish["no"]
        did = dish["id"]
        name_en = dish["name_en"]
        name_kr = dish["name_kr"]
        query = SEARCH_OVERRIDES.get(did, f"{name_en} korean food")

        print(f"[{no:3d}/100] {name_kr} ({name_en})  -> 검색어: '{query}'")

        status = "FAIL"
        chosen = None
        try:
            results = search_commons(query)
            chosen = pick_best(results)
            if not chosen:
                # 재시도: "korean food" 접미어 없이
                results2 = search_commons(name_en)
                chosen = pick_best(results2)
        except Exception as e:
            print(f"    검색 오류: {e}")

        filename = f"{no:03d}_{safe_filename(did)}.jpg"
        dest_path = os.path.join(IMAGES_DIR, filename)

        if chosen:
            if download(chosen["url"], dest_path):
                status = "OK"
                ok_count += 1
            rows.append({
                "no": no,
                "id": did,
                "name_kr": name_kr,
                "name_en": name_en,
                "status": status,
                "filename": filename if status == "OK" else "",
                "license": chosen["license"],
                "artist": chosen["artist"],
                "source_page": chosen["descriptionshorturl"],
                "file_url": chosen["full_url"],
            })
        else:
            print("    적합한 CC 라이선스 이미지를 찾지 못했습니다. 수동 확인이 필요합니다.")
            rows.append({
                "no": no,
                "id": did,
                "name_kr": name_kr,
                "name_en": name_en,
                "status": "FAIL",
                "filename": "",
                "license": "",
                "artist": "",
                "source_page": "",
                "file_url": "",
            })

        time.sleep(0.4)

    with open(REPORT_CSV, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "no", "id", "name_kr", "name_en", "status",
            "filename", "license", "artist", "source_page", "file_url",
        ])
        writer.writeheader()
        writer.writerows(rows)

    fail_count = len(dishes) - ok_count
    print("\n=================================")
    print(f"완료: 성공 {ok_count}개 / 실패 {fail_count}개 (전체 {len(dishes)}개)")
    print(f"이미지 저장 위치: {IMAGES_DIR}")
    print(f"결과 리포트: {REPORT_CSV}")
    print("실패한 항목은 image_report.csv에서 status=FAIL 로 확인 후 수동으로 채워주세요.")


if __name__ == "__main__":
    main()
