import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ErrorState } from "@/components/ErrorState";
import { MatchPredictionCard } from "@/components/MatchPredictionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { calculatePredictedGroupStandings } from "@/domain/predictions/standings";
import type { MatchPrediction } from "@/domain/predictions/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

type PredictionFilter = "all" | "incomplete" | "completed" | "group-a";

export function GroupPredictionsScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const { currentUser, competition, getLeague, updateMatchPrediction } = usePredicteMock();
  const [filter, setFilter] = useState<PredictionFilter>("all");
  const league = getLeague(leagueId);

  if (!league) {
    return (
      <AppScreen>
        <ErrorState message="Lega mock non trovata." />
      </AppScreen>
    );
  }

  const predictionSet = league.predictionSets.find((set) => set.userId === currentUser.id);

  if (!predictionSet) {
    return (
      <AppScreen>
        <ErrorState message="Prediction set mock non trovato." />
      </AppScreen>
    );
  }

  const completion = calculatePredictionCompletion(predictionSet);
  const teamsById = new Map(competition.teams.map((team) => [team.id, team]));
  const matchesById = new Map(competition.matches.map((match) => [match.id, match]));
  const groupA = competition.groups[0];
  const groupAMatches = competition.matches.filter((match) => match.groupId === groupA?.id);
  const groupATeamIds = new Set(
    groupAMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId])
  );
  const groupATeams = competition.teams.filter((team) => groupATeamIds.has(team.id));
  const groupAStandings = calculatePredictedGroupStandings({
    teams: groupATeams,
    matches: groupAMatches,
    predictions: predictionSet.matchPredictions
  });

  const filteredPredictions = useMemo(
    () =>
      filterPredictions(
        predictionSet.matchPredictions,
        filter,
        groupAMatches.map((match) => match.id)
      ),
    [filter, groupAMatches, predictionSet.matchPredictions]
  );

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.predictions} subtitle={league.name} />
      <DeadlineBanner deadlineAtUtc={league.deadlineAtUtc} status={league.status} />
      <AppCard>
        <ProgressBar value={completion.percentComplete} label={strings.copy.predictionProgress} />
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {completion.completedItems}/{completion.totalRequired} completati. Stato:{" "}
          {completion.unsyncedItems === 0 ? strings.status.synced : strings.status.local}.
        </Text>
        <View style={styles.filters}>
          <SecondaryButton label={strings.actions.all} onPress={() => setFilter("all")} />
          <SecondaryButton
            label={strings.actions.incomplete}
            onPress={() => setFilter("incomplete")}
          />
          <SecondaryButton
            label={strings.actions.completed}
            onPress={() => setFilter("completed")}
          />
          <SecondaryButton label="Gruppo A" onPress={() => setFilter("group-a")} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Classifica prevista Gruppo A
        </Text>
        {groupAStandings.map((row) => {
          const team = teamsById.get(row.teamId);

          return (
            <View key={row.teamId} style={styles.standingRow}>
              <Text style={[styles.standingTeam, { color: theme.colors.textPrimary }]}>
                {row.position}. {team?.name ?? row.teamId}
              </Text>
              <Text style={[styles.standingMeta, { color: theme.colors.textSecondary }]}>
                {row.points} pt, {row.goalDifference >= 0 ? "+" : ""}
                {row.goalDifference} DR {row.unresolvedTie ? "- pari da risolvere" : ""}
              </Text>
            </View>
          );
        })}
      </AppCard>

      {filteredPredictions.map((prediction) => {
        const match = matchesById.get(prediction.matchId);

        if (!match) {
          return null;
        }

        const homeTeam = teamsById.get(match.homeTeamId);
        const awayTeam = teamsById.get(match.awayTeamId);

        if (!homeTeam || !awayTeam) {
          return null;
        }

        return (
          <MatchPredictionCard
            key={prediction.id}
            match={match}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            prediction={prediction}
            onChange={(homeGoals, awayGoals) =>
              updateMatchPrediction({
                leagueId: league.id,
                matchId: match.id,
                homeGoals,
                awayGoals
              })
            }
          />
        );
      })}
    </AppScreen>
  );
}

function filterPredictions(
  predictions: MatchPrediction[],
  filter: PredictionFilter,
  groupAMatchIds: string[]
): MatchPrediction[] {
  if (filter === "group-a") {
    const groupA = new Set(groupAMatchIds);
    return predictions.filter((prediction) => groupA.has(prediction.matchId));
  }

  if (filter === "completed") {
    return predictions.filter((prediction) => prediction.syncStatus === "SYNCED");
  }

  if (filter === "incomplete") {
    return predictions.filter((prediction) => prediction.syncStatus !== "SYNCED");
  }

  return predictions;
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "800"
  },
  standingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  standingTeam: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700"
  },
  standingMeta: {
    fontSize: 13,
    fontWeight: "700"
  }
});
