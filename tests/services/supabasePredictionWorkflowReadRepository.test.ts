import { describe, expect, it, vi } from "vitest";

import {
  SupabasePredictionWorkflowAccessError,
  SupabasePredictionWorkflowReadRepository,
  SupabasePredictionWorkflowSnapshotMismatchError,
  type SupabasePredictionWorkflowReadClient
} from "@/services/predictions/supabasePredictionWorkflowReadRepository";
import type { AuthenticatedPredictionReadModel } from "@/services/predictions/authenticatedPredictionReadModel";

vi.mock("@/services/supabase/client", () => ({
  requireSupabaseClient: () => {
    throw new Error("Tests inject a fake Supabase prediction workflow client.");
  }
}));

describe("SupabasePredictionWorkflowReadRepository", () => {
  it("loads two authenticated batch RPCs without client table reads or user-id arguments", async () => {
    const fixtures = createCompleteFixtures();
    const { client, rpcCalls } = createReadClient(fixtures);

    const context = await new SupabasePredictionWorkflowReadRepository(
      client
    ).loadAuthenticatedWorkflow(leagueId);

    expect(context.league).toMatchObject({ id: leagueId, status: "open" });
    expect(context.predictionSet?.id).toBe(predictionSetId);
    expect(context.catalogTeams.map((team) => team.id)).toEqual([team1Id, team2Id]);
    expect(context.matchPredictions[0]).toMatchObject({
      homeGoals90: 2,
      awayGoals90: 1,
      qualificationMethod: "REGULATION"
    });
    expect(context.resolverReadiness.kind).toBe("ready_for_resolver");
    expect(rpcCalls).toEqual([
      {
        functionName: "get_authenticated_prediction_read_model",
        args: { p_league_id: leagueId }
      },
      { functionName: "get_prediction_target_catalog", args: { p_league_id: leagueId } }
    ]);
    expect(rpcCalls.some((call) => "user_id" in call.args || "p_user_id" in call.args)).toBe(false);
    expect(rpcCalls.some((call) => mutationNames.has(call.functionName))).toBe(false);
  });

  it("preserves two persisted tie groups in the same scope without overwriting", async () => {
    const fixtures = createCompleteFixtures();
    const readModel = fixtures.authenticated_read_model!.data[0]!;
    readModel.personal.tiebreak_overrides = [
      createTiebreakOverride("tie-group-1", [team1Id, team2Id], [1, 2]),
      createTiebreakOverride("tie-group-2", [team3Id, team4Id], [3, 4])
    ];
    readModel.catalog.edition_teams.push(
      createEditionTeam(team3Id, "Team Three", "THR"),
      createEditionTeam(team4Id, "Team Four", "FOR")
    );

    const context = await new SupabasePredictionWorkflowReadRepository(
      createReadClient(fixtures).client
    ).loadAuthenticatedWorkflow(leagueId);

    expect(context.tiebreakOverrides).toHaveLength(2);
    expect(context.tiebreakOverrides.map((override) => override.tieGroupId)).toEqual([
      "tie-group-1",
      "tie-group-2"
    ]);
    expect(context.tiebreakOverrides[1]).toMatchObject({
      scope: "GROUP",
      scopeRef: "group:A",
      tiedTeamIds: [team3Id, team4Id],
      affectedPositions: [3, 4],
      orderedTeamIds: [team4Id, team3Id]
    });
  });

  it("returns not-started data without inventing personal children", async () => {
    const fixtures = createCompleteFixtures();
    fixtures.authenticated_read_model!.data[0]!.personal = {
      prediction_set: null,
      match_predictions: [],
      tiebreak_overrides: [],
      antepost_predictions: []
    };

    const context = await new SupabasePredictionWorkflowReadRepository(
      createReadClient(fixtures).client
    ).loadAuthenticatedWorkflow(leagueId);

    expect(context.predictionSet).toBeUndefined();
    expect(context.matchPredictions).toEqual([]);
    expect(context.tiebreakOverrides).toEqual([]);
  });

  it("maps membership RPC denial to the workflow access error", async () => {
    const fixtures = createCompleteFixtures();
    fixtures.authenticated_read_model = {
      data: [],
      error: new Error("Active league membership required")
    };

    await expect(
      new SupabasePredictionWorkflowReadRepository(
        createReadClient(fixtures).client
      ).loadAuthenticatedWorkflow(leagueId)
    ).rejects.toBeInstanceOf(SupabasePredictionWorkflowAccessError);
  });

  it("preserves an authorized empty protected target catalog", async () => {
    const fixtures = createCompleteFixtures();
    fixtures.target_catalog!.data[0] = {
      ...fixtures.target_catalog!.data[0]!,
      bracket_nodes: [],
      bracket_slots: [],
      best_third_combinations: [],
      antepost_definitions: [],
      tiebreak_rules: []
    };

    const context = await new SupabasePredictionWorkflowReadRepository(
      createReadClient(fixtures).client
    ).loadAuthenticatedWorkflow(leagueId);

    expect(context.targetCatalog.bracketSlots).toEqual([]);
    expect(context.targetCatalog.bestThirdCombinations).toEqual([]);
  });

  it("keeps an authorized incomplete initial catalog explicit through conservative blockers", async () => {
    const fixtures = createCompleteFixtures();
    const readModel = fixtures.authenticated_read_model!.data[0]!;
    readModel.catalog.edition_teams = [];
    readModel.catalog.matches = [];

    const context = await new SupabasePredictionWorkflowReadRepository(
      createReadClient(fixtures).client
    ).loadAuthenticatedWorkflow(leagueId);

    expect(context.resolverReadiness.kind).toBe("incomplete");
    expect(context.resolverReadiness.blockers).toEqual(
      expect.arrayContaining([
        "Catalogo squadre incompleto: 0/2.",
        "Calendario iniziale incompleto: 0/1."
      ])
    );
  });

  it("keeps RPC errors distinct from authorized empty data", async () => {
    const fixtures = createCompleteFixtures();
    fixtures.target_catalog = { data: [], error: new Error("catalog query failed") };

    await expect(
      new SupabasePredictionWorkflowReadRepository(
        createReadClient(fixtures).client
      ).loadAuthenticatedWorkflow(leagueId)
    ).rejects.toThrow("catalog query failed");
  });

  it.each([
    ["league", "league_id", otherLeagueId],
    ["edition", "edition_id", otherEditionId],
    ["format_template_version", "format_template_version_id", otherVersionId],
    ["ruleset_version", "ruleset_version_id", otherVersionId],
    ["prediction_requirement_version", "prediction_requirement_version_id", otherVersionId],
    ["scoring_preset_version", "scoring_preset_version_id", otherVersionId]
  ])("rejects concurrent RPC snapshot mismatch for %s", async (scope, field, value) => {
    const fixtures = createCompleteFixtures();
    fixtures.target_catalog!.data[0]![field] = value;

    const request = new SupabasePredictionWorkflowReadRepository(
      createReadClient(fixtures).client
    ).loadAuthenticatedWorkflow(leagueId);

    await expect(request).rejects.toMatchObject({
      code: "prediction_workflow_snapshot_mismatch",
      mismatchedScopes: [scope]
    });
    await expect(request).rejects.toBeInstanceOf(SupabasePredictionWorkflowSnapshotMismatchError);
  });

  it.each([
    [
      "missing initial participant",
      (model: ReadModelFixture) => (model.catalog.matches[0]!.home_team_id = null)
    ],
    [
      "cross-edition team",
      (model: ReadModelFixture) => (model.catalog.edition_teams[0]!.edition_id = otherEditionId)
    ],
    [
      "malformed ruleset",
      (model: ReadModelFixture) =>
        (model.versions.ruleset.rules_payload =
          {} as ReadModelFixture["versions"]["ruleset"]["rules_payload"])
    ],
    [
      "incomplete tie override",
      (model: ReadModelFixture) => {
        model.personal.tiebreak_overrides = [
          {
            ...createTiebreakOverride("tie-group", [team1Id, team2Id], [1, 2]),
            ordered_team_ids: [team1Id]
          }
        ];
      }
    ]
  ])("rejects a %s payload", async (_label, mutate) => {
    const fixtures = createCompleteFixtures();
    mutate(fixtures.authenticated_read_model!.data[0]!);

    await expect(
      new SupabasePredictionWorkflowReadRepository(
        createReadClient(fixtures).client
      ).loadAuthenticatedWorkflow(leagueId)
    ).rejects.toThrow();
  });
});

