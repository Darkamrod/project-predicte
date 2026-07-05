import {
  createCompetitionSnapshot,
  createInitialCompetitionSeeds,
  createWorldCup2026MockSeed
} from "@/domain/competitions/versionedTemplates";
import type { CompetitionSeed } from "@/domain/competitions/types";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant, LeaderboardSnapshot } from "@/domain/leaderboard/types";
import { generatePredictedBracket } from "@/domain/predictions/bracket";
import type { MatchPrediction, PredictionSet } from "@/domain/predictions/types";
import { createDraftScoringRuleVersion } from "@/domain/scoring/ruleVersions";
import { recalculateTournamentScoring } from "@/domain/scoring/tournamentScoring";
import type { ScoringEvent, ScoringRuleConfig, UserScoringBreakdown } from "@/domain/scoring/types";
import { worldCupDefaultScoringConfig } from "@/domain/scoring/worldCupPreset";
import type { AuthUser } from "@/services/auth/types";
import type { League, LeagueMember, MockLeagueState } from "@/services/leagues/types";
import { createWorldCupMockResultSet } from "./mockResults";

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
  const competitions = createInitialCompetitionSeeds();
  const competition = competitions[0] ?? createWorldCup2026MockSeed();
  const league = createMockLeague({
    id: "league-predicte-friends",
    name: "Predicte Friends 2026",
    owner: currentUser,
    competition
  });

  const settled = settleFirstMockResult(league, competition);

  return {
    competition,
    competitions,
    leagues: [
      {
        ...league,
        scoringEvents: settled.events,
        scoringBreakdowns: settled.breakdowns,
        leaderboardSnapshots: [settled.previousSnapshot, settled.snapshot]
      }
    ]
  };
}

export function createMockLeague(params: {
  id: string;
  name: string;
  owner: AuthUser;
  competition: CompetitionSeed;
}): League {
  const versionedScoringConfig = params.competition.versionBundle?.scoringPreset.config as
    ScoringRuleConfig | undefined;
  const scoringRuleVersion = createDraftScoringRuleVersion({
    leagueId: params.id,
    config: versionedScoringConfig ?? worldCupDefaultScoringConfig,
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
    deadlineAtUtc: params.competition.edition.maximumDeadlineAtUtc,
    inviteCode: params.competition.edition.editionCode?.toUpperCase() ?? "PREDICTE",
    members,
    scoringRuleVersion,
    predictionSets: members.map((member) =>
      createPredictionSet(params.id, member.userId, params.competition)
    ),
    scoringRuleHistory: [],
    scoringEvents: [],
    scoringBreakdowns: [],
    leaderboardSnapshots: []
  };
}

export function lockMockLeagueCompetitionSnapshot(params: {
  league: League;
  competition: CompetitionSeed;
  lockedAtUtc: string;
}): League {
  return {
    ...params.league,
    competitionSnapshot: createCompetitionSnapshot({
      leagueId: params.league.id,
      competition: params.competition,
      lockedAtUtc: params.lockedAtUtc,
      adminOverrides: {
        scoringRuleVersionId: params.league.scoringRuleVersion.id
      }
    })
  };
}

export function createPredictionSet(
  leagueId: string,
  userId: string,
  competition: CompetitionSeed
): PredictionSet {
  const matches = competition.matches;
  const initialStageIds = new Set(
    competition.stages.filter((stage) => stage.code === "GROUP_STAGE").map((stage) => stage.id)
  );
  const groupMatches = matches.filter((match) => initialStageIds.has(match.stageId));
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
  const draftPredictionSet: PredictionSet = {
    id: `${leagueId}:${userId}:prediction-set`,
    leagueId,
    userId,
    status: "draft",
    totalRequired: 0,
    completedItems: matchPredictions.length,
    unsyncedItems: 0,
    matchPredictions,
    tiebreakOverrides: [],
    antepostPredictions: [],
    dependencyWarnings: [],
    lastServerSyncedAtUtc: nowUtc
  };
  const bracket = generatePredictedBracket({
    competition,
    predictionSet: draftPredictionSet
  });
  const antepostRequired = competition.antepostDefinitions.filter(
    (definition) => definition.required
  ).length;

  return {
    ...draftPredictionSet,
    status: "draft",
    totalRequired: groupMatches.length + bracket.matches.length + antepostRequired,
    completedItems: matchPredictions.length,
    unsyncedItems: 0
  };
}

export function settleFirstMockResult(
  league: League,
  competition: CompetitionSeed
): {
  events: ScoringEvent[];
  breakdowns: UserScoringBreakdown[];
  previousSnapshot: LeaderboardSnapshot;
  snapshot: LeaderboardSnapshot;
} {
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
  const resultSet = createWorldCupMockResultSet({
    competition,
    sourceResultVersion: "mock-result-v1",
    createdAtUtc: "2030-06-08T21:15:00.000Z"
  });
  const recalculation = recalculateTournamentScoring({
    competition,
    leagueId: league.id,
    competitionEditionId: league.competitionEditionId,
    scoringRuleVersion: league.scoringRuleVersion,
    predictionSets: league.predictionSets,
    participants,
    resultSet,
    previousSnapshot
  });

  return {
    events: recalculation.latestEvents,
    breakdowns: recalculation.breakdowns,
    previousSnapshot,
    snapshot: recalculation.leaderboardSnapshot
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
