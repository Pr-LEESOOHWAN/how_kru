import { View, type StyleProp, type ViewStyle } from "react-native";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";

import { Button } from "./Button";
import type { Icon } from "./icons";
import { Text } from "./Text";

export type StateViewProps = {
  icon: Icon;
  title: string;
  message?: string;
  tone?: "neutral" | "danger";
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 빈 화면/오류 화면 공용. 예전엔 화면마다 "⚠️ + 문구 + 다시 시도" 블록을 따로 그렸다(7곳).
 * 오류는 무엇이 안 됐는지와 무엇을 하면 되는지(버튼)를 같이 보여준다.
 */
export function StateView({
  icon: IconCmp,
  title,
  message,
  tone = "neutral",
  actionLabel,
  onAction,
  style,
}: StateViewProps) {
  const theme = useTheme();
  const s = useStyles();
  const danger = tone === "danger";

  return (
    <View style={[s.wrap, style]} accessibilityLiveRegion={danger ? "polite" : "none"}>
      <View style={[s.iconCircle, { backgroundColor: danger ? theme.colors.dangerTint : theme.colors.surfaceAlt }]}>
        <IconCmp size={28} color={danger ? theme.colors.danger : theme.colors.textTertiary} weight="duotone" />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="textSecondary" align="center" style={s.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={s.action}>
          <Button title={actionLabel} onPress={onAction} variant="tonal" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: t.space.xxl,
    paddingVertical: t.space.huge,
    gap: t.space.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.sm,
  },
  message: { maxWidth: 300 },
  action: { marginTop: t.space.md },
}));
