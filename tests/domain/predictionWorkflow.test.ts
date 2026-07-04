import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import {
  generatePredictedBracket,
  selectBestThirdPlacedTeams,
  type PredictedBracket
} from "@/domain/predictions/bracket";
import { calculateDependencyInvalidation } from "@/domain/predictions/invalidation";
import { calculatePredictedGroupStandings } from "@/domain/predictions/standings";
import type { MatchPrediction } from "@/domain/predictions/types";
import {
  validateAntepostPrediction,
  validateKnockoutPrediction,
  validatePredictionSet
} from "@/domain/predictions/validation";
import { createPredictionSet } from "@/services/mock/mockLeagueFactory";

describe("Milestone 2 prediction workflow", () => {
  it("marks unresolved predicted group ties and resolves them with an override", () => {
    const seed = createWorldCup2030MockSeed();
    const group = seed.groups[0];
    const matches = seed.matches.filter((match) => match.groupId === group?.id);
    const teamIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
    const teams = seed.teams.filter((team) => teamIds.has(team.id));
    const predictions = matches.map<MatchPrediction>((match) => ({
      id: `prediction-${match.id}`,
      predictionSetId: "prediction-set",
      matchId: match.id,
      stageCode: "GROUP_STAGE",
      homeGoals: 0,
      awayGoals: 0,
      syncStatus: "SYNCED",
      updatedAtUtc: "2030-06-01T10:00:00.000Z"
    }));
    const unresolved = calculatePredictedGroupStandings({ teams, matches, predictions });
    const overrideOrder = [...unresolved.map((row) => row.teamId)].reverse();
    const resolved = calculatePredictedGroupStandings({
      teams,
      matches,
      predictions,
      scopeRef: "group:A",
      tiebreakOverrides: [
        {
          id: "override-a",
          predictionSetId: "prediction-set",
          scopeRef: "group:A",
          orderedTeamIds: overrideOrder,
          reason: "test",
          syncStatus: "SYNCED",
          updatedAtUtc: "2030-06-01T10:00:00.000Z"
        }
      ]
    });

    expect(unresolved.some((row) => row.unresolvedTie)).toBe(true);
    expect(resolved[0]?.teamId).toBe(overrideOrder[0]);
    expect(resolved.some((row) => row.unresolvedTie)).toBe(false);
  });

  it("selects the configured number of best third-placed teams", () => {
    const seed = createWorldCup2030MockSeed();
    const predictionSet = createPredictionSet("league-test", "user-test", seed);
    const bracket = generatePredictedBracket({ competition: seed, predictionSet });
    const bestThirds = selectBestThirdPlacedTeams(
      bracket.groupTables,
      seed.edition.format.bestThirdPlacedTeams
    );

    expect(bestThirds).toHaveLength(8);
    expect(bestThirds.map((item) => item.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("generates every configured knockout round from predicted group outcomes", () => {
    const seed = createWorldCup2030MockSeed();
    const predictionSet = createPredictionSet("league-test", "user-test", seed);
    const bracket = generatePredictedBracket({ competition: seed, predictionSet });

    expect(bracket.matches).toHaveLength(32);
    expect(bracket.matches.filter((match) => match.roundCode === "ROUND_OF_32")).toHaveLength(16);
    expect(bracket.matches.some((match) => match.roundCode === "THIRD_PLACE")).toBe(true);
    expect(bracket.matches.some((match) => match.roundCode === "FINAL")).toBe(true);
  });

  it("validates knockout prediction rules for regulation, extra time, and penalties", () => {
    const match = {
      id: "predicted-final-1",
      roundCode: "FINAL" as const,
      roundName: "Finale",
      order: 1,
      homeSlot: { id: "home", label: "Home", teamId: "team-a", sourceRef: "semi-1" },
      awaySlot: { id: "away", label: "Away", teamId: "team-b", sourceRef: "semi-2" },
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      dependsOnMatchIds: ["semi-1", "semi-2"]
    };

    expect(
      validateKnockoutPrediction(match, {
        id: "prediction-final",
        predictionSetId: "set",
        matchId: match.id,
        stageCode: "FINAL",
        homeGoals: 2,
        awayGoals: 1,
        qualifiedTeamId: "team-a",
        advancementMethod: "REGULATION",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      })
    ).toEqual([]);
    expect(
      validateKnockoutPrediction(match, {
        id: "prediction-final",
        predictionSetId: "set",
        matchId: match.id,
        stageCode: "FINAL",
        homeGoals: 2,
        awayGoals: 1,
        qualifiedTeamId: "team-a",
        advancementMethod: "PENALTIES",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      })[0]?.kind
    ).toBe("INVALID_KNOCKOUT");
    expect(
      validateKnockoutPrediction(match, {
        id: "prediction-final-draw",
        predictionSetId: "set",
        matchId: match.id,
        stageCode: "FINAL",
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-b",
        advancementMethod: "EXTRA_TIME",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      })
    ).toEqual([]);
  });

  it("returns dependency warnings only for bracket matches whose participants changed", () => {
    const before = bracketWithFinal("team-a", "team-b");
    const after = bracketWithFinal("team-c", "team-b");
    const warnings = calculateDependencyInvalidation({
      before,
      after,
      predictions: [
        {
          id: "prediction-final",
          predictionSetId: "set",
          matchId: "predicted-final-1",
          stageCode: "FINAL",
          homeGoals: 1,
          awayGoals: 0,
          qualifiedTeamId: "team-a",
          advancementMethod: "REGULATION",
          syncStatus: "SYNCED",
          updatedAtUtc: "2030-06-01T10:00:00.000Z"
        }
      ],
      createdAtUtc: "2030-06-01T10:05:00.000Z"
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.impactedMatchIds).toEqual(["predicted-final-1"]);
  });

  it("validates required antepost predictions", () => {
    const seed = createWorldCup2030MockSeed();
    const winnerDefinition = seed.antepostDefinitions.find(
      (definition) => definition.code === "TOURNAMENT_WINNER"
    );

    expect(winnerDefinition).toBeDefined();
    expect(validateAntepostPrediction(winnerDefinition!, undefined)[0]?.kind).toBe(
      "MISSING_ANTEPOST"
    );
    expect(
      validateAntepostPrediction(winnerDefinition!, {
        id: "antepost-winner",
        predictionSetId: "set",
        definitionId: winnerDefinition!.id,
        selectedTeamId: "team-01",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      })
    ).toEqual([]);
  });

  it("reports full completion status across groups, bracket, antepost, and sync", () => {
    const seed = createWorldCup2030MockSeed();
    const predictionSet = createPredictionSet("league-test", "user-test", seed);
    const validation = validatePredictionSet({ competition: seed, predictionSet });

    expect(validation.completion.totalRequired).toBe(107);
    expect(validation.completion.completedItems).toBe(72);
    expect(validation.completion.incompleteItems).toBeGreaterThan(0);
    expect(validation.issues.some((issue) => issue.kind === "MISSING_MATCH")).toBe(true);
    expect(validation.issues.some((issue) => issue.kind === "MISSING_ANTEPOST")).toBe(true);
  });
});

function bracketWithFinal(homeTeamId: string, awayTeamId: string): PredictedBracket {
  return {
    groupTables: [],
    bestThirdPlaceQualifiers: [],
    matches: [
      {
        id: "predicted-final-1",
        roundCode: "FINAL",
        roundName: "Finale",
        order: 1,
        homeSlot: { id: "slot-home", label: "Home", teamId: homeTeamId, sourceRef: "semi-1" },
        awaySlot: { id: "slot-away", label: "Away", teamId: awayTeamId, sourceRef: "semi-2" },
        homeTeamId,
        awayTeamId,
        dependsOnMatchIds: ["semi-1", "semi-2"]
      }
    ]
  };
}
