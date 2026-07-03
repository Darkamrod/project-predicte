import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function PositionDelta({ delta }: { delta: number }): React.ReactNode {
  const { theme } = useAppTheme();
  const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : ArrowRight;
  const color =
    delta > 0 ? theme.colors.success : delta < 0 ? theme.colors.error : theme.colors.textSecondary;
  const label = delta === 0 ? "0" : `${delta > 0 ? "+" : ""}${delta}`;

  return (
    <View style={styles.root}>
      <Icon color={color} size={16} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  text: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0
  }
});
