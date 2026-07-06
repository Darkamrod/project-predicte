import { StyleSheet, Text, View } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton } from "@/components/Buttons";
import { ErrorState } from "@/components/ErrorState";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { StatusBadge } from "@/components/StatusBadge";
import type { ScoringBreakdownItem, ScoringBreakdownScope } from "@/domain/scoring/types";
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
  const currentUserBreakdown = league.scoringBreakdowns.find(
    (breakdown) => breakdown.userId === currentUser.id
  );
  const leader = snapshot?.entries[0];
  const groupedBreakdown = groupBreakdownItems(currentUserBreakdown?.items ?? []);

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.leaderboard} subtitle={league.name} />
      <AppCard style={styles.heroCard}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>
              {strings.copy.leaderboardUpdated}
            </Text>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              Classifica demo
            </Text>
          </View>
          <StatusBadge
            label={snapshot ? "Snapshot" : "In attesa"}
            tone={snapshot ? "success" : "warning"}
          />
        </View>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {snapshot
            ? `Aggiornata alle ${new Date(snapshot.createdAtUtc).toLocaleTimeString("it-IT", {
                hour: "2-digit",
                minute: "2-digit"
              })}`
            : "Nessuno snapshot disponibile."}
        </Text>
        <View style={styles.metricGrid}>
          <LeaderboardMetric label="Partecipanti" value={String(snapshot?.entries.length ?? 0)} />
          <LeaderboardMetric label="Leader" value={leader?.displayName ?? "-"} />
          <LeaderboardMetric label="Punti leader" value={String(leader?.totalPoints ?? 0)} />
        </View>
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
      <AppCard style={styles.breakdownCard}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={[styles.kicker, { color: theme.colors.primary }]}>Dettaglio punti</Text>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              Breakdown del tuo profilo
            </Text>
          </View>
          <StatusBadge
            label={`${currentUserBreakdown?.totalPoints ?? 0} pt`}
            tone={currentUserBreakdown ? "primary" : "neutral"}
          />
        </View>
        {currentUserBreakdown && currentUserBreakdown.items.length > 0 ? (
          groupedBreakdown.map((group) => (
            <View key={group.scope} style={styles.breakdownGroup}>
              <View style={styles.breakdownHeader}>
                <Text style={[styles.groupTitle, { color: theme.colors.textPrimary }]}>
                  {scopeLabel(group.scope)}
                </Text>
                <Text style={[styles.pointsPill, { color: theme.colors.primary }]}>
                  +{group.points}
                </Text>
              </View>
              {group.items.slice(0, 4).map((item) => (
                <View
                  key={item.id}
                  style={[styles.breakdownItem, { borderColor: theme.colors.border }]}
                >
                  <Text style={[styles.bodyStrong, { color: theme.colors.textPrimary }]}>
                    +{item.points}
                  </Text>
                  <Text style={[styles.body, styles.flex, { color: theme.colors.textSecondary }]}>
                    {item.reason}
                  </Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
            Nessun dettaglio punti disponibile per il tuo profilo.
          </Text>
        )}
      </AppCard>
    </AppScreen>
  );
}

function groupBreakdownItems(items: ScoringBreakdownItem[]): {
  scope: ScoringBreakdownScope;
  points: number;
  items: ScoringBreakdownItem[];
}[] {
  const groups = new Map<
    ScoringBreakdownScope,
    { scope: ScoringBreakdownScope; points: number; items: ScoringBreakdownItem[] }
  >();

  for (const item of items) {
    const group = groups.get(item.scope) ?? {
      scope: item.scope,
      points: 0,
      items: []
    };

    group.points += item.points;
    group.items.push(item);
    groups.set(item.scope, group);
  }

  const scopeOrder: ScoringBreakdownScope[] = ["MATCH", "STAGE", "ANTEPOST"];

  return scopeOrder
    .map((scope) => groups.get(scope))
    .filter(
      (
        group
      ): group is { scope: ScoringBreakdownScope; points: number; items: ScoringBreakdownItem[] } =>
        Boolean(group)
    );
}

function LeaderboardMetric({ label, value }: { label: string; value: string }): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.metric, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text numberOfLines={1} style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function scopeLabel(scope: ScoringBreakdownScope): string {
  if (scope === "ANTEPOST") {
    return "Antepost";
  }

  if (scope === "STAGE") {
    return "Fase";
  }

  return "Match";
}

const styles = StyleSheet.create({
  breakdownCard: {
    gap: 14
  },
  breakdownGroup: {
    gap: 8
  },
  breakdownHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  breakdownItem: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    padding: 10
  },
  flex: {
    flex: 1
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "900"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between"
  },
  heroCard: {
    gap: 14
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  metric: {
    borderRadius: 8,
    flexBasis: "30%",
    flexGrow: 1,
    gap: 2,
    minHeight: 64,
    padding: 12
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "900"
  },
  pointsPill: {
    fontSize: 15,
    fontWeight: "900"
  },
  title: {
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  bodyStrong: {
    fontSize: 16,
    fontWeight: "900"
  }
});
