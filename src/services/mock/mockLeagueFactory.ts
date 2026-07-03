import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import type { Match } from "@/domain/competitions/types";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant, LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type { MatchPrediction, PredictionSet } from "@/domain/predictions/types";
import { createDraftScoringRuleVersion } from "@/domain/scoring/ruleVersions";
import { scoreRegulationMatch } from "@/domain/scoring/engine";
import type { ScoringContext, ScoringEvent } from "@/domain/scoring/types";
import { worldCupDefaultScoringConfig } from "@/domain/scoring/worldCupPreset";
import type { AuthUser } from "@/services/auth/types";
import type { League, LeagueMember, MockLeagueState } from "@/services/leagues/types";

const nowUtc = "2026-07-03T20:00:00.000Z";

const mockMembers: LeagueMember[] = [
  {
    userId: "user-current",
    displayName: "Tu",
    avatarInitials: "TU",
    role: "owner",
    joinedAtUtc: nowUtc
  },
  {
    userId: "user-giulia",
    displayName: "Giulia",
    avatarInitials: "GI",
    role: "participant",
    joinedAtUtc: nowUtc
  },
  {
    userId: "user-marco",
    displayName: "Marco",
    avatarInitials: "MA",
    role: "participant",
    joinedAtUtc: nowUtc
  }
];

export function createInitialMockLeagueState(currentUser: AuthUser): MockLeagueState {
  const competition = createWorldCup2030MockSeed();
  const league = createMockLeague({
    id: "league-predicte-friends",
    name: "Predicte Friends 2030",
    owner: currentUser,
    competition
  });

  const settled = settleFirstMockResult(league, competition.matches[0]);

  return {
    competition,
    leagues: [
      {
        ...league,
        scoringEvents: settled.events,
        leaderboardSnapshots: [settled.previousSnapshot, settled.snapshot]
      }
    ]
  };
}

export function createMockLeague(params: {
  id: string;
  name: string;
  owner: AuthUser;
  competition: ReturnType<typeof createWorldCup2030MockSeed>;
}): League {
  const scoringRuleVersion = createDraftScoringRuleVersion({
    leagueId: params.id,
    config: worldCupDefaultScoringConfig,
    createdAtUtc: nowUtc
  });
  const members: LeagueMember[] = [
    {
      userId: params.owner.id,
      displayName: params.owner.displayName,
      avatarInitials: params.owner.avatarInitials,
      role: "owner",
      joinedAtUtc: nowUtc
    },
    ...mockMembers.filter((member) => member.userId !== params.owner.id)
  ];

  return {
    id: params.id,
    name: params.name,
    competitionEditionId: params.competition.edition.id,
    ownerUserId: params.owner.id,
    status: "open",
    deadlineAtUtc: "2030-06-08T18:30:00.000Z",
    inviteCode: "PREDICTE2030",
    members,
    scoringRuleVersion,
    predictionSets: members.map((member) =>
      createPredictionSet(params.id, member.userId, params.competition.matches)
    ),
    scoringEvents: [],
    leaderboardSnapshots: []
  };
}

export function createPredictionSet(
  leagueId: string,
  userId: string,
  matches: Match[]
): PredictionSet {
  const groupMatches = matches.filter((match) => match.stageId === "stage-group");
  const defaultScores = getDefaultScores(userId);
  const matchPredictions: MatchPrediction[] = groupMatches.map((match, index) => ({
    id: `${leagueId}:${userId}:${match.id}`,
    predictionSetId: `${leagueId}:${userId}:prediction-set`,
    matchId: match.id,
    stageCode: "GROUP_STAGE",
    homeGoals: defaultScores[index % defaultScores.length]?.[0] ?? 1,
    awayGoals: defaultScores[index % defaultScores.length]?.[1] ?? 0,
    syncStatus: "SYNCED",
    updatedAtUtc: nowUtc
  }));

  return {
    id: `${leagueId}:${userId}:prediction-set`,
    leagueId,
    userId,
    status: "draft",
    totalRequired: groupMatches.length,
    completedItems: matchPredictions.length,
    unsyncedItems: 0,
    matchPredictions,
    lastServerSyncedAtUtc: nowUtc
  };
}

export function settleFirstMockResult(
  league: League,
  match: Match | undefined
): {
  events: ScoringEvent[];
  previousSnapshot: LeaderboardSnapshot;
  snapshot: LeaderboardSnapshot;
} {
  if (!match) {
    throw new Error("Cannot settle mock result without a match.");
  }

  const participants: LeaderboardParticipant[] = league.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    avatarInitials: member.avatarInitials
  }));

  const previousSnapshot = createLeaderboardSnapshot({
    leagueId: league.id,
    createdAtUtc: "2030-06-08T18:29:00.000Z",
    sourceResultVersion: "mock-before-kickoff",
    participants,
    allEvents: [],
    latestEvents: []
  });

  const latestEvents = league.predictionSets.flatMap((predictionSet) => {
    const prediction = predictionSet.matchPredictions.find((item) => item.matchId === match.id);

    if (!prediction) {
      return [];
    }

    const context: ScoringContext = {
      leagueId: league.id,
      participantUserId: predictionSet.userId,
      competitionEditionId: league.competitionEditionId,
      scoringRuleVersionId: league.scoringRuleVersion.id,
      sourceResultVersion: "mock-result-v1",
      createdAtUtc: "2030-06-08T21:15:00.000Z"
    };

    return scoreRegulationMatch(league.scoringRuleVersion.config, context, {
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
    });
  });

  const snapshot = createLeaderboardSnapshot({
    leagueId: league.id,
    createdAtUtc: "2030-06-08T21:15:00.000Z",
    sourceResultVersion: "mock-result-v1",
    participants,
    allEvents: latestEvents,
    latestEvents,
    previousSnapshot
  });

  return {
    events: latestEvents,
    previousSnapshot,
    snapshot
  };
}

function getDefaultScores(userId: string): [number, number][] {
  if (userId === "user-giulia") {
    return [
      [1, 0],
      [1, 1],
      [2, 1],
      [0, 0]
    ];
  }

  if (userId === "user-marco") {
    return [
      [0, 1],
      [2, 0],
      [1, 1],
      [3, 1]
    ];
  }

  return [
    [1, 0],
    [2, 1],
    [1, 1],
    [0, 0]
  ];
}
