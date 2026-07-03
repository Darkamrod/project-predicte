import { describe, expect, it } from "vitest";

import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant } from "@/domain/leaderboard/types";
import {
  recalculateMatchEvents,
  scoreAntepost,
  scoreCorrectPairing,
  scoreGroupPosition,
  scoreRegulationMatch,
  scoreStageQualification,
  sumScoringEvents
} from "@/domain/scoring/engine";
import {
  createDraftScoringRuleVersion,
  lockScoringRuleVersion,
  updateStageRuleValue
} from "@/domain/scoring/ruleVersions";
import type { ScoringContext, ScoringEvent, ScoringRuleConfig } from "@/domain/scoring/types";
import { worldCupDefaultScoringConfig } from "@/domain/scoring/worldCupPreset";

const context: ScoringContext = {
  leagueId: "league-test",
  participantUserId: "user-a",
  competitionEditionId: "edition-test",
  scoringRuleVersionId: "rules-v1",
  sourceResultVersion: "result-v1",
  createdAtUtc: "2030-06-08T21:15:00.000Z"
};

describe("scoring engine", () => {
  it("awards exact score without also adding outcome under the default preset", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-1",
      prediction: { homeGoals: 1, awayGoals: 0 },
      result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 1, awayGoals: 0 }
    });

    expect(events.map((event) => event.type)).toEqual(["EXACT_SCORE"]);
    expect(sumScoringEvents(events)).toBe(10);
  });

  it("awards correct outcome when the score is not exact", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-1",
      prediction: { homeGoals: 2, awayGoals: 0 },
      result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 1, awayGoals: 0 }
    });

    expect(events.map((event) => event.type)).toEqual(["MATCH_OUTCOME"]);
    expect(sumScoringEvents(events)).toBe(5);
  });

  it("awards no match points for a wrong result", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-1",
      prediction: { homeGoals: 0, awayGoals: 1 },
      result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 1, awayGoals: 0 }
    });

    expect(events).toEqual([]);
  });

  it("scores group position from configuration", () => {
    const events = scoreGroupPosition(worldCupDefaultScoringConfig, context, {
      referenceId: "group-a-position-1",
      predictedTeamId: "team-a",
      actualTeamId: "team-a",
      position: 1
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("GROUP_POSITION");
    expect(events[0]?.points).toBe(3);
  });

  it("scores stage qualification for matching teams", () => {
    const events = scoreStageQualification(worldCupDefaultScoringConfig, context, {
      stage: "ROUND_OF_16",
      referenceId: "round-16",
      predictedTeamIds: ["team-a", "team-b", "team-x"],
      actualTeamIds: ["team-a", "team-b", "team-c"]
    });

    expect(events).toHaveLength(2);
    expect(sumScoringEvents(events)).toBe(8);
  });

  it("scores unordered pairing", () => {
    const events = scoreCorrectPairing(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      referenceId: "final-pairing",
      predictedTeamIds: ["team-b", "team-a"],
      actualTeamIds: ["team-a", "team-b"]
    });

    expect(events[0]?.type).toBe("CORRECT_PAIRING");
    expect(events[0]?.points).toBe(30);
  });

  it("scores 90-minute draw plus extra-time qualifier", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "final",
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

    expect(events.map((event) => event.type)).toContain("EXTRA_TIME_METHOD");
    expect(events.find((event) => event.type === "EXTRA_TIME_METHOD")?.points).toBe(20);
  });

  it("scores 90-minute draw plus penalty qualifier", () => {
    const events = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "final",
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

    expect(events.map((event) => event.type)).toContain("PENALTY_METHOD");
    expect(events.find((event) => event.type === "PENALTY_METHOD")?.points).toBe(30);
  });

  it("does not score method when the method or qualified team is wrong", () => {
    const wrongMethod = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "final",
      prediction: {
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-a",
        advancementMethod: "PENALTIES"
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
    const wrongQualifiedTeam = scoreRegulationMatch(worldCupDefaultScoringConfig, context, {
      stage: "FINAL",
      matchId: "final",
      prediction: {
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-b",
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

    expect(wrongMethod.some((event) => event.type === "EXTRA_TIME_METHOD")).toBe(false);
    expect(wrongQualifiedTeam.some((event) => event.type === "EXTRA_TIME_METHOD")).toBe(false);
  });

  it("scores top scorer only and handles joint scorers", () => {
    const events = scoreAntepost(worldCupDefaultScoringConfig, context, {
      referenceId: "antepost",
      predictedTopScorerPlayerId: "player-a",
      actualTopScorerPlayerIds: ["player-a", "player-b"],
      predictedTopScorerGoals: 7,
      actualTopScorerGoals: 8
    });

    expect(events.map((event) => event.type)).toEqual(["TOP_SCORER"]);
    expect(sumScoringEvents(events)).toBe(25);
  });

  it("scores top scorer plus exact goals as replacement total", () => {
    const events = scoreAntepost(worldCupDefaultScoringConfig, context, {
      referenceId: "antepost",
      predictedTopScorerPlayerId: "player-a",
      actualTopScorerPlayerIds: ["player-a", "player-b"],
      predictedTopScorerGoals: 7,
      actualTopScorerGoals: 7
    });

    expect(events.map((event) => event.type)).toEqual(["TOP_SCORER_EXACT_GOALS"]);
    expect(sumScoringEvents(events)).toBe(50);
  });

  it("uses customized rule values", () => {
    const config = cloneConfig(worldCupDefaultScoringConfig);
    config.stages.GROUP_STAGE.correctOutcome = 7;
    const events = scoreRegulationMatch(config, context, {
      stage: "GROUP_STAGE",
      matchId: "match-1",
      prediction: { homeGoals: 2, awayGoals: 0 },
      result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 1, awayGoals: 0 }
    });

    expect(sumScoringEvents(events)).toBe(7);
  });

  it("supports immutable rule versions", () => {
    const draft = createDraftScoringRuleVersion({
      leagueId: "league-test",
      config: worldCupDefaultScoringConfig,
      createdAtUtc: "2030-06-01T10:00:00.000Z"
    });
    const updated = updateStageRuleValue(draft, "GROUP_STAGE", "correctOutcome", 8);
    const locked = lockScoringRuleVersion(updated, "2030-06-08T18:30:00.000Z");

    expect(locked.status).toBe("locked");
    expect(locked.checksum).toMatch(/^fnv1a-/);
    expect(() => updateStageRuleValue(locked, "GROUP_STAGE", "correctOutcome", 9)).toThrow(
      "Locked scoring rules are immutable."
    );
  });

  it("recalculates affected match events after a result correction", () => {
    const initialEvents = recalculateMatchEvents(worldCupDefaultScoringConfig, context, {
      stage: "GROUP_STAGE",
      matchId: "match-1",
      prediction: { homeGoals: 1, awayGoals: 0 },
      result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 1, awayGoals: 0 }
    });
    const correctedEvents = recalculateMatchEvents(
      worldCupDefaultScoringConfig,
      { ...context, sourceResultVersion: "result-v2" },
      {
        stage: "GROUP_STAGE",
        matchId: "match-1",
        prediction: { homeGoals: 1, awayGoals: 0 },
        result: { homeTeamId: "team-a", awayTeamId: "team-b", homeGoals: 0, awayGoals: 1 }
      }
    );

    expect(sumScoringEvents(initialEvents)).toBe(10);
    expect(sumScoringEvents(correctedEvents)).toBe(0);
  });
});

