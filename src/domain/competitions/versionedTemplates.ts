import {
  championsLeagueDefaultScoringConfig,
  euroDefaultScoringConfig,
  worldCupDefaultScoringConfig
} from "@/domain/scoring/presets";
import type { ScoringRuleConfig } from "@/domain/scoring/types";
import type {
  AntepostDefinition,
  BracketMappingStrategyCode,
  BracketSlot,
  CompetitionEdition,
  CompetitionFamily,
  CompetitionFamilyCode,
  CompetitionFormat,
  CompetitionSeed,
  CompetitionTemplate,
  CompetitionVersionBundle,
  FormatTemplateVersion,
  Group,
  LeagueCompetitionSnapshot,
  KnockoutRoundCode,
  Match,
  OfficialRulesSource,
  Player,
  PredictionRequirementTemplateItem,
  PredictionRequirementVersion,
  RankingRuleCode,
  RankingRuleSet,
  Round,
  RulesetVersion,
  ScoringPresetVersion,
  Sport,
  Stage,
  StageTemplate,
  Team
} from "./types";

const footballSport: Sport = {
  id: "sport-football",
  code: "FOOTBALL",
  name: "Football"
};

const commonRulesSource: OfficialRulesSource = {
  label: "Initial Project Predicte mock rules source",
  retrievedAtUtc: "2026-07-05T00:00:00.000Z"
};

const roundNames: Record<KnockoutRoundCode, string> = {
  PLAYOFF: "Playoff",
  ROUND_OF_32: "Sedicesimi",
  ROUND_OF_16: "Ottavi",
  QUARTER_FINAL: "Quarti",
  SEMI_FINAL: "Semifinali",
  THIRD_PLACE: "Finale terzo posto",
  FINAL: "Finale"
};

const roundStageKinds: Record<KnockoutRoundCode, StageTemplate["kind"]> = {
  PLAYOFF: "knockout_two_leg",
  ROUND_OF_32: "knockout_single_leg",
  ROUND_OF_16: "knockout_single_leg",
  QUARTER_FINAL: "knockout_single_leg",
  SEMI_FINAL: "knockout_single_leg",
  THIRD_PLACE: "third_place_final",
  FINAL: "final_single_leg"
};

const fifaRankingRules: RankingRuleCode[] = [
  "points",
  "goal_difference",
  "goals_for",
  "disciplinary",
  "drawing_of_lots"
];

const uefaGroupRankingRules: RankingRuleCode[] = [
  "points",
  "head_to_head_points",
  "head_to_head_goal_difference",
  "goal_difference",
  "goals_for",
  "wins",
  "disciplinary"
];

const championsRankingRules: RankingRuleCode[] = [
  "points",
  "goal_difference",
  "goals_for",
  "wins",
  "disciplinary",
  "coefficient"
];

export function createWorldCup2026MockSeed(): CompetitionSeed {
  return createGroupCompetitionSeed({
    familyCode: "world_cup",
    templateCode: "FIFA_WORLD_CUP",
    templateName: "FIFA World Cup",
    editionCode: "world_cup_2026",
    editionName: "FIFA World Cup 2026",
    seasonLabel: "2026",
    firstKickoffAtUtc: "2026-11-20T19:00:00.000Z",
    maximumDeadlineAtUtc: "2026-11-20T18:30:00.000Z",
    groupCodes: createGroupCodes(12),
    teamNames: nationalTeamNames.slice(0, 48),
    automaticQualifiersPerGroup: 2,
    bestThirdPlacedTeams: 8,
    knockoutRounds: [
      "ROUND_OF_32",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "THIRD_PLACE",
      "FINAL"
    ],
    initialKnockoutRound: "ROUND_OF_32",
    rankingRuleCodes: fifaRankingRules,
    bracketMappingStrategy: "fifa_2026_bracket_slots",
    scoringConfig: worldCupDefaultScoringConfig,
    scoringPresetCode: "WORLD_CUP_DEFAULT",
    topScorerGoalsRequired: true
  });
}

