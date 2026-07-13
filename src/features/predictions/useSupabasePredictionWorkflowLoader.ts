import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createPreviewRequestGuard } from "@/features/league/leagueOverviewPreviewRequestGuard";
import {
  SupabasePredictionWorkflowAccessError,
  SupabasePredictionWorkflowReadRepository,
  type SupabasePredictionWorkflowContext
} from "@/services/predictions/supabasePredictionWorkflowReadRepository";
import { getSupabaseClient } from "@/services/supabase/client";
import { useAuth } from "@/state/AuthProvider";

export type SupabasePredictionWorkflowLoaderState =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "unauthenticated" }
  | { kind: "inaccessible"; message: string }
  | { kind: "error"; message: string }
  | { kind: "loaded"; context: SupabasePredictionWorkflowContext };

export interface SupabasePredictionWorkflowLoader {
  state: SupabasePredictionWorkflowLoaderState;
  retry(): void;
}

export function useSupabasePredictionWorkflowLoader(
  leagueId: string
): SupabasePredictionWorkflowLoader {
  const auth = useAuth();
  const client = useMemo(() => getSupabaseClient(), []);
  const repository = useMemo(
    () => (client ? new SupabasePredictionWorkflowReadRepository(client) : undefined),
    [client]
  );
  const guardRef = useRef(createPreviewRequestGuard());
  const [state, setState] = useState<SupabasePredictionWorkflowLoaderState>({ kind: "loading" });

  useEffect(
    () => () => {
      guardRef.current.cleanup();
    },
    []
  );

  const load = useCallback(async () => {
    if (!auth.isConfigured || !repository) {
      setState({ kind: "unconfigured" });
      return;
    }

    if (auth.loading) {
      setState({ kind: "loading" });
      return;
    }

    const authenticatedUserId = auth.session?.user.id;

    if (!authenticatedUserId) {
      setState({ kind: "unauthenticated" });
      return;
    }

    const guard = guardRef.current;
    const token = guard.beginReplacingRequest();

    if (guard.canApply(token)) setState({ kind: "loading" });

    try {
      const context = await repository.loadAuthenticatedWorkflow(leagueId);
      if (guard.canApply(token)) setState({ kind: "loaded", context });
    } catch (error) {
      if (!guard.canApply(token)) return;

      if (error instanceof SupabasePredictionWorkflowAccessError) {
        setState({ kind: "inaccessible", message: error.message });
      } else {
        setState({ kind: "error", message: errorToMessage(error) });
      }
    } finally {
      guard.finishReplacingRequest(token);
    }
  }, [auth.isConfigured, auth.loading, auth.session?.user.id, leagueId, repository]);

  useEffect(() => {
    guardRef.current.reset();
    void load();
  }, [load]);

  return { state, retry: () => void load() };
}

function errorToMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Errore inatteso durante il caricamento.";
}
