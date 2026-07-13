import { describe, expect, it } from "vitest";

import { assessAuthenticatedReadModelReadiness } from "@/domain/predictions/authenticatedReadModel";

describe("authenticated prediction read-model readiness", () => {
  it("accepts a complete group catalog without calculating standings or bracket", () => {
    const result = assessAuthenticatedReadModelReadiness(createCompleteInput());

    expect(result.kind).toBe("ready_for_resolver");
    expect(result.blockers).toEqual([]);
    expect(result.counts).toEqual({
      teams: 4,
      groups: 1,
      initialMatches: 6,
      completeInitialParticipants: 6
    });
  });

  it("blocks incomplete teams, memberships, participants and matches conservatively", () => {
    const input = createCompleteInput();
    input.editionTeams.pop();
    input.matches[0] = { ...input.matches[0]!, homeTeamId: undefined };

    const result = assessAuthenticatedReadModelReadiness(input);

    expect(result.kind).toBe("incomplete");
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        "Catalogo squadre incompleto: 3/4.",
        "Appartenenza squadre ai gruppi incompleta o incoerente.",
        "Una o piu partite iniziali non hanno partecipanti reali validi."
      ])
    );
  });

  it("handles an empty catalog without division or invented completion", () => {
    const input = createCompleteInput();
    input.groups = [];
    input.editionTeams = [];
    input.matches = [];

    const result = assessAuthenticatedReadModelReadiness(input);

    expect(result.kind).toBe("incomplete");
    expect(result.counts.completeInitialParticipants).toBe(0);
    expect(result.blockers).toContain("Calendario iniziale incompleto: 0/6.");
  });

  it("requires the complete 48-team, 12-group and 72-match resolver input", () => {
    const result = assessAuthenticatedReadModelReadiness(createWorldCupInput());

    expect(result.kind).toBe("ready_for_resolver");
    expect(result.counts).toMatchObject({ teams: 48, groups: 12, initialMatches: 72 });
  });

  it.each([
    ["47 teams", (input: ReturnType<typeof createWorldCupInput>) => input.editionTeams.pop()],
    ["71 matches", (input: ReturnType<typeof createWorldCupInput>) => input.matches.pop()],
    [
      "cross-group participant",
      (input: ReturnType<typeof createWorldCupInput>) => {
        input.matches[0]!.awayTeamId = input.editionTeams[4]!.teamId;
      }
    ],
    [
      "duplicate match number",
      (input: ReturnType<typeof createWorldCupInput>) => {
        input.matches[1]!.matchNumber = input.matches[0]!.matchNumber;
      }
    ],
    [
      "duplicate FIFA code",
      (input: ReturnType<typeof createWorldCupInput>) => {
        input.editionTeams[1]!.fifaCode = input.editionTeams[0]!.fifaCode;
      }
    ],
    [
      "five-team group",
      (input: ReturnType<typeof createWorldCupInput>) => {
        input.editionTeams[4]!.seedGroupId = input.groups[0]!.id;
      }
    ]
  ])("blocks %s conservatively", (_label, mutate) => {
    const input = createWorldCupInput();
    mutate(input);

    expect(assessAuthenticatedReadModelReadiness(input).kind).toBe("incomplete");
  });
});

function createCompleteInput() {
  const teams = ["team-1", "team-2", "team-3", "team-4"];
  const pairings = [
    [teams[0], teams[1]],
    [teams[2], teams[3]],
    [teams[0], teams[2]],
    [teams[1], teams[3]],
    [teams[0], teams[3]],
    [teams[1], teams[2]]
  ];

  return {
    format: {
      teamCount: 4,
      initialStageKind: "group_stage" as const,
      groupCount: 1,
      teamsPerGroup: 4,
      automaticQualifiersPerGroup: 2,
      bestThirdPlacedTeams: 1,
      knockoutRounds: []
    },
    initialStageIds: ["stage-group"],
    groups: [{ id: "group-a", stageId: "stage-group", code: "A" }],
    editionTeams: teams.map((teamId, index) => ({
      teamId,
      fifaCode: `T0${index + 1}`,
      seedGroupId: "group-a"
    })),
    matches: pairings.map(([homeTeamId, awayTeamId], index) => ({
      id: `match-${index + 1}`,
      stageId: "stage-group",
      groupId: "group-a",
      homeTeamId,
      awayTeamId,
      matchNumber: index + 1,
      matchday: Math.floor(index / 2) + 1,
      matchFormat: "REGULATION_90",
      leg: 1,
      order: index + 1
    })),
    rankingRuleSetCount: 1,
    rulesetRankingCodeCount: 1,
    predictionRequirementCount: 2,
    bracketNodeCount: 0,
    bracketSlotCount: 0,
    bestThirdCombinationCount: 1
  };
}

function createWorldCupInput() {
  const groups = Array.from({ length: 12 }, (_, groupIndex) => ({
    id: `group-${groupIndex + 1}`,
    stageId: "stage-group",
    code: String.fromCharCode(65 + groupIndex)
  }));
  const editionTeams = groups.flatMap((group, groupIndex) =>
    Array.from({ length: 4 }, (_, teamIndex) => ({
      teamId: `team-${groupIndex * 4 + teamIndex + 1}`,
      fifaCode: `${String.fromCharCode(65 + groupIndex)}${teamIndex + 1}X`,
      seedGroupId: group.id
    }))
  );
  let matchNumber = 0;
  const matches = groups.flatMap((group, groupIndex) => {
    const teams = editionTeams.slice(groupIndex * 4, groupIndex * 4 + 4);
    const pairings = [
      [0, 1],
      [2, 3],
      [0, 2],
      [1, 3],
      [0, 3],
      [1, 2]
    ] as const;
    return pairings.map(([homeIndex, awayIndex], index) => ({
      id: `match-${++matchNumber}`,
      stageId: "stage-group",
      groupId: group.id,
      homeTeamId: teams[homeIndex]!.teamId,
      awayTeamId: teams[awayIndex]!.teamId,
      matchNumber,
      matchday: Math.floor(index / 2) + 1,
      matchFormat: "REGULATION_90",
      leg: 1,
      order: matchNumber
    }));
  });

  return {
    format: {
      teamCount: 48,
      initialStageKind: "group_stage" as const,
      groupCount: 12,
      teamsPerGroup: 4,
      automaticQualifiersPerGroup: 2,
      bestThirdPlacedTeams: 8,
      knockoutRounds: ["ROUND_OF_32", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"]
    },
    initialStageIds: ["stage-group"],
    groups,
    editionTeams,
    matches,
    rankingRuleSetCount: 1,
    rulesetRankingCodeCount: 1,
    predictionRequirementCount: 8,
    bracketNodeCount: 32,
    bracketSlotCount: 64,
    bestThirdCombinationCount: 495
  };
}
