import { readFileSync } from "node:fs";

import { getCompetitionDemoSummary } from "@/domain/competitions/demoSummary";
import {
  createChampionsLeague2026_27MockSeed,
  createEuro2028MockSeed,
  createWorldCup2026MockSeed
} from "@/domain/competitions/versionedTemplates";
import { describe, expect, it } from "vitest";

// Lightweight source/domain contracts: they avoid a fragile React Native render setup while
// still guarding the demo copy and data-driven UI boundaries introduced in Milestone 9-11A.
describe("Milestone 9-11A demo flow UI contract", () => {
  it("keeps create-league UI edition-driven and demo-summary based", () => {
    const source = readFileSync("src/features/home/HomeScreen.tsx", "utf8");

    expect(source).toContain("getCompetitionDemoSummary");
    expect(source).toContain("Crea lega demo");
    expect(source).toContain("EditionOptionCard");
    expect(source).not.toMatch(/World Cup|ROUND_OF_32|THIRD_PLACE|world_cup/);
  });

  it("surfaces domain-driven scoring preset and ruleset labels in Home", () => {
    const summaries = [
      getCompetitionDemoSummary(createWorldCup2026MockSeed()),
      getCompetitionDemoSummary(createEuro2028MockSeed()),
      getCompetitionDemoSummary(createChampionsLeague2026_27MockSeed())
    ];
    const source = readFileSync("src/features/home/HomeScreen.tsx", "utf8");

    expect(summaries.map((summary) => summary.presetLabel)).toEqual([
      "World Cup Default",
      "Euro Default",
      "Champions League Default"
    ]);
    expect(summaries.every((summary) => summary.rulesetLabel === "Regolamento 1.0.0")).toBe(true);
    expect(source).toContain("selectedSummary.presetLabel");
    expect(source).toContain("selectedSummary.rulesetLabel");
    expect(source).toContain("Preset scoring:");
    expect(source).not.toMatch(/WORLD_CUP_DEFAULT|EURO_DEFAULT|CHAMPIONS_LEAGUE_DEFAULT/);
  });

  it("keeps Quick and Expert prediction entry demo-ready without changing stored model", () => {
    const source = readFileSync("src/features/predictions/PredictionWorkflowScreen.tsx", "utf8");

    expect(source).toContain("ModeSelectionCard");
    expect(source).toContain("QuickMatchCard");
    expect(source).toContain("ExpertMatchCard");
    expect(source).toContain("Conferma e continua");
    expect(source).toContain("TargetStatusStrip");
    expect(source).toContain("Vincitrice derivata");
    expect(source).toContain("ScoreInput");
    expect(source).toContain("Completati");
    expect(source).toContain("Mancanti");
    expect(source).not.toContain("Partite compilate");
    expect(source).not.toMatch(/World Cup|ROUND_OF_32|THIRD_PLACE|world_cup/);
  });

  it("keeps Milestone 10 knockout entry explicit without adding post-extra-time score fields", () => {
    const source = readFileSync("src/features/predictions/PredictionWorkflowScreen.tsx", "utf8");

    expect(source).toContain("getMatchInputGuidance");
    expect(source).toContain("KnockoutResolutionPanel");
    expect(source).toContain("resolveKnockoutAdvancement");
    expect(source).toContain("getPredictionEntryTargetCompletionStatus");
    expect(source).toContain("Gol casa");
    expect(source).toContain("Gol trasferta");
    expect(source).toContain("90' pari");
    expect(source).toContain("Risultato al 90");
    expect(source).toContain("Scelta richiesta");
    expect(source).toContain("Nessun risultato supplementari");
    expect(source).toContain("Richiede scelta");
    expect(source).toContain("Blocchi");
    expect(source).not.toContain("function deriveRegulationQualifiedTeamId");
    expect(source).not.toMatch(/after_extra_time|homeGoalsAfterExtraTime|awayGoalsAfterExtraTime/);
    expect(source).not.toMatch(/penaltyScore|homePenalty|awayPenalty/);
  });

  it("keeps leaderboard and breakdown grouped for the demo snapshot", () => {
    const source = readFileSync("src/features/leaderboard/LeaderboardScreen.tsx", "utf8");

    expect(source).toContain("Classifica demo");
    expect(source).toContain("groupBreakdownItems");
    expect(source).toContain("Breakdown del tuo profilo");
    expect(source).toContain("LeaderboardMetric");
  });
});
