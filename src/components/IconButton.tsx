import { Pressable, StyleSheet } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useAppTheme } from "@/design-system/theme";

export function IconButton({
  icon: Icon,
  label,
  onPress,
  disabled = false
}: {
  icon: LucideIcon;
  label: string;
  onPress(): void;
  disabled?: boolean;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? theme.colors.disabled : theme.colors.surface,
          borderColor: theme.colors.border,
          height: theme.touchTarget.icon,
          opacity: pressed ? 0.75 : 1,
          width: theme.touchTarget.icon
        }
      ]}
    >
      <Icon color={disabled ? theme.colors.onDisabled : theme.colors.textPrimary} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center"
  }
});
