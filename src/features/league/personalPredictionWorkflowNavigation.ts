import type { PersonalPredictionCompletionState } from "@/domain/predictions/personalCompletion";

export interface PersonalPredictionWorkflowHref {
  pathname: "/league/[leagueId]/predictions";
  params: {
    leagueId: string;
  };
}

export type PersonalPredictionWorkflowAction =
  | {
      kind: "navigate";
      label: "Continua compilazione" | "Modifica pronostici";
      href: PersonalPredictionWorkflowHref;
    }
  | {
      kind: "unavailable";
      label: "Compila pronostici" | "Continua compilazione" | "Modifica pronostici";
      message: string;
    }
  | {
      kind: "locked";
      message: "La compilazione non è più modificabile.";
    };

export function resolvePersonalPredictionWorkflowAction(input: {
  leagueId: string;
  state: PersonalPredictionCompletionState;
  workflowAvailable: boolean;
}): PersonalPredictionWorkflowAction {
  if (input.state === "locked") {
    return {
      kind: "locked",
      message: "La compilazione non è più modificabile."
    };
  }

  if (input.state === "not_started") {
    return {
      kind: "unavailable",
      label: "Compila pronostici",
      message:
        "Il prediction set non è ancora disponibile. La compilazione non viene inizializzata automaticamente."
    };
  }

  const label = input.state === "complete" ? "Modifica pronostici" : "Continua compilazione";

  if (!input.workflowAvailable) {
    return {
      kind: "unavailable",
      label,
      message: "Il workflow Supabase reale non è ancora collegato a questa schermata."
    };
  }

  return {
    kind: "navigate",
    label,
    href: {
      pathname: "/league/[leagueId]/predictions",
      params: {
        leagueId: input.leagueId
      }
    }
  };
}
