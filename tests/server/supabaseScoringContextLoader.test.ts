import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { SupabaseScoringContextLoader } from "@/server/scoring/supabaseScoringContextLoader";
import type { Database } from "@/services/supabase/database.types";

describe("Milestone 6 Supabase scoring context loader", () => {
  it("loads competition, predictions, locked rules, events, and leaderboard context", async () => {
    const loader = new SupabaseScoringContextLoader(createFakeSupabaseClient(createRows()));

    const context = await loader.loadContext({
      leagueId,
      sourceResultKey: "provider-result-v1"
    });

    expect(context.leagueId).toBe(leagueId);
    expect(context.scoringRuleVersion.status).toBe("locked");
    expect(context.competition.edition.id).toBe(editionId);
    expect(context.competition.matches[0]).toMatchObject({
      id: matchId,
      stageId,
      homeTeamId,
      awayTeamId
    });
    expect(context.predictionSets[0]?.matchPredictions[0]).toMatchObject({
      matchId,
      homeGoals: 2,
      awayGoals: 1
    });
    expect(context.predictionSets[0]?.tiebreakOverrides?.[0]?.scopeRef).toBe("group:A");
    expect(context.predictionSets[0]?.antepostPredictions?.[0]?.selectedTeamId).toBe(homeTeamId);
    expect(context.participants[0]).toMatchObject({
      userId,
      displayName: "Ada Lovelace",
      avatarInitials: "AL"
    });
    expect(context.existingEvents?.[0]).toMatchObject({
      sourceResultVersion: "provider-result-v1",
      points: 10
    });
    expect(context.previousSnapshot?.entries[0]).toMatchObject({
      userId,
      totalPoints: 10
    });
  });

  it("rejects scoring context when the current rule version is not locked", async () => {
    const rows = createRows();
    const ruleVersions = rows.league_scoring_rule_versions;

    if (!ruleVersions) {
      throw new Error("Expected rule version fixture rows.");
    }

    rows.league_scoring_rule_versions = ruleVersions.map((row) => ({
      ...row,
      status: "draft"
    }));
    const loader = new SupabaseScoringContextLoader(createFakeSupabaseClient(rows));

    await expect(
      loader.loadContext({
        leagueId,
        sourceResultKey: "provider-result-v1"
      })
    ).rejects.toThrow("Scoring rule version must be locked before trusted scoring.");
  });
});

type RowMap = {
  [K in keyof Database["public"]["Tables"]]?: Array<Database["public"]["Tables"][K]["Row"]>;
};

interface FakeBuilder {
  select: () => FakeBuilder;
  eq: (field: string, value: unknown) => FakeBuilder;
  in: (field: string, values: unknown[]) => FakeBuilder;
  order: (field: string, options?: { ascending?: boolean }) => FakeBuilder;
  limit: (count: number) => FakeBuilder;
  single: () => Promise<{ data: unknown | null; error: null }>;
  then: Promise<{ data: unknown[]; error: null }>["then"];
}

function createFakeSupabaseClient(rows: RowMap): SupabaseClient<Database> {
  return {
    from: (table: keyof RowMap) => createBuilder(rows[table] ?? [])
  } as unknown as SupabaseClient<Database>;
}

function createBuilder(initialRows: unknown[]): FakeBuilder {
  let currentRows = [...initialRows];

  const builder: FakeBuilder = {
    select: () => builder,
    eq: (field, value) => {
      currentRows = currentRows.filter((row) => getField(row, field) === value);
      return builder;
    },
    in: (field, values) => {
      currentRows = currentRows.filter((row) => values.includes(getField(row, field)));
      return builder;
    },
    order: (field, options) => {
      currentRows = [...currentRows].sort((left, right) => {
        const leftValue = String(getField(left, field) ?? "");
        const rightValue = String(getField(right, field) ?? "");
        const direction = options?.ascending === false ? -1 : 1;

        return direction * leftValue.localeCompare(rightValue);
      });
      return builder;
    },
    limit: (count) => {
      currentRows = currentRows.slice(0, count);
      return builder;
    },
    single: async () => ({
      data: currentRows[0] ?? null,
      error: null
    }),
    then: (onfulfilled, onrejected) =>
      Promise.resolve({ data: currentRows, error: null }).then(onfulfilled, onrejected)
  };

  return builder;
}

