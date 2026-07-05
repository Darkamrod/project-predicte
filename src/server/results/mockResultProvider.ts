import { createWorldCupMockResultSet } from "@/services/mock/mockResults";
import type { Json } from "@/services/supabase/database.types";
import type { NormalizedProviderResult, ProviderFetchRequest, ResultProvider } from "./types";

export class MockResultProvider implements ResultProvider {
  readonly provider = "MOCK_RESULTS" as const;

  async fetchResult(request: ProviderFetchRequest): Promise<NormalizedProviderResult> {
    const normalizedResultSet = createWorldCupMockResultSet({
      competition: request.competition,
      sourceResultVersion: request.sourceResultKey,
      createdAtUtc: request.requestedAtUtc
    });

    return {
      provider: this.provider,
      externalFixtureKey: request.externalFixtureKey,
      sourceResultKey: request.sourceResultKey,
      receivedAtUtc: request.requestedAtUtc,
      correctionOfSourceResultKey: request.correctionOfSourceResultKey,
      rawPayload: createRawPayload(request),
      normalizedResultSet
    };
  }
}

function createRawPayload(request: ProviderFetchRequest): Json {
  return {
    provider: "MOCK_RESULTS",
    externalFixtureKey: request.externalFixtureKey,
    sourceResultKey: request.sourceResultKey,
    requestedAtUtc: request.requestedAtUtc,
    competitionEditionId: request.competition.edition.id,
    correctionOfSourceResultKey: request.correctionOfSourceResultKey ?? null,
    fixtureKind: "mock_official_result_set"
  };
}
