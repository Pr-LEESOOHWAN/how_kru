// Firebase Storage 다운로드 URL은 파일 경로의 "/"를 "%2F"로 인코딩해서 담는다
// (…/o/dishes%2Frolled_omelet.jpg?alt=media&token=…). 이 URL을 화면 이동 파라미터로 넘기면
// 받는 쪽에서 디코딩되며 "%2F"가 "/"로 바뀌는 경우가 있는데, 그러면 Storage가 400을 돌려줘
// 사진이 안 뜬다(미션 시작 화면의 빈 동그라미 원인). 파일 경로 부분만 다시 인코딩해 되살린다.

const STORAGE_OBJECT = /^(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/)([^?]+)(.*)$/;

export function normalizeStorageUrl(url: string): string {
  const m = STORAGE_OBJECT.exec(url);
  if (!m) return url;
  const [, prefix, objectPath, rest] = m;
  let decoded = objectPath;
  try {
    decoded = decodeURIComponent(objectPath);
  } catch {
    // 이미 이상하게 인코딩된 경로면 손대지 않는다
    return url;
  }
  return `${prefix}${encodeURIComponent(decoded)}${rest}`;
}
