import { Redirect } from "expo-router";

// 이 탭은 실제로 렌더링될 일이 거의 없습니다. _layout.tsx의 tabPress 리스너가
// 탭을 누르는 즉시 가로채서 진짜 레벨 화면(app/levels.tsx, 뒤로가기 있는
// 스택 화면)으로 이동시키기 때문입니다. 혹시라도 이 화면이 직접 열리는
// 경우(딥링크 등)를 대비한 안전장치로 리다이렉트만 해둡니다.
export default function LevelsTabPlaceholder() {
  // 이 파일의 라우트 이름을 "levels"로 두면 최상위 app/levels.tsx와 URL이
  // "/levels"로 충돌해서(라우트 그룹은 URL에 영향을 주지 않음) 이 화면이
  // 자기 자신으로 리다이렉트하는 무한 루프에 빠진다. 그래서 파일명을
  // levels-tab.tsx로 분리해 이 탭 전용 경로("/levels-tab")를 따로 갖게 했다.
  return <Redirect href="/levels" />;
}
