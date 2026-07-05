import type { Json } from "@/services/supabase/database.types";
import type { SupabaseRpcClient } from "@/services/supabase/rpcClient";
import type { ProviderImportRetryCandidate } from "./retryQueue";
import type {
  ProviderImportRecord,
  ProviderImportRecordInput,
  ProviderResultImportRepository
} from "./types";

export class SupabaseProviderResultImportRepository implements ProviderResultImportRepository {
  constructor(private readonly client: SupabaseRpcClient) {}

  async resultIngestionExists(leagueId: string, sourceResultKey: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("trusted_result_ingestion_exists", {
      p_league_id: leagueId,
      p_source_result_key: sourceResultKey
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async recordProviderImport(input: ProviderImportRecordInput): Promise<ProviderImportRecord> {
    const { data, error } = await this.client.rpc("record_provider_result_import", {
      p_league_id: input.leagueId,
      p_provider: input.provider,
      p_external_fixture_key: input.externalFixtureKey,
      p_source_result_key: input.sourceResultKey,
      p_payload: input.payload as Json,
      p_status: input.status,
      p_correction_of_source_result_key: input.correctionOfSourceResultKey ?? null,
      p_error_message: input.errorMessage ?? null,
      p_retry_attempt: input.retryAttempt,
      p_max_retries: input.maxRetries,
      p_next_retry_at: input.nextRetryAtUtc ?? null
    });

    if (error) {
      throw error;
    }

    const record = data[0];

    if (!record) {
      throw new Error("Provider result import RPC did not return a record.");
    }

    return {
      syncRunId: record.sync_run_id,
      providerPayloadId: record.provider_payload_id,
      ingestionRunId: record.ingestion_run_id
    };
  }

  async listRetryCandidates(limit = 50): Promise<ProviderImportRetryCandidate[]> {
    const { data, error } = await this.client.rpc("trusted_provider_retry_candidates", {
      p_limit: limit
    });

    if (error) {
      throw error;
    }

    return data.flatMap((candidate) => {
      if (
        candidate.provider !== "MOCK_RESULTS" ||
        !candidate.external_fixture_key ||
        !candidate.next_retry_at
      ) {
        return [];
      }

      return [
        {
          leagueId: candidate.league_id,
          provider: "MOCK_RESULTS",
          externalFixtureKey: candidate.external_fixture_key,
          sourceResultKey: candidate.source_result_key,
          retryAttempt: candidate.retry_attempt,
          maxRetries: candidate.max_retries,
          nextRetryAtUtc: candidate.next_retry_at,
          ...(candidate.correction_of_source_result_key
            ? { correctionOfSourceResultKey: candidate.correction_of_source_result_key }
            : {}),
          ...(candidate.error_message ? { errorMessage: candidate.error_message } : {})
        }
      ];
    });
  }
}
