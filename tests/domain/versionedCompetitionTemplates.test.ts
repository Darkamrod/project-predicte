import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createChampionsLeague2026_27MockSeed,
  createCompetitionSnapshot,
  createEuro2028MockSeed,
  createInitialCompetitionSeeds,
  createWorldCup2026MockSeed,
  createWorldCup2030MockSeed
} from "@/domain/competitions/versionedTemplates";
import { generatePredictedBracket } from "@/domain/predictions/bracket";
import { createMockLeague, createPredictionSet } from "@/services/mock/mockLeagueFactory";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260705040000_milestone7_1_versioned_competition_templates.sql"
  ),
  "utf8"
);
const seedSql = readFileSync(join(process.cwd(), "supabase/seed.sql"), "utf8");

const owner = {
  id: "user-owner",
  displayName: "Owner",
  avatarInitials: "OW",
  locale: "it-IT",
  timezone: "Europe/Rome"
} as const;

describe("Milestone 7.1 versioned competition templates", () => {
  it("models FIFA World Cup 2026 with 48 teams, best thirds, round of 32, and third-place final", () => {
    const seed = createWorldCup2026MockSeed();
    const predictionSet = createPredictionSet("league-wc", "user-a", seed);
    const bracket = generatePredictedBracket({ competition: seed, predictionSet });

    expect(seed.family?.code).toBe("world_cup");
    expect(seed.edition.editionCode).toBe("world_cup_2026");
    expect(seed.teams).toHaveLength(48);
    expect(seed.groups).toHaveLength(12);
    expect(seed.matches).toHaveLength(72);
    expect(seed.edition.format.bestThirdPlacedTeams).toBe(8);
    expect(seed.edition.format.knockoutRounds).toContain("ROUND_OF_32");
    expect(seed.edition.format.knockoutRounds).toContain("THIRD_PLACE");
    expect(bracket.matches.filter((match) => match.roundCode === "ROUND_OF_32")).toHaveLength(16);
    expect(bracket.matches.some((match) => match.roundCode === "THIRD_PLACE")).toBe(true);
    expect(seed.versionBundle?.scoringPreset.presetCode).toBe("WORLD_CUP_DEFAULT");
  });

  it("models UEFA EURO 2028 without round of 32 or third-place final and with UEFA ranking", () => {
    const seed = createEuro2028MockSeed();
    const predictionSet = createPredictionSet("league-euro", "user-a", seed);
    const bracket = generatePredictedBracket({ competition: seed, predictionSet });
    const rankingRules = seed.versionBundle?.formatTemplate.rankingRuleSets[0]?.rules;

    expect(seed.family?.code).toBe("euro");
    expect(seed.teams).toHaveLength(24);
    expect(seed.groups).toHaveLength(6);
    expect(seed.edition.format.bestThirdPlacedTeams).toBe(4);
    expect(seed.edition.format.knockoutRounds).not.toContain("ROUND_OF_32");
    expect(seed.edition.format.knockoutRounds).not.toContain("THIRD_PLACE");
    expect(bracket.matches.filter((match) => match.roundCode === "ROUND_OF_16")).toHaveLength(8);
    expect(bracket.matches.some((match) => match.roundCode === "ROUND_OF_32")).toBe(false);
    expect(bracket.matches.some((match) => match.roundCode === "THIRD_PLACE")).toBe(false);
    expect(rankingRules?.slice(0, 3)).toEqual([
      "points",
      "head_to_head_points",
      "head_to_head_goal_difference"
    ]);
    expect(seed.versionBundle?.scoringPreset.presetCode).toBe("EURO_DEFAULT");
  });

  it("models UEFA Champions League 2026/27 as league phase plus two-leg playoff path", () => {
    const seed = createChampionsLeague2026_27MockSeed();
    const predictionSet = createPredictionSet("league-ucl", "user-a", seed);
    const bracket = generatePredictedBracket({ competition: seed, predictionSet });

    expect(seed.family?.code).toBe("champions_league");
    expect(seed.groups).toHaveLength(0);
    expect(seed.teams).toHaveLength(36);
    expect(seed.matches).toHaveLength(144);
    expect(seed.edition.format.initialStageKind).toBe("league_phase");
    expect(seed.edition.format.leaguePhase).toMatchObject({
      tableSize: 36,
      matchesPerTeam: 8,
      homeMatchesPerTeam: 4,
      awayMatchesPerTeam: 4,
      directRoundOf16Positions: [1, 8],
      playoffPositions: [9, 24],
      eliminatedPositions: [25, 36]
    });
    expect(seed.edition.format.bestThirdPlacedTeams).toBe(0);
    expect(seed.edition.format.knockoutRounds).toEqual([
      "PLAYOFF",
      "ROUND_OF_16",
      "QUARTER_FINAL",
      "SEMI_FINAL",
      "FINAL"
    ]);
    expect(seed.edition.format.knockoutTieModeByRound?.PLAYOFF).toBe("two_leg");
    expect(seed.edition.format.knockoutTieModeByRound?.ROUND_OF_16).toBe("two_leg");
    expect(seed.edition.format.knockoutTieModeByRound?.FINAL).toBe("single_leg");
    expect(bracket.leagueTable).toHaveLength(36);
    expect(bracket.matches.filter((match) => match.roundCode === "PLAYOFF")).toHaveLength(8);
    expect(bracket.matches.some((match) => match.roundCode === "ROUND_OF_32")).toBe(false);
    expect(bracket.matches.some((match) => match.roundCode === "THIRD_PLACE")).toBe(false);
    expect(seed.antepostDefinitions.some((definition) => definition.code === "FINALISTS")).toBe(
      true
    );
    expect(seed.versionBundle?.scoringPreset.presetCode).toBe("CHAMPIONS_LEAGUE_DEFAULT");
  });

  it("keeps future editions versioned separately instead of mutating the family format", () => {
    const worldCup2026 = createWorldCup2026MockSeed();
    const worldCup2030 = createWorldCup2030MockSeed();

    expect(worldCup2026.family?.code).toBe(worldCup2030.family?.code);
    expect(worldCup2026.edition.editionCode).toBe("world_cup_2026");
    expect(worldCup2030.edition.editionCode).toBe("world_cup_2030");
    expect(worldCup2026.versionBundle?.formatTemplate.id).not.toBe(
      worldCup2030.versionBundle?.formatTemplate.id
    );
    expect(worldCup2030.versionBundle?.formatTemplate.supersedesTemplateVersionId).toBe(
      "format-world_cup_2026-v1"
    );
  });

  it("creates immutable league snapshots with format, requirements, ruleset, scoring, overrides, and checksum", () => {
    const seed = createEuro2028MockSeed();
    const snapshot = createCompetitionSnapshot({
      leagueId: "league-euro",
      competition: seed,
      lockedAtUtc: "2028-06-09T18:30:00.000Z",
      adminOverrides: { customLabel: "Owner preset" }
    });
    const originalChecksum = snapshot.checksum;

    seed.versionBundle!.formatTemplate.format.bestThirdPlacedTeams = 0;

    expect(snapshot.familyCode).toBe("euro");
    expect(snapshot.formatTemplate.format.bestThirdPlacedTeams).toBe(4);
    expect(snapshot.predictionRequirements.requirements.map((item) => item.code)).toContain(
      "BEST_THIRDS"
    );
    expect(snapshot.ruleset.rankingRuleSetCodes).toContain("euro_2028_primary");
    expect(snapshot.scoringPreset.presetCode).toBe("EURO_DEFAULT");
    expect(snapshot.adminOverrides).toEqual({ customLabel: "Owner preset" });
    expect(snapshot.checksum).toBe(originalChecksum);
    expect(snapshot.checksum).toMatch(/^fnv1a-/);
  });

  it("supports mock league creation with different families, editions, requirements, and scoring presets", () => {
    const seeds = createInitialCompetitionSeeds();
    const leagues = seeds.map((seed) =>
      createMockLeague({
        id: `league-${seed.edition.editionCode}`,
        name: seed.edition.name,
        owner,
        competition: seed
      })
    );

    expect(leagues.map((league) => league.competitionEditionId)).toEqual(
      seeds.map((seed) => seed.edition.id)
    );
    expect(leagues.map((league) => league.scoringRuleVersion.config.presetCode)).toEqual([
      "WORLD_CUP_DEFAULT",
      "EURO_DEFAULT",
      "CHAMPIONS_LEAGUE_DEFAULT"
    ]);
    expect(seeds.map((seed) => seed.versionBundle?.predictionRequirements.id)).toEqual([
      "prediction-requirements-world_cup_2026-v1",
      "prediction-requirements-euro_2028-v1",
      "prediction-requirements-champions_league_2026_27-v1"
    ]);
  });
});

