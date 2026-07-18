import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { darkColors, lightColors } from "@/design-system/tokens";
import { resolveThemeMode } from "@/design-system/themeResolver";

describe("Milestone 12 UI foundation", () => {
  it.each([
    ["system", "dark", "dark"],
    ["system", "light", "light"],
    ["system", "unspecified", "light"],
    ["system", null, "light"],
    ["light", "dark", "light"],
    ["dark", "light", "dark"]
  ] as const)("resolves %s with system %s to %s", (selected, system, expected) => {
    expect(resolveThemeMode(selected, system)).toBe(expected);
  });

  it.each([
    ["light primary text", lightColors.textPrimary, lightColors.background],
    ["light secondary text", lightColors.textSecondary, lightColors.background],
    ["light primary action", lightColors.onPrimary, lightColors.primary],
    ["dark primary text", darkColors.textPrimary, darkColors.background],
    ["dark secondary text", darkColors.textSecondary, darkColors.background],
    ["dark primary action", darkColors.onPrimary, darkColors.primary]
  ])("keeps readable contrast for %s", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("uses semantic UI primitives in the migrated real-data screens", () => {
    const participants = readSource("src/features/participants/ParticipantsScreen.tsx");
    const leaderboard = readSource("src/features/leaderboard/LeaderboardScreen.tsx");

    for (const source of [participants, leaderboard]) {
      expect(source).toContain("<LoadingState");
      expect(source).toContain("<EmptyState");
      expect(source).toContain("<ErrorState");
      expect(source).toContain("<SectionHeader");
      expect(source).toContain("<AppListItem");
      expect(source).not.toMatch(/#[0-9a-f]{3,8}/i);
    }

    expect(participants).not.toContain("Supabase paginato");
    expect(leaderboard).not.toContain("Snapshot Supabase read-only");
  });

  it("keeps the migrated slice free from data and business imports", () => {
    const componentSources = [
      "src/components/AppListItem.tsx",
      "src/components/LoadingState.tsx",
      "src/components/SectionHeader.tsx"
    ].map(readSource);

    for (const source of componentSources) {
      expect(source).not.toMatch(/@\/domain|@\/services|supabase|scoring|leaderboard snapshot/i);
    }
  });
});

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported color ${hex}.`);
  }

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ) as [number, number, number];
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
