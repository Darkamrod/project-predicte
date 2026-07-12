-- Milestone 11J-C2B1-3: validate the official catalog, then enforce final invariants.

do $$
declare
  problem public.bracket_slots%rowtype;
begin
  select * into problem from public.bracket_slots bs
  where bs.format_template_version_id is null or bs.target_node_id is null
     or bs.target_match_id is null or bs.target_side is null or bs.target_leg is null
     or nullif(btrim(bs.slot_key), '') is null
  order by bs.edition_id, bs.id limit 1;

  if found then
    raise exception 'Unresolved legacy bracket slot: violation_type=missing_destination_fields bracket_slot_id=% edition_id=% format_template_version_id=% round_id=% target_match_id=% source_type=% source_payload=%',
      problem.id, problem.edition_id,
      coalesce(problem.format_template_version_id::text, '<null>'), problem.round_id,
      coalesce(problem.target_match_id::text, '<null>'), problem.source_type, problem.source_payload;
  end if;

  if exists (
    select 1 from public.format_template_match_nodes n
    join public.format_template_versions v on v.id = n.format_template_version_id
    join public.matches m on m.id = n.target_match_id
    join public.rounds r on r.id = n.round_id
    where v.competition_edition_id <> n.edition_id or m.edition_id <> n.edition_id
       or r.edition_id <> n.edition_id or m.round_id is distinct from n.round_id
  ) then raise exception 'Bracket node edition/version/round validation failed'; end if;

  if exists (
    select 1 from public.bracket_slots bs
    join public.format_template_match_nodes n
      on n.id = bs.target_node_id and n.format_template_version_id = bs.format_template_version_id
    where bs.edition_id <> n.edition_id or bs.round_id <> n.round_id
       or bs.target_match_id <> n.target_match_id
  ) then raise exception 'Bracket slot target node validation failed'; end if;

  if exists (
    select 1 from public.format_template_best_third_combinations c
    where cardinality(c.qualified_group_codes) <> 8
       or (select count(distinct code) from unnest(c.qualified_group_codes) code) <> 8
       or c.combination_key <> (select string_agg(code, '' order by code) from unnest(c.qualified_group_codes) code)
       or exists (select 1 from unnest(c.qualified_group_codes) code where code !~ '^[A-L]$')
  ) then raise exception 'Best-third combination integrity validation failed'; end if;

  if exists (
    select 1 from public.format_template_best_third_combinations c
    left join public.format_template_best_third_assignments a on a.combination_id = c.id
    group by c.id having count(a.id) <> 8
      or count(distinct a.winner_group_code) <> 8
      or count(distinct a.third_place_group_code) <> 8
  ) then raise exception 'Best-third assignment cardinality validation failed'; end if;

  if exists (
    select 1 from public.format_template_best_third_assignments a
    join public.format_template_best_third_combinations c on c.id = a.combination_id
    where not (a.third_place_group_code = any(c.qualified_group_codes))
       or a.winner_group_code not in ('A','B','D','E','G','I','K','L')
       or a.target_side <> 'away'
  ) then raise exception 'Best-third assignment source/destination validation failed'; end if;
end $$;

alter table public.bracket_slots
  alter column format_template_version_id set not null,
  alter column target_node_id set not null,
  alter column target_match_id set not null,
  alter column target_side set not null,
  alter column target_leg set not null,
  alter column slot_key set not null,
  drop constraint bracket_slots_target_side_transitional_check,
  drop constraint bracket_slots_target_leg_transitional_check,
  add constraint bracket_slots_target_side_check check (target_side in ('home','away')),
  add constraint bracket_slots_target_leg_check check (target_leg > 0),
  add constraint bracket_slots_source_type_check check (
    source_type in ('GROUP_POSITION','BEST_THIRD_MATRIX','LEAGUE_POSITION','WINNER_OF_MATCH','LOSER_OF_MATCH')
  );

alter table public.format_template_match_nodes
  add constraint format_template_match_nodes_node_key_check check (node_key ~ '^M[0-9]+$'),
  add constraint format_template_match_nodes_sort_order_check check (sort_order > 0);

alter table public.format_template_best_third_combinations
  add constraint best_third_combinations_option_check check (option_number > 0),
  add constraint best_third_combinations_key_check check (combination_key ~ '^[A-L]{8}$'),
  add constraint best_third_combinations_group_count_check check (cardinality(qualified_group_codes) = 8);

alter table public.format_template_best_third_assignments
  add constraint best_third_assignments_side_check check (target_side in ('home','away')),
  add constraint best_third_assignments_winner_group_check check (winner_group_code ~ '^[A-L]$'),
  add constraint best_third_assignments_third_group_check check (third_place_group_code ~ '^[A-L]$');

