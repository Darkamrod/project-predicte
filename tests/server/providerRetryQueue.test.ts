import { describe, expect, it } from "vitest";

import {
  classifyProviderImportFailure,
  createProviderImportRetryPlan,
  isRetryCandidateDue
} from "@/server/results/retryQueue";
import { SupabaseProviderResultImportRepository } from "@/server/results/supabaseProviderResultImportRepository";
import type { SupabaseRpcClient } from "@/services/supabase/rpcClient";

describe("Milestone 7 provider retry queue foundation", () => {
  it("classifies scheduled failures as retryable while attempts remain", () => {
    expect(
      classifyProviderImportFailure({
        errorMessage: "Persist failed",
        retryAttempt: 1,
        maxRetries: 3,
        nextRetryAtUtc: "2030-07-16T21:05:00.000Z"
      })
    ).toBe("retryable");
  });

  it("classifies missing correction sources as non-retryable", () => {
    expect(
      classifyProviderImportFailure({
        errorMessage: "Correction source result key was not found.",
        retryAttempt: 0,
        maxRetries: 3,
        nextRetryAtUtc: "2030-07-16T21:05:00.000Z"
      })
    ).toBe("non_retryable");
  });

  it("creates retry plans without scheduling non-retryable failures", () => {
    expect(
      createProviderImportRetryPlan({
        errorMessage: "Correction source result key was not found.",
        retryAttempt: 0,
        maxRetries: 3,
        nextRetryAtUtc: "2030-07-16T21:05:00.000Z"
      })
    ).toEqual({
      failureKind: "non_retryable",
      retryAttempt: 0,
      maxRetries: 3
    });
  });

  it("detects due retry candidates using UTC timestamps", () => {
    expect(
      isRetryCandidateDue(
        {
          leagueId: "league-id",
          provider: "MOCK_RESULTS",
          externalFixtureKey: "fixture-id",
          sourceResultKey: "source-id",
          retryAttempt: 1,
          maxRetries: 2,
          nextRetryAtUtc: "2030-07-16T21:05:00.000Z"
        },
        "2030-07-16T21:06:00.000Z"
      )
    ).toBe(true);
  });

  it("loads retry candidates through the service-role provider import RPC contract", async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const repository = new SupabaseProviderResultImportRepository({
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });

        return {
          data: [
            {
              league_id: "league-id",
              provider: "MOCK_RESULTS",
              external_fixture_key: "fixture-id",
              source_result_key: "source-id",
              correction_of_source_result_key: null,
              retry_attempt: 1,
              max_retries: 3,
              next_retry_at: "2030-07-16T21:05:00.000Z",
              error_message: "Persist failed"
            }
          ],
          error: null
        };
      }
    } as unknown as SupabaseRpcClient);

    const candidates = await repository.listRetryCandidates(25);

    expect(calls).toEqual([
      {
        fn: "trusted_provider_retry_candidates",
        args: { p_limit: 25 }
      }
    ]);
    expect(candidates).toEqual([
      {
        leagueId: "league-id",
        provider: "MOCK_RESULTS",
        externalFixtureKey: "fixture-id",
        sourceResultKey: "source-id",
        retryAttempt: 1,
        maxRetries: 3,
        nextRetryAtUtc: "2030-07-16T21:05:00.000Z",
        errorMessage: "Persist failed"
      }
    ]);
  });
});
