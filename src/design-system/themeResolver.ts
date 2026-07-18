export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = Exclude<ThemeMode, "system">;

export function resolveThemeMode(
  selectedMode: ThemeMode,
  systemMode: "light" | "dark" | "unspecified" | null | undefined
): ResolvedThemeMode {
  if (selectedMode !== "system") {
    return selectedMode;
  }

  return systemMode === "dark" ? "dark" : "light";
}
