// 요리 사진이 실제 목표 요리로 보이는지 Cloud Vision의 라벨/웹 감지 결과로 판단한다.
// (Claude 비전 판정 방식도 검토했지만, 별도 Anthropic 결제 계정이 필요해서 이미
// 쓰고 있는 Google Vision API만으로 처리하는 쪽으로 바꿨다.)
//
// LABEL_DETECTION만 쓰면 "food", "dish", "rice"처럼 뭉뚱그린 라벨만 나오는 경우가
// 많아서, WEB_DETECTION(비슷한 이미지가 웹에 어떤 이름으로 올라와 있는지)도 같이
// 봐서 "bibimbap" 같은 구체적인 요리명이 잡히는지 확인한다.

import { detectFoodTerms } from "./vision";

export type DishMatchResult = {
  matched: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
};

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export async function judgeDishPhoto(params: {
  imageBase64: string;
  dishNameKr: string;
  dishNameEn: string;
  category?: string;
  tags?: string[];
}): Promise<DishMatchResult> {
  const { imageBase64, dishNameKr, dishNameEn, category, tags } = params;

  let terms: string[];
  try {
    terms = await detectFoodTerms(imageBase64);
  } catch (err) {
    console.error("[judgeDishPhoto] Vision 감지 실패:", err);
    return { matched: false, confidence: "low", reason: "사진 판정 중 오류가 발생했어요." };
  }

  const normTerms = terms.map(normalize);
  const targetName = normalize(dishNameEn);
  const targetTags = (tags ?? []).map(normalize).filter(Boolean);
  const targetCategory = category ? normalize(category) : undefined;

  // 1) 요리명과 정확히 일치하거나(짧은 라벨이 많아 부분 포함도 허용), 요리명이
  //    라벨/웹 엔티티 문자열에 포함된 경우 - 가장 신뢰도 높은 매칭.
  const nameHit = normTerms.find(
    (t) => t === targetName || (targetName.length > 3 && (t.includes(targetName) || targetName.includes(t)))
  );
  if (nameHit) {
    return { matched: true, confidence: "high", reason: `사진에서 '${nameHit}'로 인식됐어요.` };
  }

  // 2) dishes 컬렉션에 등록된 태그와 겹치면 중간 신뢰도로 통과.
  const tagHit = targetTags.find((t) => normTerms.includes(t));
  if (tagHit) {
    return { matched: true, confidence: "medium", reason: `사진에서 '${tagHit}' 관련 특징이 감지됐어요.` };
  }

  // 3) 카테고리 정도만 겹치면(예: "soup", "stew") - 확정 매칭은 아니지만 완전히
  //    엉뚱한 사진은 아닐 수 있어서 fail보다는 uncertain 쪽 이유로 남긴다.
  if (targetCategory && normTerms.some((t) => t.includes(targetCategory) || targetCategory.includes(t))) {
    return {
      matched: false,
      confidence: "low",
      reason: "정확한 요리명까지는 확인 못 했지만, 비슷한 종류의 음식으로는 보여요.",
    };
  }

  return {
    matched: false,
    confidence: "low",
    reason:
      terms.length > 0
        ? `사진에서 '${terms.slice(0, 3).join(", ")}' 정도만 인식됐고, '${dishNameKr}'와는 달라 보여요.`
        : "사진에서 요리 특징을 인식하지 못했어요.",
  };
}
