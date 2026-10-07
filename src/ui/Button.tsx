import { ActivityIndicator, View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";

import type { Icon } from "./icons";
import { PressableScale, type HapticKind } from "./PressableScale";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "tonal" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: Icon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: HapticKind;
  accessibilityHint?: string;
  testID?: string;
};

const HEIGHT: Record<Size, number> = { sm: 36, md: 46, lg: 54 };

/**
 * 버튼 하나로 통일. 라벨은 한 줄을 넘기지 않게 짧게 쓴다.
 * primary 위 흰 글씨는 대비가 3:1대라 굵은 15pt 이상으로만 쓴다(sm은 tonal/secondary 권장).
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon: IconCmp,
  loading = false,
  disabled = false,
  fullWidth = false,
  haptic,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const s = useStyles();
  const c = theme.colors;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primary, fg: c.onPrimary },
    secondary: { bg: c.surface, fg: c.text, border: c.borderStrong },
    tonal: { bg: c.primaryTint, fg: c.primaryText },
    ghost: { bg: "transparent", fg: c.primaryText },
    danger: { bg: c.dangerTint, fg: c.danger },
  };
  const { bg, fg, border } = palette[variant];
  const inactive = disabled || loading;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      haptic={haptic ?? (variant === "primary" ? "light" : "none")}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading, disabled: inactive }}
      style={[
        s.base,
        {
          height: HEIGHT[size],
          backgroundColor: bg,
          borderColor: border ?? "transparent",
          paddingHorizontal: size === "sm" ? theme.space.md : theme.space.xl,
        },
        fullWidth && s.fullWidth,
        disabled && !loading && s.disabled,
      ]}
    >
      <View style={[s.content, loading && s.hidden]}>
        {IconCmp ? <IconCmp size={size === "sm" ? 16 : 20} color={fg} weight="bold" /> : null}
        <Text
          variant={size === "sm" ? "caption" : size === "lg" ? "title3" : "bodyStrong"}
          style={[{ color: fg }, size !== "sm" && s.label]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {loading ? <ActivityIndicator color={fg} style={s.spinner} /> : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    borderRadius: t.radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  fullWidth: { alignSelf: "stretch" },
  disabled: { opacity: 0.45 },
  content: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  label: { fontWeight: "700" },
  hidden: { opacity: 0 },
  spinner: { position: "absolute" },
}));
