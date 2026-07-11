import { describe, expect, it } from "vitest";

import { resolvePersonalPredictionCompletion } from "@/domain/predictions/personalCompletion";

describe("personal prediction completion", () => {
  it("is not started without creating a prediction set", () => {
    expect(resolvePersonalPredictionCompletion(undefined, "open")).toMatchObject({
      state: "not_started",
      canEdit: true,
      percentComplete: 0
    });
  });

  it("reports incomplete progress and missing items", () => {
    expect(
      resolvePersonalPredictionCompletion({ completedItems: 3, totalRequired: 10 }, "open")
    ).toMatchObject({ state: "incomplete", missingItems: 7, percentComplete: 30 });
  });

  it("caps complete progress at one hundred", () => {
    expect(
      resolvePersonalPredictionCompletion(
        { completedItems: 12, status: "complete", totalRequired: 10 },
        "open"
      )
    ).toMatchObject({ state: "complete", missingItems: 0, percentComplete: 100 });
  });

  it.each([
    { completedItems: 0, totalRequired: undefined },
    { completedItems: 0, totalRequired: 0 },
    { completedItems: 9, totalRequired: 10 },
    { completedItems: undefined, totalRequired: 10 },
    { completedItems: null, totalRequired: 10 }
  ])("keeps inconsistent complete status conservative: %o", (input) => {
    expect(
      resolvePersonalPredictionCompletion({ ...input, status: "complete" }, "open")
    ).toMatchObject({ state: "incomplete" });
  });

  it("accepts complete status only when persisted counters confirm it", () => {
    expect(
      resolvePersonalPredictionCompletion(
        { completedItems: 10, status: "complete", totalRequired: 10 },
        "open"
      )
    ).toMatchObject({ state: "complete", percentComplete: 100 });
  });

  it("keeps personal progress readable but disables editing after lock", () => {
    expect(
      resolvePersonalPredictionCompletion({ completedItems: 4, totalRequired: 10 }, "locked")
    ).toMatchObject({ state: "locked", completedItems: 4, missingItems: 6, canEdit: false });
  });

  it("handles partial data conservatively", () => {
    expect(resolvePersonalPredictionCompletion({ status: "draft" }, "open")).toMatchObject({
      state: "incomplete",
      totalRequired: 0,
      percentComplete: 0
    });
  });
});
