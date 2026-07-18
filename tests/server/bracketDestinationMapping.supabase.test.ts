import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const describeLocalSupabase = canUseLocalSupabase() ? describe : describe.skip;

describeLocalSupabase("Milestone 11J-C2B1 official World Cup bracket catalog", () => {
  it("contains only the official World Cup 2026 catalog", () => {
    expect(queryScalar(catalogCountsSql)).toBe("32|64|495|3960|0|0");
  });

  it("matches the required FIFA fixed pairings", () => {
    expect(queryScalar(requiredPairingsSql)).toBe(
      "M73=2A/2B|M74=1E/MATRIX:E|M75=1F/2C|M79=1A/MATRIX:A|M88=2D/2G|" +
        "M89=W74/W77|M90=W73/W75|M96=W85/W87|M97=W89/W90|M100=W95/W96|" +
        "M101=W97/W98|M102=W99/W100|M103=L101/L102|M104=W101/W102"
    );
  });

  it("validates every Annexe C combination and assignment, not just totals", () => {
    expect(queryScalar(matrixIntegritySql)).toBe("0|0|0|0|0|0");
  });

  it("permanently rejects malformed combinations and assignments", () => {
    psql(validCombinationSql);
    expectRejected(duplicateGroupSql, "eight distinct group codes");
    expectRejected(outOfRangeGroupSql, "eight distinct group codes");
    expectRejected(shortCombinationSql, "eight distinct group codes");
    expectRejected(nonCanonicalCombinationSql, "canonical ordered groups");
    expectRejected(assignmentOutsideCombinationSql, "qualified combination");
    expectRejected(duplicateAssignmentDestinationSql, "unique constraint");
    expectRejected(incompleteAssignmentSetSql, "exactly eight distinct assignments");
  }, 15_000);

  it("accepts same-version nodes and rejects same-edition cross-version references", () => {
    psql(sameVersionAcceptedSql);
    expectRejected(crossVersionNodeSql, "same format version");
    expectRejected(crossVersionMatrixSql, "format version");
    expectRejected(conditionalWithoutMatrixSql, "complete compatible matrix");
  });

  it("materially enforces final slot destination constraints", () => {
    expectRejected(invalidTargetSideSql, "target_side_check");
    expectRejected(nullFinalFieldSql, "not-null constraint");
    expectRejected(duplicateDestinationSql, "unique constraint");
    expectRejected(duplicateSlotKeySql, "unique constraint");
    expectRejected(missingTargetMatchSql, "foreign key constraint");
    expectRejected(crossEditionSlotSql, "same format version");
  });
});

function canUseLocalSupabase(): boolean {
  try {
    return queryScalar("select count(*) from public.format_template_match_nodes") === "32";
  } catch {
    return false;
  }
}

function expectRejected(sql: string, expected: string): void {
  try {
    psql(sql);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message.toLowerCase()).toContain(expected.toLowerCase());
    return;
  }
  throw new Error("Expected cross-version catalog reference to be rejected.");
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

const wcVersion = "00000000-0000-4000-8000-000000000531";
const euroEdition = "00000000-0000-4000-8000-000000000522";
const championsEdition = "00000000-0000-4000-8000-000000000523";
const cloneVersion = "c2b10000-0000-4000-8000-000000000001";

const catalogCountsSql = `select
  (select count(*) from public.format_template_match_nodes where format_template_version_id='${wcVersion}')::text||'|'||
  (select count(*) from public.bracket_slots where format_template_version_id='${wcVersion}')::text||'|'||
  (select count(*) from public.format_template_best_third_combinations where format_template_version_id='${wcVersion}')::text||'|'||
  (select count(*) from public.format_template_best_third_assignments where format_template_version_id='${wcVersion}')::text||'|'||
  (select count(*) from public.bracket_slots where edition_id='${euroEdition}')::text||'|'||
  (select count(*) from public.bracket_slots where edition_id='${championsEdition}')::text`;

