export type AuthenticatedTargetMatchFormat =
  "initial_90_minutes" | "knockout_single_leg" | "knockout_two_leg" | "unsupported";

export interface AuthenticatedTargetStageInput {
  id: string;
  code: string;
  kind: string;
  name: string;
  order: number;
}

export interface AuthenticatedTargetGroupInput {
  id: string;
  stageId: string;
  code: string;
  name: string;
  order: number;
}

export interface AuthenticatedTargetRoundInput {
  id: string;
  stageId: string;
  code: string;
  name: string;
  order: number;
}

export interface AuthenticatedTargetTeamInput {
  id: string;
  name: string;
  shortName: string;
  countryCode?: string | undefined;
}

export interface AuthenticatedTargetMatchInput {
  id: string;
  stageId: string;
  groupId?: string | undefined;
  roundId?: string | undefined;
  homeTeamId?: string | undefined;
  awayTeamId?: string | undefined;
  order: number;
}

export interface AuthenticatedPersistedMatchPredictionInput {
  predictionRef: string;
  matchId?: string | undefined;
  homeGoals90: number;
  awayGoals90: number;
  qualifiedTeamId?: string | undefined;
  qualificationMethod?: "REGULATION" | "EXTRA_TIME" | "PENALTIES" | undefined;
}

export interface AuthenticatedPredictionTargetAdapterInput {
  leagueStatus: string;
  formatTemplatePayload?: unknown;
  predictionRequirementPayload?: unknown;
  stages: AuthenticatedTargetStageInput[];
  groups: AuthenticatedTargetGroupInput[];
  rounds: AuthenticatedTargetRoundInput[];
  teams: AuthenticatedTargetTeamInput[];
  matches: AuthenticatedTargetMatchInput[];
  persistedMatchPredictions: AuthenticatedPersistedMatchPredictionInput[];
  bracketSlotsAvailable: boolean;
  antepostDefinitionsAvailable: boolean;
}

export interface AuthenticatedNormalizedPredictionValue {
  homeGoals90: number;
  awayGoals90: number;
  qualifiedTeamId?: string | undefined;
  qualificationMethod?: "REGULATION" | "EXTRA_TIME" | "PENALTIES" | undefined;
}

export interface AuthenticatedPredictionMatchTarget {
  id: string;
  stageCode: string;
  stageName: string;
  groupCode?: string | undefined;
  roundCode?: string | undefined;
  order: number;
  matchFormat: AuthenticatedTargetMatchFormat;
  homeTeam?: AuthenticatedTargetTeamInput | undefined;
  awayTeam?: AuthenticatedTargetTeamInput | undefined;
  participantsDerived: boolean;
  canEnterScore90: boolean;
  canEnterQualifiedTeam: boolean;
  canEnterQualificationMethod: boolean;
  currentValue?: AuthenticatedNormalizedPredictionValue | undefined;
  blockedReason?: string | undefined;
}

export interface AuthenticatedPredictionTargetAdapterResult {
  targets: AuthenticatedPredictionMatchTarget[];
  blockers: string[];
  writeReady: boolean;
  progress: {
    totalTargets: number;
    completedTargets: number;
    missingTargets: number;
  };
}

