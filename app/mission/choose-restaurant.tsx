import Slider from "@react-native-community/slider";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Linking, ScrollView, View } from "react-native";

import { getRestaurantThumbnail } from "@/src/firebase/dishService";
import { useI18n, type MessageKey } from "@/src/i18n";
import { dishName } from "@/src/i18n/content";
import { formatDistance, NearbyRestaurant, PlacesApiError, searchNearbyRestaurants, walkMinutes } from "@/src/services/places";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Button, Card, Icons, PressableScale, Screen, ScreenHeader, Skeleton, StateView, Text } from "@/src/ui";

const DEFAULT_RADIUS_M = 1000;
const MIN_RADIUS_M = 300;
const MAX_RADIUS_M = 3000;
const RADIUS_STEP_M = 100;
const PAGE_SIZE = 5;

type LoadState = "loading" | "ok" | "empty" | "error";
type SortBy = "distance" | "rating";

export default function ChooseRestaurantScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const params = useLocalSearchParams<{ dishId: string; name_kr: string; name_en: string }>();
  const dishLabel = dishName({ id: params.dishId, name_kr: params.name_kr, name_en: params.name_en }, language);

  const [state, setState] = useState<LoadState>("loading");
  // 오류는 번역 키로 들고 있는다(예전엔 "Places API 오류 (403)..." 같은 개발자용 문장이 그대로 떴다).
  const [errorKey, setErrorKey] = useState<MessageKey>("places.error.search");
  // 위치 권한 "거부"로 생긴 오류일 때만 설정 앱으로 바로 가는 버튼을 보여준다.
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("distance");
  const [openOnly, setOpenOnly] = useState(false);
  const [radiusM, setRadiusM] = useState(DEFAULT_RADIUS_M);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  // place_id -> 그 식당에서 찍힌 리뷰 사진 중 가장 최근 것(Places 사진 API 미연동이라 대신 보완).
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 검색 요청 순번. 반경을 연달아 바꾸면 검색이 동시에 여러 개 날아가는데, 먼저 보낸(좁은 반경)
  // 응답이 늦게 도착해 최신 결과를 덮어쓰는 걸 막기 위해 최신 요청의 응답만 반영한다.
  const searchSeqRef = useRef(0);

  const runSearch = async (lat: number, lng: number, radius: number) => {
    const seq = ++searchSeqRef.current;
    const isStale = () => seq !== searchSeqRef.current || !mountedRef.current;
    setState("loading");
    try {
      // 검색어는 한글 요리명 - 한국 지도 검색은 한글이 정확하고, 인증 단계에서 간판 글자와
      // 대조하는 상호명도 한글이어야 한다(그래서 표시 언어와 무관하게 한국어로 검색).
      const results = await searchNearbyRestaurants(params.name_kr, lat, lng, radius);
      if (isStale()) return;
      setRestaurants(results);
      setVisibleCount(PAGE_SIZE);
      setState(results.length === 0 ? "empty" : "ok");
    } catch (err) {
      if (isStale()) return;
      console.error("[choose-restaurant] 검색 오류:", err);
      setErrorKey(err instanceof PlacesApiError && err.kind === "not_configured" ? "places.error.notConfigured" : "places.error.search");
      setState("error");
    }
  };

  // 위치 권한 + 내 위치 확보 후 주어진 반경으로 검색 (최초 진입/재시도 공용)
  const acquireLocationAndSearch = async (radius: number, cancelledRef?: { current: boolean }) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelledRef?.current) {
          setPermissionDenied(true);
          setErrorKey("places.error.permission");
          setState("error");
        }
        return;
      }
      setPermissionDenied(false);
      // 실내/지하에서 위치 조회가 끝없이 대기하는 경우가 있어 10초가 지나면 마지막으로 알려진
      // 위치(캐시)로 대신 진행한다. 그것도 없으면 오류 화면 -> 다시 시도.
      let pos: Location.LocationObject | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("location timeout")), 10000);
          }),
        ]);
      } catch {
        pos = await Location.getLastKnownPositionAsync();
      } finally {
        if (timer) clearTimeout(timer);
      }
      if (cancelledRef?.current) return;
      if (!pos) {
        setErrorKey("places.error.location");
        setState("error");
        return;
      }
      setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      await runSearch(pos.coords.latitude, pos.coords.longitude, radius);
    } catch (err) {
      if (!cancelledRef?.current) {
        console.error("[choose-restaurant] 위치/검색 오류:", err);
        setErrorKey("places.error.search");
        setState("error");
      }
    }
  };

  useEffect(() => {
    const cancelledRef = { current: false };
    // 상태는 권한/위치 응답(await 이후)에서만 바뀐다 - 린터가 catch 블록을 보수적으로 잡는 경우라 여기서만 끈다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    acquireLocationAndSearch(radiusM, cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.name_kr]);

  // 슬라이더로 반경을 바꾸면(손 뗄 때) 같은 위치 기준으로 재검색
  const handleRadiusCommit = (value: number) => {
    const rounded = Math.round(value / RADIUS_STEP_M) * RADIUS_STEP_M;
    setRadiusM(rounded);
    if (myLoc) runSearch(myLoc.lat, myLoc.lng, rounded);
  };

  // 필터/정렬/검색 결과가 바뀌면 "더 보기" 단계는 처음부터 다시 보여준다
  // (예전엔 이펙트로 맞춰서 바뀐 목록이 한 번 그려진 뒤 다시 줄어드는 렌더가 한 번 더 있었다).
  const changeSort = (key: SortBy) => {
    setSortBy(key);
    setVisibleCount(PAGE_SIZE);
  };
  const changeOpenOnly = (value: boolean) => {
    setOpenOnly(value);
    setVisibleCount(PAGE_SIZE);
  };

  const sortedRestaurants = useMemo(() => {
    // openNow가 명확히 false인 곳(영업 종료)만 제외하고, 정보가 없는 곳은 남겨둔다.
    const list = openOnly ? restaurants.filter((r) => r.openNow !== false) : restaurants;
    const sorted = [...list];
    if (sortBy === "rating") sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else sorted.sort((a, b) => a.distanceM - b.distanceM);
    return sorted;
  }, [restaurants, sortBy, openOnly]);

  const visibleRestaurants = sortedRestaurants.slice(0, visibleCount);
  const hiddenCount = sortedRestaurants.length - visibleCount;

  // 검색 결과(최대 20개)마다 리뷰 사진 조회 - 새 검색이 있을 때만 바뀌는 restaurants에 건다
  // (sortedRestaurants는 매 렌더 새 배열이라 의존성으로 쓰면 무한 재조회).
  useEffect(() => {
    restaurants.forEach((r) => {
      getRestaurantThumbnail(r.id)
        .then((url) => {
          if (!url || !mountedRef.current) return;
          setThumbnails((prev) => (r.id in prev ? prev : { ...prev, [r.id]: url }));
        })
        .catch(() => {});
    });
  }, [restaurants]);

  const handleSelect = (r: NearbyRestaurant) => {
    router.push({
      pathname: "/mission/navigate",
      params: {
        ...params,
        restaurantName: r.name,
        address: r.address,
        distanceM: String(Math.round(r.distanceM)),
        lat: String(r.lat),
        lng: String(r.lng),
        placeId: r.id,
      },
    });
  };

  const widerRadius = Math.min(MAX_RADIUS_M, radiusM + 1000);

  return (
    <Screen>
      <ScreenHeader title={t("choose.title")} />

      <View style={s.intro}>
        <Text variant="title3" style={s.bold}>
          {t("choose.intro", { dish: dishLabel })}
        </Text>
        <Text variant="callout" color="textTertiary">
          {t(sortBy === "rating" ? "choose.subRating" : "choose.subDistance", { radius: formatDistance(radiusM) })}
        </Text>

        {myLoc ? (
          <View style={s.radiusRow}>
            <Text variant="caption" color="textSecondary" style={s.bold}>
              {t("choose.radius")}
            </Text>
            <Slider
              style={s.slider}
              minimumValue={MIN_RADIUS_M}
              maximumValue={MAX_RADIUS_M}
              step={RADIUS_STEP_M}
              value={radiusM}
              minimumTrackTintColor={theme.colors.primary}
              maximumTrackTintColor={theme.colors.border}
              thumbTintColor={theme.colors.primary}
              onSlidingComplete={handleRadiusCommit}
              accessibilityLabel={t("choose.radius")}
            />
            <Text variant="caption" color="primaryText" style={[s.bold, s.radiusValue]}>
              {formatDistance(radiusM)}
            </Text>
          </View>
        ) : null}

        {state === "ok" ? (
          <View style={s.controls}>
            <View style={s.segment} accessibilityRole="radiogroup">
              {(["distance", "rating"] as SortBy[]).map((key) => {
                const active = sortBy === key;
                return (
                  <PressableScale
                    key={key}
                    haptic="selection"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => changeSort(key)}
                    style={[s.segBtn, active && s.segBtnActive]}
                  >
                    <Text variant="caption" style={[s.bold, { color: active ? theme.colors.text : theme.colors.textTertiary }]}>
                      {key === "distance" ? t("choose.sortDistance") : t("choose.sortRating")}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
            <PressableScale
              haptic="selection"
              accessibilityRole="switch"
              accessibilityState={{ checked: openOnly }}
              onPress={() => changeOpenOnly(!openOnly)}
              style={[s.toggleChip, openOnly && s.toggleChipOn]}
            >
              {openOnly ? <Icons.Check size={14} color={theme.colors.primaryText} weight="bold" /> : <Icons.Clock size={14} color={theme.colors.textTertiary} />}
              <Text variant="caption" style={[s.bold, { color: openOnly ? theme.colors.primaryText : theme.colors.textSecondary }]}>
                {t("choose.openOnly")}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </View>

      {state === "loading" ? (
        <View style={s.list} accessibilityLabel={t("choose.searching")}>
          {[0, 1, 2].map((i) => (
            <Card key={i} style={s.row}>
              <Skeleton width={56} height={56} radius={theme.radius.md} />
              <View style={{ flex: 1, gap: theme.space.sm }}>
                <Skeleton width="55%" height={15} />
                <Skeleton width="80%" height={11} />
                <Skeleton width="35%" height={11} />
              </View>
            </Card>
          ))}
        </View>
      ) : state === "error" ? (
        <StateView
          icon={permissionDenied ? Icons.MapPin : Icons.WarningCircle}
          tone="danger"
          title={t(errorKey)}
          // 권한을 한 번 거부하면 OS 창이 다시 안 뜨는 기기가 많아서(특히 Android) 설정으로 보낸다.
          actionLabel={permissionDenied ? t("common.openSettings") : t("common.retry")}
          onAction={permissionDenied ? () => Linking.openSettings() : () => acquireLocationAndSearch(radiusM)}
        />
      ) : state === "empty" ? (
        <StateView
          icon={Icons.MagnifyingGlass}
          title={t("choose.empty", { radius: formatDistance(radiusM) })}
          message={radiusM < MAX_RADIUS_M ? undefined : t("choose.emptyMax")}
          // 슬라이더를 찾지 않아도 한 번에 반경을 넓혀 재검색할 수 있게 한다.
          actionLabel={radiusM < MAX_RADIUS_M ? t("choose.widen", { radius: formatDistance(widerRadius) }) : undefined}
          onAction={radiusM < MAX_RADIUS_M ? () => handleRadiusCommit(widerRadius) : undefined}
        />
      ) : visibleRestaurants.length === 0 ? (
        // "영업 중만" 필터 때문에만 비어 보이는 경우 - 필터 칩이 위쪽에 작게 있어 원인을 모를 수
        // 있으니 여기서 바로 끌 수 있게 한다.
        <StateView
          icon={Icons.Clock}
          title={t("choose.allClosed")}
          message={t("choose.allClosedHint", { count: restaurants.length })}
          actionLabel={t("choose.showClosed")}
          onAction={() => changeOpenOnly(false)}
        />
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {visibleRestaurants.map((r) => {
            const walk = t("choose.walk", { min: walkMinutes(r.distanceM) });
            const closed = r.openNow === false;
            return (
              <Card
                key={r.id}
                onPress={() => handleSelect(r)}
                accessibilityLabel={[
                  r.name,
                  walk,
                  formatDistance(r.distanceM),
                  typeof r.rating === "number" ? t("choose.ratingA11y", { rating: r.rating.toFixed(1) }) : "",
                  closed ? t("choose.closed") : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
                accessibilityHint={t("choose.cardHint")}
                style={s.row}
              >
                <View style={s.thumb}>
                  {thumbnails[r.id] ? (
                    <Image source={{ uri: thumbnails[r.id] }} style={s.thumbImg} contentFit="cover" transition={150} />
                  ) : (
                    <Icons.Storefront size={26} color={theme.colors.primary} weight="duotone" />
                  )}
                </View>
                <View style={s.rowText}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="caption" color="textTertiary" numberOfLines={1}>
                    {r.address}
                  </Text>
                  <View style={s.metaRow}>
                    <Icons.PersonSimpleWalk size={14} color={theme.colors.primaryText} weight="bold" />
                    <Text variant="caption" color="primaryText" style={[s.bold, s.tabular]}>
                      {walk} · {formatDistance(r.distanceM)}
                    </Text>
                    {typeof r.rating === "number" ? (
                      <View style={s.rating}>
                        <Icons.Star size={13} color={theme.colors.warning} weight="fill" />
                        <Text variant="caption" style={[s.bold, s.tabular, { color: theme.colors.warning }]}>
                          {r.rating.toFixed(1)}
                        </Text>
                      </View>
                    ) : null}
                    {closed ? (
                      <Text variant="caption" color="danger" style={s.bold}>
                        {t("choose.closed")}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Icons.CaretRight size={18} color={theme.colors.textTertiary} />
              </Card>
            );
          })}

          {hiddenCount > 0 ? (
            <Button
              title={t("choose.more", { count: hiddenCount })}
              variant="secondary"
              onPress={() => setVisibleCount((v) => v + PAGE_SIZE)}
              fullWidth
            />
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  bold: { fontWeight: "700" },
  tabular: { fontVariant: ["tabular-nums"] },
  intro: { paddingHorizontal: t.space.xl, paddingTop: t.space.lg, gap: t.space.xs },
  radiusRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm, marginTop: t.space.sm },
  slider: { flex: 1, height: 36 },
  radiusValue: { width: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: t.space.sm,
    marginBottom: t.space.xs,
  },
  segment: { flexDirection: "row", backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.pill, padding: 3 },
  segBtn: { paddingHorizontal: t.space.lg, paddingVertical: t.space.sm, borderRadius: t.radius.pill },
  segBtnActive: { backgroundColor: t.colors.surface, boxShadow: t.elevation.card },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  toggleChipOn: { borderColor: t.colors.primary, backgroundColor: t.colors.primaryTint },
  list: { padding: t.space.lg, gap: t.space.md, paddingBottom: t.space.xxxl },
  row: { flexDirection: "row", alignItems: "center", gap: t.space.md, padding: t.space.md },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },
  rowText: { flex: 1, gap: t.space.xxs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: t.space.xs + t.space.xxs, flexWrap: "wrap", marginTop: t.space.xxs },
  rating: { flexDirection: "row", alignItems: "center", gap: 2 },
}));
