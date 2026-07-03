import { StyleSheet, Text } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton } from "@/components/Buttons";
import { ErrorState } from "@/components/ErrorState";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

export function LeaderboardScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, getLeague, settleMockResult } = usePredicteMock();
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  const snapshot = league.leaderboardSnapshots.at(-1);

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.leaderboard} subtitle={league.name} />
      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {strings.copy.leaderboardUpdated}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {snapshot
            ? `Aggiornata alle ${new Date(snapshot.createdAtUtc).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit"
              })}`
            : "Nessuno snapshot disponibile."}
        </Text>
        <PrimaryButton
          label={strings.actions.settleResult}
          onPress={() => settleMockResult(league.id)}
        />
      </AppCard>
      {snapshot?.entries.map((entry) => (
        <LeaderboardRow
          key={entry.userId}
          entry={entry}
          isCurrentUser={entry.userId === currentUser.id}
        />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  }
});