export function createWorldCup2030MockSeed(): CompetitionSeed {
  return createGroupCompetitionSeed({
    familyCode: "world_cup",
    templateCode: "FIFA_WORLD_CUP",
    templateName: "FIFA World Cup",
    editionCode: "world_cup_2030",
    editionName: "FIFA World Cup 2030",
    seasonLabel: "2030",
    firstKickoffAtUtc: "2030-06-08T19:00:00.000Z",
    maximumDeadlineAtUtc: "2030-06-08T18:30:00.000Z",
    groupCodes: createGroupCodes(12),
    teamNames: nationalTeamNames.slice(0, 48),
    automaticQualifiersPerGroup: 2,
    bestThirdPlacedTeams: 8,
    knockoutRounds: [
      "ROUND_OF_32",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "THIRD_PLACE",
      "FINAL"
    ],
    initialKnockoutRound: "ROUND_OF_32",
    rankingRuleCodes: fifaRankingRules,
    bracketMappingStrategy: "fifa_2026_bracket_slots",
    scoringConfig: worldCupDefaultScoringConfig,
    scoringPresetCode: "WORLD_CUP_DEFAULT",
    supersedesTemplateVersionId: "format-world_cup_2026-v1",
    topScorerGoalsRequired: true
  });
}

export function createEuro2028MockSeed(): CompetitionSeed {
  return createGroupCompetitionSeed({
    familyCode: "euro",
    templateCode: "UEFA_EURO",
    templateName: "UEFA EURO",
    editionCode: "euro_2028",
    editionName: "UEFA EURO 2028",
    seasonLabel: "2028",
    firstKickoffAtUtc: "2028-06-09T19:00:00.000Z",
    maximumDeadlineAtUtc: "2028-06-09T18:30:00.000Z",
    groupCodes: createGroupCodes(6),
    teamNames: nationalTeamNames.slice(0, 24),
    automaticQualifiersPerGroup: 2,
    bestThirdPlacedTeams: 4,
    knockoutRounds: ["ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"],
    initialKnockoutRound: "ROUND_OF_16",
    rankingRuleCodes: uefaGroupRankingRules,
    bestThirdsRankingRuleCodes: uefaGroupRankingRules,
    bracketMappingStrategy: "uefa_euro_2028_bracket_slots",
    scoringConfig: euroDefaultScoringConfig,
    scoringPresetCode: "EURO_DEFAULT",
    topScorerGoalsRequired: false
  });
}

export function createChampionsLeague2026_27MockSeed(): CompetitionSeed {
  const editionCode = "champions_league_2026_27";
  const family = createFamily("champions_league");
  const template = createTemplate({
    family,
    code: "UEFA_CHAMPIONS_LEAGUE",
    name: "UEFA Champions League"
  });
  const format = createCompetitionFormat({
    familyCode: family.code,
    editionCode,
    groupCount: 0,
    teamsPerGroup: 0,
    groupStageMatchCount: 144,
    bestThirdPlacedTeams: 0,
    knockoutRounds: ["PLAYOFF", "ROUND_OF_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"],
    initialKnockoutRound: "PLAYOFF",
    teamCount: 36,
    initialStageKind: "league_phase",
    rankingRuleCodes: championsRankingRules,
    bracketMappingStrategy: "ucl_2026_27_seeded_playoff",
    leaguePhase: {
      tableSize: 36,
      matchesPerTeam: 8,
      homeMatchesPerTeam: 4,
      awayMatchesPerTeam: 4,
      directRoundOf16Positions: [1, 8],
      playoffPositions: [9, 24],
      eliminatedPositions: [25, 36]
    },
    knockoutTieModeByRound: {
      PLAYOFF: "two_leg",
      ROUND_OF_16: "two_leg",
      QUARTER_FINAL: "two_leg",
      SEMI_FINAL: "two_leg",
      FINAL: "single_leg"
    },
    antepostDefinitionIds: [
      "antepost-champions_league_2026_27-winner",
      "antepost-champions_league_2026_27-finalists",
      "antepost-champions_league_2026_27-top-scorer",
      "antepost-champions_league_2026_27-top-scorer-goals"
    ]
  });
  const edition = createEdition({
    template,
    family,
    editionCode,
    name: "UEFA Champions League 2026/27",
    seasonLabel: "2026/27",
    firstKickoffAtUtc: "2026-09-15T19:00:00.000Z",
    maximumDeadlineAtUtc: "2026-09-15T18:30:00.000Z",
    format
  });
  const teams = clubTeamNames.slice(0, 36).map((name, index) => createTeam(name, index));
  const players = createPlayers(teams, editionCode);
  const leagueStage = createStage({
    editionId: edition.id,
    code: "GROUP_STAGE",
    kind: "GROUP",
    name: "League phase",
    order: 1
  });
  const knockoutStages = format.knockoutRounds.map((roundCode, index) =>
    createStage({
      editionId: edition.id,
      code: roundCode,
      kind: "KNOCKOUT",
      name: roundNames[roundCode],
      order: index + 2
    })
  );
  const stages = [leagueStage, ...knockoutStages];
  const rounds = [
    createRound({
      editionId: edition.id,
      stageId: leagueStage.id,
      code: "GROUP_STAGE",
      name: "League phase",
      order: 1
    }),
    ...knockoutStages.map((stage, index) =>
      createRound({
        editionId: edition.id,
        stageId: stage.id,
        code: stage.code,
        name: stage.name,
        order: index + 2
      })
    )
  ];
  const matches = createLeaguePhaseMatches({
    editionId: edition.id,
    stageId: leagueStage.id,
    roundId: rounds[0]?.id ?? "round-league-phase",
    teams
  });
  const bracketSlots = createChampionsLeagueBracketSlots(edition.id);
  const antepostDefinitions = createAntepostDefinitions({
    editionId: edition.id,
    editionCode,
    includeFinalists: true,
    topScorerGoalsRequired: false
  });
  const versionBundle = createVersionBundle({
    family,
    edition,
    format,
    rankingRuleCodes: championsRankingRules,
    bracketMappingStrategy: "ucl_2026_27_seeded_playoff",
    scoringConfig: championsLeagueDefaultScoringConfig,
    scoringPresetCode: "CHAMPIONS_LEAGUE_DEFAULT",
    predictionRequirements: [
      "MATCH_SCORE",
      "LEAGUE_PHASE_STANDINGS",
      "KNOCKOUT_QUALIFIER",
      "KNOCKOUT_ADVANCEMENT_METHOD",
      "TOURNAMENT_WINNER",
      "FINALISTS",
      "TOP_SCORER",
      "TOP_SCORER_GOALS"
    ]
  });

  return {
    family,
    sport: footballSport,
    template,
    edition,
    versionBundle,
    stages,
    groups: [],
    rounds,
    teams,
    players,
    matches,
    bracketSlots,
    antepostDefinitions
  };
}

