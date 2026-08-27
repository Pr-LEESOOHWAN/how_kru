import { useLanguage, type Language } from "@/src/contexts/LanguageContext";
import { t } from "@/src/i18n/strings";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANGUAGE_OPTIONS: { code: Language; labelKey: "languageKorean" | "languageEnglish"; flag: string }[] = [
  { code: "ko", labelKey: "languageKorean", flag: "🇰🇷" },
  { code: "en", labelKey: "languageEnglish", flag: "🇺🇸" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: Math.max(insets.top, 20) + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t("settingsTitle", language)}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>{t("languageSectionTitle", language)}</Text>
        <Text style={s.sectionDesc}>{t("languageSectionDesc", language)}</Text>

        <View style={s.optionList}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = language === opt.code;
            return (
              <TouchableOpacity
                key={opt.code}
                style={[s.optionRow, active && s.optionRowActive]}
                activeOpacity={0.75}
                onPress={() => setLanguage(opt.code)}
              >
                <Text style={s.optionFlag}>{opt.flag}</Text>
                <Text style={[s.optionLabel, active && s.optionLabelActive]}>
                  {t(opt.labelKey, language)}
                </Text>
                {active && <Text style={s.optionCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.noteBox}>
          <Text style={s.noteTitle}>ℹ️ {t("languageNoteTitle", language)}</Text>
          <Text style={s.noteText}>{t("languageNote", language)}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F5F5" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: 12, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: "#eee",
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 28, color: "#222" },
  headerTitle: { fontSize: 17, fontWeight: "bold", color: "#222" },
  section: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#222", marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: "#888", marginBottom: 16 },
  optionList: {
    backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", borderWidth: 0.5, borderColor: "#eee",
  },
  optionRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0",
  },
  optionRowActive: { backgroundColor: "#FFF0EC" },
  optionFlag: { fontSize: 20 },
  optionLabel: { flex: 1, fontSize: 15, color: "#333", fontWeight: "600" },
  optionLabelActive: { color: "#FF5722" },
  optionCheck: { fontSize: 16, color: "#FF5722", fontWeight: "bold" },
  noteBox: { marginTop: 16, backgroundColor: "#FFF7E8", borderRadius: 12, padding: 14 },
  noteTitle: { fontSize: 12, fontWeight: "bold", color: "#8A6D1D", marginBottom: 4 },
  noteText: { fontSize: 12, color: "#8A6D1D", lineHeight: 18 },
});
