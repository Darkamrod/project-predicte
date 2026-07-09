import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPreviewRequestGuard } from "@/features/league/leagueOverviewPreviewRequestGuard";
import { isSupabasePreviewLeagueId } from "@/features/league/useSupabaseLeagueOverviewPreview";
import type {
  LeaderboardEntryListItem,
  LeaderboardSnapshotSummaryItem,
  LeagueMemberListItem
} from "@/services/leagues/supabaseLeagueReadRepository";
import { SupabaseLeagueReadRepository } from "@/services/leagues/supabaseLeagueReadRepository";
import type { PaginationMeta } from "@/services/pagination";
import { getSupabaseClient } from "@/services/supabase/client";

export const LEAGUE_READ_SCREEN_PAGE_SIZE = 20;

export interface SupabaseLeagueListState<T> {
  enabled: boolean;
  items: T[];
  pagination: PaginationMeta;
  loading: boolean;
  loadingMore: boolean;
  error: string | undefined;
  loadMore(): void;
  refresh(): void;
}

export interface SupabaseLatestLeaderboardListState extends SupabaseLeagueListState<LeaderboardEntryListItem> {
  snapshot: LeaderboardSnapshotSummaryItem | undefined;
}

export function useSupabaseLeagueMembersList(
  leagueId: string
): SupabaseLeagueListState<LeagueMemberListItem> {
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(
    () => (client ? new SupabaseLeagueReadRepository(client) : undefined),
    [client]
  );
  const enabled = Boolean(repository && isSupabasePreviewLeagueId(leagueId));
  const guardRef = useRef(createPreviewRequestGuard());
  const [state, setState] =
    useState<SupabaseLeagueListState<LeagueMemberListItem>>(createInitialListState);

  useEffect(() => () => guardRef.current.cleanup(), []);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (!enabled || !repository) {
        return;
      }

      const guard = guardRef.current;

      if (append && !guard.tryBeginLoadMore()) {
        return;
      }

      const token = append ? guard.beginRequest() : guard.beginReplacingRequest();

      if (guard.canApply(token)) {
        setState((current) => ({
          ...current,
          enabled,
          error: undefined,
          loading: !append,
          loadingMore: append
        }));
      }

      try {
        const result = await repository.listLeagueMembers(leagueId, {
          page,
          pageSize: LEAGUE_READ_SCREEN_PAGE_SIZE
        });

        if (!guard.canApply(token)) {
          return;
        }

        setState((current) => ({
          ...current,
          enabled,
          items: append ? [...current.items, ...result.items] : result.items,
          pagination: result.pagination,
          loading: false,
          loadingMore: false,
          error: undefined
        }));
      } catch (error) {
        if (!guard.canApply(token)) {
          return;
        }

        setState((current) => ({
          ...current,
          enabled,
          loading: false,
          loadingMore: false,
          error: errorToMessage(error)
        }));
      } finally {
        if (append) {
          guard.finishLoadMore(token);
        } else {
          guard.finishReplacingRequest(token);
        }
      }
    },
    [enabled, leagueId, repository]
  );

  useEffect(() => {
    guardRef.current.reset();
    setState({ ...createInitialListState<LeagueMemberListItem>(), enabled });

    if (enabled) {
      void loadPage(1, false);
    }
  }, [enabled, loadPage]);

  const loadMore = useCallback(() => {
    if (!state.loading && !state.loadingMore && state.pagination.hasNextPage) {
      void loadPage(state.pagination.page + 1, true);
    }
  }, [
    loadPage,
    state.loading,
    state.loadingMore,
    state.pagination.hasNextPage,
    state.pagination.page
  ]);

  const refresh = useCallback(() => {
    if (enabled) {
      void loadPage(1, false);
    }
  }, [enabled, loadPage]);

  return {
    ...state,
    enabled,
    loadMore,
    refresh
  };
}

export function useSupabaseLatestLeaderboardList(
  leagueId: string
): SupabaseLatestLeaderboardListState {
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(
    () => (client ? new SupabaseLeagueReadRepository(client) : undefined),
    [client]
  );
  const enabled = Boolean(repository && isSupabasePreviewLeagueId(leagueId));
  const guardRef = useRef(createPreviewRequestGuard());
  const [state, setState] = useState<SupabaseLatestLeaderboardListState>(
    createInitialLeaderboardState
  );

  useEffect(() => () => guardRef.current.cleanup(), []);

  const loadPage = useCallback(
    async (page: number, append: boolean) => {
      if (!enabled || !repository) {
        return;
      }

      const guard = guardRef.current;

      if (append && !guard.tryBeginLoadMore()) {
        return;
      }

      const token = append ? guard.beginRequest() : guard.beginReplacingRequest();

      if (guard.canApply(token)) {
        setState((current) => ({
          ...current,
          enabled,
          error: undefined,
          loading: !append,
          loadingMore: append
        }));
      }

      try {
        const result = await repository.listLatestLeaderboardEntriesForLeague(leagueId, {
          page,
          pageSize: LEAGUE_READ_SCREEN_PAGE_SIZE
        });

        if (!guard.canApply(token)) {
          return;
        }

        setState((current) => ({
          ...current,
          enabled,
          snapshot: result.snapshot,
          items: append ? [...current.items, ...result.entries.items] : result.entries.items,
          pagination: result.entries.pagination,
          loading: false,
          loadingMore: false,
          error: undefined
        }));
      } catch (error) {
        if (!guard.canApply(token)) {
          return;
        }

        setState((current) => ({
          ...current,
          enabled,
          loading: false,
          loadingMore: false,
          error: errorToMessage(error)
        }));
      } finally {
        if (append) {
          guard.finishLoadMore(token);
        } else {
          guard.finishReplacingRequest(token);
        }
      }
    },
    [enabled, leagueId, repository]
  );

  useEffect(() => {
    guardRef.current.reset();
    setState({ ...createInitialLeaderboardState(), enabled });

    if (enabled) {
      void loadPage(1, false);
    }
  }, [enabled, loadPage]);

  const loadMore = useCallback(() => {
    if (!state.loading && !state.loadingMore && state.pagination.hasNextPage) {
      void loadPage(state.pagination.page + 1, true);
    }
  }, [
    loadPage,
    state.loading,
    state.loadingMore,
    state.pagination.hasNextPage,
    state.pagination.page
  ]);

  const refresh = useCallback(() => {
    if (enabled) {
      void loadPage(1, false);
    }
  }, [enabled, loadPage]);

  return {
    ...state,
    enabled,
    loadMore,
    refresh
  };
}

function createInitialListState<T>(): SupabaseLeagueListState<T> {
  return {
    enabled: false,
    items: [],
    pagination: createInitialPagination(),
    loading: false,
    loadingMore: false,
    error: undefined,
    loadMore: noop,
    refresh: noop
  };
}

function createInitialLeaderboardState(): SupabaseLatestLeaderboardListState {
  return {
    ...createInitialListState<LeaderboardEntryListItem>(),
    snapshot: undefined
  };
}

function createInitialPagination(): PaginationMeta {
  return {
    page: 1,
    pageSize: LEAGUE_READ_SCREEN_PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false
  };
}

function noop(): void {
  return undefined;
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Errore inatteso durante il caricamento.";
}
