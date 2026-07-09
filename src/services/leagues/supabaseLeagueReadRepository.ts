import type { SupabaseClient } from "@supabase/supabase-js";

import type { PaginatedResult, PaginationInput, ResolvedPagination } from "@/services/pagination";
import {
  createPaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  resolvePagination
} from "@/services/pagination";
import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database } from "@/services/supabase/database.types";

export const LEAGUE_READ_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const LEAGUE_READ_MAX_PAGE_SIZE = MAX_PAGE_SIZE;

export type SupabaseReadClient = Pick<SupabaseClient<Database>, "from">;
type LeagueMemberRow = Database["public"]["Tables"]["league_members"]["Row"];
type LeagueInviteRow = Database["public"]["Tables"]["league_invites"]["Row"];
type PredictionSetRow = Database["public"]["Tables"]["prediction_sets"]["Row"];
type LeaderboardSnapshotRow = Database["public"]["Tables"]["leaderboard_snapshots"]["Row"];
type LeaderboardEntryRow = Database["public"]["Tables"]["leaderboard_entries"]["Row"];
type ScoringBreakdownRow = Database["public"]["Tables"]["scoring_breakdown_items"]["Row"];
type MemberStatus = Database["public"]["Enums"]["member_status"];
type PredictionSetStatus = Database["public"]["Enums"]["prediction_set_status"];

export interface LeagueMemberListItem {
  leagueId: string;
  userId: string;
  role: LeagueMemberRow["role"];
  status: LeagueMemberRow["status"];
  joinedAtUtc: string;
  removedAtUtc?: string | undefined;
}

export interface LeagueInviteListItem {
  id: string;
  leagueId: string;
  createdByUserId: string;
  createdAtUtc: string;
  expiresAtUtc?: string | undefined;
  maxUses?: number | undefined;
  uses: number;
  revokedAtUtc?: string | undefined;
}

export interface PredictionSetSummaryItem {
  id: string;
  leagueId: string;
  userId: string;
  status: PredictionSetRow["status"];
  totalRequired: number;
  completedItems: number;
  unsyncedItems: number;
  completedAtUtc?: string | undefined;
  lastServerSyncedAtUtc?: string | undefined;
}

export interface LeaderboardSnapshotSummaryItem {
  id: string;
  leagueId: string;
  sourceResultKey: string;
  createdAtUtc: string;
}

export interface LeaderboardEntryListItem {
  snapshotId: string;
  userId: string;
  rank: number;
  totalPoints: number;
  latestPoints: number;
  positionDelta: number;
  tied: boolean;
}

export interface ScoringBreakdownListItem {
  id: string;
  leagueId: string;
  participantUserId: string;
  sourceResultKey: string;
  scope: string;
  referenceId: string;
  stage?: string | undefined;
  eventType: string;
  points: number;
  reason: string;
  createdAtUtc: string;
}

export interface LeagueMemberListOptions extends PaginationInput {
  status?: MemberStatus | "all" | undefined;
}

export interface PredictionSetSummaryListOptions extends PaginationInput {
  status?: PredictionSetStatus | undefined;
}

export interface ScoringBreakdownListOptions extends PaginationInput {
  sourceResultKey?: string | undefined;
  participantUserId?: string | undefined;
}

export class SupabaseLeagueReadRepository {
  constructor(private readonly client?: SupabaseReadClient) {}

  async listLeagueMembers(
    leagueId: string,
    options: LeagueMemberListOptions = {}
  ): Promise<PaginatedResult<LeagueMemberListItem>> {
    const pagination = resolveLeagueReadPagination(options);
    let query = resolveSupabaseReadClient(this.client)
      .from("league_members")
      .select("league_id,user_id,role,status,joined_at,removed_at", { count: "exact" })
      .eq("league_id", leagueId);

    if (options.status !== "all") {
      query = query.eq("status", options.status ?? "active");
    }

    const { data, error, count } = await query
      .order("joined_at", { ascending: true })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapLeagueMember), pagination, count);
  }

  async listLeagueInvites(
    leagueId: string,
    options: PaginationInput = {}
  ): Promise<PaginatedResult<LeagueInviteListItem>> {
    const pagination = resolveLeagueReadPagination(options);
    const { data, error, count } = await resolveSupabaseReadClient(this.client)
      .from("league_invites")
      .select("id,league_id,created_by,created_at,expires_at,max_uses,uses,revoked_at", {
        count: "exact"
      })
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapLeagueInvite), pagination, count);
  }

  async listPredictionSetSummaries(
    leagueId: string,
    options: PredictionSetSummaryListOptions = {}
  ): Promise<PaginatedResult<PredictionSetSummaryItem>> {
    const pagination = resolveLeagueReadPagination(options);
    let query = resolveSupabaseReadClient(this.client)
      .from("prediction_sets")
      .select(
        "id,league_id,user_id,status,total_required,completed_items,unsynced_items,completed_at,last_server_synced_at",
        { count: "exact" }
      )
      .eq("league_id", leagueId);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query
      .order("user_id", { ascending: true })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapPredictionSetSummary), pagination, count);
  }

  async listLeaderboardSnapshots(
    leagueId: string,
    options: PaginationInput = {}
  ): Promise<PaginatedResult<LeaderboardSnapshotSummaryItem>> {
    const pagination = resolveLeagueReadPagination(options);
    const { data, error, count } = await resolveSupabaseReadClient(this.client)
      .from("leaderboard_snapshots")
      .select("id,league_id,source_result_key,created_at", { count: "exact" })
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapLeaderboardSnapshot), pagination, count);
  }

  async getLatestLeaderboardSnapshot(
    leagueId: string
  ): Promise<LeaderboardSnapshotSummaryItem | undefined> {
    const snapshots = await this.listLeaderboardSnapshots(leagueId, { pageSize: 1 });

    return snapshots.items[0];
  }

  async listLeaderboardEntries(
    snapshotId: string,
    options: PaginationInput = {}
  ): Promise<PaginatedResult<LeaderboardEntryListItem>> {
    const pagination = resolveLeagueReadPagination(options);
    const { data, error, count } = await resolveSupabaseReadClient(this.client)
      .from("leaderboard_entries")
      .select("snapshot_id,user_id,rank,total_points,latest_points,position_delta,tied", {
        count: "exact"
      })
      .eq("snapshot_id", snapshotId)
      .order("rank", { ascending: true })
      .order("user_id", { ascending: true })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapLeaderboardEntry), pagination, count);
  }

  async listScoringBreakdownItems(
    leagueId: string,
    options: ScoringBreakdownListOptions = {}
  ): Promise<PaginatedResult<ScoringBreakdownListItem>> {
    const pagination = resolveLeagueReadPagination(options);
    let query = resolveSupabaseReadClient(this.client)
      .from("scoring_breakdown_items")
      .select(
        "id,league_id,participant_user_id,source_result_key,scope,reference_id,stage,event_type,points,reason,created_at",
        { count: "exact" }
      )
      .eq("league_id", leagueId);

    if (options.sourceResultKey) {
      query = query.eq("source_result_key", options.sourceResultKey);
    }

    if (options.participantUserId) {
      query = query.eq("participant_user_id", options.participantUserId);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(pagination.from, pagination.to);

    if (error) {
      throw error;
    }

    return createPaginatedResult((data ?? []).map(mapScoringBreakdown), pagination, count);
  }
}

