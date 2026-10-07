// 아래에서 올라오는 시트. RN Modal의 기본 slide 애니메이션은 어두운 배경막까지 같이 밀려
// 올라와서 어색했다 - 배경막은 제자리에서 페이드, 시트만 iOS 서랍 커브로 올라온다.
// 닫을 때는 여는 것보다 짧게(Emil: 시스템 응답은 빠르게). 동작 줄이기가 켜져 있으면 페이드만.

import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";

import { X } from "./icons";
import { PressableScale } from "./PressableScale";

const DRAWER = Easing.bezier(0.32, 0.72, 0, 1);
const OPEN_MS = 300;
const CLOSE_MS = 200;

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 시트 아래쪽에 고정되는 영역(행동 버튼) */
  footer?: ReactNode;
};

export function BottomSheet({ visible, onClose, children, footer }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const s = useStyles();

  // 닫히는 애니메이션이 끝날 때까지 Modal을 띄워둬야 해서 visible과 따로 관리한다.
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, { duration: OPEN_MS, easing: DRAWER });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: CLOSE_MS, easing: DRAWER }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.value }
      : { transform: [{ translateY: (1 - progress.value) * 600 }] }
  );

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("common.close")} />
      </Animated.View>

      <Animated.View style={[s.sheet, sheetStyle]} accessibilityViewIsModal>
        <View style={s.handle} />
        <PressableScale onPress={onClose} accessibilityLabel={t("common.close")} style={s.close} hitSlop={8}>
          <X size={18} color={theme.colors.textSecondary} weight="bold" />
        </PressableScale>
        <View style={s.body}>{children}</View>
        {footer ? (
          <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.md) }]}>{footer}</View>
        ) : null}
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "86%",
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.xl,
    borderTopRightRadius: t.radius.xl,
    overflow: "hidden",
    boxShadow: t.elevation.raised,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.borderStrong,
    marginTop: t.space.sm,
    marginBottom: t.space.xs,
  },
  close: {
    position: "absolute",
    top: t.space.md,
    right: t.space.md,
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  body: { flexShrink: 1 },
  footer: {
    flexDirection: "row",
    gap: t.space.md,
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
}));
