import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MISSION_COMPLETE_XP } from "@/src/firebase/dishService";
import { useI18n, type MessageKey } from "@/src/i18n";
import { categoryLabel, dishName, dishSubName } from "@/src/i18n/content";
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

  return (
    <Screen>
      <ScreenHeader title={t("mission.startTitle")} />

      {/* 사진 + 설명 + 미션 안내 + 보상/리뷰 링크까지 세로로 길어서 작은 화면(예: iPhone SE)에서
          잘리지 않게 스크롤하고, "미션 시작하기" 버튼은 아래에 고정한다. */}
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <View style={s.photo}>
            {params.image ? (
              <Image source={{ uri: params.image }} style={s.photoImg} contentFit="cover" transition={150} />
            ) : (
              <Icons.BowlFood size={56} color={theme.colors.primary} weight="duotone" />
            )}
          </View>
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
  hero: { alignItems: "center", gap: t.space.sm },
  photo: {
    width: 132,
    height: 132,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: t.space.sm,
    boxShadow: t.elevation.card,
  },
  photoImg: { width: "100%", height: "100%" },
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
