// 누르면 살짝(0.97) 줄어드는 Pressable - 화면의 모든 탭 가능한 요소의 기본 부품.
//
// Emil Kowalski 원칙: 버튼은 눌렀다는 걸 즉시 몸으로 느끼게 해야 한다. 누를 때는 짧게
// (120ms) ease-out으로 줄이고, 뗄 때는 조금 더 여유 있게(180ms) 돌아온다. 시스템의
// "동작 줄이기"가 켜져 있으면 크기 변화 대신 투명도만 살짝 바꾼다.

import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/src/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const EASE_OUT = Easing.bezier(...motion.easing.out);

/** success/warning/error는 결과 알림용(미션 인증 판정 등) */
export type HapticKind = "light" | "medium" | "selection" | "success" | "warning" | "error" | "none";

export function triggerHaptic(kind: HapticKind) {
  // 웹이나 진동 모터가 없는 기기에서는 실패할 수 있다 - 햅틱은 부가 피드백이라 조용히 무시.
  const ignore = () => {};
  switch (kind) {
    case "light":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore);
      break;
    case "medium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(ignore);
      break;
    case "selection":
      Haptics.selectionAsync().catch(ignore);
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore);
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore);
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(ignore);
      break;
  }
}

export type PressableScaleProps = Omit<PressableProps, "style" | "children"> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  haptic?: HapticKind;
  /** 눌렀을 때 크기 (기본 0.97). 큰 카드는 0.98 정도가 자연스럽다. */
  scaleTo?: number;
};

export function PressableScale({
  style,
  children,
  haptic = "none",
  scaleTo = motion.pressScale,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = "button",
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.25 }
      : { transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }] }
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...rest.accessibilityState, disabled: !!disabled }}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        pressed.value = withTiming(1, { duration: motion.duration.press, easing: EASE_OUT });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: motion.duration.fast, easing: EASE_OUT });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        triggerHaptic(haptic);
        onPress?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
