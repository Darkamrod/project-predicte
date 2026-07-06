import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type { MatchPrediction, PredictionSet } from "@/domain/predictions/types";
import type { ScoringEvent, UserScoringBreakdown } from "@/domain/scoring/types";
import { SupabaseScoringPersistenceRepository } from "@/server/scoring/supabaseScoringPersistenceRepository";
import { SupabasePredictionRepository } from "@/services/predictions/supabasePredictionRepository";
import { SupabaseRuleRepository } from "@/services/rules/supabaseRuleRepository";
import type { SupabaseRpcClient } from "@/services/supabase/rpcClient";

vi.mock("@/services/supabase/client", () => ({
  requireSupabaseClient: () => {
    throw new Error("Tests inject a fake Supabase RPC client.");
  }
}));

const milestone4Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260704030000_milestone4_prediction_scoring_persistence.sql"
  ),
  "utf8"
);
const milestone41Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260704040000_milestone4_1_scoring_recalculation_idempotency.sql"
  ),
  "utf8"
);
const milestone81Migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260705060000_milestone8_1_tiebreak_groups.sql"),
  "utf8"
);
const milestone9Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260706010000_milestone9_tiebreak_exact_set_validation.sql"
  ),
  "utf8"
);
const decisionsDoc = readFileSync(join(process.cwd(), "docs/DECISIONS.md"), "utf8");
const dataModelDoc = readFileSync(join(process.cwd(), "docs/DATA_MODEL.md"), "utf8");
const scoringEngineDoc = readFileSync(join(process.cwd(), "docs/SCORING_ENGINE.md"), "utf8");

