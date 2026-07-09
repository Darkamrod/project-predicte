export interface PreviewRequestGuard {
  beginRequest(): number;
  beginReplacingRequest(): number;
  canApply(token: number): boolean;
  reset(): void;
  cleanup(): void;
  tryBeginLoadMore(): boolean;
  finishReplacingRequest(token: number): void;
  finishLoadMore(token: number): void;
  isLoadMoreInFlight(): boolean;
}

export function createPreviewRequestGuard(): PreviewRequestGuard {
  let active = true;
  let requestVersion = 0;
  let replacingInFlight = false;
  let loadMoreInFlight = false;

  return {
    beginRequest() {
      requestVersion += 1;
      return requestVersion;
    },
    beginReplacingRequest() {
      requestVersion += 1;
      replacingInFlight = true;
      loadMoreInFlight = false;
      return requestVersion;
    },
    canApply(token: number) {
      return active && token === requestVersion;
    },
    reset() {
      active = true;
      requestVersion += 1;
      replacingInFlight = false;
      loadMoreInFlight = false;
    },
    cleanup() {
      active = false;
      requestVersion += 1;
      replacingInFlight = false;
      loadMoreInFlight = false;
    },
    tryBeginLoadMore() {
      if (!active || replacingInFlight || loadMoreInFlight) {
        return false;
      }

      loadMoreInFlight = true;
      return true;
    },
    finishReplacingRequest(token: number) {
      if (active && token === requestVersion) {
        replacingInFlight = false;
      }
    },
    finishLoadMore(token: number) {
      if (active && token === requestVersion) {
        loadMoreInFlight = false;
      }
    },
    isLoadMoreInFlight() {
      return loadMoreInFlight;
    }
  };
}
