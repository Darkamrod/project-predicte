import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const describeLocalSupabase = canUseLocalSupabase() ? describe : describe.skip;

describeLocalSupabase("Milestone 11J-C2 prediction target catalog RLS", () => {
  it("allows only active members and keeps league, edition and version scope", () => {
    setupFixture();

    try {
      expect(callDenied("anon", activeMemberId, leagueId)).toContain("permission denied");
      expect(callDenied("authenticated", nonMemberId, leagueId)).toContain(
        "active league membership required"
      );
      expect(callDenied("authenticated", removedMemberId, leagueId)).toContain(
        "active league membership required"
      );
      expect(callDenied("authenticated", activeMemberId, otherLeagueId)).toContain(
        "active league membership required"
      );

      const catalog = callCatalog(activeMemberId, leagueId);
      expect(catalog).toMatchObject({
        league_id: leagueId,
        edition_id: editionId,
        format_template_version_id: formatVersionId,
        ruleset_version_id: rulesetVersionId,
        prediction_requirement_version_id: requirementVersionId
      });
      expect(catalog.bracket_nodes).toHaveLength(32);
      expect(catalog.bracket_nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ node_key: "M73", format_template_version_id: formatVersionId }),
          expect.objectContaining({ node_key: "M104", format_template_version_id: formatVersionId })
        ])
      );
      expect(catalog.bracket_slots).toHaveLength(64);
      expect(catalog.best_third_combinations).toHaveLength(495);
      expect(
        catalog.best_third_combinations.reduce(
          (total, combination) => total + combination.assignments.length,
          0
        )
      ).toBe(3960);
      expect(catalog.antepost_definitions).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: antepostId })])
      );
      expect(catalog.tiebreak_rules).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: tiebreakId })])
      );
      expect(queryScalar(signatureSql)).toBe("true|false|true");
      const otherCatalog = callCatalog(ownerId, otherLeagueId);
      expect(otherCatalog.bracket_nodes).toEqual([]);
      expect(otherCatalog.best_third_combinations).toEqual([]);
      expect(queryScalar(countsSql)).toBe("1|1");
    } finally {
      cleanupFixture();
    }
  }, 20_000);
});

function canUseLocalSupabase(): boolean {
  try {
    return (
      queryScalar(
        "select (to_regprocedure('public.get_prediction_target_catalog(uuid)') is not null)::text"
      ) === "true"
    );
  } catch {
    return false;
  }
}

function setupFixture(): void {
  psql(`
    ${cleanupSql}

    insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('${ownerId}', 'authenticated', 'authenticated', 'c2-owner@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('${activeMemberId}', 'authenticated', 'authenticated', 'c2-active@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('${removedMemberId}', 'authenticated', 'authenticated', 'c2-removed@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
      ('${nonMemberId}', 'authenticated', 'authenticated', 'c2-outsider@example.test', now(), '{}'::jsonb, '{}'::jsonb, now(), now())
    on conflict (id) do nothing;

    insert into public.profiles (id, display_name, locale, timezone)
    values
      ('${ownerId}', 'C2 Owner', 'it-IT', 'Europe/Rome'),
      ('${activeMemberId}', 'C2 Active', 'it-IT', 'Europe/Rome'),
      ('${removedMemberId}', 'C2 Removed', 'it-IT', 'Europe/Rome'),
      ('${nonMemberId}', 'C2 Outsider', 'it-IT', 'Europe/Rome')
    on conflict (id) do nothing;

    insert into public.competition_antepost_definitions (id, edition_id, code, label, value_type, required)
    values ('${antepostId}', '${editionId}', 'TOP_SCORER', 'Capocannoniere C2', 'PLAYER', true);

    insert into public.competition_tiebreak_rules (id, edition_id, scope, sort_order, rule_code, rule_payload)
    values ('${tiebreakId}', '${editionId}', 'GROUP', 900, 'points', '{}'::jsonb);

    insert into public.leagues (id, competition_edition_id, owner_id, name, status, deadline_at, invite_settings)
    values
      ('${leagueId}', '${editionId}', '${ownerId}', 'C2 League', 'open', '2031-01-01T00:00:00Z', '{}'::jsonb),
      ('${otherLeagueId}', '${otherEditionId}', '${ownerId}', 'C2 Other League', 'open', '2031-01-01T00:00:00Z', '{}'::jsonb);

    insert into public.league_members (league_id, user_id, role, status)
    values
      ('${leagueId}', '${ownerId}', 'owner', 'active'),
      ('${leagueId}', '${activeMemberId}', 'participant', 'active'),
      ('${leagueId}', '${removedMemberId}', 'participant', 'removed'),
      ('${otherLeagueId}', '${ownerId}', 'owner', 'active');
  `);
}

