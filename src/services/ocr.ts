// Google Cloud Vision API - TEXT_DETECTION 을 이용해 영수증 사진에서
// 글자(한글 포함)를 추출하는 서비스.
//
// 필요한 것:
//   1) Google Cloud 콘솔(Places API 키와 같은 프로젝트)에서
//      "Cloud Vision API" 활성화 (APIs & Services > 라이브러리 > "Cloud Vision API" 검색 > 사용 설정)
//   2) .env 파일에 아래 키 추가
//        EXPO_PUBLIC_GOOGLE_VISION_API_KEY=여기에_발급받은_키
//      (Places API 키를 그대로 재사용해도 되지만, 제한된 별도 키를 새로 발급받는 걸 권장)
//
// 참고: 상호명 매칭/인증 로직은 아직 포함하지 않았습니다. 이 서비스는
// "사진 -> 텍스트" 추출까지만 담당하고, 추출된 텍스트를 어떻게 검증에 쓸지는
// 추후 별도로 구현합니다.

const GOOGLE_VISION_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

export class OcrApiError extends Error {}

/**
 * base64로 인코딩된 이미지에서 텍스트를 추출합니다.
 * (expo-camera의 takePictureAsync({ base64: true })로 얻은 base64 문자열을 그대로 넣으면 됩니다)
 *
 * 반환값: 인식된 전체 텍스트(줄바꿈 포함 원문). 텍스트가 없으면 빈 문자열.
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  if (!GOOGLE_VISION_API_KEY) {
    throw new OcrApiError(
      "Google Vision API 키가 설정되지 않았어요. .env 파일에 EXPO_PUBLIC_GOOGLE_VISION_API_KEY를 추가해주세요."
    );
  }

  const res = await fetch(`${VISION_API_URL}?key=${GOOGLE_VISION_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Image },
          // DOCUMENT_TEXT_DETECTION: 영수증처럼 밀집된 문서 텍스트에 TEXT_DETECTION보다 최적화되어 있음
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ko", "en"] },
        },
      ],
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new OcrApiError(
      `Vision API 오류 (${data.error?.status ?? res.status}): ${data.error?.message ?? "알 수 없는 오류"}`
    );
  }

  const responseError = data.responses?.[0]?.error;
  if (responseError) {
    throw new OcrApiError(`Vision API 오류: ${responseError.message ?? "알 수 없는 오류"}`);
  }

  const fullText: string | undefined = data.responses?.[0]?.fullTextAnnotation?.text;
  return fullText ?? "";
}
