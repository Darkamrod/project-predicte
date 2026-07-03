import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function ProgressBar({ value, label }: { value: number; label?: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const normalizedValue = Math.max(0, Math.min(value, 100));

  return (
    <View style={styles.root}>
      {label ? (
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      ) : null}
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: theme.colors.primary,
              width: `${normalizedValue}%`
            }
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: "600"
  },
  track: {
    borderRadius: 999,
    height: 10,
    overflow: "hidden"
  },
  fill: {
    borderRadius: 999,
    height: "100%"
  }
});
