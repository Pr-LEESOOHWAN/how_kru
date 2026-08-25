import { Link, useRouter } from "expo-router";
import { useState } from "react";
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
import { getAuthErrorMessage, signUp } from "@/src/firebase/authService";

export default function SignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("모든 항목을 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
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
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
      <Text style={styles.title}>HOW KRU 🌶️</Text>
      <Text style={styles.subtitle}>Create your account</Text>

      <TextInput
        style={styles.input}
        placeholder="이름을 입력하세요"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="이메일을 입력하세요"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호를 입력하세요 (6자 이상)"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호를 다시 입력하세요"
        placeholderTextColor="#999"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        editable={!loading}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign up 🌶️</Text>
        )}
      </TouchableOpacity>

      <Link href="/login" asChild>
        <TouchableOpacity>
          <Text style={styles.loginText}>이미 계정이 있어요? Log in</Text>
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
  button: {
    width: "100%", backgroundColor: "#E63946",
    padding: 16, borderRadius: 12, alignItems: "center", marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  loginText: { color: "#E63946", fontSize: 14 },
});
