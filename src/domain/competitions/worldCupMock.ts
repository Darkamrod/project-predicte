import type {
  AntepostDefinition,
  BracketSlot,
  CompetitionEdition,
  CompetitionSeed,
  CompetitionTemplate,
  Group,
  KnockoutRoundCode,
  Match,
  Player,
  Round,
  Sport,
  Stage,
  Team
} from "./types";

const groupCodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

const knockoutRounds: KnockoutRoundCode[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL"
];

const teamNames = [
  "Italia",
  "Brasile",
  "Argentina",
  "Germania",
  "Francia",
  "Spagna",
  "Portogallo",
  "Inghilterra",
  "Olanda",
  "Belgio",
  "Croazia",
  "Uruguay",
  "Messico",
  "Stati Uniti",
  "Canada",
  "Giappone",
  "Corea del Sud",
  "Marocco",
  "Senegal",
  "Ghana",
  "Nigeria",
  "Camerun",
  "Egitto",
  "Australia",
  "Danimarca",
  "Svezia",
  "Norvegia",
  "Svizzera",
  "Austria",
  "Polonia",
  "Cechia",
  "Serbia",
  "Turchia",
  "Grecia",
  "Scozia",
  "Irlanda",
  "Colombia",
  "Cile",
  "Peru",
  "Paraguay",
  "Ecuador",
  "Costa Rica",
  "Arabia Saudita",
  "Iran",
  "Qatar",
  "Tunisia",
  "Algeria",
  "Nuova Zelanda"
];

const roundNames: Record<KnockoutRoundCode, string> = {
  ROUND_OF_32: "Sedicesimi",
  ROUND_OF_16: "Ottavi",
  QUARTER_FINAL: "Quarti",
  SEMI_FINAL: "Semifinali",
  THIRD_PLACE: "Finale terzo posto",
  FINAL: "Finale"
};

export function createWorldCup2030MockSeed(): CompetitionSeed {
  const sport: Sport = {
    id: "sport-football",
    code: "FOOTBALL",
    name: "Football"
  };

  const template: CompetitionTemplate = {
    id: "template-fifa-world-cup",
    sportId: sport.id,
    code: "FIFA_WORLD_CUP",
    name: "FIFA World Cup"
  };

  const edition: CompetitionEdition = {
    id: "edition-world-cup-2030",
    templateId: template.id,
    name: "FIFA World Cup 2030",
    seasonLabel: "2030",
    enabled: true,
    firstKickoffAtUtc: "2030-06-08T19:00:00.000Z",
    maximumDeadlineAtUtc: "2030-06-08T18:30:00.000Z",
    dataCompleteness: "MOCK_COMPLETE",
    format: {
      groupCount: 12,
      teamsPerGroup: 4,
      groupStageMatchCount: 72,
      bestThirdPlacedTeams: 8,
      knockoutRounds,
      antepostDefinitionIds: [
        "antepost-world-cup-winner",
        "antepost-world-cup-top-scorer",
        "antepost-world-cup-top-scorer-goals"
      ]
    }
  };

  const groupStage: Stage = {
    id: "stage-group",
    editionId: edition.id,
    code: "GROUP_STAGE",
    kind: "GROUP",
    name: "Fase a gironi",
    order: 1
  };

  const knockoutStages: Stage[] = knockoutRounds.map((roundCode, index) => ({
    id: `stage-${roundCode.toLowerCase().replaceAll("_", "-")}`,
    editionId: edition.id,
    code: roundCode,
    kind: "KNOCKOUT",
    name: roundNames[roundCode],
    order: index + 2
  }));

  const stages = [groupStage, ...knockoutStages];

  const groups: Group[] = groupCodes.map((code, index) => ({
    id: `group-${code.toLowerCase()}`,
    editionId: edition.id,
    stageId: groupStage.id,
    code,
    name: `Gruppo ${code}`,
    order: index + 1
  }));

  const teams: Team[] = teamNames.map((name, index) => ({
    id: `team-${String(index + 1).padStart(2, "0")}`,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    countryCode: `T${String(index + 1).padStart(2, "0")}`
  }));

  const players: Player[] = teams.slice(0, 16).map((team, index) => ({
    id: `player-${String(index + 1).padStart(2, "0")}`,
    teamId: team.id,
    displayName: `${team.name} Bomber`
  }));

  const rounds: Round[] = [
    {
      id: "round-group",
      editionId: edition.id,
      stageId: groupStage.id,
      code: "GROUP_STAGE",
      name: "Fase a gironi",
      order: 1
    },
    ...knockoutStages.map((stage, index) => ({
      id: `round-${stage.code.toLowerCase().replaceAll("_", "-")}`,
      editionId: edition.id,
      stageId: stage.id,
      code: stage.code,
      name: stage.name,
      order: index + 2
    }))
  ];

  const matches = createGroupMatches(edition.id, groupStage.id, groups, teams);
  const bracketSlots = createBracketSlots(edition.id);

  const antepostDefinitions: AntepostDefinition[] = [
    {
      id: "antepost-world-cup-winner",
      editionId: edition.id,
      code: "TOURNAMENT_WINNER",
      label: "Vincente torneo",
      valueType: "TEAM",
      required: true
    },
    {
      id: "antepost-world-cup-top-scorer",
      editionId: edition.id,
      code: "TOP_SCORER",
      label: "Capocannoniere",
      valueType: "PLAYER",
      required: true
    },
    {
      id: "antepost-world-cup-top-scorer-goals",
      editionId: edition.id,
      code: "TOP_SCORER_GOALS",
      label: "Gol capocannoniere",
      valueType: "NUMBER",
      required: true
    }
  ];

  return {
    sport,
    template,
    edition,
    stages,
    groups,
    rounds,
    teams,
    players,
    matches,
    bracketSlots,
    antepostDefinitions
  };
}