export function adaptAuthenticatedPredictionTargets(
  input: AuthenticatedPredictionTargetAdapterInput
): AuthenticatedPredictionTargetAdapterResult {
  const stagesById = new Map(input.stages.map((stage) => [stage.id, stage]));
  const groupsById = new Map(input.groups.map((group) => [group.id, group]));
  const roundsById = new Map(input.rounds.map((round) => [round.id, round]));
  const teamsById = new Map(input.teams.map((team) => [team.id, team]));
  const templateStagesByCode = parseTemplateStages(input.formatTemplatePayload);
  const predictionsByReference = new Map(
    input.persistedMatchPredictions.flatMap((prediction) => {
      const references = [prediction.predictionRef, prediction.matchId].filter(Boolean) as string[];
      return references.map((reference) => [reference, prediction] as const);
    })
  );

  const targets = [...input.matches]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((match) => {
      const stage = stagesById.get(match.stageId);
      const templateStage = stage ? templateStagesByCode.get(stage.code) : undefined;
      const matchFormat = resolveMatchFormat(
        stage?.kind,
        templateStage?.kind,
        templateStage?.tieMode
      );
      const homeTeam = match.homeTeamId ? teamsById.get(match.homeTeamId) : undefined;
      const awayTeam = match.awayTeamId ? teamsById.get(match.awayTeamId) : undefined;
      const participantsDerived = !match.homeTeamId || !match.awayTeamId;
      const blockedReason = resolveTargetBlocker({
        stage,
        matchFormat,
        participantsDerived,
        homeTeam,
        awayTeam
      });
      const persisted = predictionsByReference.get(match.id);

      return {
        id: match.id,
        stageCode: stage?.code ?? "UNKNOWN",
        stageName: stage?.name ?? "Stage non disponibile",
        ...(match.groupId && groupsById.get(match.groupId)
          ? { groupCode: groupsById.get(match.groupId)!.code }
          : {}),
        ...(match.roundId && roundsById.get(match.roundId)
          ? { roundCode: roundsById.get(match.roundId)!.code }
          : {}),
        order: match.order,
        matchFormat,
        ...(homeTeam ? { homeTeam } : {}),
        ...(awayTeam ? { awayTeam } : {}),
        participantsDerived,
        canEnterScore90: !blockedReason && matchFormat !== "knockout_two_leg",
        canEnterQualifiedTeam: !blockedReason && matchFormat === "knockout_single_leg",
        canEnterQualificationMethod: !blockedReason && matchFormat === "knockout_single_leg",
        ...(persisted
          ? {
              currentValue: {
                homeGoals90: persisted.homeGoals90,
                awayGoals90: persisted.awayGoals90,
                ...(persisted.qualifiedTeamId
                  ? { qualifiedTeamId: persisted.qualifiedTeamId }
                  : {}),
                ...(persisted.qualificationMethod
                  ? { qualificationMethod: persisted.qualificationMethod }
                  : {})
              }
            }
          : {}),
        ...(blockedReason ? { blockedReason } : {})
      } satisfies AuthenticatedPredictionMatchTarget;
    });

  const blockers = [
    !input.predictionRequirementPayload ? "Prediction requirements non disponibili." : undefined,
    !input.bracketSlotsAvailable
      ? "Bracket slots non leggibili dal client autenticato."
      : undefined,
    !input.antepostDefinitionsAvailable
      ? "Definizioni antepost non leggibili dal client autenticato."
      : undefined,
    targets.some((target) => target.matchFormat === "knockout_two_leg")
      ? "Knockout two-leg non supportato dal domain workflow corrente."
      : undefined,
    targets.some((target) => target.participantsDerived)
      ? "Alcuni partecipanti derivati richiedono bracket slots reali."
      : undefined
  ].filter((item): item is string => Boolean(item));
  const completedTargets = targets.filter((target) => Boolean(target.currentValue)).length;

  return {
    targets,
    blockers,
    writeReady:
      blockers.length === 0 &&
      (input.leagueStatus === "draft" || input.leagueStatus === "open") &&
      targets.every((target) => !target.blockedReason),
    progress: {
      totalTargets: targets.length,
      completedTargets,
      missingTargets: Math.max(targets.length - completedTargets, 0)
    }
  };
}

interface ParsedTemplateStage {
  kind?: string | undefined;
  tieMode?: string | undefined;
}

function parseTemplateStages(payload: unknown): Map<string, ParsedTemplateStage> {
  if (!isRecord(payload) || !Array.isArray(payload.stages)) return new Map();

  return new Map(
    payload.stages.flatMap((stage) => {
      if (!isRecord(stage) || typeof stage.code !== "string") return [];
      return [
        [
          stage.code,
          {
            ...(typeof stage.kind === "string" ? { kind: stage.kind } : {}),
            ...(typeof stage.tieMode === "string" ? { tieMode: stage.tieMode } : {})
          }
        ] as const
      ];
    })
  );
}

function resolveMatchFormat(
  catalogKind: string | undefined,
  templateKind: string | undefined,
  tieMode: string | undefined
): AuthenticatedTargetMatchFormat {
  if (templateKind === "group_stage" || templateKind === "league_phase") {
    return "initial_90_minutes";
  }

  if (templateKind === "knockout_two_leg" || tieMode === "two_leg") {
    return "knockout_two_leg";
  }

  if (
    templateKind === "knockout_single_leg" ||
    templateKind === "final_single_leg" ||
    templateKind === "third_place_final" ||
    tieMode === "single_leg"
  ) {
    return "knockout_single_leg";
  }

  if (catalogKind?.toLowerCase() === "group" || catalogKind?.toLowerCase() === "league_phase") {
    return "initial_90_minutes";
  }

  return "unsupported";
}

function resolveTargetBlocker(input: {
  stage: AuthenticatedTargetStageInput | undefined;
  matchFormat: AuthenticatedTargetMatchFormat;
  participantsDerived: boolean;
  homeTeam: AuthenticatedTargetTeamInput | undefined;
  awayTeam: AuthenticatedTargetTeamInput | undefined;
}): string | undefined {
  if (!input.stage) return "Stage reale non disponibile.";
  if (input.matchFormat === "unsupported") return "Formato match non riconosciuto dal template.";
  if (input.matchFormat === "knockout_two_leg") return "Knockout two-leg non ancora supportato.";
  if (input.participantsDerived) return "Completa la fase precedente per derivare i partecipanti.";
  if (!input.homeTeam || !input.awayTeam) return "Catalogo squadre incompleto.";
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
