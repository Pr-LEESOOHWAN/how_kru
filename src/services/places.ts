// Google Places API (New) - Text Search 를 이용해 특정 키워드(예: "비빔밥")로
// 내 위치 반경 1km 이내의 식당을 검색하는 서비스.
//
// 필요한 것:
//   1) Google Cloud 프로젝트에서 "Places API (New)" 활성화 + API 키 발급
//      (APIs & Services > 라이브러리 > "Places API (New)" 검색 > 사용 설정)
//   2) 프로젝트 루트에 .env 파일을 만들고 아래처럼 키를 넣기
//        EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=여기에_발급받은_키
//   3) expo-location 설치: npx expo install expo-location

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.currentOpeningHours.openNow",
].join(",");

export type NearbyRestaurant = {
  id: string; // place id
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceM: number;
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
};

// Haversine 공식으로 두 좌표 사이의 직선거리(m) 계산
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

export function formatWalkTime(m: number): string {
  const minutes = Math.max(1, Math.round(m / 67)); // 평균 도보 속도 약 4km/h 가정
  return `도보 ${minutes}분`;
}

export class PlacesApiError extends Error {}

/**
 * keyword(예: "비빔밥") 기준으로 내 위치 반경 radiusM 이내 식당을 검색.
 * 가까운 순으로 정렬해서 반환합니다.
 */
export async function searchNearbyRestaurants(
  keyword: string,
  lat: number,
  lng: number,
  radiusM: number = 1000
): Promise<NearbyRestaurant[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new PlacesApiError(
      "Google Places API 키가 설정되지 않았어요. .env 파일에 EXPO_PUBLIC_GOOGLE_PLACES_API_KEY를 추가해주세요."
    );
  }

  const res = await fetch(TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${keyword} 식당`,
      languageCode: "ko",
      maxResultCount: 20,
      // Text Search(New)는 locationRestriction에 circle을 지원하지 않아서
      // locationBias(원형)로 검색 후, 아래에서 radiusM 기준으로 직접 한 번 더 걸러냅니다.
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusM,
        },
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new PlacesApiError(
      `Places API 오류 (${data.error?.status ?? res.status}): ${data.error?.message ?? "알 수 없는 오류"}`
    );
  }

  const places = data.places ?? [];
  const results: NearbyRestaurant[] = places.map((p: any) => {
    const rLat = p.location?.latitude;
    const rLng = p.location?.longitude;
    return {
      id: p.id,
      name: p.displayName?.text ?? "이름 없음",
      address: p.formattedAddress ?? "",
      lat: rLat,
      lng: rLng,
      distanceM: distanceMeters(lat, lng, rLat, rLng),
      rating: p.rating,
      userRatingsTotal: p.userRatingCount,
      openNow: p.currentOpeningHours?.openNow,
    };
  });

  // locationBias는 "선호"일 뿐 강제 반경이 아니므로, 1km 밖 결과는 직접 제외합니다.
  const withinRadius = results.filter((r) => r.distanceM <= radiusM);
  withinRadius.sort((a, b) => a.distanceM - b.distanceM);
  return withinRadius;
}
