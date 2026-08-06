import { useAuth } from "@/src/contexts/AuthContext";
import { Dish, getDish, saveKickChoice } from "@/src/firebase/dishService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FALLBACK_QUESTION = "이 요리의 '킥'은 무엇이었나요?";
const FALLBACK_OPTIONS = ["맛", "식감", "냄새", "생김새"];
const CUSTOM_KEY = "__custom__";

export default function KickScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(FALLBACK_QUESTION);
  const [options, setOptions] = useState<string[]>(FALLBACK_OPTIONS);
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dish: Dish | null = params.dishId ? await getDish(params.dishId) : null;
        if (cancelled) return;
        if (dish?.kick_question) setQuestion(dish.kick_question);
        if (dish?.kick_options?.length) setOptions(dish.kick_options.slice(0, 4));
      } catch {
        // 실패하면 기본 질문/옵션 사용
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.dishId]);

  const selectOption = (opt: string) => {
    setSelected(opt);
  };

  const selectCustom = () => {
    setSelected(CUSTOM_KEY);
  };

  const canConfirm =
    (selected && selected !== CUSTOM_KEY) ||
    (selected === CUSTOM_KEY && customText.trim().length > 0);

  const handleNext = async () => {
    if (!canConfirm || saving) return;
    const answer = selected === CUSTOM_KEY ? customText.trim() : (selected as string);
    setSaving(true);
    try {
      if (params.dishId && user) {
        await saveKickChoice(user.uid, params.dishId, answer);
      }
    } catch (err) {
      // 화면은 그대로 진행하되(사용자 경험 방해 X), 콘솔에는 남겨서 저장 실패를 추적 가능하게 함
      console.error("[mission/kick] saveKickChoice failed:", err);
    } finally {
      setSaving(false);
      router.push({ pathname: "/mission/level-progress", params });
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.center}>
        <Text style={s.emoji}>✨</Text>
        <Text style={s.title}>What's your kick?</Text>
        <Text style={s.dishName}>{params.name_kr}</Text>

        {loading ? (
          <ActivityIndicator color="#FF5722" style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={s.question}>{question}</Text>

            <View style={s.optionsWrap}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.optionBtn, selected === opt && s.optionBtnActive]}
                  onPress={() => selectOption(opt)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.optionText, selected === opt && s.optionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[s.optionBtn, s.customBtn, selected === CUSTOM_KEY && s.optionBtnActive]}
                onPress={selectCustom}
                activeOpacity={0.75}
              >
                <Text style={[s.optionText, selected === CUSTOM_KEY && s.optionTextActive]}>
                  ✏️ 직접 입력
                </Text>
              </TouchableOpacity>
            </View>

            {selected === CUSTOM_KEY && (
              <TextInput
                style={s.customInput}
                placeholder="직접 느낀 점을 적어주세요"
                placeholderTextColor="#bbb"
                value={customText}
                onChangeText={setCustomText}
                multiline
                maxLength={80}
              />
            )}
          </>
        )}
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.primaryBtn, !canConfirm && s.primaryBtnDisabled]}
          disabled={!canConfirm || saving}
          onPress={handleNext}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.primaryBtnText}>다음으로</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emoji: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", color: "#222" },
  dishName: { fontSize: 14, color: "#FF5722", fontWeight: "600", marginTop: 4, marginBottom: 18 },
  question: { fontSize: 16, color: "#333", fontWeight: "600", textAlign: "center", marginBottom: 18 },
  optionsWrap: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
  optionBtn: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22,
    borderWidth: 1.5, borderColor: "#eee", backgroundColor: "#FAFAFA",
  },
  optionBtnActive: { borderColor: "#FF5722", backgroundColor: "#FFF0EC" },
  optionText: { fontSize: 14, color: "#555", fontWeight: "600" },
  optionTextActive: { color: "#FF5722" },
  customBtn: { borderStyle: "dashed" },
  customInput: {
    width: "100%", marginTop: 16, borderWidth: 1.5, borderColor: "#FF5722", borderRadius: 14,
    padding: 14, fontSize: 14, color: "#222", minHeight: 70, textAlignVertical: "top",
    backgroundColor: "#FFF7F4",
  },
  footer: { padding: 20, paddingBottom: 32 },
  primaryBtn: { backgroundColor: "#FF5722", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  primaryBtnDisabled: { backgroundColor: "#FFC3AC" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
});
