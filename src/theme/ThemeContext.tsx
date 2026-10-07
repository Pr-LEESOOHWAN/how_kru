// 앱 테마(라이트/다크) 컨텍스트.
//
// app.json의 userInterfaceStyle은 예전부터 "automatic"이었지만 실제 화면들은 전부 흰 배경에
// 색을 하드코딩해서 다크모드가 사실상 없었다. 이제 모든 화면은 useTheme()/makeStyles()로
// 토큰을 받아 그린다. 사용자는 환경설정에서 시스템/라이트/다크 중 고를 수 있다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, useColorScheme } from "react-native";

import { darkTheme, lightTheme, type Theme } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "how_kru_theme";

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  preference: "system",
  setPreference: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "system" || saved === "light" || saved === "dark") {
          setPreferenceState(saved);
        }
      })
      // 저장값을 못 읽어도 시스템 설정을 따르면 되므로 조용히 넘어간다.
      .catch(() => {});
  }, []);

  const setPreference = (pref: ThemePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch((err) => {
      console.error("[ThemeContext] 테마 설정 저장 실패:", err);
    });
  };

  const resolved = preference === "system" ? (systemScheme ?? "light") : preference;
  const theme = resolved === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemePreference() {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}

type NamedStyles<T> = { [P in keyof T]: StyleSheet.NamedStyles<T>[P] };

/**
 * 테마 기반 스타일 훅을 만든다. 모듈 최상단에서 한 번 정의하고 컴포넌트 안에서 호출한다.
 *
 *   const useStyles = makeStyles((t) => ({
 *     root: { flex: 1, backgroundColor: t.colors.bg },
 *   }));
 *   function Screen() { const s = useStyles(); ... }
 *
 * 테마 객체는 라이트/다크 두 개뿐이고 정체성이 고정이라 WeakMap으로 캐시한다 - 렌더마다
 * StyleSheet.create를 다시 돌리지 않는다.
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme)) as T;
      cache.set(theme, styles);
    }
    return styles;
  };
}
