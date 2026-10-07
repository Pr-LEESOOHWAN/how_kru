import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { hitTarget } from "@/src/theme/tokens";

import { CaretLeft } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

/** 화면 바탕. 모든 화면의 최상위 컨테이너. */
export function Screen({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  return <View style={[s.screen, style]}>{children}</View>;
}

export type ScreenHeaderProps = {
  title?: string;
  /** 기본은 router.back(). false면 뒤로 버튼을 숨긴다. */
  onBack?: (() => void) | false;
  backDisabled?: boolean;
  right?: ReactNode;
};

/**
 * 스택 화면 공용 헤더. 예전엔 화면마다 "‹" 글자 버튼과 40px 자리채움 View를 따로
 * 그렸는데(9곳), 노치 높이 처리와 접근성 라벨이 화면마다 달랐다.
 */
export function ScreenHeader({ title, onBack, backDisabled, right }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useI18n();
  const s = useStyles();

  const handleBack = onBack === false ? undefined : (onBack ?? (() => router.back()));

  return (
    <View style={[s.header, { paddingTop: Math.max(insets.top, theme.space.xl) + theme.space.sm }]}>
      <View style={s.side}>
        {handleBack ? (
          <PressableScale
            onPress={handleBack}
            disabled={backDisabled}
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            style={[s.iconBtn, backDisabled && s.dim]}
          >
            <CaretLeft size={24} color={theme.colors.text} weight="bold" />
          </PressableScale>
        ) : null}
      </View>
      <Text variant="title3" numberOfLines={1} style={s.title} accessibilityRole="header">
        {title}
      </Text>
      <View style={[s.side, s.sideRight]}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.space.sm,
    paddingBottom: t.space.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  side: { width: hitTarget + t.space.sm, flexDirection: "row" },
  sideRight: { justifyContent: "flex-end" },
  title: { flex: 1, textAlign: "center", fontWeight: "700" },
  iconBtn: {
    width: hitTarget,
    height: hitTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: t.radius.pill,
  },
  dim: { opacity: 0.3 },
}));
