import type { AdvancementMethod } from "@/domain/predictions/types";

export type ScoringEventType =
  | "MATCH_OUTCOME"
  | "EXACT_SCORE"
  | "GROUP_POSITION"
  | "STAGE_QUALIFICATION"
  | "CORRECT_PAIRING"
  | "EXTRA_TIME_METHOD"
  | "PENALTY_METHOD"
  | "TOURNAMENT_WINNER"
  | "TOP_SCORER"
  | "TOP_SCORER_EXACT_GOALS"
  | "MANUAL_CORRECTION";

export type ScoringStageKey =
  "GROUP_STAGE" | "ROUND_OF_32" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "FINAL";

export interface StageScoringRule {
  correctOutcome: number;
  exactScore: number;
  correctGroupPosition: number;
  stageQualification: number;
  correctPairing: number;
  extraTimeMethod: number;
  penaltyMethod: number;
}

export interface AntepostScoringRule {
  tournamentWinner: number;
  topScorer: number;
  topScorerExactGoals: number;
}

export interface ScoringStackingConfig {
  exactScoreReplacesOutcome: boolean;
  topScorerExactGoalsReplacesTopScorer: boolean;
  qualificationAndPairingAreIndependent: boolean;
  advancementMethodRequiresDrawAndQualifier: boolean;
}

export interface ScoringRuleConfig {
  schemaVersion: 1;
  presetCode: "WORLD_CUP_DEFAULT";
  maxPointsPerField: number;
  stages: Record<ScoringStageKey, StageScoringRule>;
  antepost: AntepostScoringRule;
  stacking: ScoringStackingConfig;
}

export interface ScoringRuleVersion {
  id: string;
  leagueId: string;
  version: number;
  status: "draft" | "locked";
  schemaVersion: 1;
  config: ScoringRuleConfig;
  checksum?: string;
  createdAtUtc: string;
  lockedAtUtc?: string;
}

export interface ScoringEvent {
  id: string;
  leagueId: string;
  participantUserId: string;
  competitionEditionId: string;
  referenceId: string;
  scoringRuleVersionId: string;
  type: ScoringEventType;
  points: number;
  reason: string;
  calculationVersion: string;
  createdAtUtc: string;
  sourceResultVersion: string;
}

export interface RegulationScore {
  homeGoals: number;
  awayGoals: number;
}

export interface MatchScoreInput {
  stage: ScoringStageKey;
  matchId: string;
  prediction: RegulationScore & {
    qualifiedTeamId?: string;
    advancementMethod?: AdvancementMethod;
  };
  result: RegulationScore & {
    homeTeamId: string;
    awayTeamId: string;
    qualifiedTeamId?: string;
    advancementMethod?: AdvancementMethod;
  };
}

export interface PairingInput {
  stage: ScoringStageKey;
  referenceId: string;
  predictedTeamIds: [string, string];
  actualTeamIds: [string, string];
}

export interface QualificationInput {
  stage: ScoringStageKey;
  referenceId: string;
  predictedTeamIds: string[];
  actualTeamIds: string[];
}

export interface GroupPositionInput {
  referenceId: string;
  predictedTeamId: string;
  actualTeamId: string;
  position: number;
}

export interface AntepostInput {
  referenceId: string;
  predictedWinnerTeamId?: string;
  actualWinnerTeamId?: string;
  predictedTopScorerPlayerId?: string;
  actualTopScorerPlayerIds?: string[];
  predictedTopScorerGoals?: number;
  actualTopScorerGoals?: number;
}

export interface ScoringContext {
  leagueId: string;
  participantUserId: string;
  competitionEditionId: string;
  scoringRuleVersionId: string;
  sourceResultVersion: string;
  createdAtUtc: string;
}