export function createInitialCompetitionSeeds(): CompetitionSeed[] {
  return [
    createWorldCup2026MockSeed(),
    createEuro2028MockSeed(),
    createChampionsLeague2026_27MockSeed()
  ];
}

export function createCompetitionSnapshot(params: {
  leagueId: string;
  competition: CompetitionSeed;
  lockedAtUtc: string;
  adminOverrides?: Record<string, unknown> | undefined;
}): LeagueCompetitionSnapshot<ScoringRuleConfig> {
  const bundle = requireVersionBundle(
    params.competition
  ) as CompetitionVersionBundle<ScoringRuleConfig>;
  const snapshot = {
    leagueId: params.leagueId,
    competitionEditionId: params.competition.edition.id,
    familyCode: bundle.family.code,
    editionCode: bundle.edition.editionCode ?? bundle.edition.id,
    formatTemplate: clone(bundle.formatTemplate),
    ruleset: clone(bundle.ruleset),
    predictionRequirements: clone(bundle.predictionRequirements),
    scoringPreset: clone(bundle.scoringPreset),
    adminOverrides: params.adminOverrides ?? {},
    lockedAtUtc: params.lockedAtUtc,
    checksum: ""
  };

  return {
    ...snapshot,
    checksum: createStableChecksum(snapshot)
  };
}

export function requireVersionBundle(competition: CompetitionSeed): CompetitionVersionBundle {
  if (!competition.versionBundle) {
    throw new Error("Competition seed does not include a version bundle.");
  }

  return competition.versionBundle;
}

