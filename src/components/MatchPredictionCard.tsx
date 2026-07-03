import { StyleSheet, Text, View } from "react-native";

import type { Match, Team } from "@/domain/competitions/types";
import type { MatchPrediction } from "@/domain/predictions/types";
import { useAppTheme } from "@/design-system/theme";
import { AppCard } from "./AppCard";
import { SecondaryButton } from "./Buttons";
import { ScorePicker } from "./ScorePicker";
import { SyncStatus } from "./SyncStatus";

const quickScores = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
  [2, 0],
  [0, 2],
  [2, 1],
  [1, 2]
] as const;

export function MatchPredictionCard({
  match,
  homeTeam,
  awayTeam,
  prediction,
  onChange
}: {
  match: Match;
  homeTeam: Team;
  awayTeam: Team;
  prediction: MatchPrediction;
  onChange(homeGoals: number, awayGoals: number): void;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <AppCard>
      <View style={styles.header}>
        <Text style={[styles.matchLabel, { color: theme.colors.textSecondary }]}>
          {new Date(match.kickoffAtUtc).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </Text>
        <SyncStatus status={prediction.syncStatus} />
      </View>
      <View style={styles.teams}>
        <ScorePicker
          label={homeTeam.name}
          value={prediction.homeGoals}
          onChange={(value) => onChange(value, prediction.awayGoals)}
        />
        <Text style={[styles.separator, { color: theme.colors.textSecondary }]}>-</Text>
        <ScorePicker
          label={awayTeam.name}
          value={prediction.awayGoals}
          onChange={(value) => onChange(prediction.homeGoals, value)}
        />
      </View>
      <View style={styles.chips}>
        {quickScores.map(([homeGoals, awayGoals]) => (
          <SecondaryButton
            key={`${homeGoals}-${awayGoals}`}
            accessibilityLabel={`Imposta ${homeGoals} a ${awayGoals}`}
            label={`${homeGoals}-${awayGoals}`}
            onPress={() => onChange(homeGoals, awayGoals)}
            style={styles.chip}
          />
        ))}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  matchLabel: {
    fontSize: 13,
    fontWeight: "700"
  },
  teams: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  separator: {
    fontSize: 24,
    fontWeight: "700",
    paddingTop: 20
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8
  }
});
