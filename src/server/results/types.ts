import type { CompetitionSeed } from "@/domain/competitions/types";
import type { OfficialTournamentResultSet } from "@/domain/scoring/types";
import type { Json } from "@/services/supabase/database.types";
import type {
  TrustedScoringContextLoader,
  TrustedScoringPersistence,
  TrustedResultIngestionRepository,
  TrustedResultIngestionStatus
} from "@/server/scoring/types";

export type ResultProviderCode = "MOCK_RESULTS";

export interface ProviderResultImportRequest {
  leagueId: string;
  provider: ResultProviderCode;
  externalFixtureKey: string;
  sourceResultKey: string;
  requestedAtUtc: string;
  correctionOfSourceResultKey?: string | undefined;
  retryAttempt?: number | undefined;
  maxRetries?: number | undefined;
  nextRetryAtUtc?: string | undefined;
}

export interface ProviderFetchRequest extends ProviderResultImportRequest {
  competition: CompetitionSeed;
}

export interface NormalizedProviderResult {
  provider: ResultProviderCode;
  externalFixtureKey: string;
  sourceResultKey: string;
  receivedAtUtc: string;
  rawPayload: Json;
  normalizedResultSet: OfficialTournamentResultSet;
  correctionOfSourceResultKey?: string | undefined;
}

export interface ResultProvider {
  readonly provider: ResultProviderCode;
  fetchResult(request: ProviderFetchRequest): Promise<NormalizedProviderResult>;
}

export interface ProviderImportRecordInput {
  leagueId: string;
  provider: ResultProviderCode;
  externalFixtureKey: string;
  sourceResultKey: string;
  payload: Json;
  status: TrustedResultIngestionStatus;
  correctionOfSourceResultKey?: string | undefined;
  errorMessage?: string | undefined;
  retryAttempt: number;
  maxRetries: number;
  nextRetryAtUtc?: string | undefined;
}

export interface ProviderImportRecord {
  syncRunId: string;
  providerPayloadId: string;
  ingestionRunId: string;
}

export interface ProviderResultImportRepository {
  resultIngestionExists(leagueId: string, sourceResultKey: string): Promise<boolean>;
  recordProviderImport(input: ProviderImportRecordInput): Promise<ProviderImportRecord>;
}

export interface ProviderResultImportWorkerDependencies {
  providers: Partial<Record<ResultProviderCode, ResultProvider>>;
  contextLoader: TrustedScoringContextLoader;
  resultIngestionRepository: TrustedResultIngestionRepository;
  scoringPersistence: TrustedScoringPersistence;
  providerImportRepository: ProviderResultImportRepository;
}

export interface ProviderResultImportOutput {
  leagueId: string;
  provider: ResultProviderCode;
  externalFixtureKey: string;
  sourceResultKey: string;
  providerPayloadId: string;
  syncRunId: string;
  ingestionRunId: string;
  scoringRunId: string;
  snapshotId: string;
  status: "scored";
  retryAttempt: number;
  correctionOfSourceResultKey?: string | undefined;
}
