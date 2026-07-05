import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type {
  OfficialTournamentResultSet,
  ScoringEvent,
  UserScoringBreakdown
} from "@/domain/scoring/types";
import { SupabaseTrustedScoringRepository } from "@/server/scoring/supabaseTrustedScoringRepository";
import type { SupabaseRpcClient } from "@/services/supabase/rpcClient";

vi.mock("@/services/supabase/client", () => ({
  requireSupabaseClient: () => {
    throw new Error("Tests inject a fake Supabase RPC client.");
  }
}));

const milestone5Migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260705010000_milestone5_trusted_scoring_execution.sql"
  ),
  "utf8"
);
const decisionsDoc = readFileSync(join(process.cwd(), "docs/DECISIONS.md"), "utf8");
const scoringEngineDoc = readFileSync(join(process.cwd(), "docs/SCORING_ENGINE.md"), "utf8");
const dataModelDoc = readFileSync(join(process.cwd(), "docs/DATA_MODEL.md"), "utf8");
const securityDoc = readFileSync(join(process.cwd(), "docs/SECURITY.md"), "utf8");
const gitignore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");

describe("Milestone 5 trusted scoring migration contract", () => {
  it("adds service-role-only result ingestion audit rows", () => {
    expect(milestone5Migration).toContain(
      "create table if not exists public.result_ingestion_runs"
    );
    expect(milestone5Migration).toContain("correction_of_source_result_key");
    expect(milestone5Migration).toContain("record_trusted_result_ingestion");
    expect(milestone5Migration).toContain("Trusted result ingestion requires service role");
    expect(milestone5Migration).toContain("to service_role");
    expect(milestone5Migration).not.toMatch(
      /grant execute on function public\.record_trusted_result_ingestion[\s\S]*to authenticated/i
    );
  });

  it("restricts official scoring persistence to service-role execution", () => {
    expect(milestone5Migration).toContain("Trusted scoring persistence requires service role");
    expect(milestone5Migration).toContain(
      "revoke execute on function public.persist_scoring_recalculation"
    );
    expect(milestone5Migration).toContain("from anon, authenticated");
    expect(milestone5Migration).toContain(
      "grant execute on function public.persist_scoring_recalculation"
    );
    expect(milestone5Migration).toContain("to service_role");
    expect(milestone5Migration).not.toMatch(
      /grant execute on function public\.persist_scoring_recalculation[\s\S]*to authenticated/i
    );
  });

  it("keeps derived scoring rows client-readable but not directly client-writable", () => {
    expect(milestone5Migration).toContain("revoke insert, update, delete on public.scoring_events");
    expect(milestone5Migration).toContain(
      "revoke insert, update, delete on public.leaderboard_snapshots"
    );
    expect(milestone5Migration).toContain(
      "revoke insert, update, delete on public.leaderboard_entries"
    );
    expect(milestone5Migration).toContain(
      "revoke insert, update, delete on public.scoring_breakdown_items"
    );
    expect(milestone5Migration).toContain(
      "revoke insert, update, delete on public.scoring_recalculation_runs"
    );
    expect(milestone5Migration).not.toMatch(/on public\.scoring_events for insert/i);
    expect(milestone5Migration).not.toMatch(/on public\.leaderboard_entries for insert/i);
  });

  it("documents trusted server scoring and result ingestion semantics", () => {
    const docs = `${decisionsDoc}\n${scoringEngineDoc}\n${dataModelDoc}\n${securityDoc}`;

    expect(docs).toContain("Milestone 5");
    expect(docs).toContain("service-role");
    expect(docs).toContain("result_ingestion_runs");
    expect(docs).toContain("source_result_key");
  });

  it("keeps Supabase runtime folders ignored", () => {
    expect(gitignore).toContain("supabase/.temp/");
    expect(gitignore).toContain("supabase/.branches/");
  });

  it("does not introduce excluded money, advertising, wagering, or sports API features", () => {
    expect(milestone5Migration).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
  });
});

