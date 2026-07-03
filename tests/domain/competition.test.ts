import { describe, expect, it } from "vitest";

import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import { calculatePredictedGroupStandings } from "@/domain/predictions/standings";
import type { MatchPrediction } from "@/domain/predictions/types";

describe("mock competition seed", () => {
  it("models a World Cup-style group stage from configuration", () => {
    const seed = createWorldCup2030MockSeed();

    expect(seed.groups).toHaveLength(12);
    expect(seed.teams).toHaveLength(48);
    expect(seed.matches.filter((match) => match.stageId === "stage-group")).toHaveLength(72);
    expect(seed.edition.format.bestThirdPlacedTeams).toBe(8);
    expect(seed.bracketSlots).toHaveLength(32);
  });

  it("derives predicted group standings from score predictions", () => {
    const seed = createWorldCup2030MockSeed();
    const group = seed.groups[0];
    const matches = seed.matches.filter((match) => match.groupId === group?.id);
    const teamIds = new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]));
    const teams = seed.teams.filter((team) => teamIds.has(team.id));
    const predictions: MatchPrediction[] = matches.map((match, index) => ({
      id: `prediction-${match.id}`,
      predictionSetId: "prediction-set",
      matchId: match.id,
      stageCode: "GROUP_STAGE",
      homeGoals: index % 2 === 0 ? 2 : 1,
      awayGoals: index % 2 === 0 ? 0 : 1,
      syncStatus: "SYNCED",
      updatedAtUtc: "2030-06-01T10:00:00.000Z"
    }));
    const standings = calculatePredictedGroupStandings({ teams, matches, predictions });

    expect(standings).toHaveLength(4);
    expect(standings[0]?.points).toBeGreaterThanOrEqual(standings[1]?.points ?? 0);
  });
});
