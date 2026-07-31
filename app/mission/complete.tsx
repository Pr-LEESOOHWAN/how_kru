import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { markDishCompleted } from "@/src/firebase/dishService";

// TODO: 실제 로그인 연동 후 로그인된 유저 id로 교체.
const DEMO_USER_ID = "guest";

export default function MissionCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
  }>();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current || !params.dishId) return;
    saved.current = true;
    markDishCompleted(DEMO_USER_ID, params.dishId).catch(() => {
      // 오프라인/유저 미생성 등은 조용히 무시 (추후 에러 처리 보강)
    });
  }, [params.dishId]);

  const handleNext = () => {
    router.push({ pathname: "/mission/kick", params });
  };

  return (
    <View style={s.root}>
      <View style={s.center}>
        <Text style={s.emoji}>🎉</Text>
        <Text style={s.title}>미션 완료!</Text>
        <Text style={s.dishName}>{params.name_kr} 인증 성공</Text>

        <View style={s.rewardRow}>
          <View style={s.rewardCard}>
            <Text style={s.rewardValue}>+50</Text>
            <Text style={s.rewardLabel}>XP</Text>
          </View>
          <View style={s.rewardCard}>
            <Text style={s.rewardValue}>🏅</Text>
            <Text style={s.rewardLabel}>New Badge</Text>
          </View>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={handleNext}>
          <Text style={s.primaryBtnText}>다음으로</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emoji: { fontSize: 72, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: "bold", color: "#222", marginBottom: 6 },
  dishName: { fontSize: 15, color: "#888", marginBottom: 28 },
  rewardRow: { flexDirection: "row", gap: 14 },
  rewardCard: {
    width: 120, backgroundColor: "#FFF0EC", borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
  },
  rewardValue: { fontSize: 24, fontWeight: "bold", color: "#FF5722" },
  rewardLabel: { fontSize: 12, color: "#993C1D", marginTop: 4, fontWeight: "600" },
  footer: { padding: 20, paddingBottom: 32 },
  primaryBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
