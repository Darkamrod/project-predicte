import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";

export function ParticipantAvatar({ initials }: { initials: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityLabel={`Avatar ${initials}`}
      style={[styles.avatar, { backgroundColor: theme.colors.primaryContainer }]}
    >
      <Text style={[styles.initials, { color: theme.colors.onPrimaryContainer }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  initials: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  }
});
