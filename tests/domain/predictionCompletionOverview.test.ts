import { describe, expect, it } from "vitest";

import {
  calculatePredictionCompletionPercent,
  calculatePredictionMissingItems,
  resolvePredictionCompletionOverviewAvailability,
  resolvePredictionCompletionOverviewState,
  summarizePredictionCompletionForActiveMembers
} from "@/domain/predictions/completionOverview";

describe("prediction completion overview helpers", () => {
  it("classifies missing, complete, incomplete, and locked prediction states without scoring", () => {
    expect(resolvePredictionCompletionOverviewState({ hasPredictionSet: false })).toBe("missing");
    expect(
      resolvePredictionCompletionOverviewState({
        completedItems: 10,
        hasPredictionSet: true,
        status: "complete",
        totalRequired: 20
      })
    ).toBe("complete");
    expect(
      resolvePredictionCompletionOverviewState({
        completedItems: 20,
        hasPredictionSet: true,
        status: "draft",
        totalRequired: 20
      })
    ).toBe("complete");
    expect(
      resolvePredictionCompletionOverviewState({
        completedItems: 8,
        hasPredictionSet: true,
        status: "locked",
        totalRequired: 20
      })
    ).toBe("locked");
    expect(
      resolvePredictionCompletionOverviewState({
        completedItems: 8,
        hasPredictionSet: true,
        status: "draft",
        totalRequired: 20
      })
    ).toBe("incomplete");
  });

  it("derives completion percentages and missing counts from stored completion fields only", () => {
    expect(calculatePredictionCompletionPercent(10, 20)).toBe(50);
    expect(calculatePredictionCompletionPercent(25, 20)).toBe(100);
    expect(calculatePredictionCompletionPercent(10, 0)).toBe(0);
    expect(calculatePredictionMissingItems(8, 20)).toBe(12);
    expect(calculatePredictionMissingItems(25, 20)).toBe(0);
  });

  it("keeps the global overview unavailable until the persisted league lifecycle is post-lock", () => {
    expect(resolvePredictionCompletionOverviewAvailability("draft")).toBe("pre_lock");
    expect(resolvePredictionCompletionOverviewAvailability("open")).toBe("pre_lock");
    expect(resolvePredictionCompletionOverviewAvailability(undefined)).toBe("pre_lock");
    expect(resolvePredictionCompletionOverviewAvailability("locked")).toBe("available");
    expect(resolvePredictionCompletionOverviewAvailability("live")).toBe("available");
    expect(resolvePredictionCompletionOverviewAvailability("completed")).toBe("available");
    expect(resolvePredictionCompletionOverviewAvailability("archived")).toBe("available");
  });

  it("summarizes complete, incomplete, missing, and locked states for active members only", () => {
    const summary = summarizePredictionCompletionForActiveMembers(
      ["active-complete", "active-incomplete", "active-missing", "active-locked"],
      [
        {
          userId: "active-complete",
          status: "complete",
          completedItems: 64,
          totalRequired: 64
        },
        {
          userId: "active-incomplete",
          status: "draft",
          completedItems: 40,
          totalRequired: 64
        },
        {
          userId: "active-locked",
          status: "locked",
          completedItems: 50,
          totalRequired: 64
        },
        {
          userId: "removed-complete",
          status: "complete",
          completedItems: 64,
          totalRequired: 64
        }
      ]
    );

    expect(summary).toEqual({
      totalParticipants: 4,
      predictionSetsTotal: 3,
      completePredictionSets: 1,
      incompletePredictionSets: 1,
      lockedPredictionSets: 1,
      missingPredictionSets: 1
    });
  });

  it("returns an empty conservative summary when there are no active members", () => {
    expect(
      summarizePredictionCompletionForActiveMembers(
        [],
        [
          {
            userId: "removed-user",
            status: "complete",
            completedItems: 64,
            totalRequired: 64
          }
        ]
      )
    ).toEqual({
      totalParticipants: 0,
      predictionSetsTotal: 0,
      completePredictionSets: 0,
      incompletePredictionSets: 0,
      lockedPredictionSets: 0,
      missingPredictionSets: 0
    });
  });
});
