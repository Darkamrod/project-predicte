import type { CompetitionSeed, KnockoutRoundCode } from "./types";

export interface CompetitionDemoSummary {
  sportLabel: string;
  familyLabel: string;
  editionLabel: string;
  seasonLabel: string;
  presetLabel: string;
  rulesetLabel: string;
  formatHeadline: string;
  facts: string[];
  phaseLabels: string[];
  placeholderNotes: string[];
}

export function getCompetitionDemoSummary(competition: CompetitionSeed): CompetitionDemoSummary {
  const format = competition.edition.format;
  const teamCount = format.teamCount ?? competition.teams.length;
  const facts = [`${teamCount} squadre`];
  const phaseLabels: string[] = [];
  const placeholderNotes: string[] = [];

  if (format.initialStageKind === "league_phase" && format.leaguePhase) {
    facts.push(`${format.leaguePhase.matchesPerTeam} match per squadra`);
    facts.push(`classifica ${format.leaguePhase.tableSize} squadre`);
    phaseLabels.push("League phase");
    phaseLabels.push("Playoff");
    phaseLabels.push("Ottavi");
  } else if (format.groupCount > 0) {
    facts.push(`${format.groupCount} gironi`);
    facts.push(`${format.teamsPerGroup} squadre per girone`);
    phaseLabels.push("Gironi");
  }

  if (format.bestThirdPlacedTeams > 0) {
    facts.push(`${format.bestThirdPlacedTeams} migliori terze`);
    phaseLabels.push("Migliori terze");
    placeholderNotes.push("Mapping ufficiale migliori terze in placeholder documentato");
  }

  for (const round of format.knockoutRounds) {
    phaseLabels.push(getKnockoutRoundLabel(round));
  }

  if (format.knockoutTieModeByRound) {
    const hasTwoLegRound = Object.values(format.knockoutTieModeByRound).some(
      (tieMode) => tieMode === "two_leg"
    );

    if (hasTwoLegRound) {
      placeholderNotes.push("Andata/ritorno gestita come pronostico aggregato");
    }
  }

  return {
    sportLabel: competition.sport.name,
    familyLabel: competition.family?.name ?? competition.template.name,
    editionLabel: competition.edition.name,
    seasonLabel: competition.edition.seasonLabel,
    presetLabel:
      formatCodeLabel(competition.versionBundle?.scoringPreset.presetCode) ?? "Preset configurato",
    rulesetLabel: competition.versionBundle
      ? `Regolamento ${competition.versionBundle.ruleset.version}`
      : "Regolamento configurato",
    formatHeadline:
      format.initialStageKind === "league_phase"
        ? "League phase con tabellone"
        : "Gironi e tabellone",
    facts,
    phaseLabels: uniqueLabels([...phaseLabels, "Antepost"]),
    placeholderNotes: uniqueLabels(placeholderNotes)
  };
}

function getKnockoutRoundLabel(round: KnockoutRoundCode): string {
  if (round === "PLAYOFF") {
    return "Playoff";
  }

  if (round === "ROUND_OF_32") {
    return "Sedicesimi";
  }

  if (round === "ROUND_OF_16") {
    return "Ottavi";
  }

  if (round === "QUARTER_FINAL") {
    return "Quarti";
  }

  if (round === "SEMI_FINAL") {
    return "Semifinali";
  }

  if (round === "THIRD_PLACE") {
    return "Finale 3 posto";
  }

  return "Finale";
}

function uniqueLabels(labels: string[]): string[] {
  return Array.from(new Set(labels));
}

function formatCodeLabel(code: string | undefined): string | undefined {
  if (!code) {
    return undefined;
  }

  return code
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}
