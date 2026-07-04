import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant } from "@/domain/leaderboard/types";
import { generatePredictedBracket } from "@/domain/predictions/bracket";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionSet
} from "@/domain/predictions/types";
import { scoreAntepost, scoreRegulationMatch, sumScoringEvents } from "@/domain/scoring/engine";
import {
  assertScoringRulesWritable,
  canEditScoringRules,
  createConfigChecksum,
  createDraftScoringRuleVersion,
  lockScoringRuleVersion,
  updateAntepostRuleValueWithHistory,
  updateStageRuleValue,
  updateStageRuleValueWithHistory
} from "@/domain/scoring/ruleVersions";
import {
  buildScoringBreakdowns,
  recalculateTournamentScoring,
  scorePredictionSetTournament
} from "@/domain/scoring/tournamentScoring";
import type {
  OfficialTournamentResultSet,
  ScoringContext,
  ScoringEvent,
  ScoringEventType,
  ScoringRuleConfig,
  ScoringRuleVersion
} from "@/domain/scoring/types";
import { worldCupDefaultScoringConfig } from "@/domain/scoring/worldCupPreset";
import { createPredictionSet } from "@/services/mock/mockLeagueFactory";

const createdAtUtc = "2030-06-08T21:15:00.000Z";

const context: ScoringContext = {
  leagueId: "league-m3",
  participantUserId: "user-a",
  competitionEditionId: "edition-world-cup-2030",
  scoringRuleVersionId: "rules-v1",
  sourceResultVersion: "result-v1",
  createdAtUtc
};

describe("Milestone 3 scoring event coverage", () => {
  it("supports every positive scoring event type and keeps manual corrections representable", () => {
    const exact = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-exact",
      prediction: { homeGoals: 2, awayGoals: 0 },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 2,
        awayGoals: 0
      }
    });
    const outcome = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-outcome",
      prediction: { homeGoals: 1, awayGoals: 0 },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 3,
        awayGoals: 1
      }
    });
    const extraTime = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "match-extra",
      prediction: {
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-a",
        advancementMethod: "EXTRA_TIME"
      },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-a",
        advancementMethod: "EXTRA_TIME"
      }
    });
    const penalties = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "match-penalties",
      prediction: {
        homeGoals: 0,
        awayGoals: 0,
        qualifiedTeamId: "team-b",
        advancementMethod: "PENALTIES"
      },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 0,
        awayGoals: 0,
        qualifiedTeamId: "team-b",
        advancementMethod: "PENALTIES"
      }
    });
    const tournament = createTournamentFixture();
    const tournamentEvents = scorePredictionSetTournament({
      competition: tournament.seed,
      leagueId: "league-m3",
      competitionEditionId: tournament.seed.edition.id,
      scoringRuleVersion: tournament.ruleVersion,
      predictionSet: tournament.predictionSet,
      resultSet: tournament.resultSet
    });
    const manualCorrection = createManualCorrectionEvent();
    const eventTypes = new Set<ScoringEventType>(
      [...exact, ...outcome, ...extraTime, ...penalties, ...tournamentEvents, manualCorrection].map(
        (event) => event.type
      )
    );

    expect(eventTypes).toEqual(
      new Set<ScoringEventType>([
        "MATCH_OUTCOME",
        "EXACT_SCORE",
        "GROUP_POSITION",
        "STAGE_QUALIFICATION",
        "CORRECT_PAIRING",
        "EXTRA_TIME_METHOD",
        "PENALTY_METHOD",
        "TOURNAMENT_WINNER",
        "TOP_SCORER_EXACT_GOALS",
        "MANUAL_CORRECTION"
      ])
    );
    expect(
      scoreAntepost(worldCupDefaultScoringConfig, context, {
        referenceId: "antepost",
        predictedTopScorerPlayerId: "player-a",
        actualTopScorerPlayerIds: ["player-a"],
        predictedTopScorerGoals: 8,
        actualTopScorerGoals: 7
      }).map((event) => event.type)
    ).toEqual(["TOP_SCORER"]);
    expect(buildScoringBreakdowns([manualCorrection])[0]?.items[0]?.type).toBe("MANUAL_CORRECTION");
  });

  it("scores the configured third-place final independently from the final", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "THIRD_PLACE",
      matchId: "third-place",
      prediction: {
        homeGoals: 0,
        awayGoals: 0,
        qualifiedTeamId: "team-a",
        advancementMethod: "PENALTIES"
      },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 0,
        awayGoals: 0,
        qualifiedTeamId: "team-a",
        advancementMethod: "PENALTIES"
      }
    });

    expect(events.map((event) => event.type)).toEqual(["EXACT_SCORE", "PENALTY_METHOD"]);
    expect(sumScoringEvents(events)).toBe(60);
  });

  it("lets configured qualification, pairing, exact score, and method bonuses stack", () => {
    const tournament = createTournamentFixture();
    const events = scorePredictionSetTournament({
      competition: tournament.seed,
      leagueId: "league-m3",
      competitionEditionId: tournament.seed.edition.id,
      scoringRuleVersion: tournament.ruleVersion,
      predictionSet: tournament.predictionSet,
      resultSet: tournament.resultSet
    });
    const eventTypes = events.map((event) => event.type);

    expect(eventTypes).toContain("EXACT_SCORE");
    expect(eventTypes).toContain("EXTRA_TIME_METHOD");
    expect(eventTypes).toContain("STAGE_QUALIFICATION");
    expect(eventTypes).toContain("CORRECT_PAIRING");
    expect(events.filter((event) => event.type === "STAGE_QUALIFICATION")).toHaveLength(2);
  });

  it("keeps replacement stacking for exact score and top scorer exact goals", () => {
    const matchEvents = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "final",
      prediction: { homeGoals: 2, awayGoals: 1 },
      result: {
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 2,
        awayGoals: 1
      }
    });
    const antepostEvents = scoreAntepost(worldCupDefaultScoringConfig, context, {
      referenceId: "antepost",
      predictedTopScorerPlayerId: "player-a",
      actualTopScorerPlayerIds: ["player-a"],
      predictedTopScorerGoals: 7,
      actualTopScorerGoals: 7
    });

    expect(matchEvents.map((event) => event.type)).toEqual(["EXACT_SCORE"]);
    expect(antepostEvents.map((event) => event.type)).toEqual(["TOP_SCORER_EXACT_GOALS"]);
  });
});

