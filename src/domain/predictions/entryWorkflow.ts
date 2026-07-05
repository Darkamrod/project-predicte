import type {
  AntepostDefinition,
  CompetitionSeed,
  KnockoutRoundCode,
  Match,
  Team
} from "@/domain/competitions/types";

import {
  generatePredictedBracket,
  getMatchPrediction,
  getPredictedQualifiedTeamId,
  groupScopeRef,
  type PredictedBracket,
  type PredictedBracketMatch
} from "./bracket";
import type {
  AdvancementMethod,
  AntepostPrediction,
  MatchPrediction,
  PredictionSet,
  PredictionValidationIssue
} from "./types";
import { validateKnockoutPrediction, validatePredictionSet } from "./validation";

export type PredictionEntryMode = "QUICK" | "EXPERT";
export type PredictionEntryPhase =
  "MODE" | "INITIAL" | "TIEBREAK" | "KNOCKOUT" | "ANTEPOST" | "REVIEW";
export type EntryOutcome = "HOME" | "DRAW" | "AWAY";
export type KnockoutTieMode = "single_leg" | "two_leg";

export type MatchEntryContext =
  "INITIAL_GROUP_OR_LEAGUE" | "KNOCKOUT_SINGLE_LEG" | "KNOCKOUT_TWO_LEG";

export interface ScoreLine {
  homeGoals: number;
  awayGoals: number;
}

export interface ScoreChip extends ScoreLine {
  label: string;
  outcome: EntryOutcome;
}

export interface NormalizedMatchPredictionInput extends ScoreLine {
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
}

export interface NormalizedPredictionResult {
  input: NormalizedMatchPredictionInput;
  issues: PredictionValidationIssue[];
  aggregatePlaceholder: boolean;
}

export interface PredictionEntryTarget {
  kind: "INITIAL_MATCH" | "TIEBREAK" | "KNOCKOUT_MATCH" | "ANTEPOST" | "REVIEW";
  id: string;
  label: string;
  currentIndex: number;
  totalCount: number;
  context?: MatchEntryContext | undefined;
  match?: Match | undefined;
  bracketMatch?: PredictedBracketMatch | undefined;
  prediction?: MatchPrediction | undefined;
  tieMode?: KnockoutTieMode | undefined;
  scopeRef?: string | undefined;
  orderedTeamIds?: string[] | undefined;
}

export interface PredictionEntryWorkflow {
  mode?: PredictionEntryMode | undefined;
  phase: PredictionEntryPhase;
  target: PredictionEntryTarget;
  bracket: PredictedBracket;
  initialTargets: PredictionEntryTarget[];
  tiebreakTargets: PredictionEntryTarget[];
  knockoutTargets: PredictionEntryTarget[];
  manualAntepostDefinitions: AntepostDefinition[];
  derivedAntepostDefinitions: AntepostDefinition[];
  derivedAntepost: DerivedAntepostSummary;
  issues: PredictionValidationIssue[];
  canConfirm: boolean;
}

export interface DerivedAntepostSummary {
  winnerTeamId?: string | undefined;
  finalistTeamIds?: string[] | undefined;
  thirdPlaceTeamId?: string | undefined;
}

export interface ApplyDerivedAntepostResult {
  predictions: AntepostPrediction[];
  derived: DerivedAntepostSummary;
}

const derivedAntepostCodes = new Set(["TOURNAMENT_WINNER", "FINALISTS"]);