const requiredPairingsSql = `select string_agg(node_key||'='||home_source||'/'||away_source,'|' order by sort_order)
from (
  select n.node_key,n.sort_order,
    max(case when bs.target_side='home' then case
      when bs.source_type='GROUP_POSITION' then (bs.source_payload->>'position')||(bs.source_payload->>'groupCode')
      when bs.source_type='BEST_THIRD_MATRIX' then 'MATRIX:'||(bs.source_payload->>'winnerGroupCode')
      when bs.source_type='WINNER_OF_MATCH' then 'W'||substring(bs.source_payload->>'nodeKey' from 2)
      when bs.source_type='LOSER_OF_MATCH' then 'L'||substring(bs.source_payload->>'nodeKey' from 2) end end) home_source,
    max(case when bs.target_side='away' then case
      when bs.source_type='GROUP_POSITION' then (bs.source_payload->>'position')||(bs.source_payload->>'groupCode')
      when bs.source_type='BEST_THIRD_MATRIX' then 'MATRIX:'||(bs.source_payload->>'winnerGroupCode')
      when bs.source_type='WINNER_OF_MATCH' then 'W'||substring(bs.source_payload->>'nodeKey' from 2)
      when bs.source_type='LOSER_OF_MATCH' then 'L'||substring(bs.source_payload->>'nodeKey' from 2) end end) away_source
  from public.format_template_match_nodes n join public.bracket_slots bs on bs.target_node_id=n.id
  where n.node_key in ('M73','M74','M75','M79','M88','M89','M90','M96','M97','M100','M101','M102','M103','M104')
  group by n.node_key,n.sort_order
) checked`;

const matrixIntegritySql = `select
  (select count(*) from (select combination_key from public.format_template_best_third_combinations group by combination_key having count(*)<>1) x)::text||'|'||
  (select count(*) from public.format_template_best_third_combinations c where cardinality(c.qualified_group_codes)<>8 or (select count(distinct g) from unnest(c.qualified_group_codes) g)<>8)::text||'|'||
  (select count(*) from (select c.id from public.format_template_best_third_combinations c left join public.format_template_best_third_assignments a on a.combination_id=c.id group by c.id having count(a.id)<>8) x)::text||'|'||
  (select count(*) from public.format_template_best_third_combinations c join public.format_template_best_third_assignments a on a.combination_id=c.id where not(a.third_place_group_code=any(c.qualified_group_codes)))::text||'|'||
  (select count(*) from (select combination_id,third_place_group_code from public.format_template_best_third_assignments group by combination_id,third_place_group_code having count(*)>1) x)::text||'|'||
  (select count(*) from (select combination_id,array_agg(winner_group_code order by winner_group_code) groups from public.format_template_best_third_assignments group by combination_id having array_agg(winner_group_code order by winner_group_code)<>array['A','B','D','E','G','I','K','L']) x)::text`;

const cloneSetupSql = `
  insert into public.format_template_versions (id,competition_family_id,competition_template_id,competition_edition_id,version,status,valid_from,official_rules_source,format,stages,ranking_rule_sets,bracket_mapping_strategy)
  select '${cloneVersion}',competition_family_id,competition_template_id,competition_edition_id,'c2b1-cross-version-test','draft',valid_from,official_rules_source,format,stages,ranking_rule_sets,bracket_mapping_strategy
  from public.format_template_versions where id='${wcVersion}';
  insert into public.format_template_match_nodes (id,edition_id,format_template_version_id,node_key,round_id,target_match_id,sort_order)
  select 'c2b10000-0000-4000-8000-000000000002',edition_id,'${cloneVersion}','M73',round_id,target_match_id,sort_order
  from public.format_template_match_nodes where format_template_version_id='${wcVersion}' and node_key='M73';`;

const sameVersionAcceptedSql = `begin; ${cloneSetupSql}
  insert into public.bracket_slots (id,edition_id,round_id,format_template_version_id,target_node_id,target_match_id,target_side,target_leg,slot_key,source_type,source_payload)
  select 'c2b10000-0000-4000-8000-000000000003',edition_id,round_id,'${cloneVersion}',id,target_match_id,'home',1,'M73:home:test','LEAGUE_POSITION','{"position":1}'::jsonb
  from public.format_template_match_nodes where format_template_version_id='${cloneVersion}' and node_key='M73'; rollback;`;

const crossVersionNodeSql = `begin; ${cloneSetupSql}
  insert into public.bracket_slots (id,edition_id,round_id,format_template_version_id,target_node_id,target_match_id,target_side,target_leg,slot_key,source_type,source_payload)
  select 'c2b10000-0000-4000-8000-000000000004',edition_id,round_id,'${cloneVersion}',id,target_match_id,'home',1,'cross-version','LEAGUE_POSITION','{"position":1}'::jsonb
  from public.format_template_match_nodes where format_template_version_id='${wcVersion}' and node_key='M73';`;