describe("Milestone 4 Supabase migration contract", () => {
  it("adds persistence support for complete predictions, rules, scoring, and leaderboard", () => {
    expect(milestone4Migration).toContain("prediction_ref text");
    expect(milestone4Migration).toContain("save_match_prediction");
    expect(milestone4Migration).toContain("upsert_prediction_tiebreak_override");
    expect(milestone4Migration).toContain("upsert_antepost_prediction");
    expect(milestone4Migration).toContain("update_prediction_set_completion");
    expect(milestone4Migration).toContain("league_scoring_rule_changes");
    expect(milestone4Migration).toContain("lock_scoring_rule_snapshot");
    expect(milestone4Migration).toContain("persist_scoring_recalculation");
    expect(milestone4Migration).toContain("scoring_breakdown_items");
  });

  it("keeps deadline and lock checks server-side for prediction and rule writes", () => {
    expect(milestone4Migration).toContain("prediction_set_is_writable_by_current_user");
    expect(milestone4Migration).toContain("Predictions are locked or past deadline");
    expect(milestone4Migration).toContain("league_accepts_members(p_league_id)");
    expect(milestone4Migration).toContain("League cannot be locked before deadline");
    expect(milestone4Migration).toContain(
      "Locked scoring rule snapshot is required before scoring"
    );
  });

  it("persists scoring recalculations idempotently by replacing one source result key", () => {
    const breakdownDelete = milestone4Migration.indexOf(
      "delete from public.scoring_breakdown_items"
    );
    const leaderboardDelete = milestone4Migration.indexOf(
      "delete from public.leaderboard_snapshots"
    );
    const eventsDelete = milestone4Migration.indexOf("delete from public.scoring_events");
    const eventsInsert = milestone4Migration.indexOf("insert into public.scoring_events");

    expect(milestone4Migration).toContain("source_result_key");
    expect(milestone4Migration).toContain("leaderboard_snapshots_m4_source_key_idx");
    expect(milestone4Migration).toContain("scoring_events_m4_event_key_idx");
    expect(breakdownDelete).toBeGreaterThan(-1);
    expect(leaderboardDelete).toBeGreaterThan(breakdownDelete);
    expect(eventsDelete).toBeGreaterThan(leaderboardDelete);
    expect(eventsInsert).toBeGreaterThan(eventsDelete);
  });

  it("keeps repeated recalculation from being blocked by historical snapshot references", () => {
    expect(milestone4Migration).toContain(
      "add column if not exists snapshot_id uuid references public.leaderboard_snapshots (id)"
    );
    expect(milestone41Migration).toContain(
      "alter table public.scoring_recalculation_runs drop constraint"
    );
    expect(milestone41Migration).toContain(
      "constraint scoring_recalculation_runs_snapshot_id_fkey"
    );
    expect(milestone41Migration).toContain("on delete set null");
    expect(milestone41Migration).toContain(
      "historical recalculation runs keep audit metadata but release snapshot references"
    );
  });

  it("documents the Milestone 4.1 ON DELETE SET NULL idempotency strategy", () => {
    const docs = `${decisionsDoc}\n${dataModelDoc}\n${scoringEngineDoc}`;

    expect(docs).toContain("Milestone 4.1");
    expect(docs).toContain("ON DELETE SET NULL");
    expect(docs).toContain("source_result_key");
  });

  it("separates multiple tiebreak overrides inside the same scope", () => {
    expect(milestone81Migration).toContain("tie_group_id");
    expect(milestone81Migration).toContain(
      "prediction_tiebreak_overrides_prediction_set_scope_group_key"
    );
    expect(milestone81Migration).toContain("unique (prediction_set_id, scope_ref, tie_group_id)");
    expect(milestone81Migration).toContain("p_tie_group_id");
    expect(milestone81Migration).toContain("Tie-break order must include every tied team");
    expect(milestone81Migration).not.toContain(
      "on conflict on constraint prediction_tiebreak_overrides_prediction_set_scope_key"
    );
  });

  it("hardens tiebreak override validation to reject extra or duplicate teams", () => {
    expect(milestone9Migration).toContain("Tie-break order must match tied teams exactly");
    expect(milestone9Migration).toContain("Tie-break order cannot contain duplicate teams");
    expect(milestone9Migration).toContain("Tied teams cannot contain duplicate teams");
    expect(milestone9Migration).toContain("from unnest(p_ordered_team_ids)");
    expect(milestone9Migration).toContain("from unnest(normalized_tied_team_ids)");
    expect(milestone9Migration).toContain(
      "prediction_tiebreak_overrides_prediction_set_scope_group_key"
    );
  });

  it("keeps scoring tables RPC-written and member-readable through explicit RLS", () => {
    expect(milestone4Migration).toContain("scoring breakdown read league members");
    expect(milestone4Migration).toContain("rule changes read league members");
    expect(milestone4Migration).toContain("scoring recalculation runs read organizers");
    expect(milestone4Migration).not.toMatch(/on public\.scoring_events for insert/i);
    expect(milestone4Migration).not.toMatch(/on public\.leaderboard_snapshots for insert/i);
    expect(milestone4Migration).not.toMatch(/on public\.leaderboard_entries for insert/i);
  });

  it("does not introduce excluded money, advertising, wagering, or sports API features", () => {
    expect(milestone4Migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
  });
});

describe("Milestone 4 Supabase repositories", () => {
  it("persists virtual knockout match predictions with prediction_ref instead of a UUID match id", async () => {
    const { client, calls } = createRpcClient({
      save_match_prediction: "prediction-row-id"
    });
    const repository = new SupabasePredictionRepository(client);

    await repository.saveMatchPrediction({
      leagueId: leagueId,
      prediction: createMatchPrediction({
        matchId: "predicted-final-1",
        stageCode: "FINAL",
        qualifiedTeamId: teamIdA,
        advancementMethod: "PENALTIES"
      }),
      metadata: {
        homeTeamId: teamIdA,
        awayTeamId: teamIdB,
        dependsOnPredictionRefs: ["predicted-semi-final-1", "predicted-semi-final-2"]
      }
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.fn).toBe("save_match_prediction");
    expect(getArgs(calls[0])).not.toHaveProperty("p_match_id");
    expect(getArgs(calls[0]).p_prediction_ref).toBe("predicted-final-1");
    expect(getArgs(calls[0]).p_stage_code).toBe("FINAL");
    expect(getArgs(calls[0]).p_depends_on_prediction_refs).toEqual([
      "predicted-semi-final-1",
      "predicted-semi-final-2"
    ]);
  });

  it("persists a full prediction set through match, tiebreak, antepost, and completion RPCs", async () => {
    const { client, calls } = createRpcClient({
      save_match_prediction: "match-prediction-id",
      upsert_prediction_tiebreak_override: "tiebreak-id",
      upsert_antepost_prediction: "antepost-id",
      update_prediction_set_completion: predictionSetId
    });
    const repository = new SupabasePredictionRepository(client);

    const result = await repository.savePredictionSet({
      leagueId,
      predictionSet: createPredictionSet()
    });

    expect(result).toEqual({
      predictionSetId,
      matchPredictionIds: ["match-prediction-id"],
      tiebreakOverrideIds: ["tiebreak-id"],
      antepostPredictionIds: ["antepost-id"]
    });
    expect(calls.map((call) => call.fn)).toEqual([
      "save_match_prediction",
      "upsert_prediction_tiebreak_override",
      "upsert_antepost_prediction",
      "update_prediction_set_completion"
    ]);
    expect(getArgs(calls[1])).toMatchObject({
      p_scope: "GROUP",
      p_scope_ref: "group:A",
      p_tie_group_id: tieGroupId,
      p_tied_team_ids: [teamIdA, teamIdB],
      p_affected_positions: [1, 2],
      p_ordered_team_ids: [teamIdA, teamIdB]
    });
    expect(getArgs(calls[2]).p_selected_payload).toEqual({
      selectedTeamId: teamIdA,
      numericValue: 6
    });
  });

  it("persists rule edits and lock snapshots through rule RPCs", async () => {
    const { client, calls } = createRpcClient({
      update_stage_scoring_rule_value: ruleVersionId,
      update_antepost_scoring_rule_value: ruleVersionId,
      lock_scoring_rule_snapshot: ruleVersionId
    });
    const repository = new SupabaseRuleRepository(client);

    await repository.updateStageRuleValue({
      leagueId,
      stage: "FINAL",
      field: "exactScore",
      value: 120
    });
    await repository.updateAntepostRuleValue({
      leagueId,
      field: "topScorerExactGoals",
      value: 55
    });
    await repository.lockScoringRuleSnapshot(leagueId);

    expect(calls.map((call) => call.fn)).toEqual([
      "update_stage_scoring_rule_value",
      "update_antepost_scoring_rule_value",
      "lock_scoring_rule_snapshot"
    ]);
    expect(getArgs(calls[0]).p_field).toBe("exactScore");
    expect(getArgs(calls[1]).p_field).toBe("topScorerExactGoals");
  });

  it("serializes scoring events, leaderboard entries, and breakdowns for idempotent RPC persistence", async () => {
    const { client, calls } = createRpcClient({
      persist_scoring_recalculation: [{ run_id: runId, snapshot_id: snapshotId }]
    });
    const repository = new SupabaseScoringPersistenceRepository(client);

    const persisted = await repository.persistRecalculation({
      leagueId,
      sourceResultKey: "official-result-v1",
      calculationVersion: "scoring-engine-m3-v1",
      events: [createScoringEvent()],
      leaderboardSnapshot: createLeaderboardSnapshot(),
      breakdowns: [createBreakdown()],
      reason: "official_result_update"
    });

    expect(persisted).toEqual({ runId, snapshotId });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.fn).toBe("persist_scoring_recalculation");

    const args = getArgs(calls[0]);
    expect(args.p_source_result_key).toBe("official-result-v1");
    expect(args.p_events).toEqual([
      expect.objectContaining({
        event_key: scoringEventId,
        event_type: "EXACT_SCORE",
        points: 10
      })
    ]);
    expect(args.p_leaderboard_entries).toEqual([
      expect.objectContaining({
        user_id: userId,
        total_points: 10
      })
    ]);
    expect(args.p_breakdown_items).toEqual([
      expect.objectContaining({
        breakdown_key: `${scoringEventId}:breakdown`,
        event_key: scoringEventId,
        scope: "MATCH"
      })
    ]);
  });

  it("can call scoring persistence twice with the same source result key and final payload", async () => {
    const { client, calls } = createRpcClient({
      persist_scoring_recalculation: [
        [{ run_id: runId, snapshot_id: snapshotId }],
        [{ run_id: secondRunId, snapshot_id: secondSnapshotId }]
      ]
    });
    const repository = new SupabaseScoringPersistenceRepository(client);

    await repository.persistRecalculation({
      leagueId,
      sourceResultKey: "official-result-v1",
      calculationVersion: "scoring-engine-m3-v1",
      events: [createScoringEvent()],
      leaderboardSnapshot: createLeaderboardSnapshot(),
      breakdowns: [createBreakdown()],
      reason: "official_result_update"
    });
    const persisted = await repository.persistRecalculation({
      leagueId,
      sourceResultKey: "official-result-v1",
      calculationVersion: "scoring-engine-m3-v1",
      events: [createScoringEvent({ points: 12, reason: "Risultato corretto dopo rettifica" })],
      leaderboardSnapshot: createLeaderboardSnapshot({
        totalPoints: 12,
        latestPoints: 12,
        snapshotId: secondSnapshotId
      }),
      breakdowns: [createBreakdown({ points: 12, reason: "Risultato corretto dopo rettifica" })],
      reason: "official_result_correction"
    });

    expect(persisted).toEqual({ runId: secondRunId, snapshotId: secondSnapshotId });
    expect(calls).toHaveLength(2);
    expect(getArgs(calls[0]).p_source_result_key).toBe("official-result-v1");
    expect(getArgs(calls[1]).p_source_result_key).toBe("official-result-v1");
    expect(getArgs(calls[1]).p_events).toEqual([
      expect.objectContaining({
        points: 12,
        reason: "Risultato corretto dopo rettifica"
      })
    ]);
    expect(getArgs(calls[1]).p_leaderboard_entries).toEqual([
      expect.objectContaining({
        total_points: 12,
        latest_points: 12
      })
    ]);
  });
});

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

function createRpcClient(responses: Record<string, unknown>): {
  client: SupabaseRpcClient;
  calls: RpcCall[];
} {
  const calls: RpcCall[] = [];
  const responseIndexes = new Map<string, number>();
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      const response = responses[fn];
      const index = responseIndexes.get(fn) ?? 0;
      responseIndexes.set(fn, index + 1);

      return {
        data: Array.isArray(response) && Array.isArray(response[0]) ? response[index] : response,
        error: null
      };
    }
  } as unknown as SupabaseRpcClient;

  return { client, calls };
}

