import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const describeLocalSupabase = canUseLocalSupabase() ? describe : describe.skip;

describeLocalSupabase("Milestone 7 authenticated Supabase RLS", () => {
  it("allows member reads while denying client writes to trusted scoring/provider tables", () => {
    setupFixture();

    try {
      expect(
        queryCountAs("authenticated", ownerId, "select count(*) from public.scoring_events")
      ).toBe(1);
      expect(
        queryCountAs("authenticated", adminId, "select count(*) from public.result_ingestion_runs")
      ).toBe(1);
      expect(
        queryCountAs("authenticated", memberId, "select count(*) from public.leaderboard_entries")
      ).toBe(1);
      expect(
        queryCountAs("authenticated", memberId, "select count(*) from public.result_ingestion_runs")
      ).toBe(0);
      expect(
        queryCountAs("authenticated", nonMemberId, "select count(*) from public.scoring_events")
      ).toBe(0);
      expect(
        queryDeniedAs("anon", nonMemberId, "select count(*) from public.scoring_events")
      ).toContain("permission denied");
      expect(queryScalar(clientWriteGrantSql)).toBe("0");
      expect(queryScalar(clientRpcGrantSql)).toBe("false|false|false|false|false|false");
      expect(queryScalar(serviceRoleRpcGrantSql)).toBe("true|true|true");
    } finally {
      cleanupFixture();
    }
  });
});

function canUseLocalSupabase(): boolean {
  try {
    const milestone7Ready = psql(
      `
        select (
          to_regprocedure('public.trusted_provider_retry_candidates(integer)') is not null
          and exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'result_ingestion_runs'
              and column_name = 'failure_kind'
          )
        )::text;
      `,
      ["-t", "-A"]
    ).trim();

    return milestone7Ready === "true";
  } catch {
    return false;
  }
}

function setupFixture(): void {
  psql(`
    ${cleanupSql}

    insert into auth.users (id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values
      ('${ownerId}', 'authenticated', 'authenticated', 'm7-owner@example.test', now(), '{}'::jsonb, '{"display_name":"M7 Owner"}'::jsonb, now(), now()),
      ('${adminId}', 'authenticated', 'authenticated', 'm7-admin@example.test', now(), '{}'::jsonb, '{"display_name":"M7 Admin"}'::jsonb, now(), now()),
      ('${memberId}', 'authenticated', 'authenticated', 'm7-member@example.test', now(), '{}'::jsonb, '{"display_name":"M7 Member"}'::jsonb, now(), now()),
      ('${nonMemberId}', 'authenticated', 'authenticated', 'm7-outsider@example.test', now(), '{}'::jsonb, '{"display_name":"M7 Outsider"}'::jsonb, now(), now())
    on conflict (id) do update set updated_at = excluded.updated_at;

    insert into public.profiles (id, display_name, locale, timezone)
    values
      ('${ownerId}', 'M7 Owner', 'it-IT', 'Europe/Rome'),
      ('${adminId}', 'M7 Admin', 'it-IT', 'Europe/Rome'),
      ('${memberId}', 'M7 Member', 'it-IT', 'Europe/Rome'),
      ('${nonMemberId}', 'M7 Outsider', 'it-IT', 'Europe/Rome')
    on conflict (id) do update set display_name = excluded.display_name;

    insert into public.leagues (id, competition_edition_id, owner_id, name, status, deadline_at, invite_settings)
    values ('${leagueId}', '${editionId}', '${ownerId}', 'M7 RLS Fixture', 'locked', '2030-06-08T18:30:00Z', '{}'::jsonb);

    insert into public.league_scoring_rule_versions (
      id,
      league_id,
      version,
      status,
      schema_version,
      config,
      checksum,
      created_by,
      locked_at
    )
    select
      '${ruleId}',
      '${leagueId}',
      1,
      'locked',
      1,
      config,
      'm7-checksum',
      '${ownerId}',
      now()
    from public.scoring_presets
    where id = '${presetId}';

    update public.leagues
    set current_scoring_rule_version_id = '${ruleId}'
    where id = '${leagueId}';

    insert into public.league_members (league_id, user_id, role, status)
    values
      ('${leagueId}', '${ownerId}', 'owner', 'active'),
      ('${leagueId}', '${adminId}', 'admin', 'active'),
      ('${leagueId}', '${memberId}', 'participant', 'active');

    insert into public.scoring_events (
      id,
      event_key,
      league_id,
      participant_user_id,
      competition_edition_id,
      reference_id,
      scoring_rule_version_id,
      event_type,
      points,
      reason,
      calculation_version,
      source_result_key
    )
    values (
      '${eventId}',
      'm7-event',
      '${leagueId}',
      '${memberId}',
      '${editionId}',
      'm7-match',
      '${ruleId}',
      'EXACT_SCORE',
      10,
      'M7 exact score',
      'm7-test',
      '${sourceResultKey}'
    );

    insert into public.leaderboard_snapshots (id, league_id, snapshot_key, source_result_key)
    values ('${snapshotId}', '${leagueId}', 'm7-snapshot', '${sourceResultKey}');

    insert into public.leaderboard_entries (snapshot_id, user_id, rank, total_points, latest_points, position_delta, tied)
    values ('${snapshotId}', '${memberId}', 1, 10, 10, 0, false);

    insert into public.scoring_breakdown_items (
      breakdown_key,
      league_id,
      participant_user_id,
      scoring_event_id,
      source_result_key,
      scope,
      reference_id,
      event_type,
      points,
      reason
    )
    values (
      'm7-breakdown',
      '${leagueId}',
      '${memberId}',
      '${eventId}',
      '${sourceResultKey}',
      'MATCH',
      'm7-match',
      'EXACT_SCORE',
      10,
      'M7 exact score'
    );

    insert into public.scoring_recalculation_runs (id, league_id, source_result_key, snapshot_id, status, reason)
    values ('${recalculationRunId}', '${leagueId}', '${sourceResultKey}', '${snapshotId}', 'succeeded', 'm7_rls_test');

    insert into public.result_ingestion_runs (
      id,
      league_id,
      source_result_key,
      payload,
      status,
      trusted_actor,
      provider,
      external_fixture_key,
      correction_status,
      failure_kind
    )
    values (
      '${ingestionRunId}',
      '${leagueId}',
      '${sourceResultKey}',
      '{}'::jsonb,
      'scored',
      'm7-test',
      'MOCK_RESULTS',
      'm7-fixture',
      'not_required',
      'none'
    );
  `);
}

