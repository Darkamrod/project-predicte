import { describe, expect, it } from "vitest";

import { resolveSupabasePredictionWorkflowCapability } from "@/features/predictions/supabasePredictionWorkflowCapability";
import type { AuthenticatedPredictionReadModel } from "@/services/predictions/authenticatedPredictionReadModel";
import type { SupabasePredictionWorkflowContext } from "@/services/predictions/supabasePredictionWorkflowReadRepository";

describe("Supabase prediction workflow capability", () => {
  it.each(["locked", "live", "completed", "archived"] as const)(
    "keeps the persisted %s lifecycle read-only",
    (status) => {
      expect(
        resolveSupabasePredictionWorkflowCapability(createContext({ leagueStatus: status })).kind
      ).toBe("locked");
    }
  );

  it("keeps an absent prediction set explicit without initialization", () => {
    const capability = resolveSupabasePredictionWorkflowCapability(
      createContext({ includePredictionSet: false })
    );

    expect(capability).toEqual({
      kind: "not_started",
      message:
        "Prediction set non ancora inizializzato. Nessun record viene creato automaticamente."
    });
  });

  it("does not expose a partial Quick or Expert workflow when target data is incomplete", () => {
    const capability = resolveSupabasePredictionWorkflowCapability(createContext());

    expect(capability.kind).toBe("unavailable");
    if (capability.kind !== "unavailable") throw new Error("Expected unavailable capability");
    expect(capability.missingData).toContain("adapter completo target/bracket/antepost");
  });

  it("marks complete inputs as resolver-ready without enabling editing", () => {
    const context = createContext();
    context.resolverReadiness = {
      kind: "ready_for_resolver",
      blockers: [],
      counts: { teams: 48, groups: 12, initialMatches: 72, completeInitialParticipants: 72 }
    };

    expect(resolveSupabasePredictionWorkflowCapability(context)).toEqual({
      kind: "ready_for_resolver",
      message:
        "Read model completo per il futuro resolver. Quick Mode ed Expert Mode restano in sola lettura in C2B2."
    });
  });
});

function createContext(
  options: {
    includePredictionSet?: boolean;
    leagueStatus?: SupabasePredictionWorkflowContext["league"]["status"];
  } = {}
): SupabasePredictionWorkflowContext {
  const includePredictionSet = options.includePredictionSet ?? true;

  return {
    league: {
      id: "00000000-0000-4000-8000-000000000100",
      name: "Lega reale",
      status: options.leagueStatus ?? "open",
      deadlineAtUtc: "2030-06-10T18:00:00.000Z",
      competitionEditionId: "edition-1"
    },
    edition: {
      id: "edition-1",
      name: "Edizione",
      seasonLabel: "2030",
      dataCompleteness: "complete"
    },
    formatTemplateVersion: { id: "format-1", version: "1", status: "active", payload: {} },
    rulesetVersion: { id: "rules-1", version: "1", status: "active", payload: {} },
    predictionRequirementVersion: {
      id: "requirements-1",
      version: "1",
      status: "active",
      payload: []
    },
    scoringPresetVersion: { id: "scoring-1", version: "1", status: "active", payload: {} },
    ...(includePredictionSet
      ? {
          predictionSet: {
            id: "set-1",
            status: "draft" as const,
            totalRequired: 10,
            completedItems: 4,
            unsyncedItems: 0
          }
        }
      : {}),
    matchPredictions: [],
    tiebreakOverrides: [],
    antepostPredictions: [],
    catalogMatches: [
      {
        id: "match-1",
        stageId: "stage-1",
        status: "NOT_STARTED",
        order: 1
      }
    ],
    catalogStages: [],
    catalogGroups: [],
    catalogRounds: [],
    catalogTeams: [],
    targetCatalog: {
      leagueId: "00000000-0000-4000-8000-000000000100",
      editionId: "edition-1",
      formatTemplateVersionId: "format-1",
      rulesetVersionId: "rules-1",
      predictionRequirementVersionId: "requirements-1",
      scoringPresetVersionId: "scoring-1",
      bracketNodes: [],
      bracketSlots: [],
      bestThirdCombinations: [],
      antepostDefinitions: [],
      tiebreakRules: []
    },
    authenticatedReadModel: {} as unknown as AuthenticatedPredictionReadModel,
    resolverReadiness: {
      kind: "incomplete",
      blockers: ["Catalogo iniziale incompleto."],
      counts: { teams: 0, groups: 0, initialMatches: 0, completeInitialParticipants: 0 }
    }
  };
}
