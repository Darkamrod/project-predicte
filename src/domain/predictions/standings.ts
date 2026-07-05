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

export interface StandingTieGroup {
  scopeRef: string;
  tieGroupId: string;
  tiedTeamIds: string[];
  affectedPositions: number[];
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
  const rows = sorted.map((row, index) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    position: index + 1,
    unresolvedTie: false
  }));
  const unresolvedGroups = buildStandingTieGroups(rows, params.scopeRef ?? "standing").filter(
    (group) =>
      !findTieGroupOverride({
        scopeRef: group.scopeRef,
        tieGroupId: group.tieGroupId,
        tiedTeamIds: group.tiedTeamIds,
        tiebreakOverrides: params.tiebreakOverrides ?? []
      })
  );

  return rows.map((row) => ({
    ...row,
    unresolvedTie: unresolvedGroups.some((group) => group.tiedTeamIds.includes(row.teamId))
  }));
}

export function buildStandingTieGroups(
  rows: GroupStandingRow[],
  scopeRef: string
): StandingTieGroup[] {
  return [...groupRowsByStandingTieKey(rows).values()]
    .filter((groupRows) => groupRows.length > 1)
    .map((groupRows) => {
      const tiedTeamIds = groupRows.map((row) => row.teamId);
      const affectedPositions = groupRows.map((row) => row.position);

      return {
        scopeRef,
        tieGroupId: createTieGroupId({ scopeRef, tiedTeamIds, affectedPositions }),
        tiedTeamIds,
        affectedPositions
      };
    });
}

export function createTieGroupId(params: {
  scopeRef: string;
  tiedTeamIds: string[];
  affectedPositions?: number[] | undefined;
}): string {
  const sortedTeamIds = [...params.tiedTeamIds].sort();
  const positionRef =
    params.affectedPositions && params.affectedPositions.length > 0
      ? params.affectedPositions.join("-")
      : "unknown";

  return `${params.scopeRef}:positions:${positionRef}:teams:${sortedTeamIds.join("|")}`;
}

export function findTieGroupOverride(params: {
  scopeRef: string;
  tieGroupId?: string | undefined;
  tiedTeamIds: string[];
  tiebreakOverrides: PredictionTiebreakOverride[];
}): PredictionTiebreakOverride | undefined {
  return params.tiebreakOverrides.find((override) => {
    if (override.scopeRef !== params.scopeRef) {
      return false;
    }

    if (params.tieGroupId && override.tieGroupId) {
      return override.tieGroupId === params.tieGroupId;
    }

    return sameTeamSet(override.tiedTeamIds ?? override.orderedTeamIds, params.tiedTeamIds);
  });
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
  const tieGroups = groupRowsByTieKey(params.rows);
  const positionByTeamId = new Map(params.rows.map((row, index) => [row.teamId, index + 1]));

  return params.rows
    .map((row) => {
      const tiedRows = tieGroups.get(tieKey(row)) ?? [];
      const tiedTeamIds = tiedRows.map((item) => item.teamId);
      const affectedPositions = tiedRows
        .map((item) => positionByTeamId.get(item.teamId))
        .filter((position): position is number => position !== undefined);
      const override =
        tiedRows.length > 1
          ? findTieGroupOverride({
              scopeRef: params.scopeRef ?? "standing",
              tieGroupId: createTieGroupId({
                scopeRef: params.scopeRef ?? "standing",
                tiedTeamIds,
                affectedPositions
              }),
              tiedTeamIds,
              tiebreakOverrides: params.tiebreakOverrides
            })
          : undefined;
      const overrideIndex = override?.orderedTeamIds.indexOf(row.teamId) ?? -1;

      return {
        row,
        overrideIndex: overrideIndex >= 0 ? overrideIndex : Number.POSITIVE_INFINITY
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

function groupRowsByStandingTieKey(rows: GroupStandingRow[]): Map<string, GroupStandingRow[]> {
  const groups = new Map<string, GroupStandingRow[]>();

  for (const row of rows) {
    const key = [row.points, row.goalDifference, row.goalsFor].join(":");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return groups;
}

function sameTeamSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((teamId) => right.includes(teamId));
}
