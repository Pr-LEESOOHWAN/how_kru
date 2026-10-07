import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { dishName } from "@/src/i18n/content";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { motion } from "@/src/theme/tokens";
import { Button, Icons, Screen, Text } from "@/src/ui";

export default function ArrivedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t, language } = useI18n();
  const s = useStyles();
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
    address: string;
  }>();
  const dish = dishName({ id: params.dishId, name_kr: params.name_kr, name_en: params.name_en }, language);

  // 미션 중 한 번 보는 화면이라 가벼운 등장 모션을 준다(자주 보는 화면은 모션 없음 - Emil 원칙).
  const appear = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    appear.value = withTiming(1, { duration: motion.duration.slow, easing: Easing.bezier(...motion.easing.out) });
  }, [appear]);
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.92 + appear.value * 0.08 }],
  }));

  return (
    <Screen style={s.root}>
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Animated.View style={[s.badge, badgeStyle]}>
          <Icons.MapPin size={64} color={theme.colors.primary} weight="fill" />
        </Animated.View>
        <Text variant="title1" align="center" accessibilityRole="header">
          {t("arrived.title")}
        </Text>
        <Text variant="title3" color="primaryText" align="center" style={s.bold}>
          {params.restaurantName}
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={s.desc}>
          {t("arrived.desc", { dish })}
        </Text>
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
        <Button title={t("arrived.verify")} icon={Icons.Camera} size="lg" fullWidth onPress={() => router.push({ pathname: "/mission/verify", params })} />
        <Button title={t("arrived.notYet")} variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  root: { backgroundColor: t.colors.surface },
  bold: { fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: t.space.xxxl, gap: t.space.sm },
  badge: {
    width: 148,
    height: 148,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.xl,
  },
  desc: { marginTop: t.space.sm, maxWidth: 320 },
  footer: { paddingHorizontal: t.space.xl, gap: t.space.sm },
}));
