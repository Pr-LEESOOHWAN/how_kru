import { translate } from "..";
import { format } from "../format";
import { josa, withJosa } from "../josa";

describe("josa", () => {
  it("받침이 있으면 받침 있는 형태를 고른다", () => {
    expect(josa("비빔밥", "을")).toBe("을");
    expect(josa("김치찌개", "을")).toBe("를");
    expect(josa("본가", "은")).toBe("는");
    expect(josa("명동", "이")).toBe("이");
  });

  it("'으로'는 ㄹ 받침 뒤에서 '로'를 쓴다", () => {
    expect(withJosa("서울", "으로")).toBe("서울로");
    expect(withJosa("광장시장", "으로")).toBe("광장시장으로");
    expect(withJosa("본가", "으로")).toBe("본가로");
  });

  it("한글이 아니거나 빈 값이면 받침 없는 형태로 둔다", () => {
    expect(josa("BBQ", "으로")).toBe("로");
    expect(josa("", "이")).toBe("가");
    expect(josa(undefined, "과")).toBe("와");
    expect(withJosa(null, "을")).toBe("를");
  });
});

describe("format", () => {
  it("변수를 치환한다", () => {
    expect(format("{count}개 요리", { count: 3 })).toBe("3개 요리");
  });

  it("조사 수식어를 값에 맞게 붙인다", () => {
    expect(format("{restaurant|으로} 이동", { restaurant: "본가" })).toBe("본가로 이동");
    expect(format("{restaurant|으로} 이동", { restaurant: "명동교자" })).toBe("명동교자로 이동");
    expect(format("{restaurant|으로} 이동", { restaurant: "한일관" })).toBe("한일관으로 이동");
  });

  it("값이 없는 변수는 그대로 남겨서 누락을 눈에 띄게 한다", () => {
    expect(format("{dish} 인증", {})).toBe("{dish} 인증");
    expect(format("{dish} 인증")).toBe("{dish} 인증");
  });

  it("0도 값으로 치환한다", () => {
    expect(format("+{xp} XP", { xp: 0 })).toBe("+0 XP");
  });
});

describe("translate", () => {
  it("영어는 count에 따라 단수/복수형을 고른다", () => {
    expect(translate("en", "time.hoursAgo", { count: 1 })).toBe("1 hour ago");
    expect(translate("en", "time.hoursAgo", { count: 3 })).toBe("3 hours ago");
  });

  it("언어별로 같은 키를 번역한다", () => {
    expect(translate("ko", "complete.subtitle", { dish: "비빔밥" })).toBe("비빔밥 인증 성공");
    expect(translate("en", "complete.subtitle", { dish: "Bibimbap" })).toBe("Bibimbap verified");
    expect(translate("ja", "verify.cta")).toBe("認証する");
    expect(translate("zh", "common.next")).toBe("下一步");
  });
});
