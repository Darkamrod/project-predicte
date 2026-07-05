import { assertUtcTimestamp } from "@/server/scoring/resultValidation";
import { executeTrustedScoringRecalculation } from "@/server/scoring/trustedScoringWorker";
import type { TrustedScoringContext } from "@/server/scoring/types";
import type {
  NormalizedProviderResult,
  ProviderResultImportOutput,
  ProviderResultImportRequest,
  ProviderResultImportWorkerDependencies,
  ResultProvider
} from "./types";

export async function executeProviderResultImport(
  request: ProviderResultImportRequest,
  dependencies: ProviderResultImportWorkerDependencies
): Promise<ProviderResultImportOutput> {
  assertProviderImportRequest(request);

  const provider = dependencies.providers[request.provider];

  if (!provider) {
    throw new Error(`Result provider is not configured: ${request.provider}`);
  }

  const retryAttempt = request.retryAttempt ?? 0;
  const maxRetries = request.maxRetries ?? 0;
  const context = await dependencies.contextLoader.loadContext({
    leagueId: request.leagueId,
    sourceResultKey: request.sourceResultKey
  });
  const providerResult = await provider.fetchResult({
    ...request,
    competition: context.competition
  });
  assertNormalizedProviderResultMatchesRequest(providerResult, provider, request);

  if (request.correctionOfSourceResultKey) {
    const correctionExists = await dependencies.providerImportRepository.resultIngestionExists(
      request.leagueId,
      request.correctionOfSourceResultKey
    );

    if (!correctionExists) {
      await dependencies.providerImportRepository.recordProviderImport({
        leagueId: request.leagueId,
        provider: request.provider,
        externalFixtureKey: request.externalFixtureKey,
        sourceResultKey: request.sourceResultKey,
        payload: providerResult.rawPayload,
        status: "failed",
        correctionOfSourceResultKey: request.correctionOfSourceResultKey,
        errorMessage: "Correction source result key was not found.",
        retryAttempt,
        maxRetries,
        nextRetryAtUtc: request.nextRetryAtUtc
      });

      throw new Error("Correction source result key was not found.");
    }
  }

  const acceptedImport = await dependencies.providerImportRepository.recordProviderImport({
    leagueId: request.leagueId,
    provider: request.provider,
    externalFixtureKey: request.externalFixtureKey,
    sourceResultKey: request.sourceResultKey,
    payload: providerResult.rawPayload,
    status: "accepted",
    correctionOfSourceResultKey: request.correctionOfSourceResultKey,
    retryAttempt,
    maxRetries,
    nextRetryAtUtc: request.nextRetryAtUtc
  });

  try {
    const scoring = await executeTrustedScoringRecalculation(
      {
        leagueId: request.leagueId,
        sourceResultKey: request.sourceResultKey,
        requestedAtUtc: request.requestedAtUtc,
        resultSet: providerResult.normalizedResultSet,
        reason: request.correctionOfSourceResultKey
          ? "provider_result_correction"
          : "provider_result_import",
        correctionOfSourceResultKey: request.correctionOfSourceResultKey
      },
      {
        contextLoader: createCachedContextLoader(context),
        resultIngestionRepository: dependencies.resultIngestionRepository,
        scoringPersistence: dependencies.scoringPersistence
      }
    );

    const scoredImport = await dependencies.providerImportRepository.recordProviderImport({
      leagueId: request.leagueId,
      provider: request.provider,
      externalFixtureKey: request.externalFixtureKey,
      sourceResultKey: request.sourceResultKey,
      payload: providerResult.rawPayload,
      status: "scored",
      correctionOfSourceResultKey: request.correctionOfSourceResultKey,
      retryAttempt,
      maxRetries,
      nextRetryAtUtc: request.nextRetryAtUtc
    });

    return {
      leagueId: request.leagueId,
      provider: request.provider,
      externalFixtureKey: request.externalFixtureKey,
      sourceResultKey: request.sourceResultKey,
      providerPayloadId: scoredImport.providerPayloadId || acceptedImport.providerPayloadId,
      syncRunId: scoredImport.syncRunId || acceptedImport.syncRunId,
      ingestionRunId: scoring.ingestionRunId || scoredImport.ingestionRunId,
      scoringRunId: scoring.recalculationRunId,
      snapshotId: scoring.snapshotId,
      status: "scored",
      retryAttempt,
      correctionOfSourceResultKey: request.correctionOfSourceResultKey
    };
  } catch (error) {
    await dependencies.providerImportRepository.recordProviderImport({
      leagueId: request.leagueId,
      provider: request.provider,
      externalFixtureKey: request.externalFixtureKey,
      sourceResultKey: request.sourceResultKey,
      payload: providerResult.rawPayload,
      status: "failed",
      correctionOfSourceResultKey: request.correctionOfSourceResultKey,
      errorMessage: error instanceof Error ? error.message : "Unknown provider import failure.",
      retryAttempt,
      maxRetries,
      nextRetryAtUtc: request.nextRetryAtUtc
    });

    throw error;
  }
}

function assertProviderImportRequest(request: ProviderResultImportRequest): void {
  assertUtcTimestamp(request.requestedAtUtc, "requestedAtUtc");

  if (request.nextRetryAtUtc) {
    assertUtcTimestamp(request.nextRetryAtUtc, "nextRetryAtUtc");
  }

  if (!request.externalFixtureKey.trim()) {
    throw new Error("externalFixtureKey is required.");
  }

  if (!request.sourceResultKey.trim()) {
    throw new Error("sourceResultKey is required.");
  }

  if ((request.retryAttempt ?? 0) < 0 || (request.maxRetries ?? 0) < 0) {
    throw new Error("Retry metadata must be non-negative.");
  }
}

function createCachedContextLoader(context: TrustedScoringContext) {
  return {
    loadContext: async () => context
  };
}

export function assertNormalizedProviderResultMatchesRequest(
  result: NormalizedProviderResult,
  provider: ResultProvider,
  request: ProviderResultImportRequest
): void {
  if (result.provider !== provider.provider) {
    throw new Error("Normalized provider result provider mismatch.");
  }

  if (result.sourceResultKey !== request.sourceResultKey) {
    throw new Error("Normalized provider result source key mismatch.");
  }

  if (result.externalFixtureKey !== request.externalFixtureKey) {
    throw new Error("Normalized provider result external fixture key mismatch.");
  }
}