export function buildPredictionEntryWorkflow(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
  mode?: PredictionEntryMode | undefined;
}): PredictionEntryWorkflow {
  const validation = validatePredictionSet(params);
  const initialTargets = buildInitialTargets({
    competition: params.competition,
    predictionSet: params.predictionSet
  });
  const knockoutTargets = buildKnockoutTargets({
    competition: params.competition,
    predictionSet: params.predictionSet,
    bracket: validation.bracket
  });
  const tiebreakTargets = buildTiebreakTargets({
    competition: params.competition,
    bracket: validation.bracket
  });
  const manualAntepostDefinitions = getManualAntepostDefinitions(params.competition);
  const derivedAntepostDefinitions = getDerivedAntepostDefinitions(params.competition);
  const derivedAntepost = deriveBracketAntepostPredictions({
    competition: params.competition,
    predictionSet: params.predictionSet,
    bracket: validation.bracket
  });

  if (!params.mode) {
    return {
      mode: undefined,
      phase: "MODE",
      target: createModeTarget(),
      bracket: validation.bracket,
      initialTargets,
      tiebreakTargets,
      knockoutTargets,
      manualAntepostDefinitions,
      derivedAntepostDefinitions,
      derivedAntepost,
      issues: validation.issues,
      canConfirm: false
    };
  }

  const initialTarget = initialTargets.find((target) => !isPredictionFilled(target.prediction));

  if (initialTarget) {
    return createWorkflowResult("INITIAL", initialTarget);
  }

  if (tiebreakTargets.length > 0) {
    return createWorkflowResult("TIEBREAK", tiebreakTargets[0]!);
  }

  const knockoutTarget = knockoutTargets.find((target) => {
    if (!target.bracketMatch) {
      return false;
    }

    return validateKnockoutPrediction(target.bracketMatch, target.prediction).length > 0;
  });

  if (knockoutTarget) {
    return createWorkflowResult("KNOCKOUT", knockoutTarget);
  }

  const missingManualAntepost = manualAntepostDefinitions.find((definition) => {
    const prediction = params.predictionSet.antepostPredictions?.find(
      (item) => item.definitionId === definition.id
    );

    return !isManualAntepostComplete(definition, prediction);
  });

  if (missingManualAntepost) {
    return createWorkflowResult("ANTEPOST", {
      kind: "ANTEPOST",
      id: missingManualAntepost.id,
      label: missingManualAntepost.label,
      currentIndex:
        manualAntepostDefinitions.findIndex(
          (definition) => definition.id === missingManualAntepost.id
        ) + 1,
      totalCount: manualAntepostDefinitions.length
    });
  }

  return createWorkflowResult("REVIEW", {
    kind: "REVIEW",
    id: "review",
    label: "Riepilogo finale",
    currentIndex: initialTargets.length + knockoutTargets.length + manualAntepostDefinitions.length,
    totalCount: initialTargets.length + knockoutTargets.length + manualAntepostDefinitions.length
  });

  function createWorkflowResult(
    phase: PredictionEntryPhase,
    target: PredictionEntryTarget
  ): PredictionEntryWorkflow {
    return {
      mode: params.mode,
      phase,
      target,
      bracket: validation.bracket,
      initialTargets,
      tiebreakTargets,
      knockoutTargets,
      manualAntepostDefinitions,
      derivedAntepostDefinitions,
      derivedAntepost,
      issues: validation.issues,
      canConfirm: validation.issues.every((issue) => issue.severity !== "error")
    };
  }
}

export function buildInitialTargets(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): PredictionEntryTarget[] {
  return params.competition.matches
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((match, index) => {
      const stage = params.competition.stages.find((item) => item.id === match.stageId);
      const group = params.competition.groups.find((item) => item.id === match.groupId);
      const prediction = getMatchPrediction(params.predictionSet, match.id);
      const label = group
        ? `${getInitialPhaseLabel(params.competition)} - ${group.name}`
        : getInitialPhaseLabel(params.competition);

      return {
        kind: "INITIAL_MATCH",
        id: match.id,
        label: stage?.name ? `${stage.name}${group ? ` - ${group.name}` : ""}` : label,
        currentIndex: index + 1,
        totalCount: params.competition.matches.length,
        context: "INITIAL_GROUP_OR_LEAGUE",
        match,
        prediction
      };
    });
}

export function buildTiebreakTargets(params: {
  competition: CompetitionSeed;
  bracket: PredictedBracket;
}): PredictionEntryTarget[] {
  const targets = params.bracket.groupTables.flatMap((table) => {
    const scopeRef = groupScopeRef(table.group.code);
    const tiedRowsByKey = new Map<string, typeof table.rows>();

    for (const row of table.rows.filter((item) => item.unresolvedTie)) {
      const key = [row.points, row.goalDifference, row.goalsFor].join(":");

      tiedRowsByKey.set(key, [...(tiedRowsByKey.get(key) ?? []), row]);
    }

    return [...tiedRowsByKey.entries()]
      .filter(([, rows]) => rows.length > 1)
      .map(([key, rows], index): PredictionEntryTarget => ({
        kind: "TIEBREAK",
        id: `tiebreak:${scopeRef}:${key}:${index + 1}`,
        label: `${table.group.name}: pari merito`,
        currentIndex: 0,
        totalCount: 0,
        scopeRef,
        orderedTeamIds: rows.map((row) => row.teamId)
      }));
  });

  return targets.map((target, index) => ({
    ...target,
    currentIndex: index + 1,
    totalCount: targets.length
  }));
}

