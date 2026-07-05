import type {
  AntepostPrediction,
  MatchPrediction,
  PredictionSet,
  PredictionSetStatus,
  PredictionSyncStatus
} from "@/domain/predictions/types";
import type { Json } from "@/services/supabase/database.types";
import { resolveSupabaseRpcClient, type SupabaseRpcClient } from "@/services/supabase/rpcClient";

type PredictionValidationStatus = "valid" | "invalid" | "incomplete";

export interface MatchPredictionPersistenceMetadata {
  homeTeamId?: string;
  awayTeamId?: string;
  dependsOnPredictionRefs?: string[];
}

export interface SaveMatchPredictionInput {
  leagueId: string;
  prediction: MatchPrediction;
  metadata?: MatchPredictionPersistenceMetadata;
  validationStatus?: PredictionValidationStatus;
}

export interface SavePredictionSetInput {
  leagueId: string;
  predictionSet: PredictionSet;
  matchMetadataByRef?: Record<string, MatchPredictionPersistenceMetadata>;
}

export interface SavedPredictionSetResult {
  predictionSetId: string;
  matchPredictionIds: string[];
  tiebreakOverrideIds: string[];
  antepostPredictionIds: string[];
}

export class SupabasePredictionRepository {
  constructor(private readonly client?: SupabaseRpcClient) {}

  async savePredictionSet(input: SavePredictionSetInput): Promise<SavedPredictionSetResult> {
    const matchPredictionIds: string[] = [];
    const tiebreakOverrideIds: string[] = [];
    const antepostPredictionIds: string[] = [];

    for (const prediction of input.predictionSet.matchPredictions) {
      const metadata = input.matchMetadataByRef?.[prediction.matchId];
      const saveInput: SaveMatchPredictionInput = {
        leagueId: input.leagueId,
        prediction
      };

      if (metadata) {
        saveInput.metadata = metadata;
      }

      matchPredictionIds.push(await this.saveMatchPrediction(saveInput));
    }

    for (const override of input.predictionSet.tiebreakOverrides ?? []) {
      tiebreakOverrideIds.push(
        await this.saveTiebreakOverride({
          leagueId: input.leagueId,
          scopeRef: override.scopeRef,
          orderedTeamIds: override.orderedTeamIds,
          reason: override.reason,
          syncStatus: override.syncStatus
        })
      );
    }

    for (const prediction of input.predictionSet.antepostPredictions ?? []) {
      antepostPredictionIds.push(
        await this.saveAntepostPrediction({
          leagueId: input.leagueId,
          prediction
        })
      );
    }

    const predictionSetId = await this.updateCompletion({
      leagueId: input.leagueId,
      status: input.predictionSet.status,
      totalRequired: input.predictionSet.totalRequired,
      completedItems: input.predictionSet.completedItems,
      unsyncedItems: input.predictionSet.unsyncedItems
    });

    return {
      predictionSetId,
      matchPredictionIds,
      tiebreakOverrideIds,
      antepostPredictionIds
    };
  }

  async saveMatchPrediction(input: SaveMatchPredictionInput): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const matchId = getUuidOrUndefined(input.prediction.matchId);
    const { data, error } = await client.rpc("save_match_prediction", {
      p_league_id: input.leagueId,
      p_prediction_ref: input.prediction.matchId,
      p_stage_code: input.prediction.stageCode,
      p_regulation_home_goals: input.prediction.homeGoals,
      p_regulation_away_goals: input.prediction.awayGoals,
      p_depends_on_prediction_refs: input.metadata?.dependsOnPredictionRefs ?? [],
      p_validation_status: input.validationStatus ?? "valid",
      p_sync_status: input.prediction.syncStatus,
      ...(matchId ? { p_match_id: matchId } : {}),
      ...(input.prediction.qualifiedTeamId
        ? { p_qualified_team_id: input.prediction.qualifiedTeamId }
        : {}),
      ...(input.prediction.advancementMethod
        ? { p_advancement_method: input.prediction.advancementMethod }
        : {}),
      ...(input.metadata?.homeTeamId ? { p_home_team_id: input.metadata.homeTeamId } : {}),
      ...(input.metadata?.awayTeamId ? { p_away_team_id: input.metadata.awayTeamId } : {})
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async saveTiebreakOverride(input: {
    leagueId: string;
    scopeRef: string;
    orderedTeamIds: string[];
    reason: string;
    syncStatus?: PredictionSyncStatus;
  }): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("upsert_prediction_tiebreak_override", {
      p_league_id: input.leagueId,
      p_scope_ref: input.scopeRef,
      p_ordered_team_ids: input.orderedTeamIds,
      p_reason: input.reason,
      p_sync_status: input.syncStatus ?? "SYNCED"
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async saveAntepostPrediction(input: {
    leagueId: string;
    prediction: AntepostPrediction;
  }): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("upsert_antepost_prediction", {
      p_league_id: input.leagueId,
      p_definition_id: input.prediction.definitionId,
      p_selected_payload: createAntepostPayload(input.prediction),
      p_sync_status: input.prediction.syncStatus
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async updateCompletion(input: {
    leagueId: string;
    status: PredictionSetStatus;
    totalRequired: number;
    completedItems: number;
    unsyncedItems: number;
  }): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("update_prediction_set_completion", {
      p_league_id: input.leagueId,
      p_status: input.status,
      p_total_required: input.totalRequired,
      p_completed_items: input.completedItems,
      p_unsynced_items: input.unsyncedItems
    });

    if (error) {
      throw error;
    }

    return data;
  }
}

function createAntepostPayload(prediction: AntepostPrediction): Json {
  const payload: Record<string, Json> = {};

  if (prediction.selectedTeamId) {
    payload.selectedTeamId = prediction.selectedTeamId;
  }

  if (prediction.selectedTeamIds) {
    payload.selectedTeamIds = prediction.selectedTeamIds;
  }

  if (prediction.selectedPlayerId) {
    payload.selectedPlayerId = prediction.selectedPlayerId;
  }

  if (prediction.numericValue !== undefined) {
    payload.numericValue = prediction.numericValue;
  }

  return payload;
}

function getUuidOrUndefined(value: string): string | undefined {
  return uuidPattern.test(value) ? value : undefined;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
