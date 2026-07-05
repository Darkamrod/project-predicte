import type { CompetitionSeed, Group, KnockoutRoundCode, Team } from "@/domain/competitions/types";
import { calculatePredictedGroupStandings } from "./standings";
import type { GroupStandingRow, MatchPrediction, PredictionSet } from "./types";

export interface PredictedGroupTable {
  group: Group;
  rows: GroupStandingRow[];
}

export interface BestThirdPlaceQualifier {
  rank: number;
  groupCode: string;
  row: GroupStandingRow;
}

export interface PredictedBracketSlot {
  id: string;
  label: string;
  teamId?: string | undefined;
  sourceRef: string;
}

export interface PredictedBracketMatch {
  id: string;
  roundCode: KnockoutRoundCode;
  roundName: string;
  order: number;
  homeSlot: PredictedBracketSlot;
  awaySlot: PredictedBracketSlot;
  homeTeamId?: string | undefined;
  awayTeamId?: string | undefined;
  dependsOnMatchIds: string[];
}

export interface PredictedBracket {
  groupTables: PredictedGroupTable[];
  leagueTable: GroupStandingRow[];
  bestThirdPlaceQualifiers: BestThirdPlaceQualifier[];
  matches: PredictedBracketMatch[];
}

const roundNames: Record<KnockoutRoundCode, string> = {
  PLAYOFF: "Playoff",
  ROUND_OF_32: "Sedicesimi",
  ROUND_OF_16: "Ottavi",
  QUARTER_FINAL: "Quarti",
  SEMI_FINAL: "Semifinali",
  THIRD_PLACE: "Finale 3 posto",
  FINAL: "Finale"
};

export function calculatePredictedGroupTables(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): PredictedGroupTable[] {
  return params.competition.groups.map((group) => {
    const matches = params.competition.matches.filter((match) => match.groupId === group.id);
    const teamIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
    const teams = params.competition.teams.filter((team) => teamIds.has(team.id));

    return {
      group,
      rows: calculatePredictedGroupStandings({
        teams,
        matches,
        predictions: params.predictionSet.matchPredictions,
        tiebreakOverrides: params.predictionSet.tiebreakOverrides ?? [],
        scopeRef: groupScopeRef(group.code)
      })
    };
  });
}

export function calculatePredictedLeagueTable(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): GroupStandingRow[] {
  if (params.competition.edition.format.initialStageKind !== "league_phase") {
    return [];
  }

  return calculatePredictedGroupStandings({
    teams: params.competition.teams,
    matches: params.competition.matches,
    predictions: params.predictionSet.matchPredictions,
    tiebreakOverrides: params.predictionSet.tiebreakOverrides ?? [],
    scopeRef: "league_phase"
  });
}