function createGroupCompetitionSeed(params: {
  familyCode: CompetitionFamilyCode;
  templateCode: CompetitionTemplate["code"];
  templateName: string;
  editionCode: string;
  editionName: string;
  seasonLabel: string;
  firstKickoffAtUtc: string;
  maximumDeadlineAtUtc: string;
  groupCodes: string[];
  teamNames: string[];
  automaticQualifiersPerGroup: number;
  bestThirdPlacedTeams: number;
  knockoutRounds: KnockoutRoundCode[];
  initialKnockoutRound: KnockoutRoundCode;
  rankingRuleCodes: RankingRuleCode[];
  bestThirdsRankingRuleCodes?: RankingRuleCode[] | undefined;
  bracketMappingStrategy: BracketMappingStrategyCode;
  scoringConfig: ScoringRuleConfig;
  scoringPresetCode: string;
  supersedesTemplateVersionId?: string | undefined;
  topScorerGoalsRequired: boolean;
}): CompetitionSeed {
  const family = createFamily(params.familyCode);
  const template = createTemplate({
    family,
    code: params.templateCode,
    name: params.templateName
  });
  const format = createCompetitionFormat({
    familyCode: family.code,
    editionCode: params.editionCode,
    groupCount: params.groupCodes.length,
    teamsPerGroup: 4,
    groupStageMatchCount: params.groupCodes.length * 6,
    bestThirdPlacedTeams: params.bestThirdPlacedTeams,
    knockoutRounds: params.knockoutRounds,
    initialKnockoutRound: params.initialKnockoutRound,
    teamCount: params.teamNames.length,
    initialStageKind: "group_stage",
    automaticQualifiersPerGroup: params.automaticQualifiersPerGroup,
    rankingRuleCodes: params.rankingRuleCodes,
    bestThirdsRankingRuleCodes: params.bestThirdsRankingRuleCodes ?? params.rankingRuleCodes,
    bracketMappingStrategy: params.bracketMappingStrategy,
    knockoutTieModeByRound: Object.fromEntries(
      params.knockoutRounds.map((roundCode) => [roundCode, "single_leg" as const])
    ) as Partial<Record<KnockoutRoundCode, "single_leg" | "two_leg">>,
    antepostDefinitionIds: [
      `antepost-${params.editionCode}-winner`,
      `antepost-${params.editionCode}-top-scorer`,
      `antepost-${params.editionCode}-top-scorer-goals`
    ]
  });
  const edition = createEdition({
    template,
    family,
    editionCode: params.editionCode,
    name: params.editionName,
    seasonLabel: params.seasonLabel,
    firstKickoffAtUtc: params.firstKickoffAtUtc,
    maximumDeadlineAtUtc: params.maximumDeadlineAtUtc,
    format
  });
  const groupStage = createStage({
    editionId: edition.id,
    code: "GROUP_STAGE",
    kind: "GROUP",
    name: "Fase a gironi",
    order: 1
  });
  const knockoutStages = params.knockoutRounds.map((roundCode, index) =>
    createStage({
      editionId: edition.id,
      code: roundCode,
      kind: "KNOCKOUT",
      name: roundNames[roundCode],
      order: index + 2
    })
  );
  const groups = params.groupCodes.map((code, index) => ({
    id: `group-${params.editionCode}-${code.toLowerCase()}`,
    editionId: edition.id,
    stageId: groupStage.id,
    code,
    name: `Gruppo ${code}`,
    order: index + 1
  }));
  const teams = params.teamNames.map((name, index) => createTeam(name, index));
  const players = createPlayers(teams, params.editionCode);
  const rounds = [
    createRound({
      editionId: edition.id,
      stageId: groupStage.id,
      code: "GROUP_STAGE",
      name: "Fase a gironi",
      order: 1
    }),
    ...knockoutStages.map((stage, index) =>
      createRound({
        editionId: edition.id,
        stageId: stage.id,
        code: stage.code,
        name: stage.name,
        order: index + 2
      })
    )
  ];
  const matches = createGroupMatches({
    edition,
    groupStageId: groupStage.id,
    roundId: rounds[0]?.id ?? "round-group",
    groups,
    teams
  });
  const bracketSlots = createGroupCompetitionBracketSlots({
    editionId: edition.id,
    groupCodes: params.groupCodes,
    automaticQualifiersPerGroup: params.automaticQualifiersPerGroup,
    bestThirdPlacedTeams: params.bestThirdPlacedTeams,
    roundCode: params.initialKnockoutRound
  });
  const antepostDefinitions = createAntepostDefinitions({
    editionId: edition.id,
    editionCode: params.editionCode,
    includeFinalists: false,
    topScorerGoalsRequired: params.topScorerGoalsRequired
  });
  const versionBundle = createVersionBundle({
    family,
    edition,
    format,
    rankingRuleCodes: params.rankingRuleCodes,
    bestThirdsRankingRuleCodes: params.bestThirdsRankingRuleCodes,
    bracketMappingStrategy: params.bracketMappingStrategy,
    scoringConfig: params.scoringConfig,
    scoringPresetCode: params.scoringPresetCode,
    supersedesTemplateVersionId: params.supersedesTemplateVersionId,
    predictionRequirements: [
      "MATCH_SCORE",
      "GROUP_STANDINGS",
      ...(params.bestThirdPlacedTeams > 0 ? (["BEST_THIRDS"] as const) : []),
      "KNOCKOUT_QUALIFIER",
      "KNOCKOUT_ADVANCEMENT_METHOD",
      "TOURNAMENT_WINNER",
      "TOP_SCORER",
      "TOP_SCORER_GOALS"
    ]
  });

  return {
    family,
    sport: footballSport,
    template,
    edition,
    versionBundle,
    stages: [groupStage, ...knockoutStages],
    groups,
    rounds,
    teams,
    players,
    matches,
    bracketSlots,
    antepostDefinitions
  };
}

