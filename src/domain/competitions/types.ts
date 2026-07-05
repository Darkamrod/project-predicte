export type SportCode = "FOOTBALL";

export type CompetitionTemplateCode = "FIFA_WORLD_CUP" | "UEFA_EURO" | "UEFA_CHAMPIONS_LEAGUE";

export type StageKind = "GROUP" | "KNOCKOUT" | "ANTEPOST";

export type KnockoutRoundCode =
  | "PLAYOFF"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "THIRD_PLACE"
  | "FINAL";

export type StageCode = "GROUP_STAGE" | KnockoutRoundCode;

export type CompetitionFamilyCode = "world_cup" | "euro" | "champions_league";

export type TemplateVersionStatus = "draft" | "active" | "deprecated" | "archived";

export type TemplateStageKind =
  | "group_stage"
  | "league_phase"
  | "best_thirds_ranking"
  | "knockout_single_leg"
  | "knockout_two_leg"
  | "final_single_leg"
  | "third_place_final"
  | "antepost";

export type RankingRuleCode =
  | "points"
  | "head_to_head_points"
  | "head_to_head_goal_difference"
  | "goal_difference"
  | "goals_for"
  | "wins"
  | "disciplinary"
  | "coefficient"
  | "drawing_of_lots";

export type BracketMappingStrategyCode =
  | "fifa_2026_bracket_slots"
  | "uefa_euro_2028_bracket_slots"
  | "ucl_2026_27_seeded_playoff"
  | "explicit_versioned_slots";

export type PredictionRequirementCode =
  | "MATCH_SCORE"
  | "GROUP_STANDINGS"
  | "LEAGUE_PHASE_STANDINGS"
  | "BEST_THIRDS"
  | "KNOCKOUT_QUALIFIER"
  | "KNOCKOUT_ADVANCEMENT_METHOD"
  | "TOURNAMENT_WINNER"
  | "FINALISTS"
  | "TOP_SCORER"
  | "TOP_SCORER_GOALS";

export interface Sport {
  id: string;
  code: SportCode;
  name: string;
}

export interface CompetitionTemplate {
  id: string;
  sportId: string;
  code: CompetitionTemplateCode;
  name: string;
  familyCode?: CompetitionFamilyCode | undefined;
}

export interface CompetitionEdition {
  id: string;
  templateId: string;
  familyCode?: CompetitionFamilyCode | undefined;
  editionCode?: string | undefined;
  name: string;
  seasonLabel: string;
  enabled: boolean;
  firstKickoffAtUtc: string;
  maximumDeadlineAtUtc: string;
  dataCompleteness: "MOCK_COMPLETE" | "PARTIAL" | "COMPLETE";
  format: CompetitionFormat;
  formatTemplateVersionId?: string | undefined;
  rulesetVersionId?: string | undefined;
  predictionRequirementVersionId?: string | undefined;
  scoringPresetVersionId?: string | undefined;
  officialRulesSource?: OfficialRulesSource | undefined;
}

export interface CompetitionFormat {
  versionId?: string | undefined;
  familyCode?: CompetitionFamilyCode | undefined;
  editionCode?: string | undefined;
  groupCount: number;
  teamsPerGroup: number;
  groupStageMatchCount: number;
  bestThirdPlacedTeams: number;
  knockoutRounds: KnockoutRoundCode[];
  antepostDefinitionIds: string[];
  teamCount?: number | undefined;
  initialStageKind?: Extract<TemplateStageKind, "group_stage" | "league_phase"> | undefined;
  automaticQualifiersPerGroup?: number | undefined;
  initialKnockoutRound?: KnockoutRoundCode | undefined;
  hasThirdPlaceFinal?: boolean | undefined;
  rankingRuleSetCode?: string | undefined;
  rankingRuleCodes?: RankingRuleCode[] | undefined;
  bestThirdsRankingRuleCodes?: RankingRuleCode[] | undefined;
  bracketMappingStrategy?: BracketMappingStrategyCode | undefined;
  knockoutTieModeByRound?: Partial<Record<KnockoutRoundCode, "single_leg" | "two_leg">> | undefined;
  leaguePhase?: LeaguePhaseFormat | undefined;
}

export interface LeaguePhaseFormat {
  tableSize: number;
  matchesPerTeam: number;
  homeMatchesPerTeam: number;
  awayMatchesPerTeam: number;
  directRoundOf16Positions: [number, number];
  playoffPositions: [number, number];
  eliminatedPositions: [number, number];
}

export interface CompetitionFamily {
  id: string;
  code: CompetitionFamilyCode;
  name: string;
  sportId: string;
  status: TemplateVersionStatus;
}

export interface OfficialRulesSource {
  label: string;
  url?: string | undefined;
  retrievedAtUtc?: string | undefined;
}

export interface RankingRuleSet {
  id: string;
  code: string;
  name: string;
  rules: RankingRuleCode[];
  officialRulesSource: OfficialRulesSource;
}

export interface AdvancementRule {
  id: string;
  fromStage: TemplateStageKind;
  toStage: KnockoutRoundCode | "ELIMINATED";
  description: string;
  positions?: number[] | undefined;
  bestThirdsCount?: number | undefined;
}

