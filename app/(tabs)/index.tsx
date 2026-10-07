import { useFocusEffect, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DishCard } from "@/src/components/DishCard";
import { useAuth } from "@/src/contexts/AuthContext";
import { countProgressInLevel, Dish, getDishesByLevel, getFallbackDishPhoto, getUser } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { useI18n } from "@/src/i18n";
import { levelTitle } from "@/src/i18n/content";
import { missionStartParams } from "@/src/lib/missionParams";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Icons, PressableScale, Screen, Skeleton, StateView, Text } from "@/src/ui";

const MAX_LEVEL = 12;
const DEFAULT_LEVEL = 1;

type LevelDoc = { title?: string; required_count?: number };

type HomeState = {
  level: number;
  storedLevelTitle?: string;
  xpPct: number;
  progress: number;
  requiredCount: number;
  badges: number;
};

// 오늘의 도전과제 후보(현재 레벨의 미완료 요리 우선)에서 날짜 기준으로 2개를 순환 선택.
// 매일 조금씩 다른 요리가 보이되, 같은 날 안에서는 화면을 다시 열어도 같은 요리가 뜨도록 함.
function pickTodayChallenges(levelDishes: Dish[], completedIds: Set<string>): Dish[] {
  const undone = levelDishes.filter((d) => !completedIds.has(d.id));
  const pool = (undone.length > 0 ? undone : levelDishes)
    .slice()
    .sort((a, b) => Number(a.no) - Number(b.no));
  if (pool.length === 0) return [];

  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - startOfYear) / 86400000);
  const start = dayOfYear % pool.length;
  const count = Math.min(2, pool.length);
  return Array.from({ length: count }, (_, i) => pool[(start + i) % pool.length]);
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const { user: authUser } = useAuth();

  const [fetching, setLoading] = useState(true);
  // 로그아웃돼 authUser가 없으면 불러올 것도 없으니 로딩이 끝난 것으로 본다(영원히 스켈레톤 방지).
  const loading = fetching && !!authUser;
  // 데이터 로딩 실패를 "이 레벨엔 요리가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분한다.
  const [loadError, setLoadError] = useState(false);
  const [home, setHome] = useState<HomeState>({
    level: DEFAULT_LEVEL,
    xpPct: 0,
    progress: 0,
    requiredCount: 1,
    badges: 0,
  });
  const [challenges, setChallenges] = useState<Dish[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // 공식 사진(dish.image)이 없는 요리만, 유저 리뷰 사진으로 보완한 썸네일 (dishId -> imageUrl).
  const [fallbackPhotos, setFallbackPhotos] = useState<Record<string, string>>({});
  // authUser가 바뀌지 않아도 재시도 버튼/화면 재진입으로 다시 불러올 수 있게 별도 트리거로 관리
  const [reloadTick, setReloadTick] = useState(0);
  // 첫 로딩에만 스켈레톤을 띄우고, 이후 새로고침은 기존 화면을 그대로 둔 채 조용히 갱신해서
  // 탭을 오갈 때 화면이 깜빡이지 않게 한다.
  const firstLoadRef = useRef(true);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      if (firstLoadRef.current || loadError) setLoading(true);
      setLoadError(false);
      try {
        const user = await getUser(authUser.uid);
        const level = Math.min(user?.current_level ?? DEFAULT_LEVEL, MAX_LEVEL);
        const completed = new Set(user?.completed_dishes ?? []);

        // 진행 개수는 위에서 받은 유저 문서 + 아래 레벨 요리 목록으로 바로 계산한다.
        const [levelSnap, levelDishes] = await Promise.all([
          getDoc(doc(db, "levels", String(level))),
          getDishesByLevel(level),
        ]);
        const progress = countProgressInLevel(user?.completed_dishes, levelDishes);
        const levelData = (levelSnap.exists() ? levelSnap.data() : {}) as LevelDoc;
        const requiredCount = levelData.required_count ?? Math.max(progress, 1);

        if (cancelled) return;
        setCompletedIds(completed);
        setHome({
          level,
          storedLevelTitle: levelData.title,
          xpPct: Math.min(100, Math.round((progress / requiredCount) * 100)),
          progress,
          requiredCount,
          badges: completed.size,
        });
        const todayChallenges = pickTodayChallenges(levelDishes, completed);
        setChallenges(todayChallenges);

        // 공식 사진이 없는 요리만 리뷰 사진으로 보완 시도 (백그라운드, 실패하면 자리표시 그림으로 남음).
        todayChallenges.filter((d) => !d.image).forEach((d) => {
          getFallbackDishPhoto(d.id)
            .then((url) => {
              if (!cancelled && url) setFallbackPhotos((prev) => ({ ...prev, [d.id]: url }));
            })
            .catch(() => {});
        });
      } catch (err) {
        console.error("[home] 유저/미션 데이터 로딩 오류:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
          firstLoadRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // loadError는 "스켈레톤을 띄울지" 판단에만 쓰는 읽기 전용 값이라 의존성에 넣지 않는다
    // (넣으면 에러 → 재시도 시 effect가 두 번 도는 루프가 된다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, reloadTick]);

  // 미션을 마치고 홈으로 돌아왔을 때 레벨 카드/완료 표시가 앱 재시작 전까지 갱신되지 않던
  // 문제 때문에, 화면에 다시 포커스가 올 때마다 조용히 다시 불러온다(첫 포커스는 건너뜀).
  useFocusEffect(
    useCallback(() => {
      if (firstLoadRef.current) return;
      setReloadTick((v) => v + 1);
    }, [])
  );

  const displayName = authUser?.displayName || authUser?.email?.split("@")[0] || t("common.friend");
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const retry = () => setReloadTick((v) => v + 1);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: insets.top + theme.space.lg }]}
      >
        {/* 헤더 - 로그아웃은 환경설정으로 옮겼다(헤더에 위험 버튼이 상시 노출돼 있었음) */}
        <View style={s.header}>
          <View style={s.avatar} accessibilityElementsHidden importantForAccessibility="no">
            <Text variant="title3" style={s.avatarText}>
              {avatarLetter}
            </Text>
          </View>
          <View style={s.headerText}>
            <Text variant="caption" color="textTertiary" style={s.brand}>
              HOW KRU
            </Text>
            <Text variant="title2" numberOfLines={1} accessibilityRole="header">
              {t("home.greeting", { name: displayName })}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push("/settings")}
            accessibilityLabel={t("home.settingsA11y")}
            style={s.iconBtn}
          >
            <Icons.GearSix size={22} color={theme.colors.textSecondary} />
          </PressableScale>
        </View>

        {loading ? (
          <HomeSkeleton />
        ) : (
          <>
            {/* 레벨 카드 */}
            <PressableScale
              onPress={() => router.push("/levels")}
              scaleTo={0.98}
              accessibilityLabel={`${t("home.levelLabel")} ${t("common.levelShort", { level: home.level })}, ${levelTitle(home.level, home.storedLevelTitle, language)}, ${t("home.progressA11y", { pct: home.xpPct })}`}
              accessibilityHint={t("home.levelCardHint")}
              style={s.levelCard}
            >
              <View style={s.levelTop}>
                <Text variant="callout" style={s.onFill}>
                  {t("home.levelLabel")}
                </Text>
                <View style={s.levelBadge}>
                  <Text variant="caption" style={[s.onFill, s.bold]}>
                    {t("common.levelShort", { level: home.level })}
                  </Text>
                </View>
              </View>
              <Text variant="title1" style={s.onFill} numberOfLines={2}>
                {levelTitle(home.level, home.storedLevelTitle, language)}
              </Text>

              <View style={s.progressRow}>
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${home.xpPct}%` }]} />
                </View>
                <Text variant="caption" style={[s.onFill, s.bold, s.tabular]}>
                  {home.xpPct}%
                </Text>
              </View>

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Icons.Medal size={16} color={theme.colors.onPrimary} weight="fill" />
                  <Text variant="caption" style={s.onFill}>
                    {t("home.badges", { count: home.badges })}
                  </Text>
                </View>
                <View style={s.metaItem}>
                  <Icons.MapPin size={16} color={theme.colors.onPrimary} weight="fill" />
                  <Text variant="caption" style={[s.onFill, s.tabular]}>
                    {t("home.levelProgress", { progress: home.progress, required: home.requiredCount })}
                  </Text>
                </View>
                <Icons.CaretRight size={18} color={theme.colors.onPrimary} style={s.metaChevron} />
              </View>
            </PressableScale>

            {/* 오늘의 도전 */}
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Icons.Fire size={20} color={theme.colors.primary} weight="fill" />
                <Text variant="title3" style={s.bold} accessibilityRole="header">
                  {t("home.todayTitle")}
                </Text>
              </View>
              <Text variant="caption" color="textTertiary">
                {t("home.todaySub")}
              </Text>
            </View>

            {loadError ? (
              <StateView
                icon={Icons.WifiSlash}
                tone="danger"
                title={t("home.loadError")}
                message={t("common.checkConnection")}
                actionLabel={t("common.retry")}
                onAction={retry}
              />
            ) : challenges.length === 0 ? (
              <StateView icon={Icons.BowlFood} title={t("home.empty")} />
            ) : (
              <View style={s.cards}>
                {challenges.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    variant="hero"
                    fallbackImage={fallbackPhotos[dish.id]}
                    completed={completedIds.has(dish.id)}
                    ctaLabel={t("dish.startMission")}
                    accessibilityHint={t("dish.cardHint")}
                    onPress={() =>
                      router.push({
                        pathname: "/mission/start",
                        params: missionStartParams(dish, {
                          thumb: dish.image || fallbackPhotos[dish.id],
                          completed: completedIds.has(dish.id),
                        }),
                      })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

/** 첫 로딩 동안 실제 레이아웃 모양 그대로 보여주는 자리표시자 */
function HomeSkeleton() {
  const theme = useTheme();
  const s = useStyles();
  return (
    <View style={s.skeleton}>
      <Skeleton height={178} radius={theme.radius.xl} />
      <Skeleton width={140} height={20} style={{ marginTop: theme.space.lg }} />
      {[0, 1].map((i) => (
        <View key={i} style={s.skeletonCard}>
          <Skeleton height={200} radius={0} />
          <View style={{ padding: theme.space.lg, gap: theme.space.sm }}>
            <Skeleton width="60%" height={18} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingHorizontal: t.space.lg, paddingBottom: t.space.huge, gap: t.space.lg },
  header: { flexDirection: "row", alignItems: "center", gap: t.space.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: t.colors.primaryText, fontWeight: "800" },
  headerText: { flex: 1 },
  brand: { letterSpacing: 1.2, fontWeight: "700" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: t.colors.border,
  },

  levelCard: {
    backgroundColor: t.colors.primaryFill,
    borderRadius: t.radius.xl,
    padding: t.space.xl,
    gap: t.space.sm,
    boxShadow: t.elevation.raised,
  },
  levelTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.xs,
  },
  onFill: { color: t.colors.onPrimary },
  bold: { fontWeight: "700" },
  tabular: { fontVariant: ["tabular-nums"] },
  progressRow: { flexDirection: "row", alignItems: "center", gap: t.space.md, marginTop: t.space.sm },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: t.radius.pill, backgroundColor: t.colors.onPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: t.space.lg, marginTop: t.space.xs },
  metaItem: { flexDirection: "row", alignItems: "center", gap: t.space.xs + t.space.xxs },
  metaChevron: { marginLeft: "auto" },

  sectionHead: { marginTop: t.space.sm, gap: t.space.xxs },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  cards: { gap: t.space.lg },

  skeleton: { gap: t.space.md },
  skeletonCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    overflow: "hidden",
    marginTop: t.space.sm,
  },
}));
