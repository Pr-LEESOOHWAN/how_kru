import { Tabs, useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { useTheme } from "@/src/theme/ThemeContext";
import { Icons, triggerHaptic } from "@/src/ui";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const c = theme.colors;
  // 갤럭시 등 안드로이드 제스처바/네비게이션 바와 앱 자체 탭바가 겹치지 않도록
  // 기기의 실제 하단 세이프에어리어(insets.bottom)만큼 여백을 더해준다.
  const tabBarBottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 6,
          height: 56 + tabBarBottomPadding,
        },
        tabBarActiveTintColor: c.primaryText,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ color, focused }) => (
            <Icons.House size={24} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t("tabs.explore"),
          tabBarIcon: ({ color, focused }) => (
            <Icons.BowlFood size={24} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
      />
      <Tabs.Screen
        name="levels-tab"
        options={{
          title: t("tabs.levels"),
          tabBarIcon: ({ color, focused }) => (
            <Icons.Trophy size={24} color={color as string} weight={focused ? "fill" : "regular"} />
          ),
        }}
        listeners={{
          // 탭 자체는 실제 화면을 렌더링하지 않고, 기존 레벨 화면(뒤로가기 있는
          // 스택 화면)으로 바로 이동시킨다. 하단 바 어디서든 레벨 화면에
          // 바로 접근할 수 있게 하기 위한 용도.
          tabPress: (e) => {
            e.preventDefault();
            router.push("/levels");
          },
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: t("tabs.scan"),
          tabBarAccessibilityLabel: t("tabs.scan"),
          // 가운데 튀어나온 스캔 버튼
          tabBarIcon: () => (
            <View
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: c.primaryFill,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 22,
                borderWidth: 4,
                borderColor: c.bg,
                boxShadow: theme.elevation.raised,
              }}
            >
              <Icons.Camera size={26} color={c.onPrimary} weight="bold" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{ tabPress: () => triggerHaptic("light") }}
      />
    </Tabs>
  );
}
