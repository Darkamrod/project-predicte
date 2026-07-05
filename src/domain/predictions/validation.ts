import type { AntepostDefinition, CompetitionSeed } from "@/domain/competitions/types";
import {
  bestThirdsScopeRef,
  generatePredictedBracket,
  getMatchPrediction,
  getPredictedQualifiedTeamId,
  groupScopeRef,
  leaguePhaseScopeRef,
  type PredictedBracket,
  type PredictedBracketMatch
} from "./bracket";
import {
  isMatchPredictionComplete,
  isPredictionSynced,
  isRequiredAntepostComplete
} from "./progress";
import { buildStandingTieGroups, type StandingTieGroup } from "./standings";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionCompletion,
  PredictionNextIncomplete,
  PredictionSet,
  PredictionValidationIssue
} from "./types";

export interface PredictionWorkflowValidation {
  completion: PredictionCompletion;
  issues: PredictionValidationIssue[];
  bracket: PredictedBracket;
}

export function validatePredictionSet(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): PredictionWorkflowValidation {
  const bracket = generatePredictedBracket(params);
  const issues: PredictionValidationIssue[] = [];
  let completedItems = 0;
  let nextIncomplete: PredictionNextIncomplete | undefined;

  for (const match of params.competition.matches) {
    const prediction = getMatchPrediction(params.predictionSet, match.id);

    if (prediction && isMatchPredictionComplete(prediction)) {
      completedItems += 1;
      continue;
    }

    issues.push({
      id: `missing:${match.id}`,
      kind: "MISSING_MATCH",
      severity: "error",
      message:
        params.competition.edition.format.initialStageKind === "league_phase"
          ? "Pronostico league phase mancante"
          : "Pronostico girone mancante",
      referenceId: match.id
    });
    nextIncomplete ??= { kind: "GROUP_MATCH", matchId: match.id };
  }

  for (const table of bracket.groupTables) {
    const unresolvedGroups = buildStandingTieGroups(
      table.rows,
      groupScopeRef(table.group.code)
    ).filter((group) =>
      group.tiedTeamIds.some((teamId) =>
        table.rows.some((row) => row.teamId === teamId && row.unresolvedTie)
      )
    );

    for (const group of unresolvedGroups) {
      const issue = createTiebreakIssue(group, `Pari da risolvere nel Gruppo ${table.group.code}`);

      issues.push(issue);
      nextIncomplete ??= {
        kind: "TIEBREAK",
        scopeRef: group.scopeRef,
        tieGroupId: group.tieGroupId
      };
    }
  }

  const unresolvedLeagueGroups = buildStandingTieGroups(
    bracket.leagueTable,
    leaguePhaseScopeRef()
  ).filter((group) =>
    group.tiedTeamIds.some((teamId) =>
      bracket.leagueTable.some((row) => row.teamId === teamId && row.unresolvedTie)
    )
  );

  for (const group of unresolvedLeagueGroups) {
    issues.push(createTiebreakIssue(group, "Pari da risolvere nella league phase"));
    nextIncomplete ??= { kind: "TIEBREAK", scopeRef: group.scopeRef, tieGroupId: group.tieGroupId };
  }

  for (const group of bracket.bestThirdPlaceTieGroups) {
    issues.push(createTiebreakIssue(group, "Pari da risolvere nella classifica migliori terze"));
    nextIncomplete ??= {
      kind: "TIEBREAK",
      scopeRef: bestThirdsScopeRef(),
      tieGroupId: group.tieGroupId
    };
  }

  for (const match of bracket.matches) {
    const prediction = getMatchPrediction(params.predictionSet, match.id);
    const knockoutIssues = validateKnockoutPrediction(match, prediction);

    if (knockoutIssues.length === 0 && prediction) {
      completedItems += 1;
    } else {
      issues.push(...knockoutIssues);
      nextIncomplete ??= { kind: "KNOCKOUT_MATCH", matchId: match.id };
    }
  }

  for (const definition of params.competition.antepostDefinitions.filter((item) => item.required)) {
    const prediction = findAntepostPrediction(params.predictionSet, definition.id);

    if (prediction && isRequiredAntepostComplete(definition, prediction)) {
      completedItems += 1;
      continue;
    }

    issues.push({
      id: `antepost:${definition.id}`,
      kind: "MISSING_ANTEPOST",
      severity: "error",
      message: `${definition.label} mancante`,
      referenceId: definition.id
    });
    nextIncomplete ??= { kind: "ANTEPOST", definitionId: definition.id };
  }

  for (const warning of params.predictionSet.dependencyWarnings ?? []) {
    issues.push({
      id: warning.id,
      kind: "DEPENDENCY_WARNING",
      severity: "warning",
      message: warning.message,
      referenceId: warning.impactedMatchIds[0]
    });
  }

  const totalRequired =
    params.competition.matches.length +
    bracket.matches.length +
    params.competition.antepostDefinitions.filter((definition) => definition.required).length;
  const unsyncedItems = countUnsyncedItems(params.predictionSet);

  if (unsyncedItems > 0) {
    const firstUnsynced = findFirstUnsyncedReference(params.predictionSet);
    issues.push({
      id: "sync:unsynced",
      kind: "UNSYNCED_CHANGES",
      severity: "warning",
      message: `${unsyncedItems} modifiche non sincronizzate`,
      referenceId: firstUnsynced
    });
    nextIncomplete ??= firstUnsynced ? { kind: "SYNC", referenceId: firstUnsynced } : undefined;
  }

  const incompleteItems = Math.max(totalRequired - completedItems, 0);

  return {
    bracket,
    issues,
    completion: {
      totalRequired,
      completedItems,
      incompleteItems,
      unsyncedItems,
      percentComplete: totalRequired === 0 ? 0 : Math.round((completedItems / totalRequired) * 100),
      validationIssues: issues.map((issue) => issue.message),
      ...(nextIncomplete ? { nextIncomplete } : {})
    }
  };
}

