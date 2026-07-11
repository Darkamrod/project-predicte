export type PersonalPredictionCompletionState =
  "not_started" | "incomplete" | "complete" | "locked";

export interface PersonalPredictionSetInput {
  completedItems?: number | null | undefined;
  status?: string | null | undefined;
  totalRequired?: number | null | undefined;
}

export interface PersonalPredictionCompletion {
  state: PersonalPredictionCompletionState;
  completedItems: number;
  totalRequired: number;
  missingItems: number;
  percentComplete: number;
  canEdit: boolean;
}

export function resolvePersonalPredictionCompletion(
  predictionSet: PersonalPredictionSetInput | null | undefined,
  leagueStatus: string | null | undefined
): PersonalPredictionCompletion {
  const locked = isLockedLeagueStatus(leagueStatus);

  if (!predictionSet) {
    return {
      state: locked ? "locked" : "not_started",
      completedItems: 0,
      totalRequired: 0,
      missingItems: 0,
      percentComplete: 0,
      canEdit: !locked
    };
  }

  const totalRequired = normalizeCount(predictionSet.totalRequired);
  const completedItems = Math.min(
    normalizeCount(predictionSet.completedItems),
    totalRequired || Infinity
  );
  const missingItems = Math.max(totalRequired - completedItems, 0);
  const complete =
    predictionSet.status === "complete" &&
    totalRequired > 0 &&
    Number.isFinite(predictionSet.completedItems) &&
    predictionSet.completedItems !== null &&
    predictionSet.completedItems !== undefined &&
    completedItems >= totalRequired;

  return {
    state: locked ? "locked" : complete ? "complete" : "incomplete",
    completedItems,
    totalRequired,
    missingItems,
    percentComplete:
      totalRequired > 0 ? Math.min(100, Math.round((completedItems / totalRequired) * 100)) : 0,
    canEdit: !locked
  };
}

export function isLockedLeagueStatus(status: string | null | undefined): boolean {
  return (
    status === "locked" || status === "live" || status === "completed" || status === "archived"
  );
}

function normalizeCount(value: number | null | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value ?? 0) : 0;
}
