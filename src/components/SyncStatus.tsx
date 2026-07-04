import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import type { PredictionSyncStatus } from "@/domain/predictions/types";

export function SyncStatus({ status }: { status: PredictionSyncStatus }): React.ReactNode {
  const { theme } = useAppTheme();
  const meta = getStatusMeta(status);
  const Icon = meta.icon;
  const color =
    status === "SYNCED"
      ? theme.colors.success
      : status === "SYNC_FAILED"
        ? theme.colors.error
        : theme.colors.warning;

  return (
    <View style={styles.root}>
      <Icon color={color} size={16} />
      <Text style={[styles.text, { color }]}>{meta.label}</Text>
    </View>
  );
}

function getStatusMeta(status: PredictionSyncStatus): {
  label: string;
  icon: typeof CheckCircle2;
} {
  if (status === "SYNCED") {
    return { label: strings.status.synced, icon: CheckCircle2 };
  }

  if (status === "SYNCING") {
    return { label: strings.status.syncing, icon: RefreshCw };
  }

  if (status === "SYNC_FAILED") {
    return { label: strings.status.syncFailed, icon: WifiOff };
  }

  if (status === "SAVED") {
    return { label: strings.status.saved, icon: CheckCircle2 };
  }

  return { label: strings.status.local, icon: RefreshCw };
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  text: {
    fontSize: 12,
    fontWeight: "700"
  }
});
