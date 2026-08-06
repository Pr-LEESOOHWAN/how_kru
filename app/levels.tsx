import { useAuth } from "@/src/contexts/AuthContext";
import { getUser } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const DEFAULT_LEVEL = 1;

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

type Section = {
  level: number;
  title: string | undefined;
  isMine: boolean;
  isDone: boolean;
  data: Dish[];
};

export default function LevelsScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const listRef = useRef<SectionList<Dish, Section>>(null);
  const [dishesByLevel, setDishesByLevel] = useState<Record<number, Dish[]>>({});
  const [levelInfo, setLevelInfo] = useState<Record<number, LevelInfo>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [myLevel, setMyLevel] = useState(DEFAULT_LEVEL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    const load = async () => {
      try {
        const [dishSnap, levelSnap, user] = await Promise.all([
          getDocs(collection(db, "dishes")),
          getDocs(collection(db, "levels")),
          getUser(authUser.uid).catch(() => null),
        ]);

        setCompletedIds(new Set(user?.completed_dishes ?? []));
        setMyLevel(user?.current_level ?? DEFAULT_LEVEL);

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
  }, [authUser]);

  const levels = useMemo(
    () => Object.keys(dishesByLevel).map(Number).sort((a, b) => a - b),
    [dishesByLevel]
  );

  const sections: Section[] = useMemo(
    () =>
      levels.map((lvl) => ({
        level: lvl,
        title: levelInfo[lvl]?.title,
        isMine: lvl === myLevel,
        isDone: lvl < myLevel,
        data: dishesByLevel[lvl] ?? [],
      })),
    [levels, levelInfo, dishesByLevel, myLevel]
  );

  // 처음 들어오면 내 레벨 섹션으로 자동 스크롤 (계속 스크롤하면 다른 레벨이 이어서 보임)
  useEffect(() => {
    if (loading || sections.length === 0) return;
    const myIndex = sections.findIndex((s) => s.isMine);
    if (myIndex === -1) return;
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex: myIndex,
          itemIndex: 0,
          viewOffset: 0,
          animated: false,
        });
      } catch {
        // 아직 레이아웃 전이면 조용히 무시
      }
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sections.length]);

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>레벨별 음식</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={s.loadingText}>레벨 데이터 불러오는 중...</Text>
        </View>
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(dish) => dish.id}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 30 }}
          onScrollToIndexFailed={() => {
            // 레이아웃이 아직 안 잡혔을 때 재시도
            setTimeout(() => {
              const myIndex = sections.findIndex((sec) => sec.isMine);
              if (myIndex !== -1) {
                listRef.current?.scrollToLocation({
                  sectionIndex: myIndex,
                  itemIndex: 0,
                  animated: false,
                });
              }
            }, 100);
          }}
          renderSectionHeader={({ section }) => (
            <View style={[s.sectionHeader, section.isMine && s.sectionHeaderMine]}>
              <View style={[s.levelBadge, section.isMine && s.levelBadgeMine]}>
                <Text style={[s.levelBadgeText, section.isMine && s.levelBadgeTextMine]}>
                  Lv.{section.level}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={s.levelTitle} numberOfLines={1}>
                    {section.title ?? `Level ${section.level}`}
                  </Text>
                  {section.isMine && (
                    <View style={s.mineTag}>
                      <Text style={s.mineTagText}>내 레벨</Text>
                    </View>
                  )}
                  {section.isDone && <Text style={s.doneCheck}>✓</Text>}
                </View>
                <Text style={s.levelSub}>{section.data.length}개 요리</Text>
              </View>
            </View>
          )}
          renderItem={({ item: dish }) => {
            const isCompleted = completedIds.has(dish.id);
            return (
              <View style={s.dishRow}>
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
                  {isCompleted && (
                    <View style={s.completedStamp}>
                      <Text style={s.completedStampText}>완료</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.dishNameKr}>{dish.name_kr}</Text>
                  <Text style={s.dishNameEn} numberOfLines={1}>{dish.name_en}</Text>
                </View>
                <Text style={s.spiceText}>
                  {"🌶️".repeat(Math.max(1, Math.min(5, dish.spice_level || 1)))}
                </Text>
              </View>
            );
          }}
        />
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
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#F5F5F5", paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#e8e8e8",
  },
  sectionHeaderMine: { backgroundColor: "#FFF7F4" },
  levelBadge: {
    width: 42, height: 42, borderRadius: 11, backgroundColor: "#F0F0F0",
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
  dishRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: "#fff", gap: 12,
    borderBottomWidth: 0.5, borderBottomColor: "#f5f5f5",
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
  completedStamp: {
    position: "absolute", bottom: 3, right: 3, borderWidth: 1.5, borderColor: "#4CAF50",
    borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, backgroundColor: "rgba(255,255,255,0.95)",
    transform: [{ rotate: "-14deg" }],
  },
  completedStampText: { fontSize: 9, fontWeight: "bold", color: "#4CAF50" },
  dishNameKr: { fontSize: 14, fontWeight: "600", color: "#222" },
  dishNameEn: { fontSize: 12, color: "#888", marginTop: 1 },
  spiceText: { fontSize: 10 },
});
