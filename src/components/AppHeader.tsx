import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppHeader({
  title,
  subtitle,
  trailing
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  textBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21
  }
});
