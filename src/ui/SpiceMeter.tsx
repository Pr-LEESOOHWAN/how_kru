import { View } from "react-native";

import { useI18n } from "@/src/i18n";
import { useTheme } from "@/src/theme/ThemeContext";

import { Pepper } from "./icons";
import { Text } from "./Text";

export type SpiceMeterProps = {
  level: number;
  size?: number;
  /** 0단계일 때 고추 다섯 개 대신 "안 매워요" 글씨를 보여줄지 */
  showMildLabel?: boolean;
};

/**
 * 맵기 0~5. 이모지 고추를 반투명하게 겹치던 방식은 다크모드에서 꺼진 고추가 거의 안
 * 보였다 - 켜진 건 채운 아이콘, 꺼진 건 외곽선 아이콘으로 모양 자체를 다르게 한다.
 */
export function SpiceMeter({ level, size = 12, showMildLabel = false }: SpiceMeterProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const clamped = Math.max(0, Math.min(5, Math.round(level || 0)));

  if (clamped === 0 && showMildLabel) {
    return (
      <Text variant="caption" color="success">
        {t("common.notSpicy")}
      </Text>
    );
  }

  return (
    <View
      style={{ flexDirection: "row", gap: 1 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={clamped === 0 ? t("common.notSpicy") : t("common.spiceA11y", { level: clamped })}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const on = i < clamped;
        return (
          <Pepper
            key={i}
            size={size}
            weight={on ? "fill" : "regular"}
            color={on ? theme.colors.primary : theme.colors.borderStrong}
          />
        );
      })}
    </View>
  );
}
