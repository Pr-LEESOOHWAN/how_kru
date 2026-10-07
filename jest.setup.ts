// 모든 테스트 공통 설정.
//
// 언어/테마 설정을 AsyncStorage에 저장하는 모듈(LanguageContext 등)이 i18n 진입점에서 함께
// 불려 오므로, 네이티브 모듈이 없는 Jest 환경에선 공식 메모리 목(mock)으로 바꿔 둔다.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
