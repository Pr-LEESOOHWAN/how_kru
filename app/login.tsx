import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
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
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="비밀번호를 입력하세요"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: "#fff",
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
  signupText: { color: "#E63946", fontSize: 14 },
});
