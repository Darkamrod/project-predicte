import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { CompetitionSeed } from "@/domain/competitions/types";
import {
  generatePredictedBracket,
  getMatchPrediction,
  type PredictedBracketMatch
} from "@/domain/predictions/bracket";
import {
  calculateDependencyInvalidation,
  mergeDependencyWarnings
} from "@/domain/predictions/invalidation";
import { assertPredictionWritable } from "@/domain/predictions/locks";
import { validatePredictionSet } from "@/domain/predictions/validation";
import type {
  AdvancementMethod,
  AntepostPrediction,
  LeagueStatus,
  MatchPrediction,
  PredictionSet
} from "@/domain/predictions/types";
import {
  assertScoringRulesWritable,
  lockScoringRuleVersion,
  updateAntepostRuleValueWithHistory,
  updateStageRuleValueWithHistory
} from "@/domain/scoring/ruleVersions";
import { recalculateTournamentScoring } from "@/domain/scoring/tournamentScoring";
import type {
  AntepostScoringRule,
  ScoringStageKey,
  StageScoringRule
} from "@/domain/scoring/types";
import { mockCurrentUser } from "@/services/auth/mockAuthAdapter";
import type { AuthUser } from "@/services/auth/types";
import type { League, MockLeagueState } from "@/services/leagues/types";
import {
  createInitialMockLeagueState,
  createMockLeague,
  createPredictionSet,
  lockMockLeagueCompetitionSnapshot
} from "@/services/mock/mockLeagueFactory";
import { createWorldCupMockResultSet } from "@/services/mock/mockResults";

interface PredicteMockContextValue extends MockLeagueState {
  currentUser: AuthUser;
  serverNowUtc: string;
  createLeague(params?: {
    competitionEditionId?: string | undefined;
    name?: string | undefined;
  }): string;
  joinLeague(inviteCode: string): string;
  getLeague(leagueId: string): League | undefined;
  updateMatchPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
  }): void;
  updateKnockoutPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId?: string | undefined;
    advancementMethod?: AdvancementMethod | undefined;
  }): void;
  updateAntepostPrediction(params: {
    leagueId: string;
    definitionId: string;
    selectedTeamId?: string | undefined;
    selectedTeamIds?: string[] | undefined;
    selectedPlayerId?: string | undefined;
    numericValue?: number | undefined;
  }): void;
  setTiebreakOverride(params: {
    leagueId: string;
    scopeRef: string;
    orderedTeamIds: string[];
    reason: string;
  }): void;
  clearDependencyWarnings(leagueId: string): void;
  lockLeague(leagueId: string): void;
  settleMockResult(leagueId: string): void;
  updateRuleValue(params: {
    leagueId: string;
    stage: ScoringStageKey;
    field: keyof StageScoringRule;
    value: number;
  }): void;
  updateAntepostRuleValue(params: {
    leagueId: string;
    field: keyof AntepostScoringRule;
    value: number;
  }): void;
}

const PredicteMockContext = createContext<PredicteMockContextValue | undefined>(undefined);

