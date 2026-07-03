import { Minus, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function ScorePicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange(value: number): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.root}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.controls, { borderColor: theme.colors.border }]}>
        <Pressable
          accessibilityLabel={`Diminuisci gol ${label}`}
          accessibilityRole="button"
          onPress={() => onChange(Math.max(0, value - 1))}
          style={[styles.iconButton, { minHeight: theme.touchTarget.minHeight }]}
        >
          <Minus color={theme.colors.textPrimary} size={18} />
        </Pressable>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        <Pressable
          accessibilityLabel={`Aumenta gol ${label}`}
          accessibilityRole="button"
          onPress={() => onChange(Math.min(10, value + 1))}
          style={[styles.iconButton, { minHeight: theme.touchTarget.minHeight }]}
        >
          <Plus color={theme.colors.textPrimary} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 6,
    minWidth: 120
  },
  label: {
    fontSize: 13,
    fontWeight: "700"
  },
  controls: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden"
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 48
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    minWidth: 34,
    textAlign: "center"
  }
});