function createGroupMatches(
  editionId: string,
  groupStageId: string,
  groups: Group[],
  teams: Team[]
): Match[] {
  const pairings = [
    [0, 1],
    [2, 3],
    [0, 2],
    [3, 1],
    [0, 3],
    [1, 2]
  ] as const;

  return groups.flatMap((group, groupIndex) => {
    const groupTeams = teams.slice(groupIndex * 4, groupIndex * 4 + 4);

    return pairings.map(([homeIndex, awayIndex], pairingIndex) => {
      const dayOffset = groupIndex * 2 + Math.floor(pairingIndex / 2);
      const kickoffHour = pairingIndex % 2 === 0 ? 16 : 19;
      const kickoffAtUtc = new Date(Date.UTC(2030, 5, 8 + dayOffset, kickoffHour, 0, 0));
      const homeTeam = groupTeams[homeIndex];
      const awayTeam = groupTeams[awayIndex];

      if (!homeTeam || !awayTeam) {
        throw new Error(`Invalid mock team allocation for group ${group.code}`);
      }

      return {
        id: `match-${group.code.toLowerCase()}-${pairingIndex + 1}`,
        editionId,
        stageId: groupStageId,
        groupId: group.id,
        roundId: "round-group",
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAtUtc: kickoffAtUtc.toISOString(),
        status: "NOT_STARTED",
        order: groupIndex * 6 + pairingIndex + 1
      };
    });
  });
}

function createBracketSlots(editionId: string): BracketSlot[] {
  const groupWinnerSlots = groupCodes.map((groupCode) => ({
    id: `slot-winner-${groupCode.toLowerCase()}`,
    editionId,
    roundCode: "ROUND_OF_32" as const,
    source: {
      type: "GROUP_POSITION" as const,
      groupCode,
      position: 1
    }
  }));

  const groupRunnerUpSlots = groupCodes.map((groupCode) => ({
    id: `slot-runner-up-${groupCode.toLowerCase()}`,
    editionId,
    roundCode: "ROUND_OF_32" as const,
    source: {
      type: "GROUP_POSITION" as const,
      groupCode,
      position: 2
    }
  }));

  const bestThirdSlots = Array.from({ length: 8 }, (_, index) => ({
    id: `slot-best-third-${index + 1}`,
    editionId,
    roundCode: "ROUND_OF_32" as const,
    source: {
      type: "BEST_THIRD" as const,
      rank: index + 1
    }
  }));

  return [...groupWinnerSlots, ...groupRunnerUpSlots, ...bestThirdSlots];
}