function cleanupFixture(): void {
  psql(cleanupSql);
}

interface CatalogPayload {
  league_id: string;
  edition_id: string;
  format_template_version_id: string;
  ruleset_version_id: string;
  prediction_requirement_version_id: string;
  bracket_slots: Array<{ id: string; edition_id: string }>;
  bracket_nodes: Array<{ node_key: string; format_template_version_id: string }>;
  best_third_combinations: Array<{ assignments: unknown[] }>;
  antepost_definitions: Array<{ id: string }>;
  tiebreak_rules: Array<{ id: string }>;
}

function callCatalog(userId: string, targetLeagueId: string): CatalogPayload {
  const value = queryAs(
    "authenticated",
    userId,
    `select public.get_prediction_target_catalog('${targetLeagueId}'::uuid)::text`
  );
  return JSON.parse(value) as CatalogPayload;
}

function callDenied(
  role: "anon" | "authenticated",
  userId: string,
  targetLeagueId: string
): string {
  try {
    queryAs(role, userId, `select public.get_prediction_target_catalog('${targetLeagueId}'::uuid)`);
  } catch (error) {
    if (error instanceof Error) return error.message.toLowerCase();
  }
  throw new Error("Expected catalog call to be denied.");
}

function queryAs(role: "anon" | "authenticated", userId: string, sql: string): string {
  return psql(
    `
      set role ${role};
      select set_config('request.jwt.claim.role', '${role}', false);
      select set_config('request.jwt.claim.sub', '${userId}', false);
      ${sql};
    `,
    ["-t", "-A"]
  )
    .trim()
    .split(/\r?\n/)
    .at(-1)!;
}

function queryScalar(sql: string): string {
  return psql(sql, ["-t", "-A"]).trim();
}

function psql(sql: string, extraArgs: string[] = []): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "supabase_db_project-predicte",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      ...extraArgs,
      "-c",
      sql
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
}

const ownerId = "c2000000-0000-4000-8000-000000000001";
const activeMemberId = "c2000000-0000-4000-8000-000000000002";
const removedMemberId = "c2000000-0000-4000-8000-000000000003";
const nonMemberId = "c2000000-0000-4000-8000-000000000004";
const leagueId = "c2000000-0000-4000-8000-000000000010";
const otherLeagueId = "c2000000-0000-4000-8000-000000000011";
const antepostId = "c2000000-0000-4000-8000-000000000050";
const tiebreakId = "c2000000-0000-4000-8000-000000000060";
const editionId = "00000000-0000-4000-8000-000000000521";
const otherEditionId = "00000000-0000-4000-8000-000000000522";
const formatVersionId = "00000000-0000-4000-8000-000000000531";
const rulesetVersionId = "00000000-0000-4000-8000-000000000541";
const requirementVersionId = "00000000-0000-4000-8000-000000000551";

const cleanupSql = `
  delete from public.leagues where id in ('${leagueId}', '${otherLeagueId}');
  delete from public.competition_tiebreak_rules where id = '${tiebreakId}';
  delete from public.competition_antepost_definitions where id = '${antepostId}';
  delete from public.profiles where id in ('${ownerId}', '${activeMemberId}', '${removedMemberId}', '${nonMemberId}');
  delete from auth.users where id in ('${ownerId}', '${activeMemberId}', '${removedMemberId}', '${nonMemberId}');
`;

const signatureSql = `
  select
    has_function_privilege('authenticated', 'public.get_prediction_target_catalog(uuid)', 'EXECUTE')::text || '|' ||
    has_function_privilege('anon', 'public.get_prediction_target_catalog(uuid)', 'EXECUTE')::text || '|' ||
    (to_regprocedure('public.get_prediction_target_catalog(uuid,uuid)') is null)::text;
`;

const countsSql = `
  select
    (select count(*) from public.competition_antepost_definitions where id = '${antepostId}')::text || '|' ||
    (select count(*) from public.competition_tiebreak_rules where id = '${tiebreakId}')::text;
`;