export function buildKnockoutTargets(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
  bracket?: PredictedBracket | undefined;
}): PredictionEntryTarget[] {
  const bracket = params.bracket ?? generatePredictedBracket(params);

  return bracket.matches.map((match, index) => {
    const tieMode = getKnockoutTieMode(params.competition, match.roundCode);

    return {
      kind: "KNOCKOUT_MATCH",
      id: match.id,
      label: `${match.roundName} ${match.order}`,
      currentIndex: params.competition.matches.length + index + 1,
      totalCount: params.competition.matches.length + bracket.matches.length,
      context: tieMode === "two_leg" ? "KNOCKOUT_TWO_LEG" : "KNOCKOUT_SINGLE_LEG",
      bracketMatch: match,
      prediction: getMatchPrediction(params.predictionSet, match.id),
      tieMode
    };
  });
}

export function getInitialPhaseLabel(competition: CompetitionSeed): string {
  return competition.edition.format.initialStageKind === "league_phase"
    ? "League phase"
    : "Fase a gironi";
}

export function getKnockoutTieMode(
  competition: CompetitionSeed,
  roundCode: KnockoutRoundCode
): KnockoutTieMode {
  return competition.edition.format.knockoutTieModeByRound?.[roundCode] ?? "single_leg";
}

export function getScoreChips(params: {
  outcome: EntryOutcome;
  context: MatchEntryContext;
}): ScoreChip[] {
  if (params.outcome === "DRAW") {
    return toScoreChips("DRAW", [
      [0, 0],
      [1, 1],
      [2, 2]
    ]);
  }

  if (params.context === "INITIAL_GROUP_OR_LEAGUE") {
    return params.outcome === "HOME"
      ? toScoreChips("HOME", [
          [1, 0],
          [2, 0],
          [2, 1],
          [3, 0],
          [3, 1]
        ])
      : toScoreChips("AWAY", [
          [0, 1],
          [0, 2],
          [1, 2],
          [0, 3],
          [1, 3]
        ]);
  }

  return params.outcome === "HOME"
    ? toScoreChips("HOME", [
        [1, 0],
        [2, 0],
        [2, 1],
        [3, 1],
        [0, 0],
        [1, 1],
        [2, 2]
      ])
    : toScoreChips("AWAY", [
        [0, 1],
        [0, 2],
        [1, 2],
        [1, 3],
        [0, 0],
        [1, 1],
        [2, 2]
      ]);
}

export function normalizeInitialPhasePrediction(params: {
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
}): NormalizedPredictionResult {
  const issues = validateScoreLine(params.homeGoals, params.awayGoals);

  if (params.qualifiedTeamId || params.advancementMethod) {
    issues.push({
      id: "initial-phase:qualification",
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "Supplementari, rigori e qualificata non sono validi nella fase iniziale"
    });
  }

  return {
    input: {
      homeGoals: params.homeGoals,
      awayGoals: params.awayGoals
    },
    issues,
    aggregatePlaceholder: false
  };
}

