import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const describeLocalSupabase = canUseLocalSupabase() ? describe : describe.skip;
const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260713020000_milestone11j_c2b2_world_cup_2026_initial_catalog.sql"
);

describeLocalSupabase("Milestone 11J-C2B2 official World Cup initial catalog", () => {
  it("records the authorized FIFA source without committing the PDF", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain("FIFA World Cup 2026 Match Schedule, 12 July 2026");
    expect(migration).toContain("1FFA43834656742AA69B9D5B98F826052BBD26B2E353161F7FA83DC97416D4EB");
    expect(migration).not.toMatch(/home_goals|away_goals|qualified_team|winner_team/i);
  });

  it("materially validates teams, groups, round-robin matches and no results", () => {
    expect(queryScalar(integritySql)).toBe("48|48|12|0|72|0|0|0|0|72|0");
    expect(() => psql("select public.validate_world_cup_2026_initial_catalog();")).not.toThrow();
  });

  it("keeps stable ids, memberships and fixtures across repeated population", () => {
    expect(() => psql(idempotenceSql)).not.toThrow();
  });

  it("rejects malformed catalog mutations", () => {
    expectRejected(fifthTeamSql);
    expectRejected(crossGroupSql);
    expectRejected(crossEditionSql);
    expectRejected(homeEqualsAwaySql);
    expectRejected(duplicateMatchNumberSql);
    expectRejected(missingParticipantSql);
    expectRejected(duplicatePairingSql);
  }, 20_000);
});

function canUseLocalSupabase(): boolean {
  try {
    return (
      queryScalar(
        "select (to_regprocedure('public.validate_world_cup_2026_initial_catalog()') is not null)::text"
      ) === "true"
    );
  } catch {
    return false;
  }
}

function psql(sql: string): string {
  return execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_project-predicte",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
      "-c",
      sql
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
}

function queryScalar(sql: string): string {
  return psql(sql);
}

function expectRejected(sql: string): void {
  expect(() => psql(`begin; ${sql}; rollback;`)).toThrow();
}

const editionId = "00000000-0000-4000-8000-000000000521";
const integritySql = `
with group_stage as (
  select id from public.stages where edition_id='${editionId}' and code='GROUP_STAGE'
), group_counts as (
  select g.id, count(et.team_id) team_count
  from public.groups g left join public.edition_teams et on et.edition_id=g.edition_id and et.seed_group_id=g.id
  where g.edition_id='${editionId}' and g.stage_id=(select id from group_stage) group by g.id
), match_counts as (
  select g.id, count(m.id) match_count
  from public.groups g left join public.matches m on m.edition_id=g.edition_id and m.group_id=g.id and m.stage_id=(select id from group_stage)
  where g.edition_id='${editionId}' and g.stage_id=(select id from group_stage) group by g.id
), appearances as (
  select home_team_id team_id from public.matches where edition_id='${editionId}' and stage_id=(select id from group_stage)
  union all select away_team_id from public.matches where edition_id='${editionId}' and stage_id=(select id from group_stage)
), pairs as (
  select least(home_team_id,away_team_id), greatest(home_team_id,away_team_id), count(*) pair_count
  from public.matches where edition_id='${editionId}' and stage_id=(select id from group_stage)
  group by 1,2
), invalid_participants as (
  select m.id from public.matches m
  join public.edition_teams h on h.edition_id=m.edition_id and h.team_id=m.home_team_id
  join public.edition_teams a on a.edition_id=m.edition_id and a.team_id=m.away_team_id
  where m.edition_id='${editionId}' and m.stage_id=(select id from group_stage)
    and (m.home_team_id=m.away_team_id or h.seed_group_id<>m.group_id or a.seed_group_id<>m.group_id)
)
select
  (select count(*) from public.edition_teams where edition_id='${editionId}') || '|' ||
  (select count(distinct t.fifa_code) from public.edition_teams et join public.teams t on t.id=et.team_id where et.edition_id='${editionId}') || '|' ||
  (select count(*) from public.groups where edition_id='${editionId}' and stage_id=(select id from group_stage)) || '|' ||
  (select count(*) from group_counts where team_count<>4) || '|' ||
  (select count(*) from public.matches where edition_id='${editionId}' and stage_id=(select id from group_stage)) || '|' ||
  (select count(*) from match_counts where match_count<>6) || '|' ||
  (select count(*) from (select team_id from appearances group by team_id having count(*)<>3) invalid) || '|' ||
  (select count(*) from pairs where pair_count<>1) || '|' ||
  (select count(*) from invalid_participants) || '|' ||
  (select count(distinct (bracket_payload->>'officialMatchNumber')::int) from public.matches where edition_id='${editionId}' and stage_id=(select id from group_stage)) || '|' ||
  (select count(*) from public.match_result_versions r join public.matches m on m.id=r.match_id where m.edition_id='${editionId}' and m.stage_id=(select id from group_stage));`;

