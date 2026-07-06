import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { CompetitionSeed, KnockoutRoundCode } from "@/domain/competitions/types";
import {
  createChampionsLeague2026_27MockSeed,
  createEuro2028MockSeed,
  createWorldCup2026MockSeed
} from "@/domain/competitions/versionedTemplates";
import type { PredictedBracketMatch } from "@/domain/predictions/bracket";
import {
  applyDerivedAntepostPredictions,
  areNormalizedPredictionsEquivalent,
  buildPredictionEntryWorkflow,
  deriveBracketAntepostPredictions,
  getInitialPhaseLabel,
  getKnockoutTieMode,
  getManualAntepostDefinitions,
  getScoreChips,
  isManualAntepostComplete,
  normalizeInitialPhasePrediction,
  normalizeKnockoutPredictionInput
} from "@/domain/predictions/entryWorkflow";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionSet
} from "@/domain/predictions/types";
import { createPredictionSet } from "@/services/mock/mockLeagueFactory";

const updatedAtUtc = "2028-06-01T10:00:00.000Z";

describe("Milestone 8 prediction entry workflow", () => {
  it("normalizes quick initial-phase score chips without knockout-only fields", () => {
    const homeChips = getScoreChips({
      outcome: "HOME",
      context: "INITIAL_GROUP_OR_LEAGUE"
    });
    const drawChips = getScoreChips({
      outcome: "DRAW",
      context: "INITIAL_GROUP_OR_LEAGUE"
    });
    const awayChips = getScoreChips({
      outcome: "AWAY",
      context: "INITIAL_GROUP_OR_LEAGUE"
    });
    const manualResult = normalizeInitialPhasePrediction({
      homeGoals: 4,
      awayGoals: 3
    });
    const invalidResult = normalizeInitialPhasePrediction({
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "team-a",
      advancementMethod: "PENALTIES"
    });

    expect(homeChips.map((chip) => chip.label)).toContain("2-1");
    expect(drawChips.map((chip) => chip.label)).toContain("1-1");
    expect(awayChips.map((chip) => chip.label)).toContain("0-2");
    expect(manualResult.issues).toEqual([]);
    expect(invalidResult.issues.map((issue) => issue.kind)).toContain("INVALID_KNOCKOUT");
  });

  it("normalizes quick and expert knockout predictions to the same stored model", () => {
    const match = createBracketMatch("FINAL", "team-a", "team-b");
    const quick = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 2,
      awayGoals: 1,
      qualifiedTeamId: "team-a",
      advancementMethod: "REGULATION",
      tieMode: "single_leg"
    });
    const expert = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 2,
      awayGoals: 1,
      qualifiedTeamId: "team-a",
      advancementMethod: "REGULATION",
      tieMode: "single_leg"
    });

    expect(quick.issues).toEqual([]);
    expect(expert.issues).toEqual([]);
    expect(areNormalizedPredictionsEquivalent(quick.input, expert.input)).toBe(true);
  });

  it("requires qualified team and extra-time or penalties after knockout draws", () => {
    const match = createBracketMatch("ROUND_OF_16", "team-a", "team-b");
    const extraTime = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 1,
      awayGoals: 1,
      qualifiedTeamId: "team-a",
      advancementMethod: "EXTRA_TIME",
      tieMode: "single_leg"
    });
    const penalties = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 0,
      awayGoals: 0,
      qualifiedTeamId: "team-b",
      advancementMethod: "PENALTIES",
      tieMode: "single_leg"
    });
    const missingQualified = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 1,
      awayGoals: 1,
      advancementMethod: "PENALTIES",
      tieMode: "single_leg"
    });
    const wrongMethod = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 3,
      awayGoals: 1,
      qualifiedTeamId: "team-a",
      advancementMethod: "PENALTIES",
      tieMode: "single_leg"
    });

    expect(extraTime.issues).toEqual([]);
    expect(penalties.issues).toEqual([]);
    expect(missingQualified.issues.map((issue) => issue.id)).toContain("qualified:predicted-match");
    expect(wrongMethod.issues.map((issue) => issue.id)).toContain("method-nondraw:predicted-match");
  });

  it("marks two-legged knockout as a documented aggregate placeholder", () => {
    const match = createBracketMatch("PLAYOFF", "team-a", "team-b");
    const result = normalizeKnockoutPredictionInput({
      match,
      homeGoals: 1,
      awayGoals: 0,
      qualifiedTeamId: "team-a",
      advancementMethod: "REGULATION",
      tieMode: "two_leg"
    });

    expect(result.issues).toEqual([]);
    expect(result.aggregatePlaceholder).toBe(true);
  });

  it("derives tournament winner and finalists from the predicted bracket", () => {
    const finalMatch = createBracketMatch("FINAL", "team-a", "team-b");
    const predictionSet = createPredictionSetWithPredictions([
      createKnockoutPrediction(finalMatch, {
        homeGoals: 1,
        awayGoals: 1,
        qualifiedTeamId: "team-b",
        advancementMethod: "PENALTIES"
      })
    ]);
    const derived = deriveBracketAntepostPredictions({
      competition: createWorldCup2026MockSeed(),
      predictionSet,
      bracket: {
        groupTables: [],
        leagueTable: [],
        bestThirdPlaceQualifiers: [],
        bestThirdPlaceTieGroups: [],
        mappingMetadata: {
          strategy: "sequential_generated",
          status: "placeholder",
          notes: []
        },
        matches: [finalMatch]
      }
    });

    expect(derived.winnerTeamId).toBe("team-b");
    expect(derived.finalistTeamIds).toEqual(["team-a", "team-b"]);
  });

  it("accepts manual top scorer free text and numeric goal antepost values", () => {
    const seed = createWorldCup2026MockSeed();
    const topScorerDefinition = seed.antepostDefinitions.find(
      (definition) => definition.code === "TOP_SCORER"
    );
    const goalDefinition = seed.antepostDefinitions.find(
      (definition) => definition.code === "TOP_SCORER_GOALS"
    );

    expect(topScorerDefinition).toBeDefined();
    expect(goalDefinition).toBeDefined();
    expect(
      isManualAntepostComplete(topScorerDefinition!, {
        id: "top-scorer",
        predictionSetId: "set",
        definitionId: topScorerDefinition!.id,
        textValue: "Mock Bomber",
        syncStatus: "SYNCED",
        updatedAtUtc
      })
    ).toBe(true);
    expect(
      isManualAntepostComplete(goalDefinition!, {
        id: "top-scorer-goals",
        predictionSetId: "set",
        definitionId: goalDefinition!.id,
        numericValue: 7,
        syncStatus: "SYNCED",
        updatedAtUtc
      })
    ).toBe(true);
    expect(
      isManualAntepostComplete(goalDefinition!, {
        id: "top-scorer-goals-zero",
        predictionSetId: "set",
        definitionId: goalDefinition!.id,
        numericValue: 0,
        syncStatus: "SYNCED",
        updatedAtUtc
      })
    ).toBe(false);
  });

  it("moves from mode choice to next missing prediction and can reach final review", () => {
    const seed = createWorldCup2026MockSeed();
    const emptyPredictionSet = createPredictionSet("league-m8", "user-m8", seed);
    const modeWorkflow = buildPredictionEntryWorkflow({
      competition: seed,
      predictionSet: emptyPredictionSet
    });
    let completePredictionSet = withRankedInitialPredictions(seed, emptyPredictionSet);

    completePredictionSet = resolveTiebreakTargets(seed, completePredictionSet);
    completePredictionSet = completeKnockoutPredictions(seed, completePredictionSet);

    const derived = applyDerivedAntepostPredictions({
      competition: seed,
      predictionSet: completePredictionSet,
      updatedAtUtc
    });
    completePredictionSet = {
      ...completePredictionSet,
      antepostPredictions: [
        ...derived.predictions,
        ...createManualAntepostPredictions(seed, completePredictionSet.id)
      ]
    };

    const reviewWorkflow = buildPredictionEntryWorkflow({
      competition: seed,
      predictionSet: completePredictionSet,
      mode: "QUICK"
    });

    expect(modeWorkflow.phase).toBe("MODE");
    expect(reviewWorkflow.phase).toBe("REVIEW");
    expect(reviewWorkflow.canConfirm).toBe(true);
  });

  it("routes unresolved group standings to a tiebreak override target before knockout", () => {
    const seed = createWorldCup2026MockSeed();
    const predictionSet = withDrawnInitialPredictions(
      seed,
      createPredictionSet("league-tiebreak", "user-a", seed)
    );
    const workflow = buildPredictionEntryWorkflow({
      competition: seed,
      predictionSet,
      mode: "QUICK"
    });

    expect(workflow.phase).toBe("TIEBREAK");
    expect(workflow.tiebreakTargets.length).toBeGreaterThan(0);
    expect(workflow.target.kind).toBe("TIEBREAK");
    expect(workflow.target.scopeRef).toMatch(/^group:/);
    expect(workflow.target.tieGroupId).toContain("positions:");
    expect(workflow.target.tiedTeamIds?.length).toBeGreaterThan(1);
  });

  it("keeps World Cup and EURO stage flows data-driven", () => {
    const worldCup = createWorldCup2026MockSeed();
    const euro = createEuro2028MockSeed();
    const worldCupWorkflow = buildPredictionEntryWorkflow({
      competition: worldCup,
      predictionSet: createPredictionSet("league-wc", "user-a", worldCup),
      mode: "QUICK"
    });
    const euroWorkflow = buildPredictionEntryWorkflow({
      competition: euro,
      predictionSet: createPredictionSet("league-euro", "user-a", euro),
      mode: "EXPERT"
    });

    expect(getInitialPhaseLabel(worldCup)).toBe("Fase a gironi");
    expect(
      worldCupWorkflow.knockoutTargets.some((target) => target.id.includes("round_of_32"))
    ).toBe(true);
    expect(
      worldCupWorkflow.knockoutTargets.some((target) => target.id.includes("third_place"))
    ).toBe(true);
    expect(getInitialPhaseLabel(euro)).toBe("Fase a gironi");
    expect(euroWorkflow.knockoutTargets.some((target) => target.id.includes("round_of_32"))).toBe(
      false
    );
    expect(euroWorkflow.knockoutTargets.some((target) => target.id.includes("third_place"))).toBe(
      false
    );
  });

  it("supports Champions League league phase and two-legged knockout targets", () => {
    const seed = createChampionsLeague2026_27MockSeed();
    const predictionSet = createPredictionSet("league-ucl", "user-a", seed);
    const workflow = buildPredictionEntryWorkflow({
      competition: seed,
      predictionSet,
      mode: "QUICK"
    });

    expect(getInitialPhaseLabel(seed)).toBe("League phase");
    expect(predictionSet.matchPredictions).toHaveLength(seed.matches.length);
    expect(workflow.initialTargets).toHaveLength(seed.matches.length);
    expect(getKnockoutTieMode(seed, "PLAYOFF")).toBe("two_leg");
    expect(workflow.knockoutTargets.some((target) => target.tieMode === "two_leg")).toBe(true);
  });

  it("keeps derived antepost out of manual entry requirements", () => {
    const seed = createWorldCup2026MockSeed();
    const manualCodes = getManualAntepostDefinitions(seed).map((definition) => definition.code);

    expect(manualCodes).toEqual(["TOP_SCORER", "TOP_SCORER_GOALS"]);
  });

  it("does not hardcode World Cup-specific flow in the prediction entry UI", () => {
    const source = readFileSync("src/features/predictions/PredictionWorkflowScreen.tsx", "utf8");

    expect(source).not.toMatch(/world_cup|World Cup|ROUND_OF_32|THIRD_PLACE/);
  });

  it("recomputes the next missing target after successful prediction saves", () => {
    const source = readFileSync("src/features/predictions/PredictionWorkflowScreen.tsx", "utf8");

    expect(source).toContain("pendingJumpToNextMissing");
    expect(source).toContain("jumpToWorkflowTarget(workflow)");
    expect(source).toContain("setPendingJumpToNextMissing(true)");
  });
});

