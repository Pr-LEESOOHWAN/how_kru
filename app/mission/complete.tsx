import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import { markDishCompleted } from "@/src/firebase/dishService";

export default function MissionCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
  }>();
  const saved = useRef(false);

  useEffect(() => {
    if (saved.current || !params.dishId || !user) return;
    saved.current = true;
    markDishCompleted(user.uid, params.dishId).catch((err) => {
      // 화면은 그대로 진행하되(사용자 경험 방해 X), 콘솔에는 남겨서 저장 실패를 추적 가능하게 함
      console.error("[mission/complete] markDishCompleted failed:", err);
    });
  }, [params.dishId, user]);

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

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
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
