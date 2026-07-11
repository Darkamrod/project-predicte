import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("league read screens source contracts", () => {
  it("wires the full participants screen to the paginated Supabase member hook", () => {
    const source = readProjectFile("src/features/participants/ParticipantsScreen.tsx");

    expect(source).toContain("useSupabaseLeagueMembersList");
    expect(source).toContain("formatSafeUserIdentity");
    expect(source).toContain("Carica altri partecipanti");
    expect(source).toContain("Supabase non configurato per questa lista partecipanti.");
    expect(source).toContain("Lega mock non trovata.");
  });

  it("wires the full leaderboard screen to latest snapshot reads by league id", () => {
    const source = readProjectFile("src/features/leaderboard/LeaderboardScreen.tsx");
    const hookSource = readProjectFile("src/features/league/useSupabaseLeagueReadScreenLists.ts");

    expect(source).toContain("useSupabaseLatestLeaderboardList");
    expect(source).toContain("formatSafeUserIdentity");
    expect(source).toContain("Nessuno snapshot leaderboard disponibile");
    expect(source).toContain("Carica altre posizioni");
    expect(hookSource).toContain("listLatestLeaderboardEntriesForLeague(leagueId");
    expect(hookSource).not.toContain("listLeaderboardEntries(");
  });

  it("keeps screen reads paginated, stale-safe, and mutation-free", () => {
    const hookSource = readProjectFile("src/features/league/useSupabaseLeagueReadScreenLists.ts");
    const overviewHookSource = readProjectFile(
      "src/features/league/useSupabaseLeagueOverviewPreview.ts"
    );
    const repositorySource = readProjectFile(
      "src/services/leagues/supabaseLeagueReadRepository.ts"
    );

    expect(hookSource).toContain("LEAGUE_READ_SCREEN_PAGE_SIZE = 20");
    expect(hookSource).toContain("createPreviewRequestGuard");
    expect(overviewHookSource).toContain("getLeaguePredictionCompletionOverview");
    expect(overviewHookSource).toContain("loadMorePredictions");
    expect(overviewHookSource).toContain("LEAGUE_OVERVIEW_PREVIEW_PAGE_SIZE = 20");
    expect(hookSource).toContain("tryBeginLoadMore");
    expect(hookSource).toContain("canApply(token)");
    expect(repositorySource).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
  });

  it("keeps identity presentation shared and avoids private profile metadata", () => {
    const participantSource = readProjectFile("src/features/participants/ParticipantsScreen.tsx");
    const leaderboardSource = readProjectFile("src/features/leaderboard/LeaderboardScreen.tsx");
    const identitySource = readProjectFile("src/features/league/userIdentity.ts");

    expect(participantSource).not.toContain("function formatUserId");
    expect(leaderboardSource).not.toContain("function formatUserId");
    expect(participantSource).toContain("member.publicIdentity?.displayName");
    expect(leaderboardSource).toContain("entry.publicIdentity?.displayName");
    expect(identitySource).toContain("formatSafeUserIdentity");
    expect(identitySource).not.toMatch(/user_metadata|raw_user_meta_data|auth\.users|avatar_url/i);
    expect(identitySource).not.toContain(".email");
    expect(`${participantSource}\n${leaderboardSource}`).not.toMatch(
      /from\("profiles"\)|from\('profiles'\)|auth\.users|user_metadata|raw_user_meta_data|\.email/i
    );
  });

  it("wires league overview to read-only prediction completion status without scoring", () => {
    const overviewSource = readProjectFile("src/features/league/LeagueOverviewScreen.tsx");
    const repositorySource = readProjectFile(
      "src/services/leagues/supabaseLeagueReadRepository.ts"
    );
    const domainSource = readProjectFile("src/domain/predictions/completionOverview.ts");

    expect(overviewSource).toContain("Avanzamento pronostici");
    expect(overviewSource).toContain("preview.predictions.summary");
    expect(overviewSource).toContain(
      "L'avanzamento complessivo sarà disponibile dopo il blocco dei pronostici."
    );
    expect(overviewSource).toContain("Nessun utente da completare in questa pagina.");
    expect(overviewSource).toMatch(/Carica altre\s+pagine per continuare la verifica\./);
    expect(overviewSource).toContain('label="Incompleti"');
    expect(overviewSource).toContain('label="Senza pronostico"');
    expect(overviewSource).not.toContain('label="Mancanti"');
    expect(overviewSource).toContain("member.publicIdentity?.displayName");
    expect(overviewSource).toContain("item.publicIdentity?.displayName");
    expect(repositorySource).toContain("getLeaguePredictionCompletionOverview");
    expect(repositorySource).toContain("listPredictionSetSummariesForUsers");
    expect(repositorySource).toContain("listAllActiveLeagueMemberUserIds");
    expect(repositorySource).toContain('availability === "pre_lock"');
    expect(repositorySource).toContain('.eq("league_id", leagueId)');
    expect(repositorySource).toContain('.eq("status", "active")');
    expect(repositorySource).toContain('.in("user_id", uniqueUserIds)');
    expect(domainSource).toContain("resolvePredictionCompletionOverviewState");
    expect(domainSource).toContain("summarizePredictionCompletionForActiveMembers");
    expect(`${overviewSource}\n${repositorySource}\n${domainSource}`).not.toMatch(
      /scorePredictionSetTournament|persist_scoring_recalculation|leaderboard_entries.*insert|world_cup|euro_2028|champions_league/i
    );
  });

  it("shows only authenticated personal prediction progress before lock", () => {
    const overviewSource = readProjectFile("src/features/league/LeagueOverviewScreen.tsx");
    const hookSource = readProjectFile("src/features/league/useSupabaseLeagueOverviewPreview.ts");
    const navigationSource = readProjectFile(
      "src/features/league/personalPredictionWorkflowNavigation.ts"
    );
    const mockOverviewSource = overviewSource.slice(
      overviewSource.indexOf("export function LeagueOverviewScreen"),
      overviewSource.indexOf("function SupabaseLeaguePreviewOnlyScreen")
    );
    const repositorySource = readProjectFile(
      "src/services/leagues/supabaseLeagueReadRepository.ts"
    );

    expect(overviewSource).toContain("I miei pronostici");
    expect(overviewSource).toContain("Non hai ancora iniziato");
    expect(navigationSource).toContain("Compila pronostici");
    expect(navigationSource).toContain("Continua compilazione");
    expect(navigationSource).toContain("Modifica pronostici");
    expect(overviewSource).toContain("Pronostici bloccati");
    expect(hookSource).toContain("auth.session?.user.id");
    expect(hookSource).toContain("personalPredictionsGuardRef");
    expect(repositorySource).toContain("getCurrentUserPredictionSetSummary");
    expect(repositorySource).toContain('.eq("league_id", leagueId)');
    expect(repositorySource).toContain('.eq("user_id", authenticatedUserId)');
    expect(repositorySource).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
    expect(overviewSource).toContain("resolvePersonalPredictionWorkflowAction");
    expect(mockOverviewSource).toContain("const personalWorkflowAction =");
    expect(mockOverviewSource.match(/action=\{personalWorkflowAction\}/g)).toHaveLength(2);
    expect(mockOverviewSource).toContain("<PredictionWorkflowLink");
    expect(overviewSource).toContain('action.kind === "navigate"');
    expect(overviewSource).toContain("styles.disabledLinkCard");
    expect(overviewSource).not.toContain('href={{ pathname: "/league/[leagueId]/predictions"');
    expect(navigationSource).toContain('pathname: "/league/[leagueId]/predictions"');
    expect(navigationSource).toContain("params: {");
    expect(navigationSource).toContain("leagueId: input.leagueId");
    expect(navigationSource).not.toMatch(/userId|insert|update|upsert|delete|rpc/i);
    expect(navigationSource).toContain("non viene inizializzata automaticamente");
    expect(navigationSource).toContain("workflow Supabase reale non è ancora collegato");
  });
});
