import { useMemo, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { AppCard } from "@/components/AppCard";
import { AppHeader } from "@/components/AppHeader";
import { AppScreen } from "@/components/AppScreen";
import { PrimaryButton, SecondaryButton } from "@/components/Buttons";
import { DeadlineBanner } from "@/components/DeadlineBanner";
import { ErrorState } from "@/components/ErrorState";
import { MatchPredictionCard } from "@/components/MatchPredictionCard";
import { ProgressBar } from "@/components/ProgressBar";
import { ScorePicker } from "@/components/ScorePicker";
import { SyncStatus } from "@/components/SyncStatus";
import type {
  AntepostDefinition,
  KnockoutRoundCode,
  Match,
  Player,
  Team
} from "@/domain/competitions/types";
import {
  getPredictedQualifiedTeamId,
  getTeamLabel,
  groupScopeRef,
  type PredictedBracketMatch
} from "@/domain/predictions/bracket";
import { validatePredictionSet } from "@/domain/predictions/validation";
import type {
  AdvancementMethod,
  AntepostPrediction,
  MatchPrediction,
  PredictionDependencyWarning
} from "@/domain/predictions/types";
import { useAppTheme } from "@/design-system/theme";
import { strings } from "@/i18n/strings";
import { usePredicteMock } from "@/state/PredicteMockProvider";

type WorkflowSection = "groups" | "standings" | "knockout" | "antepost" | "review";
type GroupFilter = "all" | "incomplete" | "completed" | "group-a";

const sectionLabels: Record<WorkflowSection, string> = {
  groups: "Gironi",
  standings: "Classifiche",
  knockout: "Tabellone",
  antepost: "Antepost",
  review: "Riepilogo"
};

const roundOrder: KnockoutRoundCode[] = [
  "PLAYOFF",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL"
];

export function PredictionWorkflowScreen({ leagueId }: { leagueId: string }): React.ReactNode {
  const { theme } = useAppTheme();
  const {
    currentUser,
    competition,
    getLeague,
    updateMatchPrediction,
    updateKnockoutPrediction,
    updateAntepostPrediction,
    setTiebreakOverride,
    clearDependencyWarnings
  } = usePredicteMock();
  const [section, setSection] = useState<WorkflowSection>("groups");
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("all");
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

  const workflow = validatePredictionSet({ competition, predictionSet });
  const teamsById = new Map(competition.teams.map((team) => [team.id, team]));
  const playersById = new Map(competition.players.map((player) => [player.id, player]));
  const matchesById = new Map(competition.matches.map((match) => [match.id, match]));
  const groupA = competition.groups[0];
  const groupAMatchIds = new Set(
    competition.matches.filter((match) => match.groupId === groupA?.id).map((match) => match.id)
  );
  const filteredGroupPredictions = useMemo(
    () => filterGroupPredictions(predictionSet.matchPredictions, groupFilter, groupAMatchIds),
    [groupAMatchIds, groupFilter, predictionSet.matchPredictions]
  );

  const goToNextIncomplete = (): void => {
    const next = workflow.completion.nextIncomplete;

    if (!next) {
      setSection("review");
      return;
    }

    if (next.kind === "GROUP_MATCH") {
      setSection("groups");
      setGroupFilter("incomplete");
      return;
    }

    if (next.kind === "TIEBREAK") {
      setSection("standings");
      return;
    }

    if (next.kind === "KNOCKOUT_MATCH") {
      setSection("knockout");
      return;
    }

    if (next.kind === "ANTEPOST") {
      setSection("antepost");
      return;
    }

    setSection("review");
  };

  return (
    <AppScreen>
      <AppHeader title={strings.leagueSections.predictions} subtitle={league.name} />
      <DeadlineBanner deadlineAtUtc={league.deadlineAtUtc} status={league.status} />

      <AppCard>
        <ProgressBar
          value={workflow.completion.percentComplete}
          label={strings.copy.predictionProgress}
        />
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {workflow.completion.completedItems}/{workflow.completion.totalRequired} completati ·{" "}
          {workflow.completion.unsyncedItems} non sincronizzati
        </Text>
        <View style={styles.rowWrap}>
          <PrimaryButton
            accessibilityLabel={strings.actions.nextIncomplete}
            label={strings.actions.nextIncomplete}
            onPress={goToNextIncomplete}
          />
          <SecondaryButton
            accessibilityLabel="Apri riepilogo finale"
            label="Riepilogo finale"
            onPress={() => setSection("review")}
          />
        </View>
      </AppCard>

      <View style={styles.sectionTabs}>
        {(Object.keys(sectionLabels) as WorkflowSection[]).map((key) => (
          <SecondaryButton
            key={key}
            accessibilityLabel={`Apri ${sectionLabels[key]}`}
            label={sectionLabels[key]}
            onPress={() => setSection(key)}
            style={[
              styles.sectionTab,
              section === key
                ? {
                    backgroundColor: theme.colors.primaryContainer,
                    borderColor: theme.colors.primary
                  }
                : undefined
            ]}
          />
        ))}
      </View>

      {section === "groups"
        ? renderGroupSection({
            groupFilter,
            setGroupFilter,
            filteredGroupPredictions,
            matchesById,
            teamsById,
            leagueId: league.id,
            updateMatchPrediction
          })
        : null}

      {section === "standings"
        ? renderStandingsSection({
            groupTables: workflow.bracket.groupTables,
            teamsById,
            leagueId: league.id,
            setTiebreakOverride
          })
        : null}

      {section === "knockout"
        ? renderKnockoutSection({
            matches: workflow.bracket.matches,
            predictionSetId: predictionSet.id,
            predictions: predictionSet.matchPredictions,
            teamsById,
            leagueId: league.id,
            updateKnockoutPrediction
          })
        : null}

      {section === "antepost"
        ? renderAntepostSection({
            definitions: competition.antepostDefinitions,
            predictions: predictionSet.antepostPredictions ?? [],
            teams: competition.teams,
            players: competition.players,
            teamsById,
            playersById,
            leagueId: league.id,
            updateAntepostPrediction
          })
        : null}

      {section === "review"
        ? renderReviewSection({
            issues: workflow.issues,
            warnings: predictionSet.dependencyWarnings ?? [],
            finalMatch: workflow.bracket.matches.find((match) => match.roundCode === "FINAL"),
            predictions: predictionSet.matchPredictions,
            teamsById,
            leagueId: league.id,
            clearDependencyWarnings
          })
        : null}
    </AppScreen>
  );
}

function renderGroupSection(params: {
  groupFilter: GroupFilter;
  setGroupFilter(filter: GroupFilter): void;
  filteredGroupPredictions: MatchPrediction[];
  matchesById: Map<string, Match>;
  teamsById: Map<string, Team>;
  leagueId: string;
  updateMatchPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
  }): void;
}): React.ReactNode {
  return (
    <>
      <AppCard>
        <View style={styles.rowWrap}>
          <SecondaryButton
            label={strings.actions.all}
            onPress={() => params.setGroupFilter("all")}
          />
          <SecondaryButton
            label={strings.actions.incomplete}
            onPress={() => params.setGroupFilter("incomplete")}
          />
          <SecondaryButton
            label={strings.actions.completed}
            onPress={() => params.setGroupFilter("completed")}
          />
          <SecondaryButton label="Gruppo A" onPress={() => params.setGroupFilter("group-a")} />
        </View>
      </AppCard>
      {params.filteredGroupPredictions.map((prediction) => {
        const match = params.matchesById.get(prediction.matchId);

        if (!match) {
          return null;
        }

        const homeTeam = params.teamsById.get(match.homeTeamId);
        const awayTeam = params.teamsById.get(match.awayTeamId);

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
              params.updateMatchPrediction({
                leagueId: params.leagueId,
                matchId: match.id,
                homeGoals,
                awayGoals
              })
            }
          />
        );
      })}
    </>
  );
}

