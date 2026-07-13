export interface AuthenticatedReadModelFormatRules {
  teamCount: number;
  initialStageKind: "group_stage" | "league_phase";
  groupCount: number;
  teamsPerGroup: number;
  automaticQualifiersPerGroup: number;
  bestThirdPlacedTeams: number;
  knockoutRounds: string[];
}

export interface AuthenticatedReadModelGroup {
  id: string;
  stageId: string;
  code: string;
}

export interface AuthenticatedReadModelEditionTeam {
  teamId: string;
  fifaCode?: string | undefined;
  seedGroupId?: string | undefined;
}

export interface AuthenticatedReadModelMatch {
  id: string;
  stageId: string;
  groupId?: string | undefined;
  homeTeamId?: string | undefined;
  awayTeamId?: string | undefined;
  matchNumber?: number | undefined;
  matchday?: number | undefined;
  matchFormat?: string | undefined;
  leg?: number | undefined;
  order: number;
}

export interface AuthenticatedReadModelReadinessInput {
  format: AuthenticatedReadModelFormatRules;
  initialStageIds: string[];
  groups: AuthenticatedReadModelGroup[];
  editionTeams: AuthenticatedReadModelEditionTeam[];
  matches: AuthenticatedReadModelMatch[];
  rankingRuleSetCount: number;
  rulesetRankingCodeCount: number;
  predictionRequirementCount: number;
  bracketNodeCount: number;
  bracketSlotCount: number;
  bestThirdCombinationCount: number;
}

export interface AuthenticatedReadModelReadiness {
  kind: "ready_for_resolver" | "incomplete";
  blockers: string[];
  counts: {
    teams: number;
    groups: number;
    initialMatches: number;
    completeInitialParticipants: number;
  };
}

