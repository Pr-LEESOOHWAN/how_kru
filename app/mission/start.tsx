import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SpiceIcon = ({ level }: { level: number }) => (
  <View style={{ flexDirection: "row" }}>
    {Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={{ fontSize: 15, opacity: i < level ? 1 : 0.2 }}>🌶️</Text>
    ))}
  </View>
);

const STEPS = [
  { icon: "🏪", label: "근처 식당 선택하기" },
  { icon: "🧭", label: "길찾기로 이동하기" },
  { icon: "📷", label: "상호 · 요리 사진 인증하기" },
  { icon: "🏅", label: "XP와 뱃지 획득하기" },
];

export default function MissionStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    desc: string;
    spice: string;
  }>();
  const spice = Number(params.spice ?? 1);

  const handleStart = () => {
    router.push({
      pathname: "/mission/choose-restaurant",
      params,
    });
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>미션 시작</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.body}>
        <View style={s.dishCard}>
          <Text style={{ fontSize: 56 }}>🍽️</Text>
        </View>

        <Text style={s.nameKr}>{params.name_kr}</Text>
        <Text style={s.nameEn}>{params.name_en}</Text>
        <SpiceIcon level={spice} />
        <Text style={s.desc}>{params.desc}</Text>

        <View style={s.stepsCard}>
          <Text style={s.stepsTitle}>미션 안내</Text>
          {STEPS.map((step, i) => (
            <View key={step.label} style={s.stepRow}>
              <View style={s.stepIconBox}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              </View>
              <Text style={s.stepLabel}>{step.label}</Text>
              {i < STEPS.length - 1 && <View style={s.stepConnector} />}
            </View>
          ))}
        </View>

        <View style={s.rewardPill}>
          <Text style={s.rewardText}>완료 시 보상 +50 XP 🏅</Text>
        </View>

        <TouchableOpacity
          style={s.reviewLink}
          onPress={() =>
            router.push({
              pathname: "/dish-reviews",
              params: { dishId: params.dishId, name_kr: params.name_kr },
            })
          }
        >
          <Text style={s.reviewLinkText}>💬 이 요리 리뷰 보기</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        <TouchableOpacity style={s.startBtn} onPress={handleStart}>
          <Text style={s.startBtnText}>미션 시작하기</Text>
        </TouchableOpacity>
      </View>
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
  body: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 28 },
  dishCard: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFF0EC",
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  nameKr: { fontSize: 26, fontWeight: "bold", color: "#222" },
  nameEn: { fontSize: 15, color: "#FF5722", marginTop: 2, marginBottom: 8 },
  desc: { fontSize: 14, color: "#888", textAlign: "center", marginTop: 10, lineHeight: 20 },
  stepsCard: {
    width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 18,
    marginTop: 26, borderWidth: 0.5, borderColor: "#eee",
  },
  stepsTitle: { fontSize: 14, fontWeight: "bold", color: "#222", marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 18, position: "relative" },
  stepIconBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFF0EC",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  stepLabel: { fontSize: 14, color: "#333", fontWeight: "600" },
  stepConnector: {
    position: "absolute", left: 17, top: 36, width: 2, height: 18, backgroundColor: "#FFE0D6",
  },
  rewardPill: {
    marginTop: 20, backgroundColor: "#FFF0EC", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  rewardText: { color: "#FF5722", fontWeight: "bold", fontSize: 13 },
  reviewLink: { marginTop: 14, paddingVertical: 8 },
  reviewLinkText: { color: "#888", fontWeight: "600", fontSize: 13, textDecorationLine: "underline" },
  footer: { padding: 20, paddingBottom: 32 },
  startBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  startBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
