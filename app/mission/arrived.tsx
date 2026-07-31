import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ArrivedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
    address: string;
  }>();

  const handleNext = () => {
    router.push({ pathname: "/mission/verify", params });
  };

  return (
    <View style={s.root}>
      <View style={s.center}>
        <View style={s.badge}>
          <Text style={{ fontSize: 56 }}>📍</Text>
        </View>
        <Text style={s.title}>도착하셨나요?</Text>
        <Text style={s.subtitle}>{params.restaurantName}</Text>
        <Text style={s.desc}>
          이제 상호와 {params.name_kr} 사진을 찍어{"\n"}미션을 인증해주세요.
        </Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={handleNext}>
          <Text style={s.primaryBtnText}>사진으로 인증하기 📷</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.back()}>
          <Text style={s.secondaryBtnText}>아직 도착 전이에요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  badge: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: "#FFF0EC",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#222", marginBottom: 6 },
  subtitle: { fontSize: 16, color: "#FF5722", fontWeight: "600", marginBottom: 16 },
  desc: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 22 },
  footer: { padding: 20, paddingBottom: 32, gap: 10 },
  primaryBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  secondaryBtn: { paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { color: "#999", fontSize: 14 },
});