describe("Milestone 3 rule lifecycle", () => {
  it("records rule history for stage and antepost edits before lock", () => {
    const draft = createRuleVersion();
    const stageUpdate = updateStageRuleValueWithHistory({
      ruleVersion: draft,
      stage: "GROUP_STAGE",
      field: "correctOutcome",
      value: 6,
      actorUserId: "user-owner",
      actorDisplayName: "Owner",
      changedAtUtc: createdAtUtc
    });
    const antepostUpdate = updateAntepostRuleValueWithHistory({
      ruleVersion: stageUpdate.ruleVersion,
      field: "tournamentWinner",
      value: 30,
      actorUserId: "user-owner",
      actorDisplayName: "Owner",
      changedAtUtc: "2030-06-08T21:16:00.000Z"
    });

    expect(stageUpdate.change).toMatchObject({
      scope: "stage",
      stage: "GROUP_STAGE",
      previousValue: 5,
      nextValue: 6
    });
    expect(antepostUpdate.change).toMatchObject({
      scope: "antepost",
      field: "tournamentWinner",
      previousValue: 25,
      nextValue: 30
    });
  });

  it("allows owner/admin edits before deadline and blocks locked or late edits", () => {
    const editableState = {
      leagueId: "league-m3",
      leagueStatus: "open" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z",
      ruleStatus: "draft" as const,
      currentUserRole: "admin" as const
    };

    expect(canEditScoringRules(editableState, "2030-06-08T18:00:00.000Z")).toBe(true);
    expect(() =>
      assertScoringRulesWritable(editableState, "2030-06-08T18:00:00.000Z")
    ).not.toThrow();
    expect(() =>
      assertScoringRulesWritable(
        {
          ...editableState,
          ruleStatus: "locked"
        },
        "2030-06-08T18:00:00.000Z"
      )
    ).toThrow("Scoring rules can only be edited by owner/admin before lock and deadline.");
    expect(() => assertScoringRulesWritable(editableState, "2030-06-08T18:30:00.000Z")).toThrow(
      "Scoring rules can only be edited by owner/admin before lock and deadline."
    );
  });

  it("creates an immutable locked snapshot with checksum", () => {
    const draft = createRuleVersion();
    const locked = lockScoringRuleVersion(draft, "2030-06-08T18:30:00.000Z");
    const updatedDraft = updateStageRuleValue(draft, "GROUP_STAGE", "correctOutcome", 9);

    expect(locked.status).toBe("locked");
    expect(locked.checksum).toBe(createConfigChecksum(locked.config));
    expect(locked.config.stages.GROUP_STAGE.correctOutcome).toBe(5);
    expect(updatedDraft.config.stages.GROUP_STAGE.correctOutcome).toBe(9);
    expect(() => updateStageRuleValue(locked, "GROUP_STAGE", "correctOutcome", 10)).toThrow(
      "Locked scoring rules are immutable."
    );
  });
});

