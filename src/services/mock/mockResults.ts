import type { CompetitionSeed, KnockoutRoundCode, Match } from "@/domain/competitions/types";
import type {
  OfficialGroupPosition,
  OfficialMatchResult,
  OfficialPairing,
  OfficialStageQualification,
  OfficialTournamentResultSet
} from "@/domain/scoring/types";

export function createWorldCupMockResultSet(params: {
  competition: CompetitionSeed;
  sourceResultVersion: string;
  createdAtUtc: string;
}): OfficialTournamentResultSet {
  const groupPositions = createGroupPositions(params.competition);
  const groupResults = params.competition.matches.map(createGroupMatchResult);
  const knockout = createKnockoutResults(params.competition, groupPositions);

  return {
    sourceResultVersion: params.sourceResultVersion,
    createdAtUtc: params.createdAtUtc,
    matchResults: [...groupResults, ...knockout.matchResults],
    groupPositions,
    stageQualifications: knockout.stageQualifications,
    pairings: knockout.pairings,
    antepost: {
      winnerTeamId: knockout.tournamentWinnerTeamId,
      topScorerPlayerIds: params.competition.players[0] ? [params.competition.players[0].id] : [],
      topScorerGoals: 7
    }
  };
}

function createGroupPositions(competition: CompetitionSeed): OfficialGroupPosition[] {
  return competition.groups.flatMap((group) => {
    const matches = competition.matches.filter((match) => match.groupId === group.id);
    const teamIds = uniqueTeamIds(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));

    return teamIds.map((teamId, index) => ({
      groupCode: group.code,
      position: index + 1,
      teamId
    }));
  });
}

function createGroupMatchResult(match: Match): OfficialMatchResult {
  const pairingIndex = (match.order - 1) % 6;
  const scoreByPairing: Record<number, [number, number]> = {
    0: [2, 0],
    1: [1, 0],
    2: [2, 0],
    3: [0, 2],
    4: [3, 0],
    5: [1, 0]
  };
  const score = scoreByPairing[pairingIndex] ?? [1, 0];

  return {
    matchId: match.id,
    stage: "GROUP_STAGE",
    order: match.order,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeGoals: score[0],
    awayGoals: score[1]
  };
}

function createKnockoutResults(
  competition: CompetitionSeed,
  groupPositions: OfficialGroupPosition[]
): {
  matchResults: OfficialMatchResult[];
  stageQualifications: OfficialStageQualification[];
  pairings: OfficialPairing[];
  tournamentWinnerTeamId?: string | undefined;
} {
  const configuredRounds = competition.edition.format.knockoutRounds;
  const initialTeams = resolveInitialKnockoutTeams(competition, groupPositions);
  const matchResults: OfficialMatchResult[] = [];
  const stageQualifications: OfficialStageQualification[] = [];
  const pairings: OfficialPairing[] = [];
  let incomingTeams = initialTeams;
  let semifinalLosers: string[] = [];
  let tournamentWinnerTeamId: string | undefined;

  for (const roundCode of configuredRounds) {
    if (roundCode === "THIRD_PLACE") {
      const thirdPlace = createRoundMatches(roundCode, semifinalLosers);
      matchResults.push(...thirdPlace.matchResults);
      pairings.push(...thirdPlace.pairings);
      stageQualifications.push(createStageQualification(roundCode, semifinalLosers));
      continue;
    }

    stageQualifications.push(createStageQualification(roundCode, incomingTeams));

    const round = createRoundMatches(roundCode, incomingTeams);
    matchResults.push(...round.matchResults);
    pairings.push(...round.pairings);

    if (roundCode === "SEMI_FINAL") {
      semifinalLosers = round.losers;
    }

    incomingTeams = round.winners;

    if (roundCode === "FINAL") {
      tournamentWinnerTeamId = round.winners[0];
    }
  }

  return {
    matchResults,
    stageQualifications,
    pairings,
    tournamentWinnerTeamId
  };
}

function resolveInitialKnockoutTeams(
  competition: CompetitionSeed,
  groupPositions: OfficialGroupPosition[]
): string[] {
  return competition.bracketSlots
    .filter((slot) => slot.roundCode === "ROUND_OF_32")
    .map((slot) => {
      const source = slot.source;

      if (source.type === "GROUP_POSITION") {
        return groupPositions.find(
          (position) =>
            position.groupCode === source.groupCode && position.position === source.position
        )?.teamId;
      }

      if (source.type === "BEST_THIRD") {
        const bestThirds = groupPositions.filter((position) => position.position === 3);

        return bestThirds[source.rank - 1]?.teamId;
      }

      return undefined;
    })
    .filter((teamId): teamId is string => Boolean(teamId));
}

function createRoundMatches(
  roundCode: KnockoutRoundCode,
  teamIds: string[]
): {
  matchResults: OfficialMatchResult[];
  pairings: OfficialPairing[];
  winners: string[];
  losers: string[];
} {
  const matchResults: OfficialMatchResult[] = [];
  const pairings: OfficialPairing[] = [];
  const winners: string[] = [];
  const losers: string[] = [];

  for (let index = 0; index < teamIds.length; index += 2) {
    const homeTeamId = teamIds[index];
    const awayTeamId = teamIds[index + 1];

    if (!homeTeamId || !awayTeamId) {
      continue;
    }

    const order = matchResults.length + 1;
    const isFinal = roundCode === "FINAL";
    const isThirdPlace = roundCode === "THIRD_PLACE";
    const qualifiedTeamId = homeTeamId;
    const eliminatedTeamId = awayTeamId;
    const homeGoals = isFinal ? 1 : isThirdPlace ? 0 : 2;
    const awayGoals = isFinal ? 1 : isThirdPlace ? 0 : 1;
    const advancementMethod = isFinal ? "EXTRA_TIME" : isThirdPlace ? "PENALTIES" : "REGULATION";

    matchResults.push({
      matchId: `predicted-${roundCode.toLowerCase()}-${order}`,
      stage: roundCode,
      order,
      homeTeamId,
      awayTeamId,
      homeGoals,
      awayGoals,
      qualifiedTeamId,
      advancementMethod
    });
    pairings.push({
      stage: roundCode,
      referenceId: `pairing:${roundCode}:${order}`,
      order,
      teamIds: [homeTeamId, awayTeamId]
    });
    winners.push(qualifiedTeamId);
    losers.push(eliminatedTeamId);
  }

  return {
    matchResults,
    pairings,
    winners,
    losers
  };
}

function createStageQualification(
  stage: KnockoutRoundCode,
  teamIds: string[]
): OfficialStageQualification {
  return {
    stage,
    referenceId: `qualification:${stage}`,
    teamIds
  };
}

function uniqueTeamIds(teamIds: string[]): string[] {
  return [...new Set(teamIds)];
}
