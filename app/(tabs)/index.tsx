import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { Dish, getDishesByLevel, getFallbackDishPhoto, getProgressInLevel, getUser } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { logOut } from "@/src/firebase/authService";
import { t } from "@/src/i18n/strings";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MAX_LEVEL = 12;
const DEFAULT_LEVEL = 1;

type LevelDoc = { title?: string; required_count?: number };

type HomeState = {
  level: number;
  levelTitle: string;
  xpPct: number;
  progress: number;
  requiredCount: number;
  badges: number;
};

const SpiceIcon = ({ level }: { level: number }) => (
  <View style={{ flexDirection: "row" }}>
    {Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={{ fontSize: 11, opacity: i < level ? 1 : 0.2 }}>🌶️</Text>
    ))}
  </View>
);

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
  const { user: authUser } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  // 데이터 로딩 실패를 "이 레벨엔 요리가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로
  // 구분한다 (explore.tsx, dish-reviews.tsx, levels.tsx 등 다른 화면에서 이미 쓰던 패턴).
  const [loadError, setLoadError] = useState(false);
  const [home, setHome] = useState<HomeState>({
    level: DEFAULT_LEVEL,
    levelTitle: "",
    xpPct: 0,
    progress: 0,
    requiredCount: 1,
    badges: 0,
  });
  const [challenges, setChallenges] = useState<Dish[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // 공식 사진(dish.image)이 없는 요리만, 유저 리뷰 사진으로 보완한 썸네일.
  // explore.tsx/levels.tsx와 동일한 패턴 (dishId -> imageUrl).
  const [fallbackPhotos, setFallbackPhotos] = useState<Record<string, string>>({});
  // authUser가 바뀌지 않아도 재시도 버튼으로 다시 불러올 수 있게 별도 트리거로 관리
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const user = await getUser(authUser.uid);
        const level = Math.min(user?.current_level ?? DEFAULT_LEVEL, MAX_LEVEL);
        const completed = new Set(user?.completed_dishes ?? []);

        const [levelSnap, progress, levelDishes] = await Promise.all([
          getDoc(doc(db, "levels", String(level))),
          getProgressInLevel(authUser.uid, level),
          getDishesByLevel(level),
        ]);
        const levelData = (levelSnap.exists() ? levelSnap.data() : {}) as LevelDoc;
        const requiredCount = levelData.required_count ?? Math.max(progress, 1);

        if (cancelled) return;
        setCompletedIds(completed);
        setHome({
          level,
          levelTitle: levelData.title ?? `Level ${level}`,
          xpPct: Math.min(100, Math.round((progress / requiredCount) * 100)),
          progress,
          requiredCount,
          badges: completed.size,
        });
        const todayChallenges = pickTodayChallenges(levelDishes, completed);
        setChallenges(todayChallenges);

        // 공식 사진이 없는 요리만 리뷰 사진으로 보완 시도 (explore.tsx/levels.tsx와 동일 -
        // 백그라운드 조회, 실패해도 조용히 무시하고 🍽️ 자리표시자로 남음).
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, reloadTick]);

  const displayName = authUser?.displayName || authUser?.email?.split("@")[0] || "친구";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          // 로그아웃 성공 시 AuthContext의 user가 null이 되고,
          // app/_layout.tsx의 Stack.Protected 가드가 자동으로 /login으로 보낸다.
          logOut().catch((err) => console.error("[home] 로그아웃 오류:", err));
        },
      },
    ]);
  };

  const startMission = (dish: Dish) => {
    router.push({
      pathname: "/mission/start",
      params: {
        dishId: dish.id,
        name_kr: dish.name_kr,
        name_en: dish.name_en,
        desc: dish.category ? `${dish.category} · Lv.${dish.level}` : `Lv.${dish.level}`,
        spice: String(dish.spice_level ?? 0),
      },
    });
  };

  if (loading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#FF5722" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={s.header}>
          <View>
            <Text style={s.appTitle}>HOW KRU 🌶️</Text>
            <Text style={s.greeting}>{t("homeGreeting", language)}, {displayName}!</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={() => router.push("/settings")} style={s.iconBtn}>
              <Text style={s.iconBtnText}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
              <Text style={s.logoutText}>로그아웃</Text>
            </TouchableOpacity>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{avatarLetter}</Text>
            </View>
          </View>
        </View>

        {/* 레벨 카드 */}
        <TouchableOpacity
          style={s.levelCard}
          activeOpacity={0.85}
          onPress={() => router.push("/levels")}
        >
          <View style={s.levelRow}>
            <Text style={s.levelLabel}>Current Level</Text>
            <Text style={s.levelBadge}>Lv.{home.level}</Text>
          </View>
          <Text style={s.levelTitle}>{home.levelTitle}</Text>
          <Text style={s.xpLabel}>XP Progress</Text>
          <View style={s.xpBg}>
            <View style={[s.xpFill, { width: `${home.xpPct}%` as any }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.xpText}>Progress</Text>
            <Text style={s.xpText}>{home.xpPct}%</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaText}>🏅 {home.badges} Badges</Text>
            <Text style={s.metaText}>📍 이번 레벨 {home.progress}/{home.requiredCount}</Text>
          </View>
        </TouchableOpacity>

        {/* 오늘의 미션 */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>🔥 Today's Challenge</Text>
          <Text style={s.sectionSub}>Level {home.level}</Text>
        </View>

        {loadError ? (
          <View style={s.errorBox}>
            <Text style={s.emptyText}>오늘의 미션을 불러오지 못했어요.</Text>
            <TouchableOpacity style={s.retryBtn} onPress={() => setReloadTick((v) => v + 1)}>
              <Text style={s.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : challenges.length === 0 ? (
          <Text style={s.emptyText}>이 레벨의 요리를 찾을 수 없어요.</Text>
        ) : (
          // 타베로그 참고: 썸네일을 위에 크게, 정보는 아래에 - explore.tsx/levels.tsx와
          // 같은 방향이지만 이 화면엔 카드가 1~2개뿐이라 그리드가 아니라 세로로 쌓는다.
          challenges.map((dish) => {
            const thumb = dish.image || fallbackPhotos[dish.id];
            return (
              <TouchableOpacity
                key={dish.id}
                style={s.missionCard}
                activeOpacity={0.85}
                onPress={() => startMission(dish)}
              >
                <View style={s.missionImageWrap}>
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={s.missionImage}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={s.missionImageFallback}>
                      <Text style={{ fontSize: 40 }}>🍽️</Text>
                    </View>
                  )}
                  {completedIds.has(dish.id) && (
                    <View style={s.doneBadge}>
                      <Text style={s.doneBadgeText}>완료</Text>
                    </View>
                  )}
                </View>
                <View style={s.missionBody}>
                  <Text style={s.missionNameKr}>{dish.name_kr}</Text>
                  <Text style={s.missionNameEn}>{dish.name_en}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={s.missionDesc} numberOfLines={1}>{dish.category}</Text>
                      <SpiceIcon level={dish.spice_level ?? 0} />
                    </View>
                    <View style={s.missionBtn}>
                      <Text style={{ fontSize: 16 }}>📷</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: 18, paddingTop: 54 },
  appTitle: { fontSize: 20, fontWeight: "bold", color: "#222" },
  greeting: { fontSize: 13, color: "#888", marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FF7043", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  logoutBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F5F5F5" },
  logoutText: { fontSize: 12, color: "#888", fontWeight: "600" },
  iconBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#F5F5F5",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnText: { fontSize: 15 },
  levelCard: { margin: 14, borderRadius: 18, backgroundColor: "#FF5722", padding: 18 },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  levelLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  levelBadge: { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, fontSize: 12, fontWeight: "bold" },
  levelTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 14 },
  xpLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 },
  xpBg: { height: 7, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  xpFill: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  xpText: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginBottom: 10 },
  metaRow: { flexDirection: "row", gap: 16 },
  metaText: { fontSize: 12, color: "rgba(255,255,255,0.9)" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#222" },
  sectionSub: { fontSize: 12, color: "#888" },
  // 오늘의 미션 카드 (타베로그 참고: 썸네일을 위에 크게)
  missionCard: {
    backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 12, borderRadius: 16,
    overflow: "hidden", borderWidth: 0.5, borderColor: "#eee",
  },
  missionImageWrap: { width: "100%", aspectRatio: 16 / 10, backgroundColor: "#FFF0EC", position: "relative" },
  missionImage: { width: "100%", height: "100%" },
  missionImageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  doneBadge: {
    position: "absolute", top: 10, right: 10, backgroundColor: "#4CAF50",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  doneBadgeText: { fontSize: 11, fontWeight: "bold", color: "#fff" },
  missionBody: { padding: 14 },
  missionNameKr: { fontSize: 17, fontWeight: "bold", color: "#222" },
  missionNameEn: { fontSize: 12, color: "#FF5722", marginTop: 2 },
  missionDesc: { fontSize: 12, color: "#888" },
  missionBtn: { width: 40, height: 40, backgroundColor: "#FF5722", borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: "#999", textAlign: "center", marginTop: 20 },
  errorBox: { alignItems: "center", marginTop: 20, gap: 12 },
  retryBtn: {
    backgroundColor: "#FF5722", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },
});