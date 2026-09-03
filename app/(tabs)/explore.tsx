import { useAuth } from "@/src/contexts/AuthContext";
import { useLanguage } from "@/src/contexts/LanguageContext";
import { logOut } from "@/src/firebase/authService";
import { db } from "@/src/firebase/firebaseConfig";
import { getFallbackDishPhoto } from "@/src/firebase/dishService";
import { t } from "@/src/i18n/strings";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
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
  const { language } = useLanguage();
  const [grouped, setGrouped] = useState<GroupedDishes>({});
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  // 로딩 실패를 "메뉴가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
  // (dish-reviews.tsx 등 다른 화면에서 이미 쓰던 패턴을 여기에도 적용)
  const [loadError, setLoadError] = useState(false);
  // 공식 사진(dish.image)이 없는 요리만, 유저 리뷰 사진으로 보완한 썸네일.
  // dishId -> imageUrl. 메인 목록 로딩을 막지 않도록 별도로, 조용히 채워진다.
  const [fallbackPhotos, setFallbackPhotos] = useState<Record<string, string>>({});

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

      // 공식 사진이 없는 요리에 한해서만 리뷰 사진으로 보완 시도. 목록 렌더링을
      // 기다리게 하지 않고 백그라운드로 채워서 로딩된 카드마다 순차적으로 나타난다.
      // 실패해도(리뷰 없음 포함) 그냥 기존 🍽️ 이모지 자리표시자로 남을 뿐이라 조용히 무시.
      const missing = data.filter((d) => !d.image);
      missing.forEach((d) => {
        getFallbackDishPhoto(d.id)
          .then((url) => {
            if (url) setFallbackPhotos((prev) => ({ ...prev, [d.id]: url }));
          })
          .catch(() => {});
      });
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

              {/* 음식 카드 그리드 (토글 시 표시) - 타베로그 참고: 썸네일을 크게 */}
              {openCategories.has(cat) && (
                <View style={s.dishGrid}>
                  {grouped[cat].map((dish) => {
                    const thumb = dish.image || fallbackPhotos[dish.id];
                    return (
                    <TouchableOpacity
                      key={dish.id}
                      style={s.dishCard}
                      onPress={() => setSelectedDish(dish)}
                      activeOpacity={0.85}
                    >
                      <View style={s.dishCardImageWrap}>
                        {thumb ? (
                          <Image
                            source={{ uri: thumb }}
                            style={s.dishCardImage}
                            contentFit="cover"
                            transition={150}
                          />
                        ) : (
                          <View style={s.dishCardImageFallback}>
                            <Text style={{ fontSize: 34 }}>🍽️</Text>
                          </View>
                        )}
                        <View style={s.dishCardNoBadge}>
                          <Text style={s.dishCardNoBadgeText}>No.{dish.no}</Text>
                        </View>
                      </View>
                      <View style={s.dishCardBody}>
                        <Text style={s.dishCardNameKr} numberOfLines={1}>{dish.name_kr}</Text>
                        <Text style={s.dishCardNameEn} numberOfLines={1}>{dish.name_en}</Text>
                        <View style={s.dishCardSpiceRow}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Text
                              key={i}
                              style={[s.dishCardSpiceIcon, i >= (dish.spice_level ?? 0) && s.dishCardSpiceIconOff]}
                            >
                              🌶️
                            </Text>
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                    );
                  })}
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

  // 음식 카드 그리드 (2열, 타베로그 참고 - 썸네일을 크게)
  dishGrid: {
    flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between",
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
    borderTopWidth: 0.5, borderTopColor: "#f0f0f0",
  },
  dishCard: {
    width: "48%", backgroundColor: "#fff", borderRadius: 14, overflow: "hidden",
    marginBottom: 12, borderWidth: 0.5, borderColor: "#eee",
  },
  dishCardImageWrap: { width: "100%", aspectRatio: 1, backgroundColor: "#FFF0EC", position: "relative" },
  dishCardImage: { width: "100%", height: "100%" },
  dishCardImageFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  dishCardNoBadge: {
    position: "absolute", top: 8, left: 8, backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  dishCardNoBadgeText: { fontSize: 10, color: "#fff", fontWeight: "bold" },
  dishCardBody: { padding: 10 },
  dishCardNameKr: { fontSize: 14, fontWeight: "700", color: "#222" },
  dishCardNameEn: { fontSize: 11, color: "#888", marginTop: 2 },
  dishCardSpiceRow: { flexDirection: "row", marginTop: 6 },
  dishCardSpiceIcon: { fontSize: 10 },
  dishCardSpiceIconOff: { opacity: 0.2 },

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
