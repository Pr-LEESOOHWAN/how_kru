import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { DishCard } from "@/src/components/DishCard";
import { useAuth } from "@/src/contexts/AuthContext";
import { getFallbackDishPhoto, getUser, type Dish } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { useI18n } from "@/src/i18n";
import { levelTitle } from "@/src/i18n/content";
import { missionStartParams } from "@/src/lib/missionParams";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Badge, Icons, PressableScale, Screen, ScreenHeader, Skeleton, StateView, Text } from "@/src/ui";

const DEFAULT_LEVEL = 1;

type LevelInfo = {
  level: number;
  title: string;
  required_count?: number;
};

export default function LevelsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const { user: authUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<number, number>>({});
  const [dishesByLevel, setDishesByLevel] = useState<Record<number, Dish[]>>({});
  const [levelInfo, setLevelInfo] = useState<Record<number, LevelInfo>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [myLevel, setMyLevel] = useState(DEFAULT_LEVEL);
  const [loading, setLoading] = useState(true);
  // 로딩 실패를 "표시할 요리가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
  const [loadError, setLoadError] = useState(false);
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set());
  // 공식 사진(dish.image)이 없는 요리만, 유저 리뷰 사진으로 보완한 썸네일 (dishId -> imageUrl).
  const [fallbackPhotos, setFallbackPhotos] = useState<Record<string, string>>({});
  // getFallbackDishPhoto()는 화면이 언마운트된 뒤에도 응답이 올 수 있는 백그라운드 조회라
  // 언마운트 여부를 추적해서 사라진 화면에 상태를 쓰지 않는다.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async () => {
    if (!authUser) {
      // 화면이 떠 있는 동안 로그아웃되는 경우 로딩이 영원히 안 끝나는 것을 방지
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [dishSnap, levelSnap, user] = await Promise.all([
        getDocs(collection(db, "dishes")),
        getDocs(collection(db, "levels")),
        getUser(authUser.uid).catch(() => null),
      ]);

      setCompletedIds(new Set(user?.completed_dishes ?? []));
      const resolvedLevel = user?.current_level ?? DEFAULT_LEVEL;
      setMyLevel(resolvedLevel);
      setOpenLevels(new Set([resolvedLevel]));

      const grouped: Record<number, Dish[]> = {};
      dishSnap.docs.forEach((d) => {
        const dish = { id: d.id, ...(d.data() as Omit<Dish, "id">) };
        const lvl = dish.level ?? 0;
        if (!grouped[lvl]) grouped[lvl] = [];
        grouped[lvl].push(dish);
      });
      Object.values(grouped).forEach((list) => list.sort((a, b) => Number(a.no) - Number(b.no)));

      const infos: Record<number, LevelInfo> = {};
      levelSnap.docs.forEach((d) => {
        const data = d.data() as LevelInfo;
        infos[data.level] = data;
      });

      setDishesByLevel(grouped);
      setLevelInfo(infos);

      // 공식 사진이 없는 요리만 리뷰 사진으로 보완 시도(백그라운드, 실패하면 자리표시 그림).
      Object.values(grouped)
        .flat()
        .filter((d) => !d.image)
        .forEach((d) => {
          getFallbackDishPhoto(d.id)
            .then((url) => {
              if (url && mountedRef.current) setFallbackPhotos((prev) => ({ ...prev, [d.id]: url }));
            })
            .catch(() => {});
        });
    } catch (err) {
      console.error("레벨 데이터 로딩 오류:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  const levels = useMemo(
    () => Object.keys(dishesByLevel).map(Number).sort((a, b) => a - b),
    [dishesByLevel]
  );

  const scrollToLevel = (lvl: number) => {
    const y = sectionY.current[lvl];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - theme.space.sm), animated: true });
  };

  // 처음 들어오면 내 레벨 섹션으로 자동 스크롤
  useEffect(() => {
    if (loading || levels.length === 0) return;
    const timer = setTimeout(() => scrollToLevel(myLevel), 80);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, levels.length]);

  const toggleLevel = (lvl: number) => {
    setOpenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
    // 펼침/접힘으로 바뀐 onLayout 좌표가 반영될 시간을 준 다음 스크롤한다.
    setTimeout(() => scrollToLevel(lvl), 60);
  };

  return (
    <Screen>
      <ScreenHeader title={t("levels.title")} />

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={72} radius={theme.radius.lg} />
          ))}
        </View>
      ) : loadError ? (
        <StateView
          icon={Icons.WifiSlash}
          tone="danger"
          title={t("levels.loadError")}
          message={t("home.loadErrorHint")}
          actionLabel={t("common.retry")}
          onAction={load}
        />
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={s.list}>
          {levels.map((lvl) => {
            const isMine = lvl === myLevel;
            const isCleared = lvl < myLevel;
            const isOpen = openLevels.has(lvl);
            const dishes = dishesByLevel[lvl] ?? [];
            const done = dishes.filter((d) => completedIds.has(d.id)).length;
            const title = levelTitle(lvl, levelInfo[lvl]?.title, language);

            return (
              <View
                key={lvl}
                style={[s.section, isMine && s.sectionMine]}
                onLayout={(e) => {
                  sectionY.current[lvl] = e.nativeEvent.layout.y;
                }}
              >
                <PressableScale
                  onPress={() => toggleLevel(lvl)}
                  scaleTo={0.99}
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={[
                    t("common.levelShort", { level: lvl }),
                    title,
                    isMine ? t("levels.mine") : "",
                    isCleared ? t("levels.cleared") : "",
                    t("levels.progress", { done, total: dishes.length }),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  style={s.sectionHead}
                >
                  <View style={[s.levelCircle, isMine && s.levelCircleMine, isCleared && s.levelCircleCleared]}>
                    {isCleared ? (
                      <Icons.Check size={20} color={theme.colors.success} weight="bold" />
                    ) : (
                      <Text variant="bodyStrong" style={isMine ? s.onFill : s.levelNum}>
                        {lvl}
                      </Text>
                    )}
                  </View>
                  <View style={s.sectionText}>
                    <View style={s.titleRow}>
                      <Text variant="bodyStrong" numberOfLines={1} style={s.flexShrink}>
                        {title}
                      </Text>
                      {isMine ? <Badge label={t("levels.mine")} tone="brand" size="sm" /> : null}
                    </View>
                    <Text variant="caption" color="textTertiary" style={s.tabular}>
                      {t("common.levelShort", { level: lvl })} · {t("levels.progress", { done, total: dishes.length })}
                    </Text>
                  </View>
                  {isOpen ? (
                    <Icons.CaretDown size={18} color={theme.colors.textTertiary} style={s.caretOpen} />
                  ) : (
                    <Icons.CaretDown size={18} color={theme.colors.textTertiary} />
                  )}
                </PressableScale>

                {isOpen ? (
                  <View style={s.grid}>
                    {dishes.map((dish) => (
                      <View key={dish.id} style={s.cell}>
                        <DishCard
                          dish={dish}
                          fallbackImage={fallbackPhotos[dish.id]}
                          completed={completedIds.has(dish.id)}
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
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  list: { padding: t.space.lg, gap: t.space.md, paddingBottom: t.space.huge },
  section: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: "hidden",
  },
  sectionMine: { borderColor: t.colors.primary, borderWidth: 1.5 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: t.space.md, padding: t.space.lg },
  levelCircle: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  levelCircleMine: { backgroundColor: t.colors.primaryFill },
  levelCircleCleared: { backgroundColor: t.colors.successTint },
  levelNum: { color: t.colors.textSecondary, fontVariant: ["tabular-nums"] },
  onFill: { color: t.colors.onPrimary, fontVariant: ["tabular-nums"] },
  sectionText: { flex: 1, gap: t.space.xxs },
  titleRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  flexShrink: { flexShrink: 1 },
  tabular: { fontVariant: ["tabular-nums"] },
  caretOpen: { transform: [{ rotate: "180deg" }] },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: t.space.md,
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.md,
  },
  cell: { width: "47.8%" },
}));
