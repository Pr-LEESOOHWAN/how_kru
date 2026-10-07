import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View, type TextInput } from "react-native";

import { AuthLayout } from "@/src/components/AuthLayout";
import { authErrorKey, signUp } from "@/src/firebase/authService";
import { useI18n, type MessageKey } from "@/src/i18n";
import { makeStyles } from "@/src/theme/ThemeContext";
import { Button, Icons, Text, TextField } from "@/src/ui";

type Field = "name" | "email" | "password" | "confirm" | "form";

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const s = useStyles();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // 오류를 해당 입력칸 아래에 붙여서 보여준다(예전엔 폼 맨 아래 한 줄이라 어느 칸 문제인지 몰랐다).
  const [error, setError] = useState<{ field: Field; key: MessageKey } | null>(null);
  const [loading, setLoading] = useState(false);
  // 키보드 "다음"으로 이름 → 이메일 → 비밀번호 → 비밀번호 확인 순서로 넘어가게 하기 위한 ref
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const errorFor = (field: Field) => (error?.field === field ? t(error.key) : undefined);

  const handleSignup = async () => {
    // 공백만 입력한 이름/이메일은 빈 값으로 취급 (실제 저장 시에도 trim해서 쓰므로 일관되게)
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError({ field: "form", key: "auth.error.missingFields" });
      return;
    }
    if (password.length < 6) {
      setError({ field: "password", key: "auth.error.weakPassword" });
      return;
    }
    if (password !== confirmPassword) {
      setError({ field: "confirm", key: "auth.error.passwordMismatch" });
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.replace("/(tabs)");
    } catch (err) {
      const key = authErrorKey(err);
      const field: Field =
        key === "auth.error.invalidEmail" || key === "auth.error.emailInUse"
          ? "email"
          : key === "auth.error.weakPassword"
            ? "password"
            : "form";
      setError({ field, key });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout subtitle={t("auth.subtitleSignup")}>
      <TextField
        label={t("auth.name")}
        placeholder={t("auth.namePlaceholder")}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="name"
        autoComplete="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
        editable={!loading}
      />
      <TextField
        ref={emailRef}
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
        error={errorFor("email")}
      />
      <TextField
        ref={passwordRef}
        label={t("auth.password")}
        icon={Icons.Lock}
        placeholder={t("auth.passwordNewPlaceholder")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        revealable
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
        editable={!loading}
        error={errorFor("password")}
      />
      <TextField
        ref={confirmRef}
        label={t("auth.passwordConfirm")}
        icon={Icons.Lock}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        revealable
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={handleSignup}
        editable={!loading}
        error={errorFor("confirm")}
      />

      {error?.field === "form" ? (
        <Text variant="callout" color="danger" accessibilityLiveRegion="polite">
          {t(error.key)}
        </Text>
      ) : null}

      <Button title={t("auth.signupCta")} onPress={handleSignup} loading={loading} size="lg" fullWidth />

      <View style={s.switchRow}>
        <Text variant="callout" color="textTertiary">
          {t("auth.haveAccount")}
        </Text>
        {/* 보통 로그인 화면에서 넘어오므로 뒤로 가면 된다 - 새로 push하면 로그인이 스택에 두 번 쌓인다. */}
        <Button
          title={t("auth.goLogin")}
          variant="ghost"
          size="sm"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
        />
      </View>
    </AuthLayout>
  );
}

const useStyles = makeStyles((t) => ({
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space.xs },
}));
