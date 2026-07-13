import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assessAuthenticatedReadModelReadiness,
  type AuthenticatedReadModelReadiness
} from "@/domain/predictions/authenticatedReadModel";
import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database, Json } from "@/services/supabase/database.types";
import {
  parseAuthenticatedPredictionReadModel,
  type AuthenticatedPredictionReadModel
} from "./authenticatedPredictionReadModel";
import {
  parseAuthenticatedPredictionTargetCatalog,
  type SupabasePredictionTargetCatalog
} from "./authenticatedPredictionTargetCatalog";

export type {
  SupabasePredictionCatalogAntepostDefinition,
  SupabasePredictionCatalogBestThirdAssignment,
  SupabasePredictionCatalogBestThirdCombination,
  SupabasePredictionCatalogBracketNode,
  SupabasePredictionCatalogBracketSlot,
  SupabasePredictionCatalogTiebreakRule,
  SupabasePredictionTargetCatalog
} from "./authenticatedPredictionTargetCatalog";

export type SupabasePredictionWorkflowReadClient = Pick<SupabaseClient<Database>, "rpc">;
type LeagueStatus = Database["public"]["Enums"]["league_status"];
type PredictionSetStatus = Database["public"]["Enums"]["prediction_set_status"];
type PredictionSyncStatus = Database["public"]["Enums"]["prediction_sync_status"];
type AdvancementMethod = Database["public"]["Enums"]["advancement_method"];

export interface SupabasePredictionWorkflowLeague {
  id: string;
  name: string;
  status: LeagueStatus;
  deadlineAtUtc: string;
  competitionEditionId: string;
  formatTemplateVersionId?: string | undefined;
  rulesetVersionId?: string | undefined;
  predictionRequirementVersionId?: string | undefined;
  scoringPresetVersionId?: string | undefined;
  lockedCompetitionSnapshot?: Json | undefined;
}

export interface SupabasePredictionWorkflowEdition {
  id: string;
  name: string;
  seasonLabel: string;
  editionCode?: string | undefined;
  dataCompleteness: string;
}

export interface SupabasePredictionWorkflowVersion {
  id: string;
  version: string;
  status: string;
  payload: Json;
}

export interface SupabasePredictionWorkflowPredictionSet {
  id: string;
  status: PredictionSetStatus;
  totalRequired: number;
  completedItems: number;
  unsyncedItems: number;
  lastServerSyncedAtUtc?: string | undefined;
}

export interface SupabasePersistedMatchPrediction {
  id: string;
  predictionRef: string;
  matchId?: string | undefined;
  stageCode: string;
  homeGoals90: number;
  awayGoals90: number;
  qualifiedTeamId?: string | undefined;
  qualificationMethod?: AdvancementMethod | undefined;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
}

export interface SupabasePersistedTiebreakOverride {
  id: string;
  scope: string;
  scopeRef: string;
  tieGroupId: string;
  tiedTeamIds: string[];
  affectedPositions: number[];
  orderedTeamIds: string[];
  reason: string;
  syncStatus: PredictionSyncStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface SupabasePersistedAntepostPrediction {
  id: string;
  definitionId: string;
  selectedPayload: Json;
  syncStatus: PredictionSyncStatus;
  updatedAtUtc: string;
}

export interface SupabasePredictionCatalogMatch {
  id: string;
  stageId: string;
  groupId?: string | undefined;
  roundId?: string | undefined;
  homeTeamId?: string | undefined;
  awayTeamId?: string | undefined;
  kickoffAtUtc?: string | undefined;
  status: Database["public"]["Enums"]["match_status"];
  matchNumber?: number | undefined;
  matchday?: number | undefined;
  matchFormat?: string | undefined;
  leg?: number | undefined;
  order: number;
}

export interface SupabasePredictionCatalogStage {
  id: string;
  code: string;
  kind: string;
  name: string;
  order: number;
}

export interface SupabasePredictionCatalogGroup {
  id: string;
  stageId: string;
  code: string;
  name: string;
  order: number;
}

export interface SupabasePredictionCatalogRound {
  id: string;
  stageId: string;
  code: string;
  name: string;
  order: number;
}

export interface SupabasePredictionCatalogTeam {
  id: string;
  name: string;
  shortName: string;
  countryCode?: string | undefined;
  fifaCode?: string | undefined;
}

export interface SupabasePredictionWorkflowContext {
  league: SupabasePredictionWorkflowLeague;
  edition?: SupabasePredictionWorkflowEdition | undefined;
  formatTemplateVersion?: SupabasePredictionWorkflowVersion | undefined;
  rulesetVersion?: SupabasePredictionWorkflowVersion | undefined;
  predictionRequirementVersion?: SupabasePredictionWorkflowVersion | undefined;
  scoringPresetVersion?: SupabasePredictionWorkflowVersion | undefined;
  predictionSet?: SupabasePredictionWorkflowPredictionSet | undefined;
  matchPredictions: SupabasePersistedMatchPrediction[];
  tiebreakOverrides: SupabasePersistedTiebreakOverride[];
  antepostPredictions: SupabasePersistedAntepostPrediction[];
  catalogMatches: SupabasePredictionCatalogMatch[];
  catalogStages: SupabasePredictionCatalogStage[];
  catalogGroups: SupabasePredictionCatalogGroup[];
  catalogRounds: SupabasePredictionCatalogRound[];
  catalogTeams: SupabasePredictionCatalogTeam[];
  targetCatalog: SupabasePredictionTargetCatalog;
  authenticatedReadModel: AuthenticatedPredictionReadModel;
  resolverReadiness: AuthenticatedReadModelReadiness;
}

export class SupabasePredictionWorkflowAccessError extends Error {
  constructor(message = "Lega non accessibile con la sessione corrente.") {
    super(message);
    this.name = "SupabasePredictionWorkflowAccessError";
  }
}

export class SupabasePredictionWorkflowSnapshotMismatchError extends Error {
  readonly code = "prediction_workflow_snapshot_mismatch";

