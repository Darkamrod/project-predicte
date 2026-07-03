import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { calculatePredictionCompletion } from "@/domain/predictions/progress";
import { assertPredictionWritable } from "@/domain/predictions/locks";
import type { LeagueStatus, MatchPrediction } from "@/domain/predictions/types";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import { lockScoringRuleVersion, updateStageRuleValue } from "@/domain/scoring/ruleVersions";
import { scoreRegulationMatch } from "@/domain/scoring/engine";
import type { ScoringRuleConfig, ScoringStageKey } from "@/domain/scoring/types";
import { mockCurrentUser } from "@/services/auth/mockAuthAdapter";
import type { AuthUser } from "@/services/auth/types";
import type { League, MockLeagueState } from "@/services/leagues/types";
import {
  createInitialMockLeagueState,
  createMockLeague,
  createPredictionSet
} from "@/services/mock/mockLeagueFactory";

interface PredicteMockContextValue extends MockLeagueState {
  currentUser: AuthUser;
  serverNowUtc: string;
  createLeague(): string;
  joinLeague(inviteCode: string): string;
  getLeague(leagueId: string): League | undefined;
  updateMatchPrediction(params: {
    leagueId: string;
    matchId: string;
    homeGoals: number;
    awayGoals: number;
  }): void;
  lockLeague(leagueId: string): void;
  settleMockResult(leagueId: string): void;
  updateRuleValue(params: {
    leagueId: string;
    stage: ScoringStageKey;
    field: keyof ScoringRuleConfig["stages"][ScoringStageKey];
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

  const createLeague = useCallback(() => {
    const id = `league-mock-${state.leagues.length + 1}`;
    const league = createMockLeague({
      id,
      name: `Lega mock ${state.leagues.length + 1}`,
      owner: currentUser,
      competition: state.competition
    });

    setState((previous) => ({
      ...previous,
      leagues: [...previous.leagues, league]
    }));

    return id;
  }, [currentUser, state.competition, state.leagues.length]);

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
          createPredictionSet(league.id, currentUser.id, state.competition.matches)
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
            const completion = calculatePredictionCompletion({
              ...predictionSet,
              matchPredictions
            });
            const status =
              completion.incompleteItems === 0 && completion.unsyncedItems === 0
                ? ("complete" as const)
                : ("draft" as const);

            return {
              ...predictionSet,
              status,
              completedItems: completion.completedItems,
              unsyncedItems: completion.unsyncedItems,
              matchPredictions,
              lastServerSyncedAtUtc: serverNowUtc
            };
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

  const lockLeague = useCallback(
    (leagueId: string) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) =>
          league.id === leagueId
            ? {
                ...league,
                status: "locked" satisfies LeagueStatus,
                scoringRuleVersion: lockScoringRuleVersion(league.scoringRuleVersion, serverNowUtc),
                predictionSets: league.predictionSets.map((predictionSet) => ({
                  ...predictionSet,
                  status: "locked"
                }))
              }
            : league
        )
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

        const match = previous.competition.matches[0];

        if (!match) {
          return league;
        }

        const sourceResultVersion = `mock-result-${league.leaderboardSnapshots.length + 1}`;
        const latestEvents = league.predictionSets.flatMap((predictionSet) => {
          const prediction = predictionSet.matchPredictions.find(
            (item) => item.matchId === match.id
          );

          if (!prediction) {
            return [];
          }

          return scoreRegulationMatch(
            league.scoringRuleVersion.config,
            {
              leagueId: league.id,
              participantUserId: predictionSet.userId,
              competitionEditionId: league.competitionEditionId,
              scoringRuleVersionId: league.scoringRuleVersion.id,
              sourceResultVersion,
              createdAtUtc: "2030-06-08T21:15:00.000Z"
            },
            {
              stage: "GROUP_STAGE",
              matchId: match.id,
              prediction: {
                homeGoals: prediction.homeGoals,
                awayGoals: prediction.awayGoals
              },
              result: {
                homeTeamId: match.homeTeamId,
                awayTeamId: match.awayTeamId,
                homeGoals: 1,
                awayGoals: 0
              }
            }
          );
        });
        const participants = league.members.map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          avatarInitials: member.avatarInitials
        }));
        const previousSnapshot = league.leaderboardSnapshots.at(-1);
        const snapshot = createLeaderboardSnapshot({
          leagueId: league.id,
          createdAtUtc: "2030-06-08T21:15:00.000Z",
          sourceResultVersion,
          participants,
          allEvents: [...league.scoringEvents, ...latestEvents],
          latestEvents,
          ...(previousSnapshot ? { previousSnapshot } : {})
        });

        return {
          ...league,
          scoringEvents: [...league.scoringEvents, ...latestEvents],
          leaderboardSnapshots: [...league.leaderboardSnapshots, snapshot]
        };
      })
    }));
  }, []);

  const updateRuleValue = useCallback(
    (params: {
      leagueId: string;
      stage: ScoringStageKey;
      field: keyof ScoringRuleConfig["stages"][ScoringStageKey];
      value: number;
    }) => {
      setState((previous) => ({
        ...previous,
        leagues: previous.leagues.map((league) =>
          league.id === params.leagueId
            ? {
                ...league,
                scoringRuleVersion: updateStageRuleValue(
                  league.scoringRuleVersion,
                  params.stage,
                  params.field,
                  params.value
                )
              }
            : league
        )
      }));
    },
    []
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
      lockLeague,
      settleMockResult,
      updateRuleValue
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
      updateMatchPrediction,
      updateRuleValue
    ]
  );

  return <PredicteMockContext.Provider value={value}>{children}</PredicteMockContext.Provider>;
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