function getArgs(call: RpcCall | undefined): Record<string, unknown> {
  if (!call) {
    throw new Error("Expected RPC call.");
  }

  return call.args;
}

function createMatchPrediction(overrides: Partial<MatchPrediction> = {}): MatchPrediction {
  return {
    id: "prediction-id",
    predictionSetId,
    matchId: matchId,
    stageCode: "GROUP_STAGE",
    homeGoals: 2,
    awayGoals: 1,
    syncStatus: "SYNCED",
    updatedAtUtc: "2030-06-08T18:00:00.000Z",
    ...overrides
  };
}

function createPredictionSet(): PredictionSet {
  return {
    id: predictionSetId,
    leagueId,
    userId,
    status: "complete",
    totalRequired: 3,
    completedItems: 3,
    unsyncedItems: 0,
    matchPredictions: [createMatchPrediction()],
    tiebreakOverrides: [
      {
        id: "tiebreak-row-id",
        predictionSetId,
        scope: "GROUP",
        scopeRef: "group:A",
        tieGroupId,
        tiedTeamIds: [teamIdA, teamIdB],
        affectedPositions: [1, 2],
        orderedTeamIds: [teamIdA, teamIdB],
        reason: "Manual tie-break",
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-08T18:00:00.000Z"
      }
    ],
    antepostPredictions: [
      {
        id: "antepost-row-id",
        predictionSetId,
        definitionId: antepostDefinitionId,
        selectedTeamId: teamIdA,
        numericValue: 6,
        syncStatus: "SYNCED",
        updatedAtUtc: "2030-06-08T18:00:00.000Z"
      }
    ],
    lastServerSyncedAtUtc: "2030-06-08T18:00:00.000Z"
  };
}