create unique index bracket_slots_version_target_side_idx
on public.bracket_slots (format_template_version_id, target_node_id, target_leg, target_side);
create unique index bracket_slots_version_slot_key_idx
on public.bracket_slots (format_template_version_id, slot_key);
create unique index bracket_slots_version_source_idx
on public.bracket_slots (format_template_version_id, source_type, source_payload);
create index best_third_assignments_version_node_idx
on public.format_template_best_third_assignments (format_template_version_id, target_node_id);

create or replace function public.validate_best_third_combination()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  canonical_codes text[];
  canonical_key text;
begin
  if new.qualified_group_codes is null or cardinality(new.qualified_group_codes) <> 8
     or exists (select 1 from unnest(new.qualified_group_codes) code where code is null or code !~ '^[A-L]$')
     or (select count(distinct code) from unnest(new.qualified_group_codes) code) <> 8 then
    raise exception 'Best-third combination % requires eight distinct group codes from A to L', new.id;
  end if;

  select array_agg(code order by code), string_agg(code, '' order by code)
  into canonical_codes, canonical_key
  from unnest(new.qualified_group_codes) code;

  if new.qualified_group_codes <> canonical_codes or new.combination_key <> canonical_key then
    raise exception 'Best-third combination % must use canonical ordered groups and key %', new.id, canonical_key;
  end if;

  if tg_op = 'UPDATE' and exists (
    select 1 from public.format_template_best_third_assignments a
    where a.combination_id = new.id and not (a.third_place_group_code = any(new.qualified_group_codes))
  ) then
    raise exception 'Best-third combination % would orphan an existing source assignment', new.id;
  end if;
  return new;
end;
$$;

create or replace function public.validate_best_third_assignment_set()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  affected_combination_id uuid := coalesce(new.combination_id, old.combination_id);
  assignment_count integer;
  destination_count integer;
  source_count integer;
begin
  if not exists (select 1 from public.format_template_best_third_combinations where id = affected_combination_id) then
    return null;
  end if;
  select count(*), count(distinct (target_node_id, target_side)), count(distinct third_place_group_code)
  into assignment_count, destination_count, source_count
  from public.format_template_best_third_assignments where combination_id = affected_combination_id;
  if assignment_count <> 8 or destination_count <> 8 or source_count <> 8 then
    raise exception 'Best-third combination % requires exactly eight distinct assignments, destinations and source groups', affected_combination_id;
  end if;
  return null;
end;
$$;

revoke all on function public.validate_best_third_combination() from public, anon, authenticated;
revoke all on function public.validate_best_third_assignment_set() from public, anon, authenticated;

create trigger best_third_combinations_validate
before insert or update on public.format_template_best_third_combinations
for each row execute function public.validate_best_third_combination();

create constraint trigger best_third_assignment_set_validate
after insert or update or delete on public.format_template_best_third_assignments
deferrable initially deferred
for each row execute function public.validate_best_third_assignment_set();

create or replace function public.validate_versioned_bracket_catalog_row()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  node public.format_template_match_nodes%rowtype;
  version_edition uuid;
begin
  if tg_table_name = 'format_template_match_nodes' then
    select competition_edition_id into version_edition from public.format_template_versions where id = new.format_template_version_id;
    if version_edition is distinct from new.edition_id
       or not exists (select 1 from public.matches where id = new.target_match_id and edition_id = new.edition_id and round_id = new.round_id)
       or not exists (select 1 from public.rounds where id = new.round_id and edition_id = new.edition_id) then
      raise exception 'Bracket node references must share edition, format version and round';
    end if;
  elsif tg_table_name = 'bracket_slots' then
    select * into node from public.format_template_match_nodes
    where id = new.target_node_id and format_template_version_id = new.format_template_version_id;
    if not found or node.edition_id <> new.edition_id or node.round_id <> new.round_id
       or node.target_match_id <> new.target_match_id then
      raise exception 'Bracket slot must target a node from the same format version';
    end if;
    if new.source_type = 'BEST_THIRD_MATRIX' and (
      nullif(new.source_payload ->> 'winnerGroupCode', '') is null
      or not exists (
        select 1 from public.format_template_best_third_combinations c
        where c.format_template_version_id = new.format_template_version_id
      )
      or exists (
        select 1 from public.format_template_best_third_combinations c
        where c.format_template_version_id = new.format_template_version_id
          and not exists (
            select 1 from public.format_template_best_third_assignments a
            where a.combination_id = c.id
              and a.format_template_version_id = new.format_template_version_id
              and a.target_node_id = new.target_node_id
              and a.target_side = new.target_side
              and a.winner_group_code = new.source_payload ->> 'winnerGroupCode'
          )
      )
    ) then
      raise exception 'Conditional bracket slot requires a complete compatible matrix';
    end if;
  else
    select * into node from public.format_template_match_nodes
    where id = new.target_node_id and format_template_version_id = new.format_template_version_id;
    if not found or not exists (
      select 1 from public.format_template_best_third_combinations c
      where c.id = new.combination_id and c.format_template_version_id = new.format_template_version_id
        and new.third_place_group_code = any(c.qualified_group_codes)
    ) then raise exception 'Best-third assignment must share format version and qualified combination'; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_versioned_bracket_catalog_row() from public, anon, authenticated;

