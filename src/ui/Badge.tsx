import { View, type StyleProp, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";

import type { Icon } from "./icons";
import { Text } from "./Text";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "onImage";

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: Icon;
  /** 사진 위에 얹는 경우처럼 작게 */
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
};

/**
 * 상태/분류 표시 칩. 색은 의미(완료=success, 레벨=brand ...)로만 쓴다.
 * 작은 글씨라 브랜드 톤도 채움색이 아니라 틴트 배경 + 진한 글씨 조합(AA 통과)이다.
 */
export function Badge({ label, tone = "neutral", icon: IconCmp, size = "md", style }: BadgeProps) {
  const theme = useTheme();
  const s = useStyles();
  const c = theme.colors;

  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.textSecondary },
    brand: { bg: c.primaryTint, fg: c.primaryText },
    success: { bg: c.successTint, fg: c.success },
    warning: { bg: c.warningTint, fg: c.warning },
    danger: { bg: c.dangerTint, fg: c.danger },
    info: { bg: c.infoTint, fg: c.info },
    onImage: { bg: c.onImage, fg: "#FFFFFF" },
  };
  const { bg, fg } = tones[tone];

  return (
    <View style={[s.badge, size === "sm" && s.sm, { backgroundColor: bg }, style]}>
      {IconCmp ? <IconCmp size={size === "sm" ? 11 : 13} color={fg} weight="bold" /> : null}
      <Text variant="micro" style={{ color: fg }} numberOfLines={1} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: t.space.xs,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.sm + t.space.xxs,
    paddingVertical: t.space.xs,
  },
  sm: { paddingHorizontal: t.space.sm, paddingVertical: t.space.xxs + 1 },
}));
