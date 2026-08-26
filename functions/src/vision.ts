// Cloud Vision OCR (서버 사이드).
// 클라이언트(src/services/ocr.ts)는 API 키를 EXPO_PUBLIC_*로 앱에 박아 넣는
// 방식이었는데, 여기는 Cloud Functions 안이라 서비스 계정의 기본 인증(ADC)으로
// 바로 호출한다 - 키를 별도로 관리할 필요가 없다.
// 사전 조건: GCP 콘솔에서 "Cloud Vision API"가 이 프로젝트에 활성화돼 있어야
// 한다 (Places/Vision API 키 발급할 때 이미 켰다면 그대로 재사용됨).

import vision from "@google-cloud/vision";

const client = new vision.ImageAnnotatorClient();

export async function extractText(base64Image: string): Promise<string> {
  const [result] = await client.documentTextDetection({
    image: { content: base64Image },
    imageContext: { languageHints: ["ko", "en"] },
  });
  return result.fullTextAnnotation?.text ?? "";
}

// 요리 사진 판정용: 일반 라벨(LABEL_DETECTION)과 웹에서 비슷한 이미지가 어떤 이름으로
// 올라와 있는지(WEB_DETECTION)를 한 번의 요청으로 같이 받는다. LABEL_DETECTION만으로는
// "food", "dish" 같은 뭉뚱그린 결과만 나오는 경우가 많아 WEB_DETECTION으로 보완한다.
export async function detectFoodTerms(base64Image: string): Promise<string[]> {
  const [result] = await client.annotateImage({
    image: { content: base64Image },
    features: [
      { type: "LABEL_DETECTION", maxResults: 10 },
      { type: "WEB_DETECTION", maxResults: 10 },
    ],
  });

  const labels = (result.labelAnnotations ?? []).map((l) => l.description ?? "");
  const webEntities = (result.webDetection?.webEntities ?? []).map((e) => e.description ?? "");
  return [...labels, ...webEntities].filter((term): term is string => !!term);
}
