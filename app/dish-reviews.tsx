import { useAuth } from "@/src/contexts/AuthContext";
import {
  addReply,
  addReview,
  getReplies,
  getReviews,
  Review,
  ReviewReply,
} from "@/src/firebase/dishService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function timeAgo(createdAt: Review["createdAt"]) {
  if (!createdAt) return "방금 전";
  const ms = createdAt.seconds * 1000;
  const diffMin = Math.floor((Date.now() - ms) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function DishReviewsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ dishId: string; name_kr: string }>();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReview, setNewReview] = useState("");
  const [posting, setPosting] = useState(false);

  const [openReplies, setOpenReplies] = useState<Record<string, ReviewReply[] | undefined>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);

  const load = async () => {
    if (!params.dishId) return;
    setLoading(true);
    try {
      const list = await getReviews(params.dishId);
      setReviews(list);
    } catch (err) {
      console.error("리뷰 로딩 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dishId]);

  const handlePostReview = async () => {
    const content = newReview.trim();
    if (!content || !user || posting) return;
    setPosting(true);
    try {
      await addReview(
        params.dishId,
        user.uid,
        user.displayName || "익명",
        content
      );
      setNewReview("");
      await load();
    } catch (err) {
      console.error("리뷰 작성 오류:", err);
    } finally {
      setPosting(false);
    }
  };

  const toggleReplies = async (reviewId: string) => {
    if (openReplies[reviewId] !== undefined) {
      // 이미 열려 있으면 접기
      setOpenReplies((prev) => ({ ...prev, [reviewId]: undefined }));
      return;
    }
    setLoadingReplies((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const replies = await getReplies(reviewId);
      setOpenReplies((prev) => ({ ...prev, [reviewId]: replies }));
    } catch (err) {
      console.error("대댓글 로딩 오류:", err);
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handlePostReply = async (reviewId: string) => {
    const content = (replyDrafts[reviewId] ?? "").trim();
    if (!content || !user || postingReplyFor) return;
    setPostingReplyFor(reviewId);
    try {
      await addReply(reviewId, user.uid, user.displayName || "익명", content);
      setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
      const replies = await getReplies(reviewId);
      setOpenReplies((prev) => ({ ...prev, [reviewId]: replies }));
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, replyCount: r.replyCount + 1 } : r))
      );
    } catch (err) {
      console.error("대댓글 작성 오류:", err);
    } finally {
      setPostingReplyFor(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{params.name_kr} 리뷰</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color="#FF5722" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {reviews.length === 0 && (
              <View style={s.emptyBox}>
                <Text style={{ fontSize: 30 }}>💬</Text>
                <Text style={s.emptyText}>아직 리뷰가 없어요. 첫 리뷰를 남겨보세요!</Text>
              </View>
            )}

            {reviews.map((review) => {
              const replies = openReplies[review.id];
              const isOpen = replies !== undefined;
              return (
                <View key={review.id} style={s.reviewCard}>
                  <View style={s.reviewHeaderRow}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{review.userName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.reviewUser}>{review.userName}</Text>
                      <Text style={s.reviewTime}>{timeAgo(review.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={s.reviewContent}>{review.content}</Text>

                  <TouchableOpacity onPress={() => toggleReplies(review.id)} style={s.replyToggle}>
                    <Text style={s.replyToggleText}>
                      {isOpen ? "▲ 답글 숨기기" : `▼ 답글 ${review.replyCount > 0 ? review.replyCount : ""} 보기`}
                    </Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={s.repliesBox}>
                      {loadingReplies[review.id] ? (
                        <ActivityIndicator color="#FF5722" />
                      ) : (
                        <>
                          {(replies ?? []).map((reply) => (
                            <View key={reply.id} style={s.replyRow}>
                              <Text style={s.replyUser}>{reply.userName}</Text>
                              <Text style={s.replyContent}>{reply.content}</Text>
                              <Text style={s.replyTime}>{timeAgo(reply.createdAt)}</Text>
                            </View>
                          ))}
                          <View style={s.replyInputRow}>
                            <TextInput
                              style={s.replyInput}
                              placeholder="답글 달기..."
                              placeholderTextColor="#aaa"
                              value={replyDrafts[review.id] ?? ""}
                              onChangeText={(t) =>
                                setReplyDrafts((prev) => ({ ...prev, [review.id]: t }))
                              }
                              editable={postingReplyFor !== review.id}
                            />
                            <TouchableOpacity
                              style={s.replySendBtn}
                              onPress={() => handlePostReply(review.id)}
                              disabled={postingReplyFor === review.id}
                            >
                              {postingReplyFor === review.id ? (
                                <ActivityIndicator size="small" color="#FF5722" />
                              ) : (
                                <Text style={s.replySendText}>등록</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={s.composer}>
          <TextInput
            style={s.composerInput}
            placeholder={user ? "이 요리에 대한 리뷰를 남겨보세요" : "로그인 후 리뷰를 남길 수 있어요"}
            placeholderTextColor="#aaa"
            value={newReview}
            onChangeText={setNewReview}
            editable={!!user && !posting}
            multiline
          />
          <TouchableOpacity
            style={[s.composerBtn, (!newReview.trim() || !user) && s.composerBtnDisabled]}
            onPress={handlePostReview}
            disabled={!newReview.trim() || !user || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={s.composerBtnText}>등록</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#222", flex: 1, textAlign: "center", marginHorizontal: 8 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: "#999", fontSize: 13 },
  reviewCard: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: "#eee",
  },
  reviewHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFE0D2",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontWeight: "bold", color: "#FF5722", fontSize: 13 },
  reviewUser: { fontSize: 13, fontWeight: "bold", color: "#222" },
  reviewTime: { fontSize: 11, color: "#aaa", marginTop: 1 },
  reviewContent: { fontSize: 14, color: "#333", lineHeight: 20, marginTop: 10 },
  replyToggle: { marginTop: 10 },
  replyToggleText: { fontSize: 12, color: "#FF5722", fontWeight: "bold" },
  repliesBox: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#f0f0f0", gap: 10,
  },
  replyRow: {
    backgroundColor: "#F8F8F8", borderRadius: 10, padding: 10,
  },
  replyUser: { fontSize: 12, fontWeight: "bold", color: "#444" },
  replyContent: { fontSize: 13, color: "#333", marginTop: 3, lineHeight: 18 },
  replyTime: { fontSize: 10, color: "#aaa", marginTop: 4 },
  replyInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  replyInput: {
    flex: 1, backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 13, color: "#222",
  },
  replySendBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FFF0EC",
  },
  replySendText: { color: "#FF5722", fontWeight: "bold", fontSize: 12 },
  composer: {
    flexDirection: "row", gap: 10, padding: 14, paddingBottom: 20, backgroundColor: "#fff",
    borderTopWidth: 0.5, borderTopColor: "#eee", alignItems: "flex-end",
  },
  composerInput: {
    flex: 1, backgroundColor: "#F5F5F5", borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: "#222", maxHeight: 90,
  },
  composerBtn: {
    backgroundColor: "#FF5722", borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 12, alignItems: "center", justifyContent: "center",
  },
  composerBtnDisabled: { backgroundColor: "#FFC3AC" },
  composerBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});