function renderStandingsSection(params: {
  groupTables: ReturnType<typeof validatePredictionSet>["bracket"]["groupTables"];
  teamsById: Map<string, Team>;
  leagueId: string;
  setTiebreakOverride(params: {
    leagueId: string;
    scopeRef: string;
    orderedTeamIds: string[];
    reason: string;
  }): void;
}): React.ReactNode {
  return params.groupTables.map((table) => {
    const unresolvedRows = table.rows.filter((row) => row.unresolvedTie);
    const scopeRef = groupScopeRef(table.group.code);

    return (
      <AppCard key={table.group.id}>
        <ThemedText style={styles.cardTitle}>Gruppo {table.group.code}</ThemedText>
        {table.rows.map((row) => (
          <View key={row.teamId} style={styles.standingRow}>
            <ThemedText style={styles.standingTeam}>
              {row.position}. {params.teamsById.get(row.teamId)?.name ?? row.teamId}
            </ThemedText>
            <ThemedText tone="secondary" style={styles.standingMeta}>
              {row.points} pt · {row.goalDifference >= 0 ? "+" : ""}
              {row.goalDifference} DR{row.unresolvedTie ? " · pari" : ""}
            </ThemedText>
          </View>
        ))}
        {unresolvedRows.length > 0 ? (
          <SecondaryButton
            accessibilityLabel={`Risolvi pari Gruppo ${table.group.code}`}
            label="Conferma ordine pari"
            onPress={() =>
              params.setTiebreakOverride({
                leagueId: params.leagueId,
                scopeRef,
                orderedTeamIds: unresolvedRows.map((row) => row.teamId),
                reason: "Mock override per pari non risolvibile"
              })
            }
          />
        ) : null}
      </AppCard>
    );
  });
}

