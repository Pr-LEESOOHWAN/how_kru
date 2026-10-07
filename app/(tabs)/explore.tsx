import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DishCard } from "@/src/components/DishCard";
import { useAuth } from "@/src/contexts/AuthContext";
import { getFallbackDishPhoto, getUser, type Dish } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { useI18n } from "@/src/i18n";
import { categoryLabel, dishName, dishSubName, kickOptionLabel, tagLabel } from "@/src/i18n/content";
import { missionStartParams } from "@/src/lib/missionParams";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import {
  Badge,
  BottomSheet,
  Button,
  Icons,
  PressableScale,
  Screen,
  Skeleton,
  SpiceMeter,
  StateView,
  Text,
} from "@/src/ui";

const ALL = "__all__";

/** 카테고리는 "구이/육류"처럼 조각이 이어진 형태라(47종, 대부분 1~2개짜리) 첫 조각으로 묶는다. */
function primaryCategory(category?: string) {
  return (category ?? "").split("/")[0]?.trim() || "";
}

// (예전 이름이 HomeScreen이라 홈 화면과 DevTools/에러 스택에서 구분이 안 돼 ExploreScreen으로 정정)
export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const { user: authUser } = useAuth();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  // 로딩 실패를 "메뉴가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  // 시트를 닫는 애니메이션 동안에도 내용이 남아 있어야 해서, 보여줄 요리와 열림 여부를 따로 둔다.
  const [selected, setSelected] = useState<Dish | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 공식 사진(dish.image)이 없는 요리만, 유저 리뷰 사진으로 보완한 썸네일 (dishId -> imageUrl).
  const [fallbackPhotos, setFallbackPhotos] = useState<Record<string, string>>({});
  // 내가 완료한 요리 id - 카드의 완료 표시와, 미션 시작 화면의 XP 중복 지급 안내에 쓴다.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // getFallbackDishPhoto()는 화면이 언마운트된 뒤에도 응답이 올 수 있는 백그라운드 조회라
  // 언마운트 여부를 추적해서 사라진 화면에 상태를 쓰지 않는다.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 첫 진입엔 loading=true로 시작하므로 여기선 로딩 표시를 켜지 않는다(재시도는 retryLoad가 켠다).
  const fetchDishes = async () => {
    try {
      const snapshot = await getDocs(collection(db, "dishes"));
      const data = snapshot.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Dish, "id">) }))
        .sort((a, b) => Number(a.no) - Number(b.no));
      if (!mountedRef.current) return;
      setDishes(data);

      // 공식 사진이 없는 요리에 한해서만 리뷰 사진으로 보완 시도(백그라운드, 실패하면 자리표시 그림).
      data.filter((d) => !d.image).forEach((d) => {
        getFallbackDishPhoto(d.id)
          .then((url) => {
            if (url && mountedRef.current) setFallbackPhotos((prev) => ({ ...prev, [d.id]: url }));
          })
          .catch(() => {});
      });
    } catch (err) {
      console.error("메뉴 로딩 오류:", err);
      if (mountedRef.current) setLoadError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // 상태는 Firestore 응답(await 이후)에서만 바뀐다. 린터는 catch 블록이 동기적으로 돌 가능성까지
    // 보수적으로 잡아서 경고하므로 여기서만 끈다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDishes();
  }, []);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(false);
    fetchDishes();
  };

  // 완료 목록은 미션을 마치고 이 탭으로 돌아올 때마다 바뀔 수 있으므로 포커스마다 조용히 다시 읽는다.
  useFocusEffect(
    useCallback(() => {
      if (!authUser) return;
      let cancelled = false;
      getUser(authUser.uid)
        .then((u) => {
          if (!cancelled && mountedRef.current) setCompletedIds(new Set(u?.completed_dishes ?? []));
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [authUser])
  );

  // 필터 칩: 첫 조각 기준 대분류, 요리 수 많은 순
  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>();
    dishes.forEach((d) => {
      const key = primaryCategory(d.category);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [dishes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dishes.filter((d) => {
      if (category !== ALL && primaryCategory(d.category) !== category) return false;
      if (!q) return true;
      return [dishName(d, language), d.name_kr, d.name_en].some((n) => n?.toLowerCase().includes(q));
    });
  }, [dishes, category, query, language]);

  const startMission = (dish: Dish) => {
    setSheetOpen(false);
    router.push({
      pathname: "/mission/start",
      params: missionStartParams(dish, {
        thumb: dish.image || fallbackPhotos[dish.id],
        completed: completedIds.has(dish.id),
      }),
    });
  };

  const openReviews = (dish: Dish) => {
    setSheetOpen(false);
    router.push({
      pathname: "/dish-reviews",
      params: { dishId: dish.id, name_kr: dish.name_kr, name_en: dish.name_en },
    });
  };

  const header = (
    <View style={[s.header, { paddingTop: insets.top + theme.space.lg }]}>
      <View style={s.titleRow}>
        <Text variant="title1" accessibilityRole="header">
          {t("explore.title")}
        </Text>
        {!loading && !loadError ? (
          <Text variant="callout" color="textTertiary">
            {t("explore.count", { count: dishes.length })}
          </Text>
        ) : null}
      </View>

      <View style={s.search}>
        <Icons.MagnifyingGlass size={18} color={theme.colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("explore.searchPlaceholder")}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.primary}
          accessibilityLabel={t("explore.searchPlaceholder")}
          returnKeyType="search"
          autoCorrect={false}
          style={s.searchInput}
        />
        {query ? (
          <PressableScale onPress={() => setQuery("")} accessibilityLabel={t("explore.clearSearch")} hitSlop={14}>
            <Icons.X size={16} color={theme.colors.textTertiary} weight="bold" />
          </PressableScale>
        ) : null}
      </View>

      {categoryChips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {[[ALL, dishes.length] as [string, number], ...categoryChips].map(([key, count]) => {
            const active = key === category;
            const label = key === ALL ? t("explore.all") : categoryLabel(key, language);
            return (
              <PressableScale
                key={key}
                haptic="selection"
                onPress={() => setCategory(key)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                // 개수도 같이 읽어 준다(화면에는 라벨 옆에 작게 보인다).
                accessibilityLabel={`${key === ALL ? label : t("explore.filterA11y", { name: label })}, ${count}`}
                style={[s.chip, active && s.chipActive]}
                // 36pt 칩 + 위아래 4 = 44pt 터치 영역
                hitSlop={{ top: 4, bottom: 4 }}
              >
                <Text variant="caption" style={[s.chipText, active && s.chipTextActive]}>
                  {label}
                </Text>
                <Text variant="caption" style={[s.chipCount, active && s.chipTextActive]}>
                  {count}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  const empty = loading ? (
    <View style={s.skeletonGrid}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={s.skeletonCell}>
          <Skeleton height={150} radius={theme.radius.lg} />
          <Skeleton width="70%" height={14} />
          <Skeleton width="45%" height={11} />
        </View>
      ))}
    </View>
  ) : loadError ? (
    <StateView
      icon={Icons.WifiSlash}
      tone="danger"
      title={t("explore.loadError")}
      message={t("common.checkConnection")}
      actionLabel={t("common.retry")}
      onAction={retryLoad}
    />
  ) : query.trim() ? (
    <StateView
      icon={Icons.MagnifyingGlass}
      title={t("explore.noResults", { query: query.trim() })}
      message={t("explore.noResultsHint")}
      actionLabel={t("explore.clearSearch")}
      onAction={() => setQuery("")}
    />
  ) : (
    <StateView icon={Icons.BowlFood} title={t("explore.empty")} />
  );

  return (
    <Screen>
      <FlatList
        data={loading || loadError ? [] : filtered}
        keyExtractor={(d) => d.id}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={s.list}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.cell}>
            <DishCard
              dish={item}
              fallbackImage={fallbackPhotos[item.id]}
              completed={completedIds.has(item.id)}
              accessibilityHint={t("dish.detailHint")}
              onPress={() => {
                setSelected(item);
                setSheetOpen(true);
              }}
            />
          </View>
        )}
      />

      <DishDetailSheet
        dish={selected}
        open={sheetOpen}
        image={selected ? selected.image || fallbackPhotos[selected.id] : undefined}
        completed={selected ? completedIds.has(selected.id) : false}
        onClose={() => setSheetOpen(false)}
        onReviews={openReviews}
        onStart={startMission}
      />
    </Screen>
  );
}

type DetailProps = {
  dish: Dish | null;
  open: boolean;
  image?: string;
  completed: boolean;
  onClose: () => void;
  onReviews: (dish: Dish) => void;
  onStart: (dish: Dish) => void;
};

/**
 * 요리 상세 시트. 예전 모달은 킥 "질문"(이 요리를 어떻게 즐겼나요?)을 "이렇게 즐겨보세요"
 * 아래에 그대로 보여줬는데, 실제로 도움이 되는 건 질문이 아니라 선택지(추천 먹는 법)다.
 */
function DishDetailSheet({ dish: d, open, image, completed, onClose, onReviews, onStart }: DetailProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();

  return (
    <BottomSheet
      visible={open && !!d}
      onClose={onClose}
      footer={
        d ? (
          <>
            <View style={s.footerBtn}>
              <Button title={t("dish.reviews")} variant="secondary" icon={Icons.ChatCircleDots} onPress={() => onReviews(d)} fullWidth />
            </View>
            <View style={s.footerBtnWide}>
              <Button
                title={completed ? t("dish.retryMission") : t("mission.startCta")}
                icon={Icons.Camera}
                onPress={() => onStart(d)}
                fullWidth
              />
            </View>
          </>
        ) : null
      }
    >
      {d ? (
        <ScrollView contentContainerStyle={s.sheetContent} showsVerticalScrollIndicator={false}>
          {image ? (
            <Image source={{ uri: image }} style={s.sheetImage} contentFit="cover" transition={150} />
          ) : null}

          <View style={s.badgeRow}>
            <Badge label={t("common.dishNo", { no: d.no })} tone="brand" />
            {d.level ? <Badge label={t("common.levelShort", { level: d.level })} /> : null}
            {completed ? <Badge label={t("common.completed")} tone="success" icon={Icons.CheckCircle} /> : null}
          </View>

          <View>
            <Text variant="display" accessibilityRole="header">
              {dishName(d, language)}
            </Text>
            <Text variant="body" color="primaryText">
              {dishSubName(d, language)}
            </Text>
          </View>

          <View style={s.facts}>
            <View style={s.fact}>
              <Text variant="caption" color="textTertiary">
                {t("dish.category")}
              </Text>
              <Text variant="bodyStrong">{categoryLabel(d.category, language)}</Text>
            </View>
            <View style={s.fact}>
              <Text variant="caption" color="textTertiary">
                {t("dish.spice")}
              </Text>
              <SpiceMeter level={d.spice_level ?? 0} size={16} showMildLabel />
            </View>
          </View>

          {d.tags?.length ? (
            <View style={s.block}>
              <Text variant="caption" color="textTertiary">
                {t("dish.tags")}
              </Text>
              <View style={s.tagWrap}>
                {d.tags.map((tag) => (
                  <Badge key={tag} label={tagLabel(tag, language)} />
                ))}
              </View>
            </View>
          ) : null}

          {d.kick_options?.length ? (
            <View style={s.block}>
              <Text variant="caption" color="textTertiary">
                {t("dish.howToEnjoy")}
              </Text>
              {d.kick_options.map((opt) => (
                <View key={opt} style={s.tip}>
                  <Icons.Sparkle size={16} color={theme.colors.primary} weight="fill" />
                  <Text variant="callout" style={s.tipText}>
                    {kickOptionLabel(opt, language)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((t) => ({
  list: { paddingHorizontal: t.space.lg, paddingBottom: t.space.huge, gap: t.space.md },
  row: { gap: t.space.md },
  cell: { flex: 1 },

  header: { gap: t.space.md, marginBottom: t.space.xs },
  titleRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    minHeight: 46,
    paddingHorizontal: t.space.md + t.space.xxs,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.borderControl,
  },
  searchInput: { flex: 1, ...t.type.body, color: t.colors.text, paddingVertical: 0 },
  chips: { gap: t.space.sm, paddingRight: t.space.lg },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    minHeight: 36,
    paddingHorizontal: t.space.md + t.space.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipActive: { backgroundColor: t.colors.text, borderColor: t.colors.text },
  chipText: { color: t.colors.textSecondary, fontWeight: "700", fontSize: 13 },
  chipCount: { color: t.colors.textTertiary, fontVariant: ["tabular-nums"] },
  chipTextActive: { color: t.colors.bg },

  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: t.space.md },
  skeletonCell: { width: "47.5%", gap: t.space.sm },

  sheetContent: { paddingHorizontal: t.space.xl, paddingTop: t.space.md, paddingBottom: t.space.xl, gap: t.space.lg },
  sheetImage: { width: "100%", aspectRatio: 16 / 10, borderRadius: t.radius.lg, backgroundColor: t.colors.primaryTint },
  badgeRow: { flexDirection: "row", gap: t.space.sm, flexWrap: "wrap" },
  facts: {
    flexDirection: "row",
    gap: t.space.md,
    padding: t.space.lg,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  fact: { flex: 1, gap: t.space.xs },
  block: { gap: t.space.sm },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: t.space.sm },
  tip: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  tipText: { flex: 1 },
  footerBtn: { flex: 1 },
  footerBtnWide: { flex: 1.4 },
}));
