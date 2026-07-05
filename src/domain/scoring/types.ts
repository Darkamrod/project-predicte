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
  | "GROUP_STAGE"
  | "PLAYOFF"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

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
  presetCode: "WORLD_CUP_DEFAULT" | "EURO_DEFAULT" | "CHAMPIONS_LEAGUE_DEFAULT";
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

export interface ScoringRuleChange {
  id: string;
  leagueId: string;
  ruleVersionId: string;
  actorUserId: string;
  actorDisplayName: string;
  changedAtUtc: string;
  scope: "stage" | "antepost";
  stage?: ScoringStageKey | undefined;
  field: keyof StageScoringRule | keyof AntepostScoringRule;
  previousValue: number;
  nextValue: number;
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

export type ScoringBreakdownScope = "MATCH" | "STAGE" | "ANTEPOST";

export interface ScoringBreakdownItem {
  id: string;
  participantUserId: string;
  scope: ScoringBreakdownScope;
  referenceId: string;
  stage?: ScoringStageKey;
  type: ScoringEventType;
  points: number;
  reason: string;
}

export interface UserScoringBreakdown {
  userId: string;
  totalPoints: number;
  items: ScoringBreakdownItem[];
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

export interface OfficialMatchResult {
  matchId: string;
  stage: ScoringStageKey;
  order: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
}

export interface OfficialGroupPosition {
  groupCode: string;
  position: number;
  teamId: string;
}

export interface OfficialStageQualification {
  stage: ScoringStageKey;
  referenceId: string;
  teamIds: string[];
}

export interface OfficialPairing {
  stage: ScoringStageKey;
  referenceId: string;
  order: number;
  teamIds: [string, string];
}

export interface OfficialAntepostResult {
  winnerTeamId?: string | undefined;
  topScorerPlayerIds?: string[] | undefined;
  topScorerGoals?: number | undefined;
}

export interface OfficialTournamentResultSet {
  sourceResultVersion: string;
  createdAtUtc: string;
  matchResults: OfficialMatchResult[];
  groupPositions: OfficialGroupPosition[];
  stageQualifications: OfficialStageQualification[];
  pairings: OfficialPairing[];
  antepost?: OfficialAntepostResult | undefined;
}