function getField(row: unknown, field: string): unknown {
  return row !== null && typeof row === "object"
    ? (row as Record<string, unknown>)[field]
    : undefined;
}

function createRows(): RowMap {
  return {
    sports: [{ id: sportId, code: "FOOTBALL", name: "Football" }],
    competition_templates: [
      {
        id: templateId,
        sport_id: sportId,
        family_id: null,
        code: "FIFA_WORLD_CUP",
        name: "World Cup",
        status: "active"
      }
    ],
    competition_editions: [
      {
        id: editionId,
        template_id: templateId,
        edition_code: "world_cup_mock",
        family_id: null,
        name: "World Cup Mock",
        season_label: "2030",
        enabled: true,
        first_kickoff_at: "2030-06-08T19:00:00.000Z",
        maximum_deadline_at: "2030-06-08T18:30:00.000Z",
        format_template_version_id: null,
        ruleset_version_id: null,
        prediction_requirement_version_id: null,
        scoring_preset_version_id: null,
        official_rules_source: null,
        data_completeness: "MOCK_COMPLETE",
        created_at: "2026-07-05T00:00:00.000Z",
        format: {
          groupCount: 1,
          teamsPerGroup: 2,
          groupStageMatchCount: 1,
          bestThirdPlacedTeams: 0,
          knockoutRounds: ["FINAL"],
          antepostDefinitionIds: [antepostDefinitionId]
        }
      }
    ],
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
    rounds: [
      {
        id: roundId,
        edition_id: editionId,
        stage_id: stageId,
        code: "GROUP_STAGE",
        name: "Group stage",
        sort_order: 1
      }
    ],
    teams: [
      { id: homeTeamId, name: "Italia", short_name: "ITA", country_code: "ITA" },
      { id: awayTeamId, name: "Brasile", short_name: "BRA", country_code: "BRA" }
    ],
    players: [{ id: playerId, team_id: homeTeamId, display_name: "Italia Bomber" }],
    edition_teams: [
      { edition_id: editionId, team_id: homeTeamId, seed_group_id: groupId },
      { edition_id: editionId, team_id: awayTeamId, seed_group_id: groupId }
    ],
    matches: [
      {
        id: matchId,
        edition_id: editionId,
        stage_id: stageId,
        group_id: groupId,
        round_id: roundId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        bracket_payload: {},
        kickoff_at: "2030-06-08T19:00:00.000Z",
        status: "NOT_STARTED",
        sort_order: 1
      }
    ],
    bracket_slots: [],
    competition_antepost_definitions: [
      {
        id: antepostDefinitionId,
        edition_id: editionId,
        code: "TOURNAMENT_WINNER",
        label: "Winner",
        value_type: "TEAM",
        required: true
      }
    ],
    leagues: [
      {
        id: leagueId,
        competition_edition_id: editionId,
        owner_id: userId,
        name: "League",
        status: "locked",
        deadline_at: "2030-06-08T18:30:00.000Z",
        current_scoring_rule_version_id: ruleVersionId,
        format_template_version_id: null,
        ruleset_version_id: null,
        prediction_requirement_version_id: null,
        scoring_preset_version_id: null,
        locked_competition_snapshot: null,
        locked_competition_snapshot_checksum: null,
        invite_settings: {},
        created_at: "2026-07-05T00:00:00.000Z",
        updated_at: "2026-07-05T00:00:00.000Z"
      }
    ],
    league_scoring_rule_versions: [
      {
        id: ruleVersionId,
        league_id: leagueId,
        version: 1,
        status: "locked",
        schema_version: 1,
        config: scoringConfig,
        checksum: "checksum",
        created_by: userId,
        created_at: "2026-07-05T00:00:00.000Z",
        locked_at: "2030-06-08T18:30:00.000Z"
      }
    ],
    league_members: [
      {
        league_id: leagueId,
        user_id: userId,
        role: "owner",
        status: "active",
        joined_at: "2026-07-05T00:00:00.000Z",
        removed_at: null
      }
    ],
    profiles: [
      {
        id: userId,
        display_name: "Ada Lovelace",
        avatar_url: null,
        locale: "it-IT",
        timezone: "Europe/Rome",
        created_at: "2026-07-05T00:00:00.000Z",
        updated_at: "2026-07-05T00:00:00.000Z",
        deleted_at: null
      }
    ],
    prediction_sets: [
      {
        id: predictionSetId,
        league_id: leagueId,
        user_id: userId,
        status: "complete",
        total_required: 3,
        completed_items: 3,
        unsynced_items: 0,
        last_server_synced_at: "2030-06-08T18:00:00.000Z",
        completed_at: "2030-06-08T18:00:00.000Z"
      }
    ],
    match_predictions: [
      {
        id: "match-prediction-id",
        prediction_set_id: predictionSetId,
        match_id: matchId,
        prediction_ref: matchId,
        stage_code: "GROUP_STAGE",
        regulation_home_goals: 2,
        regulation_away_goals: 1,
        qualified_team_id: null,
        advancement_method: null,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        depends_on_prediction_refs: [],
        validation_status: "valid",
        sync_status: "SYNCED",
        updated_at: "2030-06-08T18:00:00.000Z"
      }
    ],
    prediction_tiebreak_overrides: [
      {
        id: "tiebreak-id",
        prediction_set_id: predictionSetId,
        scope_ref: "group:A",
        ordered_team_ids: [homeTeamId, awayTeamId],
        reason: "Manual",
        created_at: "2030-06-08T18:00:00.000Z",
        updated_at: "2030-06-08T18:00:00.000Z",
        sync_status: "SYNCED"
      }
    ],
    antepost_predictions: [
      {
        id: "antepost-id",
        prediction_set_id: predictionSetId,
        definition_id: antepostDefinitionId,
        selected_payload: { selectedTeamId: homeTeamId },
        updated_at: "2030-06-08T18:00:00.000Z",
        sync_status: "SYNCED"
      }
    ],
    scoring_events: [
      {
        id: "event-row-id",
        event_key: "event-key",
        league_id: leagueId,
        participant_user_id: userId,
        competition_edition_id: editionId,
        reference_id: matchId,
        scoring_rule_version_id: ruleVersionId,
        event_type: "EXACT_SCORE",
        points: 10,
        reason: "Exact",
        calculation_version: "test",
        source_result_version_id: null,
        source_result_key: "provider-result-v1",
        created_at: "2030-07-16T21:00:00.000Z"
      }
    ],
    leaderboard_snapshots: [
      {
        id: snapshotId,
        league_id: leagueId,
        snapshot_key: "snapshot-key",
        source_result_version_id: null,
        source_result_key: "provider-result-v1",
        created_at: "2030-07-16T21:00:00.000Z"
      }
    ],
    leaderboard_entries: [
      {
        snapshot_id: snapshotId,
        user_id: userId,
        rank: 1,
        total_points: 10,
        latest_points: 10,
        position_delta: 0,
        tied: false
      }
    ]
  };
}