function createBracketMatch(
  roundCode: KnockoutRoundCode,
  homeTeamId: string,
  awayTeamId: string
): PredictedBracketMatch {
  return {
    id: "predicted-match",
    roundCode,
    roundName: "Round",
    order: 1,
    homeSlot: { id: "home", label: "Home", teamId: homeTeamId, sourceRef: "home-source" },
    awaySlot: { id: "away", label: "Away", teamId: awayTeamId, sourceRef: "away-source" },
    homeTeamId,
    awayTeamId,
    dependsOnMatchIds: []
  };
}

function createPredictionSetWithPredictions(matchPredictions: MatchPrediction[]): PredictionSet {
  return {
    id: "prediction-set",
    leagueId: "league",
    userId: "user",
    status: "draft",
    totalRequired: matchPredictions.length,
    completedItems: matchPredictions.length,
    unsyncedItems: 0,
    matchPredictions,
    tiebreakOverrides: [],
    antepostPredictions: [],
    dependencyWarnings: [],
    lastServerSyncedAtUtc: updatedAtUtc
  };
}

function createKnockoutPrediction(
  match: PredictedBracketMatch,
  params: {
    homeGoals: number;
    awayGoals: number;
    qualifiedTeamId: string;
    advancementMethod: "REGULATION" | "EXTRA_TIME" | "PENALTIES";
  }
): MatchPrediction {
  return {
    id: `prediction-${match.id}`,
    predictionSetId: "prediction-set",
    matchId: match.id,
    stageCode: match.roundCode,
    homeGoals: params.homeGoals,
    awayGoals: params.awayGoals,
    qualifiedTeamId: params.qualifiedTeamId,
    advancementMethod: params.advancementMethod,
    syncStatus: "SYNCED",
    updatedAtUtc
  };
}

