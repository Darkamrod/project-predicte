import { describe, expect, it, vi } from "vitest";

import {
  LEAGUE_READ_DEFAULT_PAGE_SIZE,
  LEAGUE_READ_MAX_PAGE_SIZE,
  resolveLeagueReadPagination,
  SupabaseLeagueReadRepository,
  type SupabaseReadClient
} from "@/services/leagues/supabaseLeagueReadRepository";
import { resolvePagination } from "@/services/pagination";

vi.mock("@/services/supabase/client", () => ({
  requireSupabaseClient: () => {
    throw new Error("Tests inject a fake Supabase read client.");
  }
}));

describe("pagination helpers", () => {
  it("uses safe defaults and inclusive Supabase ranges", () => {
    expect(resolvePagination()).toEqual({
      page: 1,
      pageSize: 50,
      from: 0,
      to: 49
    });
    expect(resolvePagination({ page: 3, pageSize: 25 })).toEqual({
      page: 3,
      pageSize: 25,
      from: 50,
      to: 74
    });
  });

  it("caps page size for league read repositories", () => {
    expect(resolveLeagueReadPagination({ pageSize: 500 })).toMatchObject({
      page: 1,
      pageSize: LEAGUE_READ_MAX_PAGE_SIZE,
      from: 0,
      to: 99
    });
    expect(LEAGUE_READ_DEFAULT_PAGE_SIZE).toBe(50);
    expect(LEAGUE_READ_MAX_PAGE_SIZE).toBe(100);
  });
});

