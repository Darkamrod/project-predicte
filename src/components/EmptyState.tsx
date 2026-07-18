import { Inbox } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function EmptyState({ title, body }: { title: string; body: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.root,
        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.accentContainer }]}>
        <Inbox color={theme.colors.onAccentContainer} size={24} />
      </View>
      <Text style={[theme.typography.sectionTitle, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[theme.typography.body, styles.body, { color: theme.colors.textSecondary }]}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 10,
    padding: 20
  },
  body: {
    maxWidth: 520
  },
  icon: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  }
});
