import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database, Json } from "@/services/supabase/database.types";

export type SupabasePredictionWorkflowReadClient = Pick<SupabaseClient<Database>, "from">;
type LeagueStatus = Database["public"]["Enums"]["league_status"];
type PredictionSetStatus = Database["public"]["Enums"]["prediction_set_status"];
type PredictionSyncStatus = Database["public"]["Enums"]["prediction_sync_status"];
type AdvancementMethod = Database["public"]["Enums"]["advancement_method"];
type LeagueRow = Database["public"]["Tables"]["leagues"]["Row"];
type PredictionSetRow = Database["public"]["Tables"]["prediction_sets"]["Row"];
type WorkflowLeagueRow = Pick<
  LeagueRow,
  | "id"
  | "name"
  | "status"
  | "deadline_at"
  | "competition_edition_id"
  | "format_template_version_id"
  | "ruleset_version_id"
  | "prediction_requirement_version_id"
  | "scoring_preset_version_id"
  | "locked_competition_snapshot"
>;
type WorkflowPredictionSetRow = Pick<
  PredictionSetRow,
  | "id"
  | "league_id"
  | "user_id"
  | "status"
  | "total_required"
  | "completed_items"
  | "unsynced_items"
  | "last_server_synced_at"
>;

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
  orderedTeamIds: string[];
  syncStatus: PredictionSyncStatus;
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
  order: number;
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
}

export class SupabasePredictionWorkflowAccessError extends Error {
  constructor(message = "Lega non accessibile con la sessione corrente.") {
    super(message);
    this.name = "SupabasePredictionWorkflowAccessError";
  }
}

export class SupabasePredictionWorkflowReadRepository {
  constructor(private readonly client?: SupabasePredictionWorkflowReadClient) {}

  async loadAuthenticatedWorkflow(
    leagueId: string,
    authenticatedUserId: string
  ): Promise<SupabasePredictionWorkflowContext> {
    const client = resolveReadClient(this.client);
    const { data: leagueRows, error: leagueError } = await client
      .from("leagues")
      .select(
        "id,name,status,deadline_at,competition_edition_id,format_template_version_id,ruleset_version_id,prediction_requirement_version_id,scoring_preset_version_id,locked_competition_snapshot"
      )
      .eq("id", leagueId)
      .range(0, 0);

    throwIfError(leagueError);
    const leagueRow = leagueRows?.[0];

    if (!leagueRow) {
      throw new SupabasePredictionWorkflowAccessError();
    }

    const { data: membershipRows, error: membershipError } = await client
      .from("league_members")
      .select("league_id,user_id,status")
      .eq("league_id", leagueId)
      .eq("user_id", authenticatedUserId)
      .eq("status", "active")
      .range(0, 0);

    throwIfError(membershipError);

    if (!membershipRows?.[0]) {
      throw new SupabasePredictionWorkflowAccessError("Membership attiva non disponibile.");
    }

    const league = mapLeague(leagueRow);
    const { data: predictionSetRows, error: predictionSetError } = await client
      .from("prediction_sets")
      .select(
        "id,league_id,user_id,status,total_required,completed_items,unsynced_items,last_server_synced_at"
      )
      .eq("league_id", leagueId)
      .eq("user_id", authenticatedUserId)
      .range(0, 0);

    throwIfError(predictionSetError);
    const predictionSetRow = predictionSetRows?.[0];
    const predictionSet = predictionSetRow ? mapPredictionSet(predictionSetRow) : undefined;

    const [
      edition,
      formatTemplateVersion,
      rulesetVersion,
      predictionRequirementVersion,
      scoringPresetVersion,
      catalogMatches,
      personalPredictions
    ] = await Promise.all([
      this.loadEdition(league.competitionEditionId),
      this.loadFormatTemplateVersion(league.formatTemplateVersionId),
      this.loadRulesetVersion(league.rulesetVersionId),
      this.loadPredictionRequirementVersion(league.predictionRequirementVersionId),
      this.loadScoringPresetVersion(league.scoringPresetVersionId),
      this.loadCatalogMatches(league.competitionEditionId),
      predictionSet
        ? this.loadPersonalPredictions(predictionSet.id)
        : Promise.resolve({ matchPredictions: [], tiebreakOverrides: [], antepostPredictions: [] })
    ]);

    return {
      league,
      ...(edition ? { edition } : {}),
      ...(formatTemplateVersion ? { formatTemplateVersion } : {}),
      ...(rulesetVersion ? { rulesetVersion } : {}),
      ...(predictionRequirementVersion ? { predictionRequirementVersion } : {}),
      ...(scoringPresetVersion ? { scoringPresetVersion } : {}),
      ...(predictionSet ? { predictionSet } : {}),
      catalogMatches,
      ...personalPredictions
    };
  }