describe("leaderboard", () => {
  it("creates competition ranks, equal ranks, and position deltas", () => {
    const participants: LeaderboardParticipant[] = [
      { userId: "user-a", displayName: "Anna", avatarInitials: "AN" },
      { userId: "user-b", displayName: "Bruno", avatarInitials: "BR" },
      { userId: "user-c", displayName: "Carla", avatarInitials: "CA" }
    ];
    const previous = createLeaderboardSnapshot({
      leagueId: "league-test",
      createdAtUtc: "2030-06-08T18:30:00.000Z",
      sourceResultVersion: "before",
      participants,
      allEvents: [event("user-a", 10, "before-a"), event("user-b", 5, "before-b")],
      latestEvents: []
    });
    const snapshot = createLeaderboardSnapshot({
      leagueId: "league-test",
      createdAtUtc: "2030-06-08T21:15:00.000Z",
      sourceResultVersion: "after",
      participants,
      previousSnapshot: previous,
      allEvents: [
        event("user-a", 10, "total-a"),
        event("user-b", 15, "total-b"),
        event("user-c", 15, "total-c")
      ],
      latestEvents: [event("user-b", 10, "latest-b"), event("user-c", 15, "latest-c")]
    });

    expect(snapshot.entries.map((entry) => [entry.userId, entry.rank, entry.tied])).toEqual([
      ["user-b", 1, true],
      ["user-c", 1, true],
      ["user-a", 3, false]
    ]);
    expect(snapshot.entries.find((entry) => entry.userId === "user-a")?.positionDelta).toBe(-2);
    expect(snapshot.entries.find((entry) => entry.userId === "user-b")?.positionDelta).toBe(1);
  });
});

function event(userId: string, points: number, id: string): ScoringEvent {
  return {
    id,
    leagueId: context.leagueId,
    participantUserId: userId,
    competitionEditionId: context.competitionEditionId,
    referenceId: id,
    scoringRuleVersionId: context.scoringRuleVersionId,
    type: "MATCH_OUTCOME",
    points,
    reason: "test",
    calculationVersion: "test",
    createdAtUtc: context.createdAtUtc,
    sourceResultVersion: context.sourceResultVersion
  };
}

function cloneConfig(config: ScoringRuleConfig): ScoringRuleConfig {
  return JSON.parse(JSON.stringify(config)) as ScoringRuleConfig;
}
