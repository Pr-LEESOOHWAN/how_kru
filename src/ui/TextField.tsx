import { forwardRef, useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { useI18n } from "@/src/i18n";
import { makeStyles, useTheme } from "@/src/theme/ThemeContext";
import { hitTarget } from "@/src/theme/tokens";

import { Eye, EyeSlash, type Icon } from "./icons";
import { PressableScale } from "./PressableScale";
import { Text } from "./Text";

export type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string;
  icon?: Icon;
  /** secureTextEntry 필드에 보기/숨기기 토글을 붙인다 */
  revealable?: boolean;
};

/**
 * 라벨은 입력창 위, 오류는 아래. 예전 로그인/가입 화면은 placeholder를 라벨 대신 써서
 * 타이핑을 시작하면 무슨 칸인지 사라졌다.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, icon: IconCmp, revealable, secureTextEntry, onFocus, onBlur, editable = true, ...rest },
  ref
) {
  const theme = useTheme();
  const { t } = useI18n();
  const s = useStyles();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // 기본 테두리도 3:1(borderControl) - 흐린 구분선 색이면 빈 입력창의 경계가 안 보인다.
  const borderColor = error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.borderControl;

  return (
    <View style={s.wrap}>
      <Text variant="caption" color="textSecondary" style={s.label}>
        {label}
      </Text>
      <View style={[s.field, { borderColor }, !editable && s.disabled]}>
        {IconCmp ? <IconCmp size={18} color={theme.colors.textTertiary} /> : null}
        <TextInput
          ref={ref}
          {...rest}
          editable={editable}
          accessibilityLabel={label}
          accessibilityHint={error}
          secureTextEntry={secureTextEntry && !revealed}
          placeholderTextColor={theme.colors.textTertiary}
          selectionColor={theme.colors.primary}
          style={s.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secureTextEntry && revealable ? (
          <PressableScale
            onPress={() => setRevealed((v) => !v)}
            accessibilityLabel={revealed ? t("auth.hidePassword") : t("auth.showPassword")}
            style={s.reveal}
            hitSlop={6}
          >
            {revealed ? (
              <EyeSlash size={20} color={theme.colors.textTertiary} />
            ) : (
              <Eye size={20} color={theme.colors.textTertiary} />
            )}
          </PressableScale>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={s.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  wrap: { alignSelf: "stretch", gap: t.space.xs + t.space.xxs },
  label: { fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    minHeight: 50,
    paddingHorizontal: t.space.md + t.space.xxs,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    backgroundColor: t.colors.surface,
  },
  disabled: { opacity: 0.6 },
  input: {
    flex: 1,
    ...t.type.body,
    color: t.colors.text,
    paddingVertical: t.space.md,
  },
  reveal: {
    width: hitTarget - 8,
    height: hitTarget - 8,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { marginTop: t.space.xxs },
}));