function renderKnockoutSection(params: {
  matches: PredictedBracketMatch[];
  predictionSetId: string;
  predictions: MatchPrediction[];
  teamsById: Map<string, Team>;
  leagueId: string;
  updateKnockoutPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): void;
}): React.ReactNode {
  return roundOrder.map((roundCode) => {
    const roundMatches = params.matches.filter((match) => match.roundCode === roundCode);

    if (roundMatches.length === 0) {
      return null;
    }

    return (
      <View key={roundCode} style={styles.sectionStack}>
        <ThemedText style={styles.sectionTitle}>{roundMatches[0]?.roundName}</ThemedText>
        {roundMatches.map((match) =>
          renderKnockoutMatch({
            match,
            prediction: params.predictions.find((item) => item.matchId === match.id),
            teamsById: params.teamsById,
            leagueId: params.leagueId,
            updateKnockoutPrediction: params.updateKnockoutPrediction
          })
        )}
      </View>
    );
  });
}

function renderKnockoutMatch(params: {
  match: PredictedBracketMatch;
  prediction?: MatchPrediction | undefined;
  teamsById: Map<string, Team>;
  leagueId: string;
  updateKnockoutPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): void;
}): React.ReactNode {
  const homeGoals = params.prediction?.homeGoals ?? 0;
  const awayGoals = params.prediction?.awayGoals ?? 0;
  const isDraw = homeGoals === awayGoals;

  return (
    <AppCard key={params.match.id}>
      <View style={styles.headerRow}>
        <ThemedText style={styles.cardTitle}>
          {params.match.roundName} {params.match.order}
        </ThemedText>
        {params.prediction ? (
          <SyncStatus status={params.prediction.syncStatus} />
        ) : (
          <ThemedText tone="secondary">Mancante</ThemedText>
        )}
      </View>
      <ThemedText tone="secondary" style={styles.body}>
        {getTeamLabel(params.teamsById, params.match.homeTeamId)} -{" "}
        {getTeamLabel(params.teamsById, params.match.awayTeamId)}
      </ThemedText>
      {params.match.homeTeamId && params.match.awayTeamId ? (
        <>
          <View style={styles.scoreRow}>
            <ScorePicker
              label={getTeamLabel(params.teamsById, params.match.homeTeamId)}
              value={homeGoals}
              onChange={(value) =>
                params.updateKnockoutPrediction({
                  leagueId: params.leagueId,
                  matchId: params.match.id,
                  homeGoals: value,
                  awayGoals,
                  qualifiedTeamId: params.prediction?.qualifiedTeamId,
                  advancementMethod: params.prediction?.advancementMethod
                })
              }
            />
            <ScorePicker
              label={getTeamLabel(params.teamsById, params.match.awayTeamId)}
              value={awayGoals}
              onChange={(value) =>
                params.updateKnockoutPrediction({
                  leagueId: params.leagueId,
                  matchId: params.match.id,
                  homeGoals,
                  awayGoals: value,
                  qualifiedTeamId: params.prediction?.qualifiedTeamId,
                  advancementMethod: params.prediction?.advancementMethod
                })
              }
            />
          </View>
          {isDraw ? (
            <>
              <View style={styles.rowWrap}>
                {[params.match.homeTeamId, params.match.awayTeamId].map((teamId) => (
                  <SecondaryButton
                    key={teamId}
                    accessibilityLabel={`Qualifica ${getTeamLabel(params.teamsById, teamId)}`}
                    label={getTeamLabel(params.teamsById, teamId)}
                    onPress={() =>
                      params.updateKnockoutPrediction({
                        leagueId: params.leagueId,
                        matchId: params.match.id,
                        homeGoals,
                        awayGoals,
                        qualifiedTeamId: teamId,
                        advancementMethod: params.prediction?.advancementMethod ?? "EXTRA_TIME"
                      })
                    }
                  />
                ))}
              </View>
              <View style={styles.rowWrap}>
                {(["EXTRA_TIME", "PENALTIES"] as AdvancementMethod[]).map((method) => (
                  <SecondaryButton
                    key={method}
                    accessibilityLabel={method === "EXTRA_TIME" ? "Supplementari" : "Rigori"}
                    label={method === "EXTRA_TIME" ? "Supplementari" : "Rigori"}
                    onPress={() =>
                      params.updateKnockoutPrediction({
                        leagueId: params.leagueId,
                        matchId: params.match.id,
                        homeGoals,
                        awayGoals,
                        qualifiedTeamId:
                          params.prediction?.qualifiedTeamId ?? params.match.homeTeamId,
                        advancementMethod: method
                      })
                    }
                  />
                ))}
              </View>
            </>
          ) : (
            <ThemedText tone="secondary" style={styles.body}>
              Qualificata:{" "}
              {getTeamLabel(
                params.teamsById,
                getPredictedQualifiedTeamId(params.match, params.prediction)
              )}
            </ThemedText>
          )}
        </>
      ) : (
        <ThemedText tone="secondary" style={styles.body}>
          Da completare nelle partite precedenti
        </ThemedText>
      )}
    </AppCard>
  );
}