const sportId = "sport-football";
const templateId = "template-world-cup";
const editionId = "edition-world-cup";
const stageId = "stage-group";
const groupId = "group-a";
const roundId = "round-group";
const matchId = "11111111-1111-4111-8111-111111111111";
const leagueId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const predictionSetId = "44444444-4444-4444-8444-444444444444";
const ruleVersionId = "55555555-5555-4555-8555-555555555555";
const snapshotId = "66666666-6666-4666-8666-666666666666";
const homeTeamId = "77777777-7777-4777-8777-777777777777";
const awayTeamId = "88888888-8888-4888-8888-888888888888";
const playerId = "99999999-9999-4999-8999-999999999999";
const antepostDefinitionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const scoringConfig = {
  schemaVersion: 1,
  presetCode: "WORLD_CUP_DEFAULT",
  maxPointsPerField: 100,
  stages: {
    GROUP_STAGE: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 3,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 0,
      penaltyMethod: 0
    },
    ROUND_OF_32: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    },
    ROUND_OF_16: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    },
    QUARTER_FINAL: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    },
    SEMI_FINAL: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    },
    THIRD_PLACE: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    },
    FINAL: {
      correctOutcome: 5,
      exactScore: 10,
      correctGroupPosition: 0,
      stageQualification: 1,
      correctPairing: 1,
      extraTimeMethod: 1,
      penaltyMethod: 1
    }
  },
  antepost: {
    tournamentWinner: 25,
    topScorer: 25,
    topScorerExactGoals: 50
  },
  stacking: {
    exactScoreReplacesOutcome: true,
    topScorerExactGoalsReplacesTopScorer: true,
    qualificationAndPairingAreIndependent: true,
    advancementMethodRequiresDrawAndQualifier: true
  }
};
