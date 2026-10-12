import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getDish, getFallbackDishPhoto, MISSION_COMPLETE_XP } from "@/src/firebase/dishService";
import { useI18n, type MessageKey } from "@/src/i18n";
import { categoryLabel, dishName, dishSubName } from "@/src/i18n/content";
import { normalizeStorageUrl } from "@/src/lib/storageUrl";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Badge, Button, Card, Icons, Screen, ScreenHeader, SpiceMeter, Text } from "@/src/ui";

const STEPS: { icon: Icons.Icon; labelKey: MessageKey }[] = [
  { icon: Icons.Storefront, labelKey: "mission.step1" },
  { icon: Icons.NavigationArrow, labelKey: "mission.step2" },
  { icon: Icons.Camera, labelKey: "mission.step3" },
  { icon: Icons.Medal, labelKey: "mission.step4" },
];

export default function MissionStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    category?: string;
    level?: string;
    spice: string;
    image?: string;
    // 홈/레벨 목록에서 이미 완료한 요리를 다시 눌렀을 때 "1". 완료 화면에서
    // XP가 +0으로 뜨기 전에 미리 알려주기 위한 용도(보상 문구만 바꿈, 미션은 그대로 진행 가능).
    completed?: string;
  }>();
  const spice = Number(params.spice ?? 0);
  const alreadyCompleted = params.completed === "1";
  const dish = { id: params.dishId, name_kr: params.name_kr, name_en: params.name_en };
  const meta = [
    categoryLabel(params.category, language),
    params.level ? t("common.levelShort", { level: params.level }) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // 요리 사진: 목록 화면이 넘겨준 썸네일을 먼저 쓰고, 없으면(딥링크·탐색 시트 등) 여기서 직접
  // 요리 문서의 공식 사진 → 리뷰 사진 순으로 찾는다. 예전엔 사진이 안 넘어오면 작은 원 안에
  // 아이콘만 보였고, 넘어와도 로딩 중엔 빈 원으로 보였다.
  // (파라미터는 첫 렌더 뒤에 채워질 수 있어서 상태 초기값으로 굳히지 않고 매번 계산한다.
  //  화면 이동 중 Storage URL의 %2F가 풀려 400이 나는 경우도 normalizeStorageUrl로 되살린다.)
  const [fetchedPhoto, setFetchedPhoto] = useState<string | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const passed = params.image ? normalizeStorageUrl(params.image) : null;
  const photo = passed ?? fetchedPhoto;
  useEffect(() => {
    if (params.image || !params.dishId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getDish(params.dishId);
        const url = data?.image || (await getFallbackDishPhoto(params.dishId));
        if (!cancelled && url) setFetchedPhoto(url);
      } catch {
        // 사진은 부가 정보 - 못 찾으면 아이콘 자리표시를 그대로 둔다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.image, params.dishId]);

  return (
    <Screen>
      <ScreenHeader title={t("mission.startTitle")} />

      {/* 사진 + 설명 + 미션 안내 + 보상/리뷰 링크까지 세로로 길어서 작은 화면(예: iPhone SE)에서
          잘리지 않게 스크롤하고, "미션 시작하기" 버튼은 아래에 고정한다. */}
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {/* 요리를 처음 보는 외국인에게는 이름보다 사진이 먼저다 - 화면 폭 가득 4:3으로 크게 보여준다.
            아이콘 자리표시를 아래에 깔아 두어 사진을 불러오는 동안이나 실패해도 빈 칸으로 보이지 않게 한다. */}
        <View style={s.photo} accessible accessibilityRole="image" accessibilityLabel={dishName(dish, language)}>
          <Icons.BowlFood size={64} color={theme.colors.primary} weight="duotone" />
          {photo && photo !== failedPhoto ? (
            <Image
              source={{ uri: photo }}
              style={s.photoImg}
              contentFit="cover"
              transition={200}
              onError={() => setFailedPhoto(photo)}
            />
          ) : null}
        </View>

        <View style={s.hero}>
          <Text variant="display" align="center" accessibilityRole="header">
            {dishName(dish, language)}
          </Text>
          <Text variant="body" color="primaryText" align="center">
            {dishSubName(dish, language)}
          </Text>
          <SpiceMeter level={spice} size={16} showMildLabel />
          {meta ? (
            <Text variant="callout" color="textTertiary" align="center">
              {meta}
            </Text>
          ) : null}
        </View>

        <Card>
          <Text variant="title3" style={s.guideTitle} accessibilityRole="header">
            {t("mission.guideTitle")}
          </Text>
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const last = i === STEPS.length - 1;
            return (
              <View key={step.labelKey} style={s.step}>
                <View style={s.stepRail}>
                  <View style={s.stepIcon}>
                    <StepIcon size={18} color={theme.colors.primaryText} weight="bold" />
                  </View>
                  {!last ? <View style={s.connector} /> : null}
                </View>
                <Text variant="bodyStrong" style={s.stepLabel}>
                  {t(step.labelKey)}
                </Text>
              </View>
            );
          })}
        </Card>

        <View style={s.rewardRow}>
          {alreadyCompleted ? (
            <Badge tone="neutral" icon={Icons.CheckCircle} label={t("mission.alreadyDone")} />
          ) : (
            <Badge tone="brand" icon={Icons.Medal} label={t("mission.reward", { xp: MISSION_COMPLETE_XP })} />
          )}
        </View>

        <View style={s.center}>
          <Button
            title={t("mission.viewReviews")}
            variant="ghost"
            icon={Icons.ChatCircleDots}
            onPress={() =>
              router.push({
                pathname: "/dish-reviews",
                params: { dishId: params.dishId, name_kr: params.name_kr, name_en: params.name_en },
              })
            }
          />
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
        <Button
          title={t("mission.startCta")}
          size="lg"
          fullWidth
          onPress={() => router.push({ pathname: "/mission/choose-restaurant", params })}
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  body: { padding: t.space.xl, gap: t.space.xl, paddingBottom: t.space.xxxl },
  hero: { alignItems: "center", gap: t.space.sm, marginTop: -t.space.sm },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: t.radius.xl,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    boxShadow: t.elevation.card,
  },
  photoImg: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  guideTitle: { fontWeight: "700", marginBottom: t.space.md },
  step: { flexDirection: "row", gap: t.space.md },
  stepRail: { alignItems: "center", width: 36 },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: { width: 2, height: t.space.lg, backgroundColor: t.colors.border, marginVertical: t.space.xxs },
  stepLabel: { flex: 1, paddingTop: t.space.sm },
  rewardRow: { alignItems: "center" },
  center: { alignItems: "center" },
  footer: {
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));
