import type { LeagueStatus } from "@/domain/predictions/types";
import type { LeagueMemberRole } from "@/services/leagues/types";

export interface MembershipPolicyContext {
  requesterUserId: string;
  ownerUserId: string;
  requesterRole?: LeagueMemberRole;
  isActiveMember: boolean;
}

export function canReadLeague(context: MembershipPolicyContext): boolean {
  return context.isActiveMember;
}

export function canReadLeagueMembers(context: MembershipPolicyContext): boolean {
  return context.isActiveMember;
}

export function canReadPredictionSet(params: {
  leagueStatus: LeagueStatus;
  requesterUserId: string;
  ownerUserId: string;
  requesterIsActiveMember: boolean;
}): boolean {
  if (params.requesterUserId === params.ownerUserId) {
    return true;
  }

  return (
    params.requesterIsActiveMember &&
    ["locked", "live", "completed", "archived"].includes(params.leagueStatus)
  );
}

export function canWriteOwnPrediction(params: {
  leagueStatus: LeagueStatus;
  requesterUserId: string;
  ownerUserId: string;
  deadlineAtUtc: string;
  serverNowUtc: string;
}): boolean {
  return (
    params.requesterUserId === params.ownerUserId &&
    ["draft", "open"].includes(params.leagueStatus) &&
    params.serverNowUtc < params.deadlineAtUtc
  );
}

export function canAdministerLeague(context: MembershipPolicyContext): boolean {
  return context.requesterRole === "owner" || context.requesterRole === "admin";
}
