import { describe, expect, it } from "vitest";

import {
  assertPredictionWritable,
  assertScoringRulesWritable,
  canEditPredictions,
  canEditScoringRules,
  canReadParticipantPredictions
} from "@/domain/predictions/locks";

describe("prediction and rule locking", () => {
  it("allows prediction writes before the server deadline while open", () => {
    const state = {
      leagueId: "league-test",
      status: "open" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z"
    };

    expect(canEditPredictions(state, "2030-06-08T18:29:59.000Z")).toBe(true);
    expect(() => assertPredictionWritable(state, "2030-06-08T18:29:59.000Z")).not.toThrow();
  });

  it("rejects prediction writes at or after the deadline", () => {
    const state = {
      leagueId: "league-test",
      status: "open" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z"
    };

    expect(canEditPredictions(state, "2030-06-08T18:30:00.000Z")).toBe(false);
    expect(() => assertPredictionWritable(state, "2030-06-08T18:30:00.000Z")).toThrow(
      "Predictions are locked or past the server deadline."
    );
  });

  it("rejects prediction writes after league lock even before deadline", () => {
    const state = {
      leagueId: "league-test",
      status: "locked" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z"
    };

    expect(canEditPredictions(state, "2030-06-08T18:00:00.000Z")).toBe(false);
  });

  it("rejects prediction writes while the league is still draft", () => {
    const state = {
      leagueId: "league-test",
      status: "draft" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z"
    };

    expect(canEditPredictions(state, "2030-06-08T18:00:00.000Z")).toBe(false);
  });

  it("allows scoring rule edits only while open and before deadline", () => {
    const openState = {
      leagueId: "league-test",
      status: "open" as const,
      deadlineAtUtc: "2030-06-08T18:30:00.000Z"
    };
    const lockedState = {
      ...openState,
      status: "locked" as const
    };

    expect(canEditScoringRules(openState, "2030-06-08T18:00:00.000Z")).toBe(true);
    expect(canEditScoringRules(lockedState, "2030-06-08T18:00:00.000Z")).toBe(false);
    expect(() => assertScoringRulesWritable(lockedState, "2030-06-08T18:00:00.000Z")).toThrow(
      "Scoring rules cannot be changed after lock or deadline."
    );
  });

  it("hides other participants predictions before lock and allows them after lock", () => {
    expect(
      canReadParticipantPredictions({
        leagueStatus: "open",
        requesterUserId: "user-a",
        participantUserId: "user-b"
      })
    ).toBe(false);
    expect(
      canReadParticipantPredictions({
        leagueStatus: "open",
        requesterUserId: "user-a",
        participantUserId: "user-a"
      })
    ).toBe(true);
    expect(
      canReadParticipantPredictions({
        leagueStatus: "locked",
        requesterUserId: "user-a",
        participantUserId: "user-b"
      })
    ).toBe(true);
  });
});
