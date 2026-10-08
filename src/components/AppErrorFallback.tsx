// 화면을 그리다 예상 못 한 오류가 나면 보여주는 화면(expo-router ErrorBoundary).
//
// 예전엔 오류 경계가 하나도 없어서 어느 화면이든 렌더 중 오류가 나면 앱 전체가 하얀 화면(배포판)
// 또는 빨간 오류 화면(개발판)으로 멈췄다. 루트 레이아웃에서 내보내므로 이 화면은 언어/테마/로그인
// Provider "바깥"에서 그려진다 - 그래서 Context를 쓰지 않고 기기 언어와 시스템 다크모드를 직접 읽는다
// (Provider 자체가 오류의 원인이어도 이 화면은 떠야 하므로).

import type { ErrorBoundaryProps } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, useColorScheme, View } from "react-native";

import { deviceLanguage } from "@/src/contexts/LanguageContext";
import { translate } from "@/src/i18n";
import { darkTheme, lightTheme } from "@/src/theme/tokens";
import { WarningCircle } from "@/src/ui/icons";

export function AppErrorFallback({ error, retry }: ErrorBoundaryProps) {
  const theme = useColorScheme() === "dark" ? darkTheme : lightTheme;
  const c = theme.colors;
  const lang = deviceLanguage();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  const onRetry = async () => {
    setRetrying(true);
    try {
      await retry();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.space.xxxl,
        gap: theme.space.md,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: theme.radius.pill,
          backgroundColor: c.dangerTint,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: theme.space.sm,
        }}
      >
        <WarningCircle size={36} color={c.danger} weight="fill" />
      </View>
      <Text accessibilityRole="header" style={{ ...theme.type.title2, color: c.text, textAlign: "center" }}>
        {translate(lang, "error.title")}
      </Text>
      <Text style={{ ...theme.type.body, color: c.textSecondary, textAlign: "center", maxWidth: 320 }}>
        {translate(lang, "error.body")}
      </Text>
      <Pressable
        onPress={onRetry}
        disabled={retrying}
        accessibilityRole="button"
        accessibilityState={{ busy: retrying, disabled: retrying }}
        style={({ pressed }) => ({
          marginTop: theme.space.lg,
          minWidth: 160,
          minHeight: 48,
          paddingHorizontal: theme.space.xl,
          borderRadius: theme.radius.lg,
          backgroundColor: c.primaryFill,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        {retrying ? (
          <ActivityIndicator color={c.onPrimary} />
        ) : (
          <Text style={{ ...theme.type.bodyStrong, color: c.onPrimary }}>{translate(lang, "common.retry")}</Text>
        )}
      </Pressable>
    </View>
  );
}
