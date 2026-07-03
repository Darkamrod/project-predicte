import type { StageCode } from "@/domain/competitions/types";

export type LeagueStatus =
  "draft" | "open" | "locked" | "live" | "completed" | "archived" | "cancelled";

export type PredictionSetStatus = "draft" | "complete" | "locked";

export type PredictionSyncStatus = "LOCAL" | "SYNCING" | "SYNCED" | "SYNC_FAILED";

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
  qualifiedTeamId?: string;
  advancementMethod?: AdvancementMethod;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
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
}
