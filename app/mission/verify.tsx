import { extractTextFromImage, OcrApiError } from "@/src/services/ocr";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OcrState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; text: string }
  | { status: "error"; message: string };

type ShotKey = "sign" | "food" | "receipt";

const SHOT_META: Record<ShotKey, { label: string; sub: string; guide: string }> = {
  sign: { label: "상호", sub: "(Restaurant Sign)", guide: "식당 간판/상호가 잘 보이게 비춰주세요" },
  food: { label: "요리", sub: "(Food)", guide: "주문한 요리가 잘 보이게 비춰주세요" },
  receipt: { label: "영수증", sub: "(Receipt)", guide: "영수증 전체가 잘 보이게 비춰주세요" },
};

export default function VerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
  }>();

  const [shots, setShots] = useState<Record<ShotKey, string | null>>({ sign: null, food: null, receipt: null });
  const [verifying, setVerifying] = useState(false);
  const [receiptOcr, setReceiptOcr] = useState<OcrState>({ status: "idle" });

  // 앱 자체 카메라 스캔 오버레이 상태
  const [activeShot, setActiveShot] = useState<ShotKey | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const openScan = async (key: ShotKey) => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        // 권한 거부 시 아무 반응 없이 조용히 끝나던 부분 - 이유를 알려줌
        Alert.alert(
          "카메라 권한이 필요해요",
          "촬영 인증을 위해 카메라 권한을 허용해주세요. 설정에서 권한을 변경할 수 있어요."
        );
        return;
      }
    }
    if (key === "receipt") {
      // 다시 찍는 경우, 이전 인식 결과가 잠깐 남아있지 않도록 초기화
      setReceiptOcr({ status: "idle" });
    }
    setActiveShot(key);
  };

  const capturePhoto = async () => {
    // capturing 가드: 촬영 중 버튼을 연타해도 takePictureAsync가 중복 실행되지 않도록 방지.
    if (!cameraRef.current || !activeShot || capturing) return;
    setCapturing(true);
    const shotKey = activeShot;
    try {
      // 영수증은 촬영 직후 OCR에 넣어야 하므로 base64도 함께 받아온다.
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: shotKey === "receipt",
      });
      if (photo?.uri) {
        setShots((prev) => ({ ...prev, [shotKey]: photo.uri }));
      }
      setActiveShot(null);
      if (shotKey === "receipt" && photo?.base64) {
        runReceiptOcr(photo.base64);
      }
    } catch {
      // 카메라 촬영 실패(디바이스 이슈 등) 시 스캔 화면을 유지해 다시 시도할 수 있게 함.
      Alert.alert("촬영 실패", "사진을 찍지 못했어요. 다시 시도해주세요.");
    } finally {
      setCapturing(false);
    }
  };

  // 영수증 사진에서 텍스트를 추출한다. (상호명 매칭/인증 로직은 별도로 추후 구현 예정 - 지금은 추출까지만)
  const runReceiptOcr = async (base64Image: string) => {
    setReceiptOcr({ status: "loading" });
    try {
      const text = await extractTextFromImage(base64Image);
      setReceiptOcr({ status: "done", text });
    } catch (err) {
      const message = err instanceof OcrApiError ? err.message : "텍스트를 인식하지 못했어요.";
      console.error("영수증 OCR 오류:", err);
      setReceiptOcr({ status: "error", message });
    }
  };

  const bothTaken = !!shots.sign && !!shots.food;

  const handleVerify = () => {
    if (!bothTaken) return;
    setVerifying(true);
    // TODO: 실제 AI 인증(이미지 인식) 백엔드 연동 예정. 지금은 목업 딜레이입니다.
    setTimeout(() => {
      setVerifying(false);
      router.push({ pathname: "/mission/complete", params });
    }, 1600);
  };

  // 스캔 오버레이가 열려 있으면 앱 자체 카메라 화면을 전체 화면으로 보여준다.
  if (activeShot) {
    const meta = SHOT_META[activeShot];
    return (
      <View style={s.root}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={s.scanOverlay}>
          <View style={s.scanTopBar}>
            <TouchableOpacity style={s.scanIconBtn} onPress={() => setActiveShot(null)}>
              <Text style={s.scanIconBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={s.scanTopTitle}>{meta.label} 촬영</Text>
            <View style={{ width: 40 }} />
          </View>

          <Text style={s.scanGuideText}>{meta.guide}</Text>

          <View style={s.scanFrame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
          </View>

          <View style={s.scanBottomBar}>
            <TouchableOpacity
              style={s.captureBtn}
              activeOpacity={0.8}
              onPress={capturePhoto}
              disabled={capturing}
            >
              {capturing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={s.captureBtnInner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{params.name_kr} 인증하기</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.infoCard}>
        <Text style={{ fontSize: 18 }}>📷</Text>
        <Text style={s.infoText}>
          상호와 요리를 사진으로 찍어주세요.{"\n"}두 장 모두 인증해야 완료돼요.
        </Text>
      </View>

      <View style={s.shotsRow}>
        <ShotColumn
          shotKey="sign"
          uri={shots.sign}
          onPress={() => openScan("sign")}
          onRetake={() => openScan("sign")}
        />
        <ShotColumn
          shotKey="food"
          uri={shots.food}
          onPress={() => openScan("food")}
          onRetake={() => openScan("food")}
        />
      </View>

      <View style={s.receiptSection}>
        <View style={s.receiptHeaderRow}>
          <Text style={s.receiptTitle}>🧾 영수증 스캔</Text>
          <Text style={s.receiptOptionalTag}>선택사항 · 추가 인증</Text>
        </View>
        <Text style={s.receiptDesc}>
          영수증을 함께 인증하면 신뢰도가 더 높아져요. (필수는 아니에요)
        </Text>
        <TouchableOpacity
          style={s.receiptBox}
          activeOpacity={0.7}
          onPress={() => openScan("receipt")}
        >
          {shots.receipt ? (
            <Image source={{ uri: shots.receipt }} style={s.receiptImage} />
          ) : (
            <>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <Text style={s.receiptBoxText}>영수증 스캔하기</Text>
            </>
          )}
        </TouchableOpacity>
        {shots.receipt && (
          <TouchableOpacity
            style={s.retakeBtn}
            activeOpacity={0.75}
            onPress={() => openScan("receipt")}
          >
            <Text style={s.retakeBtnText}>🔄 다시 촬영하기</Text>
          </TouchableOpacity>
        )}

        {shots.receipt && receiptOcr.status === "loading" && (
          <View style={[s.ocrBox, s.ocrLoadingRow]}>
            <ActivityIndicator size="small" color="#FF5722" />
            <Text style={s.ocrLoadingText}>영수증 글자 인식 중...</Text>
          </View>
        )}
        {receiptOcr.status === "done" && (
          <View style={s.ocrBox}>
            <Text style={s.ocrLabel}>🔎 인식된 텍스트</Text>
            <Text style={s.ocrText} numberOfLines={6}>
              {receiptOcr.text.trim() || "인식된 글자가 없어요. 더 선명하게 다시 찍어보세요."}
            </Text>
          </View>
        )}
        {receiptOcr.status === "error" && (
          <View style={s.ocrBox}>
            <Text style={s.ocrErrorText}>⚠️ {receiptOcr.message}</Text>
          </View>
        )}
      </View>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[s.verifyBtn, !bothTaken && s.verifyBtnDisabled]}
          disabled={!bothTaken || verifying}
          onPress={handleVerify}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.verifyBtnText}>인증하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ShotColumn({
  shotKey,
  uri,
  onPress,
  onRetake,
}: {
  shotKey: ShotKey;
  uri: string | null;
  onPress: () => void;
  onRetake: () => void;
}) {
  const meta = SHOT_META[shotKey];
  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={s.shotBox} activeOpacity={0.7} onPress={onPress}>
        {uri ? (
          <Image source={{ uri }} style={s.shotImage} />
        ) : (
          <>
            <Text style={{ fontSize: 30 }}>📷</Text>
            <Text style={s.shotLabel}>{meta.label}</Text>
            <Text style={s.shotSub}>{meta.sub}</Text>
          </>
        )}
      </TouchableOpacity>

      {uri && (
        <TouchableOpacity style={s.retakeBtn} activeOpacity={0.75} onPress={onRetake}>
          <Text style={s.retakeBtnText}>🔄 다시 촬영하기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 12, paddingTop: 54, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 28, color: "#222" },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#222", flex: 1, textAlign: "center", marginHorizontal: 8 },
  infoCard: {
    flexDirection: "row", gap: 10, backgroundColor: "#FFE8DE", borderRadius: 14,
    margin: 20, marginBottom: 16, padding: 16, alignItems: "flex-start",
  },
  infoText: { flex: 1, color: "#993C1D", fontSize: 13, lineHeight: 19 },
  shotsRow: { flexDirection: "row", gap: 14, paddingHorizontal: 20 },
  shotBox: {
    width: "100%", aspectRatio: 3 / 4, borderRadius: 16, backgroundColor: "#FFE8DE",
    borderWidth: 2, borderColor: "#FF5722", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative",
  },
  shotLabel: { fontSize: 16, fontWeight: "bold", color: "#993C1D", marginTop: 8 },
  shotSub: { fontSize: 12, color: "#993C1D", marginTop: 2 },
  shotImage: { width: "100%", height: "100%" },
  retakeBtn: {
    marginTop: 8, backgroundColor: "#FFE8DE", borderRadius: 10, paddingVertical: 8,
    alignItems: "center", borderWidth: 1, borderColor: "#FF5722",
  },
  retakeBtnText: { color: "#FF5722", fontSize: 12, fontWeight: "bold" },
  receiptSection: { paddingHorizontal: 20, paddingTop: 22 },
  receiptHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  receiptTitle: { fontSize: 14, fontWeight: "bold", color: "#222" },
  receiptOptionalTag: {
    fontSize: 10, fontWeight: "bold", color: "#888", backgroundColor: "#eee",
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
  },
  receiptDesc: { fontSize: 12, color: "#999", marginTop: 4, marginBottom: 10 },
  receiptBox: {
    width: "100%", height: 110, borderRadius: 14, backgroundColor: "#F5F5F5",
    borderWidth: 1.5, borderColor: "#ccc", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", overflow: "hidden", gap: 4,
  },
  receiptBoxText: { fontSize: 13, color: "#888", fontWeight: "600" },
  receiptImage: { width: "100%", height: "100%" },
  ocrBox: {
    marginTop: 10, backgroundColor: "#F5F5F5", borderRadius: 12, padding: 12, gap: 4,
  },
  ocrLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ocrLoadingText: { fontSize: 12, color: "#888" },
  ocrLabel: { fontSize: 11, fontWeight: "bold", color: "#993C1D" },
  ocrText: { fontSize: 12, color: "#444", lineHeight: 18 },
  ocrErrorText: { fontSize: 12, color: "#C0392B" },
  footer: { padding: 20, paddingTop: 26 },
  verifyBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  verifyBtnDisabled: { backgroundColor: "#FFC3AC" },
  verifyBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },

  // 앱 자체 카메라 스캔 오버레이
  scanOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  scanTopBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  scanIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  scanIconBtnText: { fontSize: 16, color: "#fff" },
  scanTopTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  scanGuideText: {
    textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 13,
    paddingHorizontal: 32, marginBottom: 24,
  },
  scanFrame: {
    width: 260, height: 260, alignSelf: "center",
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FF5722", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanBottomBar: { flex: 1, alignItems: "center", justifyContent: "center" },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff",
  },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" },
});
