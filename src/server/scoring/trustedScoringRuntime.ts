import { z } from "zod";

import { executeProviderResultImport } from "@/server/results/providerResultImportWorker";
import type {
  ProviderResultImportOutput,
  ProviderResultImportWorkerDependencies
} from "@/server/results/types";

const runtimeRequestSchema = z
  .object({
    action: z.literal("import_provider_result"),
    leagueId: z.string().min(1),
    provider: z.literal("MOCK_RESULTS"),
    externalFixtureKey: z.string().min(1),
    sourceResultKey: z.string().min(1),
    requestedAtUtc: z.string().min(1),
    correctionOfSourceResultKey: z.string().min(1).optional(),
    retryAttempt: z.number().int().min(0).optional(),
    maxRetries: z.number().int().min(0).optional(),
    nextRetryAtUtc: z.string().min(1).optional()
  })
  .strict();

export type TrustedScoringRuntimeRequest = z.infer<typeof runtimeRequestSchema>;

export async function handleTrustedScoringRuntimeRequest(
  input: unknown,
  dependencies: ProviderResultImportWorkerDependencies
): Promise<ProviderResultImportOutput> {
  const request = runtimeRequestSchema.parse(input);

  return executeProviderResultImport(request, dependencies);
}
