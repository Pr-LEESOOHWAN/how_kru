import { Tabs, useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // 갤럭시 등 안드로이드 제스처바/네비게이션 바와 앱 자체 탭바가 겹치지 않도록
  // 기기의 실제 하단 세이프에어리어(insets.bottom)만큼 여백을 더해줍니다.
  const tabBarBottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 0.5,
          borderTopColor: "#eee",
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
          height: 52 + tabBarBottomPadding,
        },
        tabBarActiveTintColor: "#FF5722",
        tabBarInactiveTintColor: "#aaa",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🍽️</Text>,
        }}
      />
      <Tabs.Screen
        name="levels-tab"
        options={{
          title: "Level",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏆</Text>,
        }}
        listeners={{
          // 탭 자체는 실제 화면을 렌더링하지 않고, 기존 레벨 화면(뒤로가기 있는
          // 스택 화면)으로 바로 이동시킵니다. 하단 바 어디서든 레벨 화면에
          // 바로 접근할 수 있게 하기 위한 용도입니다.
          tabPress: (e) => {
            e.preventDefault();
            router.push("/levels");
          },
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "",
          // 카메라 버튼 — 가운데 튀어나오는 스타일
          tabBarIcon: () => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#FF5722",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
              borderWidth: 3,
              borderColor: "#F5F5F5",
            }}>
              <Text style={{ fontSize: 22 }}>📷</Text>
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
    </Tabs>
  );
}
