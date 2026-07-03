import { createWorldCup2030MockSeed } from "@/domain/competitions/worldCupMock";
import type { CompetitionSeed, Match, Player, Team } from "@/domain/competitions/types";
import type { DateRange, FootballDataProvider, ProviderCapabilities } from "./types";

export class MockFootballDataProvider implements FootballDataProvider {
  private readonly seed = createWorldCup2030MockSeed();

  async syncCompetitionEdition(_externalEditionId: string): Promise<CompetitionSeed> {
    return this.seed;
  }

  async syncFixtures(editionId: string, range?: DateRange): Promise<Match[]> {
    const matches = this.seed.matches.filter((match) => match.editionId === editionId);

    if (!range) {
      return matches;
    }

    return matches.filter(
      (match) => match.kickoffAtUtc >= range.fromUtc && match.kickoffAtUtc <= range.toUtc
    );
  }

  async syncLiveFixtures(editionId: string): Promise<Match[]> {
    return this.seed.matches.filter(
      (match) => match.editionId === editionId && ["LIVE", "FULL_TIME"].includes(match.status)
    );
  }

  async syncFixture(fixtureExternalId: string): Promise<Match> {
    const match = this.seed.matches.find((fixture) => fixture.id === fixtureExternalId);

    if (!match) {
      throw new Error(`Mock fixture not found: ${fixtureExternalId}`);
    }

    return match;
  }

  async syncTeams(_editionId: string): Promise<Team[]> {
    return this.seed.teams;
  }

  async syncPlayers(_editionId: string): Promise<Player[]> {
    return this.seed.players;
  }

  async getCapabilities(_editionId: string): Promise<ProviderCapabilities> {
    return {
      schedules: true,
      liveResults: true,
      regulationScore: true,
      extraTime: true,
      penalties: true,
      groups: true,
      knockoutBrackets: true
    };
  }
}
