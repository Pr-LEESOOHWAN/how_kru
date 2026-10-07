import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import { markDishCompleted, MISSION_COMPLETE_XP } from "@/src/firebase/dishService";
import { useI18n } from "@/src/i18n";
import { dishName } from "@/src/i18n/content";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { motion } from "@/src/theme/tokens";
import { Button, Icons, Screen, Text } from "@/src/ui";

// 축하 파티클은 UI 아이콘이 아니라 "내용"이라 이모지를 그대로 쓴다(icons.ts 참고).
const CONFETTI = ["🎉", "✨", "🎊", "⭐️", "🎈"];
const CONFETTI_COUNT = 10;
const EASE_OUT = Easing.bezier(...motion.easing.out);

type Piece = { emoji: string; left: number; delay: number; duration: number; spin: 1 | -1 };

// 렌더 중에 Math.random()을 부르면 React Compiler가 결과를 캐시하거나 다시 계산하면서 값이
// 흔들릴 수 있어서, 앱이 뜰 때 모듈에서 한 번만 뽑아 둔다.
const PIECES: Piece[] = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  emoji: CONFETTI[i % CONFETTI.length],
  left: 0.08 + Math.random() * 0.84,
  delay: i * 70 + Math.random() * 300,
  duration: 1100 + Math.random() * 700,
  spin: Math.random() > 0.5 ? 1 : -1,
}));

