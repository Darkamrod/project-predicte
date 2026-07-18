import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function LoadingState({
  title = "Caricamento",
  body
}: {
  title?: string;
  body?: string;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityLabel={body ? `${title}. ${body}` : title}
      accessibilityRole="progressbar"
      style={[styles.root, { backgroundColor: theme.colors.surfaceElevated }]}
    >
      <ActivityIndicator color={theme.colors.accent} size="small" />
      <View style={styles.textBlock}>
        <Text style={[theme.typography.bodyStrong, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {body ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    padding: 16
  },
  textBlock: {
    flex: 1,
    gap: 2
  }
});
