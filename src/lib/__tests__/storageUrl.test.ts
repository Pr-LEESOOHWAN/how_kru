import { normalizeStorageUrl } from "../storageUrl";

const GOOD =
  "https://firebasestorage.googleapis.com/v0/b/how-kru.firebasestorage.app/o/dishes%2Frolled_omelet.jpg?alt=media&token=abc-123";

describe("normalizeStorageUrl", () => {
  it("정상 URL은 그대로 둔다", () => {
    expect(normalizeStorageUrl(GOOD)).toBe(GOOD);
  });

  it("화면 이동 중 %2F가 /로 풀린 URL을 되살린다(이대로면 Storage가 400)", () => {
    const broken =
      "https://firebasestorage.googleapis.com/v0/b/how-kru.firebasestorage.app/o/dishes/rolled_omelet.jpg?alt=media&token=abc-123";
    expect(normalizeStorageUrl(broken)).toBe(GOOD);
  });

  it("한글·공백이 든 파일 경로도 한 번만 인코딩한다", () => {
    const url = "https://firebasestorage.googleapis.com/v0/b/x/o/reviews%2F%EA%B9%80%EB%B0%A5%201.jpg?alt=media";
    expect(normalizeStorageUrl(url)).toBe(url);
  });

  it("Storage가 아닌 URL과 로컬 파일은 건드리지 않는다", () => {
    expect(normalizeStorageUrl("https://example.com/a/b.jpg")).toBe("https://example.com/a/b.jpg");
    expect(normalizeStorageUrl("file:///data/cache/photo.jpg")).toBe("file:///data/cache/photo.jpg");
  });
});
