import { StyleSheet, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppCard({
  children,
  style,
  variant = "outlined"
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "outlined" | "elevated" | "subtle";
}): React.ReactNode {
  const { theme } = useAppTheme();
  const elevated = variant === "elevated";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor:
            variant === "subtle" ? theme.colors.surfaceVariant : theme.colors.surface,
          borderColor: elevated ? "transparent" : theme.colors.border,
          borderRadius: theme.radii.md,
          borderWidth: elevated ? 0 : theme.borders.hairline,
          ...(elevated ? theme.shadows.low : theme.shadows.none)
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 16
  }
});