function createVersionBundle(params: {
  family: CompetitionFamily;
  edition: CompetitionEdition;
  format: CompetitionFormat;
  rankingRuleCodes: RankingRuleCode[];
  bestThirdsRankingRuleCodes?: RankingRuleCode[] | undefined;
  bracketMappingStrategy: BracketMappingStrategyCode;
  scoringConfig: ScoringRuleConfig;
  scoringPresetCode: string;
  supersedesTemplateVersionId?: string | undefined;
  predictionRequirements: readonly PredictionRequirementTemplateItem["code"][];
}): CompetitionVersionBundle<ScoringRuleConfig> {
  const editionCode = params.edition.editionCode ?? params.edition.id;
  const rankingRuleSet: RankingRuleSet = {
    id: `ranking-${editionCode}-primary`,
    code: `${editionCode}_primary`,
    name: `${params.edition.name} ranking`,
    rules: params.rankingRuleCodes,
    officialRulesSource: commonRulesSource
  };
  const bestThirdsRankingRuleSet: RankingRuleSet | undefined = params.bestThirdsRankingRuleCodes
    ? {
        id: `ranking-${editionCode}-best-thirds`,
        code: `${editionCode}_best_thirds`,
        name: `${params.edition.name} best thirds ranking`,
        rules: params.bestThirdsRankingRuleCodes,
        officialRulesSource: commonRulesSource
      }
    : undefined;
  const stages = createStageTemplates(params.format, rankingRuleSet.code);
  const formatTemplate: FormatTemplateVersion = {
    id: `format-${editionCode}-v1`,
    familyCode: params.family.code,
    editionCode,
    version: "1.0.0",
    status: "active",
    validFromUtc: params.edition.firstKickoffAtUtc,
    ...(params.supersedesTemplateVersionId
      ? { supersedesTemplateVersionId: params.supersedesTemplateVersionId }
      : {}),
    officialRulesSource: commonRulesSource,
    format: clone(params.format),
    stages,
    rankingRuleSets: [
      rankingRuleSet,
      ...(bestThirdsRankingRuleSet ? [bestThirdsRankingRuleSet] : [])
    ],
    bracketMappingStrategy: params.bracketMappingStrategy
  };
  const ruleset: RulesetVersion = {
    id: `ruleset-${editionCode}-v1`,
    familyCode: params.family.code,
    editionCode,
    version: "1.0.0",
    status: "active",
    validFromUtc: params.edition.firstKickoffAtUtc,
    officialRulesSource: commonRulesSource,
    rankingRuleSetCodes: formatTemplate.rankingRuleSets.map((ruleSet) => ruleSet.code)
  };
  const predictionRequirements: PredictionRequirementVersion = {
    id: `prediction-requirements-${editionCode}-v1`,
    familyCode: params.family.code,
    editionCode,
    version: "1.0.0",
    status: "active",
    validFromUtc: params.edition.firstKickoffAtUtc,
    requirements: params.predictionRequirements.map((code) => ({
      code,
      required: true,
      description: requirementDescription(code)
    }))
  };
  const scoringPreset: ScoringPresetVersion<ScoringRuleConfig> = {
    id: `scoring-${editionCode}-v1`,
    familyCode: params.family.code,
    editionCode,
    presetCode: params.scoringPresetCode,
    version: "1.0.0",
    status: "active",
    validFromUtc: params.edition.firstKickoffAtUtc,
    config: clone(params.scoringConfig)
  };

  return {
    family: params.family,
    edition: params.edition,
    formatTemplate,
    ruleset,
    predictionRequirements,
    scoringPreset
  };
}