describe("Milestone 3 recalculation and leaderboard snapshots", () => {
  it("generates leaderboard snapshots and user breakdowns from scoring events", () => {
    const tournament = createTournamentFixture();
    const participants: LeaderboardParticipant[] = [
      { userId: "user-a", displayName: "Anna", avatarInitials: "AN" }
    ];
    const previousSnapshot = createLeaderboardSnapshot({
      leagueId: "league-m3",
      createdAtUtc: "2030-06-08T18:00:00.000Z",
      sourceResultVersion: "before",
      participants,
      allEvents: [],
      latestEvents: []
    });
    const output = recalculateTournamentScoring({
      competition: tournament.seed,
      leagueId: "league-m3",
      competitionEditionId: tournament.seed.edition.id,
      scoringRuleVersion: tournament.ruleVersion,
      predictionSets: [tournament.predictionSet],
      participants,
      resultSet: tournament.resultSet,
      previousSnapshot
    });
    const entry = output.leaderboardSnapshot.entries[0];

    expect(entry?.totalPoints).toBe(sumScoringEvents(output.latestEvents));
    expect(entry?.latestPoints).toBe(sumScoringEvents(output.latestEvents));
    expect(output.breakdowns[0]?.items.some((item) => item.scope === "MATCH")).toBe(true);
    expect(output.breakdowns[0]?.items.some((item) => item.scope === "STAGE")).toBe(true);
    expect(output.breakdowns[0]?.items.some((item) => item.scope === "ANTEPOST")).toBe(true);
  });

  it("recalculates idempotently for the same source result version", () => {
    const tournament = createTournamentFixture();
    const participants: LeaderboardParticipant[] = [
      { userId: "user-a", displayName: "Anna", avatarInitials: "AN" }
    ];
    const first = recalculateTournamentScoring({
      competition: tournament.seed,
      leagueId: "league-m3",
      competitionEditionId: tournament.seed.edition.id,
      scoringRuleVersion: tournament.ruleVersion,
      predictionSets: [tournament.predictionSet],
      participants,
      resultSet: tournament.resultSet
    });
    const second = recalculateTournamentScoring({
      competition: tournament.seed,
      leagueId: "league-m3",
      competitionEditionId: tournament.seed.edition.id,
      scoringRuleVersion: tournament.ruleVersion,
      predictionSets: [tournament.predictionSet],
      participants,
      resultSet: tournament.resultSet,
      existingEvents: first.allEvents
    });

    expect(second.allEvents.map((event) => event.id)).toEqual(
      first.allEvents.map((event) => event.id)
    );
    expect(second.leaderboardSnapshot.entries).toEqual(first.leaderboardSnapshot.entries);
  });
});

