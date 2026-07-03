import { SafeAreaView, ScrollView, StyleSheet, type ViewStyle } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppScreen({
  children,
  scroll = true,
  style
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const contentStyle = [styles.content, { padding: theme.spacing.lg }, style];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>
      ) : (
        <>{children}</>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    gap: 16,
    paddingBottom: 32
  }
});
