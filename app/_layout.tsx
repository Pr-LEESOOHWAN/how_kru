// SDK 56부터 expo-router가 @react-navigation/native를 자체 내장 버전으로 감싸서 쓰기 때문에,
// 앱 코드에서 직접 @react-navigation/native를 import하면(이 파일이 예전부터 그래왔음) 서로 다른
// 버전이 섞여 "expo-router is no longer compatible with react-navigation" 빌드 에러가 난다.
// 테마 관련 export는 expo-router가 그대로 재노출해주므로 여기서 가져다 쓴다.
// https://docs.expo.dev/router/migrate/sdk-55-to-56/
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { LanguageProvider } from '@/src/contexts/LanguageContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { user, initializing } = useAuth();

  // Firebase가 세션 복원을 마칠 때까지 아무 화면도 그리지 않는다 (로그인/탭 화면 깜빡임 방지).
  if (initializing) {
    return null;
  }

  return (
    <Stack>
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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <RootNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
