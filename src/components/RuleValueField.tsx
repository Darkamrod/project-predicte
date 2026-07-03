import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { IconButton } from "./IconButton";
import { Minus, Plus } from "lucide-react-native";

export function RuleValueField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange(value: number): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.root, { borderColor: theme.colors.border }]}>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      <View style={styles.controls}>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        <IconButton
          icon={Minus}
          label={`Diminuisci ${label}`}
          onPress={() => {
            if (!disabled) {
              onChange(Math.max(0, value - 1));
            }
          }}
        />
        <IconButton
          icon={Plus}
          label={`Aumenta ${label}`}
          onPress={() => {
            if (!disabled) {
              onChange(value + 1);
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 58,
    padding: 12
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700"
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    minWidth: 34,
    textAlign: "right"
  }
});
