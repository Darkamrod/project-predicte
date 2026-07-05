import { requireSupabaseClient } from "@/services/supabase/client";
import type { Database } from "@/services/supabase/database.types";

type MemberRole = Database["public"]["Enums"]["league_member_role"];

export interface CreateLeagueInput {
  competitionEditionId: string;
  name: string;
  deadlineAtUtc: string;
  scoringPresetId?: string;
}

export interface CreateInviteInput {
  leagueId: string;
  expiresAtUtc?: string;
  maxUses?: number;
}

export interface CreatedInvite {
  inviteId: string;
  token: string;
  expiresAtUtc?: string;
  urlPath: string;
}

export class SupabaseLeagueRepository {
  async createLeague(input: CreateLeagueInput): Promise<string> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc("create_private_league", {
      p_competition_edition_id: input.competitionEditionId,
      p_name: input.name,
      p_deadline_at: input.deadlineAtUtc,
      ...(input.scoringPresetId ? { p_scoring_preset_id: input.scoringPresetId } : {})
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async createInvite(input: CreateInviteInput): Promise<CreatedInvite> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc("create_league_invite", {
      p_league_id: input.leagueId,
      ...(input.expiresAtUtc ? { p_expires_at: input.expiresAtUtc } : {}),
      ...(input.maxUses !== undefined ? { p_max_uses: input.maxUses } : {})
    });

    if (error) {
      throw error;
    }

    const created = data[0];

    if (!created) {
      throw new Error("Invite RPC did not return an invite.");
    }

    return {
      inviteId: created.invite_id,
      token: created.token,
      urlPath: `/invite/${created.token}`,
      ...(created.expires_at ? { expiresAtUtc: created.expires_at } : {})
    };
  }

  async joinByInviteToken(token: string): Promise<string> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc("join_league_by_invite", {
      p_token: token
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async setMemberRole(params: {
    leagueId: string;
    userId: string;
    role: Exclude<MemberRole, "owner">;
  }): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("set_league_member_role", {
      p_league_id: params.leagueId,
      p_user_id: params.userId,
      p_role: params.role
    });

    if (error) {
      throw error;
    }
  }

  async removeMember(leagueId: string, userId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("remove_league_member", {
      p_league_id: leagueId,
      p_user_id: userId
    });

    if (error) {
      throw error;
    }
  }

  async updateDeadline(leagueId: string, deadlineAtUtc: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("update_league_deadline", {
      p_league_id: leagueId,
      p_deadline_at: deadlineAtUtc
    });

    if (error) {
      throw error;
    }
  }

  async lockLeague(leagueId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc("lock_league", {
      p_league_id: leagueId
    });

    if (error) {
      throw error;
    }
  }
}
