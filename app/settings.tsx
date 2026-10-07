import { Alert, ScrollView, View } from "react-native";

import { SUPPORTED_LANGUAGES, type Language } from "@/src/contexts/LanguageContext";
import { logOut } from "@/src/firebase/authService";
import { useI18n } from "@/src/i18n";
import { makeStyles, useThemePreference, type ThemePreference } from "@/src/theme/ThemeContext";
import { Button, Card, Icons, ListRow, Screen, ScreenHeader, Text } from "@/src/ui";

/** 각 언어는 그 언어 자신의 이름으로 (못 읽는 언어로 된 화면에서도 찾을 수 있게) */
const ENDONYM: Record<Language, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };

const THEME_OPTIONS: { value: ThemePreference; labelKey: "settings.themeSystem" | "settings.themeLight" | "settings.themeDark"; icon: Icons.Icon }[] = [
  { value: "system", labelKey: "settings.themeSystem", icon: Icons.Compass },
  { value: "light", labelKey: "settings.themeLight", icon: Icons.Sun },
  { value: "dark", labelKey: "settings.themeDark", icon: Icons.Moon },
];

export default function SettingsScreen() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useThemePreference();
  const s = useStyles();

  const handleLogout = () => {
    Alert.alert(t("settings.logoutConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.logout"),
        style: "destructive",
        // 로그아웃되면 AuthContext의 user가 null이 되고, app/_layout.tsx의 Stack.Protected
        // 가드가 자동으로 /login으로 보낸다.
        onPress: () => logOut().catch((err) => console.error("[settings] 로그아웃 오류:", err)),
      },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader title={t("settings.title")} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.section}>
          <Text variant="title3" accessibilityRole="header">
            {t("settings.language")}
          </Text>
          <Text variant="callout" color="textSecondary">
            {t("settings.languageDesc")}
          </Text>
          <Card padding={0} style={s.group}>
            {SUPPORTED_LANGUAGES.map((lang, i) => (
              <ListRow
                key={lang}
                accessibilityRole="radio"
                title={ENDONYM[lang]}
                subtitle={lang === language ? undefined : t(`lang.${lang}`)}
                selected={lang === language}
                onPress={() => setLanguage(lang)}
                isLast={i === SUPPORTED_LANGUAGES.length - 1}
              />
            ))}
          </Card>
        </View>

        <View style={s.section}>
          <Text variant="title3" accessibilityRole="header">
            {t("settings.appearance")}
          </Text>
          <Text variant="callout" color="textSecondary">
            {t("settings.appearanceDesc")}
          </Text>
          <Card padding={0} style={s.group}>
            {THEME_OPTIONS.map((opt, i) => (
              <ListRow
                key={opt.value}
                accessibilityRole="radio"
                icon={opt.icon}
                title={t(opt.labelKey)}
                selected={preference === opt.value}
                onPress={() => setPreference(opt.value)}
                isLast={i === THEME_OPTIONS.length - 1}
              />
            ))}
          </Card>
        </View>

        <View style={s.section}>
          <Text variant="title3" accessibilityRole="header">
            {t("settings.account")}
          </Text>
          <Button title={t("settings.logout")} icon={Icons.SignOut} variant="danger" onPress={handleLogout} fullWidth />
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.space.xl, gap: t.space.xxxl, paddingBottom: t.space.huge },
  section: { gap: t.space.sm },
  group: { marginTop: t.space.sm },
}));