function renderAntepostSection(params: {
  definitions: AntepostDefinition[];
  predictions: AntepostPrediction[];
  teams: Team[];
  players: Player[];
  teamsById: Map<string, Team>;
  playersById: Map<string, Player>;
  leagueId: string;
  updateAntepostPrediction(params: {
    leagueId: string;
    definitionId: string;
    selectedTeamId?: string | undefined;
    selectedTeamIds?: string[] | undefined;
    selectedPlayerId?: string | undefined;
    numericValue?: number | undefined;
  }): void;
}): React.ReactNode {
  return params.definitions.map((definition) => {
    const prediction = params.predictions.find((item) => item.definitionId === definition.id);

    return (
      <AppCard key={definition.id}>
        <ThemedText style={styles.cardTitle}>{definition.label}</ThemedText>
        {definition.valueType === "TEAM" ? (
          <>
            <ThemedText tone="secondary" style={styles.body}>
              {prediction?.selectedTeamId
                ? params.teamsById.get(prediction.selectedTeamId)?.name
                : "Mancante"}
            </ThemedText>
            <View style={styles.rowWrap}>
              {params.teams.map((team) => (
                <SecondaryButton
                  key={team.id}
                  accessibilityLabel={`Seleziona ${team.name}`}
                  label={team.shortName}
                  onPress={() =>
                    params.updateAntepostPrediction({
                      leagueId: params.leagueId,
                      definitionId: definition.id,
                      selectedTeamId: team.id
                    })
                  }
                  style={styles.smallChip}
                />
              ))}
            </View>
          </>
        ) : null}
        {definition.valueType === "TEAM_PAIR" ? (
          <>
            <ThemedText tone="secondary" style={styles.body}>
              {(prediction?.selectedTeamIds ?? [])
                .map((teamId) => params.teamsById.get(teamId)?.name ?? teamId)
                .join(" - ") || "Mancante"}
            </ThemedText>
            <View style={styles.rowWrap}>
              {params.teams.slice(0, 8).map((team) => {
                const selected = prediction?.selectedTeamIds ?? [];
                const nextSelection = selected.includes(team.id)
                  ? selected.filter((teamId) => teamId !== team.id)
                  : [...selected, team.id].slice(-2);

                return (
                  <SecondaryButton
                    key={team.id}
                    accessibilityLabel={`Seleziona finalista ${team.name}`}
                    label={team.shortName}
                    onPress={() =>
                      params.updateAntepostPrediction({
                        leagueId: params.leagueId,
                        definitionId: definition.id,
                        selectedTeamIds: nextSelection
                      })
                    }
                    style={styles.smallChip}
                  />
                );
              })}
            </View>
          </>
        ) : null}
        {definition.valueType === "PLAYER" ? (
          <>
            <ThemedText tone="secondary" style={styles.body}>
              {prediction?.selectedPlayerId
                ? params.playersById.get(prediction.selectedPlayerId)?.displayName
                : "Mancante"}
            </ThemedText>
            <View style={styles.rowWrap}>
              {params.players.map((player) => (
                <SecondaryButton
                  key={player.id}
                  accessibilityLabel={`Seleziona ${player.displayName}`}
                  label={player.displayName}
                  onPress={() =>
                    params.updateAntepostPrediction({
                      leagueId: params.leagueId,
                      definitionId: definition.id,
                      selectedPlayerId: player.id
                    })
                  }
                  style={styles.playerChip}
                />
              ))}
            </View>
          </>
        ) : null}
        {definition.valueType === "NUMBER" ? (
          <ScorePicker
            label={definition.label}
            value={prediction?.numericValue ?? 0}
            onChange={(value) =>
              params.updateAntepostPrediction({
                leagueId: params.leagueId,
                definitionId: definition.id,
                numericValue: value
              })
            }
          />
        ) : null}
      </AppCard>
    );
  });
}

