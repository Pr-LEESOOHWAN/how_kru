import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const USER = {
  name: "Alex",
  level: 3,
  levelName: "Real Local Starter",
  xp: 65,
  badges: 4,
  streak: 7,
};

// id는 Firestore "dishes" 컬렉션의 실제 문서 ID와 일치해야 합니다.
// (이전에는 "1"/"2"였는데, 이러면 mission/kick.tsx의 getDish()와
// mission/complete.tsx의 markDishCompleted()가 존재하지 않는 요리 ID로
// 동작해서 킥 질문이 항상 기본값으로 뜨고, levels.tsx의 완료 스탬프도
// 절대 표시되지 않는 문제가 있었습니다.)
const TODAY_CHALLENGES = [
  { id: "bibimbap", name: "Bibimbap", name_kr: "비빔밥", desc: "Mixed rice with vegetables & gochujang", spice: 2 },
  { id: "tteokbokki", name: "Tteokbokki", name_kr: "떡볶이", desc: "Spicy rice cakes in gochujang sauce", spice: 7 },
];

const SpiceIcon = ({ level }: { level: number }) => (
  <View style={{ flexDirection: "row" }}>
    {Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={{ fontSize: 11, opacity: i < level ? 1 : 0.2 }}>🌶️</Text>
    ))}
  </View>
);

export default function HomeScreen() {
  const router = useRouter();

  const startMission = (dish: (typeof TODAY_CHALLENGES)[number]) => {
    router.push({
      pathname: "/mission/start",
      params: {
        dishId: dish.id,
        name_kr: dish.name_kr,
        name_en: dish.name,
        desc: dish.desc,
        spice: String(dish.spice),
      },
    });
  };

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={s.header}>
          <View>
            <Text style={s.appTitle}>HOW KRU 🌶️</Text>
            <Text style={s.greeting}>Welcome back, {USER.name}!</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>A</Text>
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
            <Text style={s.levelBadge}>Lv.{USER.level}</Text>
          </View>
          <Text style={s.levelTitle}>{USER.levelName}</Text>
          <Text style={s.xpLabel}>XP Progress</Text>
          <View style={s.xpBg}>
            <View style={[s.xpFill, { width: `${USER.xp}%` as any }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.xpText}>Progress</Text>
            <Text style={s.xpText}>{USER.xp}%</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaText}>🏅 {USER.badges} Badges</Text>
            <Text style={s.metaText}>🔥 {USER.streak} Day Streak</Text>
          </View>
        </TouchableOpacity>

        {/* 오늘의 미션 */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>🔥 Today's Challenge</Text>
          <Text style={s.sectionSub}>Level {USER.level}</Text>
        </View>

        {TODAY_CHALLENGES.map((dish) => (
          <View key={dish.id} style={s.missionCard}>
            <View style={s.missionEmoji}>
              <Text style={{ fontSize: 32 }}>🍽️</Text>
            </View>
            <View style={s.missionBody}>
              <Text style={s.missionNameKr}>{dish.name_kr}</Text>
              <Text style={s.missionNameEn}>{dish.name}</Text>
              <Text style={s.missionDesc} numberOfLines={2}>{dish.desc}</Text>
              <SpiceIcon level={dish.spice} />
            </View>
            <TouchableOpacity style={s.missionBtn} onPress={() => startMission(dish)}>
              <Text style={{ fontSize: 18 }}>📷</Text>
            </TouchableOpacity>
          </View>
        ))}

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
  missionCard: { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 14, marginBottom: 12, borderRadius: 14, overflow: "hidden", borderWidth: 0.5, borderColor: "#eee", alignItems: "center" },
  missionEmoji: { width: 80, height: 90, backgroundColor: "#FFF0EC", alignItems: "center", justifyContent: "center" },
  missionBody: { flex: 1, padding: 12, gap: 3 },
  missionNameKr: { fontSize: 15, fontWeight: "bold", color: "#222" },
  missionNameEn: { fontSize: 12, color: "#FF5722" },
  missionDesc: { fontSize: 12, color: "#888", lineHeight: 16 },
  missionBtn: { width: 44, height: 44, backgroundColor: "#FF5722", borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 12 },
});