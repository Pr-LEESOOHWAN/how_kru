// 요리 카드 -> 미션 시작 화면으로 넘기는 라우트 파라미터.
//
// 예전엔 홈/탐색/레벨 세 화면이 각자 이 객체를 만들었고, 설명 문구(desc)를
// "카테고리 · Lv.n" 한국어 문자열로 미리 조립해서 넘겼다(화면마다 미묘하게 달랐다).
// 이제 원재료(category, level)만 넘기고 표시는 미션 시작 화면이 언어에 맞게 한다.

type DishForMission = {
  id: string;
  name_kr: string;
  name_en: string;
  category?: string;
  level?: number;
  spice_level?: number;
};

export function missionStartParams(
  dish: DishForMission,
  opts: { thumb?: string | null; completed?: boolean } = {}
): Record<string, string> {
  return {
    dishId: dish.id,
    // name_kr은 식당 검색어로도 쓰인다(한국 지도 검색은 한글이 정확함) - 화면 표시용 아님.
    name_kr: dish.name_kr,
    name_en: dish.name_en,
    ...(dish.category ? { category: dish.category } : {}),
    ...(dish.level ? { level: String(dish.level) } : {}),
    spice: String(dish.spice_level ?? 0),
    ...(opts.thumb ? { image: opts.thumb } : {}),
    // 이미 완료한 요리면 미션 시작 화면에서 "+50 XP" 대신 중복 지급 안내를 보여준다.
    ...(opts.completed ? { completed: "1" } : {}),
  };
}
