// 카메라 화면 공용 부품 - 스캔 탭(camera.tsx)과 미션 인증 촬영(mission/verify.tsx)이
// 각자 똑같은 모서리 프레임/셔터 버튼을 복붙해서 그리고 있었다.
// 카메라 화면은 실제 영상 위에 그리므로 라이트/다크 테마와 무관하게 항상 어두운 오버레이 +
// 흰 글씨로 고정한다(브랜드색만 토큰을 따른다).

import { ActivityIndicator, View, type TextStyle } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";
import { PressableScale, Text } from "@/src/ui";

// 카메라 영상은 하얀 벽·접시처럼 아주 밝을 수 있다. 화면 전체를 덮는 반투명 막만으로는 그 위의
// 흰 글씨가 4.5:1이 안 나와서(하얀 장면에서 약 2:1), 글씨 뒤에 따로 어두운 바탕을 깔거나
// 그림자 테두리를 둘러 장면 밝기와 상관없이 읽히게 한다.
export const overlayTextShadow: TextStyle = {
  textShadowColor: "rgba(0,0,0,0.75)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

/** 카메라 위 안내 문구 - 어두운 알약 바탕(하얀 장면에서도 흰 글씨 5.7:1) */
export function OverlayLabel({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "center",
        maxWidth: "86%",
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
    >
      <Text variant="callout" align="center" style={{ color: "#FFFFFF" }}>
        {children}
      </Text>
    </View>
  );
}

export function ScanCorners({ size, children }: { size: number; children?: React.ReactNode }) {
  const theme = useTheme();
  const c = theme.colors.primary;
  const corner = { position: "absolute" as const, width: 30, height: 30, borderColor: c, borderWidth: 4 };
  return (
    <View style={{ width: size, height: size, alignSelf: "center", alignItems: "center", justifyContent: "center" }}>
      <View style={[corner, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 10 }]} />
      <View style={[corner, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 10 }]} />
      <View style={[corner, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 10 }]} />
      <View style={[corner, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 10 }]} />
      {children}
    </View>
  );
}

export function ShutterButton({
  onPress,
  busy,
  done,
  accessibilityLabel,
}: {
  onPress: () => void;
  busy?: boolean;
  done?: boolean;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={busy}
      haptic="medium"
      scaleTo={0.92}
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: done ? theme.colors.success : "#FFFFFF",
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" }} />
      )}
    </PressableScale>
  );
}

/** 카메라 위 반투명 원형 아이콘 버튼 */
export function OverlayIconButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        // 밝은 장면에서도 흰 아이콘이 3:1 이상 보이게 어두운 바탕(예전 흰색 16%는 약 2.9:1)
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </PressableScale>
  );
}
