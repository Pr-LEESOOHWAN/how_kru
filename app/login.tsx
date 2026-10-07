import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View, type TextInput } from "react-native";

import { AuthLayout } from "@/src/components/AuthLayout";
import { authErrorKey, signIn } from "@/src/firebase/authService";
import { useI18n, type MessageKey } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Button, Icons, PressableScale, Text, TextField } from "@/src/ui";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const s = useStyles();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // 오류는 번역 키로 들고 있어서, 오류가 떠 있는 상태에서 언어를 바꿔도 같이 바뀐다.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  // 이메일 입력 후 키보드의 "다음"으로 비밀번호 칸으로 바로 넘어가게 하기 위한 ref
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorKey("auth.error.missingLogin");
      return;
    }
    setErrorKey(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password, keepLoggedIn);
      router.replace("/(tabs)");
    } catch (err) {
      setErrorKey(authErrorKey(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle={t("auth.subtitleLogin")}>
      <TextField
        label={t("auth.email")}
        icon={Icons.Envelope}
        placeholder="name@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
        editable={!loading}
      />

      <TextField
        ref={passwordRef}
        label={t("auth.password")}
        icon={Icons.Lock}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        revealable
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
        editable={!loading}
        error={errorKey ? t(errorKey) : undefined}
      />

      <PressableScale
        onPress={() => setKeepLoggedIn((v) => !v)}
        disabled={loading}
        haptic="selection"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: keepLoggedIn }}
        accessibilityLabel={t("auth.keepLoggedIn")}
        style={s.checkRow}
      >
        <View style={[s.checkbox, keepLoggedIn && s.checkboxOn]}>
          {keepLoggedIn ? <Icons.Check size={14} color={theme.colors.onPrimary} weight="bold" /> : null}
        </View>
        <Text variant="callout" color="textSecondary">
          {t("auth.keepLoggedIn")}
        </Text>
      </PressableScale>

      <Button title={t("auth.loginCta")} onPress={handleLogin} loading={loading} size="lg" fullWidth />

      <View style={s.switchRow}>
        <Text variant="callout" color="textTertiary">
          {t("auth.noAccount")}
        </Text>
        <Button title={t("auth.goSignup")} variant="ghost" size="sm" onPress={() => router.push("/signup")} />
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  checkRow: { flexDirection: "row", alignItems: "center", gap: t.space.sm, alignSelf: "flex-start", minHeight: 36 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: t.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: t.colors.surface,
  },
  checkboxOn: { backgroundColor: t.colors.primaryFill, borderColor: t.colors.primaryFill },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space.xs },
}));