const mutationNames = new Set(["insert", "update", "upsert", "delete"]);
const leagueId = "10000000-0000-4000-8000-000000000001";
const editionId = "10000000-0000-4000-8000-000000000002";
const otherEditionId = "10000000-0000-4000-8000-000000000099";
const otherLeagueId = "10000000-0000-4000-8000-000000000098";
const otherVersionId = "10000000-0000-4000-8000-000000000097";
const formatVersionId = "10000000-0000-4000-8000-000000000003";
const rulesetVersionId = "10000000-0000-4000-8000-000000000004";
const requirementVersionId = "10000000-0000-4000-8000-000000000005";
const scoringVersionId = "10000000-0000-4000-8000-000000000006";
const stageId = "10000000-0000-4000-8000-000000000007";
const groupId = "10000000-0000-4000-8000-000000000008";
const team1Id = "10000000-0000-4000-8000-000000000009";
const team2Id = "10000000-0000-4000-8000-000000000010";
const team3Id = "10000000-0000-4000-8000-000000000011";
const team4Id = "10000000-0000-4000-8000-000000000012";
const matchId = "10000000-0000-4000-8000-000000000013";
const predictionSetId = "10000000-0000-4000-8000-000000000014";

function createCompleteFixtures(): RpcFixtures {
  return {
    authenticated_read_model: { data: [createReadModel()] },
    target_catalog: {
      data: [
        {
          league_id: leagueId,
          edition_id: editionId,
          format_template_version_id: formatVersionId,
          ruleset_version_id: rulesetVersionId,
          prediction_requirement_version_id: requirementVersionId,
          scoring_preset_version_id: scoringVersionId,
          bracket_nodes: [],
          bracket_slots: [],
          best_third_combinations: [],
          antepost_definitions: [],
          tiebreak_rules: []
        }
      ]
    }
  };
}