describe("Milestone 7.1 Supabase migration and seed contract", () => {
  it("adds versioned template tables, league references, and lock snapshot trigger", () => {
    expect(migration).toContain("competition_families");
    expect(migration).toContain("format_template_versions");
    expect(migration).toContain("ruleset_versions");
    expect(migration).toContain("prediction_requirement_versions");
    expect(migration).toContain("scoring_preset_versions");
    expect(migration).toContain("locked_competition_snapshot");
    expect(migration).toContain("populate_league_competition_versions");
    expect(migration).toContain("capture_locked_competition_snapshot");
    expect(migration).toContain("calculate_template_snapshot_checksum");
    expect(migration).toContain("extensions.digest");
  });

  it("seeds initial versioned World Cup, EURO, and Champions League templates", () => {
    expect(seedSql).toContain("world_cup_2026");
    expect(seedSql).toContain("euro_2028");
    expect(seedSql).toContain("champions_league_2026_27");
    expect(seedSql).toContain("UEFA_EURO");
    expect(seedSql).toContain("UEFA_CHAMPIONS_LEAGUE");
    expect(seedSql).toContain("EURO_DEFAULT");
    expect(seedSql).toContain("CHAMPIONS_LEAGUE_DEFAULT");
    expect(seedSql).toContain("uefa_group_head_to_head_first");
    expect(seedSql).toContain("ucl_2026_27_seeded_playoff");
  });

  it("does not introduce excluded money, advertising, wagering, or real provider API features", () => {
    expect(`${migration}\n${seedSql}`).not.toMatch(
      /payment|paid|payout|prize|advertising|betting|odds|wagering|gambling|Sportmonks/i
    );
  });
});
