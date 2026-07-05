import type {
  BracketMappingStrategyCode,
  CompetitionSeed,
  Group,
  KnockoutRoundCode,
  RankingRuleCode,
  Team
} from "@/domain/competitions/types";
import {
  createTieGroupId,
  findTieGroupOverride,
  calculatePredictedGroupStandings,
  type StandingTieGroup
} from "./standings";
import type {
  GroupStandingRow,
  MatchPrediction,
  PredictionSet,
  PredictionTiebreakOverride
} from "./types";

export interface PredictedGroupTable {
  group: Group;
  rows: GroupStandingRow[];
}

export interface BestThirdPlaceQualifier {
  rank: number;
  groupCode: string;
  row: GroupStandingRow;
  unresolvedTie: boolean;
  tieGroupId?: string | undefined;
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
  bestThirdPlaceTieGroups: StandingTieGroup[];
  mappingMetadata: BracketMappingMetadata;
  matches: PredictedBracketMatch[];
}

export interface BracketMappingMetadata {
  strategy: BracketMappingStrategyCode | "sequential_generated";
  status: "official" | "placeholder";
  notes: string[];
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
  count: number,
  tiebreakOverrides: PredictionTiebreakOverride[] = [],
  rankingRules: RankingRuleCode[] = []
): BestThirdPlaceQualifier[] {
  return sortBestThirdCandidates({
    candidates: collectThirdPlaceCandidates(groupTables),
    rankingRules,
    tiebreakOverrides
  })
    .slice(0, count)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function calculateBestThirdPlaceTieGroups(params: {
  groupTables: PredictedGroupTable[];
  rankingRules: RankingRuleCode[];
  qualifyingCount?: number | undefined;
  tiebreakOverrides?: PredictionTiebreakOverride[] | undefined;
}): StandingTieGroup[] {
  const candidates = sortBestThirdCandidates({
    candidates: collectThirdPlaceCandidates(params.groupTables),
    rankingRules: params.rankingRules,
    tiebreakOverrides: params.tiebreakOverrides ?? []
  });
  const groups = new Map<string, BestThirdPlaceQualifier[]>();

  for (const candidate of candidates) {
    const key = bestThirdTieKey(candidate, params.rankingRules);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const tiedTeamIds = group.map((candidate) => candidate.row.teamId);
      const affectedPositions = group.map((candidate) => candidates.indexOf(candidate) + 1);

      return {
        scopeRef: bestThirdsScopeRef(),
        tieGroupId: createTieGroupId({
          scopeRef: bestThirdsScopeRef(),
          tiedTeamIds,
          affectedPositions
        }),
        tiedTeamIds,
        affectedPositions
      };
    })
    .filter(
      (group) =>
        params.qualifyingCount === undefined ||
        Math.min(...group.affectedPositions) <= params.qualifyingCount
    )
    .filter(
      (group) =>
        !findTieGroupOverride({
          scopeRef: group.scopeRef,
          tieGroupId: group.tieGroupId,
          tiedTeamIds: group.tiedTeamIds,
          tiebreakOverrides: params.tiebreakOverrides ?? []
        })
    );
}

export function generatePredictedBracket(params: {
  competition: CompetitionSeed;
  predictionSet: PredictionSet;
}): PredictedBracket {
  const groupTables = calculatePredictedGroupTables(params);
  const leagueTable = calculatePredictedLeagueTable(params);
  const bestThirdRankingRules =
    params.competition.edition.format.bestThirdsRankingRuleCodes ??
    params.competition.edition.format.rankingRuleCodes ??
    [];
  const bestThirdPlaceTieGroups = calculateBestThirdPlaceTieGroups({
    groupTables,
    rankingRules: bestThirdRankingRules,
    qualifyingCount: params.competition.edition.format.bestThirdPlacedTeams,
    tiebreakOverrides: params.predictionSet.tiebreakOverrides ?? []
  });
  const bestThirdPlaceQualifiers = selectBestThirdPlacedTeams(
    groupTables,
    params.competition.edition.format.bestThirdPlacedTeams,
    params.predictionSet.tiebreakOverrides ?? [],
    bestThirdRankingRules
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
    bestThirdPlaceTieGroups,
    mappingMetadata: getBracketMappingMetadata(params.competition),
    matches: orderConfiguredRounds(params.competition.edition.format.knockoutRounds, matches)
  };
}

export function groupScopeRef(groupCode: string): string {
  return `group:${groupCode}`;
}

export function bestThirdsScopeRef(): string {
  return "best_thirds";
}