function createScoringEvent(
  overrides: Partial<Pick<ScoringEvent, "points" | "reason">> = {}
): ScoringEvent {
  return {
    id: scoringEventId,
    leagueId,
    participantUserId: userId,
    competitionEditionId,
    referenceId: matchId,
    scoringRuleVersionId: ruleVersionId,
    type: "EXACT_SCORE",
    points: 10,
    reason: "Risultato esatto",
    calculationVersion: "scoring-engine-m3-v1",
    createdAtUtc: "2030-06-08T21:00:00.000Z",
    sourceResultVersion: "official-result-v1",
    ...overrides
  };
}

function createLeaderboardSnapshot(
  overrides: { latestPoints?: number; snapshotId?: string; totalPoints?: number } = {}
): LeaderboardSnapshot {
  return {
    id: overrides.snapshotId ?? snapshotId,
    leagueId,
    createdAtUtc: "2030-06-08T21:00:00.000Z",
    sourceResultVersion: "official-result-v1",
    entries: [
      {
        userId,
        displayName: "Ada",
        avatarInitials: "AD",
        rank: 1,
        totalPoints: overrides.totalPoints ?? 10,
        latestPoints: overrides.latestPoints ?? 10,
        positionDelta: 1,
        tied: false
      }
    ]
  };
}

function createBreakdown(
  overrides: { points?: number; reason?: string } = {}
): UserScoringBreakdown {
  return {
    userId,
    totalPoints: overrides.points ?? 10,
    items: [
      {
        id: `${scoringEventId}:breakdown`,
        participantUserId: userId,
        scope: "MATCH",
        referenceId: matchId,
        stage: "GROUP_STAGE",
        type: "EXACT_SCORE",
        points: overrides.points ?? 10,
        reason: overrides.reason ?? "Risultato esatto"
      }
    ]
  };
}

const leagueId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const predictionSetId = "33333333-3333-4333-8333-333333333333";
const matchId = "44444444-4444-4444-8444-444444444444";
const teamIdA = "55555555-5555-4555-8555-555555555555";
const teamIdB = "66666666-6666-4666-8666-666666666666";
const tieGroupId =
  "group:A:positions:1-2:teams:55555555-5555-4555-8555-555555555555|66666666-6666-4666-8666-666666666666";
const antepostDefinitionId = "77777777-7777-4777-8777-777777777777";
const ruleVersionId = "88888888-8888-4888-8888-888888888888";
const competitionEditionId = "99999999-9999-4999-8999-999999999999";
const scoringEventId = `${leagueId}:${userId}:${matchId}:EXACT_SCORE:official-result-v1`;
const runId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const snapshotId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const secondRunId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const secondSnapshotId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
