import type { MatchPrediction, PredictionCompletion, PredictionSet } from "./types";

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

  return true;
}

export function calculatePredictionCompletion(predictionSet: PredictionSet): PredictionCompletion {
  const completedItems = predictionSet.matchPredictions.filter(isMatchPredictionComplete).length;
  const unsyncedItems = predictionSet.matchPredictions.filter(
    (prediction) => prediction.syncStatus !== "SYNCED"
  ).length;
  const incompleteItems = Math.max(predictionSet.totalRequired - completedItems, 0);
  const percentComplete =
    predictionSet.totalRequired === 0
      ? 0
      : Math.round((completedItems / predictionSet.totalRequired) * 100);

  const validationIssues: string[] = [];

  if (incompleteItems > 0) {
    validationIssues.push(`${incompleteItems} pronostici mancanti`);
  }

  if (unsyncedItems > 0) {
    validationIssues.push(`${unsyncedItems} pronostici non sincronizzati`);
  }

  return {
    totalRequired: predictionSet.totalRequired,
    completedItems,
    incompleteItems,
    unsyncedItems,
    percentComplete,
    validationIssues
  };
}