function createCompetitionFormat(params: CompetitionFormat): CompetitionFormat {
  return {
    ...params,
    versionId: `format-${params.editionCode}-v1`,
    hasThirdPlaceFinal: params.knockoutRounds.includes("THIRD_PLACE")
  };
}

function createStageTemplates(
  format: CompetitionFormat,
  rankingRuleSetCode: string
): StageTemplate[] {
  const initialStage: StageTemplate =
    format.initialStageKind === "league_phase"
      ? {
          id: `stage-template-${format.editionCode}-league-phase`,
          code: "LEAGUE_PHASE",
          kind: "league_phase",
          name: "League phase",
          order: 1,
          rankingRuleSetCode
        }
      : {
          id: `stage-template-${format.editionCode}-groups`,
          code: "GROUP_STAGE",
          kind: "group_stage",
          name: "Group stage",
          order: 1,
          rankingRuleSetCode
        };

  return [
    initialStage,
    ...(format.bestThirdPlacedTeams > 0
      ? [
          {
            id: `stage-template-${format.editionCode}-best-thirds`,
            code: "BEST_THIRDS" as const,
            kind: "best_thirds_ranking" as const,
            name: "Best third-placed ranking",
            order: 2,
            rankingRuleSetCode
          }
        ]
      : []),
    ...format.knockoutRounds.map((roundCode, index) => ({
      id: `stage-template-${format.editionCode}-${roundCode.toLowerCase()}`,
      code: roundCode,
      kind: roundStageKinds[roundCode],
      name: roundNames[roundCode],
      order: index + 3,
      tieMode: format.knockoutTieModeByRound?.[roundCode] ?? "single_leg"
    })),
    {
      id: `stage-template-${format.editionCode}-antepost`,
      code: "ANTEPOST",
      kind: "antepost",
      name: "Antepost",
      order: format.knockoutRounds.length + 4
    }
  ];
}

function createFamily(code: CompetitionFamilyCode): CompetitionFamily {
  const names: Record<CompetitionFamilyCode, string> = {
    world_cup: "FIFA World Cup",
    euro: "UEFA EURO",
    champions_league: "UEFA Champions League"
  };

  return {
    id: `family-${code}`,
    code,
    name: names[code],
    sportId: footballSport.id,
    status: "active"
  };
}

function createTemplate(params: {
  family: CompetitionFamily;
  code: CompetitionTemplate["code"];
  name: string;
}): CompetitionTemplate {
  return {
    id: `template-${params.family.code}`,
    sportId: footballSport.id,
    code: params.code,
    name: params.name,
    familyCode: params.family.code
  };
}

function createEdition(params: {
  template: CompetitionTemplate;
  family: CompetitionFamily;
  editionCode: string;
  name: string;
  seasonLabel: string;
  firstKickoffAtUtc: string;
  maximumDeadlineAtUtc: string;
  format: CompetitionFormat;
}): CompetitionEdition {
  return {
    id: `edition-${params.editionCode}`,
    templateId: params.template.id,
    familyCode: params.family.code,
    editionCode: params.editionCode,
    name: params.name,
    seasonLabel: params.seasonLabel,
    enabled: true,
    firstKickoffAtUtc: params.firstKickoffAtUtc,
    maximumDeadlineAtUtc: params.maximumDeadlineAtUtc,
    dataCompleteness: "MOCK_COMPLETE",
    format: params.format,
    formatTemplateVersionId: `format-${params.editionCode}-v1`,
    rulesetVersionId: `ruleset-${params.editionCode}-v1`,
    predictionRequirementVersionId: `prediction-requirements-${params.editionCode}-v1`,
    scoringPresetVersionId: `scoring-${params.editionCode}-v1`,
    officialRulesSource: commonRulesSource
  };
}

function createStage(params: {
  editionId: string;
  code: Stage["code"];
  kind: Stage["kind"];
  name: string;
  order: number;
}): Stage {
  return {
    id: `stage-${params.editionId.replace("edition-", "")}-${params.code.toLowerCase().replaceAll("_", "-")}`,
    editionId: params.editionId,
    code: params.code,
    kind: params.kind,
    name: params.name,
    order: params.order
  };
}

function createRound(params: {
  editionId: string;
  stageId: string;
  code: Round["code"];
  name: string;
  order: number;
}): Round {
  return {
    id: `round-${params.editionId.replace("edition-", "")}-${params.code.toLowerCase().replaceAll("_", "-")}`,
    editionId: params.editionId,
    stageId: params.stageId,
    code: params.code,
    name: params.name,
    order: params.order
  };
}

