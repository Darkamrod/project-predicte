import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle
} from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { useAppTheme } from "@/design-system/theme";

interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  icon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  icon: Icon,
  disabled,
  style,
  ...props
}: ButtonProps): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: disabled ? theme.colors.surfaceVariant : theme.colors.primary,
          borderColor: disabled ? theme.colors.border : theme.colors.primary,
          minHeight: theme.touchTarget.minHeight,
          opacity: pressed ? 0.9 : 1,
          ...(pressed && !disabled ? { backgroundColor: theme.colors.primaryPressed } : {})
        },
        style
      ]}
      {...props}
    >
      <View style={styles.content}>
        {Icon ? (
          <Icon color={disabled ? theme.colors.textSecondary : theme.colors.onPrimary} size={20} />
        ) : null}
        <Text
          style={[
            theme.typography.bodyStrong,
            { color: disabled ? theme.colors.textSecondary : theme.colors.onPrimary }
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  icon: Icon,
  disabled,
  style,
  ...props
}: ButtonProps): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: theme.colors.surface,
          borderColor: pressed ? theme.colors.borderStrong : theme.colors.border,
          borderWidth: theme.borders.hairline,
          minHeight: theme.touchTarget.minHeight,
          opacity: disabled ? 0.62 : pressed ? 0.86 : 1
        },
        style
      ]}
      {...props}
    >
      <View style={styles.content}>
        {Icon ? <Icon color={theme.colors.textPrimary} size={20} /> : null}
        <Text style={[theme.typography.bodyStrong, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center"
  }
});