export function leaguePhaseScopeRef(): string {
  return "league_phase";
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
      teamId: bestThird?.unresolvedTie ? undefined : bestThird?.row.teamId,
      sourceRef: bestThirdsScopeRef()
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

function collectThirdPlaceCandidates(
  groupTables: PredictedGroupTable[]
): BestThirdPlaceQualifier[] {
  return groupTables.flatMap((table) => {
    const third = table.rows.find((row) => row.position === 3);

    return third
      ? [
          {
            rank: 0,
            groupCode: table.group.code,
            row: third,
            unresolvedTie: false
          }
        ]
      : [];
  });
}

function sortBestThirdCandidates(params: {
  candidates: BestThirdPlaceQualifier[];
  rankingRules: RankingRuleCode[];
  tiebreakOverrides: PredictionTiebreakOverride[];
}): BestThirdPlaceQualifier[] {
  const baseSorted = [...params.candidates].sort(
    (left, right) =>
      compareBestThirdByRules(left, right, params.rankingRules) ||
      left.groupCode.localeCompare(right.groupCode)
  );
  const tieGroups = new Map<string, BestThirdPlaceQualifier[]>();

  for (const candidate of baseSorted) {
    const key = bestThirdTieKey(candidate, params.rankingRules);
    tieGroups.set(key, [...(tieGroups.get(key) ?? []), candidate]);
  }

  return baseSorted
    .map((candidate) => {
      const tiedCandidates = tieGroups.get(bestThirdTieKey(candidate, params.rankingRules)) ?? [];
      const tiedTeamIds = tiedCandidates.map((item) => item.row.teamId);
      const affectedPositions = tiedCandidates.map((item) => baseSorted.indexOf(item) + 1);
      const tieGroupId = createTieGroupId({
        scopeRef: bestThirdsScopeRef(),
        tiedTeamIds,
        affectedPositions
      });
      const override =
        tiedCandidates.length > 1
          ? findTieGroupOverride({
              scopeRef: bestThirdsScopeRef(),
              tieGroupId,
              tiedTeamIds,
              tiebreakOverrides: params.tiebreakOverrides
            })
          : undefined;
      const overrideIndex = override?.orderedTeamIds.indexOf(candidate.row.teamId) ?? -1;

      return {
        candidate: {
          ...candidate,
          unresolvedTie: tiedCandidates.length > 1 && !override,
          ...(tiedCandidates.length > 1 ? { tieGroupId } : {})
        },
        overrideIndex: overrideIndex >= 0 ? overrideIndex : Number.POSITIVE_INFINITY
      };
    })
    .sort((left, right) => {
      const compared = compareBestThirdByRules(
        left.candidate,
        right.candidate,
        params.rankingRules
      );

      if (compared !== 0) {
        return compared;
      }

      return (
        left.overrideIndex - right.overrideIndex ||
        left.candidate.groupCode.localeCompare(right.candidate.groupCode)
      );
    })
    .map((item) => item.candidate);
}

function compareBestThirdByRules(
  left: BestThirdPlaceQualifier,
  right: BestThirdPlaceQualifier,
  rankingRules: RankingRuleCode[]
): number {
  for (const rule of rankingRules) {
    const compared = compareBestThirdByRule(left, right, rule);

    if (compared !== 0) {
      return compared;
    }
  }

  return 0;
}

function compareBestThirdByRule(
  left: BestThirdPlaceQualifier,
  right: BestThirdPlaceQualifier,
  rule: RankingRuleCode
): number {
  if (rule === "points") {
    return right.row.points - left.row.points;
  }

  if (rule === "goal_difference") {
    return right.row.goalDifference - left.row.goalDifference;
  }

  if (rule === "goals_for") {
    return right.row.goalsFor - left.row.goalsFor;
  }

  if (rule === "wins") {
    return right.row.won - left.row.won;
  }

  return 0;
}

function bestThirdTieKey(
  candidate: BestThirdPlaceQualifier,
  rankingRules: RankingRuleCode[]
): string {
  return rankingRules
    .map((rule) => {
      if (rule === "points") {
        return candidate.row.points;
      }

      if (rule === "goal_difference") {
        return candidate.row.goalDifference;
      }

      if (rule === "goals_for") {
        return candidate.row.goalsFor;
      }

      if (rule === "wins") {
        return candidate.row.won;
      }

      return "unsupported";
    })
    .join(":");
}

function getBracketMappingMetadata(competition: CompetitionSeed): BracketMappingMetadata {
  const strategy = competition.edition.format.bracketMappingStrategy ?? "sequential_generated";

  return {
    strategy,
    status: "placeholder",
    notes: [
      "Milestone 8.1 keeps bracket mappings template-driven but marks World Cup best-third, EURO best-third, and Champions playoff draw mappings as placeholders until official matrix/draw rules are implemented."
    ]
  };
}
