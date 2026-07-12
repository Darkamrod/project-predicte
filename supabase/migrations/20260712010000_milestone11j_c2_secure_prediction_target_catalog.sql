-- Milestone 11J-C2: authenticated, league-scoped prediction target catalog reads.

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
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  select l.*
  into target_league
  from public.leagues l
  join public.league_members lm
    on lm.league_id = l.id
   and lm.user_id = caller_id
   and lm.status = 'active'
  where l.id = p_league_id;

  if not found then
    raise exception 'Active league membership required';
  end if;

  if target_league.format_template_version_id is null
     or target_league.ruleset_version_id is null
     or target_league.prediction_requirement_version_id is null then
    raise exception 'League competition versions are incomplete';
  end if;

  if not exists (
    select 1
    from public.format_template_versions ftv
    where ftv.id = target_league.format_template_version_id
      and ftv.competition_edition_id = target_league.competition_edition_id
  ) or not exists (
    select 1
    from public.ruleset_versions rv
    where rv.id = target_league.ruleset_version_id
      and rv.competition_edition_id = target_league.competition_edition_id
  ) or not exists (
    select 1
    from public.prediction_requirement_versions prv
    where prv.id = target_league.prediction_requirement_version_id
      and prv.competition_edition_id = target_league.competition_edition_id
  ) then
    raise exception 'League competition versions do not match the league edition';
  end if;

  return jsonb_build_object(
    'league_id', target_league.id,
    'edition_id', target_league.competition_edition_id,
    'format_template_version_id', target_league.format_template_version_id,
    'ruleset_version_id', target_league.ruleset_version_id,
    'prediction_requirement_version_id', target_league.prediction_requirement_version_id,
    'bracket_slots', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', bs.id,
          'edition_id', bs.edition_id,
          'round_id', bs.round_id,
          'source_type', bs.source_type,
          'source_payload', bs.source_payload
        ) order by r.sort_order, bs.id
      )
      from public.bracket_slots bs
      join public.rounds r
        on r.id = bs.round_id
       and r.edition_id = target_league.competition_edition_id
      where bs.edition_id = target_league.competition_edition_id
    ), '[]'::jsonb),
    'antepost_definitions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cad.id,
          'edition_id', cad.edition_id,
          'code', cad.code,
          'label', cad.label,
          'value_type', cad.value_type,
          'required', cad.required
        ) order by cad.code, cad.id
      )
      from public.competition_antepost_definitions cad
      where cad.edition_id = target_league.competition_edition_id
    ), '[]'::jsonb),
    'tiebreak_rules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ctr.id,
          'edition_id', ctr.edition_id,
          'scope', ctr.scope,
          'sort_order', ctr.sort_order,
          'rule_code', ctr.rule_code,
          'rule_payload', ctr.rule_payload
        ) order by ctr.scope, ctr.sort_order, ctr.id
      )
      from public.competition_tiebreak_rules ctr
      where ctr.edition_id = target_league.competition_edition_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_prediction_target_catalog(uuid) from public;
revoke all on function public.get_prediction_target_catalog(uuid) from anon;
grant execute on function public.get_prediction_target_catalog(uuid) to authenticated;

comment on function public.get_prediction_target_catalog(uuid)
is 'Milestone 11J-C2: read-only bracket, antepost, and tiebreak catalog scoped by auth.uid(), active membership, league edition, and league version references.';
