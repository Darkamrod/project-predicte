import { describe, expect, it, vi } from "vitest";

import {
  SupabasePredictionWorkflowAccessError,
  SupabasePredictionWorkflowReadRepository,
  type SupabasePredictionWorkflowReadClient
} from "@/services/predictions/supabasePredictionWorkflowReadRepository";

vi.mock("@/services/supabase/client", () => ({
  requireSupabaseClient: () => {
    throw new Error("Tests inject a fake Supabase prediction workflow client.");
  }
}));

describe("SupabasePredictionWorkflowReadRepository", () => {
  it("loads league-scoped version context and only the authenticated user's predictions", async () => {
    const { client, calls } = createReadClient(createCompleteFixtures());
    const repository = new SupabasePredictionWorkflowReadRepository(client);

    const context = await repository.loadAuthenticatedWorkflow(leagueId, userId);

    expect(context.league).toMatchObject({ id: leagueId, status: "open" });
    expect(context.predictionSet?.id).toBe(predictionSetId);
    expect(context.matchPredictions).toHaveLength(1);
    expect(context.matchPredictions[0]).toMatchObject({
      homeGoals90: 2,
      awayGoals90: 1,
      qualificationMethod: "REGULATION"
    });
    expect(context.predictionRequirementVersion?.id).toBe("requirements-1");
    expect(context.catalogMatches).toHaveLength(1);
    expect(context.catalogStages).toHaveLength(1);
    expect(context.catalogTeams.map((team) => team.id)).toEqual(["team-1", "team-2"]);

    expect(filtersFor(calls, "league_members")).toEqual([
      { column: "league_id", value: leagueId },
      { column: "user_id", value: userId },
      { column: "status", value: "active" }
    ]);
    expect(filtersFor(calls, "prediction_sets")).toEqual([
      { column: "league_id", value: leagueId },
      { column: "user_id", value: userId }
    ]);
    expect(filtersFor(calls, "match_predictions")).toEqual([
      { column: "prediction_set_id", value: predictionSetId }
    ]);
    expect(filtersFor(calls, "matches")).toEqual([{ column: "edition_id", value: "edition-1" }]);
    expect(filtersFor(calls, "stages")).toEqual([{ column: "edition_id", value: "edition-1" }]);
    expect(filtersFor(calls, "teams")).toEqual([{ column: "id", value: ["team-1", "team-2"] }]);
    expect(calls.flatMap((call) => call.mutations)).toEqual([]);
    expect(calls.some((call) => call.table === "profiles" || call.table === "auth.users")).toBe(
      false
    );
  });

  it("returns not-started data without querying or creating prediction children", async () => {
    const fixtures = createCompleteFixtures();
    fixtures.prediction_sets = { data: [] };
    const { client, calls } = createReadClient(fixtures);
    const repository = new SupabasePredictionWorkflowReadRepository(client);

    const context = await repository.loadAuthenticatedWorkflow(leagueId, userId);

    expect(context.predictionSet).toBeUndefined();
    expect(context.matchPredictions).toEqual([]);
    expect(calls.some((call) => call.table === "match_predictions")).toBe(false);
    expect(calls.flatMap((call) => call.mutations)).toEqual([]);
  });

  it("rejects a league that is not visible through authenticated RLS", async () => {
    const { client } = createReadClient({ leagues: { data: [] } });
    const repository = new SupabasePredictionWorkflowReadRepository(client);

    await expect(repository.loadAuthenticatedWorkflow(leagueId, userId)).rejects.toBeInstanceOf(
      SupabasePredictionWorkflowAccessError
    );
  });
});

const leagueId = "00000000-0000-4000-8000-000000000100";
const userId = "00000000-0000-4000-8000-000000000101";
const predictionSetId = "00000000-0000-4000-8000-000000000102";

