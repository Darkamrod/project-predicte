import type { LeagueStatus } from "@/domain/predictions/types";
import type { LeagueMemberRole } from "@/services/leagues/types";

export interface LeagueLifecycleState {
  status: LeagueStatus;
  deadlineAtUtc: string;
  maximumDeadlineAtUtc?: string;
}

export function isLeagueWritable(state: LeagueLifecycleState, serverNowUtc: string): boolean {
  return ["draft", "open"].includes(state.status) && serverNowUtc < state.deadlineAtUtc;
}

export function canCreateLeagueInvite(params: {
  role: LeagueMemberRole;
  state: LeagueLifecycleState;
  serverNowUtc: string;
}): boolean {
  return isOwnerOrAdmin(params.role) && isLeagueWritable(params.state, params.serverNowUtc);
}

export function canManageLeagueMember(params: {
  actorRole: LeagueMemberRole;
  targetRole: LeagueMemberRole;
  state: LeagueLifecycleState;
  serverNowUtc: string;
}): boolean {
  return (
    isOwnerOrAdmin(params.actorRole) &&
    params.targetRole !== "owner" &&
    isLeagueWritable(params.state, params.serverNowUtc)
  );
}

export function canChangeMemberRole(params: {
  actorRole: LeagueMemberRole;
  targetRole: LeagueMemberRole;
  newRole: Exclude<LeagueMemberRole, "owner">;
  state: LeagueLifecycleState;
  serverNowUtc: string;
}): boolean {
  return (
    params.actorRole === "owner" &&
    params.targetRole !== "owner" &&
    isLeagueWritable(params.state, params.serverNowUtc)
  );
}

export function canUpdateLeagueDeadline(params: {
  role: LeagueMemberRole;
  state: LeagueLifecycleState;
  newDeadlineAtUtc: string;
  serverNowUtc: string;
}): boolean {
  const beforeOldDeadline = params.serverNowUtc < params.state.deadlineAtUtc;
  const beforeNewDeadline = params.serverNowUtc < params.newDeadlineAtUtc;
  const withinMaximum =
    !params.state.maximumDeadlineAtUtc ||
    params.newDeadlineAtUtc <= params.state.maximumDeadlineAtUtc;

  return (
    isOwnerOrAdmin(params.role) &&
    params.state.status === "open" &&
    beforeOldDeadline &&
    beforeNewDeadline &&
    withinMaximum
  );
}

export function canLockLeagueAfterDeadline(params: {
  state: LeagueLifecycleState;
  serverNowUtc: string;
}): boolean {
  return (
    ["draft", "open"].includes(params.state.status) &&
    params.serverNowUtc >= params.state.deadlineAtUtc
  );
}

function isOwnerOrAdmin(role: LeagueMemberRole): boolean {
  return role === "owner" || role === "admin";
}