export function normalizeKnockoutPredictionInput(params: {
  match: Pick<
    PredictedBracketMatch,
    "id" | "homeTeamId" | "awayTeamId" | "roundCode" | "roundName"
  >;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string | undefined;
  advancementMethod?: AdvancementMethod | undefined;
  tieMode: KnockoutTieMode;
}): NormalizedPredictionResult {
  const issues = validateScoreLine(params.homeGoals, params.awayGoals);
  const isDraw = params.homeGoals === params.awayGoals;
  const homeTeamId = params.match.homeTeamId;
  const awayTeamId = params.match.awayTeamId;

  if (!homeTeamId || !awayTeamId) {
    issues.push({
      id: `bracket:${params.match.id}`,
      kind: "BRACKET_INCOMPLETE",
      severity: "error",
      message: `${params.match.roundName}: squadre non ancora definite`,
      referenceId: params.match.id
    });
  }

  if (!params.qualifiedTeamId) {
    issues.push({
      id: `qualified:${params.match.id}`,
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "Scegli la squadra qualificata",
      referenceId: params.match.id
    });
  }

  if (!params.advancementMethod) {
    issues.push({
      id: `method:${params.match.id}`,
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "Scegli il metodo di qualificazione",
      referenceId: params.match.id
    });
  }

  if (!isDraw && params.advancementMethod && params.advancementMethod !== "REGULATION") {
    issues.push({
      id: `method-nondraw:${params.match.id}`,
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "Rigori o supplementari richiedono un pareggio nei 90 minuti",
      referenceId: params.match.id
    });
  }

  if (isDraw && params.advancementMethod === "REGULATION") {
    issues.push({
      id: `method-draw:${params.match.id}`,
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "Un pareggio nei 90 minuti richiede supplementari o rigori",
      referenceId: params.match.id
    });
  }

  if (!isDraw && homeTeamId && awayTeamId && params.qualifiedTeamId) {
    const winnerTeamId = params.homeGoals > params.awayGoals ? homeTeamId : awayTeamId;

    if (params.qualifiedTeamId !== winnerTeamId) {
      issues.push({
        id: `qualified-winner:${params.match.id}`,
        kind: "INVALID_KNOCKOUT",
        severity: "error",
        message: "La qualificata deve corrispondere alla vincente nei 90 minuti",
        referenceId: params.match.id
      });
    }
  }

  if (
    isDraw &&
    params.qualifiedTeamId &&
    params.qualifiedTeamId !== homeTeamId &&
    params.qualifiedTeamId !== awayTeamId
  ) {
    issues.push({
      id: `qualified-draw:${params.match.id}`,
      kind: "INVALID_KNOCKOUT",
      severity: "error",
      message: "La qualificata deve essere una delle due squadre",
      referenceId: params.match.id
    });
  }

  return {
    input: {
      homeGoals: params.homeGoals,
      awayGoals: params.awayGoals,
      qualifiedTeamId: params.qualifiedTeamId,
      advancementMethod: params.advancementMethod
    },
    issues,
    aggregatePlaceholder: params.tieMode === "two_leg"
  };
}

export function deriveBracketAntepostPredictions(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
  bracket?: PredictedBracket | undefined;
}): DerivedAntepostSummary {
  const bracket = params.bracket ?? generatePredictedBracket(params);
  const finalMatch = bracket.matches.find((match) => match.roundCode === "FINAL");
  const thirdPlaceMatch = bracket.matches.find((match) => match.roundCode === "THIRD_PLACE");
  const finalPrediction = finalMatch
    ? getMatchPrediction(params.predictionSet, finalMatch.id)
    : undefined;
  const thirdPlacePrediction = thirdPlaceMatch
    ? getMatchPrediction(params.predictionSet, thirdPlaceMatch.id)
    : undefined;

  return {
    ...(finalMatch?.homeTeamId && finalMatch.awayTeamId
      ? { finalistTeamIds: [finalMatch.homeTeamId, finalMatch.awayTeamId] }
      : {}),
    ...(finalMatch && finalPrediction
      ? { winnerTeamId: getPredictedQualifiedTeamId(finalMatch, finalPrediction) }
      : {}),
    ...(thirdPlaceMatch && thirdPlacePrediction
      ? { thirdPlaceTeamId: getPredictedQualifiedTeamId(thirdPlaceMatch, thirdPlacePrediction) }
      : {})
  };
}

export function applyDerivedAntepostPredictions(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
  updatedAtUtc: string;
}): ApplyDerivedAntepostResult {
  const bracket = generatePredictedBracket(params);
  const derived = deriveBracketAntepostPredictions({
    competition: params.competition,
    predictionSet: params.predictionSet,
    bracket
  });
  const nextPredictions = [...(params.predictionSet.antepostPredictions ?? [])];

  upsertDerivedPrediction({
    predictions: nextPredictions,
    predictionSetId: params.predictionSet.id,
    definition: params.competition.antepostDefinitions.find(
      (definition) => definition.code === "TOURNAMENT_WINNER"
    ),
    selectedTeamId: derived.winnerTeamId,
    updatedAtUtc: params.updatedAtUtc
  });
  upsertDerivedPrediction({
    predictions: nextPredictions,
    predictionSetId: params.predictionSet.id,
    definition: params.competition.antepostDefinitions.find(
      (definition) => definition.code === "FINALISTS"
    ),
    selectedTeamIds: derived.finalistTeamIds,
    updatedAtUtc: params.updatedAtUtc
  });

  return {
    predictions: nextPredictions,
    derived
  };
}