describe("SupabaseLeagueReadRepository", () => {
  it("lists active league members with default pagination when callers omit options", async () => {
    const { client, calls } = createReadClient({
      league_members: {
        data: [
          {
            league_id: leagueId,
            user_id: userId,
            role: "participant",
            status: "active",
            joined_at: "2030-06-01T10:00:00.000Z",
            removed_at: null
          }
        ],
        count: 1
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listLeagueMembers(leagueId);

    expect(page.items).toEqual([
      {
        leagueId,
        userId,
        role: "participant",
        status: "active",
        joinedAtUtc: "2030-06-01T10:00:00.000Z"
      }
    ]);
    expect(page.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
      totalItems: 1,
      hasNextPage: false
    });
    expect(calls[0]).toMatchObject({
      table: "league_members",
      range: { from: 0, to: 49 }
    });
    expect(calls[0]?.filters).toContainEqual({
      column: "league_id",
      value: leagueId
    });
    expect(calls[0]?.filters).toContainEqual({
      column: "status",
      value: "active"
    });
  });

  it("paginates league member reads without mutating Supabase data", async () => {
    const { client, calls } = createReadClient({
      league_members: {
        data: [
          {
            league_id: leagueId,
            user_id: userId,
            role: "participant",
            status: "active",
            joined_at: "2030-06-01T10:00:00.000Z",
            removed_at: null
          }
        ],
        count: 60
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listLeagueMembers(leagueId, {
      page: 2,
      pageSize: 20
    });

    expect(page.items).toHaveLength(1);
    expect(page.pagination).toMatchObject({
      page: 2,
      pageSize: 20,
      totalItems: 60,
      totalPages: 3,
      hasNextPage: true
    });
    expect(calls[0]).toMatchObject({
      table: "league_members",
      range: { from: 20, to: 39 }
    });
    expect(calls[0]?.filters).toContainEqual({ column: "league_id", value: leagueId });
    expect(calls[0]?.filters).toContainEqual({ column: "status", value: "active" });
    expect(calls[0]?.mutations).toEqual([]);
  });

  it("caps leaderboard entry reads and computes the second page range", async () => {
    const { client, calls } = createReadClient({
      leaderboard_entries: {
        data: [
          {
            snapshot_id: snapshotId,
            user_id: userId,
            rank: 101,
            total_points: 42,
            latest_points: 7,
            position_delta: -1,
            tied: false
          }
        ],
        count: 250
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listLeaderboardEntries(snapshotId, {
      page: 2,
      pageSize: 500
    });

    expect(page.items[0]).toMatchObject({
      snapshotId,
      userId,
      rank: 101,
      totalPoints: 42
    });
    expect(page.pagination).toMatchObject({
      page: 2,
      pageSize: 100,
      totalItems: 250,
      totalPages: 3,
      hasNextPage: true
    });
    expect(calls[0]).toMatchObject({
      table: "leaderboard_entries",
      range: { from: 100, to: 199 }
    });
  });

  it("reads latest leaderboard snapshot through a one-row paginated query", async () => {
    const { client, calls } = createReadClient({
      leaderboard_snapshots: {
        data: [
          {
            id: snapshotId,
            league_id: leagueId,
            source_result_key: "official-result-v1",
            created_at: "2030-06-08T21:00:00.000Z"
          }
        ],
        count: 12
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const snapshot = await repository.getLatestLeaderboardSnapshot(leagueId);

    expect(snapshot).toEqual({
      id: snapshotId,
      leagueId,
      sourceResultKey: "official-result-v1",
      createdAtUtc: "2030-06-08T21:00:00.000Z"
    });
    expect(calls[0]).toMatchObject({
      table: "leaderboard_snapshots",
      range: { from: 0, to: 0 }
    });
  });

  it("lists latest leaderboard entries by league id and returns an empty page when no snapshot exists", async () => {
    const { client, calls } = createReadClient({
      leaderboard_snapshots: {
        data: [],
        count: 0
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listLatestLeaderboardEntriesForLeague(leagueId, {
      pageSize: 20
    });

    expect(page.snapshot).toBeUndefined();
    expect(page.entries.items).toEqual([]);
    expect(page.entries.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      totalItems: 0,
      hasNextPage: false
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: "leaderboard_snapshots",
      range: { from: 0, to: 0 }
    });
    expect(calls[0]?.filters).toEqual([{ column: "league_id", value: leagueId }]);
    expect(calls[0]?.mutations).toEqual([]);
  });

  it("discovers the latest league snapshot before paginating leaderboard entries", async () => {
    const { client, calls } = createReadClient({
      leaderboard_snapshots: {
        data: [
          {
            id: snapshotId,
            league_id: leagueId,
            source_result_key: "official-result-v1",
            created_at: "2030-06-08T21:00:00.000Z"
          }
        ],
        count: 1
      },
      leaderboard_entries: {
        data: [
          {
            snapshot_id: snapshotId,
            user_id: userId,
            rank: 101,
            total_points: 42,
            latest_points: 7,
            position_delta: -1,
            tied: false
          }
        ],
        count: 250
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listLatestLeaderboardEntriesForLeague(leagueId, {
      page: 2,
      pageSize: 500
    });

    expect(page.snapshot).toMatchObject({
      id: snapshotId,
      leagueId
    });
    expect(page.entries.items[0]).toMatchObject({
      snapshotId,
      userId,
      rank: 101,
      totalPoints: 42
    });
    expect(page.entries.pagination).toMatchObject({
      page: 2,
      pageSize: 100,
      totalItems: 250,
      totalPages: 3,
      hasNextPage: true
    });
    expect(calls.map((call) => call.table)).toEqual([
      "leaderboard_snapshots",
      "leaderboard_entries"
    ]);
    expect(calls[0]).toMatchObject({
      table: "leaderboard_snapshots",
      range: { from: 0, to: 0 }
    });
    expect(calls[0]?.filters).toEqual([{ column: "league_id", value: leagueId }]);
    expect(calls[1]).toMatchObject({
      table: "leaderboard_entries",
      range: { from: 100, to: 199 }
    });
    expect(calls[1]?.filters).toEqual([{ column: "snapshot_id", value: snapshotId }]);
    expect(calls.flatMap((call) => call.mutations)).toEqual([]);
  });

  it("keeps scoring breakdown reads scoped and paginated without writing official scoring", async () => {
    const { client, calls } = createReadClient({
      scoring_breakdown_items: {
        data: [
          {
            id: "breakdown-1",
            league_id: leagueId,
            participant_user_id: userId,
            source_result_key: "official-result-v1",
            scope: "MATCH",
            reference_id: "match-1",
            stage: "GROUP_STAGE",
            event_type: "EXACT_SCORE",
            points: 10,
            reason: "Risultato esatto",
            created_at: "2030-06-08T21:00:00.000Z"
          }
        ],
        count: 1
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listScoringBreakdownItems(leagueId, {
      sourceResultKey: "official-result-v1",
      participantUserId: userId,
      pageSize: 20
    });

    expect(page.items[0]).toMatchObject({
      leagueId,
      participantUserId: userId,
      sourceResultKey: "official-result-v1",
      points: 10
    });
    expect(calls[0]?.filters).toEqual([
      { column: "league_id", value: leagueId },
      { column: "source_result_key", value: "official-result-v1" },
      { column: "participant_user_id", value: userId }
    ]);
    expect(calls[0]?.range).toEqual({ from: 0, to: 19 });
    expect(calls[0]?.mutations).toEqual([]);
  });

  it("lists prediction-set summaries with status filters and bounded ranges", async () => {
    const { client, calls } = createReadClient({
      prediction_sets: {
        data: [
          {
            id: "prediction-set-1",
            league_id: leagueId,
            user_id: userId,
            status: "complete",
            total_required: 64,
            completed_items: 64,
            unsynced_items: 0,
            completed_at: "2030-06-08T18:00:00.000Z",
            last_server_synced_at: "2030-06-08T18:01:00.000Z"
          }
        ],
        count: 1
      }
    });
    const repository = new SupabaseLeagueReadRepository(client);

    const page = await repository.listPredictionSetSummaries(leagueId, {
      status: "complete",
      pageSize: 10
    });

    expect(page.items[0]).toMatchObject({
      id: "prediction-set-1",
      status: "complete",
      totalRequired: 64,
      completedItems: 64
    });
    expect(calls[0]?.filters).toContainEqual({ column: "status", value: "complete" });
    expect(calls[0]?.range).toEqual({ from: 0, to: 9 });
  });
});

const leagueId = "00000000-0000-4000-8000-000000000100";
const snapshotId = "00000000-0000-4000-8000-000000000101";
const userId = "00000000-0000-4000-8000-000000000102";

interface QueryResult {
  data: QueryRow[];
  count: number | null;
  error: null;
}

type QueryRow = Record<string, unknown>;

interface QueryCall {
  table: string;
  select?: { columns: string; count?: string | undefined } | undefined;
  filters: { column: string; value: unknown }[];
  orders: { column: string; ascending?: boolean | undefined }[];
  range?: { from: number; to: number } | undefined;
  mutations: string[];
}

function createReadClient(results: Record<string, { count?: number; data: QueryRow[] }>): {
  calls: QueryCall[];
  client: SupabaseReadClient;
} {
  const calls: QueryCall[] = [];
  const client = {
    from: (table: string) => new FakeQueryBuilder(table, results[table] ?? { data: [] }, calls)
  } as unknown as SupabaseReadClient;

  return { calls, client };
}

class FakeQueryBuilder implements PromiseLike<QueryResult> {
  private readonly call: QueryCall;

  constructor(
    table: string,
    private readonly result: { count?: number; data: QueryRow[] },
    calls: QueryCall[]
  ) {
    this.call = {
      table,
      filters: [],
      orders: [],
      mutations: []
    };
    calls.push(this.call);
  }

  select(columns: string, options?: { count?: string | undefined }): this {
    this.call.select = {
      columns,
      ...(options?.count ? { count: options.count } : {})
    };
    return this;
  }

  eq(column: string, value: unknown): this {
    this.call.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean | undefined }): this {
    this.call.orders.push({
      column,
      ...(options?.ascending !== undefined ? { ascending: options.ascending } : {})
    });
    return this;
  }

  range(from: number, to: number): this {
    this.call.range = { from, to };
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
      count: this.result.count ?? this.result.data.length,
      error: null
    }).then(onfulfilled, onrejected);
  }
}
