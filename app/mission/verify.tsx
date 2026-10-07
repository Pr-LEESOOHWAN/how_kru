import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Linking, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OverlayIconButton, OverlayLabel, overlayTextShadow, ScanCorners, ShutterButton } from "@/src/components/ScanParts";
import { useI18n, type MessageKey } from "@/src/i18n";
import { dishName } from "@/src/i18n/content";
import { MissionVerifyError, verifyMission, type ReasonCode, type VerifyMissionResult } from "@/src/services/missionVerify";
import { extractTextFromImage } from "@/src/services/ocr";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { BottomSheet, Button, Icons, PressableScale, Screen, ScreenHeader, Text, triggerHaptic } from "@/src/ui";

type OcrState = { status: "idle" } | { status: "loading" } | { status: "done"; text: string } | { status: "error" };

type ShotKey = "sign" | "food" | "receipt";

const SHOT_META: Record<ShotKey, { label: MessageKey; sub?: MessageKey; guide: MessageKey; icon: typeof Icons.Storefront }> = {
  sign: { label: "verify.shot.sign", sub: "verify.shot.signSub", guide: "verify.guide.sign", icon: Icons.Storefront },
  food: { label: "verify.shot.food", sub: "verify.shot.foodSub", guide: "verify.guide.food", icon: Icons.BowlFood },
  receipt: { label: "verify.shot.receipt", guide: "verify.guide.receipt", icon: Icons.Receipt },
};

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { t, language } = useI18n();
  const s = useStyles();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
  }>();
  const dish = dishName({ id: params.dishId, name_kr: params.name_kr, name_en: params.name_en }, language);

  const [shots, setShots] = useState<Record<ShotKey, string | null>>({ sign: null, food: null, receipt: null });
  // verifyMission 호출용 base64 (URI는 화면 표시용, base64는 서버 전송용으로 따로 들고 있는다)
  const [shotsBase64, setShotsBase64] = useState<Record<ShotKey, string | null>>({ sign: null, food: null, receipt: null });
  const [verifying, setVerifying] = useState(false);
  const [receiptOcr, setReceiptOcr] = useState<OcrState>({ status: "idle" });
  // uncertain/fail 판정 결과 시트 (예전엔 Alert에 한국어 문장을 이어붙여 보여줬다)
  const [result, setResult] = useState<VerifyMissionResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  // 앱 자체 카메라 스캔 오버레이 상태
  const [activeShot, setActiveShot] = useState<ShotKey | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  // Android 뒤로가기: 카메라 오버레이가 열려 있으면 화면 전체가 아니라 오버레이만 닫는다
  // (예전엔 인증 화면 자체가 닫혀 찍어둔 사진이 전부 날아갔다). 촬영 중에는 무시.
  useEffect(() => {
    if (!activeShot) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!capturing) setActiveShot(null);
      return true;
    });
    return () => sub.remove();
  }, [activeShot, capturing]);

  // 서버 인증이 도는 동안 뒤로가기를 막는다 - 빠져나가면 "pass"인데도 완료 화면으로 못 가거나
  // 사진을 전부 잃었다. (헤더 뒤로 버튼과 재촬영 버튼도 같은 이유로 잠근다)
  useEffect(() => {
    if (!verifying) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [verifying]);

  const openScan = async (key: ShotKey) => {
    if (verifying) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        // 한 번 거부하면 OS 창이 다시 안 뜨는 기기가 많아서(특히 Android) 설정으로 보낼 수 있게 한다.
        Alert.alert(t("perm.cameraTitle"), t("verify.permBody"), [
          { text: t("common.cancel"), style: "cancel" },
          { text: t("common.openSettings"), onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    // (영수증 인식 결과는 여기서 지우지 않는다 - 재촬영을 눌렀다 취소만 해도 결과가 사라졌었다.
    // 초기화는 실제로 새 사진이 찍힌 시점에만 한다.)
    setActiveShot(key);
  };

  const capturePhoto = async () => {
    // 촬영 중 버튼을 연타해도 takePictureAsync가 중복 실행되지 않도록 막는다.
    if (!cameraRef.current || !activeShot || capturing) return;
    setCapturing(true);
    const shotKey = activeShot;
    try {
      // 세 장 다 서버 인증에 base64로 보내야 하고, 영수증은 촬영 직후 인식 미리보기에도 쓴다.
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: true });
      if (photo?.uri) setShots((prev) => ({ ...prev, [shotKey]: photo.uri }));
      if (photo?.base64) setShotsBase64((prev) => ({ ...prev, [shotKey]: photo.base64 ?? null }));
      setActiveShot(null);
      if (shotKey === "receipt") {
        if (photo?.base64) runReceiptOcr(photo.base64);
        else setReceiptOcr({ status: "idle" });
      }
    } catch {
      // 촬영 실패(디바이스 이슈 등) 시 스캔 화면을 유지해 다시 시도할 수 있게 한다.
      Alert.alert(t("verify.captureFailed"), t("common.tryAgainLater"));
    } finally {
      setCapturing(false);
    }
  };

  // 영수증 글자를 미리 보여주는 용도일 뿐 - 실제 판정은 서버가 사진을 다시 받아 독립적으로 한다.
  const runReceiptOcr = async (base64Image: string) => {
    setReceiptOcr({ status: "loading" });
    try {
      setReceiptOcr({ status: "done", text: await extractTextFromImage(base64Image) });
    } catch (err) {
      console.error("영수증 OCR 오류:", err);
      setReceiptOcr({ status: "error" });
    }
  };

  const bothTaken = !!shots.sign && !!shots.food;

  // 요리 사진의 로컬 URI를 완료 화면까지 넘겨서, "리뷰 남기기"에서 방금 인증에 쓴 사진을 바로
  // 첨부할 수 있게 한다(base64는 너무 커서 URI만 - 앱 캐시 파일이라 리뷰 작성까지는 유효하다).
  const goToComplete = () => {
    setResultOpen(false);
    router.push({
      pathname: "/mission/complete",
      params: { ...params, ...(shots.food ? { foodPhotoUri: shots.food } : {}) },
    });
  };

  const handleVerify = async () => {
    if (!bothTaken || verifying) return;
    // 드물게 takePictureAsync가 uri만 주고 base64를 못 주는 기기가 있다 - 어느 사진인지 알려준다.
    if (!shotsBase64.sign || !shotsBase64.food) {
      const missing = t(!shotsBase64.sign ? "verify.shot.sign" : "verify.shot.food");
      Alert.alert(t("verify.retakeNeeded"), t("verify.retakeNeededBody", { shot: missing }));
      return;
    }
    setVerifying(true);
    try {
      const res = await verifyMission({
        dishId: params.dishId,
        restaurantName: params.restaurantName,
        signPhotoBase64: shotsBase64.sign,
        foodPhotoBase64: shotsBase64.food,
        receiptPhotoBase64: shotsBase64.receipt ?? undefined,
      });

      if (res.verdict === "pass") {
        triggerHaptic("success");
        goToComplete();
        return;
      }
      // 관대한 정책: 확실히 안 맞아도 완전히 막지는 않는다. 이유를 보여주고 재촬영을 권하되
      // 강행할지는 사용자가 선택한다.
      triggerHaptic(res.verdict === "fail" ? "error" : "warning");
      setResult(res);
      setResultOpen(true);
    } catch (err) {
      triggerHaptic("error");
      const key = err instanceof MissionVerifyError ? err.key : "verify.error.network";
      Alert.alert(t("verify.error.title"), t(key));
    } finally {
      setVerifying(false);
    }
  };

  const reasonText = (rc: ReasonCode): string => {
    switch (rc.code) {
      case "name_mismatch":
        return t("verify.reason.name_mismatch", { restaurant: rc.restaurant });
      case "dish_mismatch":
        return t("verify.reason.dish_mismatch", { terms: (rc.terms ?? []).join(", "), dish });
      case "name_not_found":
      case "dish_similar_category":
      case "dish_nothing_detected":
      case "dish_detect_failed":
        return t(`verify.reason.${rc.code}`);
      default:
        return "";
    }
  };
  // 코드를 모르는 응답(구버전 서버)이면 서버가 보낸 한국어 문장을 그대로 쓴다.
  const reasons = result
    ? result.reasonCodes?.length
      ? result.reasonCodes.map(reasonText).filter(Boolean)
      : result.reasons
    : [];

  // ── 촬영 오버레이 ──
  if (activeShot) {
    const meta = SHOT_META[activeShot];
    return (
      <View style={s.camRoot}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={s.camOverlay}>
          <View style={[s.camTop, { paddingTop: insets.top + theme.space.md }]}>
            {/* 촬영 중에 오버레이를 닫으면 카메라가 언마운트돼 촬영이 실패한다 - 촬영 중엔 잠근다. */}
            <View style={capturing ? s.dim : undefined} pointerEvents={capturing ? "none" : "auto"}>
              <OverlayIconButton onPress={() => setActiveShot(null)} accessibilityLabel={t("common.close")}>
                <Icons.X size={20} color="#FFFFFF" weight="bold" />
              </OverlayIconButton>
            </View>
            <Text variant="title3" style={[s.white, s.bold, overlayTextShadow]} accessibilityRole="header">
              {t("verify.captureTitle", { shot: t(meta.label) })}
            </Text>
            <View style={s.camSpacer} />
          </View>
          <View style={s.camGuide}>
            <OverlayLabel>{t(meta.guide)}</OverlayLabel>
          </View>
          <ScanCorners size={Math.min(width * 0.72, 320)} />
          <View style={[s.camBottom, { paddingBottom: insets.bottom + theme.space.lg }]}>
            <ShutterButton onPress={capturePhoto} busy={capturing} accessibilityLabel={t("camera.capture")} />
          </View>
        </View>
      </View>
    );
  }

  // ── 인증 화면 ──
  return (
    <Screen>
      <ScreenHeader title={t("verify.title", { dish })} backDisabled={verifying} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.info}>
          <Icons.Camera size={20} color={theme.colors.primaryText} weight="fill" />
          <Text variant="callout" color="primaryText" style={s.flex1}>
            {t("verify.intro")}
          </Text>
        </View>

        <View style={s.shotsRow}>
          {(["sign", "food"] as const).map((key) => (
            <ShotTile
              key={key}
              shotKey={key}
              uri={shots[key]}
              disabled={verifying}
              onPress={() => openScan(key)}
            />
          ))}
        </View>

        <View style={s.receipt}>
          <View style={s.receiptHead}>
            <Icons.Receipt size={20} color={theme.colors.textSecondary} />
            <Text variant="bodyStrong">{t("verify.receiptTitle")}</Text>
          </View>
          <Text variant="caption" color="textTertiary">
            {t("verify.receiptDesc")}
          </Text>

          <PressableScale
            onPress={() => openScan("receipt")}
            disabled={verifying}
            scaleTo={0.98}
            accessibilityLabel={shots.receipt ? t("verify.retake") : t("verify.scanReceipt")}
            style={[s.receiptBox, shots.receipt && s.receiptBoxFilled]}
          >
            {shots.receipt ? (
              <>
                <Image source={{ uri: shots.receipt }} style={StyleSheet.absoluteFill} contentFit="cover" />
                <View style={s.retakeChip}>
                  <Icons.ArrowClockwise size={14} color="#FFFFFF" weight="bold" />
                  <Text variant="caption" style={[s.white, s.bold]}>
                    {t("verify.retake")}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Icons.Camera size={24} color={theme.colors.textTertiary} />
                <Text variant="caption" color="textSecondary" style={s.bold}>
                  {t("verify.scanReceipt")}
                </Text>
              </>
            )}
          </PressableScale>

          {shots.receipt && receiptOcr.status === "loading" ? (
            <View style={[s.ocr, s.ocrRow]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="caption" color="textTertiary">
                {t("verify.ocrLoading")}
              </Text>
            </View>
          ) : null}
          {receiptOcr.status === "done" ? (
            <View style={s.ocr}>
              <View style={s.ocrRow}>
                <Icons.MagnifyingGlass size={14} color={theme.colors.primaryText} weight="bold" />
                <Text variant="caption" color="primaryText" style={s.bold}>
                  {t("verify.ocrResult")}
                </Text>
              </View>
              <Text variant="caption" color="textSecondary">
                {receiptOcr.text.trim() || t("verify.ocrEmpty")}
              </Text>
            </View>
          ) : null}
          {receiptOcr.status === "error" ? (
            <View style={[s.ocr, s.ocrRow]}>
              <Icons.WarningCircle size={14} color={theme.colors.danger} weight="bold" />
              <Text variant="caption" color="danger">
                {t("verify.ocrFailed")}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.lg) }]}>
        {verifying ? (
          <Text variant="caption" color="textTertiary" align="center" accessibilityLiveRegion="polite">
            {t("verify.checking")}
          </Text>
        ) : !bothTaken ? (
          <Text variant="caption" color="textTertiary" align="center">
            {t("verify.needBoth")}
          </Text>
        ) : null}
        <Button title={t("verify.cta")} icon={Icons.SealCheck} size="lg" fullWidth disabled={!bothTaken} loading={verifying} onPress={handleVerify} haptic="none" />
      </View>

      <BottomSheet
        visible={resultOpen}
        onClose={() => setResultOpen(false)}
        footer={
          <>
            <View style={s.flex1}>
              <Button title={t("verify.result.retake")} variant="secondary" icon={Icons.Camera} fullWidth onPress={() => setResultOpen(false)} />
            </View>
            <View style={s.flex1}>
              <Button title={t("verify.result.proceed")} fullWidth onPress={goToComplete} />
            </View>
          </>
        }
      >
        <View style={s.resultBody}>
          <View style={[s.resultIcon, { backgroundColor: result?.verdict === "fail" ? theme.colors.dangerTint : theme.colors.warningTint }]}>
            {result?.verdict === "fail" ? (
              <Icons.WarningCircle size={32} color={theme.colors.danger} weight="fill" />
            ) : (
              <Icons.MagnifyingGlass size={32} color={theme.colors.warning} weight="bold" />
            )}
          </View>
          <Text variant="title2" align="center" accessibilityRole="header">
            {result?.verdict === "fail" ? t("verify.result.failTitle") : t("verify.result.uncertainTitle")}
          </Text>
          <View style={s.reasons}>
            {(reasons.length ? reasons : [t("verify.result.fallback")]).map((r, i) => (
              <View key={i} style={s.reason}>
                <View style={s.reasonDot} />
                <Text variant="callout" style={s.flex1}>
                  {r}
                </Text>
              </View>
            ))}
          </View>
          <Text variant="caption" color="textTertiary" align="center">
            {t("verify.result.policy")}
          </Text>
        </View>
      </BottomSheet>
    </Screen>
  );
}