export default function MissionCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  // placeId/restaurantName은 choose-restaurant.tsx에서 식당을 고른 시점에 params에
  // 실려서 navigate → arrived → verify를 거쳐 그대로 여기까지 넘어온다(각 화면이
  // router.push할 때 ...params로 통째로 이어받아 넘김). "이 식당에 리뷰 남기기"에 씀.
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    placeId?: string;
    restaurantName?: string;
    // verify.tsx가 넘겨준 요리 인증 사진의 로컬 URI. "리뷰 남기기"로 그대로 전달한다.
    foodPhotoUri?: string;
  }>();
  const dish = dishName({ id: params.dishId, name_kr: params.name_kr, name_en: params.name_en }, language);
  const saved = useRef(false);
  // markDishCompleted()는 화면을 벗어난 뒤에도 응답이 올 수 있는 비동기 호출이라,
  // 언마운트 후 setSaving/setAlreadyCompleted가 실행되거나(React 경고) 이미 화면을
  // 떠난 사용자에게 "저장 실패, 다시 시도할까요?" Alert가 뜨는 것을 막기 위해 추적한다.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  // 이미 완료했던 요리를 다시 완료한 경우(XP 중복 지급 없음). 다음 화면(kick →
  // level-progress)에도 params로 넘겨서 진행률 "+X% 상승" 계산이 어긋나지 않게 한다.
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  // 완료 기록 저장이 아직 진행 중인지. 저장이 끝나기 전에 "다음으로"를 누르면
  // level-progress 화면이 Firestore에서 아직 반영 안 된 진행 개수를 읽어
  // 진행률/레벨업 판정이 어긋나므로, 저장 중에는 버튼을 잠시 잠근다.
  const [saving, setSaving] = useState(false);

  // 완료 기록 저장. 실패하면 조용히 넘어가지 않고 재시도 기회를 준다 —
  // 여기서 저장이 안 되면 뒤이어 나오는 킥/레벨 진행 화면이 전부 "이 요리는
  // 완료 안 됨" 기준으로 계산돼서, 축하 화면은 봤는데 레벨/완료 목록엔
  // 반영이 안 되는 상황이 생긴다.
  const saveCompletion = () => {
    if (!params.dishId || !user) return;
    setSaving(true);
    markDishCompleted(user.uid, params.dishId)
      .then(({ alreadyCompleted: dup }) => {
        if (mountedRef.current) setAlreadyCompleted(dup);
      })
      .finally(() => {
        if (mountedRef.current) setSaving(false);
      })
      .catch((err) => {
        console.error("[mission/complete] markDishCompleted failed:", err);
        if (!mountedRef.current) return;
        Alert.alert(t("complete.saveFailedTitle"), t("complete.saveFailedBody"), [
          { text: t("common.later"), style: "cancel" },
          { text: t("common.retry"), onPress: saveCompletion },
        ]);
      });
  };

  useEffect(() => {
    if (saved.current || !params.dishId || !user) return;
    saved.current = true;
    saveCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dishId, user]);

  // 미션당 한 번 보는 축하 화면이라 모션을 아끼지 않는다(Emil: 드문 순간엔 즐거움을 줘도 된다).
  // 단, 시스템 "동작 줄이기"가 켜져 있으면 모든 요소를 처음부터 제자리에 둔다.
  const badgeIn = useSharedValue(reduceMotion ? 1 : 0);
  const contentIn = useSharedValue(reduceMotion ? 1 : 0);
  const rewardIn = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    badgeIn.value = withSpring(1, { damping: 12, stiffness: 180 });
    contentIn.value = withDelay(180, withTiming(1, { duration: motion.duration.slow, easing: EASE_OUT }));
    rewardIn.value = withDelay(280, withSpring(1, { damping: 14, stiffness: 200 }));
  }, [reduceMotion, badgeIn, contentIn, rewardIn]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeIn.value,
    transform: [{ scale: 0.6 + badgeIn.value * 0.4 }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentIn.value,
    transform: [{ translateY: (1 - contentIn.value) * 16 }],
  }));
  const rewardStyle = useAnimatedStyle(() => ({
    opacity: rewardIn.value,
    transform: [{ scale: 0.85 + rewardIn.value * 0.15 }],
  }));

  const handleNext = () => {
    router.push({
      pathname: "/mission/kick",
      params: { ...params, ...(alreadyCompleted ? { alreadyCompleted: "1" } : {}) },
    });
  };

  // 미션 완료 직후가 "방금 그 식당에서 찍은 사진"을 가장 구하기 쉬운 시점이라 여기에
  // 진입점을 둠. 이 리뷰는 restaurantId가 함께 저장되어(dishService.addReview)
  // choose-restaurant.tsx 식당 목록의 썸네일 후보로도 쓰인다(getRestaurantThumbnail).
  const handleReview = () => {
    router.push({
      pathname: "/dish-reviews",
      params: {
        dishId: params.dishId,
        name_kr: params.name_kr,
        name_en: params.name_en,
        ...(params.placeId && params.restaurantName
          ? { restaurantId: params.placeId, restaurantName: params.restaurantName }
          : {}),
        ...(params.foodPhotoUri ? { foodPhotoUri: params.foodPhotoUri } : {}),
      },
    });
  };

  const xp = alreadyCompleted ? 0 : MISSION_COMPLETE_XP;

  return (
    <Screen style={s.root}>
      {reduceMotion ? null : (
        <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
          {PIECES.map((piece, i) => (
            <ConfettiPiece key={i} piece={piece} />
          ))}
        </View>
      )}

      <View style={[s.center, { paddingTop: insets.top }]}>
        <Animated.View style={[s.badge, badgeStyle]}>
          <Icons.Confetti size={64} color={theme.colors.primary} weight="fill" />
        </Animated.View>

        <Animated.View style={[s.titles, contentStyle]}>
          <Text variant="display" align="center" accessibilityRole="header">
            {t("complete.title")}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {t("complete.subtitle", { dish })}
          </Text>
        </Animated.View>

        <Animated.View style={[s.rewardRow, rewardStyle]}>
          <View style={s.rewardCard} accessible accessibilityLabel={`+${xp} ${t("complete.xpLabel")}`}>
            <Text variant="title1" color="primaryText">
              +{xp}
            </Text>
            <Text variant="caption" color="textSecondary">
              {t("complete.xpLabel")}
            </Text>
          </View>
          <View style={s.rewardCard} accessible>
            <Icons.Medal size={32} color={theme.colors.primary} weight="fill" />
            <Text variant="caption" color="textSecondary" align="center">
              {alreadyCompleted ? t("complete.badgeOwned") : t("complete.badgeNew")}
            </Text>
          </View>
        </Animated.View>

        {alreadyCompleted ? (
          <Text variant="caption" color="textTertiary" align="center" style={s.dupNote}>
            {t("complete.dupNote")}
          </Text>
        ) : null}
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
        {params.placeId && params.restaurantName ? (
          <Button
            title={t("complete.review", { restaurant: params.restaurantName })}
            variant="tonal"
            icon={Icons.Camera}
            fullWidth
            onPress={handleReview}
          />
        ) : null}
        <Button title={t("common.next")} icon={Icons.ArrowRight} size="lg" fullWidth loading={saving} onPress={handleNext} />
      </View>
    </Screen>
  );
}

function ConfettiPiece({ piece }: { piece: Piece }) {
  const { height, width } = useWindowDimensions();
  const s = useStyles();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.quad) }));
  }, [piece, progress]);

  const fall = height * 0.55;
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    // 처음 15%에서 나타나고 마지막 20%에서 사라진다.
    const opacity = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1;
    return {
      opacity,
      transform: [{ translateY: -20 + p * fall }, { rotate: `${piece.spin * p * 360}deg` }],
    };
  });

  return (
    <Animated.Text style={[s.confetti, { left: piece.left * width }, style]}>
      {piece.emoji}
    </Animated.Text>
  );
}

const useStyles = makeStyles((t) => ({
  root: { backgroundColor: t.colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.xxxl },
  badge: {
    width: 132,
    height: 132,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.xl,
  },
  titles: { gap: t.space.xs, marginBottom: t.space.xxl },
  rewardRow: { flexDirection: "row", gap: t.space.md },
  rewardCard: {
    width: 128,
    minHeight: 96,
    backgroundColor: t.colors.primaryTint,
    borderRadius: t.radius.lg,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: t.space.xs,
  },
  dupNote: { marginTop: t.space.lg, maxWidth: 300 },
  footer: { paddingHorizontal: t.space.xl, gap: t.space.sm },
  confetti: { position: "absolute", top: 0, fontSize: 22 },
}));
