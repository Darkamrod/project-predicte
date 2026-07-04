import type {
  AntepostScoringRule,
  ScoringStageKey,
  StageScoringRule
} from "@/domain/scoring/types";
import { resolveSupabaseRpcClient, type SupabaseRpcClient } from "@/services/supabase/rpcClient";

export class SupabaseRuleRepository {
  constructor(private readonly client?: SupabaseRpcClient) {}

  async updateStageRuleValue(input: {
    leagueId: string;
    stage: ScoringStageKey;
    field: keyof StageScoringRule;
    value: number;
  }): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("update_stage_scoring_rule_value", {
      p_league_id: input.leagueId,
      p_stage: input.stage,
      p_field: String(input.field),
      p_value: input.value
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async updateAntepostRuleValue(input: {
    leagueId: string;
    field: keyof AntepostScoringRule;
    value: number;
  }): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("update_antepost_scoring_rule_value", {
      p_league_id: input.leagueId,
      p_field: String(input.field),
      p_value: input.value
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async lockScoringRuleSnapshot(leagueId: string): Promise<string> {
    const client = resolveSupabaseRpcClient(this.client);
    const { data, error } = await client.rpc("lock_scoring_rule_snapshot", {
      p_league_id: leagueId
    });

    if (error) {
      throw error;
    }

    return data;
  }
}
