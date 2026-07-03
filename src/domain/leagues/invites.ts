import type { LeagueStatus } from "@/domain/predictions/types";

export interface InviteState {
  leagueStatus: LeagueStatus;
  deadlineAtUtc: string;
  expiresAtUtc?: string;
  revokedAtUtc?: string;
  maxUses?: number;
  uses: number;
  alreadyMember: boolean;
}

export function canJoinLeagueByInvite(state: InviteState, serverNowUtc: string): boolean {
  if (state.alreadyMember) {
    return true;
  }

  if (state.leagueStatus !== "open" || serverNowUtc >= state.deadlineAtUtc) {
    return false;
  }

  if (state.revokedAtUtc) {
    return false;
  }

  if (state.expiresAtUtc && serverNowUtc >= state.expiresAtUtc) {
    return false;
  }

  if (state.maxUses !== undefined && state.uses >= state.maxUses) {
    return false;
  }

  return true;
}

export function normalizeInviteToken(token: string): string {
  return token.trim();
}
