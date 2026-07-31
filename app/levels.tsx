import { db } from "@/src/firebase/firebaseConfig";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// TODO: 로그인 연동 후 실제 유저의 current_level(dishService.getUser)로 교체.
const MY_LEVEL = 3;

type Dish = {
  id: string;
  no: number;
  name_kr: string;
  name_en: string;
  category: string;
  level: number;
  spice_level: number;
  image?: string;
};

type LevelInfo = {
  level: number;
  title: string;
  required_count?: number;
};

export default function LevelsScreen() {
  const router = useRouter();
  const [dishesByLevel, setDishesByLevel] = useState<Record<number, Dish[]>>({});
  const [levelInfo, setLevelInfo] = useState<Record<number, LevelInfo>>({});
  const [loading, setLoading] = useState(true);

  // null = 전체 레벨 목록 화면, 숫자 = 그 레벨만 보여주는 화면(상단 고정 헤더)
  const [focusedLevel, setFocusedLevel] = useState<number | null>(MY_LEVEL);

  useEffect(() => {
    const load = async () => {
      try {
        const [dishSnap, levelSnap] = await Promise.all([
          getDocs(collection(db, "dishes")),
          getDocs(collection(db, "levels")),
        ]);

        const grouped: Record<number, Dish[]> = {};
        dishSnap.docs.forEach((d) => {
          const dish = { id: d.id, ...(d.data() as Omit<Dish, "id">) };
          const lvl = dish.level ?? 0;
          if (!grouped[lvl]) grouped[lvl] = [];
          grouped[lvl].push(dish);
        });
        Object.values(grouped).forEach((list) =>
          list.sort((a, b) => Number(a.no) - Number(b.no))
        );

        const infos: Record<number, LevelInfo> = {};
        levelSnap.docs.forEach((d) => {
          const data = d.data() as LevelInfo;
          infos[data.level] = data;
        });

        setDishesByLevel(grouped);
        setLevelInfo(infos);
      } catch (err) {
        console.error("레벨 데이터 로딩 오류:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const levels = useMemo(
    () => Object.keys(dishesByLevel).map(Number).sort((a, b) => a - b),
    [dishesByLevel]
  );

  const focusedIndex = focusedLevel !== null ? levels.indexOf(focusedLevel) : -1;
  const goToAdjacentLevel = (dir: -1 | 1) => {
    if (focusedIndex === -1) return;
    const next = levels[focusedIndex + dir];
    if (next !== undefined) setFocusedLevel(next);
  };

  const focusedInfo = focusedLevel !== null ? levelInfo[focusedLevel] : undefined;
  const focusedDishes = focusedLevel !== null ? dishesByLevel[focusedLevel] ?? [] : [];
  const focusedIsMine = focusedLevel === MY_LEVEL;
  const focusedIsDone = focusedLevel !== null && focusedLevel < MY_LEVEL;

  return (
    <View style={s.root}>
      {focusedLevel === null ? (
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>레벨별 음식</Text>
          <View style={{ width: 40 }} />
        </View>
      ) : (
        <View style={s.header}>
          <TouchableOpacity onPress={() => setFocusedLevel(null)} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>

          <View style={s.focusedTitleWrap}>
            <TouchableOpacity
              disabled={focusedIndex <= 0}
              onPress={() => goToAdjacentLevel(-1)}
              style={s.arrowBtn}
            >
              <Text style={[s.arrowText, focusedIndex <= 0 && s.arrowTextDisabled]}>‹</Text>
            </TouchableOpacity>

            <View style={s.focusedTitleCenter}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.headerTitle} numberOfLines={1}>
                  Lv.{focusedLevel} · {focusedInfo?.title ?? `Level ${focusedLevel}`}
                </Text>
                {focusedIsMine && (
                  <View style={s.mineTag}>
                    <Text style={s.mineTagText}>내 레벨</Text>
                  </View>
                )}
                {focusedIsDone && <Text style={s.doneCheck}>✓</Text>}
              </View>
            </View>

            <TouchableOpacity
              disabled={focusedIndex === -1 || focusedIndex >= levels.length - 1}
              onPress={() => goToAdjacentLevel(1)}
              style={s.arrowBtn}
            >
              <Text
                style={[
                  s.arrowText,
                  (focusedIndex === -1 || focusedIndex >= levels.length - 1) && s.arrowTextDisabled,
                ]}
              >
                ›
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: 40 }} />
        </View>
      )}

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={s.loadingText}>레벨 데이터 불러오는 중...</Text>
        </View>
      ) : focusedLevel === null ? (
        // ── 전체 레벨 목록 (탭하면 그 레벨로 고정 진입) ──
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {levels.map((lvl) => {
            const isMine = lvl === MY_LEVEL;
            const isDone = lvl < MY_LEVEL;
            const info = levelInfo[lvl];
            const dishes = dishesByLevel[lvl] ?? [];

            return (
              <TouchableOpacity
                key={lvl}
                style={[s.levelBlock, isMine && s.levelBlockMine]}
                activeOpacity={0.7}
                onPress={() => setFocusedLevel(lvl)}
              >
                <View style={s.levelHeader}>
                  <View style={s.levelLeft}>
                    <View style={[s.levelBadge, isMine && s.levelBadgeMine]}>
                      <Text style={[s.levelBadgeText, isMine && s.levelBadgeTextMine]}>
                        Lv.{lvl}
                      </Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={s.levelTitle}>{info?.title ?? `Level ${lvl}`}</Text>
                        {isMine && (
                          <View style={s.mineTag}>
                            <Text style={s.mineTagText}>내 레벨</Text>
                          </View>
                        )}
                        {isDone && <Text style={s.doneCheck}>✓</Text>}
                      </View>
                      <Text style={s.levelSub}>{dishes.length}개 요리</Text>
                    </View>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        // ── 특정 레벨만 고정 헤더 + 스크롤 (다른 레벨은 안 보임) ──
        <ScrollView contentContainerStyle={s.dishListScroll} showsVerticalScrollIndicator={false}>
          {focusedDishes.map((dish) => (
            <View key={dish.id} style={s.dishRow}>
              <View style={s.dishThumb}>
                {dish.image ? (
                  <Image
                    source={{ uri: dish.image }}
                    style={s.dishThumbImg}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <Text style={s.dishThumbFallback}>🍽️</Text>
                )}
                <View style={s.dishNoBadge}>
                  <Text style={s.dishNoBadgeText}>{dish.no}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.dishNameKr}>{dish.name_kr}</Text>
                <Text style={s.dishNameEn} numberOfLines={1}>{dish.name_en}</Text>
              </View>
              <Text style={s.spiceText}>
                {"🌶️".repeat(Math.max(1, Math.min(5, dish.spice_level || 1)))}
              </Text>
            </View>
          ))}
          <View style={{ height: 30 }} />
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
  focusedTitleWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  focusedTitleCenter: { alignItems: "center", flexShrink: 1 },
  arrowBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 20, color: "#FF5722", fontWeight: "bold" },
  arrowTextDisabled: { color: "#ddd" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  list: { padding: 14, gap: 10 },
  levelBlock: {
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    borderWidth: 0.5, borderColor: "#eee",
  },
  levelBlockMine: {
    borderWidth: 2, borderColor: "#FF5722", backgroundColor: "#FFF7F4",
  },
  levelHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14,
  },
  levelLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  levelBadge: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: "#F0F0F0",
    alignItems: "center", justifyContent: "center",
  },
  levelBadgeMine: { backgroundColor: "#FF5722" },
  levelBadgeText: { fontSize: 12, fontWeight: "bold", color: "#666" },
  levelBadgeTextMine: { color: "#fff" },
  levelTitle: { fontSize: 15, fontWeight: "bold", color: "#222" },
  levelSub: { fontSize: 12, color: "#999", marginTop: 2 },
  mineTag: { backgroundColor: "#FF5722", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  mineTagText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  doneCheck: { color: "#4CAF50", fontWeight: "bold", fontSize: 13 },
  chevron: { fontSize: 16, color: "#ccc" },
  dishListScroll: { padding: 14, gap: 0 },
  dishRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: "#fff", borderRadius: 12, marginBottom: 8,
    borderWidth: 0.5, borderColor: "#f0f0f0", gap: 12,
  },
  dishThumb: {
    width: 52, height: 52, borderRadius: 12, backgroundColor: "#FFF0EC",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  dishThumbImg: { width: "100%", height: "100%" },
  dishThumbFallback: { fontSize: 22 },
  dishNoBadge: {
    position: "absolute", top: 3, left: 3, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  dishNoBadgeText: { fontSize: 9, color: "#fff", fontWeight: "bold" },
  dishNameKr: { fontSize: 14, fontWeight: "600", color: "#222" },
  dishNameEn: { fontSize: 12, color: "#888", marginTop: 1 },
  spiceText: { fontSize: 10 },
});
