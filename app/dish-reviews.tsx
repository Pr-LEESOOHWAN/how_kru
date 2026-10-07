import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import {
  addReply,
  addReview,
  getReplies,
  getReviews,
  type Review,
  type ReviewReply,
  uploadReviewPhoto,
} from "@/src/firebase/dishService";
import { useI18n } from "@/src/i18n";
import { dishName } from "@/src/i18n/content";
import { timeAgo } from "@/src/lib/timeAgo";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import {
  Card,
  Icons,
  PressableScale,
  Screen,
  ScreenHeader,
  Skeleton,
  StateView,
  Text,
  triggerHaptic,
} from "@/src/ui";

export default function DishReviewsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const { user } = useAuth();
  // restaurantId/restaurantName은 미션 완료 화면의 "이 식당에 리뷰 남기기"에서 넘어올 때만
  // 채워진다. foodPhotoUri: 방금 미션 인증에 쓴 요리 사진의 로컬 URI(있으면 리뷰 사진 기본값).
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en?: string;
    restaurantId?: string;
    restaurantName?: string;
    foodPhotoUri?: string;
  }>();
  const verifiedPhotoUri =
    typeof params.foodPhotoUri === "string" && params.foodPhotoUri ? params.foodPhotoUri : null;
  const title = dishName(
    { id: params.dishId, name_kr: params.name_kr, name_en: params.name_en || params.name_kr },
    language
  );
  const authorName = user?.displayName || t("common.anonymous");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [newReview, setNewReview] = useState("");
  const [posting, setPosting] = useState(false);
  // 미션 완료 → "리뷰 남기기"로 들어온 경우, 방금 인증에 쓴 요리 사진을 기본으로 붙여둔다.
  const [photoUri, setPhotoUri] = useState<string | null>(verifiedPhotoUri);

  const [openReplies, setOpenReplies] = useState<Record<string, ReviewReply[] | undefined>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null);

  // 첫 진입엔 loading=true로 시작하므로 여기선 로딩 표시를 켜지 않는다(다시 불러오기는 reload).
  const fetchReviews = async () => {
    if (!params.dishId) return;
    try {
      setReviews(await getReviews(params.dishId));
      setLoadError(false);
    } catch (err) {
      // 로딩 실패를 "아직 리뷰가 없어요"로 잘못 보여주지 않도록 별도 에러 상태로 구분
      console.error("리뷰 로딩 오류:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 상태는 응답(await 이후)에서만 바뀐다 - 린터가 catch 블록을 보수적으로 잡는 경우라 여기서만 끈다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.dishId]);

  const reload = () => {
    setLoading(true);
    setLoadError(false);
    return fetchReviews();
  };

  const permissionDenied = (titleKey: "perm.cameraTitle" | "perm.libraryTitle", bodyKey: "perm.cameraBody" | "perm.libraryBody") => {
    // 한 번 거부하면 OS가 권한 창을 다시 안 띄우는 기기가 많아서 설정 앱으로 바로 보내준다.
    Alert.alert(t(titleKey), t(bodyKey), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.openSettings"), onPress: () => Linking.openSettings() },
    ]);
  };

  // 카메라로 촬영 / 앨범에서 선택 중 고르게 한다. launch* 함수는 카메라 사용 불가(에뮬레이터 등),
  // 다른 앱이 카메라를 점유 중일 때 예외를 던지므로 잡아서 알려준다.
  const pickPhoto = () => {
    Alert.alert(t("reviews.addPhoto"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("reviews.takePhoto"),
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) return permissionDenied("perm.cameraTitle", "perm.cameraBody");
            const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
            if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
          } catch (err) {
            console.error("리뷰 사진 촬영 오류:", err);
            Alert.alert(t("reviews.cameraFailed"), t("common.tryAgainLater"));
          }
        },
      },
      {
        text: t("reviews.chooseLibrary"),
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) return permissionDenied("perm.libraryTitle", "perm.libraryBody");
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
            if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
          } catch (err) {
            console.error("리뷰 사진 선택 오류:", err);
            Alert.alert(t("reviews.libraryFailed"), t("common.tryAgainLater"));
          }
        },
      },
    ]);
  };

  const handlePostReview = async () => {
    const content = newReview.trim();
    if (!content || !user || posting) return;
    setPosting(true);
    try {
      // 사진을 골랐으면 리뷰 문서를 만들기 전에 먼저 Storage에 올려 URL을 받아온다.
      const imageUrl = photoUri ? await uploadReviewPhoto(user.uid, photoUri) : undefined;
      await addReview(
        params.dishId,
        user.uid,
        authorName,
        content,
        imageUrl,
        params.restaurantId && params.restaurantName
          ? { id: params.restaurantId, name: params.restaurantName }
          : undefined
      );
      triggerHaptic("light");
      setNewReview("");
      setPhotoUri(null);
      // 목록을 스켈레톤으로 비우지 않고 조용히 새로고침한다(방금 쓴 글이 깜빡이지 않게).
      await fetchReviews();
    } catch (err) {
      // 입력한 내용은 남겨서 다시 시도할 수 있게 한다.
      console.error("리뷰 작성 오류:", err);
      Alert.alert(t("reviews.postFailed"), t("common.tryAgainLater"));
    } finally {
      setPosting(false);
    }
  };

  const toggleReplies = async (reviewId: string) => {
    // 이미 불러오는 중이면 연타해도 중복 요청/접기 하지 않음
    if (loadingReplies[reviewId]) return;
    if (openReplies[reviewId] !== undefined) {
      setOpenReplies((prev) => ({ ...prev, [reviewId]: undefined }));
      return;
    }
    // 빈 배열로 먼저 열어 로딩 표시를 바로 보여주고, 실패하면 다시 닫아 재시도할 수 있게 한다.
    setOpenReplies((prev) => ({ ...prev, [reviewId]: [] }));
    setLoadingReplies((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const replies = await getReplies(reviewId);
      setOpenReplies((prev) => ({ ...prev, [reviewId]: replies }));
    } catch (err) {
      console.error("대댓글 로딩 오류:", err);
      setOpenReplies((prev) => ({ ...prev, [reviewId]: undefined }));
      Alert.alert(t("reviews.repliesLoadFailed"), t("common.checkConnection"));
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [reviewId]: false }));
    }
  };

  const handlePostReply = async (reviewId: string) => {
    const content = (replyDrafts[reviewId] ?? "").trim();
    if (!content || !user || postingReplyFor) return;
    setPostingReplyFor(reviewId);
    try {
      await addReply(reviewId, user.uid, authorName, content);
    } catch (err) {
      console.error("대댓글 작성 오류:", err);
      Alert.alert(t("reviews.replyFailed"), t("common.tryAgainLater"));
      setPostingReplyFor(null);
      return;
    }

    // 여기까지 왔으면 답글은 이미 서버에 저장된 상태. 목록 새로고침만 실패해도 "등록 실패"로
    // 안내하면 사용자가 다시 눌러 같은 답글이 두 번 달린다 - 그래서 저장과 새로고침을 분리했다.
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: "" }));
    setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, replyCount: r.replyCount + 1 } : r)));
    try {
      const replies = await getReplies(reviewId);
      setOpenReplies((prev) => ({ ...prev, [reviewId]: replies }));
    } catch (err) {
      // 새로고침만 실패: 방금 쓴 답글을 임시로 붙여둔다(다음에 접었다 펴면 서버 목록으로 채워짐).
      console.error("대댓글 새로고침 오류:", err);
      setOpenReplies((prev) => ({
        ...prev,
        [reviewId]: [
          ...(prev[reviewId] ?? []),
          { id: `local-${Date.now()}`, userId: user.uid, userName: authorName, content, createdAt: null },
        ],
      }));
    } finally {
      setPostingReplyFor(null);
    }
  };

  const canPost = !!newReview.trim() && !!user && !posting;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Screen>
        <ScreenHeader title={t("reviews.title", { dish: title })} />

        {params.restaurantName ? (
          <View style={s.banner}>
            <Icons.MapPin size={16} color={theme.colors.primaryText} weight="fill" />
            <Text variant="caption" color="primaryText" numberOfLines={1} style={s.bannerText}>
              {t("reviews.atRestaurant", { restaurant: params.restaurantName })}
            </Text>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {loading ? (
            [0, 1].map((i) => (
              <Card key={i} style={s.skeletonCard}>
                <View style={s.reviewHead}>
                  <Skeleton width={36} height={36} radius={18} />
                  <View style={{ flex: 1, gap: theme.space.xs }}>
                    <Skeleton width="40%" height={13} />
                    <Skeleton width="25%" height={10} />
                  </View>
                </View>
                <Skeleton height={13} />
                <Skeleton width="80%" height={13} />
              </Card>
            ))
          ) : loadError ? (
            <StateView
              icon={Icons.WifiSlash}
              tone="danger"
              title={t("reviews.loadError")}
              message={t("common.checkConnection")}
              actionLabel={t("common.retry")}
              onAction={reload}
            />
          ) : reviews.length === 0 ? (
            <StateView icon={Icons.ChatCircleDots} title={t("reviews.empty")} message={t("reviews.emptyHint")} />
          ) : (
            reviews.map((review) => {
              const replies = openReplies[review.id];
              const isOpen = replies !== undefined;
              const toggleLabel = isOpen
                ? t("reviews.hideReplies")
                : review.replyCount > 0
                  ? t("reviews.showReplies", { count: review.replyCount })
                  : t("reviews.reply");
              return (
                <Card key={review.id} style={s.reviewCard}>
                  <View style={s.reviewHead}>
                    <View style={s.avatar}>
                      <Text variant="bodyStrong" style={s.avatarText}>
                        {review.userName.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {review.userName}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {timeAgo(review.createdAt, language)}
                      </Text>
                    </View>
                  </View>

                  <Text variant="body">{review.content}</Text>

                  {review.restaurantName ? (
                    <View style={s.placeRow}>
                      <Icons.MapPin size={14} color={theme.colors.primaryText} weight="fill" />
                      <Text variant="caption" color="primaryText" numberOfLines={1}>
                        {review.restaurantName}
                      </Text>
                    </View>
                  ) : null}

                  {review.imageUrl ? (
                    <Image source={{ uri: review.imageUrl }} style={s.reviewImage} contentFit="cover" transition={150} />
                  ) : null}

                  <PressableScale
                    onPress={() => toggleReplies(review.id)}
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={toggleLabel}
                    style={s.replyToggle}
                    hitSlop={6}
                  >
                    <Icons.ChatCircleDots size={16} color={theme.colors.primaryText} />
                    <Text variant="caption" color="primaryText" style={s.bold}>
                      {toggleLabel}
                    </Text>
                  </PressableScale>

                  {isOpen ? (
                    <View style={s.replies}>
                      {loadingReplies[review.id] ? (
                        <ActivityIndicator color={theme.colors.primary} />
                      ) : (
                        <>
                          {(replies ?? []).map((reply) => (
                            <View key={reply.id} style={s.reply}>
                              <View style={s.replyHead}>
                                <Text variant="caption" style={s.bold}>
                                  {reply.userName}
                                </Text>
                                <Text variant="caption" color="textTertiary">
                                  {timeAgo(reply.createdAt, language)}
                                </Text>
                              </View>
                              <Text variant="callout">{reply.content}</Text>
                            </View>
                          ))}
                          <View style={s.replyInputRow}>
                            <TextInput
                              style={s.replyInput}
                              placeholder={t("reviews.replyPlaceholder")}
                              placeholderTextColor={theme.colors.textTertiary}
                              selectionColor={theme.colors.primary}
                              accessibilityLabel={t("reviews.replyPlaceholder")}
                              value={replyDrafts[review.id] ?? ""}
                              onChangeText={(text) => setReplyDrafts((prev) => ({ ...prev, [review.id]: text }))}
                              editable={postingReplyFor !== review.id}
                              maxLength={200}
                            />
                            <PressableScale
                              onPress={() => handlePostReply(review.id)}
                              disabled={postingReplyFor === review.id || !(replyDrafts[review.id] ?? "").trim()}
                              accessibilityLabel={t("reviews.send")}
                              style={[s.replySend, !(replyDrafts[review.id] ?? "").trim() && s.dim]}
                            >
                              {postingReplyFor === review.id ? (
                                <ActivityIndicator size="small" color={theme.colors.primaryText} />
                              ) : (
                                <Text variant="caption" color="primaryText" style={s.bold}>
                                  {t("reviews.send")}
                                </Text>
                              )}
                            </PressableScale>
                          </View>
                        </>
                      )}
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}
        </ScrollView>

        <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, theme.space.md) }]}>
          {photoUri ? (
            <View style={s.previewRow}>
              <View style={s.previewWrap}>
                <Image source={{ uri: photoUri }} style={s.preview} contentFit="cover" />
                <PressableScale
                  onPress={() => setPhotoUri(null)}
                  disabled={posting}
                  accessibilityLabel={t("reviews.removePhoto")}
                  style={[s.previewRemove, posting && s.dim]}
                  hitSlop={8}
                >
                  <Icons.X size={12} color="#FFFFFF" weight="bold" />
                </PressableScale>
              </View>
              {photoUri === verifiedPhotoUri ? (
                <View style={s.verifiedTag}>
                  <Icons.SealCheck size={16} color={theme.colors.success} weight="fill" />
                  <Text variant="caption" color="success" style={s.bold}>
                    {t("reviews.verifiedPhoto")}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* 인증 사진이 있는데 지금 안 붙어 있으면(뺐거나 다른 걸로 바꾼 경우) 한 번에 다시 붙인다.
              Alert에 넣으면 Android가 버튼 4개를 다 못 보여줘서 별도 버튼으로 뺐다. */}
          {verifiedPhotoUri && photoUri !== verifiedPhotoUri ? (
            <PressableScale onPress={() => setPhotoUri(verifiedPhotoUri)} disabled={posting} style={s.reattach}>
              <Icons.SealCheck size={16} color={theme.colors.success} weight="fill" />
              <Text variant="caption" color="success" style={s.bold}>
                {t("reviews.attachVerified")}
              </Text>
            </PressableScale>
          ) : null}

          <View style={s.composerRow}>
            <PressableScale
              onPress={pickPhoto}
              disabled={!user || posting}
              accessibilityLabel={t("reviews.addPhoto")}
              style={[s.iconBtn, (!user || posting) && s.dim]}
            >
              <Icons.Camera size={22} color={theme.colors.textSecondary} />
            </PressableScale>
            <TextInput
              style={s.composerInput}
              placeholder={user ? t("reviews.composerPlaceholder") : t("reviews.composerLoggedOut")}
              placeholderTextColor={theme.colors.textTertiary}
              selectionColor={theme.colors.primary}
              accessibilityLabel={t("reviews.composerPlaceholder")}
              value={newReview}
              onChangeText={setNewReview}
              editable={!!user && !posting}
              multiline
              maxLength={500}
            />
            <PressableScale
              onPress={handlePostReview}
              disabled={!canPost}
              haptic="none"
              accessibilityLabel={t("reviews.send")}
              style={[s.sendBtn, !canPost && s.sendBtnOff]}
            >
              {posting ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Icons.ArrowRight size={20} color={theme.colors.onPrimary} weight="bold" />
              )}
            </PressableScale>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    backgroundColor: t.colors.primaryTint,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm + t.space.xxs,
  },
  bannerText: { flex: 1, fontWeight: "600" },
  list: { padding: t.space.lg, gap: t.space.md, paddingBottom: t.space.xxl },
  skeletonCard: { gap: t.space.md },
  reviewCard: { gap: t.space.md },
  reviewHead: { flexDirection: "row", alignItems: "center", gap: t.space.md },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: t.colors.primaryText },
  placeRow: { flexDirection: "row", alignItems: "center", gap: t.space.xs },
  reviewImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: t.radius.md, backgroundColor: t.colors.surfaceAlt },
  replyToggle: { flexDirection: "row", alignItems: "center", gap: t.space.xs + t.space.xxs, alignSelf: "flex-start", minHeight: 32 },
  bold: { fontWeight: "700" },
  replies: { gap: t.space.sm, paddingTop: t.space.md, borderTopWidth: 1, borderTopColor: t.colors.border },
  reply: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.space.md, gap: t.space.xs },
  replyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  replyInputRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  replyInput: {
    flex: 1,
    ...t.type.callout,
    color: t.colors.text,
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm + t.space.xxs,
  },
  replySend: {
    minWidth: 52,
    height: 40,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.md,
  },
  dim: { opacity: 0.4 },

  composer: {
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.md,
    gap: t.space.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: t.space.md },
  previewWrap: { width: 60, height: 60 },
  preview: { width: 60, height: 60, borderRadius: t.radius.md, backgroundColor: t.colors.surfaceAlt },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: t.radius.pill,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedTag: { flexDirection: "row", alignItems: "center", gap: t.space.xs },
  reattach: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    alignSelf: "flex-start",
    backgroundColor: t.colors.successTint,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: t.space.sm },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    ...t.type.body,
    color: t.colors.text,
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.md,
    paddingHorizontal: t.space.md + t.space.xxs,
    paddingTop: t.space.md - 2,
    paddingBottom: t.space.md - 2,
    minHeight: 44,
    maxHeight: 110,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primaryFill,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { opacity: 0.35 },
}));