export function PredicteMockProvider({ children }: { children: ReactNode }): ReactNode {
  const currentUser = mockCurrentUser;
  const [state, setState] = useState<MockLeagueState>(() =>
    createInitialMockLeagueState(currentUser)
  );
  const serverNowUtc = "2026-07-03T20:00:00.000Z";

  const getLeague = useCallback(
    (leagueId: string) => state.leagues.find((league) => league.id === leagueId),
    [state.leagues]
  );

  const createLeague = useCallback(
    (params: { competitionEditionId?: string | undefined; name?: string | undefined } = {}) => {
      const id = `league-mock-${state.leagues.length + 1}`;
      const competition =
        state.competitions.find((item) => item.edition.id === params.competitionEditionId) ??
        state.competition;
      const league = createMockLeague({
        id,
        name: params.name ?? `Lega mock ${state.leagues.length + 1}`,
        owner: currentUser,
        competition
      });

      setState((previous) => ({
        ...previous,
        competition,
        leagues: [...previous.leagues, league]
      }));

      return id;
    },
    [currentUser, state.competition, state.competitions, state.leagues.length]
  );

  const joinLeague = useCallback(
    (inviteCode: string) => {
      const normalizedInvite = inviteCode.trim().toUpperCase();
      const id = `league-joined-${normalizedInvite.toLowerCase()}`;
      const existing = state.leagues.find((league) => league.id === id);

      if (existing) {
        return existing.id;
      }

      const owner: AuthUser = {
        id: "user-remote-owner",
        displayName: "Luca",
        avatarInitials: "LU",
        locale: "it-IT",
        timezone: "Europe/Rome"
      };
      const league = createMockLeague({
        id,
        name: "Lega invito mock",
        owner,
        competition: state.competition
      });
      const joinedLeague: League = {
        ...league,
        inviteCode: normalizedInvite,
        members: [
          ...league.members.filter((member) => member.userId !== currentUser.id),
          {
            userId: currentUser.id,
            displayName: currentUser.displayName,
            avatarInitials: currentUser.avatarInitials,
            role: "participant",
            joinedAtUtc: serverNowUtc
          }
        ],
        predictionSets: [
          ...league.predictionSets.filter(
            (predictionSet) => predictionSet.userId !== currentUser.id
          ),
          createPredictionSet(league.id, currentUser.id, state.competition)
        ]
      };

      setState((previous) => ({
        ...previous,
        leagues: [...previous.leagues, joinedLeague]
      }));

      return joinedLeague.id;
    },
    [currentUser, serverNowUtc, state.competition, state.leagues]
  );

  const updateMatchPrediction = useCallback(
    (params: { leagueId: string; matchId: string; homeGoals: number; awayGoals: number }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          assertPredictionWritable(
            {
              leagueId: league.id,
              status: league.status,
              deadlineAtUtc: league.deadlineAtUtc
            },
            serverNowUtc
          );

          const predictionSets = league.predictionSets.map((predictionSet) => {
            if (predictionSet.userId !== currentUser.id) {
              return predictionSet;
            }

            const beforeBracket = generatePredictedBracket({
              competition: previous.competition,
              predictionSet
            });
            const matchPredictions = predictionSet.matchPredictions.map((prediction) =>
              prediction.matchId === params.matchId
                ? syncPrediction({
                    ...prediction,
                    homeGoals: params.homeGoals,
                    awayGoals: params.awayGoals,
                    updatedAtUtc: serverNowUtc
                  })
                : prediction
            );
            const nextPredictionSet = {
              ...predictionSet,
              matchPredictions
            };
            const afterBracket = generatePredictedBracket({
              competition: previous.competition,
              predictionSet: nextPredictionSet
            });
            const dependencyWarnings = mergeDependencyWarnings(
              predictionSet.dependencyWarnings ?? [],
              calculateDependencyInvalidation({
                before: beforeBracket,
                after: afterBracket,
                predictions: predictionSet.matchPredictions,
                createdAtUtc: serverNowUtc
              })
            );

            return refreshPredictionSet(previous.competition, {
              ...nextPredictionSet,
              dependencyWarnings,
              lastServerSyncedAtUtc: serverNowUtc
            });
          });

          return {
            ...league,
            predictionSets
          };
        })
      }));
    },
    [currentUser.id, serverNowUtc]
  );

  const updateKnockoutPrediction = useCallback(
    (params: {
      leagueId: string;
      matchId: string;
      homeGoals: number;
      awayGoals: number;
      qualifiedTeamId?: string | undefined;
      advancementMethod?: AdvancementMethod | undefined;
    }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          assertPredictionWritable(
            {
              leagueId: league.id,
              status: league.status,
              deadlineAtUtc: league.deadlineAtUtc
            },
            serverNowUtc
          );

          const predictionSets = league.predictionSets.map((predictionSet) => {
            if (predictionSet.userId !== currentUser.id) {
              return predictionSet;
            }

            const beforeBracket = generatePredictedBracket({
              competition: previous.competition,
              predictionSet
            });
            const bracketMatch = beforeBracket.matches.find((match) => match.id === params.matchId);

            if (!bracketMatch) {
              return predictionSet;
            }

            const existingPrediction = getMatchPrediction(predictionSet, params.matchId);
            const nextPrediction = normalizeKnockoutPrediction({
              predictionSetId: predictionSet.id,
              match: bracketMatch,
              existingPrediction,
              homeGoals: params.homeGoals,
              awayGoals: params.awayGoals,
              qualifiedTeamId: params.qualifiedTeamId,
              advancementMethod: params.advancementMethod,
              updatedAtUtc: serverNowUtc
            });
            const nextPredictionSet = {
              ...predictionSet,
              matchPredictions: upsertMatchPrediction(
                predictionSet.matchPredictions,
                nextPrediction
              )
            };
            const afterBracket = generatePredictedBracket({
              competition: previous.competition,
              predictionSet: nextPredictionSet
            });
            const dependencyWarnings = mergeDependencyWarnings(
              predictionSet.dependencyWarnings ?? [],
              calculateDependencyInvalidation({
                before: beforeBracket,
                after: afterBracket,
                predictions: predictionSet.matchPredictions,
                createdAtUtc: serverNowUtc
              })
            );

            return refreshPredictionSet(previous.competition, {
              ...nextPredictionSet,
              dependencyWarnings,
              lastServerSyncedAtUtc: serverNowUtc
            });
          });

          return {
            ...league,
            predictionSets
          };
        })
      }));
    },
    [currentUser.id, serverNowUtc]
  );

  const updateAntepostPrediction = useCallback(
    (params: {
      leagueId: string;
      definitionId: string;
      selectedTeamId?: string | undefined;
      selectedTeamIds?: string[] | undefined;
      selectedPlayerId?: string | undefined;
      numericValue?: number | undefined;
    }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          assertPredictionWritable(
            {
              leagueId: league.id,
              status: league.status,
              deadlineAtUtc: league.deadlineAtUtc
            },
            serverNowUtc
          );

          const predictionSets = league.predictionSets.map((predictionSet) => {
            if (predictionSet.userId !== currentUser.id) {
              return predictionSet;
            }

            const nextPrediction: AntepostPrediction = {
              id: `${predictionSet.id}:antepost:${params.definitionId}`,
              predictionSetId: predictionSet.id,
              definitionId: params.definitionId,
              selectedTeamId: params.selectedTeamId,
              selectedTeamIds: params.selectedTeamIds,
              selectedPlayerId: params.selectedPlayerId,
              numericValue: params.numericValue,
              syncStatus: "SYNCED",
              updatedAtUtc: serverNowUtc
            };
            const existing = predictionSet.antepostPredictions ?? [];

            return refreshPredictionSet(previous.competition, {
              ...predictionSet,
              antepostPredictions: [
                ...existing.filter((prediction) => prediction.definitionId !== params.definitionId),
                nextPrediction
              ],
              lastServerSyncedAtUtc: serverNowUtc
            });
          });

          return {
            ...league,
            predictionSets
          };
        })
      }));
    },
    [currentUser.id, serverNowUtc]
  );

  const setTiebreakOverride = useCallback(
    (params: { leagueId: string; scopeRef: string; orderedTeamIds: string[]; reason: string }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          assertPredictionWritable(
            {
              leagueId: league.id,
              status: league.status,
              deadlineAtUtc: league.deadlineAtUtc
            },
            serverNowUtc
          );

          const predictionSets = league.predictionSets.map((predictionSet) => {
            if (predictionSet.userId !== currentUser.id) {
              return predictionSet;
            }

            const nextOverride = {
              id: `${predictionSet.id}:tiebreak:${params.scopeRef}`,
              predictionSetId: predictionSet.id,
              scopeRef: params.scopeRef,
              orderedTeamIds: params.orderedTeamIds,
              reason: params.reason,
              syncStatus: "SYNCED" as const,
              updatedAtUtc: serverNowUtc
            };
            const existing = predictionSet.tiebreakOverrides ?? [];

            return refreshPredictionSet(previous.competition, {
              ...predictionSet,
              tiebreakOverrides: [
                ...existing.filter((override) => override.scopeRef !== params.scopeRef),
                nextOverride
              ],
              lastServerSyncedAtUtc: serverNowUtc
            });
          });

          return {
            ...league,
            predictionSets
          };
        })
      }));
    },
    [currentUser.id, serverNowUtc]
  );

  const clearDependencyWarnings = useCallback(
    (leagueId: string) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) =>
          league.id === leagueId
            ? {
                ...league,
                predictionSets: league.predictionSets.map((predictionSet) =>
                  predictionSet.userId === currentUser.id
                    ? refreshPredictionSet(previous.competition, {
                        ...predictionSet,
                        dependencyWarnings: []
                      })
                    : predictionSet
                )
              }
            : league
        )
      }));
    },
    [currentUser.id]
  );

  const lockLeague = useCallback(
    (leagueId: string) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== leagueId) {
            return league;
          }

          const competition = getCompetitionForLeague(previous, league);
          const leagueWithSnapshot = lockMockLeagueCompetitionSnapshot({
            league,
            competition,
            lockedAtUtc: serverNowUtc
          });

          return {
            ...leagueWithSnapshot,
            status: "locked" satisfies LeagueStatus,
            scoringRuleVersion: lockScoringRuleVersion(league.scoringRuleVersion, serverNowUtc),
            predictionSets: league.predictionSets.map((predictionSet) => ({
              ...predictionSet,
              status: "locked"
            }))
          };
        })
      }));
    },
    [serverNowUtc]
  );

  const settleMockResult = useCallback((leagueId: string) => {
    setState((previous) => ({
      ...previous,
      leagues: previous.leagues.map((league) => {
        if (league.id !== leagueId) {
          return league;
        }

        const sourceResultVersion = `mock-result-${league.leaderboardSnapshots.length + 1}`;
        const resultSet = createWorldCupMockResultSet({
          competition: previous.competition,
          sourceResultVersion,
          createdAtUtc: "2030-06-08T21:15:00.000Z"
        });
        const participants = league.members.map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          avatarInitials: member.avatarInitials
        }));
        const previousSnapshot = league.leaderboardSnapshots
          .slice()
          .reverse()
          .find((snapshot) => snapshot.sourceResultVersion !== sourceResultVersion);
        const recalculation = recalculateTournamentScoring({
          competition: previous.competition,
          leagueId: league.id,
          competitionEditionId: league.competitionEditionId,
          scoringRuleVersion: league.scoringRuleVersion,
          predictionSets: league.predictionSets,
          participants,
          resultSet,
          existingEvents: league.scoringEvents,
          ...(previousSnapshot ? { previousSnapshot } : {})
        });

        return {
          ...league,
          scoringEvents: recalculation.allEvents,
          scoringBreakdowns: recalculation.breakdowns,
          leaderboardSnapshots: [
            ...league.leaderboardSnapshots.filter(
              (snapshot) => snapshot.sourceResultVersion !== sourceResultVersion
            ),
            recalculation.leaderboardSnapshot
          ]
        };
      })
    }));
  }, []);

  const updateRuleValue = useCallback(
    (params: {
      leagueId: string;
      stage: ScoringStageKey;
      field: keyof StageScoringRule;
      value: number;
    }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          const currentMember = league.members.find((member) => member.userId === currentUser.id);

          assertScoringRulesWritable(
            {
              leagueId: league.id,
              leagueStatus: league.status,
              deadlineAtUtc: league.deadlineAtUtc,
              ruleStatus: league.scoringRuleVersion.status,
              currentUserRole: currentMember?.role ?? "participant"
            },
            serverNowUtc
          );

          const update = updateStageRuleValueWithHistory({
            ruleVersion: league.scoringRuleVersion,
            stage: params.stage,
            field: params.field,
            value: params.value,
            actorUserId: currentUser.id,
            actorDisplayName: currentUser.displayName,
            changedAtUtc: serverNowUtc
          });

          return {
            ...league,
            scoringRuleVersion: update.ruleVersion,
            scoringRuleHistory: [...league.scoringRuleHistory, update.change]
          };
        })
      }));
    },
    [currentUser.displayName, currentUser.id, serverNowUtc]
  );

  const updateAntepostRuleValue = useCallback(
    (params: { leagueId: string; field: keyof AntepostScoringRule; value: number }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) => {
          if (league.id !== params.leagueId) {
            return league;
          }

          const currentMember = league.members.find((member) => member.userId === currentUser.id);

          assertScoringRulesWritable(
            {
              leagueId: league.id,
              leagueStatus: league.status,
              deadlineAtUtc: league.deadlineAtUtc,
              ruleStatus: league.scoringRuleVersion.status,
              currentUserRole: currentMember?.role ?? "participant"
            },
            serverNowUtc
          );

          const update = updateAntepostRuleValueWithHistory({
            ruleVersion: league.scoringRuleVersion,
            field: params.field,
            value: params.value,
            actorUserId: currentUser.id,
            actorDisplayName: currentUser.displayName,
            changedAtUtc: serverNowUtc
          });

          return {
            ...league,
            scoringRuleVersion: update.ruleVersion,
            scoringRuleHistory: [...league.scoringRuleHistory, update.change]
          };
        })
      }));
    },
    [currentUser.displayName, currentUser.id, serverNowUtc]
  );

  const value = useMemo<PredicteMockContextValue>(
    () => ({
      currentUser,
      serverNowUtc,
      ...state,
      createLeague,
      joinLeague,
      getLeague,
      updateMatchPrediction,
      updateKnockoutPrediction,
      updateAntepostPrediction,
      setTiebreakOverride,
      clearDependencyWarnings,
      lockLeague,
      settleMockResult,
      updateRuleValue,
      updateAntepostRuleValue
    }),
    [
      currentUser,
      createLeague,
      getLeague,
      joinLeague,
      lockLeague,
      serverNowUtc,
      settleMockResult,
      state,
      clearDependencyWarnings,
      setTiebreakOverride,
      updateAntepostPrediction,
      updateKnockoutPrediction,
      updateMatchPrediction,
      updateRuleValue,
      updateAntepostRuleValue
    ]
  );

  return <PredicteMockContext.Provider value={value}>{children}</PredicteMockContext.Provider>;
}

