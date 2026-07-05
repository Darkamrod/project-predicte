import {
  SupabaseScoringPersistenceRepository,
  type PersistScoringRecalculationInput,
  type PersistedScoringRecalculation
} from "@/server/scoring/supabaseScoringPersistenceRepository";
import type { Json } from "@/services/supabase/database.types";
import type { SupabaseRpcClient } from "@/services/supabase/rpcClient";
import type {
  TrustedResultIngestionInput,
  TrustedResultIngestionRepository,
  TrustedScoringPersistence
} from "./types";

export class SupabaseTrustedScoringRepository
  implements TrustedResultIngestionRepository, TrustedScoringPersistence
{
  private readonly scoringRepository: SupabaseScoringPersistenceRepository;

  constructor(private readonly client: SupabaseRpcClient) {
    this.scoringRepository = new SupabaseScoringPersistenceRepository(client);
  }

  async recordResultIngestion(input: TrustedResultIngestionInput): Promise<string> {
    const { data, error } = await this.client.rpc("record_trusted_result_ingestion", {
      p_league_id: input.leagueId,
      p_source_result_key: input.sourceResultKey,
      p_payload: input.payload as unknown as Json,
      p_status: input.status,
      ...(input.correctionOfSourceResultKey
        ? { p_correction_of_source_result_key: input.correctionOfSourceResultKey }
        : {}),
      ...(input.errorMessage ? { p_error_message: input.errorMessage } : {})
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("Trusted result ingestion RPC did not return a run id.");
    }

    return data;
  }

  async persistTrustedRecalculation(
    input: PersistScoringRecalculationInput
  ): Promise<PersistedScoringRecalculation> {
    return this.scoringRepository.persistRecalculation(input);
  }
}
