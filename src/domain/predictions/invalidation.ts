import type { PredictedBracket } from "./bracket";
import type { MatchPrediction, PredictionDependencyWarning } from "./types";

export interface DependencyInvalidationInput {
  before: PredictedBracket;
  after: PredictedBracket;
  predictions: MatchPrediction[];
  createdAtUtc: string;
}

export function calculateDependencyInvalidation(
  input: DependencyInvalidationInput
): PredictionDependencyWarning[] {
  const beforeMatches = new Map(input.before.matches.map((match) => [match.id, match]));
  const predictionByMatchId = new Map(
    input.predictions.map((prediction) => [prediction.matchId, prediction])
  );

  return input.after.matches.flatMap((afterMatch) => {
    const beforeMatch = beforeMatches.get(afterMatch.id);
    const prediction = predictionByMatchId.get(afterMatch.id);

    if (!beforeMatch || !prediction) {
      return [];
    }

    const participantsChanged =
      beforeMatch.homeTeamId !== afterMatch.homeTeamId ||
      beforeMatch.awayTeamId !== afterMatch.awayTeamId;
    const qualifiedTeamStillValid =
      !prediction.qualifiedTeamId ||
      prediction.qualifiedTeamId === afterMatch.homeTeamId ||
      prediction.qualifiedTeamId === afterMatch.awayTeamId;

    if (!participantsChanged && qualifiedTeamStillValid) {
      return [];
    }

    return [
      {
        id: `dependency:${afterMatch.id}:${input.createdAtUtc}`,
        impactedMatchIds: [afterMatch.id],
        createdAtUtc: input.createdAtUtc,
        message: `${afterMatch.roundName}: partecipanti cambiati, ricontrolla il pronostico`
      }
    ];
  });
}

export function mergeDependencyWarnings(
  existing: PredictionDependencyWarning[],
  next: PredictionDependencyWarning[]
): PredictionDependencyWarning[] {
  const byId = new Map(existing.map((warning) => [warning.id, warning]));

  for (const warning of next) {
    byId.set(warning.id, warning);
  }

  return [...byId.values()];
}
