import type { StageCode } from "@/domain/competitions/types";

export type LeagueStatus =
  "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";

export type PredictionSetStatus = "draft" | "complete" | "locked";

export type PredictionSyncStatus = "SAVED" | "SYNCING" | "SYNCED" | "SYNC_FAILED" | "LOCAL";

export type AdvancementMethod = "REGULATION" | "EXTRA_TIME" | "PENALTIES";

export interface LeagueDeadlineState {
  leagueId: string;
  status: LeagueStatus;
  deadlineAtUtc: string;
}

export interface MatchPrediction {
  id: string;
  predictionSetId: string;
  matchId: string;
  stageCode: StageCode;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
}

export interface PredictionTiebreakOverride {
  id: string;
  predictionSetId: string;
  scopeRef: string;
  orderedTeamIds: string[];
  reason: string;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
}

export interface AntepostPrediction {
  id: string;
  predictionSetId: string;
  definitionId: string;
  selectedTeamId?: string | undefined;
  selectedTeamIds?: string[] | undefined;
  selectedPlayerId?: string | undefined;
  numericValue?: number | undefined;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
}

export interface PredictionDependencyWarning {
  id: string;
  message: string;
  impactedMatchIds: string[];
  createdAtUtc: string;
}

export interface PredictionSet {
  id: string;
  leagueId: string;
  userId: string;
  status: PredictionSetStatus;
  totalRequired: number;
  completedItems: number;
  unsyncedItems: number;
  matchPredictions: MatchPrediction[];
  tiebreakOverrides?: PredictionTiebreakOverride[];
  antepostPredictions?: AntepostPrediction[];
  dependencyWarnings?: PredictionDependencyWarning[];
  lastServerSyncedAtUtc?: string;
}

export interface GroupStandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  unresolvedTie: boolean;
}

export interface PredictionCompletion {
  totalRequired: number;
  completedItems: number;
  incompleteItems: number;
  unsyncedItems: number;
  percentComplete: number;
  validationIssues: string[];
  nextIncomplete?: PredictionNextIncomplete | undefined;
}

export type PredictionIssueSeverity = "warning" | "error";

export type PredictionIssueKind =
  | "MISSING_MATCH"
  | "INVALID_KNOCKOUT"
  | "UNRESOLVED_TIEBREAK"
  | "MISSING_ANTEPOST"
  | "BRACKET_INCOMPLETE"
  | "UNSYNCED_CHANGES"
  | "DEPENDENCY_WARNING";

export interface PredictionValidationIssue {
  id: string;
  kind: PredictionIssueKind;
  severity: PredictionIssueSeverity;
  message: string;
  referenceId?: string | undefined;
}

export type PredictionNextIncomplete =
  | { kind: "GROUP_MATCH"; matchId: string }
  | { kind: "TIEBREAK"; scopeRef: string }
  | { kind: "KNOCKOUT_MATCH"; matchId: string }
  | { kind: "ANTEPOST"; definitionId: string }
  | { kind: "SYNC"; referenceId: string };