export function assessAuthenticatedReadModelReadiness(
  input: AuthenticatedReadModelReadinessInput
): AuthenticatedReadModelReadiness {
  const initialStageIds = new Set(input.initialStageIds);
  const initialGroups = input.groups.filter((group) => initialStageIds.has(group.stageId));
  const initialGroupIds = new Set(initialGroups.map((group) => group.id));
  const initialMatches = input.matches.filter(
    (match) => initialStageIds.has(match.stageId) && Boolean(match.groupId)
  );
  const expectedMatchesPerGroup =
    (input.format.teamsPerGroup * (input.format.teamsPerGroup - 1)) / 2;
  const expectedInitialMatches = input.format.groupCount * expectedMatchesPerGroup;
  const knownTeamIds = new Set(input.editionTeams.map((team) => team.teamId));
  const fifaCodes = input.editionTeams.map((team) => team.fifaCode).filter(Boolean);
  const completeInitialParticipants = initialMatches.filter(
    (match) =>
      Boolean(match.homeTeamId) &&
      Boolean(match.awayTeamId) &&
      match.homeTeamId !== match.awayTeamId &&
      knownTeamIds.has(match.homeTeamId!) &&
      knownTeamIds.has(match.awayTeamId!)
  ).length;
  const teamsPerGroup = new Map<string, Set<string>>();
  const groupByTeam = new Map<string, string>();

  for (const membership of input.editionTeams) {
    if (!membership.seedGroupId) continue;
    const members = teamsPerGroup.get(membership.seedGroupId) ?? new Set<string>();
    members.add(membership.teamId);
    teamsPerGroup.set(membership.seedGroupId, members);
    groupByTeam.set(membership.teamId, membership.seedGroupId);
  }

  const matchesPerGroup = new Map<string, number>();
  const matchesPerTeam = new Map<string, number>();
  const pairingKeys = new Set<string>();
  let duplicatePairing = false;

  for (const match of initialMatches) {
    if (match.groupId) {
      matchesPerGroup.set(match.groupId, (matchesPerGroup.get(match.groupId) ?? 0) + 1);
    }
    if (match.homeTeamId) {
      matchesPerTeam.set(match.homeTeamId, (matchesPerTeam.get(match.homeTeamId) ?? 0) + 1);
    }
    if (match.awayTeamId) {
      matchesPerTeam.set(match.awayTeamId, (matchesPerTeam.get(match.awayTeamId) ?? 0) + 1);
    }
    if (match.homeTeamId && match.awayTeamId) {
      const pairingKey = [match.homeTeamId, match.awayTeamId].sort().join(":");
      duplicatePairing ||= pairingKeys.has(pairingKey);
      pairingKeys.add(pairingKey);
    }
  }

  const matchNumbers = initialMatches.map((match) => match.matchNumber);

  const blockers = [
    input.editionTeams.length !== input.format.teamCount
      ? `Catalogo squadre incompleto: ${input.editionTeams.length}/${input.format.teamCount}.`
      : undefined,
    new Set(input.editionTeams.map((team) => team.teamId)).size !== input.editionTeams.length ||
    fifaCodes.length !== input.editionTeams.length ||
    new Set(fifaCodes).size !== input.editionTeams.length
      ? "Codici FIFA o identita squadra duplicati/incompleti."
      : undefined,
    initialGroups.length !== input.format.groupCount
      ? `Catalogo gruppi incompleto: ${initialGroups.length}/${input.format.groupCount}.`
      : undefined,
    initialGroups.some(
      (group) => (teamsPerGroup.get(group.id)?.size ?? 0) !== input.format.teamsPerGroup
    )
      ? "Appartenenza squadre ai gruppi incompleta o incoerente."
      : undefined,
    input.editionTeams.some((team) => !team.seedGroupId || !initialGroupIds.has(team.seedGroupId))
      ? "Una o piu squadre non appartengono a un gruppo iniziale valido."
      : undefined,
    initialMatches.length !== expectedInitialMatches
      ? `Calendario iniziale incompleto: ${initialMatches.length}/${expectedInitialMatches}.`
      : undefined,
    initialGroups.some((group) => (matchesPerGroup.get(group.id) ?? 0) !== expectedMatchesPerGroup)
      ? "Numero di partite per gruppo incompleto o incoerente."
      : undefined,
    input.editionTeams.some(
      (team) => (matchesPerTeam.get(team.teamId) ?? 0) !== input.format.teamsPerGroup - 1
    )
      ? "Numero di partite per squadra incompleto o incoerente."
      : undefined,
    duplicatePairing || pairingKeys.size !== initialMatches.length
      ? "Una coppia di squadre iniziale e duplicata."
      : undefined,
    initialMatches.some(
      (match) =>
        !match.groupId ||
        !match.homeTeamId ||
        !match.awayTeamId ||
        groupByTeam.get(match.homeTeamId) !== match.groupId ||
        groupByTeam.get(match.awayTeamId) !== match.groupId
    )
      ? "Una o piu partite iniziali contiene squadre fuori gruppo."
      : undefined,
    matchNumbers.some((number) => number === undefined) ||
    new Set(matchNumbers).size !== expectedInitialMatches ||
    !Array.from({ length: expectedInitialMatches }, (_, index) => index + 1).every((number) =>
      matchNumbers.includes(number)
    )
      ? "Numerazione ufficiale delle partite iniziali incompleta o duplicata."
      : undefined,
    initialMatches.some(
      (match) => match.matchFormat !== "REGULATION_90" || match.leg !== 1 || !match.matchday
    )
      ? "Formato, leg o matchday delle partite iniziali incompleto."
      : undefined,
    completeInitialParticipants !== initialMatches.length
      ? "Una o piu partite iniziali non hanno partecipanti reali validi."
      : undefined,
    initialMatches.some((match) => !match.groupId || !initialGroupIds.has(match.groupId))
      ? "Una o piu partite iniziali non appartengono a un gruppo valido."
      : undefined,
    input.rankingRuleSetCount === 0 ? "Regole versionate di classifica mancanti." : undefined,
    input.rulesetRankingCodeCount === 0 ? "Ruleset senza ranking rule set versionato." : undefined,
    input.predictionRequirementCount === 0
      ? "Prediction requirements versionati mancanti."
      : undefined,
    input.format.bestThirdPlacedTeams > 0 && input.bestThirdCombinationCount === 0
      ? "Matrice versionata migliori terze mancante."
      : undefined,
    input.format.knockoutRounds.length > 0 &&
    (input.bracketNodeCount === 0 || input.bracketSlotCount === 0)
      ? "Catalogo bracket versionato mancante."
      : undefined
  ].filter((item): item is string => Boolean(item));

  return {
    kind: blockers.length === 0 ? "ready_for_resolver" : "incomplete",
    blockers,
    counts: {
      teams: input.editionTeams.length,
      groups: initialGroups.length,
      initialMatches: initialMatches.length,
      completeInitialParticipants
    }
  };
}
