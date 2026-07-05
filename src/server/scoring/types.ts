import type { CompetitionSeed } from "@/domain/competitions/types";
import type { LeaderboardParticipant, LeaderboardSnapshot } from "@/domain/leaderboard/types";
import type { PredictionSet } from "@/domain/predictions/types";
import type {
  OfficialTournamentResultSet,
  ScoringEvent,
  ScoringRuleVersion
} from "@/domain/scoring/types";
import type {
  PersistedScoringRecalculation,
  PersistScoringRecalculationInput
} from "@/server/scoring/supabaseScoringPersistenceRepository";

export type TrustedResultIngestionStatus = "accepted" | "scored" | "failed";

export interface TrustedScoringRequest {
  leagueId: string;
  sourceResultKey: string;
  resultSet: unknown;
  requestedAtUtc: string;
  reason: string;
  correctionOfSourceResultKey?: string | undefined;
}

export interface TrustedScoringContext {
  leagueId: string;
  competitionEditionId: string;
  competition: CompetitionSeed;
  scoringRuleVersion: ScoringRuleVersion;
  predictionSets: PredictionSet[];
  participants: LeaderboardParticipant[];
  existingEvents?: ScoringEvent[] | undefined;
  previousSnapshot?: LeaderboardSnapshot | undefined;
}

export interface TrustedScoringContextRequest {
  leagueId: string;
  sourceResultKey: string;
}

export interface TrustedScoringContextLoader {
  loadContext(request: TrustedScoringContextRequest): Promise<TrustedScoringContext>;
}

export interface TrustedResultIngestionInput {
  leagueId: string;
  sourceResultKey: string;
  payload: OfficialTournamentResultSet;
  status: TrustedResultIngestionStatus;
  correctionOfSourceResultKey?: string | undefined;
  errorMessage?: string | undefined;
}

export interface TrustedResultIngestionRepository {
  recordResultIngestion(input: TrustedResultIngestionInput): Promise<string>;
}

export interface TrustedScoringPersistence {
  persistTrustedRecalculation(
    input: PersistScoringRecalculationInput
  ): Promise<PersistedScoringRecalculation>;
}

export interface TrustedScoringWorkerDependencies {
  contextLoader: TrustedScoringContextLoader;
  resultIngestionRepository: TrustedResultIngestionRepository;
  scoringPersistence: TrustedScoringPersistence;
}

export interface TrustedScoringExecutionResult {
  leagueId: string;
  sourceResultKey: string;
  ingestionRunId: string;
  recalculationRunId: string;
  snapshotId: string;
  scoringEventCount: number;
  leaderboardEntryCount: number;
  breakdownCount: number;
}
