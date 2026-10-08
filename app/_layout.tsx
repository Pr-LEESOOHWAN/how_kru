// SDK 56부터 expo-router가 @react-navigation/native를 자체 내장 버전으로 감싸서 쓰기 때문에,
// 앱 코드에서 직접 @react-navigation/native를 import하면 서로 다른 버전이 섞여 빌드 에러가
// 난다. 테마 관련 export는 expo-router가 그대로 재노출해주므로 여기서 가져다 쓴다.
// https://docs.expo.dev/router/migrate/sdk-55-to-56/
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';
import { AppThemeProvider, useTheme } from '@/src/theme/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 어느 화면에서든 렌더 오류가 나면 앱 전체가 멈추는 대신 "다시 시도" 화면을 보여준다.
export { AppErrorFallback as ErrorBoundary } from '@/src/components/AppErrorFallback';

function RootNavigator() {
  const { user, initializing } = useAuth();
  const theme = useTheme();

  // Firebase가 세션 복원을 마칠 때까지 아무 화면도 그리지 않는다 (로그인/탭 화면 깜빡임 방지).
  if (initializing) {
    return null;
  }

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="mission" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="levels" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="dish-reviews" options={{ headerShown: false, presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'card' }} />
      </Stack.Protected>
    </Stack>
  );
}

/**
 * 앱 토큰 테마를 네비게이션 테마/상태바/시스템 배경에 연결한다. 예전엔 네비게이션만
 * 시스템 다크모드를 따라가고 화면은 흰색 고정이라, 다크모드 기기에서 화면 전환 순간
 * 검은 배경이 비치거나 상태바 글씨가 안 보이는 경우가 있었다.
 */
function ThemedApp() {
  const theme = useTheme();
  const c = theme.colors;
  const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: c.primary,
          background: c.bg,
          card: c.surface,
          text: c.text,
          border: c.border,
          notification: c.primary,
        },
      }}
    >
      <RootNavigator />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppThemeProvider>
          <AuthProvider>
            <ThemedApp />
          </AuthProvider>
        </AppThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
