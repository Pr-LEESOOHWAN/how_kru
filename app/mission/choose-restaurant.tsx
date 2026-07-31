import {
  formatDistance,
  formatWalkTime,
  NearbyRestaurant,
  searchNearbyRestaurants,
} from "@/src/services/places";
import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DEFAULT_RADIUS_M = 1000;
const MIN_RADIUS_M = 300;
const MAX_RADIUS_M = 3000;
const RADIUS_STEP_M = 100;
const PAGE_SIZE = 5;

type LoadState = "loading" | "ok" | "empty" | "error";
type SortBy = "distance" | "rating";

export default function ChooseRestaurantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    desc: string;
    spice: string;
  }>();

  const [state, setState] = useState<LoadState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [openOnly, setOpenOnly] = useState(false);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  const runSearch = async (lat: number, lng: number, radius: number) => {
    setState("loading");
    try {
      const results = await searchNearbyRestaurants(params.name_kr, lat, lng, radius);
      setRestaurants(results);
      setState(results.length === 0 ? "empty" : "ok");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "식당을 불러오는 중 오류가 발생했어요.");
      setState("error");
    }
  };

  // 최초 진입: 위치 권한 + 내 위치 확보 후 기본 반경으로 검색
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) {
            setErrorMsg("위치 권한이 없으면 근처 식당을 찾을 수 없어요. 설정에서 위치 권한을 허용해주세요.");
            setState("error");
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        await runSearch(pos.coords.latitude, pos.coords.longitude, radiusM);
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.message ?? "식당을 불러오는 중 오류가 발생했어요.");
          setState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.name_kr]);

  // 슬라이더로 반경을 바꾸면(손 뗄 때) 같은 위치 기준으로 재검색
  const handleRadiusCommit = (value: number) => {
    const rounded = Math.round(value / RADIUS_STEP_M) * RADIUS_STEP_M;
    setRadiusM(rounded);
    if (myLoc) {
      runSearch(myLoc.lat, myLoc.lng, rounded);
    }
  };

  // 필터/정렬/반경이 바뀌면 "더보기" 단계는 처음부터 다시 보여준다.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [restaurants, sortBy, openOnly]);

  const sortedRestaurants = useMemo(() => {
    let list = restaurants;
    if (openOnly) {
      // openNow가 명확히 false인 곳(영업종료)만 제외하고, 정보가 없는 곳은 남겨둔다.
      list = list.filter((r) => r.openNow !== false);
    }
    const sorted = [...list];
    if (sortBy === "rating") {
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else {
      sorted.sort((a, b) => a.distanceM - b.distanceM);
    }
    return sorted;
  }, [restaurants, sortBy, openOnly]);

  const visibleRestaurants = sortedRestaurants.slice(0, visibleCount);
  const hasMore = visibleCount < sortedRestaurants.length;

  const handleSelect = (r: NearbyRestaurant) => {
    router.push({
      pathname: "/mission/navigate",
      params: {
        ...params,
        restaurantName: r.name,
        address: r.address,
        distance: formatDistance(r.distanceM),
        walk: formatWalkTime(r.distanceM),
        lat: String(r.lat),
        lng: String(r.lng),
        placeId: r.id,
      },
    });
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>식당 선택</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.introBox}>
        <Text style={s.introTitle}>{params.name_kr} 인근 식당</Text>
        <Text style={s.introSub}>내 위치 반경 {formatDistance(radiusM)} 이내, 가까운 곳부터 정렬했어요</Text>
      </View>

      <View style={s.radiusRow}>
        <Text style={s.radiusLabel}>반경 조절</Text>
        <Slider
          style={s.radiusSlider}
          minimumValue={MIN_RADIUS_M}
          maximumValue={MAX_RADIUS_M}
          step={RADIUS_STEP_M}
          value={radiusM}
          minimumTrackTintColor="#FF5722"
          maximumTrackTintColor="#eee"
          thumbTintColor="#FF5722"
          onSlidingComplete={handleRadiusCommit}
        />
        <Text style={s.radiusValue}>{formatDistance(radiusM)}</Text>
      </View>

      {state === "ok" && (
        <View style={s.controlsRow}>
          <View style={s.sortGroup}>
            <TouchableOpacity
              style={[s.sortBtn, sortBy === "distance" && s.sortBtnActive]}
              onPress={() => setSortBy("distance")}
            >
              <Text style={[s.sortBtnText, sortBy === "distance" && s.sortBtnTextActive]}>거리순</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.sortBtn, sortBy === "rating" && s.sortBtnActive]}
              onPress={() => setSortBy("rating")}
            >
              <Text style={[s.sortBtnText, sortBy === "rating" && s.sortBtnTextActive]}>별점순</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.openOnlyChip, openOnly && s.openOnlyChipActive]}
            onPress={() => setOpenOnly((v) => !v)}
          >
            <Text style={[s.openOnlyChipText, openOnly && s.openOnlyChipTextActive]}>
              {openOnly ? "✓ " : ""}영업중만 보기
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {state === "loading" && (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={s.centerText}>주변 식당을 찾는 중...</Text>
        </View>
      )}

      {state === "error" && (
        <View style={s.centerBox}>
          <Text style={{ fontSize: 32 }}>⚠️</Text>
          <Text style={[s.centerText, { paddingHorizontal: 30, textAlign: "center" }]}>{errorMsg}</Text>
        </View>
      )}

      {state === "empty" && (
        <View style={s.centerBox}>
          <Text style={{ fontSize: 32 }}>🔍</Text>
          <Text style={s.centerText}>{formatDistance(radiusM)} 이내에 '{params.name_kr}' 관련 식당이 없어요.</Text>
        </View>
      )}

      {state === "ok" && visibleRestaurants.length === 0 && (
        <View style={s.centerBox}>
          <Text style={{ fontSize: 32 }}>😴</Text>
          <Text style={s.centerText}>지금 영업 중인 식당이 없어요.</Text>
        </View>
      )}

      {state === "ok" && visibleRestaurants.length > 0 && (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {visibleRestaurants.map((r) => (
            <TouchableOpacity key={r.id} style={s.card} activeOpacity={0.7} onPress={() => handleSelect(r)}>
              <View style={s.cardIcon}>
                <Text style={{ fontSize: 22 }}>🏪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={1}>{r.name}</Text>
                <Text style={s.cardAddress} numberOfLines={1}>{r.address}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={s.cardMeta}>{formatWalkTime(r.distanceM)} · {formatDistance(r.distanceM)}</Text>
                  {typeof r.rating === "number" && (
                    <Text style={s.cardRating}>⭐ {r.rating.toFixed(1)}</Text>
                  )}
                  {r.openNow === false && <Text style={s.cardClosed}>영업종료</Text>}
                </View>
              </View>
              <Text style={s.cardArrow}>›</Text>
            </TouchableOpacity>
          ))}

          {hasMore && (
            <TouchableOpacity
              style={s.moreBtn}
              onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
            >
              <Text style={s.moreBtnText}>
                더보기 ({sortedRestaurants.length - visibleCount}개 더 있어요)
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 54, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 28, color: "#222" },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#222" },
  introBox: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 },
  introTitle: { fontSize: 17, fontWeight: "bold", color: "#222" },
  introSub: { fontSize: 13, color: "#888", marginTop: 4 },
  radiusRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4, gap: 8,
  },
  radiusLabel: { fontSize: 12, color: "#999", fontWeight: "600" },
  radiusSlider: { flex: 1, height: 32 },
  radiusValue: { fontSize: 12, color: "#FF5722", fontWeight: "bold", width: 44, textAlign: "right" },
  controlsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 10,
  },
  sortGroup: {
    flexDirection: "row", backgroundColor: "#eee", borderRadius: 20, padding: 3, gap: 2,
  },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18 },
  sortBtnActive: { backgroundColor: "#FF5722" },
  sortBtnText: { fontSize: 12, color: "#666", fontWeight: "600" },
  sortBtnTextActive: { color: "#fff" },
  openOnlyChip: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  openOnlyChipActive: { borderColor: "#FF5722", backgroundColor: "#FFF0EC" },
  openOnlyChipText: { fontSize: 12, color: "#666", fontWeight: "600" },
  openOnlyChipTextActive: { color: "#FF5722" },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  centerText: { color: "#888", fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30, gap: 12 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14,
    padding: 14, borderWidth: 0.5, borderColor: "#eee", gap: 12,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: "#FFF0EC",
    alignItems: "center", justifyContent: "center",
  },
  cardName: { fontSize: 15, fontWeight: "bold", color: "#222" },
  cardAddress: { fontSize: 12, color: "#999", marginTop: 2 },
  cardMeta: { fontSize: 12, color: "#FF5722", fontWeight: "600" },
  cardRating: { fontSize: 12, color: "#B8860B", fontWeight: "600" },
  cardClosed: { fontSize: 11, color: "#c0392b", fontWeight: "700" },
  cardArrow: { fontSize: 20, color: "#ccc" },
  moreBtn: {
    borderWidth: 1.5, borderColor: "#FF5722", borderStyle: "dashed", borderRadius: 14,
    paddingVertical: 13, alignItems: "center", marginTop: 2,
  },
  moreBtnText: { color: "#FF5722", fontSize: 13, fontWeight: "bold" },
});
