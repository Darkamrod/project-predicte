import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  LeaderboardEntryListItem,
  LeaderboardSnapshotSummaryItem,
  LeagueMemberListItem
} from "@/services/leagues/supabaseLeagueReadRepository";
import { SupabaseLeagueReadRepository } from "@/services/leagues/supabaseLeagueReadRepository";
import type { PaginationMeta } from "@/services/pagination";
import { getSupabaseClient } from "@/services/supabase/client";
import { createPreviewRequestGuard } from "./leagueOverviewPreviewRequestGuard";

export const LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE = 20;

interface PreviewListState<T> {
  items: T[];
  pagination: PaginationMeta;
  loading: boolean;
  loadingMore: boolean;
  error: string | undefined;
}

interface LeaderboardPreviewState extends PreviewListState<LeaderboardEntryListItem> {
  snapshot: LeaderboardSnapshotSummaryItem | undefined;
}

export interface SupabaseLeagueOverviewPreview {
  enabled: boolean;
  members: PreviewListState<LeagueMemberListItem>;
  leaderboard: LeaderboardPreviewState;
  loadMoreMembers(): void;
  loadMoreLeaderboard(): void;
  refresh(): void;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabasePreviewLeagueId(leagueId: string): boolean {
  return UUID_PATTERN.test(leagueId);
}

export function useSupabaseLeagueOverviewPreview(leagueId: string): SupabaseLeagueOverviewPreview {
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(
    () => (client ? new SupabaseLeagueReadRepository(client) : undefined),
    [client]
  );
  const enabled = Boolean(repository && isSupabasePreviewLeagueId(leagueId));
  const membersGuardRef = useRef(createPreviewRequestGuard());
  const leaderboardGuardRef = useRef(createPreviewRequestGuard());
  const [members, setMembers] =
    useState<PreviewListState<LeagueMemberListItem>>(createInitialListState);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPreviewState>(
    createInitialLeaderboardState
  );

  useEffect(
    () => () => {
      membersGuardRef.current.cleanup();
      leaderboardGuardRef.current.cleanup();
    },
    []
  );

  const loadMembers = useCallback(
    async (page: number, append: boolean) => {
      if (!enabled || !repository) {
        return;
      }

      const guard = membersGuardRef.current;

      if (append && !guard.tryBeginLoadMore()) {
        return;
      }

      if (!append) {
        const token = guard.beginReplacingRequest();

        if (guard.canApply(token)) {
          setMembers((current) => ({
            ...current,
            error: undefined,
            loading: true,
            loadingMore: false
          }));
        }

        try {
          const result = await repository.listLeagueMembers(leagueId, {
            page,
            pageSize: LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE
          });

          if (!guard.canApply(token)) {
            return;
          }

          setMembers({
            items: result.items,
            pagination: result.pagination,
            loading: false,
            loadingMore: false,
            error: undefined
          });
        } catch (error) {
          if (!guard.canApply(token)) {
            return;
          }

          setMembers((current) => ({
            ...current,
            loading: false,
            loadingMore: false,
            error: errorToMessage(error)
          }));
        } finally {
          guard.finishReplacingRequest(token);
        }

        return;
      }

      const token = guard.beginRequest();

      if (guard.canApply(token)) {
        setMembers((current) => ({
          ...current,
          error: undefined,
          loading: !append,
          loadingMore: append
        }));
      }

      try {
        const result = await repository.listLeagueMembers(leagueId, {
          page,
          pageSize: LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE
        });

        if (!guard.canApply(token)) {
          return;
        }

        setMembers((current) => ({
          items: [...current.items, ...result.items],
          pagination: result.pagination,
          loading: false,
          loadingMore: false,
          error: undefined
        }));
      } catch (error) {
        if (!guard.canApply(token)) {
          return;
        }

        setMembers((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error: errorToMessage(error)
        }));
      } finally {
        if (append) {
          guard.finishLoadMore(token);
        }
      }
    },
    [enabled, leagueId, repository]
  );