function createReadModel(): AuthenticatedPredictionReadModel {
  return {
    league: {
      id: leagueId,
      name: "Lega reale",
      status: "open",
      deadline_at: "2030-06-10T18:00:00.000Z",
      competition_edition_id: editionId,
      format_template_version_id: formatVersionId,
      ruleset_version_id: rulesetVersionId,
      prediction_requirement_version_id: requirementVersionId,
      scoring_preset_version_id: scoringVersionId,
      locked_competition_snapshot: null
    },
    edition: {
      id: editionId,
      name: "Edizione reale",
      season_label: "2030",
      edition_code: "edition_2030",
      data_completeness: "complete"
    },
    versions: {
      format_template: {
        id: formatVersionId,
        version: "1.0.0",
        status: "active",
        official_rules_source: { label: "Verified test fixture" },
        format: {
          teamCount: 2,
          initialStageKind: "group_stage",
          groupCount: 1,
          teamsPerGroup: 2,
          automaticQualifiersPerGroup: 1,
          bestThirdPlacedTeams: 0,
          knockoutRounds: []
        },
        stages: [{ code: "GROUP_STAGE", kind: "group_stage", name: "Group stage" }],
        ranking_rule_sets: [{ code: "group", rules: ["points", "goal_difference", "goals_for"] }],
        bracket_mapping_strategy: "explicit_versioned_slots"
      },
      ruleset: {
        id: rulesetVersionId,
        version: "1.0.0",
        status: "active",
        official_rules_source: { label: "Verified test fixture" },
        rules_payload: { family: "world_cup" },
        ranking_rule_set_codes: ["group"]
      },
      prediction_requirements: {
        id: requirementVersionId,
        version: "1.0.0",
        status: "active",
        requirements: ["MATCH_SCORE", "GROUP_STANDINGS"]
      },
      scoring_preset: {
        id: scoringVersionId,
        version: "1.0.0",
        status: "active",
        config: {}
      }
    },
    catalog: {
      stages: [
        {
          id: stageId,
          edition_id: editionId,
          code: "GROUP_STAGE",
          kind: "GROUP",
          name: "Group stage",
          sort_order: 1
        }
      ],
      groups: [
        {
          id: groupId,
          edition_id: editionId,
          stage_id: stageId,
          code: "A",
          name: "Group A",
          sort_order: 1
        }
      ],
      rounds: [],
      edition_teams: [
        createEditionTeam(team1Id, "Team One", "ONE"),
        createEditionTeam(team2Id, "Team Two", "TWO")
      ],
      matches: [
        {
          id: matchId,
          edition_id: editionId,
          stage_id: stageId,
          group_id: groupId,
          round_id: null,
          home_team_id: team1Id,
          away_team_id: team2Id,
          bracket_payload: {},
          kickoff_at: "2030-06-08T18:00:00.000Z",
          status: "NOT_STARTED",
          sort_order: 1,
          match_number: 1,
          matchday: 1,
          match_format: "REGULATION_90",
          leg: 1
        }
      ]
    },
    personal: {
      prediction_set: {
        id: predictionSetId,
        league_id: leagueId,
        status: "draft",
        total_required: 2,
        completed_items: 1,
        unsynced_items: 0,
        last_server_synced_at: null
      },
      match_predictions: [
        {
          id: "10000000-0000-4000-8000-000000000015",
          prediction_set_id: predictionSetId,
          match_id: matchId,
          prediction_ref: matchId,
          stage_code: "GROUP_STAGE",
          regulation_home_goals: 2,
          regulation_away_goals: 1,
          qualified_team_id: team1Id,
          advancement_method: "REGULATION",
          sync_status: "SYNCED",
          updated_at: "2030-06-01T12:00:00.000Z"
        }
      ],
      tiebreak_overrides: [],
      antepost_predictions: []
    }
  };
}