describe("Milestone 5 Supabase trusted scoring repository", () => {
  it("records result ingestion and persists scoring through server RPCs", async () => {
    const { client, calls } = createRpcClient({
      record_trusted_result_ingestion: ["ingestion-accepted", "ingestion-scored"],
      persist_scoring_recalculation: [[{ run_id: runId, snapshot_id: snapshotId }]]
    });
    const repository = new SupabaseTrustedScoringRepository(client);

    const acceptedId = await repository.recordResultIngestion({
      leagueId,
      sourceResultKey: "mock-result-v1",
      payload: createResultSet(),
      status: "accepted"
    });
    const persisted = await repository.persistTrustedRecalculation({
      leagueId,
      sourceResultKey: "mock-result-v1",
      calculationVersion: "scoring-engine-m3-v1",
      events: [createScoringEvent()],
      leaderboardSnapshot: createLeaderboardSnapshot(),
      breakdowns: [createBreakdown()],
      reason: "mock_result_ingestion"
    });
    const scoredId = await repository.recordResultIngestion({
      leagueId,
      sourceResultKey: "mock-result-v1",
      payload: createResultSet(),
      status: "scored"
    });

    expect(acceptedId).toBe("ingestion-accepted");
    expect(scoredId).toBe("ingestion-scored");
    expect(persisted).toEqual({ runId, snapshotId });
    expect(calls.map((call) => call.fn)).toEqual([
      "record_trusted_result_ingestion",
      "persist_scoring_recalculation",
      "record_trusted_result_ingestion"
    ]);
    expect(getArgs(calls[0]).p_status).toBe("accepted");
    expect(getArgs(calls[1]).p_source_result_key).toBe("mock-result-v1");
    expect(getArgs(calls[2]).p_status).toBe("scored");
  });
});

interface RpcCall {
  fn: string;
  args: Record<string, unknown>;
}

function createRpcClient(responses: Record<string, unknown[]>): {
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
        data: response?.[index],
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

function createResultSet(): OfficialTournamentResultSet {
  return {
    sourceResultVersion: "mock-result-v1",
    createdAtUtc: "2030-07-15T21:30:00.000Z",
    matchResults: [],
    groupPositions: [],
    stageQualifications: [],
    pairings: [],
    antepost: {}
  };
}

function createScoringEvent(): ScoringEvent {
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
    createdAtUtc: "2030-07-15T21:30:00.000Z",
    sourceResultVersion: "mock-result-v1"
  };
}

function createLeaderboardSnapshot(): LeaderboardSnapshot {
  return {
    id: snapshotId,
    leagueId,
    createdAtUtc: "2030-07-15T21:30:00.000Z",
    sourceResultVersion: "mock-result-v1",
    entries: [
      {
        userId,
        displayName: "Ada",
        avatarInitials: "AD",
        rank: 1,
        totalPoints: 10,
        latestPoints: 10,
        positionDelta: 1,
        tied: false
      }
    ]
  };
}

function createBreakdown(): UserScoringBreakdown {
  return {
    userId,
    totalPoints: 10,
    items: [
      {
        id: `${scoringEventId}:breakdown`,
        participantUserId: userId,
        scope: "MATCH",
        referenceId: matchId,
        stage: "GROUP_STAGE",
        type: "EXACT_SCORE",
        points: 10,
        reason: "Risultato esatto"
      }
    ]
  };
}

const leagueId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const matchId = "33333333-3333-4333-8333-333333333333";
const ruleVersionId = "44444444-4444-4444-8444-444444444444";
const competitionEditionId = "55555555-5555-4555-8555-555555555555";
const scoringEventId = `${leagueId}:${userId}:${matchId}:EXACT_SCORE:mock-result-v1`;
const runId = "66666666-6666-4666-8666-666666666666";
const snapshotId = "77777777-7777-4777-8777-777777777777";