  const loadLeaderboard = useCallback(
    async (page: number, append: boolean) => {
      if (!enabled || !repository) {
        return;
      }

      const guard = leaderboardGuardRef.current;

      if (append && !guard.tryBeginLoadMore()) {
        return;
      }

      if (!append) {
        const token = guard.beginReplacingRequest();

        if (guard.canApply(token)) {
          setLeaderboard((current) => ({
            ...current,
            error: undefined,
            loading: true,
            loadingMore: false
          }));
        }

        try {
          const result = await repository.listLatestLeaderboardEntriesForLeague(leagueId, {
            page,
            pageSize: LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE
          });

          if (!guard.canApply(token)) {
            return;
          }

          setLeaderboard({
            snapshot: result.snapshot,
            items: result.entries.items,
            pagination: result.entries.pagination,
            loading: false,
            loadingMore: false,
            error: undefined
          });
        } catch (error) {
          if (!guard.canApply(token)) {
            return;
          }

          setLeaderboard((current) => ({
            ...current,
            loading: false,
            loadingMore: false,
            error: errorToMessage(error)
          }));
        } finally {
          guard.finishReplacingRequest(token);
        }

        return;
      }

      const token = guard.beginRequest();

      if (guard.canApply(token)) {
        setLeaderboard((current) => ({
          ...current,
          error: undefined,
          loading: !append,
          loadingMore: append
        }));
      }

      try {
        const result = await repository.listLatestLeaderboardEntriesForLeague(leagueId, {
          page,
          pageSize: LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE
        });

        if (!guard.canApply(token)) {
          return;
        }

        setLeaderboard((current) => ({
          snapshot: result.snapshot,
          items: [...current.items, ...result.entries.items],
          pagination: result.entries.pagination,
          loading: false,
          loadingMore: false,
          error: undefined
        }));
      } catch (error) {
        if (!guard.canApply(token)) {
          return;
        }

        setLeaderboard((current) => ({
          ...current,
          loading: false,
          loadingMore: false,
          error: errorToMessage(error)
        }));
      } finally {
        if (append) {
          guard.finishLoadMore(token);
        }
      }
    },
    [enabled, leagueId, repository]
  );

  useEffect(() => {
    membersGuardRef.current.reset();
    leaderboardGuardRef.current.reset();
    setMembers(createInitialListState());
    setLeaderboard(createInitialLeaderboardState());

    if (!enabled) {
      return;
    }

    void loadMembers(1, false);
    void loadLeaderboard(1, false);
  }, [enabled, loadLeaderboard, loadMembers]);

  const loadMoreMembers = useCallback(() => {
    if (!members.loading && !members.loadingMore && members.pagination.hasNextPage) {
      void loadMembers(members.pagination.page + 1, true);
    }
  }, [
    loadMembers,
    members.loading,
    members.loadingMore,
    members.pagination.hasNextPage,
    members.pagination.page
  ]);

  const loadMoreLeaderboard = useCallback(() => {
    if (!leaderboard.loading && !leaderboard.loadingMore && leaderboard.pagination.hasNextPage) {
      void loadLeaderboard(leaderboard.pagination.page + 1, true);
    }
  }, [
    leaderboard.loading,
    leaderboard.loadingMore,
    leaderboard.pagination.hasNextPage,
    leaderboard.pagination.page,
    loadLeaderboard
  ]);

  const refresh = useCallback(() => {
    if (!enabled) {
      return;
    }

    void loadMembers(1, false);
    void loadLeaderboard(1, false);
  }, [enabled, loadLeaderboard, loadMembers]);

  return {
    enabled,
    members,
    leaderboard,
    loadMoreMembers,
    loadMoreLeaderboard,
    refresh
  };
}

function createInitialListState<T>(): PreviewListState<T> {
  return {
    items: [],
    pagination: {
      page: 1,
      pageSize: LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false
    },
    loading: false,
    loadingMore: false,
    error: undefined
  };
}

function createInitialLeaderboardState(): LeaderboardPreviewState {
  return {
    ...createInitialListState<LeaderboardEntryListItem>(),
    snapshot: undefined
  };
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Errore inatteso durante il caricamento.";
}
