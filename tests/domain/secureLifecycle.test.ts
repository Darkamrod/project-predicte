import { describe, expect, it } from "vitest";

import {
  canChangeMemberRole,
  canCreateLeagueInvite,
  canLockLeagueAfterDeadline,
  canManageLeagueMember,
  canUpdateLeagueDeadline,
  leagueAcceptsMembers,
  leagueAcceptsPredictions
} from "@/domain/leagues/lifecycle";
import { canJoinLeagueByInvite } from "@/domain/leagues/invites";
import {
  canAdministerLeague,
  canReadLeague,
  canReadLeagueMembers,
  canReadPredictionSet,
  canWriteOwnPrediction
} from "@/domain/security/policies";

const openState = {
  status: "open" as const,
  deadlineAtUtc: "2030-06-08T18:30:00.000Z",
  maximumDeadlineAtUtc: "2030-06-08T18:30:00.000Z"
};

const draftState = {
  ...openState,
  status: "draft" as const
};

describe("secure league lifecycle rules", () => {
  it("allows organizer actions only while the league accepts members", () => {
    expect(leagueAcceptsMembers(openState, "2030-06-08T18:00:00.000Z")).toBe(true);
    expect(leagueAcceptsMembers(draftState, "2030-06-08T18:00:00.000Z")).toBe(false);
    expect(
      canCreateLeagueInvite({
        role: "owner",
        state: openState,
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(true);
    expect(
      canCreateLeagueInvite({
        role: "participant",
        state: openState,
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
    expect(
      canCreateLeagueInvite({
        role: "owner",
        state: draftState,
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
    expect(leagueAcceptsMembers(openState, "2030-06-08T18:30:00.000Z")).toBe(false);
  });

  it("allows prediction writes only while the league accepts predictions", () => {
    expect(leagueAcceptsPredictions(openState, "2030-06-08T18:00:00.000Z")).toBe(true);
    expect(leagueAcceptsPredictions(draftState, "2030-06-08T18:00:00.000Z")).toBe(false);
    expect(leagueAcceptsPredictions(openState, "2030-06-08T18:30:00.000Z")).toBe(false);
  });

  it("prevents member management of owners and after lock", () => {
    expect(
      canManageLeagueMember({
        actorRole: "admin",
        targetRole: "participant",
        state: openState,
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(true);
    expect(
      canManageLeagueMember({
        actorRole: "admin",
        targetRole: "owner",
        state: openState,
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
    expect(
      canChangeMemberRole({
        actorRole: "owner",
        targetRole: "participant",
        newRole: "admin",
        state: { ...openState, status: "locked" },
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
  });

  it("allows deadline changes only before old and new deadlines and within competition maximum", () => {
    expect(
      canUpdateLeagueDeadline({
        role: "admin",
        state: openState,
        newDeadlineAtUtc: "2030-06-08T18:20:00.000Z",
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(true);
    expect(
      canUpdateLeagueDeadline({
        role: "admin",
        state: openState,
        newDeadlineAtUtc: "2030-06-08T18:40:00.000Z",
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
    expect(
      canUpdateLeagueDeadline({
        role: "admin",
        state: openState,
        newDeadlineAtUtc: "2030-06-08T18:20:00.000Z",
        serverNowUtc: "2030-06-08T18:30:00.000Z"
      })
    ).toBe(false);
  });

  it("locks only at or after deadline", () => {
    expect(
      canLockLeagueAfterDeadline({
        state: openState,
        serverNowUtc: "2030-06-08T18:29:59.000Z"
      })
    ).toBe(false);
    expect(
      canLockLeagueAfterDeadline({
        state: openState,
        serverNowUtc: "2030-06-08T18:30:00.000Z"
      })
    ).toBe(true);
  });
});

describe("invite rules", () => {
  it("accepts valid invites and rejects expired, revoked, full, or locked league invites", () => {
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          expiresAtUtc: "2030-06-01T18:30:00.000Z",
          uses: 0,
          maxUses: 10,
          alreadyMember: false
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(true);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          expiresAtUtc: "2030-05-30T10:00:00.000Z",
          uses: 0,
          alreadyMember: false
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          revokedAtUtc: "2030-05-29T10:00:00.000Z",
          uses: 0,
          alreadyMember: false
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          uses: 2,
          maxUses: 2,
          alreadyMember: false
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "locked",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          uses: 0,
          alreadyMember: false
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
  });

  it("requires an already-active member to present a still-valid invite token", () => {
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          expiresAtUtc: "2030-06-01T18:30:00.000Z",
          uses: 0,
          maxUses: 10,
          alreadyMember: true
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(true);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          expiresAtUtc: "2030-05-30T10:00:00.000Z",
          uses: 0,
          alreadyMember: true
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
    expect(
      canJoinLeagueByInvite(
        {
          leagueStatus: "open",
          deadlineAtUtc: "2030-06-08T18:30:00.000Z",
          revokedAtUtc: "2030-05-29T10:00:00.000Z",
          uses: 0,
          alreadyMember: true
        },
        "2030-05-30T10:00:00.000Z"
      )
    ).toBe(false);
  });
});

describe("RLS-equivalent policy rules", () => {
  it("allows league and member reads only for active members", () => {
    expect(
      canReadLeague({
        requesterUserId: "user-a",
        ownerUserId: "user-owner",
        requesterRole: "participant",
        isActiveMember: true
      })
    ).toBe(true);
    expect(
      canReadLeagueMembers({
        requesterUserId: "user-a",
        ownerUserId: "user-owner",
        isActiveMember: false
      })
    ).toBe(false);
  });

  it("hides other predictions before lock and exposes them after lock", () => {
    expect(
      canReadPredictionSet({
        leagueStatus: "open",
        requesterUserId: "user-a",
        ownerUserId: "user-b",
        requesterIsActiveMember: true
      })
    ).toBe(false);
    expect(
      canReadPredictionSet({
        leagueStatus: "open",
        requesterUserId: "user-a",
        ownerUserId: "user-a",
        requesterIsActiveMember: true
      })
    ).toBe(true);
    expect(
      canReadPredictionSet({
        leagueStatus: "locked",
        requesterUserId: "user-a",
        ownerUserId: "user-b",
        requesterIsActiveMember: true
      })
    ).toBe(true);
  });

  it("allows prediction writes only by owner before deadline", () => {
    expect(
      canWriteOwnPrediction({
        leagueStatus: "open",
        requesterUserId: "user-a",
        ownerUserId: "user-a",
        deadlineAtUtc: "2030-06-08T18:30:00.000Z",
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(true);
    expect(
      canWriteOwnPrediction({
        leagueStatus: "open",
        requesterUserId: "user-a",
        ownerUserId: "user-a",
        deadlineAtUtc: "2030-06-08T18:30:00.000Z",
        serverNowUtc: "2030-06-08T18:30:00.000Z"
      })
    ).toBe(false);
    expect(
      canWriteOwnPrediction({
        leagueStatus: "draft",
        requesterUserId: "user-a",
        ownerUserId: "user-a",
        deadlineAtUtc: "2030-06-08T18:30:00.000Z",
        serverNowUtc: "2030-06-08T18:00:00.000Z"
      })
    ).toBe(false);
  });

  it("maps owner/admin as administrators", () => {
    expect(
      canAdministerLeague({
        requesterUserId: "user-owner",
        ownerUserId: "user-owner",
        requesterRole: "owner",
        isActiveMember: true
      })
    ).toBe(true);
    expect(
      canAdministerLeague({
        requesterUserId: "user-participant",
        ownerUserId: "user-owner",
        requesterRole: "participant",
        isActiveMember: true
      })
    ).toBe(false);
  });
});
