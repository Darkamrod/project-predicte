import type { CompetitionSeed, Match, Player, Team } from "@/domain/competitions/types";

export interface DateRange {
  fromUtc: string;
  toUtc: string;
}

export interface ProviderCapabilities {
  schedules: boolean;
  liveResults: boolean;
  regulationScore: boolean;
  extraTime: boolean;
  penalties: boolean;
  groups: boolean;
  knockoutBrackets: boolean;
}

export interface FootballDataProvider {
  syncCompetitionEdition(externalEditionId: string): Promise<CompetitionSeed>;
  syncFixtures(editionId: string, range?: DateRange): Promise<Match[]>;
  syncLiveFixtures(editionId: string): Promise<Match[]>;
  syncFixture(fixtureExternalId: string): Promise<Match>;
  syncTeams(editionId: string): Promise<Team[]>;
  syncPlayers(editionId: string): Promise<Player[]>;
  getCapabilities(editionId: string): Promise<ProviderCapabilities>;
}
