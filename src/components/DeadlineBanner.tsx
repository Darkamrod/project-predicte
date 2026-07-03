import { Lock, Timer } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import type { LeagueStatus } from "@/domain/predictions/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";

export function DeadlineBanner({
  deadlineAtUtc,
  status
}: {
  deadlineAtUtc: string;
  status: LeagueStatus;
}): React.ReactNode {
  const { theme } = useAppTheme();
  const locked = status !== "open" && status !== "draft";
  const Icon = locked ? Lock : Timer;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: locked ? theme.colors.surfaceVariant : theme.colors.primaryContainer
        }
      ]}
    >
      <Icon
        color={locked ? theme.colors.textSecondary : theme.colors.onPrimaryContainer}
        size={20}
      />
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            { color: locked ? theme.colors.textPrimary : theme.colors.onPrimaryContainer }
          ]}
        >
          {locked ? strings.status.locked : strings.copy.deadline}
        </Text>
        <Text
          style={[
            styles.body,
            { color: locked ? theme.colors.textSecondary : theme.colors.onPrimaryContainer }
          ]}
        >
          {new Date(deadlineAtUtc).toLocaleString("it-IT", {
            dateStyle: "medium",
            timeStyle: "short"
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  textBlock: {
    flex: 1,
    gap: 2
  },
  title: {
    fontSize: 14,
    fontWeight: "800"
  },
  body: {
    fontSize: 14,
    fontWeight: "600"
  }
});
