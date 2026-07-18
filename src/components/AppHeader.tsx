import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppHeader({
  title,
  subtitle,
  eyebrow,
  trailing
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  trailing?: React.ReactNode;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        {eyebrow ? (
          <Text style={[theme.typography.overline, styles.eyebrow, { color: theme.colors.accent }]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          accessibilityRole="header"
          style={[theme.typography.display, styles.title, { color: theme.colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
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
    gap: 5,
    minWidth: 0
  },
  title: {
    letterSpacing: 0
  },
  eyebrow: {
    letterSpacing: 0,
    textTransform: "uppercase"
  }
});
