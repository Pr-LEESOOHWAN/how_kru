import { useAuth } from "@/src/contexts/AuthContext";
import { getUser } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
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

export default function LevelsScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Record<number, number>>({});
  const [dishesByLevel, setDishesByLevel] = useState<Record<number, Dish[]>>({});
  const [levelInfo, setLevelInfo] = useState<Record<number, LevelInfo>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [myLevel, setMyLevel] = useState(DEFAULT_LEVEL);
  const [loading, setLoading] = useState(true);
  // 로딩 실패를 "표시할 요리가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
  // (explore.tsx, dish-reviews.tsx 등 다른 화면에서 이미 쓰던 패턴을 여기에도 적용)
  const [loadError, setLoadError] = useState(false);
  const [openLevels, setOpenLevels] = useState<Set<number>>(new Set());

  const load = async () => {
    if (!authUser) {
      // authUser가 없어지는 경우(예: 화면이 떠 있는 동안 로그아웃) 로딩 스피너가
      // 영원히 멈추지 않는 것을 방지. index.tsx/level-progress.tsx와 동일한 패턴.
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
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
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
      if (next.has(lvl)) {
        next.delete(lvl);
      } else {
        next.add(lvl);
      }
      return next;
    });
    // 펼침/접힘으로 바뀐 onLayout 좌표가 반영될 시간을 준 다음 스크롤한다.
    setTimeout(() => scrollToLevel(lvl), 60);
  };

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
      ) : loadError ? (
        <View style={s.loadingBox}>
          <Text style={{ fontSize: 30 }}>⚠️</Text>
          <Text style={s.loadingText}>레벨 데이터를 불러오지 못했어요.</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 30 }}>
          {levels.map((lvl) => {
            const isMine = lvl === myLevel;
            const isDone = lvl < myLevel;
            const isOpen = openLevels.has(lvl);
            const dishes = dishesByLevel[lvl] ?? [];

            return (
              <View
                key={lvl}
                onLayout={(e) => {
                  sectionY.current[lvl] = e.nativeEvent.layout.y;
                }}
              >
                <TouchableOpacity
                  style={[s.sectionHeader, isMine && s.sectionHeaderMine]}
                  activeOpacity={0.7}
                  onPress={() => toggleLevel(lvl)}
                >
                  <View style={[s.levelBadge, isMine && s.levelBadgeMine]}>
                    <Text style={[s.levelBadgeText, isMine && s.levelBadgeTextMine]}>
                      Lv.{lvl}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={s.levelTitle} numberOfLines={1}>
                        {levelInfo[lvl]?.title ?? `Level ${lvl}`}
                      </Text>
                      {isMine && (
                        <View style={s.mineTag}>
                          <Text style={s.mineTagText}>내 레벨</Text>
                        </View>
                      )}
                      {isDone && <Text style={s.doneCheck}>✓</Text>}
                    </View>
                    <Text style={s.levelSub}>{dishes.length}개 요리</Text>
                  </View>
                  <Text style={s.chevron}>{isOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View>
                    {dishes.map((dish) => {
                      const isCompleted = completedIds.has(dish.id);
                      return (
                        <TouchableOpacity
                          key={dish.id}
                          style={s.dishRow}
                          activeOpacity={0.6}
                          onPress={() =>
                            router.push({
                              pathname: "/mission/start",
                              params: {
                                dishId: dish.id,
                                name_kr: dish.name_kr,
                                name_en: dish.name_en,
                                // index.tsx의 startMission()과 동일한 형식으로 desc를 채워서
                                // 미션 시작 화면 설명 텍스트가 빈 값으로 보이지 않게 함.
                                desc: dish.category
                                  ? `${dish.category} · Lv.${dish.level}`
                                  : `Lv.${dish.level}`,
                                spice: String(dish.spice_level ?? 1),
                              },
                            })
                          }
                        >
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
                          {dish.spice_level ? (
                            <Text style={s.spiceText}>
                              {"🌶️".repeat(Math.max(1, Math.min(5, dish.spice_level)))}
                            </Text>
                          ) : (
                            <Text style={s.spiceTextMild}>안매움</Text>
                          )}
                          <Text style={s.dishArrow}>›</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
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
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#888", fontSize: 14 },
  retryBtn: {
    marginTop: 4, backgroundColor: "#FF5722", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#E4E4E4", paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#cfcfcf",
    // 음식 목록(흰 배경)과 레벨 바 사이 명암 차이를 뚜렷하게 주기 위한 그림자
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderMine: { backgroundColor: "#FFE0D2", borderBottomColor: "#FFB894" },
  levelBadge: {
    width: 42, height: 42, borderRadius: 11, backgroundColor: "#D8D8D8",
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
  chevron: { fontSize: 11, color: "#888" },
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
  spiceTextMild: { fontSize: 10, color: "#4CAF50", fontWeight: "700" },
  dishArrow: { fontSize: 18, color: "#ccc", marginLeft: 2 },
});
