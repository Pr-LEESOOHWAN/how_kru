import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";
import { getDish, saveKickChoice, type Dish } from "@/src/firebase/dishService";
import { useI18n } from "@/src/i18n";
import { dishName, kickOptionLabel, kickQuestion } from "@/src/i18n/content";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Button, Icons, PressableScale, Screen, Skeleton, Text, TextField } from "@/src/ui";

// 요리 문서에 kick_options가 없을 때만 쓰는 기본 선택지. 답은 언어와 상관없이 한국어 원문으로
// 저장하고(통계가 섞이지 않게), 화면에만 kickOptionLabel로 번역해서 보여준다.
const FALLBACK_OPTIONS = ["맛", "식감", "냄새", "생김새"];
const CUSTOM_KEY = "__custom__";

export default function KickScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const s = useStyles();
  const params = useLocalSearchParams<{
    dishId: string;
    name_kr: string;
    name_en: string;
  }>();
  const dish = dishName({ id: params.dishId, name_kr: params.name_kr, name_en: params.name_en }, language);

  const [loading, setLoading] = useState(true);
  // 원문(한국어) 질문. 표시할 때 kickQuestion()으로 번역한다.
  const [question, setQuestion] = useState<string | undefined>(undefined);
  const [options, setOptions] = useState<string[]>(FALLBACK_OPTIONS);
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data: Dish | null = params.dishId ? await getDish(params.dishId) : null;
        if (cancelled) return;
        if (data?.kick_question) setQuestion(data.kick_question);
        if (data?.kick_options?.length) setOptions(data.kick_options.slice(0, 4));
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

  const canConfirm =
    (selected && selected !== CUSTOM_KEY) || (selected === CUSTOM_KEY && customText.trim().length > 0);

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
    <Screen style={s.root}>
      <KeyboardAvoidingView style={s.flex1} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.content, { paddingTop: insets.top + theme.space.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.badge}>
            <Icons.Sparkle size={40} color={theme.colors.primary} weight="fill" />
          </View>
          <Text variant="title1" align="center" accessibilityRole="header">
            {t("kick.title")}
          </Text>
          <Text variant="bodyStrong" color="primaryText" align="center">
            {dish}
          </Text>

          {loading ? (
            <View style={s.options}>
              <Skeleton width="70%" height={20} />
              <View style={s.chips}>
                {[96, 80, 112, 88].map((w, i) => (
                  <Skeleton key={i} width={w} height={44} radius={theme.radius.pill} />
                ))}
              </View>
            </View>
          ) : (
            <View style={s.options}>
              <Text variant="title3" align="center">
                {kickQuestion(question, language)}
              </Text>

              <View style={s.chips} accessibilityRole="radiogroup">
                {options.map((opt) => (
                  <Chip
                    key={opt}
                    label={kickOptionLabel(opt, language)}
                    active={selected === opt}
                    onPress={() => setSelected(opt)}
                  />
                ))}
                <Chip
                  label={t("kick.custom")}
                  icon={Icons.PencilSimple}
                  dashed
                  active={selected === CUSTOM_KEY}
                  onPress={() => setSelected(CUSTOM_KEY)}
                />
              </View>

              {selected === CUSTOM_KEY ? (
                <TextField
                  label={t("kick.customLabel")}
                  placeholder={t("kick.customPlaceholder")}
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  maxLength={80}
                  autoFocus
                />
              ) : null}
            </View>
          )}
        </ScrollView>

        <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, theme.space.xl) }]}>
          <Button title={t("common.next")} size="lg" fullWidth disabled={!canConfirm} loading={saving} onPress={handleNext} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
  icon: ChipIcon,
  dashed,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: typeof Icons.PencilSimple;
  dashed?: boolean;
}) {
  const theme = useTheme();
  const s = useStyles();
  const fg = active ? theme.colors.onPrimary : theme.colors.text;
  return (
    // 선택된 옵션은 연한 틴트가 아니라 진한 채움 + 체크로 확실하게 구분되게 한다.
    <PressableScale
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={[s.chip, dashed && !active && s.chipDashed, active && s.chipActive]}
    >
      {active ? (
        <Icons.Check size={16} color={fg} weight="bold" />
      ) : ChipIcon ? (
        <ChipIcon size={16} color={theme.colors.textSecondary} />
      ) : null}
      <Text variant="callout" style={[s.chipText, { color: fg }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  root: { backgroundColor: t.colors.surface },
  flex1: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: t.space.xxl, paddingBottom: t.space.xxl, gap: t.space.xs },
  badge: {
    width: 88,
    height: 88,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.space.md,
  },
  options: { alignSelf: "stretch", alignItems: "center", gap: t.space.lg, marginTop: t.space.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: t.space.sm + t.space.xxs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs + t.space.xxs,
    minHeight: 44,
    paddingHorizontal: t.space.lg,
    borderRadius: t.radius.pill,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceAlt,
  },
  chipDashed: { borderStyle: "dashed", borderColor: t.colors.borderStrong },
  chipActive: { borderColor: t.colors.primaryFill, backgroundColor: t.colors.primaryFill, boxShadow: t.elevation.card },
  chipText: { fontWeight: "600" },
  footer: { paddingHorizontal: t.space.xl, paddingTop: t.space.md },
}));
