import { Link, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getAuthErrorMessage, signIn } from "@/src/firebase/authService";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const router = useRouter();
  // 이메일 입력 후 키보드의 "다음"으로 비밀번호 칸으로 바로 넘어가게 하기 위한 ref
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password, keepLoggedIn);
      router.replace("/(tabs)");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 작은 화면에서 키보드가 올라오면 입력칸/버튼이 가려지던 문제 -> signup.tsx처럼 스크롤 가능하게.
          keyboardShouldPersistTaps="handled": 키보드 열린 상태에서 버튼을 한 번만 눌러도 바로 반응 */}
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.title}>HOW KRU 🌶️</Text>
      <Text style={styles.subtitle}>Korean Are You?</Text>

      <TextInput
        style={styles.input}
        placeholder="아이디(이메일)를 입력하세요"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        blurOnSubmit={false}
        editable={!loading}
      />

      <TextInput
        ref={passwordRef}
        style={styles.input}
        placeholder="비밀번호를 입력하세요"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
        editable={!loading}
      />

      <TouchableOpacity
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={() => setKeepLoggedIn((v) => !v)}
        disabled={loading}
      >
        <View style={[styles.checkbox, keepLoggedIn && styles.checkboxChecked]}>
          {keepLoggedIn && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>로그인 상태 유지</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Start Challenge 🚀</Text>
        )}
      </TouchableOpacity>

      <Link href="/signup" asChild>
        <TouchableOpacity>
          <Text style={styles.signupText}>처음이에요? Sign up</Text>
        </TouchableOpacity>
      </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  title: { fontSize: 36, fontWeight: "bold", color: "#E63946", marginBottom: 4 },
  subtitle: { fontSize: 16, color: "#888", marginBottom: 40 },
  input: {
    width: "100%", borderWidth: 1, borderColor: "#ddd", color: "#222",
    borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16,
  },
  errorText: { color: "#E63946", fontSize: 14, marginBottom: 16, alignSelf: "flex-start" },
  checkboxRow: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: 16, gap: 8,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#ccc",
    alignItems: "center", justifyContent: "center", backgroundColor: "#fff",
  },
  checkboxChecked: { backgroundColor: "#E63946", borderColor: "#E63946" },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "bold" },
  checkboxLabel: { fontSize: 14, color: "#555" },
  button: {
    width: "100%", backgroundColor: "#E63946",
    padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  signupText: { color: "#E63946", fontSize: 14 },
});