  constructor(readonly mismatchedScopes: readonly string[]) {
    super("I dati del workflow sono cambiati durante il caricamento. Riprova.");
    this.name = "SupabasePredictionWorkflowSnapshotMismatchError";
  }
}

export class SupabasePredictionWorkflowReadRepository {
  constructor(private readonly client?: SupabasePredictionWorkflowReadClient) {}

  async loadAuthenticatedWorkflow(leagueId: string): Promise<SupabasePredictionWorkflowContext> {
    const [readModel, targetCatalog] = await Promise.all([
      this.loadAuthenticatedReadModel(leagueId),
      this.loadTargetCatalog(leagueId)
    ]);

    assertMatchingSnapshotScope(readModel, targetCatalog);
    return mapAuthenticatedWorkflowContext(readModel, targetCatalog);
  }

  private async loadAuthenticatedReadModel(
    leagueId: string
  ): Promise<AuthenticatedPredictionReadModel> {
    const { data, error } = await resolveReadClient(this.client).rpc(
      "get_authenticated_prediction_read_model",
      { p_league_id: leagueId }
    );

    if (error) {
      if (isAccessError(error)) {
        throw new SupabasePredictionWorkflowAccessError(error.message);
      }
      throw error;
    }

    return parseAuthenticatedPredictionReadModel(data);
  }

