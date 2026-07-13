import { isLockedLeagueStatus } from "@/domain/predictions/personalCompletion";
import type { AuthenticatedPredictionTargetAdapterResult } from "@/domain/predictions/authenticatedTargetAdapter";
import type { SupabasePredictionWorkflowContext } from "@/services/predictions/supabasePredictionWorkflowReadRepository";

export type SupabasePredictionWorkflowCapability =
  | { kind: "locked"; message: string }
  | { kind: "not_started"; message: string }
  | { kind: "ready_for_resolver"; message: string }
  | { kind: "unavailable"; message: string; missingData: string[] };

export function resolveSupabasePredictionWorkflowCapability(
  context: SupabasePredictionWorkflowContext,
  targetAdapter?: AuthenticatedPredictionTargetAdapterResult
): SupabasePredictionWorkflowCapability {
  if (isLockedLeagueStatus(context.league.status)) {
    return {
      kind: "locked",
      message: "La lega è bloccata: i pronostici persistiti sono disponibili in sola lettura."
    };
  }

  if (!context.predictionSet) {
    return {
      kind: "not_started",
      message:
        "Prediction set non ancora inizializzato. Nessun record viene creato automaticamente."
    };
  }

  if (context.resolverReadiness.kind === "ready_for_resolver") {
    return {
      kind: "ready_for_resolver",
      message:
        "Read model completo per il futuro resolver. Quick Mode ed Expert Mode restano in sola lettura in C2B2."
    };
  }

  const missingData = [
    !context.edition ? "edizione competizione" : undefined,
    !context.formatTemplateVersion ? "format template version" : undefined,
    !context.rulesetVersion ? "ruleset version" : undefined,
    !context.predictionRequirementVersion ? "prediction requirement version" : undefined,
    !context.scoringPresetVersion ? "scoring preset version" : undefined,
    context.catalogMatches.length === 0 ? "target match reali" : undefined,
    ...context.resolverReadiness.blockers,
    ...(targetAdapter?.blockers ?? ["adapter completo target/bracket/antepost"])
  ].filter((item): item is string => Boolean(item));

  return {
    kind: "unavailable",
    message:
      "Il contesto Supabase è stato caricato, ma Quick Mode ed Expert Mode restano disabilitate finché il read-side non espone tutti i target reali richiesti.",
    missingData
  };
}
