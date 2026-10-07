import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import { countProgressInLevel, getDishesByLevel, getUser, levelUp } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { useI18n } from "@/src/i18n";
import { dishName, levelTitle } from "@/src/i18n/content";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { motion } from "@/src/theme/tokens";
import { Button, Icons, Screen, StateView, Text, triggerHaptic } from "@/src/ui";

const MAX_LEVEL = 12;
// 데이터를 못 불러온 경우(비로그인 게스트 등)를 위한 안전한 기본값
const FALLBACK = { level: 3, title: "Real Local Starter", prevPct: 65, newPct: 65, badges: 0, isMaxLevel: false };

type LevelDoc = { title?: string; required_count?: number };

export default function LevelProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const { user: authUser } = useAuth();
  // alreadyCompleted: complete.tsx에서 "이미 완료했던 요리를 다시 완료"한 경우 "1"로
  // 넘어온다. 이때는 이번 미션으로 진행 개수가 늘어난 게 아니므로 "+X% 상승"
  // 계산에서 이전 값을 progress-1로 잡으면 안 된다.
  const params = useLocalSearchParams<{ dishId?: string; name_kr: string; name_en?: string; alreadyCompleted?: string }>();
  const alreadyCompleted = params.alreadyCompleted === "1";
  const dish = params.name_kr
    ? dishName({ id: params.dishId ?? "", name_kr: params.name_kr, name_en: params.name_en || params.name_kr }, language)
    : "";
  // Explore 탭에서는 현재 레벨이 아닌 요리로도 미션을 할 수 있다. 그 경우 이번 완료는
  // 현재 레벨 진행 개수에 안 들어가는데, 예전엔 무조건 progress-1을 "이전 값"으로 잡아서
  // 실제로는 변화가 없는데도 "+X% 상승했어요"가 뜨는 버그가 있었다.
  const [outsideLevel, setOutsideLevel] = useState(false);

  const [fetching, setLoading] = useState(true);
  // 비로그인이면 불러올 것이 없으니 바로 기본값 화면을 보여준다.
  const loading = fetching && !!authUser;
  const [display, setDisplay] = useState(FALLBACK);
  const [leveledUp, setLeveledUp] = useState(false);
  // 로딩 실패 시 FALLBACK(레벨 3 / 65%)을 그대로 보여주면 실제 레벨과 다른
  // 엉뚱한 숫자가 뜨므로, 실패는 별도 상태로 구분해서 재시도 UI를 띄운다.
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      try {
        const user = await getUser(authUser.uid);
        const level = Math.min(user?.current_level ?? 1, MAX_LEVEL);

        // 진행 개수는 위에서 받은 유저 문서 + 레벨 요리 목록으로 바로 계산한다
        // (예전엔 getProgressInLevel()이 유저 문서를 한 번 더 읽었음).
        const [levelSnap, levelDishes] = await Promise.all([
          getDoc(doc(db, "levels", String(level))),
          getDishesByLevel(level),
        ]);
        const progress = countProgressInLevel(user?.completed_dishes, levelDishes);
        const levelData = (levelSnap.exists() ? levelSnap.data() : {}) as LevelDoc;
        // levels/{level} 문서(또는 required_count)가 없으면 진행률 표시용으로만
        // progress를 기준값으로 대신 쓴다. 이 fallback 값을 그대로 레벨업 판정에
        // 쓰면 progress >= progress가 항상 참이 되어, 설정 문서가 비어 있을 때마다
        // 실제로 레벨업이 발생해버리는 버그가 있었음 — 그래서 레벨업 판정은
        // hasRequiredCount(실제 기준치를 아는 경우)로만 제한한다.
        const hasRequiredCount = levelSnap.exists() && typeof levelData.required_count === "number";
        const requiredCount = levelData.required_count ?? Math.max(progress, 1);

        // dishId를 모르면(예전 흐름 호환) 기존처럼 현재 레벨 요리였다고 가정한다.
        const isOutsideLevel = !!params.dishId && !levelDishes.some((d) => d.id === params.dishId);
        const countedNow = !alreadyCompleted && !isOutsideLevel;
        const prevProgress = countedNow ? Math.max(0, progress - 1) : progress;
        const prevPct = Math.min(100, Math.round((prevProgress / requiredCount) * 100));
        const newPct = Math.min(100, Math.round((progress / requiredCount) * 100));
        const didLevelUp = hasRequiredCount && progress >= requiredCount && level < MAX_LEVEL;

        let shownLevel = level;
        let shownTitle = levelData.title ?? `Level ${level}`;
        // DB 저장이 실제로 성공했을 때만 "레벨 업" UI를 보여주기 위한 플래그.
        // (didLevelUp만 보고 판단하면 levelUp() 저장이 실패해도 축하 메시지가 뜨는 버그가 있었음)
        let levelUpSaved = false;

        if (didLevelUp) {
          try {
            await levelUp(authUser.uid, level);
            levelUpSaved = true;
            shownLevel = level + 1;
            const nextSnap = await getDoc(doc(db, "levels", String(shownLevel)));
            shownTitle = nextSnap.exists() ? (nextSnap.data() as LevelDoc).title ?? shownTitle : shownTitle;
          } catch (err) {
            // 레벨업 저장에 실패한 경우, 화면은 그대로 진행하되(사용자 경험 방해 X)
            // "레벨 업" 표시는 하지 않고 기존 레벨 진행률만 보여줌. 콘솔에는 남김
            console.error("[mission/level-progress] levelUp failed:", err);
          }
        }

        if (!cancelled) {
          setDisplay({
            level: shownLevel,
            title: shownTitle,
            prevPct: levelUpSaved ? newPct : prevPct,
            newPct: levelUpSaved ? 100 : newPct,
            badges: user?.completed_dishes?.length ?? 0,
            // 이미 최고 레벨(12)에 도달한 유저는 더 이상 "다음 레벨"이 없으므로
            // 별도 문구를 보여주기 위한 플래그. (기존엔 이 경우에도 "다음 레벨까지
            // 조금 더 남았어요"라는 잘못된 안내가 계속 떴음)
            isMaxLevel: shownLevel >= MAX_LEVEL,
          });
          setLeveledUp(levelUpSaved);
          setOutsideLevel(isOutsideLevel);
          if (levelUpSaved) triggerHaptic("success");
        }
      } catch (err) {
        console.error("[mission/level-progress] 진행률 로딩 오류:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, retryCount]);

  // 이번 미션으로 늘어난 구간(이전 값 → 새 값)만 진하게, 왼쪽부터 채워지듯 보여준다.
  // 너비 대신 scaleX를 움직여 레이아웃을 다시 계산하지 않게 한다.
  const gainScale = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (loading || loadError || reduceMotion) return;
    gainScale.value = 0;
    gainScale.value = withDelay(240, withTiming(1, { duration: 700, easing: Easing.bezier(...motion.easing.out) }));
  }, [loading, loadError, display.prevPct, display.newPct, reduceMotion, gainScale]);
  const gainStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: gainScale.value }] }));

  const goHome = () => {
    router.dismissAll();
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <Screen style={[s.root, s.centerFill]}>
        <ActivityIndicator color={theme.colors.primary} />
      </Screen>
    );
  }

  if (loadError) {
    return (
      <Screen style={s.root}>
        <View style={[s.centerFill, { paddingTop: insets.top }]}>
          <StateView
            icon={Icons.WifiSlash}
            tone="danger"
            title={t("lp.errorTitle")}
            message={t("lp.errorBody")}
            actionLabel={t("common.retry")}
            onAction={() => {
              setLoading(true);
              setLoadError(false);
              setRetryCount((c) => c + 1);
            }}
          />
        </View>
        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
          <Button title={t("lp.goHome")} icon={Icons.House} size="lg" fullWidth onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const gain = Math.max(0, display.newPct - display.prevPct);
  const delta = leveledUp
    ? t("lp.levelUp")
    : alreadyCompleted
      ? t("lp.unchangedDup")
      : outsideLevel
        ? t("lp.outsideLevel")
        : t("lp.gain", { pct: gain });
  const note = display.isMaxLevel
    ? dish
      ? t("lp.noteMax", { dish })
      : t("lp.noteMaxNoDish")
    : leveledUp
      ? dish
        ? t("lp.noteUp", { dish })
        : t("lp.noteUpNoDish")
      : dish
        ? t("lp.note", { dish })
        : t("lp.noteNoDish");
  const title = levelTitle(display.level, display.title, language);

  return (
    <Screen style={s.root}>
      <View style={[s.center, { paddingTop: insets.top }]}>
        {leveledUp || display.isMaxLevel ? (
          <View style={s.badge}>
            <Icons.Trophy size={44} color={theme.colors.primary} weight="fill" />
          </View>
        ) : null}
        <Text variant="caption" color="primaryText" style={s.kicker}>
          {t("lp.kicker", { level: display.level })}
        </Text>
        <Text variant="title1" align="center" accessibilityRole="header" style={s.levelName}>
          {title}
        </Text>

        <View
          style={s.card}
          accessible
          accessibilityLabel={`${t("lp.progressLabel")} ${display.newPct}%. ${delta}. ${t("lp.completedDishes")} ${display.badges}`}
        >
          <View style={s.cardRow}>
            <Text variant="callout" style={s.onFill}>
              {t("lp.progressLabel")}
            </Text>
            <Text variant="callout" style={[s.onFill, s.bold, s.tabular]}>
              {display.newPct}%
            </Text>
          </View>
          <View style={s.track}>
            <View style={[s.fillOld, { width: `${display.prevPct}%` }]} />
            <Animated.View style={[s.fillGain, { left: `${display.prevPct}%`, width: `${gain}%` }, gainStyle]} />
          </View>
          <View style={s.deltaRow}>
            {leveledUp ? (
              <Icons.Trophy size={16} color={theme.colors.onPrimary} weight="fill" />
            ) : !alreadyCompleted && !outsideLevel ? (
              <Icons.TrendUp size={16} color={theme.colors.onPrimary} weight="bold" />
            ) : null}
            <Text variant="caption" style={[s.onFill, s.bold, s.flex1]}>
              {delta}
            </Text>
          </View>

          <View style={s.meta}>
            <Icons.Medal size={20} color={theme.colors.onPrimary} weight="fill" />
            <Text variant="title3" style={[s.onFill, s.tabular]}>
              {display.badges}
            </Text>
            <Text variant="caption" style={s.onFillDim}>
              {t("lp.completedDishes")}
            </Text>
          </View>
        </View>

        <Text variant="callout" color="textSecondary" align="center" style={s.note}>
          {note}
        </Text>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
        <Button title={t("lp.nextMission")} icon={Icons.ArrowRight} size="lg" fullWidth onPress={goHome} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  root: { backgroundColor: t.colors.surface },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1 },
  bold: { fontWeight: "700" },
  tabular: { fontVariant: ["tabular-nums"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.xxl },
  badge: {
    width: 88,
    height: 88,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.lg,
  },
  kicker: { fontWeight: "700", letterSpacing: 1 },
  levelName: { marginTop: t.space.xs, marginBottom: t.space.xxl },
  card: {
    alignSelf: "stretch",
    backgroundColor: t.colors.primaryFill,
    borderRadius: t.radius.xl,
    padding: t.space.xl,
    gap: t.space.sm,
    boxShadow: t.elevation.raised,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  onFill: { color: t.colors.onPrimary },
  onFillDim: { color: t.colors.onPrimary, opacity: 0.85 },
  track: {
    height: 10,
    borderRadius: t.radius.pill,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  fillOld: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.55)" },
  fillGain: { position: "absolute", top: 0, bottom: 0, backgroundColor: t.colors.onPrimary, transformOrigin: "left" },
  deltaRow: { flexDirection: "row", alignItems: "center", gap: t.space.xs + t.space.xxs },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    marginTop: t.space.md,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
  },
  note: { marginTop: t.space.xl, maxWidth: 320 },
  footer: { paddingHorizontal: t.space.xl, paddingTop: t.space.md },
}));
