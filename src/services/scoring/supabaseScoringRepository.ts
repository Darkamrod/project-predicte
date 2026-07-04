import type { LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type { ScoringEvent, UserScoringBreakdown } from "@/domain/scoring/types";
import type { Json } from "@/services/supabase/database.types";
import { resolveSupabaseRpcClient, type SupabaseRpcClient } from "@/services/supabase/rpcClient";

export interface PersistScoringRecalculationInput {
  leagueId: string;
  sourceResultKey: string;
  calculationVersion: string;
  events: ScoringEvent[];
  leaderboardSnapshot: LeaderboardSnapshot;
  breakdowns: UserScoringBreakdown[];
  reason: string;
}

export interface PersistedScoringRecalculation {
  runId: string;
  snapshotId: string;
}

export class SupabaseScoringRepository {
  constructor(private readonly client?: SupabaseRpcClient) {}

  async persistRecalculation(
    input: PersistScoringRecalculationInput
  ): Promise<PersistedScoringRecalculation> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("persist_scoring_recalculation", {
      p_league_id: input.leagueId,
      p_source_result_key: input.sourceResultKey,
      p_calculation_version: input.calculationVersion,
      p_events: createEventsPayload(input.events),
      p_leaderboard_entries: createLeaderboardEntriesPayload(input.leaderboardSnapshot),
      p_breakdown_items: createBreakdownPayload(input.breakdowns),
      p_reason: input.reason
    });

    if (error) {
      throw error;
    }

    const persisted = data[0];

    if (!persisted) {
      throw new Error("Scoring recalculation RPC did not return a run.");
    }

    return {
      runId: persisted.run_id,
      snapshotId: persisted.snapshot_id
    };
  }
}

function createEventsPayload(events: ScoringEvent[]): Json {
  return events.map((event) => ({
    event_key: event.id,
    participant_user_id: event.participantUserId,
    reference_id: event.referenceId,
    scoring_rule_version_id: event.scoringRuleVersionId,
    event_type: event.type,
    points: event.points,
    reason: event.reason,
    calculation_version: event.calculationVersion,
    created_at: event.createdAtUtc
  }));
}

function createLeaderboardEntriesPayload(snapshot: LeaderboardSnapshot): Json {
  return snapshot.entries.map((entry) => ({
    user_id: entry.userId,
    rank: entry.rank,
    total_points: entry.totalPoints,
    latest_points: entry.latestPoints,
    position_delta: entry.positionDelta,
    tied: entry.tied
  }));
}

function createBreakdownPayload(breakdowns: UserScoringBreakdown[]): Json {
  return breakdowns.flatMap((breakdown) =>
    breakdown.items.map((item) => ({
      breakdown_key: item.id,
      event_key: getEventKeyFromBreakdownKey(item.id),
      participant_user_id: item.participantUserId,
      scope: item.scope,
      reference_id: item.referenceId,
      stage: item.stage ?? null,
      event_type: item.type,
      points: item.points,
      reason: item.reason
    }))
  );
}

function getEventKeyFromBreakdownKey(breakdownKey: string): string {
  return breakdownKey.endsWith(":breakdown")
    ? breakdownKey.slice(0, -":breakdown".length)
    : breakdownKey;
}
