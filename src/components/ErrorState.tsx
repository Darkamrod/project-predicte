import { AlertCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function ErrorState({ message }: { message: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.root, { borderColor: theme.colors.error }]}>
      <AlertCircle color={theme.colors.error} size={22} />
      <Text style={[styles.message, { color: theme.colors.textPrimary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21
  }
});
