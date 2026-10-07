// 요리 카드 - 홈(히어로형)과 탐색/레벨(그리드형)에서 공용.
//
// 예전엔 세 화면이 각자 거의 같은 카드(사진 + No. 배지 + 완료 도장 + 이름 + 고추)를
// 복붙해서 그렸고 스타일 이름까지 같았다. 이제 한 곳에서 그린다.

import { Image } from "expo-image";
import { View } from "react-native";

import type { Dish } from "@/src/firebase/dishService";
import { useI18n } from "@/src/i18n";
import { categoryLabel, dishName, dishSubName } from "@/src/i18n/content";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Badge, Card, Icons, SpiceMeter, Text } from "@/src/ui";

export type DishCardDish = Pick<Dish, "id" | "name_kr" | "name_en"> &
  Partial<Pick<Dish, "no" | "category" | "spice_level" | "image">>;

export type DishCardProps = {
  dish: DishCardDish;
  /** 공식 사진이 없을 때 대신 쓸 리뷰 사진 */
  fallbackImage?: string;
  completed?: boolean;
  onPress?: () => void;
  variant?: "grid" | "hero";
  /** 히어로형 카드 하단에 행동 유도 라벨을 보여준다 */
  ctaLabel?: string;
  accessibilityHint?: string;
};

export function DishCard({
  dish,
  fallbackImage,
  completed = false,
  onPress,
  variant = "grid",
  ctaLabel,
  accessibilityHint,
}: DishCardProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();

  const hero = variant === "hero";
  const thumb = dish.image || fallbackImage;
  const name = dishName(dish, language);
  const sub = dishSubName(dish, language);
  const category = categoryLabel(dish.category, language);
  const spice = dish.spice_level ?? 0;

  const a11y = [
    name,
    sub,
    category,
    spice === 0 ? t("common.notSpicy") : t("common.spiceA11y", { level: spice }),
    completed ? t("common.completed") : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card
      padding={0}
      onPress={onPress}
      accessibilityLabel={a11y}
      accessibilityHint={accessibilityHint}
      style={hero ? undefined : s.gridCard}
    >
      <View style={[s.media, { aspectRatio: hero ? 16 / 10 : 1 }]}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={s.image} contentFit="cover" transition={150} accessibilityIgnoresInvertColors />
        ) : (
          <View style={s.placeholder}>
            <Icons.BowlFood size={hero ? 48 : 36} color={theme.colors.primary} weight="duotone" />
          </View>
        )}
        {!hero && dish.no != null ? (
          <Badge label={t("common.dishNo", { no: dish.no })} tone="onImage" size="sm" style={s.topLeft} />
        ) : null}
        {completed ? (
          <Badge
            label={t("common.completed")}
            tone="success"
            icon={Icons.CheckCircle}
            size="sm"
            style={hero ? s.topRight : s.bottomRight}
          />
        ) : null}
      </View>

      <View style={hero ? s.heroBody : s.gridBody}>
        <Text variant={hero ? "title3" : "bodyStrong"} numberOfLines={1} style={hero ? s.heroName : undefined}>
          {name}
        </Text>
        <Text variant="caption" color="textTertiary" numberOfLines={1}>
          {sub}
        </Text>

        {hero ? (
          <View style={s.heroMeta}>
            <View style={s.heroMetaLeft}>
              {category ? (
                <Text variant="caption" color="textSecondary" numberOfLines={1} style={s.flexShrink}>
                  {category}
                </Text>
              ) : null}
              <SpiceMeter level={spice} />
            </View>
            {ctaLabel ? (
              <View style={s.cta}>
                <Icons.Camera size={16} color={theme.colors.onPrimary} weight="bold" />
                <Text variant="caption" style={s.ctaText} numberOfLines={1}>
                  {ctaLabel}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={s.gridSpice}>
            <SpiceMeter level={spice} size={11} />
          </View>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  gridCard: { flex: 1 },
  media: { width: "100%", backgroundColor: t.colors.primaryTint },
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  topLeft: { position: "absolute", top: t.space.sm, left: t.space.sm },
  topRight: { position: "absolute", top: t.space.md, right: t.space.md },
  bottomRight: { position: "absolute", bottom: t.space.sm, right: t.space.sm },
  gridBody: { padding: t.space.md - 2, gap: t.space.xxs },
  gridSpice: { marginTop: t.space.xs },
  heroBody: { padding: t.space.lg, gap: t.space.xxs },
  heroName: { fontWeight: "700" },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: t.space.sm,
    gap: t.space.md,
  },
  heroMetaLeft: { flexDirection: "row", alignItems: "center", gap: t.space.sm, flexShrink: 1 },
  flexShrink: { flexShrink: 1 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    backgroundColor: t.colors.primaryFill,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
  },
  ctaText: { color: t.colors.onPrimary, fontWeight: "700", fontSize: 13 },
}));