function withRankedInitialPredictions(
  competition: CompetitionSeed,
  predictionSet: PredictionSet
): PredictionSet {
  const teamRank = new Map(competition.teams.map((team, index) => [team.id, index]));
  const matchPredictions = competition.matches.map<MatchPrediction>((match) => {
    const homeRank = teamRank.get(match.homeTeamId) ?? 0;
    const awayRank = teamRank.get(match.awayTeamId) ?? 0;
    const homeWins = homeRank < awayRank;

    return {
      id: `${predictionSet.id}:${match.id}`,
      predictionSetId: predictionSet.id,
      matchId: match.id,
      stageCode: "GROUP_STAGE",
      homeGoals: homeWins ? 2 : 0,
      awayGoals: homeWins ? 0 : 2,
      syncStatus: "SYNCED",
      updatedAtUtc
    };
  });

  return {
    ...predictionSet,
    matchPredictions
  };
}

function withDrawnInitialPredictions(
  competition: CompetitionSeed,
  predictionSet: PredictionSet
): PredictionSet {
  return {
    ...predictionSet,
    matchPredictions: competition.matches.map((match) => ({
      id: `${predictionSet.id}:${match.id}`,
      predictionSetId: predictionSet.id,
      matchId: match.id,
      stageCode: "GROUP_STAGE",
      homeGoals: 0,
      awayGoals: 0,
      syncStatus: "SYNCED",
      updatedAtUtc
    }))
  };
}