export function selectBestThirdPlacedTeams(
  groupTables: PredictedGroupTable[],
  count: number
): BestThirdPlaceQualifier[] {
  return groupTables
    .flatMap((table) => {
      const third = table.rows.find((row) => row.position === 3);

      return third
        ? [
            {
              rank: 0,
              groupCode: table.group.code,
              row: third
            }
          ]
        : [];
    })
    .sort(compareThirdPlaceQualifiers)
    .slice(0, count)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function generatePredictedBracket(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): PredictedBracket {
  const groupTables = calculatePredictedGroupTables(params);
  const leagueTable = calculatePredictedLeagueTable(params);
  const bestThirdPlaceQualifiers = selectBestThirdPlacedTeams(
    groupTables,
    params.competition.edition.format.bestThirdPlacedTeams
  );
  const matches: PredictedBracketMatch[] = [];
  let previousRoundMatches: PredictedBracketMatch[] = [];
  let semiFinalMatches: PredictedBracketMatch[] = [];

  for (const roundCode of params.competition.edition.format.knockoutRounds) {
    const configuredSlots = params.competition.bracketSlots.filter(
      (slot) => slot.roundCode === roundCode
    );
    const roundMatches =
      configuredSlots.length > 0
        ? pairSlots(
            roundCode,
            configuredSlots.map((slot) =>
              resolveBracketSlot({
                slotId: slot.id,
                source: slot.source,
                groupTables,
                leagueTable,
                bestThirds: bestThirdPlaceQualifiers,
                generatedMatches: matches,
                predictionSet: params.predictionSet
              })
            )
          )
        : roundCode === "THIRD_PLACE"
          ? generateThirdPlaceMatches({
              previousMatches: semiFinalMatches,
              predictionSet: params.predictionSet
            })
          : generateNextRoundMatches({
              roundCode,
              previousMatches: previousRoundMatches,
              predictionSet: params.predictionSet
            });

    matches.push(...roundMatches);

    if (roundCode === "SEMI_FINAL") {
      semiFinalMatches = roundMatches;
    }

    if (roundCode !== "THIRD_PLACE") {
      previousRoundMatches = roundMatches;
    }
  }

  return {
    groupTables,
    leagueTable,
    bestThirdPlaceQualifiers,
    matches: orderConfiguredRounds(params.competition.edition.format.knockoutRounds, matches)
  };
}

export function groupScopeRef(groupCode: string): string {
  return `group:${groupCode}`;
}

export function getMatchPrediction(
  predictionSet: PredictionSet,
  matchId: string
): MatchPrediction | undefined {
  return predictionSet.matchPredictions.find((prediction) => prediction.matchId === matchId);
}

export function getPredictedQualifiedTeamId(
  match: PredictedBracketMatch,
  prediction?: MatchPrediction
): string | undefined {
  if (!prediction || !match.homeTeamId || !match.awayTeamId) {
    return undefined;
  }

  if (prediction.homeGoals > prediction.awayGoals) {
    return match.homeTeamId;
  }

  if (prediction.awayGoals > prediction.homeGoals) {
    return match.awayTeamId;
  }

  return prediction.qualifiedTeamId;
}

export function getPredictedEliminatedTeamId(
  match: PredictedBracketMatch,
  prediction?: MatchPrediction
): string | undefined {
  const qualifiedTeamId = getPredictedQualifiedTeamId(match, prediction);

  if (!qualifiedTeamId || !match.homeTeamId || !match.awayTeamId) {
    return undefined;
  }

  return qualifiedTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
}

export function getTeamLabel(teamsById: Map<string, Team>, teamId?: string): string {
  if (!teamId) {
    return "Da definire";
  }

  return teamsById.get(teamId)?.name ?? teamId;
}

function resolveBracketSlot(params: {
  slotId: string;
  source: CompetitionSeed["bracketSlots"][number]["source"];
  groupTables: PredictedGroupTable[];
  leagueTable: GroupStandingRow[];
  bestThirds: BestThirdPlaceQualifier[];
  generatedMatches: PredictedBracketMatch[];
  predictionSet: PredictionSet;
}): PredictedBracketSlot {
  const source = params.source;

  if (source.type === "GROUP_POSITION") {
    const table = params.groupTables.find((item) => item.group.code === source.groupCode);
    const row = table?.rows.find((item) => item.position === source.position);

    return {
      id: params.slotId,
      label: `${source.groupCode}${source.position}`,
      teamId: row?.teamId,
      sourceRef: groupScopeRef(source.groupCode)
    };
  }

  if (source.type === "BEST_THIRD") {
    const bestThird = params.bestThirds.find((item) => item.rank === source.rank);

    return {
      id: params.slotId,
      label: `3a #${source.rank}`,
      teamId: bestThird?.row.teamId,
      sourceRef: "best-third"
    };
  }

  if (source.type === "LEAGUE_POSITION") {
    const row = params.leagueTable.find((item) => item.position === source.position);

    return {
      id: params.slotId,
      label: `#${source.position}`,
      teamId: row?.teamId,
      sourceRef: "league_phase"
    };
  }

  const sourceMatch = params.generatedMatches.find((match) => match.id === source.matchId);
  const prediction = sourceMatch
    ? getMatchPrediction(params.predictionSet, sourceMatch.id)
    : undefined;
  const teamId =
    source.type === "WINNER_OF_MATCH"
      ? sourceMatch
        ? getPredictedQualifiedTeamId(sourceMatch, prediction)
        : undefined
      : sourceMatch
        ? getPredictedEliminatedTeamId(sourceMatch, prediction)
        : undefined;

  return {
    id: params.slotId,
    label:
      source.type === "WINNER_OF_MATCH"
        ? `Vincente ${source.matchId}`
        : `Perdente ${source.matchId}`,
    teamId,
    sourceRef: source.matchId
  };
}

function pairSlots(
  roundCode: KnockoutRoundCode,
  slots: PredictedBracketSlot[]
): PredictedBracketMatch[] {
  const matches: PredictedBracketMatch[] = [];

  for (let index = 0; index < slots.length; index += 2) {
    const homeSlot = slots[index];
    const awaySlot = slots[index + 1];

    if (!homeSlot || !awaySlot) {
      continue;
    }

    matches.push(createBracketMatch(roundCode, matches.length + 1, homeSlot, awaySlot, []));
  }

  return matches;
}

function generateNextRoundMatches(params: {
  roundCode: Exclude<KnockoutRoundCode, "THIRD_PLACE">;
  previousMatches: PredictedBracketMatch[];
  predictionSet: PredictionSet;
}): PredictedBracketMatch[] {
  const slots = params.previousMatches.map((match) => {
    const prediction = getMatchPrediction(params.predictionSet, match.id);

    return {
      id: `slot-winner-${match.id}`,
      label: `Vincente ${match.order}`,
      teamId: getPredictedQualifiedTeamId(match, prediction),
      sourceRef: match.id
    };
  });

  return pairSlots(params.roundCode, slots).map((match) => ({
    ...match,
    dependsOnMatchIds: [match.homeSlot.sourceRef, match.awaySlot.sourceRef]
  }));
}

function generateThirdPlaceMatches(params: {
  previousMatches: PredictedBracketMatch[];
  predictionSet: PredictionSet;
}): PredictedBracketMatch[] {
  const slots = params.previousMatches.map((match) => {
    const prediction = getMatchPrediction(params.predictionSet, match.id);

    return {
      id: `slot-loser-${match.id}`,
      label: `Perdente ${match.order}`,
      teamId: getPredictedEliminatedTeamId(match, prediction),
      sourceRef: match.id
    };
  });

  return pairSlots("THIRD_PLACE", slots).map((match) => ({
    ...match,
    dependsOnMatchIds: [match.homeSlot.sourceRef, match.awaySlot.sourceRef]
  }));
}

function createBracketMatch(
  roundCode: KnockoutRoundCode,
  order: number,
  homeSlot: PredictedBracketSlot,
  awaySlot: PredictedBracketSlot,
  dependsOnMatchIds: string[]
): PredictedBracketMatch {
  return {
    id: `predicted-${roundCode.toLowerCase()}-${order}`,
    roundCode,
    roundName: roundNames[roundCode],
    order,
    homeSlot,
    awaySlot,
    homeTeamId: homeSlot.teamId,
    awayTeamId: awaySlot.teamId,
    dependsOnMatchIds
  };
}

function orderConfiguredRounds(
  configuredRounds: KnockoutRoundCode[],
  matches: PredictedBracketMatch[]
): PredictedBracketMatch[] {
  const order = new Map(configuredRounds.map((roundCode, index) => [roundCode, index]));

  return matches.sort((left, right) => {
    const leftRoundOrder = order.get(left.roundCode) ?? Number.MAX_SAFE_INTEGER;
    const rightRoundOrder = order.get(right.roundCode) ?? Number.MAX_SAFE_INTEGER;

    return leftRoundOrder - rightRoundOrder || left.order - right.order;
  });
}

function compareThirdPlaceQualifiers(
  left: Omit<BestThirdPlaceQualifier, "rank">,
  right: Omit<BestThirdPlaceQualifier, "rank">
): number {
  return (
    right.row.points - left.row.points ||
    right.row.goalDifference - left.row.goalDifference ||
    right.row.goalsFor - left.row.goalsFor ||
    left.groupCode.localeCompare(right.groupCode)
  );
}
