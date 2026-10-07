import { View } from "react-native";

import { SUPPORTED_LANGUAGES, type Language } from "@/src/contexts/LanguageContext";
import { useI18n } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { Icons, PressableScale, Text } from "@/src/ui";

/** 각 언어는 그 언어 자신의 이름으로 보여준다(엔도님) - 못 읽는 언어로 된 메뉴에서도 찾을 수 있게. */
const SHORT_LABEL: Record<Language, string> = { ko: "한", en: "EN", ja: "日", zh: "中" };

/**
 * 로그인 전에도 언어를 바꿀 수 있게 하는 작은 세그먼트. 환경설정은 로그인 후에만 열리는데,
 * 기기 언어가 지원 언어가 아닌 사용자는 첫 화면부터 원하는 언어를 골라야 한다.
 */
export function LanguageSwitcher() {
  const theme = useTheme();
  const { t, language, setLanguage } = useI18n();
  const s = useStyles();

  return (
    <View style={s.wrap} accessibilityRole="radiogroup" accessibilityLabel={t("lang.pickerA11y")}>
      <Icons.Globe size={16} color={theme.colors.textTertiary} />
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang === language;
        return (
          <PressableScale
            key={lang}
            haptic="selection"
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={t(`lang.${lang}`)}
            onPress={() => setLanguage(lang)}
            style={[s.chip, active && s.chipActive]}
            // 36pt 칩 + 위아래 4 = 44pt 터치 영역(옆 칩과 겹치지 않게 좌우는 간격만큼만)
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text variant="caption" style={{ color: active ? theme.colors.onPrimary : theme.colors.textSecondary, fontWeight: "700" }}>
              {SHORT_LABEL[lang]}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    alignSelf: "flex-end",
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radius.pill,
    paddingLeft: t.space.sm + t.space.xxs,
    padding: t.space.xs,
  },
  chip: {
    minWidth: 40,
    minHeight: 36,
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: t.colors.primaryFill },
}));
