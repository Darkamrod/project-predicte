import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function LeaguesScreen(): React.ReactNode {
  const { theme } = useAppTheme();
  const { leagues, competition } = usePredicteMock();

  return (
    <AppScreen>
      <AppHeader title={strings.tabs.leagues} subtitle="Leghe mock attive e archiviate." />
      {leagues.length === 0 ? (
        <EmptyState
          title={strings.copy.noLeagues}
          body="Le leghe create o unite appariranno qui."
        />
      ) : (
        leagues.map((league) => (
          <AppCard key={league.id}>
            <View style={styles.row}>
              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  {league.name}
                </Text>
                <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
                  {competition.edition.name} - {league.members.length} partecipanti
                </Text>
              </View>
              <StatusBadge label={strings.status[league.status]} tone="primary" />
            </View>
            <Link
              accessibilityRole="link"
              href={{ pathname: "/league/[leagueId]", params: { leagueId: league.id } }}
              style={[styles.link, { color: theme.colors.primary }]}
            >
              Apri lega
            </Link>
          </AppCard>
        ))
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  textBlock: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 19,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  link: {
    fontSize: 16,
    fontWeight: "800"
  }
});