  private async loadEdition(
    editionId: string
  ): Promise<SupabasePredictionWorkflowEdition | undefined> {
    const { data, error } = await resolveReadClient(this.client)
      .from("competition_editions")
      .select("id,name,season_label,edition_code,data_completeness")
      .eq("id", editionId)
      .range(0, 0);

    throwIfError(error);
    const row = data?.[0];
    return row
      ? {
          id: row.id,
          name: row.name,
          seasonLabel: row.season_label,
          ...(row.edition_code ? { editionCode: row.edition_code } : {}),
          dataCompleteness: row.data_completeness
        }
      : undefined;
  }

  private async loadFormatTemplateVersion(
    versionId: string | undefined
  ): Promise<SupabasePredictionWorkflowVersion | undefined> {
    if (!versionId) return undefined;
    const { data, error } = await resolveReadClient(this.client)
      .from("format_template_versions")
      .select("id,version,status,format,stages,ranking_rule_sets,bracket_mapping_strategy")
      .eq("id", versionId)
      .range(0, 0);

    throwIfError(error);
    const row = data?.[0];
    return row
      ? mapVersion(row.id, row.version, row.status, {
          format: row.format,
          stages: row.stages,
          rankingRuleSets: row.ranking_rule_sets,
          bracketMappingStrategy: row.bracket_mapping_strategy
        })
      : undefined;
  }

  private async loadRulesetVersion(
    versionId: string | undefined
  ): Promise<SupabasePredictionWorkflowVersion | undefined> {
    if (!versionId) return undefined;
    const { data, error } = await resolveReadClient(this.client)
      .from("ruleset_versions")
      .select("id,version,status,rules_payload,ranking_rule_set_codes")
      .eq("id", versionId)
      .range(0, 0);

    throwIfError(error);
    const row = data?.[0];
    return row
      ? mapVersion(row.id, row.version, row.status, {
          rules: row.rules_payload,
          rankingRuleSetCodes: row.ranking_rule_set_codes
        })
      : undefined;
  }

  private async loadPredictionRequirementVersion(
    versionId: string | undefined
  ): Promise<SupabasePredictionWorkflowVersion | undefined> {
    if (!versionId) return undefined;
    const { data, error } = await resolveReadClient(this.client)
      .from("prediction_requirement_versions")
      .select("id,version,status,requirements")
      .eq("id", versionId)
      .range(0, 0);

    throwIfError(error);
    const row = data?.[0];
    return row ? mapVersion(row.id, row.version, row.status, row.requirements) : undefined;
  }

  private async loadScoringPresetVersion(
    versionId: string | undefined
  ): Promise<SupabasePredictionWorkflowVersion | undefined> {
    if (!versionId) return undefined;
    const { data, error } = await resolveReadClient(this.client)
      .from("scoring_preset_versions")
      .select("id,version,status,config")
      .eq("id", versionId)
      .range(0, 0);

    throwIfError(error);
    const row = data?.[0];
    return row ? mapVersion(row.id, row.version, row.status, row.config) : undefined;
  }