function getCompetitionForLeague(state: MockLeagueState, league: League): CompetitionSeed {
  return (
    state.competitions.find(
      (competition) => competition.edition.id === league.competitionEditionId
    ) ?? state.competition
  );
}

export function usePredicteMock(): PredicteMockContextValue {
  const context = useContext(PredicteMockContext);

  if (!context) {
    throw new Error("usePredicteMock must be used within PredicteMockProvider.");
  }

  return context;
}

function syncPrediction(prediction: MatchPrediction): MatchPrediction {
  return {
    ...prediction,
    syncStatus: "SYNCED"
  };
}

function refreshPredictionSet(
  competition: CompetitionSeed,
  predictionSet: PredictionSet
): PredictionSet {
  const validation = validatePredictionSet({ competition, predictionSet });
  const status =
    validation.completion.incompleteItems === 0 && validation.completion.unsyncedItems === 0
      ? "complete"
      : "draft";

  return {
    ...predictionSet,
    status,
    totalRequired: validation.completion.totalRequired,
    completedItems: validation.completion.completedItems,
    unsyncedItems: validation.completion.unsyncedItems
  };
}

function upsertMatchPrediction(
  predictions: MatchPrediction[],
  nextPrediction: MatchPrediction
): MatchPrediction[] {
  return [
    ...predictions.filter((prediction) => prediction.matchId !== nextPrediction.matchId),
    nextPrediction
  ];
}

function normalizeKnockoutPrediction(params: {
  predictionSetId: string;
  match: PredictedBracketMatch;
  existingPrediction?: MatchPrediction | undefined;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
  updatedAtUtc: string;
}): MatchPrediction {
  const nonDrawWinner =
    params.homeGoals > params.awayGoals
      ? params.match.homeTeamId
      : params.awayGoals > params.homeGoals
        ? params.match.awayTeamId
        : undefined;
  const isDraw = params.homeGoals === params.awayGoals;

  return {
    id: `${params.predictionSetId}:${params.match.id}`,
    predictionSetId: params.predictionSetId,
    matchId: params.match.id,
    stageCode: params.match.roundCode,
    homeGoals: params.homeGoals,
    awayGoals: params.awayGoals,
    qualifiedTeamId: isDraw
      ? (params.qualifiedTeamId ?? params.existingPrediction?.qualifiedTeamId)
      : nonDrawWinner,
    advancementMethod: isDraw
      ? (params.advancementMethod ?? params.existingPrediction?.advancementMethod)
      : "REGULATION",
    syncStatus: "SYNCED",
    updatedAtUtc: params.updatedAtUtc
  };
}
