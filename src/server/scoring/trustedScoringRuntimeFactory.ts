import { MockResultProvider } from "@/server/results/mockResultProvider";
import { SupabaseProviderResultImportRepository } from "@/server/results/supabaseProviderResultImportRepository";
import type { ProviderResultImportWorkerDependencies } from "@/server/results/types";

import { SupabaseScoringContextLoader } from "./supabaseScoringContextLoader";
import { SupabaseTrustedScoringRepository } from "./supabaseTrustedScoringRepository";
import {
  createTrustedServerSupabaseClient,
  type TrustedServerSupabaseConfig
} from "./supabaseTrustedServerClient";

export function createTrustedScoringRuntimeDependencies(
  config: TrustedServerSupabaseConfig
): ProviderResultImportWorkerDependencies {
  const client = createTrustedServerSupabaseClient(config);
  const trustedScoringRepository = new SupabaseTrustedScoringRepository(client);

  return {
    providers: {
      MOCK_RESULTS: new MockResultProvider()
    },
    contextLoader: new SupabaseScoringContextLoader(client),
    resultIngestionRepository: trustedScoringRepository,
    scoringPersistence: trustedScoringRepository,
    providerImportRepository: new SupabaseProviderResultImportRepository(client)
  };
}