function createEditionTeam(teamId: string, name: string, shortName: string) {
  return {
    edition_id: editionId,
    team_id: teamId,
    seed_group_id: groupId,
    name,
    short_name: shortName,
    country_code: "ITA",
    fifa_code: shortName
  };
}

function createTiebreakOverride(
  tieGroupId: string,
  tiedTeamIds: string[],
  affectedPositions: number[]
): ReadModelFixture["personal"]["tiebreak_overrides"][number] {
  return {
    id:
      tieGroupId === "tie-group-1"
        ? "10000000-0000-4000-8000-000000000020"
        : "10000000-0000-4000-8000-000000000021",
    prediction_set_id: predictionSetId,
    scope: "GROUP",
    scope_ref: "group:A",
    tie_group_id: tieGroupId,
    tied_team_ids: tiedTeamIds,
    affected_positions: affectedPositions,
    ordered_team_ids: [...tiedTeamIds].reverse(),
    reason: "Ordine manuale",
    sync_status: "SYNCED",
    created_at: "2030-06-01T12:00:00.000Z",
    updated_at: "2030-06-01T12:00:00.000Z"
  };
}

interface RpcCall {
  functionName: string;
  args: Record<string, unknown>;
}

interface RpcFixture<T> {
  data: T[];
  error?: Error;
}

interface RpcFixtures {
  authenticated_read_model?: RpcFixture<AuthenticatedPredictionReadModel>;
  target_catalog?: RpcFixture<Record<string, unknown>>;
}

type ReadModelFixture = AuthenticatedPredictionReadModel;

function createReadClient(fixtures: RpcFixtures): {
  rpcCalls: RpcCall[];
  client: SupabasePredictionWorkflowReadClient;
} {
  const rpcCalls: RpcCall[] = [];
  const client = {
    rpc: (functionName: string, args: Record<string, unknown>) => {
      rpcCalls.push({ functionName, args });
      const fixture =
        functionName === "get_authenticated_prediction_read_model"
          ? fixtures.authenticated_read_model
          : fixtures.target_catalog;
      return Promise.resolve({ data: fixture?.data[0] ?? null, error: fixture?.error ?? null });
    }
  } as unknown as SupabasePredictionWorkflowReadClient;

  return { rpcCalls, client };
}
