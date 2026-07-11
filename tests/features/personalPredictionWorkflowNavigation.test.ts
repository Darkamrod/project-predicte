import { describe, expect, it } from "vitest";

import { resolvePersonalPredictionCompletion } from "@/domain/predictions/personalCompletion";
import { resolvePersonalPredictionWorkflowAction } from "@/features/league/personalPredictionWorkflowNavigation";

describe("personal prediction workflow navigation", () => {
  const leagueId = "00000000-0000-4000-8000-000000000100";

  it("routes incomplete and complete editable mock states using leagueId only", () => {
    expect(
      resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: "incomplete",
        workflowAvailable: true
      })
    ).toEqual({
      kind: "navigate",
      label: "Continua compilazione",
      href: {
        pathname: "/league/[leagueId]/predictions",
        params: { leagueId }
      }
    });
    expect(
      resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: "complete",
        workflowAvailable: true
      })
    ).toMatchObject({
      kind: "navigate",
      label: "Modifica pronostici",
      href: { params: { leagueId } }
    });

    expect(
      JSON.stringify(
        resolvePersonalPredictionWorkflowAction({
          leagueId,
          state: "incomplete",
          workflowAvailable: true
        })
      )
    ).not.toContain("userId");
  });

  it("keeps not-started explicit when no safe initialization path exists", () => {
    expect(
      resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: "not_started",
        workflowAvailable: false
      })
    ).toEqual({
      kind: "unavailable",
      label: "Compila pronostici",
      message:
        "Il prediction set non è ancora disponibile. La compilazione non viene inizializzata automaticamente."
    });
  });

  it("does not navigate when the Supabase workflow is unavailable", () => {
    expect(
      resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: "incomplete",
        workflowAvailable: false
      })
    ).toEqual({
      kind: "unavailable",
      label: "Continua compilazione",
      message: "Il workflow Supabase reale non è ancora collegato a questa schermata."
    });
  });

  it("removes the editing action after lock", () => {
    expect(
      resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: "locked",
        workflowAvailable: true
      })
    ).toEqual({
      kind: "locked",
      message: "La compilazione non è più modificabile."
    });
  });

  it.each(["locked", "live", "completed", "archived"])(
    "maps the %s lifecycle to a locked action without navigation",
    (leagueStatus) => {
      const completion = resolvePersonalPredictionCompletion(
        { completedItems: 4, totalRequired: 10 },
        leagueStatus
      );
      const action = resolvePersonalPredictionWorkflowAction({
        leagueId,
        state: completion.state,
        workflowAvailable: true
      });

      expect(completion).toMatchObject({ state: "locked", canEdit: false });
      expect(action).toEqual({
        kind: "locked",
        message: "La compilazione non è più modificabile."
      });
      expect(action).not.toHaveProperty("href");
    }
  );
});
