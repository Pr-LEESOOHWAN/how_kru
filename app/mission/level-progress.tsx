import { useAuth } from "@/src/contexts/AuthContext";
import { getProgressInLevel, getUser, levelUp } from "@/src/firebase/dishService";
import { db } from "@/src/firebase/firebaseConfig";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const MAX_LEVEL = 12;
// 데이터를 못 불러온 경우(비로그인 게스트 등)를 위한 안전한 기본값
const FALLBACK = { level: 3, title: "Real Local Starter", prevPct: 65, newPct: 65, badges: 0 };

type LevelDoc = { title?: string; required_count?: number };

export default function LevelProgressScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{ name_kr: string }>();

  const [loading, setLoading] = useState(true);
  const [display, setDisplay] = useState(FALLBACK);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const user = await getUser(authUser.uid);
        const level = Math.min(user?.current_level ?? 1, MAX_LEVEL);

        const [levelSnap, progress] = await Promise.all([
          getDoc(doc(db, "levels", String(level))),
          getProgressInLevel(authUser.uid, level),
        ]);
        const levelData = (levelSnap.exists() ? levelSnap.data() : {}) as LevelDoc;
        const requiredCount = levelData.required_count ?? Math.max(progress, 1);

        const prevProgress = Math.max(0, progress - 1);
        const prevPct = Math.min(100, Math.round((prevProgress / requiredCount) * 100));
        const newPct = Math.min(100, Math.round((progress / requiredCount) * 100));
        const didLevelUp = progress >= requiredCount && level < MAX_LEVEL;

        let shownLevel = level;
        let shownTitle = levelData.title ?? `Level ${level}`;

        if (didLevelUp) {
          try {
            await levelUp(authUser.uid, level);
            shownLevel = level + 1;
            const nextSnap = await getDoc(doc(db, "levels", String(shownLevel)));
            shownTitle = nextSnap.exists() ? (nextSnap.data() as LevelDoc).title ?? shownTitle : shownTitle;
          } catch (err) {
            // 레벨업 저장에 실패해도 화면은 그대로 진행(사용자 경험 방해 X), 콘솔에는 남김
            console.error("[mission/level-progress] levelUp failed:", err);
          }
        }

        if (!cancelled) {
          setDisplay({
            level: shownLevel,
            title: shownTitle,
            prevPct: didLevelUp ? newPct : prevPct,
            newPct: didLevelUp ? 100 : newPct,
            badges: user?.completed_dishes?.length ?? 0,
          });
          setLeveledUp(didLevelUp);
        }
      } catch (err) {
        console.error("[mission/level-progress] 진행률 로딩 오류:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const goHome = () => {
    router.dismissAll();
    router.replace("/(tabs)");
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.center}>
          <ActivityIndicator color="#FF5722" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={s.kicker}>LEVEL {display.level}</Text>
        <Text style={s.levelName}>{display.title}</Text>

        <View style={s.card}>
          <View style={s.xpRow}>
            <Text style={s.xpLabel}>XP Progress</Text>
            <Text style={s.xpValue}>{display.newPct}%</Text>
          </View>
          <View style={s.xpBg}>
            <View style={[s.xpFillOld, { width: `${display.prevPct}%` as any }]} />
            <View
              style={[
                s.xpFillNew,
                { left: `${display.prevPct}%` as any, width: `${Math.max(0, display.newPct - display.prevPct)}%` as any },
              ]}
            />
          </View>
          <Text style={s.xpDelta}>
            {leveledUp ? "레벨 업! 🎉" : `+${Math.max(0, display.newPct - display.prevPct)}% 상승했어요 🎉`}
          </Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Text style={s.metaValue}>🏅 {display.badges}</Text>
              <Text style={s.metaLabel}>완료한 요리</Text>
            </View>
          </View>
        </View>

        <Text style={s.footNote}>
          {leveledUp
            ? params.name_kr
              ? `${params.name_kr} 미션 완료로 레벨이 올랐어요!`
              : "미션 완료로 레벨이 올랐어요!"
            : params.name_kr
              ? `${params.name_kr} 미션 완료! 다음 레벨까지 조금 더 남았어요.`
              : "미션 완료! 다음 레벨까지 조금 더 남았어요."}
        </Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={goHome}>
          <Text style={s.primaryBtnText}>다음 미션 보러가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  kicker: { fontSize: 13, color: "#FF5722", fontWeight: "bold", letterSpacing: 1 },
  levelName: { fontSize: 24, fontWeight: "bold", color: "#222", marginTop: 4, marginBottom: 24 },
  card: {
    width: "100%", backgroundColor: "#FF5722", borderRadius: 20, padding: 20,
  },
  xpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  xpLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  xpValue: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  xpBg: { height: 10, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 5, overflow: "hidden", position: "relative" },
  xpFillOld: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 5 },
  xpFillNew: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#fff", borderRadius: 5 },
  xpDelta: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 8 },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  metaItem: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 12, alignItems: "center" },
  metaValue: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  metaLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  footNote: { fontSize: 13, color: "#888", marginTop: 22, textAlign: "center" },
  footer: { padding: 20, paddingBottom: 32 },
  primaryBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
