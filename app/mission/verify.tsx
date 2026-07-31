import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ShotKey = "sign" | "food";

const SHOT_META: Record<ShotKey, { label: string; sub: string; guide: string }> = {
  sign: { label: "상호", sub: "(Restaurant Sign)", guide: "식당 간판/상호가 잘 보이게 비춰주세요" },
  food: { label: "요리", sub: "(Food)", guide: "주문한 요리가 잘 보이게 비춰주세요" },
};

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
  }>();

  const [shots, setShots] = useState<Record<ShotKey, string | null>>({ sign: null, food: null });
  const [verifying, setVerifying] = useState(false);

  // 앱 자체 카메라 스캔 오버레이 상태
  const [activeShot, setActiveShot] = useState<ShotKey | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const openScan = async (key: ShotKey) => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setActiveShot(key);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !activeShot) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    if (photo?.uri) {
      setShots((prev) => ({ ...prev, [activeShot]: photo.uri }));
    }
    setActiveShot(null);
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
            <TouchableOpacity style={s.captureBtn} activeOpacity={0.8} onPress={capturePhoto}>
              <View style={s.captureBtnInner} />
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

      <View style={s.footer}>
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
