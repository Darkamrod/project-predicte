import type { CompetitionSeed, KnockoutRoundCode } from "@/domain/competitions/types";
import { createLeaderboardSnapshot } from "@/domain/leaderboard/leaderboard";
import type { LeaderboardParticipant, LeaderboardSnapshot } from "@/domain/leaderboard/types";
import {
  generatePredictedBracket,
  getMatchPrediction,
  type PredictedBracket,
  type PredictedBracketMatch
} from "@/domain/predictions/bracket";
import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionSet
} from "@/domain/predictions/types";
import {
  scoreAntepost,
  scoreCorrectPairing,
  scoreGroupPosition,
  scoreRegulationMatch,
  scoreStageQualification,
  sumScoringEvents
} from "./engine";
import type {
  OfficialMatchResult,
  OfficialTournamentResultSet,
  ScoringBreakdownItem,
  ScoringBreakdownScope,
  ScoringContext,
  ScoringEvent,
  ScoringRuleVersion,
  ScoringStageKey,
  UserScoringBreakdown
} from "./types";

export interface TournamentScoringInput {
  competition: CompetitionSeed;
  leagueId: string;
  competitionEditionId: string;
  scoringRuleVersion: ScoringRuleVersion;
  predictionSets: PredictionSet[];
  participants: LeaderboardParticipant[];
  resultSet: OfficialTournamentResultSet;
  existingEvents?: ScoringEvent[];
  previousSnapshot?: LeaderboardSnapshot;
}

export interface TournamentScoringOutput {
  latestEvents: ScoringEvent[];
  allEvents: ScoringEvent[];
  leaderboardSnapshot: LeaderboardSnapshot;
  breakdowns: UserScoringBreakdown[];
}

export function recalculateTournamentScoring(
  input: TournamentScoringInput
): TournamentScoringOutput {
  const latestEvents = input.predictionSets
    .flatMap((predictionSet) =>
      scorePredictionSetTournament({
        competition: input.competition,
        leagueId: input.leagueId,
        competitionEditionId: input.competitionEditionId,
        scoringRuleVersion: input.scoringRuleVersion,
        predictionSet,
        resultSet: input.resultSet
      })
    )
    .sort(compareScoringEvents);
  const priorEvents = (input.existingEvents ?? []).filter(
    (event) => event.sourceResultVersion !== input.resultSet.sourceResultVersion
  );
  const allEvents = [...priorEvents, ...latestEvents].sort(compareScoringEvents);
  const leaderboardInput = {
    leagueId: input.leagueId,
    createdAtUtc: input.resultSet.createdAtUtc,
    sourceResultVersion: input.resultSet.sourceResultVersion,
    participants: input.participants,
    allEvents,
    latestEvents,
    ...(input.previousSnapshot ? { previousSnapshot: input.previousSnapshot } : {})
  };

  return {
    latestEvents,
    allEvents,
    leaderboardSnapshot: createLeaderboardSnapshot(leaderboardInput),
    breakdowns: buildScoringBreakdowns(allEvents)
  };
}

export function scorePredictionSetTournament(params: {
  competition: CompetitionSeed;
  leagueId: string;
  competitionEditionId: string;
  scoringRuleVersion: ScoringRuleVersion;
  predictionSet: PredictionSet;
  resultSet: OfficialTournamentResultSet;
}): ScoringEvent[] {
  const bracket = generatePredictedBracket({
    competition: params.competition,
    predictionSet: params.predictionSet
  });
  const context: ScoringContext = {
    leagueId: params.leagueId,
    participantUserId: params.predictionSet.userId,
    competitionEditionId: params.competitionEditionId,
    scoringRuleVersionId: params.scoringRuleVersion.id,
    sourceResultVersion: params.resultSet.sourceResultVersion,
    createdAtUtc: params.resultSet.createdAtUtc
  };
  const events: ScoringEvent[] = [];

  events.push(
    ...scoreOfficialMatches(
      params.scoringRuleVersion,
      context,
      bracket,
      params.predictionSet,
      params.resultSet.matchResults
    )
  );
  events.push(
    ...scoreOfficialGroupPositions(
      params.scoringRuleVersion,
      context,
      bracket,
      params.resultSet.groupPositions
    )
  );
  events.push(
    ...scoreOfficialStageQualifications(
      params.scoringRuleVersion,
      context,
      bracket,
      params.resultSet.stageQualifications
    )
  );
  events.push(
    ...scoreOfficialPairings(params.scoringRuleVersion, context, bracket, params.resultSet.pairings)
  );
  events.push(
    ...scoreOfficialAntepost(
      params.scoringRuleVersion,
      context,
      params.competition,
      params.predictionSet,
      params.resultSet
    )
  );

  return events.sort(compareScoringEvents);
}