function completeKnockoutPredictions(
  competition: CompetitionSeed,
  predictionSet: PredictionSet
): PredictionSet {
  let nextPredictionSet = predictionSet;

  for (let index = 0; index < 80; index += 1) {
    const workflow = buildPredictionEntryWorkflow({
      competition,
      predictionSet: nextPredictionSet,
      mode: "QUICK"
    });
    const target = workflow.knockoutTargets.find(
      (item) =>
        item.bracketMatch?.homeTeamId &&
        item.bracketMatch.awayTeamId &&
        !nextPredictionSet.matchPredictions.some(
          (prediction) => prediction.matchId === item.bracketMatch?.id
        )
    );

    if (!target?.bracketMatch?.homeTeamId) {
      return nextPredictionSet;
    }

    const prediction = createKnockoutPrediction(target.bracketMatch, {
      homeGoals: 2,
      awayGoals: 1,
      qualifiedTeamId: target.bracketMatch.homeTeamId,
      advancementMethod: "REGULATION"
    });

    nextPredictionSet = {
      ...nextPredictionSet,
      matchPredictions: [...nextPredictionSet.matchPredictions, prediction]
    };
  }

  throw new Error("Unable to complete knockout predictions for Milestone 8 test fixture.");
}

function resolveTiebreakTargets(
  competition: CompetitionSeed,
  predictionSet: PredictionSet
): PredictionSet {
  let nextPredictionSet = predictionSet;

  for (let index = 0; index < 30; index += 1) {
    const workflow = buildPredictionEntryWorkflow({
      competition,
      predictionSet: nextPredictionSet,
      mode: "QUICK"
    });

    if (workflow.phase !== "TIEBREAK" || workflow.target.kind !== "TIEBREAK") {
      return nextPredictionSet;
    }

    const target = workflow.target;
    const tieGroupId = target.tieGroupId ?? target.scopeRef;

    if (!target.scopeRef || !tieGroupId || !target.orderedTeamIds) {
      return nextPredictionSet;
    }

    nextPredictionSet = {
      ...nextPredictionSet,
      tiebreakOverrides: [
        ...(nextPredictionSet.tiebreakOverrides ?? []).filter(
          (override) => (override.tieGroupId ?? override.scopeRef) !== tieGroupId
        ),
        {
          id: `${nextPredictionSet.id}:${tieGroupId}`,
          predictionSetId: nextPredictionSet.id,
          ...(target.scope ? { scope: target.scope } : {}),
          scopeRef: target.scopeRef,
          tieGroupId,
          ...(target.tiedTeamIds ? { tiedTeamIds: target.tiedTeamIds } : {}),
          ...(target.affectedPositions ? { affectedPositions: target.affectedPositions } : {}),
          orderedTeamIds: target.orderedTeamIds,
          reason: "Resolve test tie-break",
          syncStatus: "SYNCED",
          updatedAtUtc
        }
      ]
    };
  }

  throw new Error("Unable to resolve tiebreak targets for Milestone 8 test fixture.");
}

function createManualAntepostPredictions(
  competition: CompetitionSeed,
  predictionSetId: string
): AntepostPrediction[] {
  return competition.antepostDefinitions
    .filter(
      (definition) => definition.code === "TOP_SCORER" || definition.code === "TOP_SCORER_GOALS"
    )
    .map((definition): AntepostPrediction => ({
      id: `${predictionSetId}:${definition.id}`,
      predictionSetId,
      definitionId: definition.id,
      ...(definition.code === "TOP_SCORER" ? { textValue: "Mock Bomber" } : { numericValue: 7 }),
      syncStatus: "SYNCED",
      updatedAtUtc
    }));
}