function renderReviewSection(params: {
  issues: ReturnType<typeof validatePredictionSet>["issues"];
  warnings: PredictionDependencyWarning[];
  finalMatch?: PredictedBracketMatch | undefined;
  predictions: MatchPrediction[];
  teamsById: Map<string, Team>;
  leagueId: string;
  clearDependencyWarnings(leagueId: string): void;
}): React.ReactNode {
  const finalPrediction = params.finalMatch
    ? params.predictions.find((prediction) => prediction.matchId === params.finalMatch?.id)
    : undefined;
  const predictedChampion = params.finalMatch
    ? getPredictedQualifiedTeamId(params.finalMatch, finalPrediction)
    : undefined;

  return (
    <>
      <AppCard>
        <ThemedText style={styles.cardTitle}>Riepilogo finale</ThemedText>
        <ThemedText tone="secondary" style={styles.body}>
          Vincitrice prevista: {getTeamLabel(params.teamsById, predictedChampion)}
        </ThemedText>
        <View style={styles.rowWrap}>
          <SyncStatus status="SAVED" />
          <SyncStatus status="SYNCING" />
          <SyncStatus status="SYNCED" />
          <SyncStatus status="SYNC_FAILED" />
          <SyncStatus status="LOCAL" />
        </View>
      </AppCard>
      {params.issues.length > 0 ? (
        <AppCard>
          <ThemedText style={styles.cardTitle}>Elementi da controllare</ThemedText>
          {params.issues.slice(0, 20).map((issue) => (
            <ThemedText key={issue.id} tone="secondary" style={styles.body}>
              {issue.severity === "error" ? "!" : "•"} {issue.message}
            </ThemedText>
          ))}
        </AppCard>
      ) : (
        <AppCard>
          <ThemedText style={styles.cardTitle}>Pronostici completi</ThemedText>
          <ThemedText tone="secondary" style={styles.body}>
            Tutto pronto prima della deadline.
          </ThemedText>
        </AppCard>
      )}
      {params.warnings.length > 0 ? (
        <AppCard>
          <ThemedText style={styles.cardTitle}>Avvisi bracket</ThemedText>
          {params.warnings.map((warning) => (
            <ThemedText key={warning.id} tone="secondary" style={styles.body}>
              {warning.message}
            </ThemedText>
          ))}
          <SecondaryButton
            accessibilityLabel="Conferma lettura avvisi bracket"
            label="Ho controllato"
            onPress={() => params.clearDependencyWarnings(params.leagueId)}
          />
        </AppCard>
      ) : null}
    </>
  );
}

function filterGroupPredictions(
  predictions: MatchPrediction[],
  filter: GroupFilter,
  groupAMatchIds: Set<string>
): MatchPrediction[] {
  const groupPredictions = predictions.filter(
    (prediction) => prediction.stageCode === "GROUP_STAGE"
  );

  if (filter === "group-a") {
    return groupPredictions.filter((prediction) => groupAMatchIds.has(prediction.matchId));
  }

  if (filter === "completed") {
    return groupPredictions.filter((prediction) => prediction.syncStatus === "SYNCED");
  }

  if (filter === "incomplete") {
    return groupPredictions.filter((prediction) => prediction.syncStatus !== "SYNCED");
  }

  return groupPredictions;
}

function ThemedText({
  children,
  tone = "primary",
  style
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary";
  style?: StyleProp<TextStyle>;
}): React.ReactNode {
  const { theme } = useAppTheme();

  return (
    <Text
      style={[
        style,
        { color: tone === "primary" ? theme.colors.textPrimary : theme.colors.textSecondary }
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  playerChip: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  scoreRow: {
    flexDirection: "row",
    gap: 12
  },
  sectionStack: {
    gap: 12
  },
  sectionTabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  sectionTab: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900"
  },
  smallChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  standingMeta: {
    fontSize: 13,
    fontWeight: "700"
  },
  standingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  standingTeam: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700"
  }
});
