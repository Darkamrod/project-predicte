import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import { darkColors, lightColors, radii, spacing, touchTarget, type ColorTokens } from "./tokens";

export type ThemeMode = "system" | "light" | "dark";

export interface AppTheme {
  mode: "light" | "dark";
  selectedMode: ThemeMode;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  touchTarget: typeof touchTarget;
}

interface ThemeContextValue {
  theme: AppTheme;
  setThemeMode(mode: ThemeMode): void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: ReactNode }): ReactNode {
  const systemScheme = useColorScheme();
  const [selectedMode, setThemeMode] = useState<ThemeMode>("system");
  const systemMode = systemScheme === "dark" ? "dark" : "light";
  const resolvedMode = selectedMode === "system" ? systemMode : selectedMode;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: {
        mode: resolvedMode,
        selectedMode,
        colors: resolvedMode === "dark" ? darkColors : lightColors,
        spacing,
        radii,
        touchTarget
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
