export type PredictionCompletionOverviewState = "complete" | "incomplete" | "missing" | "locked";
export type PredictionCompletionOverviewAvailability = "available" | "pre_lock";

export interface PersistedPredictionCompletionSet {
  completedItems?: number | null | undefined;
  status?: string | null | undefined;
  totalRequired?: number | null | undefined;
  userId: string;
}

export interface PredictionCompletionOverviewSummary {
  totalParticipants: number;
  predictionSetsTotal: number;
  completePredictionSets: number;
  incompletePredictionSets: number;
  lockedPredictionSets: number;
  missingPredictionSets: number;
}

export interface PredictionCompletionOverviewInput {
  completedItems?: number | null | undefined;
  hasPredictionSet: boolean;
  status?: string | null | undefined;
  totalRequired?: number | null | undefined;
}

export function resolvePredictionCompletionOverviewState(
  input: PredictionCompletionOverviewInput
): PredictionCompletionOverviewState {
  if (!input.hasPredictionSet) {
    return "missing";
  }

  if (input.status === "locked") {
    return "locked";
  }

  if (input.status === "complete") {
    return "complete";
  }

  const totalRequired = normalizeCount(input.totalRequired);
  const completedItems = normalizeCount(input.completedItems);

  if (totalRequired > 0 && completedItems >= totalRequired) {
    return "complete";
  }

  return "incomplete";
}

export function calculatePredictionCompletionPercent(
  completedItems: number | null | undefined,
  totalRequired: number | null | undefined
): number {
  const total = normalizeCount(totalRequired);

  if (total === 0) {
    return 0;
  }

  return Math.min(100, Math.round((normalizeCount(completedItems) / total) * 100));
}

export function calculatePredictionMissingItems(
  completedItems: number | null | undefined,
  totalRequired: number | null | undefined
): number {
  return Math.max(normalizeCount(totalRequired) - normalizeCount(completedItems), 0);
}

export function resolvePredictionCompletionOverviewAvailability(
  leagueStatus: string | null | undefined
): PredictionCompletionOverviewAvailability {
  return leagueStatus === "locked" ||
    leagueStatus === "live" ||
    leagueStatus === "completed" ||
    leagueStatus === "archived"
    ? "available"
    : "pre_lock";
}

export function summarizePredictionCompletionForActiveMembers(
  activeUserIds: string[],
  predictionSets: PersistedPredictionCompletionSet[]
): PredictionCompletionOverviewSummary {
  const uniqueActiveUserIds = [...new Set(activeUserIds.filter(Boolean))];
  const activeUserIdSet = new Set(uniqueActiveUserIds);
  const predictionSetsByUserId = new Map(
    predictionSets
      .filter((predictionSet) => activeUserIdSet.has(predictionSet.userId))
      .map((predictionSet) => [predictionSet.userId, predictionSet])
  );
  const summary: PredictionCompletionOverviewSummary = {
    totalParticipants: uniqueActiveUserIds.length,
    predictionSetsTotal: predictionSetsByUserId.size,
    completePredictionSets: 0,
    incompletePredictionSets: 0,
    lockedPredictionSets: 0,
    missingPredictionSets: 0
  };

  for (const userId of uniqueActiveUserIds) {
    const predictionSet = predictionSetsByUserId.get(userId);
    const state = resolvePredictionCompletionOverviewState({
      completedItems: predictionSet?.completedItems,
      hasPredictionSet: Boolean(predictionSet),
      status: predictionSet?.status,
      totalRequired: predictionSet?.totalRequired
    });

    if (state === "complete") {
      summary.completePredictionSets += 1;
    } else if (state === "incomplete") {
      summary.incompletePredictionSets += 1;
    } else if (state === "locked") {
      summary.lockedPredictionSets += 1;
    } else {
      summary.missingPredictionSets += 1;
    }
  }

  return summary;
}

function normalizeCount(value: number | null | undefined): number {
  return Number.isFinite(value) && (value ?? 0) > 0 ? Math.floor(value ?? 0) : 0;
}
