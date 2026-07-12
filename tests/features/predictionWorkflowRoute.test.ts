import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string): string => readFileSync(join(root, path), "utf8");

describe("authenticated prediction workflow route contracts", () => {
  it("routes non-UUID leagues to mock and UUID leagues to the Supabase loader", () => {
    const route = read("app/league/[leagueId]/predictions.tsx");
    const router = read("src/features/predictions/PredictionWorkflowRouteScreen.tsx");

    expect(route).toContain("PredictionWorkflowRouteScreen");
    expect(route).toContain("leagueId={leagueId}");
    expect(route).not.toContain("userId");
    expect(router).toContain("isSupabaseUuid(leagueId)");
    expect(router).toContain("<SupabasePredictionWorkflowScreen leagueId={leagueId}");
    expect(router).toContain("<PredictionWorkflowScreen leagueId={leagueId}");
  });

  it("derives identity from the authenticated session and guards stale responses", () => {
    const hook = read("src/features/predictions/useSupabasePredictionWorkflowLoader.ts");

    expect(hook).toContain("auth.session?.user.id");
    expect(hook).toContain("createPreviewRequestGuard");
    expect(hook).toContain("guard.canApply(token)");
    expect(hook).toContain("guardRef.current.cleanup()");
    expect(hook).toContain("guardRef.current.reset()");
    expect(hook).not.toMatch(/route.*userId|params.*userId/i);
  });

  it("keeps the UUID workflow real, conservative and free of private or trusted paths", () => {
    const screen = read("src/features/predictions/SupabasePredictionWorkflowScreen.tsx");
    const hook = read("src/features/predictions/useSupabasePredictionWorkflowLoader.ts");
    const repository = read("src/services/predictions/supabasePredictionWorkflowReadRepository.ts");
    const combined = `${screen}\n${hook}\n${repository}`;

    expect(screen).toMatch(/Nessun dato mock viene usato per\s+questo UUID\./);
    expect(screen).toContain("Prediction set non ancora inizializzato");
    expect(screen).toContain("Sola lettura");
    expect(repository).toContain('.eq("league_id", leagueId)');
    expect(repository).toContain('.eq("user_id", authenticatedUserId)');
    expect(repository).toContain('.eq("status", "active")');
    expect(combined).not.toMatch(/usePredicteMock|PredicteMockProvider/);
    expect(combined).not.toMatch(
      /from\(["']profiles["']\)|auth\.users|user_metadata|raw_user_meta_data|\.email/i
    );
    expect(combined).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(repository).toContain('"get_prediction_target_catalog"');
    expect(repository).not.toMatch(
      /save_match_prediction|upsert_prediction_tiebreak_override|upsert_antepost_prediction|update_prediction_set_completion/
    );
    expect(combined).not.toMatch(
      /service.?role|persist_scoring|leaderboard.*insert|result_ingestion/i
    );
    expect(combined).not.toMatch(/world_cup|euro_2028|champions_league/i);
  });

  it("keeps the authenticated target adapter pure and writes disabled while catalog gaps remain", () => {
    const adapter = read("src/domain/predictions/authenticatedTargetAdapter.ts");
    const screen = read("src/features/predictions/SupabasePredictionWorkflowScreen.tsx");
    const capability = read("src/features/predictions/supabasePredictionWorkflowCapability.ts");
    const combined = `${adapter}\n${screen}\n${capability}`;

    expect(adapter).not.toMatch(/react|supabase|usePredicteMock|PredicteMockProvider/i);
    expect(adapter).not.toMatch(/world_cup|euro_2028|champions_league/i);
    expect(screen).toContain("catalogReadPathAvailable: true");
    expect(screen).toContain("bracketSlotDestinationsAvailable: false");
    expect(screen).toContain("targetAdapter");
    expect(combined).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(combined).not.toMatch(
      /save_match_prediction|upsert_prediction_tiebreak_override|upsert_antepost_prediction|update_prediction_set_completion/
    );
    expect(combined).not.toMatch(/save_match_prediction|upsert_antepost_prediction/);
  });
});