function createTiebreakIssue(group: StandingTieGroup, message: string): PredictionValidationIssue {
  return {
    id: `tiebreak:${group.tieGroupId}`,
    kind: "UNRESOLVED_TIEBREAK",
    severity: "error",
    message,
    referenceId: group.tieGroupId
  };
}

export function validateKnockoutPrediction(
  match: PredictedBracketMatch,
  prediction?: MatchPrediction
): PredictionValidationIssue[] {
  if (!match.homeTeamId || !match.awayTeamId) {
    return [
      {
        id: `bracket:${match.id}`,
        kind: "BRACKET_INCOMPLETE",
        severity: "error",
        message: `${match.roundName}: squadre non ancora definite`,
        referenceId: match.id
      }
    ];
  }

  if (!prediction) {
    return [
      {
        id: `missing:${match.id}`,
        kind: "MISSING_MATCH",
        severity: "error",
        message: `${match.roundName}: pronostico mancante`,
        referenceId: match.id
      }
    ];
  }

  if (!isValidGoal(prediction.homeGoals) || !isValidGoal(prediction.awayGoals)) {
    return [
      {
        id: `invalid-score:${match.id}`,
        kind: "INVALID_KNOCKOUT",
        severity: "error",
        message: `${match.roundName}: risultato non valido`,
        referenceId: match.id
      }
    ];
  }

  const qualifiedTeamId = getPredictedQualifiedTeamId(match, prediction);
  const isDraw = prediction.homeGoals === prediction.awayGoals;

  if (!isDraw) {
    const regulationWinner =
      prediction.homeGoals > prediction.awayGoals ? match.homeTeamId : match.awayTeamId;
    const validRegulationOutcome =
      qualifiedTeamId === regulationWinner && prediction.advancementMethod === "REGULATION";

    return validRegulationOutcome
      ? []
      : [
          {
            id: `invalid-regulation:${match.id}`,
            kind: "INVALID_KNOCKOUT",
            severity: "error",
            message: `${match.roundName}: qualificata o metodo incoerenti con il 90°`,
            referenceId: match.id
          }
        ];
  }

  const qualifiedTeamIsValid =
    prediction.qualifiedTeamId === match.homeTeamId ||
    prediction.qualifiedTeamId === match.awayTeamId;
  const methodIsValid =
    prediction.advancementMethod === "EXTRA_TIME" || prediction.advancementMethod === "PENALTIES";

  return qualifiedTeamIsValid && methodIsValid
    ? []
    : [
        {
          id: `invalid-draw:${match.id}`,
          kind: "INVALID_KNOCKOUT",
          severity: "error",
          message: `${match.roundName}: scegli qualificata e metodo dopo il pari`,
          referenceId: match.id
        }
      ];
}

export function validateAntepostPrediction(
  definition: AntepostDefinition,
  prediction?: AntepostPrediction
): PredictionValidationIssue[] {
  if (!definition.required || (prediction && isRequiredAntepostComplete(definition, prediction))) {
    return [];
  }

  return [
    {
      id: `antepost:${definition.id}`,
      kind: "MISSING_ANTEPOST",
      severity: "error",
      message: `${definition.label} mancante`,
      referenceId: definition.id
    }
  ];
}

export function findAntepostPrediction(
  predictionSet: PredictionSet,
  definitionId: string
): AntepostPrediction | undefined {
  return predictionSet.antepostPredictions?.find(
    (prediction) => prediction.definitionId === definitionId
  );
}

function countUnsyncedItems(predictionSet: PredictionSet): number {
  const matchUnsynced = predictionSet.matchPredictions.filter(
    (prediction) => !isPredictionSynced(prediction.syncStatus)
  ).length;
  const tiebreakUnsynced = (predictionSet.tiebreakOverrides ?? []).filter(
    (override) => !isPredictionSynced(override.syncStatus)
  ).length;
  const antepostUnsynced = (predictionSet.antepostPredictions ?? []).filter(
    (prediction) => !isPredictionSynced(prediction.syncStatus)
  ).length;

  return matchUnsynced + tiebreakUnsynced + antepostUnsynced;
}

function findFirstUnsyncedReference(predictionSet: PredictionSet): string | undefined {
  const matchPrediction = predictionSet.matchPredictions.find(
    (prediction) => !isPredictionSynced(prediction.syncStatus)
  );

  if (matchPrediction) {
    return matchPrediction.matchId;
  }

  const tiebreakOverride = predictionSet.tiebreakOverrides?.find(
    (override) => !isPredictionSynced(override.syncStatus)
  );

  if (tiebreakOverride) {
    return tiebreakOverride.scopeRef;
  }

  return predictionSet.antepostPredictions?.find(
    (prediction) => !isPredictionSynced(prediction.syncStatus)
  )?.definitionId;
}

function isValidGoal(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
