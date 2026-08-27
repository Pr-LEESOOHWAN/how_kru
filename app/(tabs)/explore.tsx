import { useAuth } from "@/src/contexts/AuthContext";
import { logOut } from "@/src/firebase/authService";
import { db } from "@/src/firebase/firebaseConfig";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// ─── 타입 ──────────────────────────────────────────
// dishService.ts의 Dish와 동일한 실제 Firestore "dishes" 컬렉션 스키마.
// (이 화면은 예전에 없어진 "dishes_800" 컬렉션 + desc_kr/desc_en 필드를 기준으로
// 작성돼 있었는데, 실제 데이터에는 그런 컬렉션/필드가 없어 항상 빈 목록만 떴었음)
type Dish = {
  id: string;
  no: number;
  category: string;
  name_kr: string;
  name_en: string;
  spice_level?: number;
  tags?: string[];
  kick_question?: string;
  image?: string;
};

type GroupedDishes = {
  [category: string]: Dish[];
};

export default function HomeScreen() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [grouped, setGrouped] = useState<GroupedDishes>({});
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  // 로딩 실패를 "메뉴가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
  // (dish-reviews.tsx 등 다른 화면에서 이미 쓰던 패턴을 여기에도 적용)
  const [loadError, setLoadError] = useState(false);

  // Firebase "dishes" 컬렉션에서 데이터 가져오기
  const fetchDishes = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const snapshot = await getDocs(collection(db, "dishes"));
      const data: Dish[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Dish, "id">),
      }));

      // 카테고리별로 그룹화
      const groups: GroupedDishes = {};
      data.forEach((dish) => {
        const cat = dish.category || "기타";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(dish);
      });

      // 카테고리 내 번호 순 정렬
      Object.keys(groups).forEach((cat) => {
        groups[cat].sort((a, b) => Number(a.no) - Number(b.no));
      });

      setGrouped(groups);
    } catch (err) {
      console.error("데이터 로딩 오류:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = authUser?.displayName || authUser?.email?.split("@")[0] || "친구";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          logOut().catch((err) => console.error("[explore] 로그아웃 오류:", err));
        },
      },
    ]);
  };

  // 카테고리 토글
  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const categories = Object.keys(grouped);

  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 헤더 ── */}
        <View style={s.header}>
          <View>
            <Text style={s.appTitle}>HOW KRU 🌶️</Text>
            <Text style={s.greeting}>Welcome back, {displayName}!</Text>
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

        {/* ── 한식 메뉴 탐색 ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>🍽️ Korean Food Menu</Text>
          <Text style={s.sectionSub}>{Object.values(grouped).flat().length} dishes</Text>
        </View>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={s.loadingText}>Loading menus...</Text>
          </View>
        ) : loadError ? (
          <View style={s.loadingBox}>
            <Text style={{ fontSize: 30 }}>⚠️</Text>
            <Text style={s.loadingText}>메뉴를 불러오지 못했어요.</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchDishes}>
              <Text style={s.retryBtnText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : categories.length === 0 ? (
          <View style={s.loadingBox}>
            <Text style={{ fontSize: 30 }}>🍽️</Text>
            <Text style={s.loadingText}>표시할 메뉴가 없어요.</Text>
          </View>
        ) : (
          categories.map((cat) => (
            <View key={cat} style={s.categoryBlock}>

              {/* 카테고리 헤더 (토글 버튼) */}
              <TouchableOpacity
                style={s.categoryHeader}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
              >
                <View style={s.categoryLeft}>
                  <View style={s.categoryDot} />
                  <Text style={s.categoryName}>{cat}</Text>
                  <View style={s.countBadge}>
                    <Text style={s.countText}>{grouped[cat].length}</Text>
                  </View>
                </View>
                <Text style={s.chevron}>
                  {openCategories.has(cat) ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {/* 음식 리스트 (토글 시 표시) */}
              {openCategories.has(cat) && (
                <View style={s.dishList}>
                  {grouped[cat].map((dish) => (
                    <TouchableOpacity
                      key={dish.id}
                      style={s.dishRow}
                      onPress={() => setSelectedDish(dish)}
                      activeOpacity={0.6}
                    >
                      <View style={s.dishNoBox}>
                        <Text style={s.dishNo}>{dish.no}</Text>
                      </View>
                      <View style={s.dishTextBox}>
                        <Text style={s.dishNameKr}>{dish.name_kr}</Text>
                        <Text style={s.dishNameEn} numberOfLines={1}>
                          {dish.name_en}
                        </Text>
                      </View>
                      <Text style={s.dishArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── 음식 상세 모달 ── */}
      <Modal
        visible={!!selectedDish}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDish(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDish(null)}
        />
        {selectedDish && (
          <View style={s.modalSheet}>

            {/* 핸들 */}
            <View style={s.modalHandle} />

            {/* 닫기 버튼 */}
            <TouchableOpacity
              style={s.closeBtn}
              onPress={() => setSelectedDish(null)}
            >
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>

            {/* 내용이 길면(설명 텍스트 등) 75% 높이 안에서 잘리지 않고 스크롤되도록 감쌈 */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* 번호 배지 */}
              <View style={s.modalNoBadge}>
                <Text style={s.modalNoText}>No. {selectedDish.no}</Text>
              </View>

              {/* 요리명 */}
              <Text style={s.modalNameKr}>{selectedDish.name_kr}</Text>
              <Text style={s.modalNameEn}>{selectedDish.name_en}</Text>

              {/* 카테고리 태그 */}
              <View style={s.modalTagRow}>
                <View style={s.modalTag}>
                  <Text style={s.modalTagText}>{selectedDish.category}</Text>
                </View>
              </View>

              {/* 구분선 */}
              <View style={s.divider} />

              {/* 맵기 */}
              <View style={s.descBlock}>
                <View style={s.descLangBadge}>
                  <Text style={s.descLangText}>맵기</Text>
                </View>
                <Text style={s.descText}>
                  {selectedDish.spice_level
                    ? "🌶️".repeat(Math.max(1, Math.min(5, selectedDish.spice_level)))
                    : "안매워요"}
                </Text>
              </View>

              {/* 태그 */}
              {!!selectedDish.tags?.length && (
                <View style={s.descBlock}>
                  <View style={[s.descLangBadge, s.descLangBadgeEn]}>
                    <Text style={[s.descLangText, s.descLangTextEn]}>특징</Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {selectedDish.tags.map((tag) => (
                      <View key={tag} style={s.modalTag}>
                        <Text style={s.modalTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* 킥(즐기는 방법) */}
              {!!selectedDish.kick_question && (
                <View style={[s.descBlock, { marginBottom: 4 }]}>
                  <View style={[s.descLangBadge, s.descLangBadgeEn]}>
                    <Text style={[s.descLangText, s.descLangTextEn]}>이렇게 즐겨보세요</Text>
                  </View>
                  <Text style={s.descText}>{selectedDish.kick_question}</Text>
                </View>
              )}
            </ScrollView>

          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },

  // 헤더
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", padding: 18, paddingTop: 54,
  },
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

  // 섹션 헤더
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#222" },
  sectionSub: { fontSize: 12, color: "#888" },

  // 로딩
  loadingBox: { alignItems: "center", padding: 40, gap: 12 },
  loadingText: { color: "#888", fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: 4, backgroundColor: "#FF5722", borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 13, fontWeight: "bold" },

  // 카테고리 블록
  categoryBlock: { marginHorizontal: 14, marginBottom: 8, borderRadius: 14, overflow: "hidden", backgroundColor: "#fff", borderWidth: 0.5, borderColor: "#eee" },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5722" },
  categoryName: { fontSize: 14, fontWeight: "bold", color: "#222" },
  countBadge: { backgroundColor: "#FFF0EC", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countText: { fontSize: 11, color: "#FF5722", fontWeight: "600" },
  chevron: { fontSize: 11, color: "#888" },

  // 음식 리스트
  dishList: { borderTopWidth: 0.5, borderTopColor: "#f0f0f0" },
  dishRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: "#f5f5f5", gap: 12 },
  dishNoBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#FFF0EC", alignItems: "center", justifyContent: "center" },
  dishNo: { fontSize: 11, color: "#FF5722", fontWeight: "bold" },
  dishTextBox: { flex: 1 },
  dishNameKr: { fontSize: 14, fontWeight: "600", color: "#222" },
  dishNameEn: { fontSize: 12, color: "#888", marginTop: 1 },
  dishArrow: { fontSize: 18, color: "#ccc" },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingTop: 16, maxHeight: "75%",
  },
  modalHandle: { width: 36, height: 4, backgroundColor: "#e0e0e0", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  closeBtn: { position: "absolute", top: 20, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, color: "#888" },
  modalNoBadge: { backgroundColor: "#FFF0EC", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8 },
  modalNoText: { fontSize: 12, color: "#FF5722", fontWeight: "bold" },
  modalNameKr: { fontSize: 26, fontWeight: "bold", color: "#222", marginBottom: 4 },
  modalNameEn: { fontSize: 15, color: "#666", marginBottom: 12 },
  modalTagRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  modalTag: { backgroundColor: "#F5F5F5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modalTagText: { fontSize: 12, color: "#555" },
  divider: { height: 0.5, backgroundColor: "#eee", marginBottom: 16 },
  descBlock: { marginBottom: 16 },
  descLangBadge: { backgroundColor: "#E8F5E9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start", marginBottom: 6 },
  descLangText: { fontSize: 11, color: "#388E3C", fontWeight: "bold" },
  descLangBadgeEn: { backgroundColor: "#E3F2FD" },
  descLangTextEn: { color: "#1565C0" },
  descText: { fontSize: 14, color: "#444", lineHeight: 22 },
});