const crossVersionMatrixSql = `begin; ${cloneSetupSql}
  insert into public.format_template_best_third_assignments (id,format_template_version_id,combination_id,target_node_id,target_side,winner_group_code,third_place_group_code)
  select 'c2b10000-0000-4000-8000-000000000005','${cloneVersion}',c.id,n.id,'away','A',c.qualified_group_codes[1]
  from public.format_template_best_third_combinations c cross join public.format_template_match_nodes n
  where c.format_template_version_id='${wcVersion}' and c.option_number=1 and n.format_template_version_id='${cloneVersion}' and n.node_key='M73';`;

const conditionalWithoutMatrixSql = `begin; ${cloneSetupSql}
  insert into public.bracket_slots (id,edition_id,round_id,format_template_version_id,target_node_id,target_match_id,target_side,target_leg,slot_key,source_type,source_payload)
  select 'c2b10000-0000-4000-8000-000000000006',edition_id,round_id,'${cloneVersion}',id,target_match_id,'away',1,'M73:away:conditional','BEST_THIRD_MATRIX','{"winnerGroupCode":"A"}'::jsonb
  from public.format_template_match_nodes where format_template_version_id='${cloneVersion}' and node_key='M73';`;

const combinationIdSql = `(select id from public.format_template_best_third_combinations where format_template_version_id='${wcVersion}' and option_number=1)`;
const validCombinationSql = `begin; update public.format_template_best_third_combinations set qualified_group_codes=qualified_group_codes, combination_key=combination_key where id=${combinationIdSql}; rollback;`;
const duplicateGroupSql = `begin; update public.format_template_best_third_combinations set qualified_group_codes=array['A','A','B','C','D','E','F','G'], combination_key='AABCDEFG' where id=${combinationIdSql};`;
const outOfRangeGroupSql = `begin; update public.format_template_best_third_combinations set qualified_group_codes=array['A','B','C','D','E','F','G','Z'], combination_key='ABCDEFGZ' where id=${combinationIdSql};`;
const shortCombinationSql = `begin; update public.format_template_best_third_combinations set qualified_group_codes=array['A','B','C','D','E','F','G'], combination_key='ABCDEFGH' where id=${combinationIdSql};`;
const nonCanonicalCombinationSql = `begin; update public.format_template_best_third_combinations set qualified_group_codes=array[qualified_group_codes[8],qualified_group_codes[7],qualified_group_codes[6],qualified_group_codes[5],qualified_group_codes[4],qualified_group_codes[3],qualified_group_codes[2],qualified_group_codes[1]], combination_key=combination_key where id=${combinationIdSql};`;
const assignmentOutsideCombinationSql = `begin; update public.format_template_best_third_assignments set third_place_group_code='A' where combination_id=${combinationIdSql} and winner_group_code='A';`;
const duplicateAssignmentDestinationSql = `begin; update public.format_template_best_third_assignments target set target_node_id=source.target_node_id,target_side=source.target_side from public.format_template_best_third_assignments source where target.combination_id=${combinationIdSql} and source.combination_id=target.combination_id and target.winner_group_code='B' and source.winner_group_code='A';`;
const incompleteAssignmentSetSql = `begin; delete from public.format_template_best_third_assignments where combination_id=${combinationIdSql} and winner_group_code='A'; commit;`;

const firstSlotSql = `(select id from public.bracket_slots where format_template_version_id='${wcVersion}' order by id limit 1)`;
const invalidTargetSideSql = `begin; update public.bracket_slots set target_side='center' where id=${firstSlotSql};`;
const nullFinalFieldSql = `begin; alter table public.bracket_slots disable trigger bracket_slots_validate_versioned_node; update public.bracket_slots set target_node_id=null where id=${firstSlotSql};`;
const duplicateDestinationSql = `begin; insert into public.bracket_slots (id,edition_id,round_id,format_template_version_id,target_node_id,target_match_id,target_side,target_leg,slot_key,source_type,source_payload) select gen_random_uuid(),edition_id,round_id,format_template_version_id,target_node_id,target_match_id,target_side,target_leg,'duplicate-destination','LEAGUE_POSITION','{"position":999}'::jsonb from public.bracket_slots where id=${firstSlotSql};`;
const duplicateSlotKeySql = `begin; update public.bracket_slots target set slot_key=(select source.slot_key from public.bracket_slots source where source.id<>target.id order by source.id limit 1) where target.id=${firstSlotSql};`;
const missingTargetMatchSql = `begin; alter table public.bracket_slots disable trigger bracket_slots_validate_versioned_node; update public.bracket_slots set target_match_id='ffffffff-ffff-4fff-8fff-ffffffffffff' where id=${firstSlotSql};`;
const crossEditionSlotSql = `begin; update public.bracket_slots set edition_id='00000000-0000-4000-8000-000000000522' where id=${firstSlotSql};`;