export interface StageTemplate {
  id: string;
  code: StageCode | "LEAGUE_PHASE" | "BEST_THIRDS" | "ANTEPOST";
  kind: TemplateStageKind;
  name: string;
  order: number;
  rankingRuleSetCode?: string | undefined;
  advancementRules?: AdvancementRule[] | undefined;
  tieMode?: "single_leg" | "two_leg" | undefined;
}

export interface FormatTemplateVersion {
  id: string;
  familyCode: CompetitionFamilyCode;
  editionCode: string;
  version: string;
  status: TemplateVersionStatus;
  validFromUtc: string;
  validToUtc?: string | undefined;
  supersedesTemplateVersionId?: string | undefined;
  officialRulesSource: OfficialRulesSource;
  format: CompetitionFormat;
  stages: StageTemplate[];
  rankingRuleSets: RankingRuleSet[];
  bracketMappingStrategy: BracketMappingStrategyCode;
}

export interface PredictionRequirementTemplateItem {
  code: PredictionRequirementCode;
  required: boolean;
  stageCode?: StageCode | "LEAGUE_PHASE" | "ANTEPOST" | undefined;
  description: string;
}

export interface PredictionRequirementVersion {
  id: string;
  familyCode: CompetitionFamilyCode;
  editionCode: string;
  version: string;
  status: TemplateVersionStatus;
  validFromUtc: string;
  validToUtc?: string | undefined;
  requirements: PredictionRequirementTemplateItem[];
}

export interface RulesetVersion {
  id: string;
  familyCode: CompetitionFamilyCode;
  editionCode: string;
  version: string;
  status: TemplateVersionStatus;
  validFromUtc: string;
  validToUtc?: string | undefined;
  officialRulesSource: OfficialRulesSource;
  rankingRuleSetCodes: string[];
}

export interface ScoringPresetVersion<TConfig = unknown> {
  id: string;
  familyCode: CompetitionFamilyCode;
  editionCode: string;
  presetCode: string;
  version: string;
  status: TemplateVersionStatus;
  validFromUtc: string;
  validToUtc?: string | undefined;
  config: TConfig;
}

export interface CompetitionVersionBundle<TScoringConfig = unknown> {
  family: CompetitionFamily;
  edition: CompetitionEdition;
  formatTemplate: FormatTemplateVersion;
  ruleset: RulesetVersion;
  predictionRequirements: PredictionRequirementVersion;
  scoringPreset: ScoringPresetVersion<TScoringConfig>;
}

export interface LeagueCompetitionSnapshot<TScoringConfig = unknown> {
  leagueId: string;
  competitionEditionId: string;
  familyCode: CompetitionFamilyCode;
  editionCode: string;
  formatTemplate: FormatTemplateVersion;
  ruleset: RulesetVersion;
  predictionRequirements: PredictionRequirementVersion;
  scoringPreset: ScoringPresetVersion<TScoringConfig>;
  adminOverrides: Record<string, unknown>;
  lockedAtUtc: string;
  checksum: string;
}

export interface Stage {
  id: string;
  editionId: string;
  code: StageCode;
  kind: StageKind;
  name: string;
  order: number;
}

export interface Group {
  id: string;
  editionId: string;
  stageId: string;
  code: string;
  name: string;
  order: number;
}

export interface Round {
  id: string;
  editionId: string;
  stageId: string;
  code: StageCode;
  name: string;
  order: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
}

export interface Player {
  id: string;
  teamId: string;
  displayName: string;
}

export type MatchStatus =
  | "NOT_STARTED"
  | "LIVE"
  | "FULL_TIME"
  | "AFTER_EXTRA_TIME"
  | "AFTER_PENALTIES"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED"
  | "UNKNOWN";

export interface Match {
  id: string;
  editionId: string;
  stageId: string;
  groupId?: string;
  roundId?: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAtUtc: string;
  status: MatchStatus;
  order: number;
}

export interface BracketSlot {
  id: string;
  editionId: string;
  roundCode: KnockoutRoundCode;
  source:
    | { type: "GROUP_POSITION"; groupCode: string; position: number }
    | { type: "BEST_THIRD"; rank: number }
    | { type: "LEAGUE_POSITION"; position: number }
    | { type: "WINNER_OF_MATCH"; matchId: string }
    | { type: "LOSER_OF_MATCH"; matchId: string };
}

export interface AntepostDefinition {
  id: string;
  editionId: string;
  code: "TOURNAMENT_WINNER" | "FINALISTS" | "TOP_SCORER" | "TOP_SCORER_GOALS";
  label: string;
  valueType: "TEAM" | "TEAM_PAIR" | "PLAYER" | "NUMBER";
  required: boolean;
}

export interface CompetitionSeed {
  family?: CompetitionFamily | undefined;
  sport: Sport;
  template: CompetitionTemplate;
  edition: CompetitionEdition;
  versionBundle?: CompetitionVersionBundle | undefined;
  stages: Stage[];
  groups: Group[];
  rounds: Round[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  bracketSlots: BracketSlot[];
  antepostDefinitions: AntepostDefinition[];
}
