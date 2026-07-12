import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database, Json } from "@/services/supabase/database.types";

export type SupabasePredictionWorkflowReadClient = Pick<SupabaseClient<Database>, "from" | "rpc">;
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
}

export interface SupabasePredictionCatalogBracketSlot {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  roundId: string;
  targetNodeId: string;
  targetMatchId: string;
  targetSide: "home" | "away";
  targetLeg: number;
  slotKey: string;
  sourceType: string;
  sourcePayload: Json;
}

export interface SupabasePredictionCatalogBracketNode {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  nodeKey: string;
  roundId: string;
  targetMatchId: string;
  order: number;
}

export interface SupabasePredictionCatalogBestThirdAssignment {
  formatTemplateVersionId: string;
  targetNodeId: string;
  targetSide: "home" | "away";
  winnerGroupCode: string;
  thirdPlaceGroupCode: string;
}

export interface SupabasePredictionCatalogBestThirdCombination {
  id: string;
  editionId: string;
  formatTemplateVersionId: string;
  optionNumber: number;
  combinationKey: string;
  qualifiedGroupCodes: string[];
  assignments: SupabasePredictionCatalogBestThirdAssignment[];
}

export interface SupabasePredictionCatalogAntepostDefinition {
  id: string;
  editionId: string;
  code: string;
  label: string;
  valueType: string;
  required: boolean;
}

export interface SupabasePredictionCatalogTiebreakRule {
  id: string;
  editionId: string;
  scope: string;
  order: number;
  ruleCode: string;
  rulePayload: Json;
}