create trigger format_template_match_nodes_validate
before insert or update on public.format_template_match_nodes
for each row execute function public.validate_versioned_bracket_catalog_row();
create trigger bracket_slots_validate_versioned_node
before insert or update on public.bracket_slots
for each row execute function public.validate_versioned_bracket_catalog_row();
create trigger best_third_assignments_validate
before insert or update on public.format_template_best_third_assignments
for each row execute function public.validate_versioned_bracket_catalog_row();

create or replace function public.get_prediction_target_catalog(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_league public.leagues%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  select l.* into target_league from public.leagues l
  join public.league_members lm on lm.league_id = l.id and lm.user_id = caller_id and lm.status = 'active'
  where l.id = p_league_id;
  if not found then raise exception 'Active league membership required'; end if;
  if target_league.format_template_version_id is null
     or not exists (select 1 from public.format_template_versions v
       where v.id = target_league.format_template_version_id
         and v.competition_edition_id = target_league.competition_edition_id) then
    raise exception 'League competition versions are incomplete or mismatched';
  end if;

  return jsonb_build_object(
    'league_id',target_league.id,'edition_id',target_league.competition_edition_id,
    'format_template_version_id',target_league.format_template_version_id,
    'ruleset_version_id',target_league.ruleset_version_id,
    'prediction_requirement_version_id',target_league.prediction_requirement_version_id,
    'bracket_nodes',coalesce((select jsonb_agg(jsonb_build_object(
      'id',n.id,'edition_id',n.edition_id,'format_template_version_id',n.format_template_version_id,
      'node_key',n.node_key,'round_id',n.round_id,'target_match_id',n.target_match_id,'sort_order',n.sort_order
    ) order by n.sort_order) from public.format_template_match_nodes n
      where n.format_template_version_id = target_league.format_template_version_id),'[]'::jsonb),
    'bracket_slots',coalesce((select jsonb_agg(jsonb_build_object(
      'id',bs.id,'edition_id',bs.edition_id,'format_template_version_id',bs.format_template_version_id,
      'target_node_id',bs.target_node_id,'target_match_id',bs.target_match_id,'round_id',bs.round_id,
      'target_side',bs.target_side,'target_leg',bs.target_leg,'slot_key',bs.slot_key,
      'source_type',bs.source_type,'source_payload',bs.source_payload
    ) order by n.sort_order,bs.target_side) from public.bracket_slots bs
      join public.format_template_match_nodes n on n.id = bs.target_node_id
      where bs.format_template_version_id = target_league.format_template_version_id),'[]'::jsonb),
    'best_third_combinations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'edition_id',c.edition_id,'format_template_version_id',c.format_template_version_id,
      'option_number',c.option_number,'combination_key',c.combination_key,
      'qualified_group_codes',c.qualified_group_codes,
      'assignments',(select jsonb_agg(jsonb_build_object(
        'format_template_version_id',a.format_template_version_id,
        'target_node_id',a.target_node_id,'target_side',a.target_side,
        'winner_group_code',a.winner_group_code,'third_place_group_code',a.third_place_group_code
      ) order by a.winner_group_code) from public.format_template_best_third_assignments a where a.combination_id = c.id)
    ) order by c.option_number) from public.format_template_best_third_combinations c
      where c.format_template_version_id = target_league.format_template_version_id),'[]'::jsonb),
    'antepost_definitions',coalesce((select jsonb_agg(to_jsonb(cad) order by cad.code)
      from public.competition_antepost_definitions cad where cad.edition_id = target_league.competition_edition_id),'[]'::jsonb),
    'tiebreak_rules',coalesce((select jsonb_agg(to_jsonb(ctr) order by ctr.scope,ctr.sort_order)
      from public.competition_tiebreak_rules ctr where ctr.edition_id = target_league.competition_edition_id),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_prediction_target_catalog(uuid) from public, anon;
grant execute on function public.get_prediction_target_catalog(uuid) to authenticated;

comment on function public.get_prediction_target_catalog(uuid) is
  'Read-only, membership-scoped versioned target catalog, including official bracket nodes and conditional best-third matrix.';
comment on table public.bracket_slots is
  'Version-scoped fixed or conditional source assignments targeting format_template_match_nodes.';
