import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export type StatusTone = "neutral" | "success" | "warning" | "error" | "primary" | "trophy";

export function StatusBadge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: StatusTone;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const palette = getPalette(theme.colors, tone);

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function getPalette(
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"],
  tone: StatusTone
): { background: string; text: string } {
  if (tone === "success") {
    return { background: colors.success, text: colors.onSuccess };
  }

  if (tone === "warning") {
    return { background: colors.warning, text: colors.onWarning };
  }

  if (tone === "error") {
    return { background: colors.error, text: colors.onError };
  }

  if (tone === "primary") {
    return { background: colors.primaryContainer, text: colors.onPrimaryContainer };
  }

  if (tone === "trophy") {
    return { background: colors.trophy, text: colors.onTrophy };
  }

  return { background: colors.surfaceVariant, text: colors.textSecondary };
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0
  }
});
