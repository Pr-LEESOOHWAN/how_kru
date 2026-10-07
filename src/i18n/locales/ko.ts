// 한국어 사전 - 모든 번역 키의 기준(source of truth).
// 여기 키를 추가하면 en/ja/zh 사전에도 같은 키가 없을 때 타입 체크가 실패한다
// (번역 누락을 런타임이 아니라 컴파일 단계에서 잡기 위해).
//
// 변수: "{name}", 조사 자동 선택: "{name|으로}" (src/i18n/format.ts)

export const ko = {
  // 공통
  "common.retry": "다시 시도",
  "common.back": "뒤로",
  "common.cancel": "취소",
  "common.ok": "확인",
  "common.close": "닫기",
  "common.later": "나중에",
  "common.completed": "완료",
  "common.loadFailed": "불러오지 못했어요.",
  "common.levelShort": "Lv.{level}",
  "common.dishNo": "No.{no}",
  "common.spiceA11y": "맵기 5단계 중 {level}",
  "common.notSpicy": "안 매워요",
  "common.anonymous": "익명",
  "common.friend": "친구",

  // 언어 이름 (보조 표기용 - 메인 표기는 각 언어 자기 이름)
  "lang.ko": "한국어",
  "lang.en": "영어",
  "lang.ja": "일본어",
  "lang.zh": "중국어",
  "lang.pickerA11y": "언어 바꾸기",

  // 로그인 / 회원가입
  "auth.subtitleLogin": "한식, 직접 먹어보며 레벨업",
  "auth.subtitleSignup": "계정을 만들고 첫 미션을 시작하세요",
  "auth.name": "이름",
  "auth.namePlaceholder": "앱에서 보일 이름",
  "auth.email": "이메일",
  "auth.password": "비밀번호",
  "auth.passwordNewPlaceholder": "6자 이상",
  "auth.passwordConfirm": "비밀번호 확인",
  "auth.showPassword": "비밀번호 보기",
  "auth.hidePassword": "비밀번호 숨기기",
  "auth.keepLoggedIn": "로그인 상태 유지",
  "auth.loginCta": "도전 시작하기",
  "auth.signupCta": "가입하고 시작하기",
  "auth.noAccount": "처음이세요?",
  "auth.goSignup": "회원가입",
  "auth.haveAccount": "이미 계정이 있나요?",
  "auth.goLogin": "로그인",
  "auth.error.missingLogin": "이메일과 비밀번호를 입력해주세요.",
  "auth.error.missingFields": "모든 항목을 입력해주세요.",
  "auth.error.passwordMismatch": "비밀번호가 일치하지 않아요.",
  "auth.error.invalidEmail": "이메일 형식이 올바르지 않아요.",
  "auth.error.emailInUse": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth.error.weakPassword": "비밀번호는 6자 이상이어야 해요.",
  "auth.error.wrongCredentials": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth.error.tooMany": "시도가 너무 많아요. 잠시 후 다시 시도해주세요.",
  "auth.error.network": "인터넷 연결을 확인해주세요.",
  "auth.error.unknown": "문제가 생겼어요. 다시 시도해주세요.",

  // 환경설정
  "settings.title": "환경설정",
  "settings.language": "언어",
  "settings.languageDesc": "앱에서 사용할 언어를 선택하세요.",
  "settings.appearance": "화면 모드",
  "settings.appearanceDesc": "기기 설정을 따르거나 직접 고를 수 있어요.",
  "settings.themeSystem": "기기 설정 따르기",
  "settings.themeLight": "라이트",
  "settings.themeDark": "다크",
  "settings.account": "계정",
  "settings.logout": "로그아웃",
  "settings.logoutConfirm": "로그아웃할까요?",
} as const;