function cleanupFixture(): void {
  psql(cleanupSql);
}

function queryCountAs(role: "anon" | "authenticated", userId: string, sql: string): number {
  const result = psql(
    `
      set role ${role};
      select set_config('request.jwt.claim.role', '${role}', false);
      select set_config('request.jwt.claim.sub', '${userId}', false);
      ${sql};
    `,
    ["-t", "-A"]
  );
  const lines = result
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));
  const count = lines.at(-1);

  if (!count) {
    throw new Error(`Expected numeric query result. Output: ${result}`);
  }

  return Number(count);
}

function queryDeniedAs(role: "anon" | "authenticated", userId: string, sql: string): string {
  try {
    queryCountAs(role, userId, sql);
  } catch (error) {
    if (error instanceof Error) {
      return error.message.toLowerCase();
    }
  }

  throw new Error("Expected query to be denied.");
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
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

const ownerId = "71111111-1111-4111-8111-111111111111";
const adminId = "72222222-2222-4222-8222-222222222222";
const memberId = "73333333-3333-4333-8333-333333333333";
const nonMemberId = "74444444-4444-4444-8444-444444444444";
const leagueId = "75555555-5555-4555-8555-555555555555";
const ruleId = "76666666-6666-4666-8666-666666666666";
const eventId = "77777777-7777-4777-8777-777777777777";
const snapshotId = "78888888-8888-4888-8888-888888888888";
const recalculationRunId = "79999999-9999-4999-8999-999999999999";
const ingestionRunId = "7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const editionId = "00000000-0000-4000-8000-000000000003";
const presetId = "00000000-0000-4000-8000-000000000301";
const sourceResultKey = "m7-source-result";

const cleanupSql = `
  delete from public.result_ingestion_runs where id = '${ingestionRunId}';
  delete from public.scoring_recalculation_runs where id = '${recalculationRunId}';
  delete from public.scoring_breakdown_items where breakdown_key = 'm7-breakdown';
  delete from public.leaderboard_entries where snapshot_id = '${snapshotId}';
  delete from public.leaderboard_snapshots where id = '${snapshotId}';
  delete from public.scoring_events where id = '${eventId}';
  delete from public.leagues where id = '${leagueId}';
  delete from public.profiles where id in ('${ownerId}', '${adminId}', '${memberId}', '${nonMemberId}');
  delete from auth.users where id in ('${ownerId}', '${adminId}', '${memberId}', '${nonMemberId}');
`;

const clientWriteGrantSql = `
  select count(*)::text
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'scoring_events',
      'leaderboard_snapshots',
      'leaderboard_entries',
      'scoring_breakdown_items',
      'scoring_recalculation_runs',
      'result_ingestion_runs',
      'sync_runs',
      'provider_payloads'
    )
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE');
`;

const serviceRoleRpcGrantSql = `
  select
    has_function_privilege(
      'service_role',
      'public.record_provider_result_import(uuid,text,text,text,jsonb,text,text,text,integer,integer,timestamptz)',
      'EXECUTE'
    )::text || '|' ||
    has_function_privilege('service_role', 'public.trusted_result_ingestion_exists(uuid,text)', 'EXECUTE')::text || '|' ||
    has_function_privilege('service_role', 'public.trusted_provider_retry_candidates(integer)', 'EXECUTE')::text;
`;

const clientRpcGrantSql = `
  select
    has_function_privilege(
      'anon',
      'public.record_provider_result_import(uuid,text,text,text,jsonb,text,text,text,integer,integer,timestamptz)',
      'EXECUTE'
    )::text || '|' ||
    has_function_privilege(
      'authenticated',
      'public.record_provider_result_import(uuid,text,text,text,jsonb,text,text,text,integer,integer,timestamptz)',
      'EXECUTE'
    )::text || '|' ||
    has_function_privilege('anon', 'public.trusted_result_ingestion_exists(uuid,text)', 'EXECUTE')::text || '|' ||
    has_function_privilege('authenticated', 'public.trusted_result_ingestion_exists(uuid,text)', 'EXECUTE')::text || '|' ||
    has_function_privilege('anon', 'public.trusted_provider_retry_candidates(integer)', 'EXECUTE')::text || '|' ||
    has_function_privilege('authenticated', 'public.trusted_provider_retry_candidates(integer)', 'EXECUTE')::text;
`;
