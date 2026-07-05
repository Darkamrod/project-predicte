import type { AntepostDefinition } from "@/domain/competitions/types";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionCompletion,
  PredictionSet,
  PredictionSyncStatus
} from "./types";

export function isMatchPredictionComplete(prediction: MatchPrediction): boolean {
  const goalsAreValid =
    Number.isInteger(prediction.homeGoals) &&
    Number.isInteger(prediction.awayGoals) &&
    prediction.homeGoals >= 0 &&
    prediction.awayGoals >= 0;

  if (!goalsAreValid) {
    return false;
  }

  const isDraw = prediction.homeGoals === prediction.awayGoals;

  if (prediction.stageCode !== "GROUP_STAGE" && isDraw) {
    return Boolean(prediction.qualifiedTeamId && prediction.advancementMethod !== "REGULATION");
  }

  if (prediction.stageCode !== "GROUP_STAGE") {
    return Boolean(prediction.qualifiedTeamId && prediction.advancementMethod === "REGULATION");
  }

  return true;
}

export function calculatePredictionCompletion(predictionSet: PredictionSet): PredictionCompletion {
  const completedItems = predictionSet.matchPredictions.filter(isMatchPredictionComplete).length;
  const antepostCompleted = (predictionSet.antepostPredictions ?? []).filter(
    isAntepostPredictionComplete
  ).length;
  const unsyncedItems =
    predictionSet.matchPredictions.filter(
      (prediction) => !isPredictionSynced(prediction.syncStatus)
    ).length +
    (predictionSet.antepostPredictions ?? []).filter(
      (prediction) => !isPredictionSynced(prediction.syncStatus)
    ).length +
    (predictionSet.tiebreakOverrides ?? []).filter(
      (override) => !isPredictionSynced(override.syncStatus)
    ).length;
  const completedTotal = completedItems + antepostCompleted;
  const incompleteItems = Math.max(predictionSet.totalRequired - completedTotal, 0);
  const percentComplete =
    predictionSet.totalRequired === 0
      ? 0
      : Math.round((completedTotal / predictionSet.totalRequired) * 100);

  const validationIssues: string[] = [];

  if (incompleteItems > 0) {
    validationIssues.push(`${incompleteItems} pronostici mancanti`);
  }

  if (unsyncedItems > 0) {
    validationIssues.push(`${unsyncedItems} pronostici non sincronizzati`);
  }

  return {
    totalRequired: predictionSet.totalRequired,
    completedItems: completedTotal,
    incompleteItems,
    unsyncedItems,
    percentComplete,
    validationIssues
  };
}

export function isPredictionSynced(status: PredictionSyncStatus): boolean {
  return status === "SYNCED";
}

export function isRequiredAntepostComplete(
  definition: AntepostDefinition,
  prediction: AntepostPrediction
): boolean {
  if (!definition.required) {
    return true;
  }

  if (definition.valueType === "TEAM") {
    return Boolean(prediction.selectedTeamId);
  }

  if (definition.valueType === "TEAM_PAIR") {
    return (prediction.selectedTeamIds ?? []).length === 2;
  }

  if (definition.valueType === "PLAYER") {
    return Boolean(prediction.selectedPlayerId || prediction.textValue?.trim());
  }

  return Number.isInteger(prediction.numericValue) && (prediction.numericValue ?? -1) >= 0;
}

function isAntepostPredictionComplete(prediction: AntepostPrediction): boolean {
  return Boolean(
    prediction.selectedTeamId ||
    (prediction.selectedTeamIds ?? []).length > 0 ||
    prediction.selectedPlayerId ||
    prediction.textValue?.trim() ||
    (Number.isInteger(prediction.numericValue) && (prediction.numericValue ?? -1) >= 0)
  );
}
