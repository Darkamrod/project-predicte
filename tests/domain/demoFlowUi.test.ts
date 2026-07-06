import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Milestone 9 demo flow UI contract", () => {
  it("keeps create-league UI edition-driven and demo-summary based", () => {
    const source = readFileSync("src/features/home/HomeScreen.tsx", "utf8");

    expect(source).toContain("getCompetitionDemoSummary");
    expect(source).toContain("Crea lega demo");
    expect(source).toContain("EditionOptionCard");
    expect(source).not.toMatch(/World Cup|ROUND_OF_32|THIRD_PLACE|world_cup/);
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
    expect(source).not.toMatch(/World Cup|ROUND_OF_32|THIRD_PLACE|world_cup/);
  });

  it("keeps leaderboard and breakdown grouped for the demo snapshot", () => {
    const source = readFileSync("src/features/leaderboard/LeaderboardScreen.tsx", "utf8");

    expect(source).toContain("Classifica demo");
    expect(source).toContain("groupBreakdownItems");
    expect(source).toContain("Breakdown del tuo profilo");
    expect(source).toContain("LeaderboardMetric");
  });
});
