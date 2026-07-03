export type SportCode = "FOOTBALL";

export type CompetitionTemplateCode = "FIFA_WORLD_CUP" | "UEFA_EURO" | "UEFA_CHAMPIONS_LEAGUE";

export type StageKind = "GROUP" | "KNOCKOUT" | "ANTEPOST";

export type KnockoutRoundCode =
  "ROUND_OF_32" | "ROUND_OF_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "THIRD_PLACE" | "FINAL";

export type StageCode = "GROUP_STAGE" | KnockoutRoundCode;

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
}

export interface CompetitionEdition {
  id: string;
  templateId: string;
  name: string;
  seasonLabel: string;
  enabled: boolean;
  firstKickoffAtUtc: string;
  maximumDeadlineAtUtc: string;
  dataCompleteness: "MOCK_COMPLETE" | "PARTIAL" | "COMPLETE";
  format: CompetitionFormat;
}

export interface CompetitionFormat {
  groupCount: number;
  teamsPerGroup: number;
  groupStageMatchCount: number;
  bestThirdPlacedTeams: number;
  knockoutRounds: KnockoutRoundCode[];
  antepostDefinitionIds: string[];
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
    | { type: "WINNER_OF_MATCH"; matchId: string }
    | { type: "LOSER_OF_MATCH"; matchId: string };
}

export interface AntepostDefinition {
  id: string;
  editionId: string;
  code: "TOURNAMENT_WINNER" | "TOP_SCORER" | "TOP_SCORER_GOALS";
  label: string;
  valueType: "TEAM" | "PLAYER" | "NUMBER";
  required: boolean;
}

export interface CompetitionSeed {
  sport: Sport;
  template: CompetitionTemplate;
  edition: CompetitionEdition;
  stages: Stage[];
  groups: Group[];
  rounds: Round[];
  teams: Team[];
  players: Player[];
  matches: Match[];
  bracketSlots: BracketSlot[];
  antepostDefinitions: AntepostDefinition[];
}
