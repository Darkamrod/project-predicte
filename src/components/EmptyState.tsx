import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function EmptyState({ title, body }: { title: string; body: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.root, { borderColor: theme.colors.border }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    padding: 18
  },
  title: {
    fontSize: 18,
    fontWeight: "700"
  },
  body: {
    fontSize: 15,
    lineHeight: 22
  }
});
