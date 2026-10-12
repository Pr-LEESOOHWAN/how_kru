// 영수증 사진 -> 글자 (인증 화면의 "읽어낸 글자" 미리보기용).
//
// functions/src/index.ts의 readReceipt Cloud Function을 부른다. 예전엔 앱이 Google Vision API를
// 직접 불렀는데, 그러려면 API 키를 EXPO_PUBLIC_*로 APK에 넣어야 했고(누구나 꺼내 쓸 수 있음),
// Vision 전용 키가 없으면 Places 키로 대신 호출해서 그 키에 Vision 권한이 없으면 늘 실패했다.
// 서버는 서비스 계정 인증으로 Vision을 부르므로 앱에는 키가 필요 없다.

import { httpsCallable } from "firebase/functions";

import { functions } from "@/src/firebase/firebaseConfig";

/** message는 개발자용 상세(콘솔용) - 화면에는 verify.ocrFailed 문구를 보여준다. */
export class OcrApiError extends Error {}

const callReadReceipt = httpsCallable<{ imageBase64: string }, { text: string }>(functions, "readReceipt");

/**
 * base64로 인코딩된 이미지에서 텍스트를 추출합니다.
 * (expo-camera의 takePictureAsync({ base64: true })로 얻은 base64 문자열을 그대로 넣으면 됩니다)
 *
 * 반환값: 인식된 전체 텍스트(줄바꿈 포함 원문). 텍스트가 없으면 빈 문자열.
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    const res = await callReadReceipt({ imageBase64: base64Image });
    return res.data.text ?? "";
  } catch (err) {
    throw new OcrApiError(err instanceof Error ? err.message : String(err));
  }
}
