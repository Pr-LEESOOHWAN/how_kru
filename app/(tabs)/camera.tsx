import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OverlayIconButton, ScanCorners, ShutterButton } from "@/src/components/ScanParts";
import { useI18n } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Button, Icons, PressableScale, Text, triggerHaptic } from "@/src/ui";

type ScanMode = "restaurant" | "food";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>("restaurant");
  const [scanned, setScanned] = useState(false);
  const [flash, setFlash] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const s = useStyles();

  // 탭 화면은 다른 탭으로 옮겨가도 언마운트되지 않아서, 카메라(와 켜둔 손전등)가 백그라운드에서
  // 계속 돌았다. 이 탭이 실제로 보일 때만 CameraView를 그리고, 벗어나면 손전등/스캔 상태도 초기화한다.
  const [isFocused, setIsFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
        setFlash(false);
        setScanned(false);
      };
    }, [])
  );

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!permission?.granted) {
    return (
      <View style={s.permission}>
        <View style={s.permissionIcon}>
          <Icons.Camera size={36} color={theme.colors.primary} weight="duotone" />
        </View>
        <Text variant="title2" align="center" style={s.white}>
          {t("perm.cameraTitle")}
        </Text>
        <Text variant="callout" align="center" style={s.dimText}>
          {t("camera.permDesc")}
        </Text>
        <View style={s.permissionActions}>
          <Button title={t("camera.allow")} onPress={requestPermission} size="lg" fullWidth />
          {/* 한 번 거부하면 requestPermission()이 OS 창을 다시 안 띄우는 기기가 많다(특히 Android). */}
          <Button title={t("common.openSettings")} variant="ghost" onPress={() => Linking.openSettings()} fullWidth />
        </View>
      </View>
    );
  }

  const handleCapture = () => {
    if (scanned) {
      setScanned(false);
      return;
    }
    // 자동 인식은 아직 준비 중 - 미션 인증 흐름(mission/verify.tsx)에서는 서버 AI 판정이 동작한다.
    setScanned(true);
    triggerHaptic("light");
    Alert.alert(
      scanMode === "restaurant" ? t("camera.doneTitleRestaurant") : t("camera.doneTitleFood"),
      t("camera.comingSoon"),
      [
        { text: t("camera.rescan"), onPress: () => setScanned(false) },
        { text: t("common.ok"), onPress: () => router.back() },
      ]
    );
  };

  const modes: { key: ScanMode; label: string; icon: typeof Icons.Storefront }[] = [
    { key: "restaurant", label: t("camera.modeRestaurant"), icon: Icons.Storefront },
    { key: "food", label: t("camera.modeFood"), icon: Icons.BowlFood },
  ];

  return (
    <View style={s.root}>
      {isFocused ? <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={flash} /> : null}

      <View style={s.overlay}>
        <View style={[s.topBar, { paddingTop: insets.top + theme.space.md }]}>
          <OverlayIconButton onPress={() => router.back()} accessibilityLabel={t("common.close")}>
            <Icons.X size={20} color="#FFFFFF" weight="bold" />
          </OverlayIconButton>
          <Text variant="title3" style={[s.white, s.bold]} accessibilityRole="header">
            {scanMode === "restaurant" ? t("camera.titleRestaurant") : t("camera.titleFood")}
          </Text>
          <OverlayIconButton
            onPress={() => setFlash((v) => !v)}
            accessibilityLabel={flash ? t("camera.flashOff") : t("camera.flashOn")}
          >
            {flash ? (
              <Icons.Lightning size={20} color={theme.colors.warning} weight="fill" />
            ) : (
              <Icons.Flashlight size={20} color="#FFFFFF" />
            )}
          </OverlayIconButton>
        </View>

        <Text variant="callout" align="center" style={[s.dimText, s.guide]}>
          {scanMode === "restaurant" ? t("camera.guideRestaurant") : t("camera.guideFood")}
        </Text>

        <ScanCorners size={Math.min(width * 0.75, 340)}>
          <View style={[s.status, scanned && s.statusDone]}>
            {scanned ? <Icons.CheckCircle size={16} color="#FFFFFF" weight="fill" /> : null}
            <Text variant="caption" style={[s.white, s.bold]}>
              {scanned ? t("camera.scanned") : t("camera.scanning")}
            </Text>
          </View>
        </ScanCorners>

        <View style={s.modes} accessibilityRole="radiogroup">
          {modes.map((m) => {
            const active = scanMode === m.key;
            const ModeIcon = m.icon;
            return (
              <PressableScale
                key={m.key}
                haptic="selection"
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                accessibilityLabel={m.label}
                onPress={() => {
                  setScanMode(m.key);
                  setScanned(false);
                }}
                style={[s.mode, active && s.modeActive]}
              >
                <ModeIcon size={16} color={active ? "#FFFFFF" : "rgba(255,255,255,0.7)"} weight={active ? "fill" : "regular"} />
                <Text variant="caption" style={[s.bold, { color: active ? "#FFFFFF" : "rgba(255,255,255,0.75)" }]}>
                  {m.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        <View style={[s.bottom, { paddingBottom: insets.bottom + theme.space.lg }]}>
          <ShutterButton onPress={handleCapture} done={scanned} accessibilityLabel={t("camera.capture")} />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: "#000000" },
  white: { color: "#FFFFFF" },
  bold: { fontWeight: "700" },
  dimText: { color: "rgba(255,255,255,0.78)" },

  permission: {
    flex: 1,
    backgroundColor: "#121110",
    alignItems: "center",
    justifyContent: "center",
    padding: t.space.xxxl,
    gap: t.space.md,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: t.radius.pill,
    backgroundColor: "rgba(242,84,45,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.sm,
  },
  permissionActions: { alignSelf: "stretch", gap: t.space.sm, marginTop: t.space.lg },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: t.space.xl,
    paddingBottom: t.space.lg,
  },
  guide: { paddingHorizontal: t.space.xxxl, marginBottom: t.space.xxl },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.pill,
  },
  statusDone: { backgroundColor: t.colors.success },
  modes: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: t.radius.pill,
    padding: t.space.xs,
    marginTop: t.space.xxxl,
    gap: t.space.xs,
  },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.sm + t.space.xxs,
    borderRadius: t.radius.pill,
  },
  modeActive: { backgroundColor: t.colors.primaryFill },
  bottom: { flex: 1, alignItems: "center", justifyContent: "center" },
}));