function createTeam(name: string, index: number): Team {
  return {
    id: `team-${String(index + 1).padStart(2, "0")}`,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    countryCode: `T${String(index + 1).padStart(2, "0")}`
  };
}

function createPlayers(teams: Team[], editionCode: string): Player[] {
  return teams.slice(0, Math.min(teams.length, 24)).map((team, index) => ({
    id: `player-${editionCode}-${String(index + 1).padStart(2, "0")}`,
    teamId: team.id,
    displayName: `${team.name} Bomber`
  }));
}

function createGroupMatches(params: {
  edition: CompetitionEdition;
  groupStageId: string;
  roundId: string;
  groups: Group[];
  teams: Team[];
}): Match[] {
  const pairings = [
    [0, 1],
    [2, 3],
    [0, 2],
    [3, 1],
    [0, 3],
    [1, 2]
  ] as const;

  return params.groups.flatMap((group, groupIndex) => {
    const groupTeams = params.teams.slice(groupIndex * 4, groupIndex * 4 + 4);

    return pairings.map(([homeIndex, awayIndex], pairingIndex) => {
      const dayOffset = groupIndex * 2 + Math.floor(pairingIndex / 2);
      const kickoffHour = pairingIndex % 2 === 0 ? 16 : 19;
      const base = new Date(params.edition.firstKickoffAtUtc);
      const kickoffAtUtc = new Date(
        Date.UTC(
          base.getUTCFullYear(),
          base.getUTCMonth(),
          base.getUTCDate() + dayOffset,
          kickoffHour,
          0,
          0
        )
      );
      const homeTeam = groupTeams[homeIndex];
      const awayTeam = groupTeams[awayIndex];

      if (!homeTeam || !awayTeam) {
        throw new Error(`Invalid mock team allocation for group ${group.code}`);
      }

      return {
        id: `match-${params.edition.editionCode}-${group.code.toLowerCase()}-${pairingIndex + 1}`,
        editionId: params.edition.id,
        stageId: params.groupStageId,
        groupId: group.id,
        roundId: params.roundId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAtUtc: kickoffAtUtc.toISOString(),
        status: "NOT_STARTED",
        order: groupIndex * 6 + pairingIndex + 1
      };
    });
  });
}

function createLeaguePhaseMatches(params: {
  editionId: string;
  stageId: string;
  roundId: string;
  teams: Team[];
}): Match[] {
  return params.teams.flatMap((homeTeam, homeIndex) =>
    [1, 2, 3, 4].map((offset) => {
      const awayTeam = params.teams[(homeIndex + offset) % params.teams.length];

      if (!awayTeam) {
        throw new Error("Invalid league phase pairing.");
      }

      const order = homeIndex * 4 + offset;
      const kickoffAtUtc = new Date(Date.UTC(2026, 8, 15 + Math.floor(order / 18), 19, 0, 0));

      return {
        id: `match-champions-league-${String(order).padStart(3, "0")}`,
        editionId: params.editionId,
        stageId: params.stageId,
        roundId: params.roundId,
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        kickoffAtUtc: kickoffAtUtc.toISOString(),
        status: "NOT_STARTED" as const,
        order
      };
    })
  );
}

function createGroupCompetitionBracketSlots(params: {
  editionId: string;
  groupCodes: string[];
  automaticQualifiersPerGroup: number;
  bestThirdPlacedTeams: number;
  roundCode: KnockoutRoundCode;
}): BracketSlot[] {
  const groupPositionSlots = params.groupCodes.flatMap((groupCode) =>
    Array.from({ length: params.automaticQualifiersPerGroup }, (_, index) => ({
      id: `slot-${params.editionId}-${groupCode.toLowerCase()}-${index + 1}`,
      editionId: params.editionId,
      roundCode: params.roundCode,
      source: {
        type: "GROUP_POSITION" as const,
        groupCode,
        position: index + 1
      }
    }))
  );
  const bestThirdSlots = Array.from({ length: params.bestThirdPlacedTeams }, (_, index) => ({
    id: `slot-${params.editionId}-best-third-${index + 1}`,
    editionId: params.editionId,
    roundCode: params.roundCode,
    source: {
      type: "BEST_THIRD" as const,
      rank: index + 1
    }
  }));

  return [...groupPositionSlots, ...bestThirdSlots];
}

