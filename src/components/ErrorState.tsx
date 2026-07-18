import { AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { SecondaryButton } from "./Buttons";

export function ErrorState({
  message,
  onRetry
}: {
  message: string;
  onRetry?: (() => void) | undefined;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.root,
        { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }
      ]}
    >
      <View style={styles.messageRow}>
        <AlertCircle color={theme.colors.onErrorContainer} size={22} />
        <Text
          style={[theme.typography.body, styles.message, { color: theme.colors.onErrorContainer }]}
        >
          {message}
        </Text>
      </View>
      {onRetry ? <SecondaryButton label="Riprova" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  messageRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  message: {
    flex: 1
  }
});
