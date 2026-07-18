import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function AppScreen({
  children,
  scroll = true,
  style
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const contentStyle = [
    styles.content,
    {
      maxWidth: theme.layout.contentMaxWidth,
      paddingHorizontal: theme.layout.screenPadding,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl
    },
    style
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    alignSelf: "center",
    boxSizing: "border-box",
    gap: 16,
    width: "100%"
  }
});
