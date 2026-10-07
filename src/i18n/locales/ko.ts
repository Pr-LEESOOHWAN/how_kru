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

  // 하단 탭
  "tabs.home": "홈",
  "tabs.explore": "탐색",
  "tabs.levels": "레벨",
  "tabs.scan": "스캔",

  // 요리 카드
  "dish.startMission": "미션 시작",
  "dish.cardHint": "미션 시작 화면을 엽니다",
  "dish.detailHint": "요리 정보를 엽니다",

  // 홈
  "home.greeting": "{name}님, 다시 오셨네요",
  "home.settingsA11y": "환경설정 열기",
  "home.levelLabel": "현재 레벨",
  "home.levelProgress": "이번 레벨 {progress}/{required}",
  "home.badges": "배지 {count}개",
  "home.levelCardHint": "레벨별 요리 전체를 봅니다",
  "home.progressA11y": "레벨 진행률 {pct}퍼센트",
  "home.todayTitle": "오늘의 도전",
  "home.todaySub": "매일 바뀌는 추천 요리",
  "home.loadError": "오늘의 도전을 불러오지 못했어요",
  "home.loadErrorHint": "인터넷 연결을 확인하고 다시 시도해 주세요.",
  "home.empty": "이 레벨의 요리를 찾지 못했어요",

  // 미션 시작
  "mission.startTitle": "미션",
  "mission.guideTitle": "이렇게 진행돼요",
  "mission.step1": "근처 식당 고르기",
  "mission.step2": "길찾기로 찾아가기",
  "mission.step3": "간판과 요리 사진으로 인증하기",
  "mission.step4": "XP와 배지 받기",
  "mission.reward": "완료하면 +{xp} XP",
  "mission.alreadyDone": "이미 완료한 요리예요. XP는 다시 지급되지 않아요",
  "mission.viewReviews": "이 요리 리뷰 보기",
  "mission.startCta": "미션 시작하기",

  // 탐색
  "explore.title": "메뉴 탐색",
  "explore.count": "요리 {count}개",
  "explore.searchPlaceholder": "요리 이름으로 찾기",
  "explore.clearSearch": "검색어 지우기",
  "explore.all": "전체",
  "explore.filterA11y": "{name} 요리만 보기",
  "explore.loadError": "메뉴를 불러오지 못했어요",
  "explore.empty": "표시할 메뉴가 없어요",
  "explore.noResults": "'{query}'에 맞는 요리가 없어요",
  "explore.noResultsHint": "다른 이름이나 한글/영문으로 검색해 보세요.",

  // 요리 상세
  "dish.spice": "맵기",
  "dish.category": "분류",
  "dish.tags": "특징",
  "dish.howToEnjoy": "이렇게 즐겨보세요",
  "dish.reviews": "리뷰 보기",
  "dish.retryMission": "다시 도전하기",

  // 레벨별 요리
  "levels.title": "레벨별 요리",
  "levels.mine": "내 레벨",
  "levels.progress": "{done}/{total} 완료",
  "levels.cleared": "통과한 레벨",
  "levels.loadError": "레벨 정보를 불러오지 못했어요",
} as const;
