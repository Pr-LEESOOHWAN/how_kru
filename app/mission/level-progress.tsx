import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// TODO: 실제 유저 진행률(dishService.getProgressInLevel 등)로 교체. 지금은 데모용 고정 값입니다.
const CURRENT_LEVEL = 3;
const LEVEL_NAME = "Real Local Starter";
const PREV_XP = 65;
const NEW_XP = 80;
const BADGES = 5;

export default function LevelProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name_kr: string }>();

  const goHome = () => {
    router.dismissAll();
    router.replace("/(tabs)");
  };

  return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={s.kicker}>LEVEL {CURRENT_LEVEL}</Text>
        <Text style={s.levelName}>{LEVEL_NAME}</Text>

        <View style={s.card}>
          <View style={s.xpRow}>
            <Text style={s.xpLabel}>XP Progress</Text>
            <Text style={s.xpValue}>{NEW_XP}%</Text>
          </View>
          <View style={s.xpBg}>
            <View style={[s.xpFillOld, { width: `${PREV_XP}%` as any }]} />
            <View style={[s.xpFillNew, { left: `${PREV_XP}%` as any, width: `${NEW_XP - PREV_XP}%` as any }]} />
          </View>
          <Text style={s.xpDelta}>+{NEW_XP - PREV_XP}% 상승했어요 🎉</Text>

          <View style={s.metaRow}>
            <View style={s.metaItem}>
              <Text style={s.metaValue}>🏅 {BADGES}</Text>
              <Text style={s.metaLabel}>Badges</Text>
            </View>
            <View style={s.metaItem}>
              <Text style={s.metaValue}>🔥 7</Text>
              <Text style={s.metaLabel}>Day Streak</Text>
            </View>
          </View>
        </View>

        <Text style={s.footNote}>
          {params.name_kr ? `${params.name_kr} 미션 완료로 레벨이 올랐어요!` : "미션 완료로 레벨이 올랐어요!"}
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
