import type {
  AntepostInput,
  GroupPositionInput,
  MatchScoreInput,
  PairingInput,
  QualificationInput,
  ScoringContext,
  ScoringEvent,
  ScoringEventType,
  ScoringRuleConfig
} from "./types";

const calculationVersion = "scoring-engine-m0-v1";

export function scoreRegulationMatch(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: MatchScoreInput
): ScoringEvent[] {
  const events: ScoringEvent[] = [];
  const stageRule = config.stages[input.stage];
  const exactScore =
    input.prediction.homeGoals === input.result.homeGoals &&
    input.prediction.awayGoals === input.result.awayGoals;
  const outcome = getOutcome(input.prediction.homeGoals, input.prediction.awayGoals);
  const actualOutcome = getOutcome(input.result.homeGoals, input.result.awayGoals);

  if (exactScore && stageRule.exactScore > 0) {
    events.push(
      createEvent(context, input.matchId, "EXACT_SCORE", stageRule.exactScore, "Risultato esatto")
    );
  }

  if (
    outcome === actualOutcome &&
    stageRule.correctOutcome > 0 &&
    (!exactScore || !config.stacking.exactScoreReplacesOutcome)
  ) {
    events.push(
      createEvent(
        context,
        input.matchId,
        "MATCH_OUTCOME",
        stageRule.correctOutcome,
        "Segno corretto"
      )
    );
  }

  events.push(...scoreAdvancementMethod(config, context, input));

  return events;
}

export function scoreGroupPosition(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: GroupPositionInput
): ScoringEvent[] {
  const points = config.stages.GROUP_STAGE.correctGroupPosition;

  if (input.predictedTeamId !== input.actualTeamId || points === 0) {
    return [];
  }

  return [
    createEvent(
      context,
      input.referenceId,
      "GROUP_POSITION",
      points,
      `Posizione ${input.position} del girone corretta`
    )
  ];
}

export function scoreStageQualification(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: QualificationInput
): ScoringEvent[] {
  const points = config.stages[input.stage].stageQualification;
  const actualTeamIds = new Set(input.actualTeamIds);

  if (points === 0) {
    return [];
  }

  return input.predictedTeamIds
    .filter((teamId) => actualTeamIds.has(teamId))
    .map((teamId) =>
      createEvent(
        context,
        `${input.referenceId}:${teamId}`,
        "STAGE_QUALIFICATION",
        points,
        "Squadra qualificata alla fase corretta"
      )
    );
}

export function scoreCorrectPairing(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: PairingInput
): ScoringEvent[] {
  const points = config.stages[input.stage].correctPairing;

  if (points === 0 || !sameUnorderedPair(input.predictedTeamIds, input.actualTeamIds)) {
    return [];
  }

  return [
    createEvent(context, input.referenceId, "CORRECT_PAIRING", points, "Accoppiamento corretto")
  ];
}

export function scoreAntepost(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: AntepostInput
): ScoringEvent[] {
  const events: ScoringEvent[] = [];

  if (
    input.predictedWinnerTeamId &&
    input.actualWinnerTeamId &&
    input.predictedWinnerTeamId === input.actualWinnerTeamId
  ) {
    events.push(
      createEvent(
        context,
        `${input.referenceId}:winner`,
        "TOURNAMENT_WINNER",
        config.antepost.tournamentWinner,
        "Vincente torneo corretto"
      )
    );
  }

  const scorerIsCorrect =
    Boolean(input.predictedTopScorerPlayerId) &&
    Boolean(input.actualTopScorerPlayerIds?.includes(input.predictedTopScorerPlayerId ?? ""));
  const goalsAreExact =
    input.predictedTopScorerGoals !== undefined &&
    input.actualTopScorerGoals !== undefined &&
    input.predictedTopScorerGoals === input.actualTopScorerGoals;

  if (scorerIsCorrect && goalsAreExact && config.antepost.topScorerExactGoals > 0) {
    events.push(
      createEvent(
        context,
        `${input.referenceId}:top-scorer-goals`,
        "TOP_SCORER_EXACT_GOALS",
        config.antepost.topScorerExactGoals,
        "Capocannoniere e gol esatti"
      )
    );
  }

  if (
    scorerIsCorrect &&
    config.antepost.topScorer > 0 &&
    (!goalsAreExact || !config.stacking.topScorerExactGoalsReplacesTopScorer)
  ) {
    events.push(
      createEvent(
        context,
        `${input.referenceId}:top-scorer`,
        "TOP_SCORER",
        config.antepost.topScorer,
        "Capocannoniere corretto"
      )
    );
  }

  return events;
}

export function sumScoringEvents(events: ScoringEvent[]): number {
  return events.reduce((total, event) => total + event.points, 0);
}

export function recalculateMatchEvents(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: MatchScoreInput
): ScoringEvent[] {
  return scoreRegulationMatch(config, context, input);
}

function scoreAdvancementMethod(
  config: ScoringRuleConfig,
  context: ScoringContext,
  input: MatchScoreInput
): ScoringEvent[] {
  const predictedMethod = input.prediction.advancementMethod;
  const actualMethod = input.result.advancementMethod;
  const qualifiedTeamMatches =
    input.prediction.qualifiedTeamId !== undefined &&
    input.prediction.qualifiedTeamId === input.result.qualifiedTeamId;
  const regulationWasDraw = input.result.homeGoals === input.result.awayGoals;

  if (
    !predictedMethod ||
    !actualMethod ||
    predictedMethod !== actualMethod ||
    !qualifiedTeamMatches
  ) {
    return [];
  }

  if (config.stacking.advancementMethodRequiresDrawAndQualifier && !regulationWasDraw) {
    return [];
  }

  if (actualMethod === "EXTRA_TIME") {
    const points = config.stages[input.stage].extraTimeMethod;
    return points > 0
      ? [
          createEvent(
            context,
            input.matchId,
            "EXTRA_TIME_METHOD",
            points,
            "Metodo supplementari corretto"
          )
        ]
      : [];
  }

  if (actualMethod === "PENALTIES") {
    const points = config.stages[input.stage].penaltyMethod;
    return points > 0
      ? [createEvent(context, input.matchId, "PENALTY_METHOD", points, "Metodo rigori corretto")]
      : [];
  }

  return [];
}

function getOutcome(homeGoals: number, awayGoals: number): "HOME" | "DRAW" | "AWAY" {
  if (homeGoals > awayGoals) {
    return "HOME";
  }

  if (awayGoals > homeGoals) {
    return "AWAY";
  }

  return "DRAW";
}

function sameUnorderedPair(left: [string, string], right: [string, string]): boolean {
  return left.every((teamId) => right.includes(teamId));
}

function createEvent(
  context: ScoringContext,
  referenceId: string,
  type: ScoringEventType,
  points: number,
  reason: string
): ScoringEvent {
  return {
    id: `${context.leagueId}:${context.participantUserId}:${referenceId}:${type}:${context.sourceResultVersion}`,
    leagueId: context.leagueId,
    participantUserId: context.participantUserId,
    competitionEditionId: context.competitionEditionId,
    referenceId,
    scoringRuleVersionId: context.scoringRuleVersionId,
    type,
    points,
    reason,
    calculationVersion,
    createdAtUtc: context.createdAtUtc,
    sourceResultVersion: context.sourceResultVersion
  };
}