export function buildScoringBreakdowns(events: ScoringEvent[]): UserScoringBreakdown[] {
  const itemsByUser = new Map<string, ScoringBreakdownItem[]>();

  for (const event of events) {
    const stage = inferStageFromReference(event.referenceId);
    const item: ScoringBreakdownItem = {
      id: `${event.id}:breakdown`,
      participantUserId: event.participantUserId,
      scope: inferBreakdownScope(event.type),
      referenceId: event.referenceId,
      type: event.type,
      points: event.points,
      reason: event.reason,
      ...(stage ? { stage } : {})
    };

    itemsByUser.set(event.participantUserId, [
      ...(itemsByUser.get(event.participantUserId) ?? []),
      item
    ]);
  }

  return [...itemsByUser.entries()]
    .map(([userId, items]) => ({
      userId,
      totalPoints: sumScoringEvents(events.filter((event) => event.participantUserId === userId)),
      items: items.sort((left, right) => left.id.localeCompare(right.id))
    }))
    .sort(
      (left, right) =>
        right.totalPoints - left.totalPoints || left.userId.localeCompare(right.userId)
    );
}

function scoreOfficialMatches(
  scoringRuleVersion: ScoringRuleVersion,
  context: ScoringContext,
  bracket: PredictedBracket,
  predictionSet: PredictionSet,
  matchResults: OfficialMatchResult[]
): ScoringEvent[] {
  return matchResults.flatMap((result) => {
    const prediction = getMatchPrediction(predictionSet, result.matchId);

    if (!prediction || !predictionAppliesToOfficialMatch(bracket, prediction, result)) {
      return [];
    }

    return scoreRegulationMatch(scoringRuleVersion.config, context, {
      stage: result.stage,
      matchId: result.matchId,
      prediction: createPredictionScoreInput(prediction),
      result: createOfficialScoreInput(result)
    });
  });
}

function scoreOfficialGroupPositions(
  scoringRuleVersion: ScoringRuleVersion,
  context: ScoringContext,
  bracket: PredictedBracket,
  groupPositions: OfficialTournamentResultSet["groupPositions"]
): ScoringEvent[] {
  return groupPositions.flatMap((actualPosition) => {
    const table = bracket.groupTables.find((item) => item.group.code === actualPosition.groupCode);
    const predictedRow = table?.rows.find((row) => row.position === actualPosition.position);

    if (!predictedRow) {
      return [];
    }

    return scoreGroupPosition(scoringRuleVersion.config, context, {
      referenceId: `group:${actualPosition.groupCode}:position:${actualPosition.position}`,
      predictedTeamId: predictedRow.teamId,
      actualTeamId: actualPosition.teamId,
      position: actualPosition.position
    });
  });
}

function scoreOfficialStageQualifications(
  scoringRuleVersion: ScoringRuleVersion,
  context: ScoringContext,
  bracket: PredictedBracket,
  stageQualifications: OfficialTournamentResultSet["stageQualifications"]
): ScoringEvent[] {
  return stageQualifications.flatMap((qualification) =>
    scoreStageQualification(scoringRuleVersion.config, context, {
      stage: qualification.stage,
      referenceId: qualification.referenceId,
      predictedTeamIds: getPredictedTeamsForStage(bracket, qualification.stage),
      actualTeamIds: qualification.teamIds
    })
  );
}

function scoreOfficialPairings(
  scoringRuleVersion: ScoringRuleVersion,
  context: ScoringContext,
  bracket: PredictedBracket,
  pairings: OfficialTournamentResultSet["pairings"]
): ScoringEvent[] {
  return pairings.flatMap((pairing) => {
    const predictedMatch = findPredictedMatch(bracket, pairing.stage, pairing.order);

    if (!predictedMatch?.homeTeamId || !predictedMatch.awayTeamId) {
      return [];
    }

    return scoreCorrectPairing(scoringRuleVersion.config, context, {
      stage: pairing.stage,
      referenceId: pairing.referenceId,
      predictedTeamIds: [predictedMatch.homeTeamId, predictedMatch.awayTeamId],
      actualTeamIds: pairing.teamIds
    });
  });
}

function scoreOfficialAntepost(
  scoringRuleVersion: ScoringRuleVersion,
  context: ScoringContext,
  competition: CompetitionSeed,
  predictionSet: PredictionSet,
  resultSet: OfficialTournamentResultSet
): ScoringEvent[] {
  if (!resultSet.antepost) {
    return [];
  }

  const winnerDefinition = competition.antepostDefinitions.find(
    (definition) => definition.code === "TOURNAMENT_WINNER"
  );
  const topScorerDefinition = competition.antepostDefinitions.find(
    (definition) => definition.code === "TOP_SCORER"
  );
  const topScorerGoalsDefinition = competition.antepostDefinitions.find(
    (definition) => definition.code === "TOP_SCORER_GOALS"
  );
  const winnerPrediction = findAntepostPrediction(predictionSet, winnerDefinition?.id);
  const topScorerPrediction = findAntepostPrediction(predictionSet, topScorerDefinition?.id);
  const topScorerGoalsPrediction = findAntepostPrediction(
    predictionSet,
    topScorerGoalsDefinition?.id
  );

  return scoreAntepost(scoringRuleVersion.config, context, {
    referenceId: "antepost",
    ...(winnerPrediction?.selectedTeamId
      ? { predictedWinnerTeamId: winnerPrediction.selectedTeamId }
      : {}),
    ...(resultSet.antepost.winnerTeamId
      ? { actualWinnerTeamId: resultSet.antepost.winnerTeamId }
      : {}),
    ...(topScorerPrediction?.selectedPlayerId
      ? { predictedTopScorerPlayerId: topScorerPrediction.selectedPlayerId }
      : {}),
    ...(resultSet.antepost.topScorerPlayerIds
      ? { actualTopScorerPlayerIds: resultSet.antepost.topScorerPlayerIds }
      : {}),
    ...(topScorerGoalsPrediction?.numericValue !== undefined
      ? { predictedTopScorerGoals: topScorerGoalsPrediction.numericValue }
      : {}),
    ...(resultSet.antepost.topScorerGoals !== undefined
      ? { actualTopScorerGoals: resultSet.antepost.topScorerGoals }
      : {})
  });
}