export interface SupabasePredictionTargetCatalog {
  leagueId: string;
  editionId: string;
  formatTemplateVersionId: string;
  rulesetVersionId: string;
  predictionRequirementVersionId: string;
  bracketNodes: SupabasePredictionCatalogBracketNode[];
  bracketSlots: SupabasePredictionCatalogBracketSlot[];
  bestThirdCombinations: SupabasePredictionCatalogBestThirdCombination[];
  antepostDefinitions: SupabasePredictionCatalogAntepostDefinition[];
  tiebreakRules: SupabasePredictionCatalogTiebreakRule[];
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
      catalogStages,
      catalogGroups,
      catalogRounds,
      targetCatalog,
      personalPredictions
    ] = await Promise.all([
      this.loadEdition(league.competitionEditionId),
      this.loadFormatTemplateVersion(league.formatTemplateVersionId),
      this.loadRulesetVersion(league.rulesetVersionId),
      this.loadPredictionRequirementVersion(league.predictionRequirementVersionId),
      this.loadScoringPresetVersion(league.scoringPresetVersionId),
      this.loadCatalogMatches(league.competitionEditionId),
      this.loadCatalogStages(league.competitionEditionId),
      this.loadCatalogGroups(league.competitionEditionId),
      this.loadCatalogRounds(league.competitionEditionId),
      this.loadTargetCatalog(league.id),
      predictionSet
        ? this.loadPersonalPredictions(predictionSet.id)
        : Promise.resolve({ matchPredictions: [], tiebreakOverrides: [], antepostPredictions: [] })
    ]);

    const catalogTeams = await this.loadCatalogTeams(catalogMatches);

    return {
      league,
      ...(edition ? { edition } : {}),
      ...(formatTemplateVersion ? { formatTemplateVersion } : {}),
      ...(rulesetVersion ? { rulesetVersion } : {}),
      ...(predictionRequirementVersion ? { predictionRequirementVersion } : {}),
      ...(scoringPresetVersion ? { scoringPresetVersion } : {}),
      ...(predictionSet ? { predictionSet } : {}),
      catalogMatches,
      catalogStages,
      catalogGroups,
      catalogRounds,
      catalogTeams,
      targetCatalog,
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

  private async loadCatalogStages(editionId: string): Promise<SupabasePredictionCatalogStage[]> {
    const { data, error } = await resolveReadClient(this.client)
      .from("stages")
      .select("id,edition_id,code,kind,name,sort_order")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true });

    throwIfError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      name: row.name,
      order: row.sort_order
    }));
  }

  private async loadCatalogGroups(editionId: string): Promise<SupabasePredictionCatalogGroup[]> {
    const { data, error } = await resolveReadClient(this.client)
      .from("groups")
      .select("id,edition_id,stage_id,code,name,sort_order")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true });

    throwIfError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      stageId: row.stage_id,
      code: row.code,
      name: row.name,
      order: row.sort_order
    }));
  }

  private async loadCatalogRounds(editionId: string): Promise<SupabasePredictionCatalogRound[]> {
    const { data, error } = await resolveReadClient(this.client)
      .from("rounds")
      .select("id,edition_id,stage_id,code,name,sort_order")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true });

    throwIfError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      stageId: row.stage_id,
      code: row.code,
      name: row.name,
      order: row.sort_order
    }));
  }

  private async loadCatalogTeams(
    matches: SupabasePredictionCatalogMatch[]
  ): Promise<SupabasePredictionCatalogTeam[]> {
    const teamIds = [
      ...new Set(matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]).filter(Boolean))
    ] as string[];

    if (teamIds.length === 0) return [];

    const { data, error } = await resolveReadClient(this.client)
      .from("teams")
      .select("id,name,short_name,country_code")
      .in("id", teamIds)
      .order("name", { ascending: true });

    throwIfError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.short_name,
      ...(row.country_code ? { countryCode: row.country_code } : {})
    }));
  }

  private async loadTargetCatalog(leagueId: string): Promise<SupabasePredictionTargetCatalog> {
    const { data, error } = await resolveReadClient(this.client).rpc(
      "get_prediction_target_catalog",
      { p_league_id: leagueId }
    );

    throwIfError(error);
    return mapTargetCatalog(data);
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

function mapTargetCatalog(value: Json): SupabasePredictionTargetCatalog {
  const catalog = requireRecord(value, "Catalogo target non disponibile.");
  const leagueId = requireString(catalog.league_id, "Catalogo target senza league scope.");
  const editionId = requireString(catalog.edition_id, "Catalogo target senza edition scope.");

  return {
    leagueId,
    editionId,
    formatTemplateVersionId: requireString(
      catalog.format_template_version_id,
      "Catalogo target senza format version."
    ),
    rulesetVersionId: requireString(
      catalog.ruleset_version_id,
      "Catalogo target senza ruleset version."
    ),
    predictionRequirementVersionId: requireString(
      catalog.prediction_requirement_version_id,
      "Catalogo target senza requirement version."
    ),
    bracketNodes: requireArray(catalog.bracket_nodes).map((item) => {
      const row = requireRecord(item, "Nodo bracket non valido.");
      return {
        id: requireString(row.id, "Nodo bracket senza id."),
        editionId: requireString(row.edition_id, "Nodo bracket senza edition."),
        formatTemplateVersionId: requireString(
          row.format_template_version_id,
          "Nodo bracket senza format version."
        ),
        nodeKey: requireString(row.node_key, "Nodo bracket senza chiave stabile."),
        roundId: requireString(row.round_id, "Nodo bracket senza round."),
        targetMatchId: requireString(row.target_match_id, "Nodo bracket senza target match."),
        order: requireNumber(row.sort_order, "Nodo bracket senza ordinamento.")
      };
    }),
    bracketSlots: requireArray(catalog.bracket_slots).map((item) => {
      const row = requireRecord(item, "Bracket slot non valido.");
      return {
        id: requireString(row.id, "Bracket slot senza id."),
        editionId: requireString(row.edition_id, "Bracket slot senza edition."),
        formatTemplateVersionId: requireString(
          row.format_template_version_id,
          "Bracket slot senza format version."
        ),
        roundId: requireString(row.round_id, "Bracket slot senza round."),
        targetNodeId: requireString(row.target_node_id, "Bracket slot senza target node."),
        targetMatchId: requireString(row.target_match_id, "Bracket slot senza target match."),
        targetSide: requireTargetSide(row.target_side),
        targetLeg: requireNumber(row.target_leg, "Bracket slot senza target leg."),
        slotKey: requireString(row.slot_key, "Bracket slot senza slot key."),
        sourceType: requireString(row.source_type, "Bracket slot senza source type."),
        sourcePayload: row.source_payload ?? {}
      };
    }),
    bestThirdCombinations: requireArray(catalog.best_third_combinations).map((item) => {
      const row = requireRecord(item, "Combinazione migliori terze non valida.");
      return {
        id: requireString(row.id, "Combinazione senza id."),
        editionId: requireString(row.edition_id, "Combinazione senza edition."),
        formatTemplateVersionId: requireString(
          row.format_template_version_id,
          "Combinazione senza format version."
        ),
        optionNumber: requireNumber(row.option_number, "Combinazione senza numero opzione."),
        combinationKey: requireString(row.combination_key, "Combinazione senza chiave."),
        qualifiedGroupCodes: requireStringArray(
          row.qualified_group_codes,
          "Combinazione con gruppi non validi."
        ),
        assignments: requireArray(row.assignments).map((assignment) => {
          const value = requireRecord(assignment, "Assignment migliori terze non valido.");
          return {
            formatTemplateVersionId: requireString(
              value.format_template_version_id,
              "Assignment senza format version."
            ),
            targetNodeId: requireString(value.target_node_id, "Assignment senza target node."),
            targetSide: requireTargetSide(value.target_side),
            winnerGroupCode: requireString(
              value.winner_group_code,
              "Assignment senza gruppo vincitore."
            ),
            thirdPlaceGroupCode: requireString(
              value.third_place_group_code,
              "Assignment senza gruppo sorgente."
            )
          };
        })
      };
    }),
    antepostDefinitions: requireArray(catalog.antepost_definitions).map((item) => {
      const row = requireRecord(item, "Definizione antepost non valida.");
      return {
        id: requireString(row.id, "Definizione antepost senza id."),
        editionId: requireString(row.edition_id, "Definizione antepost senza edition."),
        code: requireString(row.code, "Definizione antepost senza code."),
        label: requireString(row.label, "Definizione antepost senza label."),
        valueType: requireString(row.value_type, "Definizione antepost senza value type."),
        required: requireBoolean(row.required, "Definizione antepost senza required.")
      };
    }),
    tiebreakRules: requireArray(catalog.tiebreak_rules).map((item) => {
      const row = requireRecord(item, "Regola tie-break non valida.");
      return {
        id: requireString(row.id, "Regola tie-break senza id."),
        editionId: requireString(row.edition_id, "Regola tie-break senza edition."),
        scope: requireString(row.scope, "Regola tie-break senza scope."),
        order: requireNumber(row.sort_order, "Regola tie-break senza order."),
        ruleCode: requireString(row.rule_code, "Regola tie-break senza code."),
        rulePayload: row.rule_payload ?? {}
      };
    })
  };
}

function requireRecord(value: Json | undefined, message: string): Record<string, Json | undefined> {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}

function requireArray(value: Json | undefined): Json[] {
  if (!Array.isArray(value)) throw new Error("Catalogo target con lista non valida.");
  return value;
}

function requireStringArray(value: Json | undefined, message: string): string[] {
  const values = requireArray(value);
  if (!values.every((item): item is string => typeof item === "string" && item.length > 0)) {
    throw new Error(message);
  }
  return values;
}

function requireString(value: Json | undefined, message: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(message);
  return value;
}

function requireBoolean(value: Json | undefined, message: string): boolean {
  if (typeof value !== "boolean") throw new Error(message);
  return value;
}

function requireNumber(value: Json | undefined, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
  return value;
}

function requireTargetSide(value: Json | undefined): "home" | "away" {
  if (value !== "home" && value !== "away") {
    throw new Error("Bracket slot con target side non valido.");
  }
  return value;
}