function createTournamentFixture(): {
  seed: ReturnType<typeof createWorldCup2030MockSeed>;
  predictionSet: PredictionSet;
  resultSet: OfficialTournamentResultSet;
  ruleVersion: ScoringRuleVersion;
} {
  const seed = createWorldCup2030MockSeed();
  const basePredictionSet = createPredictionSet("league-m3", "user-a", seed);
  const bracket = generatePredictedBracket({ competition: seed, predictionSet: basePredictionSet });
  const firstRoundMatch = bracket.matches.find(
    (match) => match.roundCode === "ROUND_OF_32" && match.homeTeamId && match.awayTeamId
  );

  if (!firstRoundMatch?.homeTeamId || !firstRoundMatch.awayTeamId) {
    throw new Error("Expected a complete first-round bracket match.");
  }

  const knockoutPrediction: MatchPrediction = {
    id: `${basePredictionSet.id}:${firstRoundMatch.id}`,
    predictionSetId: basePredictionSet.id,
    matchId: firstRoundMatch.id,
    stageCode: "ROUND_OF_32",
    homeGoals: 1,
    awayGoals: 1,
    qualifiedTeamId: firstRoundMatch.homeTeamId,
    advancementMethod: "EXTRA_TIME",
    syncStatus: "SYNCED",
    updatedAtUtc: createdAtUtc
  };
  const antepostPredictions = createAntepostPredictions(
    basePredictionSet.id,
    seed,
    firstRoundMatch.homeTeamId
  );
  const predictionSet: PredictionSet = {
    ...basePredictionSet,
    matchPredictions: [...basePredictionSet.matchPredictions, knockoutPrediction],
    antepostPredictions
  };
  const resultSet: OfficialTournamentResultSet = {
    sourceResultVersion: "result-v1",
    createdAtUtc,
    matchResults: [
      {
        matchId: firstRoundMatch.id,
        stage: "ROUND_OF_32",
        order: firstRoundMatch.order,
        homeTeamId: firstRoundMatch.homeTeamId,
        awayTeamId: firstRoundMatch.awayTeamId,
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: firstRoundMatch.homeTeamId,
        advancementMethod: "EXTRA_TIME"
      }
    ],
    groupPositions: [
      {
        groupCode: "A",
        position: 1,
        teamId: bracket.groupTables[0]?.rows[0]?.teamId ?? firstRoundMatch.homeTeamId
      }
    ],
    stageQualifications: [
      {
        stage: "ROUND_OF_32",
        referenceId: "qualification:ROUND_OF_32",
        teamIds: [firstRoundMatch.homeTeamId, firstRoundMatch.awayTeamId]
      }
    ],
    pairings: [
      {
        stage: "ROUND_OF_32",
        referenceId: "pairing:ROUND_OF_32:1",
        order: firstRoundMatch.order,
        teamIds: [firstRoundMatch.homeTeamId, firstRoundMatch.awayTeamId]
      }
    ],
    antepost: {
      winnerTeamId: firstRoundMatch.homeTeamId,
      topScorerPlayerIds: [seed.players[0]?.id ?? "player-01"],
      topScorerGoals: 7
    }
  };

  return {
    seed,
    predictionSet,
    resultSet,
    ruleVersion: createRuleVersion()
  };
}

function createAntepostPredictions(
  predictionSetId: string,
  seed: ReturnType<typeof createWorldCup2030MockSeed>,
  winnerTeamId: string
): AntepostPrediction[] {
  return seed.antepostDefinitions.map((definition) => ({
    id: `${predictionSetId}:antepost:${definition.id}`,
    predictionSetId,
    definitionId: definition.id,
    ...(definition.code === "TOURNAMENT_WINNER" ? { selectedTeamId: winnerTeamId } : {}),
    ...(definition.code === "TOP_SCORER"
      ? { selectedPlayerId: seed.players[0]?.id ?? "player-01" }
      : {}),
    ...(definition.code === "TOP_SCORER_GOALS" ? { numericValue: 7 } : {}),
    syncStatus: "SYNCED",
    updatedAtUtc: createdAtUtc
  }));
}

function createRuleVersion(
  config: ScoringRuleConfig = worldCupDefaultScoringConfig
): ScoringRuleVersion {
  return createDraftScoringRuleVersion({
    leagueId: "league-m3",
    config,
    createdAtUtc
  });
}

function createManualCorrectionEvent(): ScoringEvent {
  return {
    id: "manual-correction",
    leagueId: "league-m3",
    participantUserId: "user-a",
    competitionEditionId: "edition-world-cup-2030",
    referenceId: "manual:correction",
    scoringRuleVersionId: "rules-v1",
    type: "MANUAL_CORRECTION",
    points: 1,
    reason: "Correzione manuale futura",
    calculationVersion: "manual",
    createdAtUtc,
    sourceResultVersion: "manual-v1"
  };
}