function createCompleteFixtures(): Record<string, QueryFixture> {
  return {
    leagues: {
      data: [
        {
          id: leagueId,
          name: "Lega reale",
          status: "open",
          deadline_at: "2030-06-10T18:00:00.000Z",
          competition_edition_id: "edition-1",
          format_template_version_id: "format-1",
          ruleset_version_id: "rules-1",
          prediction_requirement_version_id: "requirements-1",
          scoring_preset_version_id: "scoring-1",
          locked_competition_snapshot: null
        }
      ]
    },
    league_members: {
      data: [{ league_id: leagueId, user_id: userId, status: "active" }]
    },
    prediction_sets: {
      data: [
        {
          id: predictionSetId,
          league_id: leagueId,
          user_id: userId,
          status: "draft",
          total_required: 10,
          completed_items: 4,
          unsynced_items: 0,
          last_server_synced_at: null
        }
      ]
    },
    competition_editions: {
      data: [
        {
          id: "edition-1",
          name: "Edizione reale",
          season_label: "2030",
          edition_code: "edition_2030",
          data_completeness: "complete"
        }
      ]
    },
    format_template_versions: {
      data: [
        {
          id: "format-1",
          version: "1",
          status: "active",
          format: {},
          stages: [],
          ranking_rule_sets: [],
          bracket_mapping_strategy: "explicit_versioned_slots"
        }
      ]
    },
    ruleset_versions: {
      data: [
        {
          id: "rules-1",
          version: "1",
          status: "active",
          rules_payload: {},
          ranking_rule_set_codes: []
        }
      ]
    },
    prediction_requirement_versions: {
      data: [{ id: "requirements-1", version: "1", status: "active", requirements: [] }]
    },
    scoring_preset_versions: {
      data: [{ id: "scoring-1", version: "1", status: "active", config: {} }]
    },
    matches: {
      data: [
        {
          id: "match-1",
          edition_id: "edition-1",
          stage_id: "stage-1",
          group_id: "group-1",
          round_id: null,
          home_team_id: "team-1",
          away_team_id: "team-2",
          kickoff_at: "2030-06-08T18:00:00.000Z",
          status: "NOT_STARTED",
          sort_order: 1
        }
      ]
    },
    stages: {
      data: [
        {
          id: "stage-1",
          edition_id: "edition-1",
          code: "GROUP_STAGE",
          kind: "GROUP",
          name: "Fase iniziale",
          sort_order: 1
        }
      ]
    },
    groups: {
      data: [
        {
          id: "group-1",
          edition_id: "edition-1",
          stage_id: "stage-1",
          code: "A",
          name: "Gruppo A",
          sort_order: 1
        }
      ]
    },
    rounds: { data: [] },
    teams: {
      data: [
        { id: "team-1", name: "Team One", short_name: "ONE", country_code: "ON" },
        { id: "team-2", name: "Team Two", short_name: "TWO", country_code: "TW" }
      ]
    },
    match_predictions: {
      data: [
        {
          id: "prediction-1",
          prediction_set_id: predictionSetId,
          match_id: "match-1",
          prediction_ref: "match-1",
          stage_code: "GROUP_STAGE",
          regulation_home_goals: 2,
          regulation_away_goals: 1,
          qualified_team_id: "team-1",
          advancement_method: "REGULATION",
          sync_status: "SYNCED",
          updated_at: "2030-06-01T12:00:00.000Z"
        }
      ]
    },
    prediction_tiebreak_overrides: { data: [] },
    antepost_predictions: { data: [] }
  };
}

interface QueryResult {
  data: QueryRow[];
  count: number | null;
  error: null;
}

type QueryRow = Record<string, unknown>;
type QueryFixture = { data: QueryRow[] };

interface QueryCall {
  table: string;
  filters: { column: string; value: unknown }[];
  mutations: string[];
}

function createReadClient(results: Record<string, QueryFixture>): {
  calls: QueryCall[];
  client: SupabasePredictionWorkflowReadClient;
} {
  const calls: QueryCall[] = [];
  const client = {
    from: (table: string) => new FakeQueryBuilder(table, results[table] ?? { data: [] }, calls)
  } as unknown as SupabasePredictionWorkflowReadClient;

  return { calls, client };
}

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  private readonly call: QueryCall;

  constructor(
    table: string,
    private readonly result: QueryFixture,
    calls: QueryCall[]
  ) {
    this.call = { table, filters: [], mutations: [] };
    calls.push(this.call);
  }

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.call.filters.push({ column, value });
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.call.filters.push({ column, value: values });
    return this;
  }

  order(): this {
    return this;
  }

  range(): this {
    return this;
  }

  insert(): this {
    this.call.mutations.push("insert");
    return this;
  }

  update(): this {
    this.call.mutations.push("update");
    return this;
  }

  upsert(): this {
    this.call.mutations.push("upsert");
    return this;
  }

  delete(): this {
    this.call.mutations.push("delete");
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({
      data: this.result.data,
      count: this.result.data.length,
      error: null
    }).then(onfulfilled, onrejected);
  }
}

function filtersFor(calls: QueryCall[], table: string): QueryCall["filters"] {
  return calls.find((call) => call.table === table)?.filters ?? [];
}
