import { Image } from "expo-image";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ImageBackground, Linking, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LOCALE_TAG, useI18n } from "@/src/i18n";
import { formatDistance, getPlaceReviews, type GoogleReview, walkMinutes } from "@/src/services/places";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Button, Icons, Screen, ScreenHeader, Text } from "@/src/ui";

// 정책: 자체 경로 안내(턴바이턴 내비게이션)는 지도 API 라이선스상 제공하지 않고, 외부 지도 앱
// (길찾기)으로 연결한다. (react-native-maps 등으로 자체 내비게이션을 붙이는 방향으로 바꾸지 말 것 -
// 의도적인 제품 결정임) 대신 내 위치 + 식당 위치를 보여주는 정적 미리보기 지도는 제공한다.

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

// 지도 마커 색 - 지도 이미지 안에 들어가는 값이라 테마와 무관하게 고정.
const MARKER_ME = "0x2F6DB5";
const MARKER_DEST = "0xF2542D";

export default function NavigateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
    address: string;
    distanceM?: string;
    lat?: string;
    lng?: string;
    placeId?: string;
  }>();
  const distanceM = Number(params.distanceM ?? 0);
  const distanceLine = distanceM
    ? `${t("choose.walk", { min: walkMinutes(distanceM) })} · ${formatDistance(distanceM)}`
    : "";

  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState(false);
  // 지도 이미지 로드 실패는 "어느 URL에서 실패했는지"와 함께 기억한다. 내 위치를 받아오면 URL이
  // 바뀌는데, 첫 URL에서 한 번 실패했다고 새 URL을 시도도 안 하고 오류 화면에 갇히지 않게.
  const [mapImgErrorUrl, setMapImgErrorUrl] = useState<string | null>(null);

  // 구글 리뷰: 약관상 저장/캐싱이 금지라 화면에 들어올 때마다 실시간으로만 조회하고 상태로만 잠깐 든다.
  const [googleReviews, setGoogleReviews] = useState<GoogleReview[] | null>(null);
  const [googleRating, setGoogleRating] = useState<{ rating?: number; total?: number }>({});
  const [fetchedReviewsState, setReviewsState] = useState<"loading" | "ok" | "empty" | "error">("loading");
  // 식당 id가 없으면(예전 흐름) 조회할 리뷰가 없다.
  const reviewsState = params.placeId ? fetchedReviewsState : "empty";

  useEffect(() => {
    if (!params.placeId) return;
    let cancelled = false;
    (async () => {
      setReviewsState("loading");
      try {
        // 사용자 언어로 요청하면 구글이 리뷰 본문을 번역해서 준다(대부분 한국어 리뷰라 외국인에게 유용).
        const { rating, userRatingsTotal, reviews } = await getPlaceReviews(params.placeId!, LOCALE_TAG[language]);
        if (cancelled) return;
        setGoogleRating({ rating, total: userRatingsTotal });
        setGoogleReviews(reviews);
        setReviewsState(reviews.length === 0 ? "empty" : "ok");
      } catch (err) {
        if (cancelled) return;
        console.error("[navigate] 구글 리뷰 오류:", err);
        setReviewsState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.placeId, language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setLocError(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        if (!cancelled) setLocError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDestCoords = !!params.lat && !!params.lng;

  const staticMapUrl = (() => {
    if (!GOOGLE_MAPS_API_KEY || !hasDestCoords) return null;
    const destMarker = `color:${MARKER_DEST}|label:R|${params.lat},${params.lng}`;
    const markers = myLoc ? [`color:${MARKER_ME}|label:U|${myLoc.lat},${myLoc.lng}`, destMarker] : [destMarker];
    const markerParams = markers.map((m) => `markers=${encodeURIComponent(m)}`).join("&");
    // 마커가 2개면 구글이 둘 다 들어오게 확대/중심을 잡아준다. 식당 1개뿐이면 범위가 아주 넓게
    // 잡히므로 이 경우에만 zoom을 직접 지정한다. 지도 글자도 사용자 언어로(language).
    const zoomParam = markers.length === 1 ? "&zoom=16" : "";
    return (
      `https://maps.googleapis.com/maps/api/staticmap?size=640x400&scale=2` +
      `&maptype=roadmap${zoomParam}&language=${LOCALE_TAG[language]}&${markerParams}&key=${GOOGLE_MAPS_API_KEY}`
    );
  })();

  const mapImgFailed = !!staticMapUrl && mapImgErrorUrl === staticMapUrl;

  const openInMaps = () => {
    const query = encodeURIComponent(`${params.restaurantName} ${params.address}`);
    const url = hasDestCoords
      ? Platform.select({
          ios: `maps://?daddr=${params.lat},${params.lng}&dirflg=w`,
          android: `google.navigation:q=${params.lat},${params.lng}&mode=w`,
          default: `https://www.google.com/maps/dir/?api=1&destination=${params.lat},${params.lng}${params.placeId ? `&destination_place_id=${params.placeId}` : ""}&travelmode=walking`,
        })
      : Platform.select({
          ios: `maps:0,0?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://maps.google.com/?q=${query}`,
        });

    if (!url) return;
    Linking.openURL(url).catch(() => {
      // 특정 지도 앱(예: 구글맵 미설치)이 없을 때는 웹 브라우저 길찾기로 대체
      const fallback = `https://www.google.com/maps/dir/?api=1&destination=${
        hasDestCoords ? `${params.lat},${params.lng}` : query
      }&travelmode=walking`;
      Linking.openURL(fallback).catch(() => {
        Alert.alert(t("nav.openMapsFailed"), t("common.tryAgainLater"));
      });
    });
  };

  const legendMe = myLoc ? t("nav.myLocation") : locError ? t("nav.myLocationDenied") : t("nav.myLocationLoading");

  return (
    <Screen>
      <ScreenHeader title={t("nav.title", { restaurant: params.restaurantName })} />

      <View style={s.mapArea}>
        {staticMapUrl && !mapImgFailed ? (
          <ImageBackground
            source={{ uri: staticMapUrl }}
            style={s.mapImage}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            onError={(e) => {
              // 개발자용 원인(대부분 Maps Static API 미활성화/키 제한)은 콘솔에만 남긴다.
              console.warn("[mission/navigate] static map load failed - Maps Static API 활성화/키 제한 확인:", e.nativeEvent?.error);
              setMapImgErrorUrl(staticMapUrl);
            }}
          >
            {/* 내 위치(U) 마커는 위치를 받아온 뒤에만 지도에 찍히므로 범례도 실제 상태에 맞춘다. */}
            <View style={s.legend}>
              <View style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: myLoc ? theme.colors.info : theme.colors.textDisabled }]} />
                <Text variant="caption" style={s.legendText} numberOfLines={1}>
                  {myLoc ? `${legendMe} (U)` : legendMe}
                </Text>
              </View>
              <View style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text variant="caption" style={s.legendText} numberOfLines={1}>
                  {params.restaurantName} (R)
                </Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={s.mapFallback}>
            <Icons.MapPin size={32} color={theme.colors.textTertiary} weight="duotone" />
            {mapImgFailed ? (
              <>
                <Text variant="bodyStrong" align="center">
                  {t("nav.mapFailed")}
                </Text>
                <Text variant="caption" color="textTertiary" align="center">
                  {t("nav.useMapsApp")}
                </Text>
                <Button title={t("common.retry")} variant="tonal" size="sm" icon={Icons.ArrowClockwise} onPress={() => setMapImgErrorUrl(null)} />
              </>
            ) : !GOOGLE_MAPS_API_KEY ? (
              <>
                <Text variant="bodyStrong" align="center">
                  {t("nav.mapNotConfigured")}
                </Text>
                <Text variant="caption" color="textTertiary" align="center">
                  {t("nav.useMapsApp")}
                </Text>
              </>
            ) : !hasDestCoords ? (
              // 미리보기는 식당 좌표만 있으면 그릴 수 있다 - 좌표가 없으면 아무리 기다려도 안 나오므로
              // 로딩을 계속 돌리지 않고 바로 안내한다.
              <>
                <Text variant="bodyStrong" align="center">
                  {t("nav.noCoords")}
                </Text>
                <Text variant="caption" color="textTertiary" align="center">
                  {t("nav.useMapsApp")}
                  {locError ? `\n${t("nav.locationHint")}` : ""}
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator color={theme.colors.primary} />
                <Text variant="caption" color="textTertiary">
                  {t("nav.mapLoading")}
                </Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, theme.space.lg) }]}>
        <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={s.handle} />
          <Text variant="title2" numberOfLines={2}>
            {params.restaurantName}
          </Text>
          <Text variant="caption" color="textTertiary">
            {params.address}
          </Text>
          {distanceLine ? (
            <View style={s.distanceRow}>
              <Icons.PersonSimpleWalk size={15} color={theme.colors.primaryText} weight="bold" />
              <Text variant="caption" color="primaryText" style={s.bold}>
                {distanceLine}
              </Text>
            </View>
          ) : null}

          <View style={s.reviews}>
            <View style={s.reviewsHead}>
              <Text variant="bodyStrong">{t("nav.googleReviews")}</Text>
              {typeof googleRating.rating === "number" ? (
                <View style={s.ratingRow}>
                  <Icons.Star size={14} color={theme.colors.warning} weight="fill" />
                  <Text variant="caption" style={[s.bold, { color: theme.colors.warning }]}>
                    {t("nav.ratingCount", { rating: googleRating.rating.toFixed(1), count: googleRating.total ?? 0 })}
                  </Text>
                </View>
              ) : null}
            </View>

            {reviewsState === "loading" ? <ActivityIndicator color={theme.colors.primary} style={s.reviewsLoading} /> : null}
            {reviewsState === "error" ? (
              <Text variant="caption" color="textTertiary">
                {t("nav.reviewsError")}
              </Text>
            ) : null}
            {reviewsState === "empty" ? (
              <Text variant="caption" color="textTertiary">
                {t("nav.reviewsEmpty")}
              </Text>
            ) : null}
            {reviewsState === "ok" && googleReviews ? (
              <>
                {googleReviews.slice(0, 2).map((r) => {
                  const author = r.authorName || t("common.anonymous");
                  return (
                  <View key={r.id} style={s.review}>
                    <View style={s.reviewHead}>
                      {r.authorPhotoUrl ? (
                        <Image source={{ uri: r.authorPhotoUrl }} style={s.avatar} contentFit="cover" transition={150} />
                      ) : (
                        <View style={[s.avatar, s.avatarFallback]}>
                          <Text variant="caption" color="textTertiary">
                            {author.charAt(0)}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text variant="caption" style={s.bold} numberOfLines={1}>
                          {author}
                        </Text>
                        <View style={s.ratingRow}>
                          {/* 별 5개는 스크린리더가 "별점 4/5"처럼 한 번에 읽게 묶는다. 빈 별은 흐린 채움
                              대신 윤곽선으로 그려서(모양 차이) 색 대비가 낮아도 개수가 구분되게 한다. */}
                          <View
                            style={s.stars}
                            accessible
                            accessibilityLabel={t("choose.ratingA11y", { rating: `${r.rating}/5` })}
                          >
                            {Array.from({ length: 5 }, (_, i) => {
                              const filled = i < Math.round(r.rating);
                              return (
                                <Icons.Star
                                  key={i}
                                  size={11}
                                  color={filled ? theme.colors.warning : theme.colors.textTertiary}
                                  weight={filled ? "fill" : "regular"}
                                />
                              );
                            })}
                          </View>
                          <Text variant="caption" color="textTertiary">
                            {" "}
                            {r.relativeTime}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {r.text ? (
                      <Text variant="caption" color="textSecondary" numberOfLines={3}>
                        {r.text}
                      </Text>
                    ) : null}
                  </View>
                  );
                })}
                <Text variant="caption" color="textTertiary" align="right">
                  {t("nav.attribution")}
                </Text>
              </>
            ) : null}
          </View>
        </ScrollView>

        <View style={s.actions}>
          <Button title={t("nav.openMaps")} variant="secondary" icon={Icons.NavigationArrow} onPress={openInMaps} fullWidth />
          <Button title={t("nav.arrived")} size="lg" icon={Icons.MapPin} onPress={() => router.push({ pathname: "/mission/arrived", params })} fullWidth />
        </View>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  bold: { fontWeight: "700" },
  mapArea: { flex: 1, backgroundColor: t.colors.surfaceAlt, overflow: "hidden" },
  mapImage: { flex: 1, justifyContent: "flex-start", alignItems: "flex-start" },
  legend: {
    margin: t.space.md,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm + t.space.xxs,
    gap: t.space.xs + t.space.xxs,
    maxWidth: 220,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  // 범례는 지도(밝은 이미지) 위라 테마와 무관하게 어두운 글씨
  legendText: { color: "#2A2826", fontWeight: "600", flexShrink: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: t.space.sm, paddingHorizontal: t.space.xxxl },
  sheet: {
    maxHeight: "58%",
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    marginTop: -t.space.xl,
    boxShadow: t.elevation.raised,
  },
  sheetScroll: { flexGrow: 0 },
  sheetContent: { paddingHorizontal: t.space.xl, paddingTop: t.space.sm, gap: t.space.xs },
  handle: {
    width: 40,
    height: 5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderStrong,
    alignSelf: "center",
    marginBottom: t.space.md,
  },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: t.space.xs, marginTop: t.space.xs },
  reviews: { marginTop: t.space.lg, paddingTop: t.space.lg, borderTopWidth: 1, borderTopColor: t.colors.border, gap: t.space.sm },
  reviewsHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewsLoading: { marginVertical: t.space.sm },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  stars: { flexDirection: "row", gap: 2 },
  review: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.space.md, gap: t.space.sm },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: t.colors.border, alignItems: "center", justifyContent: "center" },
  actions: { paddingHorizontal: t.space.xl, paddingTop: t.space.md, gap: t.space.sm },
}));