export function getManualAntepostDefinitions(competition: CompetitionSeed): AntepostDefinition[] {
  return competition.antepostDefinitions.filter(
    (definition) => !derivedAntepostCodes.has(definition.code)
  );
}

export function getDerivedAntepostDefinitions(competition: CompetitionSeed): AntepostDefinition[] {
  return competition.antepostDefinitions.filter((definition) =>
    derivedAntepostCodes.has(definition.code)
  );
}

export function areNormalizedPredictionsEquivalent(
  left: NormalizedMatchPredictionInput,
  right: NormalizedMatchPredictionInput
): boolean {
  return (
    left.homeGoals === right.homeGoals &&
    left.awayGoals === right.awayGoals &&
    left.qualifiedTeamId === right.qualifiedTeamId &&
    left.advancementMethod === right.advancementMethod
  );
}

export function getTeamInitials(team?: Team | undefined): string {
  if (!team) {
    return "--";
  }

  return team.shortName.slice(0, 3).toUpperCase();
}

export function isManualAntepostComplete(
  definition: AntepostDefinition,
  prediction?: AntepostPrediction | undefined
): boolean {
  if (!definition.required) {
    return true;
  }

  if (!prediction) {
    return false;
  }

  if (definition.code === "TOP_SCORER") {
    return Boolean(prediction.selectedPlayerId || prediction.textValue?.trim());
  }

  if (definition.code === "TOP_SCORER_GOALS") {
    return Number.isInteger(prediction.numericValue) && (prediction.numericValue ?? -1) >= 0;
  }

  return true;
}

function createModeTarget(): PredictionEntryTarget {
  return {
    kind: "REVIEW",
    id: "mode",
    label: "Come vuoi compilare?",
    currentIndex: 0,
    totalCount: 0
  };
}

function toScoreChips(
  outcome: EntryOutcome,
  scores: readonly (readonly [number, number])[]
): ScoreChip[] {
  return scores.map(([homeGoals, awayGoals]) => ({
    homeGoals,
    awayGoals,
    label: `${homeGoals}-${awayGoals}`,
    outcome
  }));
}

function validateScoreLine(homeGoals: number, awayGoals: number): PredictionValidationIssue[] {
  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    return [
      {
        id: "score:invalid",
        kind: "INVALID_KNOCKOUT",
        severity: "error",
        message: "Il risultato deve usare gol interi non negativi"
      }
    ];
  }

  return [];
}

function isPredictionFilled(prediction?: MatchPrediction | undefined): boolean {
  return Boolean(
    prediction &&
    Number.isInteger(prediction.homeGoals) &&
    Number.isInteger(prediction.awayGoals) &&
    prediction.homeGoals >= 0 &&
    prediction.awayGoals >= 0
  );
}

function upsertDerivedPrediction(params: {
  predictions: AntepostPrediction[];
  predictionSetId: string;
  definition?: AntepostDefinition | undefined;
  selectedTeamId?: string | undefined;
  selectedTeamIds?: string[] | undefined;
  updatedAtUtc: string;
}): void {
  if (!params.definition) {
    return;
  }

  if (!params.selectedTeamId && !params.selectedTeamIds?.length) {
    return;
  }

  const nextPrediction: AntepostPrediction = {
    id: `${params.predictionSetId}:antepost:${params.definition.id}`,
    predictionSetId: params.predictionSetId,
    definitionId: params.definition.id,
    ...(params.selectedTeamId ? { selectedTeamId: params.selectedTeamId } : {}),
    ...(params.selectedTeamIds ? { selectedTeamIds: params.selectedTeamIds } : {}),
    syncStatus: "SYNCED",
    updatedAtUtc: params.updatedAtUtc
  };
  const index = params.predictions.findIndex(
    (prediction) => prediction.definitionId === params.definition?.id
  );

  if (index >= 0) {
    params.predictions[index] = nextPrediction;
    return;
  }

  params.predictions.push(nextPrediction);
}
