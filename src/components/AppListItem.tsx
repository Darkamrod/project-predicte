import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppListItem({
  leading,
  title,
  subtitle,
  supporting,
  trailing
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  supporting?: string;
  trailing?: React.ReactNode;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
      ]}
    >
      {leading}
      <View style={styles.textBlock}>
        <Text
          numberOfLines={1}
          style={[theme.typography.bodyStrong, { color: theme.colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[theme.typography.caption, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        ) : null}
        {supporting ? (
          <Text style={[theme.typography.caption, { color: theme.colors.textMuted }]}>
            {supporting}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
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
    minHeight: 68,
    padding: 12
  },
  textBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  trailing: {
    alignItems: "flex-end",
    flexShrink: 0
  }
});
