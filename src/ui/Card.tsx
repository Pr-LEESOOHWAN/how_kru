import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import type { Elevation } from "@/src/theme/tokens";

import { PressableScale } from "./PressableScale";

export type CardProps = {
  children?: ReactNode;
  /** 안쪽 여백 (기본 lg=16, 0이면 없음 - 이미지가 카드 끝까지 차야 할 때) */
  padding?: number;
  elevation?: Elevation;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 떠 있는 면. "진짜 위계가 있을 때만" 쓴다 - 단순 묶음은 여백과 구분선으로 충분하다.
 * 라이트에선 옅은 그림자, 다크에선 그림자가 안 보이므로 테두리가 경계를 맡는다.
 */
export function Card({
  children,
  padding,
  elevation = "card",
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CardProps) {
  const theme = useTheme();
  const s = useStyles();
  const boxStyle: StyleProp<ViewStyle> = [
    s.card,
    { padding: padding ?? theme.space.lg, boxShadow: theme.elevation[elevation] },
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        scaleTo={0.98}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={boxStyle}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={boxStyle} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: t.scheme === "dark" ? 1 : 0,
    borderColor: t.colors.border,
    overflow: "hidden",
  },
}));
