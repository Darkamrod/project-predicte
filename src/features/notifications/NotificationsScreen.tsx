import { Bell } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";

export function NotificationsScreen(): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <AppHeader title={strings.tabs.notifications} subtitle="Centro notifiche mock." />
      <AppCard>
        <View style={styles.row}>
          <Bell color={theme.colors.primary} size={22} />
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {strings.copy.leaderboardUpdated}
            </Text>
            <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
              +10 punti dopo il primo risultato simulato. Le push reali arrivano in milestone
              future.
            </Text>
          </View>
        </View>
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  textBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  }
});
