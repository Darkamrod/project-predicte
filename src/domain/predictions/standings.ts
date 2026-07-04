import type { Match, Team } from "@/domain/competitions/types";
import type { GroupStandingRow, MatchPrediction, PredictionTiebreakOverride } from "./types";

interface MutableStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export function calculatePredictedGroupStandings(params: {
  teams: Team[];
  matches: Match[];
  predictions: MatchPrediction[];
  tiebreakOverrides?: PredictionTiebreakOverride[];
  scopeRef?: string;
}): GroupStandingRow[] {
  const predictionByMatchId = new Map(
    params.predictions.map((prediction) => [prediction.matchId, prediction])
  );
  const table = new Map<string, MutableStanding>();

  for (const team of params.teams) {
    table.set(team.id, {
      teamId: team.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    });
  }

  for (const match of params.matches) {
    const prediction = predictionByMatchId.get(match.id);

    if (!prediction) {
      continue;
    }

    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);

    if (!home || !away) {
      continue;
    }

    applyPrediction(home, away, prediction.homeGoals, prediction.awayGoals);
  }

  const sorted = applyTiebreakOverrides({
    rows: [...table.values()].sort(compareStandings),
    scopeRef: params.scopeRef,
    tiebreakOverrides: params.tiebreakOverrides ?? []
  });
  const tieKeys = new Map<string, MutableStanding[]>();

  for (const row of sorted) {
    const key = tieKey(row);
    tieKeys.set(key, [...(tieKeys.get(key) ?? []), row]);
  }

  return sorted.map((row, index) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    position: index + 1,
    unresolvedTie: isTieUnresolved(tieKeys.get(tieKey(row)) ?? [], params.tiebreakOverrides ?? [])
  }));
}

function applyPrediction(
  home: MutableStanding,
  away: MutableStanding,
  homeGoals: number,
  awayGoals: number
): void {
  home.played += 1;
  away.played += 1;
  home.goalsFor += homeGoals;
  home.goalsAgainst += awayGoals;
  away.goalsFor += awayGoals;
  away.goalsAgainst += homeGoals;

  if (homeGoals > awayGoals) {
    home.won += 1;
    away.lost += 1;
    home.points += 3;
    return;
  }

  if (awayGoals > homeGoals) {
    away.won += 1;
    home.lost += 1;
    away.points += 3;
    return;
  }

  home.drawn += 1;
  away.drawn += 1;
  home.points += 1;
  away.points += 1;
}

function compareStandings(left: MutableStanding, right: MutableStanding): number {
  return (
    right.points - left.points ||
    goalDifference(right) - goalDifference(left) ||
    right.goalsFor - left.goalsFor ||
    left.teamId.localeCompare(right.teamId)
  );
}

function goalDifference(row: MutableStanding): number {
  return row.goalsFor - row.goalsAgainst;
}

function tieKey(row: MutableStanding): string {
  return [row.points, goalDifference(row), row.goalsFor].join(":");
}

function applyTiebreakOverrides(params: {
  rows: MutableStanding[];
  scopeRef?: string | undefined;
  tiebreakOverrides: PredictionTiebreakOverride[];
}): MutableStanding[] {
  const scopedOverride = params.tiebreakOverrides.find(
    (override) => override.scopeRef === params.scopeRef
  );

  if (!scopedOverride) {
    return params.rows;
  }

  const tieGroups = groupRowsByTieKey(params.rows);

  return params.rows
    .map((row) => {
      const tiedRows = tieGroups.get(tieKey(row)) ?? [];
      const overrideCoversTie =
        tiedRows.length > 1 &&
        sameTeamSet(
          tiedRows.map((item) => item.teamId),
          scopedOverride.orderedTeamIds
        );
      const overrideIndex = scopedOverride.orderedTeamIds.indexOf(row.teamId);

      return {
        row,
        overrideIndex:
          overrideCoversTie && overrideIndex >= 0 ? overrideIndex : Number.POSITIVE_INFINITY
      };
    })
    .sort((left, right) => {
      if (tieKey(left.row) === tieKey(right.row)) {
        return (
          left.overrideIndex - right.overrideIndex ||
          left.row.teamId.localeCompare(right.row.teamId)
        );
      }

      return compareStandings(left.row, right.row);
    })
    .map((item) => item.row);
}

function groupRowsByTieKey(rows: MutableStanding[]): Map<string, MutableStanding[]> {
  const groups = new Map<string, MutableStanding[]>();

  for (const row of rows) {
    const key = tieKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return groups;
}

function isTieUnresolved(
  tiedRows: MutableStanding[],
  tiebreakOverrides: PredictionTiebreakOverride[]
): boolean {
  if (tiedRows.length <= 1) {
    return false;
  }

  return !tiebreakOverrides.some((override) =>
    sameTeamSet(
      tiedRows.map((row) => row.teamId),
      override.orderedTeamIds
    )
  );
}

function sameTeamSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((teamId) => right.includes(teamId));
}