  private async loadCatalogMatches(editionId: string): Promise<SupabasePredictionCatalogMatch[]> {
    const { data, error } = await resolveReadClient(this.client)
      .from("matches")
      .select(
        "id,edition_id,stage_id,group_id,round_id,home_team_id,away_team_id,kickoff_at,status,sort_order"
      )
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true });

    throwIfError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      stageId: row.stage_id,
      ...(row.group_id ? { groupId: row.group_id } : {}),
      ...(row.round_id ? { roundId: row.round_id } : {}),
      ...(row.home_team_id ? { homeTeamId: row.home_team_id } : {}),
      ...(row.away_team_id ? { awayTeamId: row.away_team_id } : {}),
      ...(row.kickoff_at ? { kickoffAtUtc: row.kickoff_at } : {}),
      status: row.status,
      order: row.sort_order
    }));
  }

  private async loadPersonalPredictions(predictionSetId: string): Promise<{
    matchPredictions: SupabasePersistedMatchPrediction[];
    tiebreakOverrides: SupabasePersistedTiebreakOverride[];
    antepostPredictions: SupabasePersistedAntepostPrediction[];
  }> {
    const client = resolveReadClient(this.client);
    const [matchResult, tiebreakResult, antepostResult] = await Promise.all([
      client
        .from("match_predictions")
        .select(
          "id,prediction_set_id,match_id,prediction_ref,stage_code,regulation_home_goals,regulation_away_goals,qualified_team_id,advancement_method,sync_status,updated_at"
        )
        .eq("prediction_set_id", predictionSetId)
        .order("updated_at", { ascending: true }),
      client
        .from("prediction_tiebreak_overrides")
        .select("id,prediction_set_id,scope,scope_ref,ordered_team_ids,sync_status")
        .eq("prediction_set_id", predictionSetId)
        .order("scope_ref", { ascending: true }),
      client
        .from("antepost_predictions")
        .select("id,prediction_set_id,definition_id,selected_payload,sync_status,updated_at")
        .eq("prediction_set_id", predictionSetId)
        .order("updated_at", { ascending: true })
    ]);

    throwIfError(matchResult.error);
    throwIfError(tiebreakResult.error);
    throwIfError(antepostResult.error);

    return {
      matchPredictions: (matchResult.data ?? []).map((row) => ({
        id: row.id,
        predictionRef: row.prediction_ref,
        ...(row.match_id ? { matchId: row.match_id } : {}),
        stageCode: row.stage_code,
        homeGoals90: row.regulation_home_goals,
        awayGoals90: row.regulation_away_goals,
        ...(row.qualified_team_id ? { qualifiedTeamId: row.qualified_team_id } : {}),
        ...(row.advancement_method ? { qualificationMethod: row.advancement_method } : {}),
        syncStatus: row.sync_status,
        updatedAtUtc: row.updated_at
      })),
      tiebreakOverrides: (tiebreakResult.data ?? []).map((row) => ({
        id: row.id,
        scope: row.scope,
        scopeRef: row.scope_ref,
        orderedTeamIds: row.ordered_team_ids,
        syncStatus: row.sync_status
      })),
      antepostPredictions: (antepostResult.data ?? []).map((row) => ({
        id: row.id,
        definitionId: row.definition_id,
        selectedPayload: row.selected_payload,
        syncStatus: row.sync_status,
        updatedAtUtc: row.updated_at
      }))
    };
  }
}

function resolveReadClient(
  client: SupabasePredictionWorkflowReadClient | undefined
): SupabasePredictionWorkflowReadClient {
  return client ?? requireSupabaseClient();
}

function throwIfError(error: unknown): void {
  if (error) throw error;
}

function mapLeague(row: WorkflowLeagueRow): SupabasePredictionWorkflowLeague {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    deadlineAtUtc: row.deadline_at,
    competitionEditionId: row.competition_edition_id,
    ...(row.format_template_version_id
      ? { formatTemplateVersionId: row.format_template_version_id }
      : {}),
    ...(row.ruleset_version_id ? { rulesetVersionId: row.ruleset_version_id } : {}),
    ...(row.prediction_requirement_version_id
      ? { predictionRequirementVersionId: row.prediction_requirement_version_id }
      : {}),
    ...(row.scoring_preset_version_id
      ? { scoringPresetVersionId: row.scoring_preset_version_id }
      : {}),
    ...(row.locked_competition_snapshot
      ? { lockedCompetitionSnapshot: row.locked_competition_snapshot }
      : {})
  };
}

function mapPredictionSet(row: WorkflowPredictionSetRow): SupabasePredictionWorkflowPredictionSet {
  return {
    id: row.id,
    status: row.status,
    totalRequired: row.total_required,
    completedItems: row.completed_items,
    unsyncedItems: row.unsynced_items,
    ...(row.last_server_synced_at ? { lastServerSyncedAtUtc: row.last_server_synced_at } : {})
  };
}

function mapVersion(
  id: string,
  version: string,
  status: string,
  payload: Json
): SupabasePredictionWorkflowVersion {
  return { id, version, status, payload };
}