function predictionAppliesToOfficialMatch(
  bracket: PredictedBracket,
  prediction: MatchPrediction,
  result: OfficialMatchResult
): boolean {
  if (result.stage === "GROUP_STAGE") {
    return true;
  }

  const predictedMatch = findPredictedMatchByIdOrOrder(bracket, result);

  return (
    predictedMatch?.homeTeamId === result.homeTeamId &&
    predictedMatch.awayTeamId === result.awayTeamId &&
    prediction.matchId === predictedMatch.id
  );
}

function createPredictionScoreInput(prediction: MatchPrediction): {
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string;
  advancementMethod?: NonNullable<MatchPrediction["advancementMethod"]>;
} {
  return {
    homeGoals: prediction.homeGoals,
    awayGoals: prediction.awayGoals,
    ...(prediction.qualifiedTeamId ? { qualifiedTeamId: prediction.qualifiedTeamId } : {}),
    ...(prediction.advancementMethod ? { advancementMethod: prediction.advancementMethod } : {})
  };
}

function createOfficialScoreInput(result: OfficialMatchResult): {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  qualifiedTeamId?: string;
  advancementMethod?: NonNullable<OfficialMatchResult["advancementMethod"]>;
} {
  return {
    homeTeamId: result.homeTeamId,
    awayTeamId: result.awayTeamId,
    homeGoals: result.homeGoals,
    awayGoals: result.awayGoals,
    ...(result.qualifiedTeamId ? { qualifiedTeamId: result.qualifiedTeamId } : {}),
    ...(result.advancementMethod ? { advancementMethod: result.advancementMethod } : {})
  };
}

function getPredictedTeamsForStage(bracket: PredictedBracket, stage: ScoringStageKey): string[] {
  if (stage === "GROUP_STAGE") {
    return [];
  }

  return uniqueTeamIds(
    bracket.matches
      .filter((match) => match.roundCode === stage)
      .flatMap((match) => [match.homeTeamId, match.awayTeamId])
  );
}

function findPredictedMatch(
  bracket: PredictedBracket,
  stage: ScoringStageKey,
  order: number
): PredictedBracketMatch | undefined {
  if (stage === "GROUP_STAGE") {
    return undefined;
  }

  return bracket.matches.find((match) => match.roundCode === stage && match.order === order);
}

function findPredictedMatchByIdOrOrder(
  bracket: PredictedBracket,
  result: OfficialMatchResult
): PredictedBracketMatch | undefined {
  if (result.stage === "GROUP_STAGE") {
    return undefined;
  }

  return (
    bracket.matches.find((match) => match.id === result.matchId) ??
    findPredictedMatch(bracket, result.stage, result.order)
  );
}

function findAntepostPrediction(
  predictionSet: PredictionSet,
  definitionId?: string
): AntepostPrediction | undefined {
  if (!definitionId) {
    return undefined;
  }

  return predictionSet.antepostPredictions?.find(
    (prediction) => prediction.definitionId === definitionId
  );
}

function uniqueTeamIds(teamIds: Array<string | undefined>): string[] {
  return [...new Set(teamIds.filter((teamId): teamId is string => Boolean(teamId)))];
}

function inferBreakdownScope(type: ScoringEvent["type"]): ScoringBreakdownScope {
  if (type === "TOURNAMENT_WINNER" || type === "TOP_SCORER" || type === "TOP_SCORER_EXACT_GOALS") {
    return "ANTEPOST";
  }

  if (type === "GROUP_POSITION" || type === "STAGE_QUALIFICATION" || type === "CORRECT_PAIRING") {
    return "STAGE";
  }

  return "MATCH";
}

function inferStageFromReference(
  referenceId: string
): KnockoutRoundCode | "GROUP_STAGE" | undefined {
  if (referenceId.startsWith("group:")) {
    return "GROUP_STAGE";
  }

  const stage = referenceId
    .split(":")
    .find((part): part is KnockoutRoundCode =>
      [
        "PLAYOFF",
        "ROUND_OF_32",
        "ROUND_OF_16",
        "QUARTER_FINAL",
        "SEMI_FINAL",
        "THIRD_PLACE",
        "FINAL"
      ].includes(part)
    );

  return stage;
}

function compareScoringEvents(left: ScoringEvent, right: ScoringEvent): number {
  return left.id.localeCompare(right.id);
}
