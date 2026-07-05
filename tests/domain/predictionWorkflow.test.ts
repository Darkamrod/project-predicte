import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import {
  bestThirdsScopeRef,
  generatePredictedBracket,
  selectBestThirdPlacedTeams,
  type PredictedBracket
} from "@/domain/predictions/bracket";
import { calculateDependencyInvalidation } from "@/domain/predictions/invalidation";
import {
  buildStandingTieGroups,
  calculatePredictedGroupStandings
} from "@/domain/predictions/standings";
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

  it("keeps multiple tiebreak override targets separate within the same group scope", () => {
    const seed = createWorldCup2030MockSeed();
    const group = seed.groups[0];

    if (!group) {
      throw new Error("Expected a seeded group.");
    }

    const matches = seed.matches.filter((match) => match.groupId === group.id);
    const teamIds = [...new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]))];
    const teams = seed.teams.filter((team) => teamIds.includes(team.id));
    const topPair = new Set(teamIds.slice(0, 2));
    const predictions = matches.map<MatchPrediction>((match) => {
      const homeIsTop = topPair.has(match.homeTeamId);
      const awayIsTop = topPair.has(match.awayTeamId);
      const crossGroupMatch = homeIsTop !== awayIsTop;

      return {
        id: `prediction-${match.id}`,
        predictionSetId: "prediction-set",
        matchId: match.id,
        stageCode: "GROUP_STAGE",
        homeGoals: crossGroupMatch && homeIsTop ? 1 : 0,
        awayGoals: crossGroupMatch && awayIsTop ? 1 : 0,
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      };
    });
    const scopeRef = "group:A";
    const unresolved = calculatePredictedGroupStandings({
      teams,
      matches,
      predictions,
      scopeRef
    });
    const tieGroups = buildStandingTieGroups(unresolved, scopeRef);

    expect(tieGroups).toHaveLength(2);
    expect(new Set(tieGroups.map((group) => group.scopeRef))).toEqual(new Set([scopeRef]));
    expect(new Set(tieGroups.map((group) => group.tieGroupId)).size).toBe(2);

    const resolved = calculatePredictedGroupStandings({
      teams,
      matches,
      predictions,
      scopeRef,
      tiebreakOverrides: tieGroups.map((group) => ({
        id: `override-${group.tieGroupId}`,
        predictionSetId: "prediction-set",
        scope: "GROUP",
        scopeRef,
        tieGroupId: group.tieGroupId,
        tiedTeamIds: group.tiedTeamIds,
        affectedPositions: group.affectedPositions,
        orderedTeamIds: [...group.tiedTeamIds].reverse(),
        reason: "Resolve specific tie group",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      }))
    });

    expect(resolved.some((row) => row.unresolvedTie)).toBe(false);
    expect(resolved.slice(0, 2).map((row) => row.teamId)).toEqual(
      [...tieGroups[0]!.tiedTeamIds].reverse()
    );
    expect(resolved.slice(2, 4).map((row) => row.teamId)).toEqual(
      [...tieGroups[1]!.tiedTeamIds].reverse()
    );
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

  it("requires a dedicated best-thirds tiebreak override before filling impacted slots", () => {
    const seed = createWorldCup2030MockSeed();
    const predictionSet = createPredictionSet("league-best-thirds", "user-test", seed);
    const drawnPredictionSet = {
      ...predictionSet,
      matchPredictions: seed.matches.map((match) => ({
        id: `${predictionSet.id}:${match.id}`,
        predictionSetId: predictionSet.id,
        matchId: match.id,
        stageCode: "GROUP_STAGE" as const,
        homeGoals: 0,
        awayGoals: 0,
        syncStatus: "SYNCED" as const,
        updatedAtUtc: "2030-06-01T10:00:00.000Z"
      }))
    };
    const unresolvedBracket = generatePredictedBracket({
      competition: seed,
      predictionSet: drawnPredictionSet
    });
    const bestThirdTieGroup = unresolvedBracket.bestThirdPlaceTieGroups[0];

    expect(bestThirdTieGroup).toBeDefined();
    expect(bestThirdTieGroup?.scopeRef).toBe(bestThirdsScopeRef());
    expect(unresolvedBracket.bestThirdPlaceQualifiers.some((item) => item.unresolvedTie)).toBe(
      true
    );
    expect(
      unresolvedBracket.matches.some(
        (match) => match.roundCode === "ROUND_OF_32" && (!match.homeTeamId || !match.awayTeamId)
      )
    ).toBe(true);

    const resolvedBracket = generatePredictedBracket({
      competition: seed,
      predictionSet: {
        ...drawnPredictionSet,
        tiebreakOverrides: [
          {
            id: "best-thirds-override",
            predictionSetId: predictionSet.id,
            scope: "BEST_THIRDS",
            scopeRef: bestThirdsScopeRef(),
            tieGroupId: bestThirdTieGroup!.tieGroupId,
            tiedTeamIds: bestThirdTieGroup!.tiedTeamIds,
            affectedPositions: bestThirdTieGroup!.affectedPositions,
            orderedTeamIds: bestThirdTieGroup!.tiedTeamIds,
            reason: "Resolve best thirds",
            syncStatus: "SYNCED",
            updatedAtUtc: "2030-06-01T10:00:00.000Z"
          }
        ]
      }
    });

    expect(resolvedBracket.bestThirdPlaceTieGroups).toHaveLength(0);
    expect(resolvedBracket.bestThirdPlaceQualifiers.some((item) => item.unresolvedTie)).toBe(false);
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
    leagueTable: [],
    bestThirdPlaceQualifiers: [],
    bestThirdPlaceTieGroups: [],
    mappingMetadata: {
      strategy: "sequential_generated",
      status: "placeholder",
      notes: []
    },
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
