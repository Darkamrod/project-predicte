import { describe, expect, it } from "vitest";

import {
  createPreviewRequestGuard,
  mergeUniquePageItems
} from "@/features/league/leagueOverviewPreviewRequestGuard";

describe("league overview preview request guard", () => {
  it("ignores stale responses when a newer request starts", () => {
    const guard = createPreviewRequestGuard();

    const firstRequest = guard.beginRequest();
    const secondRequest = guard.beginRequest();

    expect(guard.canApply(firstRequest)).toBe(false);
    expect(guard.canApply(secondRequest)).toBe(true);
  });

  it("ignores responses after cleanup so unmounted previews cannot update state", () => {
    const guard = createPreviewRequestGuard();
    const request = guard.beginRequest();

    guard.cleanup();

    expect(guard.canApply(request)).toBe(false);
    expect(guard.tryBeginLoadMore()).toBe(false);
  });

  it("blocks overlapping load-more requests until the current page resolves", () => {
    const guard = createPreviewRequestGuard();

    expect(guard.tryBeginLoadMore()).toBe(true);
    expect(guard.tryBeginLoadMore()).toBe(false);

    const token = guard.beginRequest();
    guard.finishLoadMore(token);

    expect(guard.isLoadMoreInFlight()).toBe(false);
    expect(guard.tryBeginLoadMore()).toBe(true);
  });

  it("blocks load-more while a replacing request is in flight", () => {
    const guard = createPreviewRequestGuard();
    const replaceToken = guard.beginReplacingRequest();

    expect(guard.tryBeginLoadMore()).toBe(false);

    guard.finishReplacingRequest(replaceToken);
    expect(guard.tryBeginLoadMore()).toBe(true);
  });

  it("does not let a stale load-more finish clear a newer load-more lock", () => {
    const guard = createPreviewRequestGuard();

    expect(guard.tryBeginLoadMore()).toBe(true);
    const staleToken = guard.beginRequest();

    guard.reset();
    expect(guard.tryBeginLoadMore()).toBe(true);
    const currentToken = guard.beginRequest();

    guard.finishLoadMore(staleToken);
    expect(guard.isLoadMoreInFlight()).toBe(true);

    guard.finishLoadMore(currentToken);
    expect(guard.isLoadMoreInFlight()).toBe(false);
  });

  it("appends later member pages without duplicating users", () => {
    const firstPage = [
      { userId: "complete-1", completionState: "complete" },
      { userId: "complete-2", completionState: "complete" }
    ];
    const secondPage = [
      { userId: "complete-2", completionState: "complete" },
      { userId: "incomplete-3", completionState: "incomplete" }
    ];

    const merged = mergeUniquePageItems(firstPage, secondPage, (item) => item.userId);

    expect(merged).toEqual([
      { userId: "complete-1", completionState: "complete" },
      { userId: "complete-2", completionState: "complete" },
      { userId: "incomplete-3", completionState: "incomplete" }
    ]);
    expect(merged.filter((item) => item.completionState !== "complete")).toEqual([
      { userId: "incomplete-3", completionState: "incomplete" }
    ]);
  });
});
