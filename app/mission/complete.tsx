import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import { markDishCompleted } from "@/src/firebase/dishService";

const CONFETTI = ["🎉", "✨", "🎊", "⭐️", "🎈"];
const CONFETTI_COUNT = 10;

export default function MissionCompleteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  // placeId/restaurantName은 choose-restaurant.tsx에서 식당을 고른 시점에 params에
  // 실려서 navigate → arrived → verify를 거쳐 그대로 여기까지 넘어온다(각 화면이
  // router.push할 때 ...params로 통째로 이어받아 넘김). "이 식당에 리뷰 남기기"에 씀.
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    placeId?: string;
    restaurantName?: string;
  }>();
  const saved = useRef(false);

  // 이모지/텍스트 등장 애니메이션
  const emojiScale = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(16)).current;
  const rewardScale = useRef(new Animated.Value(0.6)).current;

  // 컨페티 파티클 (랜덤 위치/이모지는 최초 1회만 계산해서 리렌더에도 안 바뀌게 함)
  const confetti = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        emoji: CONFETTI[i % CONFETTI.length],
        left: `${8 + Math.random() * 84}%` as const,
        delay: Math.random() * 300,
        duration: 1100 + Math.random() * 700,
        rotate: Math.random() > 0.5 ? "1" : "-1",
      })),
    []
  );
  const confettiAnims = useRef(confetti.map(() => new Animated.Value(0))).current;

  // 완료 기록 저장. 실패하면 조용히 넘어가지 않고 재시도 기회를 준다 —
  // 여기서 저장이 안 되면 뒤이어 나오는 킥/레벨 진행 화면이 전부 "이 요리는
  // 완료 안 됨" 기준으로 계산돼서, 축하 화면은 봤는데 레벨/완료 목록엔
  // 반영이 안 되는 상황이 생긴다.
  const saveCompletion = () => {
    if (!params.dishId || !user) return;
    markDishCompleted(user.uid, params.dishId).catch((err) => {
      console.error("[mission/complete] markDishCompleted failed:", err);
      Alert.alert(
        "완료 기록 저장 실패",
        "네트워크 문제로 미션 완료가 저장되지 않았어요. 다시 시도할까요?",
        [
          { text: "나중에", style: "cancel" },
          { text: "다시 시도", onPress: saveCompletion },
        ]
      );
    });
  };

  useEffect(() => {
    if (saved.current || !params.dishId || !user) return;
    saved.current = true;
    saveCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dishId, user]);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(emojiScale, {
        toValue: 1,
        friction: 4,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(rewardScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    Animated.stagger(
      70,
      confettiAnims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: confetti[i].duration,
          delay: confetti[i].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    router.push({ pathname: "/mission/kick", params });
  };

  // 미션 완료 직후가 "방금 그 식당에서 찍은 사진"을 가장 구하기 쉬운 시점이라 여기에
  // 진입점을 둠. 이 리뷰는 restaurantId가 함께 저장되어(dishService.addReview)
  // choose-restaurant.tsx 식당 목록의 썸네일 후보로도 쓰인다(getRestaurantThumbnail).
  const handleReview = () => {
    router.push({
      pathname: "/dish-reviews",
      params: {
        dishId: params.dishId,
        name_kr: params.name_kr,
        ...(params.placeId && params.restaurantName
          ? { restaurantId: params.placeId, restaurantName: params.restaurantName }
          : {}),
      },
    });
  };

  return (
    <View style={s.root}>
      {/* 컨페티 파티클 */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {confetti.map((c, i) => {
          const anim = confettiAnims[i];
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 420],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.15, 0.8, 1],
            outputRange: [0, 1, 1, 0],
          });
          const rotate = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [`0deg`, `${Number(c.rotate) * 360}deg`],
          });
          return (
            <Animated.Text
              key={i}
              style={[
                s.confettiEmoji,
                { left: c.left, opacity, transform: [{ translateY }, { rotate }] },
              ]}
            >
              {c.emoji}
            </Animated.Text>
          );
        })}
      </View>

      <View style={s.center}>
        <Animated.Text style={[s.emoji, { transform: [{ scale: emojiScale }] }]}>
          🎉
        </Animated.Text>

        <Animated.View
          style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}
        >
          <Text style={s.title}>미션 완료!</Text>
          <Text style={s.dishName}>{params.name_kr} 인증 성공</Text>
        </Animated.View>

        <Animated.View style={[s.rewardRow, { transform: [{ scale: rewardScale }] }]}>
          <View style={s.rewardCard}>
            <Text style={s.rewardValue}>+50</Text>
            <Text style={s.rewardLabel}>XP</Text>
          </View>
          <View style={s.rewardCard}>
            <Text style={s.rewardValue}>🏅</Text>
            <Text style={s.rewardLabel}>New Badge</Text>
          </View>
        </Animated.View>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 32) }]}>
        {params.placeId && params.restaurantName && (
          <TouchableOpacity style={s.secondaryBtn} onPress={handleReview}>
            <Text style={s.secondaryBtnText}>📷 {params.restaurantName} 리뷰 남기기</Text>
          </TouchableOpacity>
        )}
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
  title: { fontSize: 26, fontWeight: "bold", color: "#222", marginBottom: 6, textAlign: "center" },
  dishName: { fontSize: 15, color: "#888", marginBottom: 28, textAlign: "center" },
  rewardRow: { flexDirection: "row", gap: 14 },
  rewardCard: {
    width: 120, backgroundColor: "#FFF0EC", borderRadius: 16,
    paddingVertical: 18, alignItems: "center",
  },
  rewardValue: { fontSize: 24, fontWeight: "bold", color: "#FF5722" },
  rewardLabel: { fontSize: 12, color: "#993C1D", marginTop: 4, fontWeight: "600" },
  footer: { padding: 20, paddingBottom: 32, gap: 10 },
  primaryBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  secondaryBtn: {
    backgroundColor: "#FFF0EC", borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  secondaryBtnText: { color: "#FF5722", fontSize: 14, fontWeight: "bold" },
  confettiEmoji: { position: "absolute", top: 0, fontSize: 22 },
});
