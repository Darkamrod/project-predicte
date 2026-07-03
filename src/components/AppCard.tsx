import { StyleSheet, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppCard({
  children,
  style
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.md
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
    borderWidth: 1,
    gap: 12,
    padding: 16
  }
});
