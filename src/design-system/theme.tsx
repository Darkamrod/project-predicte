import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import {
  borders,
  darkColors,
  layout,
  lightColors,
  radii,
  shadows,
  spacing,
  touchTarget,
  typography,
  type ColorTokens
} from "./tokens";
import { resolveThemeMode, type ThemeMode } from "./themeResolver";

export type { ThemeMode } from "./themeResolver";

export interface AppTheme {
  mode: "light" | "dark";
  selectedMode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  borders: typeof borders;
  shadows: typeof shadows;
  touchTarget: typeof touchTarget;
  layout: typeof layout;
}

interface ThemeContextValue {
  theme: AppTheme;
  setThemeMode(mode: ThemeMode): void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const systemScheme = useColorScheme();
  const [selectedMode, setThemeMode] = useState<ThemeMode>("system");
  const resolvedMode = resolveThemeMode(selectedMode, systemScheme);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: {
        mode: resolvedMode,
        selectedMode,
        colors: resolvedMode === "dark" ? darkColors : lightColors,
        spacing,
        radii,
        typography,
        borders,
        shadows,
        touchTarget,
        layout
      },
      setThemeMode
    }),
    [resolvedMode, selectedMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
}
