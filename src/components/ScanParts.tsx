// 카메라 화면 공용 부품 - 스캔 탭(camera.tsx)과 미션 인증 촬영(mission/verify.tsx)이
// 각자 똑같은 모서리 프레임/셔터 버튼을 복붙해서 그리고 있었다.
// 카메라 화면은 실제 영상 위에 그리므로 라이트/다크 테마와 무관하게 항상 어두운 오버레이 +
// 흰 글씨로 고정한다(브랜드색만 토큰을 따른다).

import { ActivityIndicator, View } from "react-native";

import { useTheme } from "@/src/theme/ThemeContext";
import { PressableScale } from "@/src/ui";

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
        backgroundColor: "rgba(255,255,255,0.16)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </PressableScale>
  );
}
