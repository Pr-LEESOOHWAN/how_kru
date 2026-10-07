import { timeAgo } from "../timeAgo";

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const ago = (ms: number) => ({ seconds: Math.floor((NOW - ms) / 1000) });
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("timeAgo", () => {
  it("서버 시간이 아직 없는 방금 쓴 글은 '방금 전'", () => {
    expect(timeAgo(null, "ko", NOW)).toBe("방금 전");
    expect(timeAgo(undefined, "en", NOW)).toBe("just now");
  });

  it("1분 미만은 '방금 전'", () => {
    expect(timeAgo(ago(30_000), "ko", NOW)).toBe("방금 전");
  });

  it("분/시간/일 단위로 내림해서 보여준다", () => {
    expect(timeAgo(ago(5 * MIN + 59_000), "en", NOW)).toBe("5 min ago");
    expect(timeAgo(ago(1 * HOUR), "en", NOW)).toBe("1 hour ago");
    expect(timeAgo(ago(23 * HOUR), "en", NOW)).toBe("23 hours ago");
    expect(timeAgo(ago(1 * DAY), "en", NOW)).toBe("1 day ago");
    expect(timeAgo(ago(6 * DAY), "en", NOW)).toBe("6 days ago");
  });

  it("언어마다 다르게 번역한다", () => {
    expect(timeAgo(ago(3 * HOUR), "ko", NOW)).toBe("3시간 전");
    expect(timeAgo(ago(3 * HOUR), "en", NOW)).not.toBe(timeAgo(ago(3 * HOUR), "ja", NOW));
  });

  it("일주일이 넘으면 그 언어의 날짜 표기로 바꾼다", () => {
    const createdAt = ago(10 * DAY);
    const expected = new Date(createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    expect(timeAgo(createdAt, "en", NOW)).toBe(expected);
    expect(timeAgo(createdAt, "en", NOW)).not.toMatch(/ago/);
  });
});
