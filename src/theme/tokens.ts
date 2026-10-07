// HOW KRU 디자인 토큰.
//
// 2026-10 디자인 시스템 도입 전 감사 결과: 서로 다른 색 45개(회색만 17단계, 브랜드 틴트 7종),
// 폰트 크기 23종, 라운드 22종, 여백 25종이 화면마다 하드코딩돼 있었고 로그인/회원가입만
// 브랜드와 다른 빨강(#E63946)을 쓰고 있었다. 화면 코드는 이제 raw 값 대신 아래 의미 기반
// 토큰(colors.surface, type.title2, space.lg ...)만 쓴다.
//
// 대비 기준(WCAG AA): 일반 텍스트 4.5:1, 굵은 14pt 이상/18pt 이상 텍스트 3:1.
// - 브랜드 채움(primary) 위의 흰 글씨는 3:1대라 "굵은 14pt 이상" 라벨(버튼)에만 쓴다.
//   작은 글씨가 브랜드색이어야 하면 primaryTint 배경 + primaryText 글씨 조합을 쓴다(5:1 이상).
// - textTertiary는 흰 카드와 캔버스 배경 양쪽에서 4.5:1을 넘기도록 잡았다.

/** 브랜드 램프 - 고추(gochu) 주황빨강. 기존 #FF5722를 살짝 깊게 눌러 형광기를 뺐다. */
export const gochu = {
  50: "#FFF3EE",
  100: "#FFE4D9",
  200: "#FFC6B0",
  300: "#FF9F80",
  400: "#FA7650",
  500: "#F2542D",
  600: "#D9431F",
  700: "#B33518",
  800: "#872915",
  900: "#5A1C0F",
} as const;

export type ColorTokens = {
  /** 화면 바탕(캔버스) */
  bg: string;
  /** 카드, 시트, 헤더 등 떠 있는 면 */
  surface: string;
  /** 입력창, 비활성 칩 등 살짝 들어간 면 */
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;

  primary: string;
  primaryPressed: string;
  /** 선택 상태/브랜드 칩 배경 */
  primaryTint: string;
  /** 브랜드색 글씨(작은 글씨도 AA 통과) */
  primaryText: string;
  onPrimary: string;

  success: string;
  successTint: string;
  warning: string;
  warningTint: string;
  danger: string;
  dangerTint: string;
  info: string;
  infoTint: string;

  /** 모달 뒤 어둡게 깔리는 막 */
  scrim: string;
  /** 사진 위에 얹는 배지 배경 */
  onImage: string;
  /** 스켈레톤 로더 */
  skeleton: string;
};

export const lightColors: ColorTokens = {
  bg: "#F6F5F4",
  surface: "#FFFFFF",
  surfaceAlt: "#EFEDEB",
  border: "#E3E1DE",
  borderStrong: "#CFCCC8",

  text: "#1F1D1B",
  textSecondary: "#4F4B46",
  textTertiary: "#6F6B65",
  textDisabled: "#A9A5A0",

  primary: gochu[500],
  primaryPressed: gochu[600],
  primaryTint: "#FFEDE6",
  primaryText: gochu[700],
  onPrimary: "#FFFFFF",

  success: "#23824D",
  successTint: "#E6F4EC",
  warning: "#9A6700",
  warningTint: "#FFF4DB",
  danger: "#C9302C",
  dangerTint: "#FDECEB",
  info: "#2F6DB5",
  infoTint: "#E8F0FB",

  scrim: "rgba(23,22,21,0.45)",
  onImage: "rgba(23,22,21,0.58)",
  skeleton: "#E8E6E3",
};

export const darkColors: ColorTokens = {
  bg: "#141312",
  surface: "#1D1C1A",
  surfaceAlt: "#272523",
  border: "#34322F",
  borderStrong: "#46433F",

  text: "#F3F1EE",
  textSecondary: "#C2BEB8",
  textTertiary: "#9B968F",
  textDisabled: "#6A6661",

  // 어두운 배경에서 브랜드가 탁해 보이지 않게 한 톤 밝히되, 흰 버튼 라벨 3:1은 유지.
  primary: "#F25C35",
  primaryPressed: "#DB4A24",
  primaryTint: "#3B2620",
  primaryText: "#FF9474",
  onPrimary: "#FFFFFF",

  success: "#5CC98A",
  successTint: "#1E3328",
  warning: "#E6B341",
  warningTint: "#3A2F17",
  danger: "#FF7B72",
  dangerTint: "#3D1F1D",
  info: "#7AAEEB",
  infoTint: "#1C2A3B",

  scrim: "rgba(0,0,0,0.6)",
  onImage: "rgba(0,0,0,0.62)",
  skeleton: "#2A2826",
};

