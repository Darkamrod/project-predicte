import { describe, expect, it } from "vitest";

import {
  adaptAuthenticatedPredictionTargets,
  type AuthenticatedPredictionTargetAdapterInput
} from "@/domain/predictions/authenticatedTargetAdapter";

describe("authenticated prediction target adapter", () => {
  it("maps and orders real initial-stage targets for the shared Quick/Expert model", () => {
    const result = adaptAuthenticatedPredictionTargets(
      createInput({ matchOrder: [createMatch("match-2", 2), createMatch("match-1", 1)] })
    );

    expect(result.targets.map((target) => target.id)).toEqual(["match-1", "match-2"]);
    expect(result.targets[0]).toMatchObject({
      matchFormat: "initial_90_minutes",
      groupCode: "A",
      canEnterScore90: true,
      canEnterQualifiedTeam: false,
      canEnterQualificationMethod: false
    });
    expect(result).not.toHaveProperty("quickTargets");
    expect(result).not.toHaveProperty("expertTargets");
  });

  it("maps persisted 90-minute values into the normalized target", () => {
    const input = createInput();
    input.persistedMatchPredictions = [
      {
        predictionRef: "match-1",
        homeGoals90: 2,
        awayGoals90: 1
      }
    ];

    const result = adaptAuthenticatedPredictionTargets(input);

    expect(result.targets[0]?.currentValue).toEqual({ homeGoals90: 2, awayGoals90: 1 });
    expect(result.progress).toEqual({ totalTargets: 1, completedTargets: 1, missingTargets: 0 });
  });

  it("supports fixed single-leg targets but blocks unresolved derived participants", () => {
    const fixedInput = createInput({
      stageCode: "FINAL",
      stageKind: "KNOCKOUT",
      templateKind: "final_single_leg",
      tieMode: "single_leg"
    });
    const fixed = adaptAuthenticatedPredictionTargets(fixedInput);

    expect(fixed.targets[0]).toMatchObject({
      matchFormat: "knockout_single_leg",
      canEnterQualifiedTeam: true,
      canEnterQualificationMethod: true
    });

    fixedInput.matches[0] = { ...fixedInput.matches[0]!, homeTeamId: undefined };
    const unresolved = adaptAuthenticatedPredictionTargets(fixedInput);
    expect(unresolved.targets[0]).toMatchObject({
      participantsDerived: true,
      canEnterScore90: false,
      blockedReason: "Completa la fase precedente per derivare i partecipanti."
    });
  });

  it("conservatively blocks two-leg knockout targets", () => {
    const result = adaptAuthenticatedPredictionTargets(
      createInput({
        stageCode: "PLAYOFF",
        stageKind: "KNOCKOUT",
        templateKind: "knockout_two_leg",
        tieMode: "two_leg"
      })
    );

    expect(result.targets[0]).toMatchObject({
      matchFormat: "knockout_two_leg",
      canEnterScore90: false,
      blockedReason: "Knockout two-leg non ancora supportato."
    });
    expect(result.blockers).toContain(
      "Knockout two-leg non supportato dal domain workflow corrente."
    );
    expect(result.writeReady).toBe(false);
  });

  it("maps protected catalog metadata while keeping incomplete bracket destinations blocked", () => {
    const input = createInput();
    input.bracketSlots = [
      {
        id: "slot-1",
        editionId: "edition-1",
        roundId: "round-1",
        sourceType: "WINNER_OF_MATCH",
        sourcePayload: { matchId: "match-1" }
      }
    ];
    input.antepostDefinitions = [
      {
        id: "top-scorer",
        editionId: "edition-1",
        code: "TOP_SCORER",
        label: "Capocannoniere",
        valueType: "PLAYER",
        required: true
      },
      {
        id: "winner",
        editionId: "edition-1",
        code: "TOURNAMENT_WINNER",
        label: "Vincitrice",
        valueType: "TEAM",
        required: true
      }
    ];
    input.tiebreakRules = [
      {
        id: "rule-1",
        editionId: "edition-1",
        scope: "GROUP",
        order: 1,
        ruleCode: "points",
        rulePayload: {}
      }
    ];

    const result = adaptAuthenticatedPredictionTargets(input);

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "Bracket slots senza destinazione home/away verificabile.",
        "Definizioni antepost non supportate dal workflow autenticato."
      ])
    );
    expect(result.catalog).toEqual({
      bracketSlotCount: 1,
      supportedAntepostDefinitionIds: ["top-scorer"],
      unsupportedAntepostDefinitionIds: ["winner"],
      tiebreakRuleCount: 1
    });
    expect(result.writeReady).toBe(false);
  });

  it("rejects malformed bracket source metadata conservatively", () => {
    const input = createInput();
    input.bracketSlots = [
      {
        id: "slot-1",
        editionId: "edition-1",
        roundId: "round-1",
        sourceType: "GROUP_POSITION",
        sourcePayload: { groupCode: "A" }
      }
    ];

    expect(adaptAuthenticatedPredictionTargets(input).blockers).toContain(
      "Bracket slots con metadata sorgente incompleti."
    );
  });
});

function createInput(
  options: {
    stageCode?: string;
    stageKind?: string;
    templateKind?: string;
    tieMode?: string;
    matchOrder?: AuthenticatedPredictionTargetAdapterInput["matches"];
  } = {}
): AuthenticatedPredictionTargetAdapterInput {
  const stageCode = options.stageCode ?? "GROUP_STAGE";
  const templateKind = options.templateKind ?? "group_stage";

  return {
    leagueStatus: "open",
    formatTemplatePayload: {
      stages: [
        {
          code: stageCode,
          kind: templateKind,
          ...(options.tieMode ? { tieMode: options.tieMode } : {})
        }
      ]
    },
    predictionRequirementPayload: [{ code: "MATCH_SCORE", required: true }],
    stages: [
      {
        id: "stage-1",
        code: stageCode,
        kind: options.stageKind ?? "GROUP",
        name: "Stage reale",
        order: 1
      }
    ],
    groups: [{ id: "group-1", stageId: "stage-1", code: "A", name: "Gruppo A", order: 1 }],
    rounds: [],
    teams: [
      { id: "team-1", name: "Team One", shortName: "ONE" },
      { id: "team-2", name: "Team Two", shortName: "TWO" }
    ],
    matches: options.matchOrder ?? [createMatch("match-1", 1)],
    persistedMatchPredictions: [],
    bracketSlots: [],
    antepostDefinitions: [],
    tiebreakRules: [],
    catalogReadPathAvailable: true,
    bracketSlotDestinationsAvailable: false
  };
}

function createMatch(
  id: string,
  order: number
): AuthenticatedPredictionTargetAdapterInput["matches"][number] {
  return {
    id,
    stageId: "stage-1",
    groupId: "group-1",
    homeTeamId: "team-1",
    awayTeamId: "team-2",
    order
  };
}
