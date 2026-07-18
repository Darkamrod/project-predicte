import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function SectionHeader({
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
    <View style={styles.root}>
      <View style={styles.textBlock}>
        <Text style={[theme.typography.sectionTitle, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  textBlock: {
    flex: 1,
    gap: 3,
    minWidth: 0
  }
});
