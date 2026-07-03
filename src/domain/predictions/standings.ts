import type { Match, Team } from "@/domain/competitions/types";
import type { GroupStandingRow, MatchPrediction } from "./types";

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

  const sorted = [...table.values()].sort(compareStandings);
  const tieKeys = new Map<string, number>();

  for (const row of sorted) {
    const key = tieKey(row);
    tieKeys.set(key, (tieKeys.get(key) ?? 0) + 1);
  }

  return sorted.map((row, index) => ({
    ...row,
    goalDifference: row.goalsFor - row.goalsAgainst,
    position: index + 1,
    unresolvedTie: (tieKeys.get(tieKey(row)) ?? 0) > 1
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
