import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";
import type { ColorTokens, TypeVariant } from "@/src/theme/tokens";

export type TextProps = RNTextProps & {
  /** 타입 스케일 (src/theme/tokens.ts의 type) */
  variant?: TypeVariant;
  /** 색 토큰 이름 */
  color?: keyof ColorTokens;
  align?: "left" | "center" | "right";
};

/**
 * 테마 토큰을 입힌 Text. 화면에서는 fontSize/color를 직접 쓰지 말고 variant/color로 고른다.
 */
export function Text({ variant = "body", color = "text", align, style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[theme.type[variant], { color: theme.colors[color] }, align && { textAlign: align }, style]}
    />
  );
}
