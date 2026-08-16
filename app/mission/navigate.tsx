import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// TODO: 실제 서비스에서는 react-native-maps + 위치 API로 교체.
// 자체 경로 안내(턴바이턴 내비게이션)는 지도 API 라이선스상 제공하지 않고,
// 외부 지도 앱(길찾기)으로 연결하는 방식으로 처리합니다.
// 대신 실제 내 위치 + 식당 위치를 보여주는 정적 미리보기 지도(Google Static Maps)는 제공합니다.

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export default function NavigateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
    restaurantName: string;
    address: string;
    distance: string;
    walk: string;
    lat?: string;
    lng?: string;
    placeId?: string;
  }>();

  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState(false);
  const [mapImgError, setMapImgError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (!cancelled) setLocError(true);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) {
          setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        if (!cancelled) setLocError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasDestCoords = !!params.lat && !!params.lng;

  const staticMapUrl = (() => {
    if (!GOOGLE_MAPS_API_KEY || !hasDestCoords) return null;
    const destMarker = `color:0xFF5722|label:R|${params.lat},${params.lng}`;
    const markers = myLoc
      ? [`color:0x3E7FC1|label:U|${myLoc.lat},${myLoc.lng}`, destMarker]
      : [destMarker];
    const markerParams = markers.map((m) => `markers=${encodeURIComponent(m)}`).join("&");
    return (
      `https://maps.googleapis.com/maps/api/staticmap?size=640x400&scale=2` +
      `&maptype=roadmap&${markerParams}&key=${GOOGLE_MAPS_API_KEY}`
    );
  })();

  const openInMaps = () => {
    const query = encodeURIComponent(`${params.restaurantName} ${params.address}`);

    const url = hasDestCoords
      ? Platform.select({
          ios: `maps://?daddr=${params.lat},${params.lng}&dirflg=w`,
          android: `google.navigation:q=${params.lat},${params.lng}&mode=w`,
          default: `https://www.google.com/maps/dir/?api=1&destination=${params.lat},${params.lng}${params.placeId ? `&destination_place_id=${params.placeId}` : ""}&travelmode=walking`,
        })
      : Platform.select({
          ios: `maps:0,0?q=${query}`,
          android: `geo:0,0?q=${query}`,
          default: `https://maps.google.com/?q=${query}`,
        });

    if (!url) return;
    Linking.openURL(url).catch(() => {
      // 특정 지도 앱(예: 구글맵 미설치)이 없을 때는 웹 브라우저 길찾기로 대체
      const fallback = `https://www.google.com/maps/dir/?api=1&destination=${
        hasDestCoords ? `${params.lat},${params.lng}` : query
      }&travelmode=walking`;
      Linking.openURL(fallback).catch(() => {
        // 웹 브라우저 길찾기까지 실패한 경우 사용자에게 알려줌(기존엔 아무 반응 없이 조용히 실패했음)
        Alert.alert("길찾기를 열 수 없어요", "지도 앱을 열지 못했어요. 잠시 후 다시 시도해주세요.");
      });
    });
  };

  const handleArrived = () => {
    router.push({ pathname: "/mission/arrived", params });
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{params.restaurantName}으로 이동</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.infoPillWrap}>
        <View style={s.infoPill}>
          <Text style={s.infoPillText}>{params.walk} · {params.distance}</Text>
        </View>
      </View>

      <View style={s.mapArea}>
        {staticMapUrl && !mapImgError ? (
          <ImageBackground
            source={{ uri: staticMapUrl }}
            style={s.mapImage}
            resizeMode="cover"
            onError={(e) =>
              setMapImgError(e.nativeEvent?.error ?? "지도 이미지를 불러오지 못했어요.")
            }
          >
            <View style={s.mapLegend}>
              <View style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: "#3E7FC1" }]} />
                <Text style={s.legendText}>내 위치 (U)</Text>
              </View>
              <View style={s.legendRow}>
                <View style={[s.legendDot, { backgroundColor: "#FF5722" }]} />
                <Text style={s.legendText} numberOfLines={1}>{params.restaurantName} (R)</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <View style={s.mapFallback}>
            {mapImgError ? (
              <>
                <Text style={{ fontSize: 28 }}>⚠️</Text>
                <Text style={s.mapFallbackText}>
                  지도 미리보기를 불러올 수 없어요.{"\n"}Google Cloud Console에서 "Maps Static API"가
                  활성화되어 있는지, API 키 제한사항에 Maps Static API가 허용되어 있는지 확인해주세요.
                </Text>
                <TouchableOpacity
                  onPress={() => setMapImgError(null)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FFF0EC" }}
                >
                  <Text style={{ color: "#FF5722", fontSize: 12, fontWeight: "bold" }}>🔄 다시 시도</Text>
                </TouchableOpacity>
              </>
            ) : locError ? (
              <Text style={s.mapFallbackText}>위치 권한이 없어 지도 미리보기를 표시할 수 없어요.</Text>
            ) : (
              <>
                <ActivityIndicator color="#FF5722" />
                <Text style={s.mapFallbackText}>지도를 불러오는 중...</Text>
              </>
            )}
          </View>
        )}
      </View>

      <View style={s.sheet}>
        <View style={s.handle} />
        <Text style={s.sheetName}>{params.restaurantName}</Text>
        <Text style={s.sheetAddress}>{params.address} · {params.walk} · {params.distance}</Text>

        <TouchableOpacity style={s.mapsBtn} onPress={openInMaps}>
          <Text style={s.mapsBtnText}>지도 앱으로 길찾기 열기 ↗</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.arrivedBtn} onPress={handleArrived}>
          <Text style={s.arrivedBtnText}>도착했어요</Text>
        </TouchableOpacity>
      </View>
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
  infoPillWrap: { alignItems: "center", backgroundColor: "#fff", paddingBottom: 14 },
  infoPill: {
    borderWidth: 1.5, borderColor: "#FF5722", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  infoPillText: { color: "#FF5722", fontWeight: "bold", fontSize: 13 },
  mapArea: {
    flex: 1, backgroundColor: "#F6EFE6", position: "relative", overflow: "hidden",
  },
  mapImage: { flex: 1, justifyContent: "flex-start", alignItems: "flex-start" },
  mapLegend: {
    margin: 14, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 6, maxWidth: 200,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: "600", color: "#333", flexShrink: 1 },
  mapFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  mapFallbackText: { fontSize: 13, color: "#999", paddingHorizontal: 30, textAlign: "center" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  handle: { width: 36, height: 4, backgroundColor: "#e0e0e0", borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  sheetName: { fontSize: 19, fontWeight: "bold", color: "#222" },
  sheetAddress: { fontSize: 13, color: "#888", marginTop: 4, marginBottom: 16 },
  mapsBtn: {
    borderWidth: 1.5, borderColor: "#FF5722", borderRadius: 14,
    paddingVertical: 14, alignItems: "center", marginBottom: 10,
  },
  mapsBtnText: { color: "#FF5722", fontWeight: "bold", fontSize: 15 },
  arrivedBtn: { backgroundColor: "#FF5722", borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  arrivedBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
