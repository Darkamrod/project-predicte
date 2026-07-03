import type { LeagueDeadlineState, LeagueStatus } from "./types";

const editableLeagueStatuses: LeagueStatus[] = ["draft", "open"];

export function isBeforeDeadline(serverNowUtc: string, deadlineAtUtc: string): boolean {
  return new Date(serverNowUtc).getTime() < new Date(deadlineAtUtc).getTime();
}

export function canEditPredictions(state: LeagueDeadlineState, serverNowUtc: string): boolean {
  return (
    editableLeagueStatuses.includes(state.status) &&
    isBeforeDeadline(serverNowUtc, state.deadlineAtUtc)
  );
}

export function assertPredictionWritable(state: LeagueDeadlineState, serverNowUtc: string): void {
  if (!canEditPredictions(state, serverNowUtc)) {
    throw new Error("Predictions are locked or past the server deadline.");
  }
}

export function canEditScoringRules(state: LeagueDeadlineState, serverNowUtc: string): boolean {
  return state.status === "open" && isBeforeDeadline(serverNowUtc, state.deadlineAtUtc);
}

export function assertScoringRulesWritable(state: LeagueDeadlineState, serverNowUtc: string): void {
  if (!canEditScoringRules(state, serverNowUtc)) {
    throw new Error("Scoring rules cannot be changed after lock or deadline.");
  }
}

export function canReadParticipantPredictions(params: {
  leagueStatus: LeagueStatus;
  requesterUserId: string;
  participantUserId: string;
}): boolean {
  return (
    params.requesterUserId === params.participantUserId ||
    ["locked", "live", "completed", "archived"].includes(params.leagueStatus)
  );
}