export function resolveLeagueReadPagination(input: PaginationInput = {}): ResolvedPagination {
  return resolvePagination(input, {
    defaultPageSize: LEAGUE_READ_DEFAULT_PAGE_SIZE,
    maxPageSize: LEAGUE_READ_MAX_PAGE_SIZE
  });
}

function resolveSupabaseReadClient(client?: SupabaseReadClient): SupabaseReadClient {
  return client ?? requireSupabaseClient();
}

function mapLeagueMember(row: LeagueMemberRow): LeagueMemberListItem {
  return {
    leagueId: row.league_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAtUtc: row.joined_at,
    ...(row.removed_at ? { removedAtUtc: row.removed_at } : {})
  };
}

function mapLeagueInvite(
  row: Pick<
    LeagueInviteRow,
    | "created_at"
    | "created_by"
    | "expires_at"
    | "id"
    | "league_id"
    | "max_uses"
    | "revoked_at"
    | "uses"
  >
): LeagueInviteListItem {
  return {
    id: row.id,
    leagueId: row.league_id,
    createdByUserId: row.created_by,
    createdAtUtc: row.created_at,
    uses: row.uses,
    ...(row.expires_at ? { expiresAtUtc: row.expires_at } : {}),
    ...(row.max_uses !== null ? { maxUses: row.max_uses } : {}),
    ...(row.revoked_at ? { revokedAtUtc: row.revoked_at } : {})
  };
}

function mapPredictionSetSummary(row: PredictionSetRow): PredictionSetSummaryItem {
  return {
    id: row.id,
    leagueId: row.league_id,
    userId: row.user_id,
    status: row.status,
    totalRequired: row.total_required,
    completedItems: row.completed_items,
    unsyncedItems: row.unsynced_items,
    ...(row.completed_at ? { completedAtUtc: row.completed_at } : {}),
    ...(row.last_server_synced_at ? { lastServerSyncedAtUtc: row.last_server_synced_at } : {})
  };
}

function mapLeaderboardSnapshot(
  row: Pick<LeaderboardSnapshotRow, "created_at" | "id" | "league_id" | "source_result_key">
): LeaderboardSnapshotSummaryItem {
  return {
    id: row.id,
    leagueId: row.league_id,
    sourceResultKey: row.source_result_key,
    createdAtUtc: row.created_at
  };
}

function mapLeaderboardEntry(row: LeaderboardEntryRow): LeaderboardEntryListItem {
  return {
    snapshotId: row.snapshot_id,
    userId: row.user_id,
    rank: row.rank,
    totalPoints: row.total_points,
    latestPoints: row.latest_points,
    positionDelta: row.position_delta,
    tied: row.tied
  };
}

function mapScoringBreakdown(
  row: Pick<
    ScoringBreakdownRow,
    | "created_at"
    | "event_type"
    | "id"
    | "league_id"
    | "participant_user_id"
    | "points"
    | "reason"
    | "reference_id"
    | "scope"
    | "source_result_key"
    | "stage"
  >
): ScoringBreakdownListItem {
  return {
    id: row.id,
    leagueId: row.league_id,
    participantUserId: row.participant_user_id,
    sourceResultKey: row.source_result_key,
    scope: row.scope,
    referenceId: row.reference_id,
    eventType: row.event_type,
    points: row.points,
    reason: row.reason,
    createdAtUtc: row.created_at,
    ...(row.stage ? { stage: row.stage } : {})
  };
}
