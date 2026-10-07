import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Icons, Text } from "@/src/ui";

import { LanguageSwitcher } from "./LanguageSwitcher";

/** 슬로건은 브랜드 문구라 번역하지 않는다. */
const BRAND_TAGLINE = "Korean Are You?";

/**
 * 로그인/회원가입 공용 틀: 언어 전환 + 브랜드 + 폼. 키보드가 올라와도 작은 화면에서
 * 입력칸/버튼이 가려지지 않게 스크롤되고, 키보드가 열린 채로 버튼을 한 번에 누를 수 있다.
 */
export function AuthLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const s = useStyles();

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + theme.space.md, paddingBottom: insets.bottom + theme.space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <LanguageSwitcher />

        <View style={s.brand}>
          <View style={s.mark}>
            <Icons.Pepper size={30} color={theme.colors.onPrimary} weight="fill" />
          </View>
          <Text variant="display" style={s.wordmark} accessibilityRole="header">
            HOW KRU
          </Text>
          <Text variant="caption" color="textTertiary" style={s.tagline}>
            {BRAND_TAGLINE}
          </Text>
          <Text variant="body" color="textSecondary" align="center" style={s.subtitle}>
            {subtitle}
          </Text>
        </View>

        <View style={s.form}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  content: { flexGrow: 1, paddingHorizontal: t.space.xxl, gap: t.space.xxl },
  brand: { alignItems: "center", marginTop: t.space.xl },
  mark: {
    width: 64,
    height: 64,
    borderRadius: t.radius.xl,
    backgroundColor: t.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.lg,
    transform: [{ rotate: "-6deg" }],
  },
  wordmark: { letterSpacing: 1 },
  tagline: { letterSpacing: 1.2, textTransform: "uppercase", marginTop: t.space.xs },
  subtitle: { marginTop: t.space.lg, maxWidth: 300 },
  form: { gap: t.space.lg, width: "100%", maxWidth: 440, alignSelf: "center" },
}));