function ShotTile({ shotKey, uri, disabled, onPress }: { shotKey: "sign" | "food"; uri: string | null; disabled: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const meta = SHOT_META[shotKey];
  const TileIcon = meta.icon;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.98}
      accessibilityLabel={uri ? `${t(meta.label)}, ${t("verify.retake")}` : `${t(meta.label)}, ${t("verify.tapToShoot")}`}
      style={[s.tile, uri ? s.tileFilled : null]}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={s.tileDone}>
            <Icons.CheckCircle size={22} color={theme.colors.success} weight="fill" />
          </View>
          <View style={s.retakeChip}>
            <Icons.ArrowClockwise size={14} color="#FFFFFF" weight="bold" />
            <Text variant="caption" style={[s.white, s.bold]}>
              {t("verify.retake")}
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={s.tileIcon}>
            <TileIcon size={28} color={theme.colors.primary} weight="duotone" />
          </View>
          <Text variant="bodyStrong" color="primaryText">
            {t(meta.label)}
          </Text>
          {meta.sub ? (
            <Text variant="caption" color="textTertiary" align="center">
              {t(meta.sub)}
            </Text>
          ) : null}
          <View style={s.tapHint}>
            <Icons.Camera size={14} color={theme.colors.primaryText} />
            <Text variant="caption" color="primaryText" style={s.bold}>
              {t("verify.tapToShoot")}
            </Text>
          </View>
        </>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  flex1: { flex: 1 },
  bold: { fontWeight: "700" },
  white: { color: "#FFFFFF" },
  dim: { opacity: 0.3 },
  content: { padding: t.space.xl, gap: t.space.xl, paddingBottom: t.space.xxl },
  info: {
    flexDirection: "row",
    gap: t.space.md,
    alignItems: "flex-start",
    backgroundColor: t.colors.primaryTint,
    borderRadius: t.radius.lg,
    padding: t.space.lg,
  },
  shotsRow: { flexDirection: "row", gap: t.space.md },
  tile: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: t.radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: t.colors.primary,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: t.space.xs,
    padding: t.space.md,
    overflow: "hidden",
  },
  tileFilled: { borderStyle: "solid", borderColor: t.colors.success },
  tileIcon: {
    width: 56,
    height: 56,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.xs,
  },
  tapHint: { flexDirection: "row", alignItems: "center", gap: t.space.xs, marginTop: t.space.sm },
  // 체크 아이콘 뒤 원은 테마 면 색 - 흰 원이면 다크 테마의 밝은 초록이 1.9:1로 묻힌다.
  tileDone: { position: "absolute", top: t.space.sm, right: t.space.sm, backgroundColor: t.colors.surface, borderRadius: t.radius.pill },
  retakeChip: {
    position: "absolute",
    bottom: t.space.sm,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: t.radius.pill,
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.xs + t.space.xxs,
  },
  receipt: { gap: t.space.sm },
  receiptHead: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  receiptBox: {
    height: 120,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: t.colors.borderStrong,
    backgroundColor: t.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: t.space.xs,
    overflow: "hidden",
    marginTop: t.space.xs,
  },
  receiptBoxFilled: { borderStyle: "solid", borderColor: t.colors.success },
  ocr: { backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.space.md, gap: t.space.xs },
  ocrRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm },
  footer: {
    paddingHorizontal: t.space.xl,
    paddingTop: t.space.md,
    gap: t.space.sm,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },

  resultBody: { paddingHorizontal: t.space.xl, paddingTop: t.space.xl, paddingBottom: t.space.lg, gap: t.space.md, alignItems: "center" },
  resultIcon: { width: 64, height: 64, borderRadius: t.radius.pill, alignItems: "center", justifyContent: "center" },
  reasons: { alignSelf: "stretch", gap: t.space.sm, backgroundColor: t.colors.surfaceAlt, borderRadius: t.radius.md, padding: t.space.lg },
  reason: { flexDirection: "row", gap: t.space.sm, alignItems: "flex-start" },
  reasonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.colors.textTertiary, marginTop: 8 },

  camRoot: { flex: 1, backgroundColor: "#000000" },
  camOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  camTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: t.space.xl, paddingBottom: t.space.lg },
  camSpacer: { width: 44 },
  camGuide: { paddingHorizontal: t.space.xl, marginBottom: t.space.xxl },
  camBottom: { flex: 1, alignItems: "center", justifyContent: "center" },
}));
