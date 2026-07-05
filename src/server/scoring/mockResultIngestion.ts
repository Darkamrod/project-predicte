import type { CompetitionSeed } from "@/domain/competitions/types";
import { createWorldCupMockResultSet } from "@/services/mock/mockResults";
import type { TrustedScoringRequest } from "./types";

export function createMockResultIngestionRequest(params: {
  leagueId: string;
  competition: CompetitionSeed;
  sourceResultKey: string;
  requestedAtUtc: string;
  correctionOfSourceResultKey?: string | undefined;
}): TrustedScoringRequest {
  return {
    leagueId: params.leagueId,
    sourceResultKey: params.sourceResultKey,
    requestedAtUtc: params.requestedAtUtc,
    reason: params.correctionOfSourceResultKey ? "mock_result_correction" : "mock_result_ingestion",
    correctionOfSourceResultKey: params.correctionOfSourceResultKey,
    resultSet: createWorldCupMockResultSet({
      competition: params.competition,
      sourceResultVersion: params.sourceResultKey,
      createdAtUtc: params.requestedAtUtc
    })
  };
}