/**
 * 타입 스케일. 시스템 폰트를 쓴다 - 한/영/일/중을 모두 지원해야 해서 CJK 글리프를
 * 통째로 번들하는 커스텀 폰트는 용량 대비 이득이 없다(iOS: SF + Apple SD Gothic Neo /
 * Hiragino / PingFang, Android: Roboto + Noto CJK가 각 언어를 자연스럽게 받친다).
 */
export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.4 },
  title1: { fontSize: 24, lineHeight: 30, fontWeight: "700", letterSpacing: -0.3 },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.2 },
  title3: { fontSize: 17, lineHeight: 22, fontWeight: "600" },
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
  callout: { fontSize: 14, lineHeight: 20, fontWeight: "400" },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: "700", letterSpacing: 0.2 },
} as const;

export type TypeVariant = keyof typeof type;

/** 4pt 그리드 */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/**
 * 라운드 규칙(한 가지 체계로 고정):
 * - sm 8: 작은 썸네일, 배지 안쪽 요소
 * - md 12: 입력창, 카드 안의 작은 타일
 * - lg 16: 카드, 버튼
 * - xl 24: 바텀시트/모달 윗모서리
 * - pill: 칩, 태그, 아바타
 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * 모션 - Emil Kowalski 원칙: 누름 피드백은 짧게, UI 전환은 300ms 이하, ease-in 금지,
 * 기본 제공 easing 대신 강한 커스텀 커브.
 */
export const motion = {
  duration: { press: 120, fast: 180, base: 240, slow: 320 },
  easing: {
    /** 등장/반응 - 시작이 빠르다 */
    out: [0.23, 1, 0.32, 1] as const,
    /** 화면 안에서 움직이는 요소 */
    inOut: [0.77, 0, 0.175, 1] as const,
    /** 바텀시트(iOS 느낌) */
    drawer: [0.32, 0.72, 0, 1] as const,
  },
  /** 누를 때 줄어드는 비율 */
  pressScale: 0.97,
  /** 리스트 순차 등장 간격 */
  stagger: 40,
} as const;

/** 최소 터치 영역(HIG 44pt) */
export const hitTarget = 44;

const lightElevation = {
  none: undefined,
  card: "0px 1px 2px rgba(31,29,27,0.05), 0px 6px 16px -10px rgba(31,29,27,0.18)",
  raised: "0px 2px 6px rgba(31,29,27,0.06), 0px 18px 36px -18px rgba(31,29,27,0.28)",
} as const;

// 어두운 화면에선 그림자가 거의 안 보이므로 면 색 차이(surface vs bg)와 테두리가 위계를 맡는다.
const darkElevation = {
  none: undefined,
  card: "0px 1px 2px rgba(0,0,0,0.4)",
  raised: "0px 18px 40px -16px rgba(0,0,0,0.7)",
} as const;

export type Elevation = keyof typeof lightElevation;

export type Theme = {
  scheme: "light" | "dark";
  colors: ColorTokens;
  type: typeof type;
  space: typeof space;
  radius: typeof radius;
  motion: typeof motion;
  elevation: Record<Elevation, string | undefined>;
};

// 테마 객체는 두 개뿐이고 정체성(identity)이 고정돼 있어서, 테마 기반 스타일을 WeakMap에
// 캐시할 수 있다(src/theme/ThemeContext.tsx의 makeStyles 참고).
export const lightTheme: Theme = {
  scheme: "light",
  colors: lightColors,
  type,
  space,
  radius,
  motion,
  elevation: lightElevation,
};

export const darkTheme: Theme = {
  scheme: "dark",
  colors: darkColors,
  type,
  space,
  radius,
  motion,
  elevation: darkElevation,
};