function createChampionsLeagueBracketSlots(editionId: string): BracketSlot[] {
  const playoffSlots = Array.from({ length: 16 }, (_, index) => ({
    id: `slot-${editionId}-playoff-${index + 1}`,
    editionId,
    roundCode: "PLAYOFF" as const,
    source: {
      type: "LEAGUE_POSITION" as const,
      position: index + 9
    }
  }));
  const roundOf16DirectSlots = Array.from({ length: 8 }, (_, index) => ({
    id: `slot-${editionId}-round16-direct-${index + 1}`,
    editionId,
    roundCode: "ROUND_OF_16" as const,
    source: {
      type: "LEAGUE_POSITION" as const,
      position: index + 1
    }
  }));
  const roundOf16PlayoffWinnerSlots = Array.from({ length: 8 }, (_, index) => ({
    id: `slot-${editionId}-round16-playoff-winner-${index + 1}`,
    editionId,
    roundCode: "ROUND_OF_16" as const,
    source: {
      type: "WINNER_OF_MATCH" as const,
      matchId: `predicted-playoff-${index + 1}`
    }
  }));

  return [...playoffSlots, ...roundOf16DirectSlots, ...roundOf16PlayoffWinnerSlots];
}

function createAntepostDefinitions(params: {
  editionId: string;
  editionCode: string;
  includeFinalists: boolean;
  topScorerGoalsRequired: boolean;
}): AntepostDefinition[] {
  return [
    {
      id: `antepost-${params.editionCode}-winner`,
      editionId: params.editionId,
      code: "TOURNAMENT_WINNER",
      label: "Vincente torneo",
      valueType: "TEAM",
      required: true
    },
    ...(params.includeFinalists
      ? [
          {
            id: `antepost-${params.editionCode}-finalists`,
            editionId: params.editionId,
            code: "FINALISTS" as const,
            label: "Finaliste",
            valueType: "TEAM_PAIR" as const,
            required: true
          }
        ]
      : []),
    {
      id: `antepost-${params.editionCode}-top-scorer`,
      editionId: params.editionId,
      code: "TOP_SCORER",
      label: "Capocannoniere",
      valueType: "PLAYER",
      required: true
    },
    {
      id: `antepost-${params.editionCode}-top-scorer-goals`,
      editionId: params.editionId,
      code: "TOP_SCORER_GOALS",
      label: "Gol capocannoniere",
      valueType: "NUMBER",
      required: params.topScorerGoalsRequired
    }
  ];
}

function createGroupCodes(count: number): string[] {
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + index));
}

function requirementDescription(code: PredictionRequirementTemplateItem["code"]): string {
  const descriptions: Record<PredictionRequirementTemplateItem["code"], string> = {
    MATCH_SCORE: "Predict fixture score",
    GROUP_STANDINGS: "Predict group standings",
    LEAGUE_PHASE_STANDINGS: "Predict single league-phase standings",
    BEST_THIRDS: "Resolve best third-placed teams",
    KNOCKOUT_QUALIFIER: "Predict qualified team in knockout ties",
    KNOCKOUT_ADVANCEMENT_METHOD: "Predict extra-time or penalty qualification when needed",
    TOURNAMENT_WINNER: "Predict tournament winner",
    FINALISTS: "Predict finalists",
    TOP_SCORER: "Predict top scorer",
    TOP_SCORER_GOALS: "Predict top scorer goal total"
  };

  return descriptions[code];
}

function createStableChecksum(value: unknown): string {
  const input = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const nationalTeamNames = [
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

const clubTeamNames = [
  "Real Madrid",
  "Manchester City",
  "Bayern Monaco",
  "Inter",
  "PSG",
  "Liverpool",
  "Barcellona",
  "Arsenal",
  "Borussia Dortmund",
  "Atletico Madrid",
  "Juventus",
  "Milan",
  "Benfica",
  "Porto",
  "Ajax",
  "Sporting CP",
  "Napoli",
  "Roma",
  "Tottenham",
  "Chelsea",
  "Bayer Leverkusen",
  "RB Lipsia",
  "Monaco",
  "Lione",
  "PSV",
  "Feyenoord",
  "Celtic",
  "Rangers",
  "Galatasaray",
  "Fenerbahce",
  "Shakhtar",
  "Dinamo Zagabria",
  "Club Brugge",
  "Salzburg",
  "Copenhagen",
  "Young Boys"
];
