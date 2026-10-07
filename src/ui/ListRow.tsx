import type { ReactNode } from "react";
import { View } from "react-native";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";

import { Check, type Icon } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: Icon;
  /** 왼쪽 아이콘 대신 넣을 요소(국기 글자 등) */
  leading?: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  accessibilityRole?: "button" | "radio";
};

/** 설정 화면처럼 묶음 카드 안에 들어가는 한 줄. 선택형이면 체크와 강조색을 보여준다. */
export function ListRow({
  title,
  subtitle,
  icon: IconCmp,
  leading,
  selected,
  onPress,
  isLast,
  accessibilityRole = "button",
}: ListRowProps) {
  const theme = useTheme();
  const s = useStyles();

  return (
    <PressableScale
      onPress={onPress}
      haptic={selected === undefined ? "none" : "selection"}
      scaleTo={0.99}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected: !!selected, checked: accessibilityRole === "radio" ? !!selected : undefined }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={[s.row, !isLast && s.divider, selected && s.selected]}
    >
      {leading ?? (IconCmp ? <IconCmp size={20} color={theme.colors.textSecondary} /> : null)}
      <View style={s.texts}>
        <Text variant="bodyStrong" style={selected ? { color: theme.colors.primaryText } : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textTertiary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color={theme.colors.primaryText} weight="bold" /> : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.md,
    paddingHorizontal: t.space.lg,
    minHeight: 56,
    paddingVertical: t.space.md,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: t.colors.border },
  selected: { backgroundColor: t.colors.primaryTint },
  texts: { flex: 1, gap: t.space.xxs },
}));