const fifthTeamSql = `insert into public.teams(id,name,short_name,country_code,fifa_code) values('c2b2ffff-0000-4000-8000-000000000001','Test','ZZZ','ZZZ','ZZZ'); insert into public.edition_teams select '${editionId}','c2b2ffff-0000-4000-8000-000000000001',id from public.groups where edition_id='${editionId}' and code='A'; select public.validate_world_cup_2026_initial_catalog()`;
const crossGroupSql = `update public.matches set away_team_id=(select et.team_id from public.edition_teams et join public.teams t on t.id=et.team_id where et.edition_id='${editionId}' and t.fifa_code='CAN') where id='c2b21000-0000-4000-8000-000000000001'; select public.validate_world_cup_2026_initial_catalog()`;
const crossEditionSql = `update public.matches set home_team_id='00000000-0000-4000-8000-000000000101' where id='c2b21000-0000-4000-8000-000000000001'`;
const homeEqualsAwaySql = `update public.matches set away_team_id=home_team_id where id='c2b21000-0000-4000-8000-000000000001'`;
const duplicateMatchNumberSql = `update public.matches set bracket_payload=jsonb_set(bracket_payload,'{officialMatchNumber}','1') where id='c2b21000-0000-4000-8000-000000000002'`;
const missingParticipantSql = `update public.matches set away_team_id=null where id='c2b21000-0000-4000-8000-000000000001'; select public.validate_world_cup_2026_initial_catalog()`;
const duplicatePairingSql = `update public.matches set home_team_id=(select home_team_id from public.matches where id='c2b21000-0000-4000-8000-000000000001'), away_team_id=(select away_team_id from public.matches where id='c2b21000-0000-4000-8000-000000000001') where id='c2b21000-0000-4000-8000-000000000002'; select public.validate_world_cup_2026_initial_catalog()`;

const idempotenceSql = `
do $$
declare
  before_signature text;
  after_signature text;
begin
  select md5(jsonb_build_object(
    'teams', (select jsonb_agg(jsonb_build_array(t.id, t.fifa_code, t.name, t.short_name) order by t.id)
      from public.teams t join public.edition_teams et on et.team_id = t.id where et.edition_id = '${editionId}'),
    'memberships', (select jsonb_agg(jsonb_build_array(et.team_id, et.seed_group_id) order by et.team_id)
      from public.edition_teams et where et.edition_id = '${editionId}'),
    'matches', (select jsonb_agg(jsonb_build_array(m.id, m.sort_order, m.home_team_id, m.away_team_id, m.group_id) order by m.sort_order)
      from public.matches m where m.edition_id = '${editionId}' and m.group_id is not null)
  )::text) into before_signature;

  perform public.populate_world_cup_2026_initial_catalog();
  perform public.populate_world_cup_2026_initial_catalog();

  select md5(jsonb_build_object(
    'teams', (select jsonb_agg(jsonb_build_array(t.id, t.fifa_code, t.name, t.short_name) order by t.id)
      from public.teams t join public.edition_teams et on et.team_id = t.id where et.edition_id = '${editionId}'),
    'memberships', (select jsonb_agg(jsonb_build_array(et.team_id, et.seed_group_id) order by et.team_id)
      from public.edition_teams et where et.edition_id = '${editionId}'),
    'matches', (select jsonb_agg(jsonb_build_array(m.id, m.sort_order, m.home_team_id, m.away_team_id, m.group_id) order by m.sort_order)
      from public.matches m where m.edition_id = '${editionId}' and m.group_id is not null)
  )::text) into after_signature;

  if before_signature is distinct from after_signature then
    raise exception 'World Cup initial catalog population is not idempotent';
  end if;
end $$;
`;
