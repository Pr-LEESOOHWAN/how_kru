import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const SCAN_SIZE = width * 0.75;

type ScanMode = "restaurant" | "food";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState<ScanMode>("restaurant");
  const [scanned, setScanned] = useState(false);
  const [flash, setFlash] = useState(false);
  const router = useRouter();

  // 권한 요청
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // 권한 없을 때
  if (!permission?.granted) {
    return (
      <View style={s.permissionBox}>
        <Text style={s.permissionEmoji}>📷</Text>
        <Text style={s.permissionTitle}>카메라 권한이 필요해요</Text>
        <Text style={s.permissionDesc}>
          식당과 요리를 스캔하려면 카메라 접근 권한이 필요해요.
        </Text>
        <TouchableOpacity style={s.permissionBtn} onPress={requestPermission}>
          <Text style={s.permissionBtnText}>카메라 허용하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = () => {
    if (scanned) {
      // 스캔 초기화
      setScanned(false);
      return;
    }
    // 스캔 완료 처리 (추후 인식 로직 추가)
    setScanned(true);
    Alert.alert(
      scanMode === "restaurant" ? "🏪 식당 스캔 완료!" : "🍽️ 음식 스캔 완료!",
      "인식 기능은 준비 중이에요.\n곧 만나볼 수 있어요!",
      [
        {
          text: "다시 스캔하기",
          onPress: () => setScanned(false),
        },
        {
          text: "완료",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <View style={s.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash}
      />

      {/* 어두운 오버레이 */}
      <View style={s.overlay}>

        {/* 상단 헤더 */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.iconBtn} onPress={() => router.back()}>
            <Text style={s.iconBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>
            {scanMode === "restaurant" ? "🏪 식당 스캔" : "🍽️ 음식 스캔"}
          </Text>
          <TouchableOpacity
            style={s.iconBtn}
            onPress={() => setFlash(!flash)}
          >
            <Text style={s.iconBtnText}>{flash ? "⚡" : "🔦"}</Text>
          </TouchableOpacity>
        </View>

        {/* 가이드 텍스트 */}
        <Text style={s.guideText}>
          {scanMode === "restaurant"
            ? "식당 간판이나 입구를 비춰주세요"
            : "기록하고 싶은 요리를 비춰주세요"}
        </Text>

        {/* 스캔 프레임 */}
        <View style={s.scanArea}>
          {/* 모서리 4개 */}
          <View style={[s.corner, s.cornerTL]} />
          <View style={[s.corner, s.cornerTR]} />
          <View style={[s.corner, s.cornerBL]} />
          <View style={[s.corner, s.cornerBR]} />

          {/* 스캔 라인 애니메이션 대신 상태 표시 */}
          {scanned ? (
            <View style={s.scannedBadge}>
              <Text style={s.scannedText}>✓ 스캔 완료</Text>
            </View>
          ) : (
            <View style={s.scanningBadge}>
              <Text style={s.scanningText}>스캔 중...</Text>
            </View>
          )}
        </View>

        {/* 스캔 모드 토글 */}
        <View style={s.modeToggle}>
          <TouchableOpacity
            style={[s.modeBtn, scanMode === "restaurant" && s.modeBtnActive]}
            onPress={() => { setScanMode("restaurant"); setScanned(false); }}
          >
            <Text style={[s.modeBtnText, scanMode === "restaurant" && s.modeBtnTextActive]}>
              🏪 식당
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeBtn, scanMode === "food" && s.modeBtnActive]}
            onPress={() => { setScanMode("food"); setScanned(false); }}
          >
            <Text style={[s.modeBtnText, scanMode === "food" && s.modeBtnTextActive]}>
              🍽️ 음식
            </Text>
          </TouchableOpacity>
        </View>

        {/* 촬영 버튼 */}
        <View style={s.bottomBar}>
          <TouchableOpacity
            style={[s.captureBtn, scanned && s.captureBtnScanned]}
            onPress={handleCapture}
            activeOpacity={0.8}
          >
            <View style={s.captureBtnInner} />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // 권한
  permissionBox: { flex: 1, backgroundColor: "#111", alignItems: "center", justifyContent: "center", padding: 32 },
  permissionEmoji: { fontSize: 48, marginBottom: 16 },
  permissionTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  permissionDesc: { fontSize: 14, color: "#aaa", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  permissionBtn: { backgroundColor: "#FF5722", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  permissionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  // 오버레이
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },

  // 상단 헤더
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  iconBtnText: { fontSize: 16, color: "#fff" },
  topTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },

  // 가이드
  guideText: { textAlign: "center", color: "rgba(255,255,255,0.75)", fontSize: 13, paddingHorizontal: 32, marginBottom: 24 },

  // 스캔 프레임
  scanArea: {
    width: SCAN_SIZE, height: SCAN_SIZE,
    alignSelf: "center",
    alignItems: "center", justifyContent: "center",
    position: "relative",
  },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#FF5722", borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scannedBadge: { backgroundColor: "rgba(76,175,80,0.85)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scannedText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  scanningBadge: { backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scanningText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  // 모드 토글
  modeToggle: { flexDirection: "row", alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 30, padding: 4, marginTop: 32, gap: 4 },
  modeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 26 },
  modeBtnActive: { backgroundColor: "#FF5722" },
  modeBtnText: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  modeBtnTextActive: { color: "#fff" },

  // 촬영 버튼
  bottomBar: { flex: 1, alignItems: "center", justifyContent: "center" },
  captureBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" },
  captureBtnScanned: { borderColor: "#4CAF50" },
  captureBtnInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#fff" },
});