  private async loadTargetCatalog(leagueId: string): Promise<SupabasePredictionTargetCatalog> {
    const { data, error } = await resolveReadClient(this.client).rpc(
      "get_prediction_target_catalog",
      { p_league_id: leagueId }
    );

    throwIfError(error);
    return parseAuthenticatedPredictionTargetCatalog(data);
  }
}

function assertMatchingSnapshotScope(
  readModel: AuthenticatedPredictionReadModel,
  targetCatalog: SupabasePredictionTargetCatalog
): void {
  const comparisons = [
    ["league", readModel.league.id, targetCatalog.leagueId],
    ["edition", readModel.league.competition_edition_id, targetCatalog.editionId],
    [
      "format_template_version",
      readModel.league.format_template_version_id,
      targetCatalog.formatTemplateVersionId
    ],
    ["ruleset_version", readModel.league.ruleset_version_id, targetCatalog.rulesetVersionId],
    [
      "prediction_requirement_version",
      readModel.league.prediction_requirement_version_id,
      targetCatalog.predictionRequirementVersionId
    ],
    [
      "scoring_preset_version",
      readModel.league.scoring_preset_version_id,
      targetCatalog.scoringPresetVersionId
    ]
  ] as const;
  const mismatchedScopes = comparisons
    .filter(([, readModelValue, targetCatalogValue]) => readModelValue !== targetCatalogValue)
    .map(([scope]) => scope);

  if (mismatchedScopes.length > 0) {
    throw new SupabasePredictionWorkflowSnapshotMismatchError(mismatchedScopes);
  }
}

function mapAuthenticatedWorkflowContext(
  readModel: AuthenticatedPredictionReadModel,
  targetCatalog: SupabasePredictionTargetCatalog
): SupabasePredictionWorkflowContext {
  const groupFormat =
    readModel.versions.format_template.format.initialStageKind === "group_stage"
      ? readModel.versions.format_template.format
      : undefined;
  const initialStageCodes = new Set(
    readModel.versions.format_template.stages
      .filter((stage) => stage.kind === readModel.versions.format_template.format.initialStageKind)
      .map((stage) => stage.code)
  );
  const initialStageIds = readModel.catalog.stages
    .filter((stage) => initialStageCodes.has(stage.code))
    .map((stage) => stage.id);
  const resolverReadiness = groupFormat
    ? assessAuthenticatedReadModelReadiness({
        format: groupFormat,
        initialStageIds,
        groups: readModel.catalog.groups.map((group) => ({
          id: group.id,
          stageId: group.stage_id,
          code: group.code
        })),
        editionTeams: readModel.catalog.edition_teams.map((team) => ({
          teamId: team.team_id,
          ...(team.fifa_code ? { fifaCode: team.fifa_code } : {}),
          ...(team.seed_group_id ? { seedGroupId: team.seed_group_id } : {})
        })),
        matches: readModel.catalog.matches.map((match) => ({
          id: match.id,
          stageId: match.stage_id,
          ...(match.group_id ? { groupId: match.group_id } : {}),
          ...(match.home_team_id ? { homeTeamId: match.home_team_id } : {}),
          ...(match.away_team_id ? { awayTeamId: match.away_team_id } : {}),
          ...(match.match_number ? { matchNumber: match.match_number } : {}),
          ...(match.matchday ? { matchday: match.matchday } : {}),
          ...(match.match_format ? { matchFormat: match.match_format } : {}),
          ...(match.leg ? { leg: match.leg } : {}),
          order: match.sort_order
        })),
        rankingRuleSetCount: readModel.versions.format_template.ranking_rule_sets.length,
        rulesetRankingCodeCount: readModel.versions.ruleset.ranking_rule_set_codes.length,
        predictionRequirementCount: readModel.versions.prediction_requirements.requirements.length,
        bracketNodeCount: targetCatalog.bracketNodes.length,
        bracketSlotCount: targetCatalog.bracketSlots.length,
        bestThirdCombinationCount: targetCatalog.bestThirdCombinations.length
      })
    : {
        kind: "incomplete" as const,
        blockers: ["C2B2 valida il catalogo iniziale group-stage; league phase non valutata."],
        counts: {
          teams: readModel.catalog.edition_teams.length,
          groups: readModel.catalog.groups.length,
          initialMatches: 0,
          completeInitialParticipants: 0
        }
      };
  const predictionSet = readModel.personal.prediction_set;

  return {
    league: {
      id: readModel.league.id,
      name: readModel.league.name,
      status: readModel.league.status,
      deadlineAtUtc: readModel.league.deadline_at,
      competitionEditionId: readModel.league.competition_edition_id,
      formatTemplateVersionId: readModel.league.format_template_version_id,
      rulesetVersionId: readModel.league.ruleset_version_id,
      predictionRequirementVersionId: readModel.league.prediction_requirement_version_id,
      scoringPresetVersionId: readModel.league.scoring_preset_version_id,
      ...(readModel.league.locked_competition_snapshot !== null
        ? { lockedCompetitionSnapshot: readModel.league.locked_competition_snapshot as Json }
        : {})
    },
    edition: {
      id: readModel.edition.id,
      name: readModel.edition.name,
      seasonLabel: readModel.edition.season_label,
      ...(readModel.edition.edition_code ? { editionCode: readModel.edition.edition_code } : {}),
      dataCompleteness: readModel.edition.data_completeness
    },
    formatTemplateVersion: mapVersion(
      readModel.versions.format_template.id,
      readModel.versions.format_template.version,
      readModel.versions.format_template.status,
      {
        format: readModel.versions.format_template.format,
        stages: readModel.versions.format_template.stages,
        rankingRuleSets: readModel.versions.format_template.ranking_rule_sets,
        bracketMappingStrategy: readModel.versions.format_template.bracket_mapping_strategy
      } as Json
    ),
    rulesetVersion: mapVersion(
      readModel.versions.ruleset.id,
      readModel.versions.ruleset.version,
      readModel.versions.ruleset.status,
      {
        rules: readModel.versions.ruleset.rules_payload,
        rankingRuleSetCodes: readModel.versions.ruleset.ranking_rule_set_codes
      } as Json
    ),
    predictionRequirementVersion: mapVersion(
      readModel.versions.prediction_requirements.id,
      readModel.versions.prediction_requirements.version,
      readModel.versions.prediction_requirements.status,
      readModel.versions.prediction_requirements.requirements as Json
    ),
    scoringPresetVersion: mapVersion(
      readModel.versions.scoring_preset.id,
      readModel.versions.scoring_preset.version,
      readModel.versions.scoring_preset.status,
      readModel.versions.scoring_preset.config as Json
    ),
    ...(predictionSet
      ? {
          predictionSet: {
            id: predictionSet.id,
            status: predictionSet.status,
            totalRequired: predictionSet.total_required,
            completedItems: predictionSet.completed_items,
            unsyncedItems: predictionSet.unsynced_items,
            ...(predictionSet.last_server_synced_at
              ? { lastServerSyncedAtUtc: predictionSet.last_server_synced_at }
              : {})
          }
        }
      : {}),
    matchPredictions: readModel.personal.match_predictions.map((prediction) => ({
      id: prediction.id,
      predictionRef: prediction.prediction_ref,
      ...(prediction.match_id ? { matchId: prediction.match_id } : {}),
      stageCode: prediction.stage_code,
      homeGoals90: prediction.regulation_home_goals,
      awayGoals90: prediction.regulation_away_goals,
      ...(prediction.qualified_team_id ? { qualifiedTeamId: prediction.qualified_team_id } : {}),
      ...(prediction.advancement_method
        ? { qualificationMethod: prediction.advancement_method }
        : {}),
      syncStatus: prediction.sync_status,
      updatedAtUtc: prediction.updated_at
    })),
    tiebreakOverrides: readModel.personal.tiebreak_overrides.map((override) => ({
      id: override.id,
      scope: override.scope,
      scopeRef: override.scope_ref,
      tieGroupId: override.tie_group_id,
      tiedTeamIds: override.tied_team_ids,
      affectedPositions: override.affected_positions,
      orderedTeamIds: override.ordered_team_ids,
      reason: override.reason,
      syncStatus: override.sync_status,
      createdAtUtc: override.created_at,
      updatedAtUtc: override.updated_at
    })),
    antepostPredictions: readModel.personal.antepost_predictions.map((prediction) => ({
      id: prediction.id,
      definitionId: prediction.definition_id,
      selectedPayload: prediction.selected_payload as Json,
      syncStatus: prediction.sync_status,
      updatedAtUtc: prediction.updated_at
    })),
    catalogMatches: readModel.catalog.matches.map((match) => ({
      id: match.id,
      stageId: match.stage_id,
      ...(match.group_id ? { groupId: match.group_id } : {}),
      ...(match.round_id ? { roundId: match.round_id } : {}),
      ...(match.home_team_id ? { homeTeamId: match.home_team_id } : {}),
      ...(match.away_team_id ? { awayTeamId: match.away_team_id } : {}),
      ...(match.kickoff_at ? { kickoffAtUtc: match.kickoff_at } : {}),
      status: match.status,
      ...(match.match_number ? { matchNumber: match.match_number } : {}),
      ...(match.matchday ? { matchday: match.matchday } : {}),
      ...(match.match_format ? { matchFormat: match.match_format } : {}),
      ...(match.leg ? { leg: match.leg } : {}),
      order: match.sort_order
    })),
    catalogStages: readModel.catalog.stages.map((stage) => ({
      id: stage.id,
      code: stage.code,
      kind: stage.kind,
      name: stage.name,
      order: stage.sort_order
    })),
    catalogGroups: readModel.catalog.groups.map((group) => ({
      id: group.id,
      stageId: group.stage_id,
      code: group.code,
      name: group.name,
      order: group.sort_order
    })),
    catalogRounds: readModel.catalog.rounds.map((round) => ({
      id: round.id,
      stageId: round.stage_id,
      code: round.code,
      name: round.name,
      order: round.sort_order
    })),
    catalogTeams: readModel.catalog.edition_teams.map((team) => ({
      id: team.team_id,
      name: team.name,
      shortName: team.short_name,
      ...(team.country_code ? { countryCode: team.country_code } : {}),
      ...(team.fifa_code ? { fifaCode: team.fifa_code } : {})
    })),
    targetCatalog,
    authenticatedReadModel: readModel,
    resolverReadiness
  };
}

function resolveReadClient(
  client: SupabasePredictionWorkflowReadClient | undefined
): SupabasePredictionWorkflowReadClient {
  return client ?? requireSupabaseClient();
}

function throwIfError(error: unknown): void {
  if (error) throw error;
}

function isAccessError(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("authentication required") || message.includes("membership required");
}

function mapVersion(
  id: string,
  version: string,
  status: string,
  payload: Json
): SupabasePredictionWorkflowVersion {
  return { id, version, status, payload };
}
