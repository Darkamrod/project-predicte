-- Milestone 11J-C2B2: authenticated, league-scoped prediction resolver inputs.
-- This read path exposes existing versioned data only. It does not create catalog
-- data, prediction sets, predictions, or any other user-owned records.

create or replace function public.get_authenticated_prediction_read_model(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_league public.leagues%rowtype;
  target_prediction_set_id uuid;
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
     or target_league.prediction_requirement_version_id is null
     or target_league.scoring_preset_version_id is null
     or not exists (
       select 1 from public.format_template_versions v
       where v.id = target_league.format_template_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.ruleset_versions v
       where v.id = target_league.ruleset_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.prediction_requirement_versions v
       where v.id = target_league.prediction_requirement_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.scoring_preset_versions v
       where v.id = target_league.scoring_preset_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     ) then
    raise exception 'League competition versions are incomplete or mismatched';
  end if;

  select ps.id
  into target_prediction_set_id
  from public.prediction_sets ps
  where ps.league_id = target_league.id
    and ps.user_id = caller_id;

  return jsonb_build_object(
    'league', jsonb_build_object(
      'id', target_league.id,
      'name', target_league.name,
      'status', target_league.status,
      'deadline_at', target_league.deadline_at,
      'competition_edition_id', target_league.competition_edition_id,
      'format_template_version_id', target_league.format_template_version_id,
      'ruleset_version_id', target_league.ruleset_version_id,
      'prediction_requirement_version_id', target_league.prediction_requirement_version_id,
      'scoring_preset_version_id', target_league.scoring_preset_version_id,
      'locked_competition_snapshot', target_league.locked_competition_snapshot
    ),
    'edition', (
      select jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'season_label', e.season_label,
        'edition_code', e.edition_code,
        'data_completeness', e.data_completeness
      )
      from public.competition_editions e
      where e.id = target_league.competition_edition_id
    ),
    'versions', jsonb_build_object(
      'format_template', (
        select jsonb_build_object(
          'id', v.id, 'version', v.version, 'status', v.status,
          'official_rules_source', v.official_rules_source,
          'format', v.format, 'stages', v.stages,
          'ranking_rule_sets', v.ranking_rule_sets,
          'bracket_mapping_strategy', v.bracket_mapping_strategy
        )
        from public.format_template_versions v
        where v.id = target_league.format_template_version_id
          and v.competition_edition_id = target_league.competition_edition_id
      ),
      'ruleset', (
        select jsonb_build_object(
          'id', v.id, 'version', v.version, 'status', v.status,
          'official_rules_source', v.official_rules_source,
          'rules_payload', v.rules_payload,
          'ranking_rule_set_codes', v.ranking_rule_set_codes
        )
        from public.ruleset_versions v
        where v.id = target_league.ruleset_version_id
          and v.competition_edition_id = target_league.competition_edition_id
      ),
      'prediction_requirements', (
        select jsonb_build_object(
          'id', v.id, 'version', v.version, 'status', v.status,
          'requirements', v.requirements
        )
        from public.prediction_requirement_versions v
        where v.id = target_league.prediction_requirement_version_id
          and v.competition_edition_id = target_league.competition_edition_id
      ),
      'scoring_preset', (
        select jsonb_build_object(
          'id', v.id, 'version', v.version, 'status', v.status,
          'config', v.config
        )
        from public.scoring_preset_versions v
        where v.id = target_league.scoring_preset_version_id
          and v.competition_edition_id = target_league.competition_edition_id
      )
    ),
    'catalog', jsonb_build_object(
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'edition_id', s.edition_id, 'code', s.code,
          'kind', s.kind, 'name', s.name, 'sort_order', s.sort_order
        ) order by s.sort_order)
        from public.stages s
        where s.edition_id = target_league.competition_edition_id
      ), '[]'::jsonb),
      'groups', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', g.id, 'edition_id', g.edition_id, 'stage_id', g.stage_id,
          'code', g.code, 'name', g.name, 'sort_order', g.sort_order
        ) order by g.sort_order)
        from public.groups g
        where g.edition_id = target_league.competition_edition_id
      ), '[]'::jsonb),
      'rounds', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id, 'edition_id', r.edition_id, 'stage_id', r.stage_id,
          'code', r.code, 'name', r.name, 'sort_order', r.sort_order
        ) order by r.sort_order)
        from public.rounds r
        where r.edition_id = target_league.competition_edition_id
      ), '[]'::jsonb),
      'edition_teams', coalesce((
        select jsonb_agg(jsonb_build_object(
          'edition_id', et.edition_id, 'team_id', et.team_id,
          'seed_group_id', et.seed_group_id, 'name', t.name,
          'short_name', t.short_name, 'country_code', t.country_code,
          'fifa_code', t.fifa_code
        ) order by t.name, et.team_id)
        from public.edition_teams et
        join public.teams t on t.id = et.team_id
        where et.edition_id = target_league.competition_edition_id
      ), '[]'::jsonb),
      'matches', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id, 'edition_id', m.edition_id, 'stage_id', m.stage_id,
          'group_id', m.group_id, 'round_id', m.round_id,
          'home_team_id', m.home_team_id, 'away_team_id', m.away_team_id,
          'bracket_payload', m.bracket_payload, 'kickoff_at', m.kickoff_at,
          'status', m.status, 'sort_order', m.sort_order,
          'match_number', case
            when m.bracket_payload ? 'officialMatchNumber'
              then (m.bracket_payload ->> 'officialMatchNumber')::integer
            else null
          end,
          'matchday', case
            when m.bracket_payload ? 'matchday'
              then (m.bracket_payload ->> 'matchday')::integer
            else null
          end,
          'match_format', m.bracket_payload ->> 'matchFormat',
          'leg', case
            when m.bracket_payload ? 'leg'
              then (m.bracket_payload ->> 'leg')::integer
            else null
          end
        ) order by m.sort_order, m.id)
        from public.matches m
        where m.edition_id = target_league.competition_edition_id
      ), '[]'::jsonb)
    ),
    'personal', jsonb_build_object(
      'prediction_set', (
        select jsonb_build_object(
          'id', ps.id, 'league_id', ps.league_id, 'status', ps.status,
          'total_required', ps.total_required, 'completed_items', ps.completed_items,
          'unsynced_items', ps.unsynced_items,
          'last_server_synced_at', ps.last_server_synced_at
        )
        from public.prediction_sets ps
        where ps.id = target_prediction_set_id
      ),
      'match_predictions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', mp.id, 'prediction_set_id', mp.prediction_set_id,
          'match_id', mp.match_id, 'prediction_ref', mp.prediction_ref,
          'stage_code', mp.stage_code,
          'regulation_home_goals', mp.regulation_home_goals,
          'regulation_away_goals', mp.regulation_away_goals,
          'qualified_team_id', mp.qualified_team_id,
          'advancement_method', mp.advancement_method,
          'sync_status', mp.sync_status, 'updated_at', mp.updated_at
        ) order by mp.updated_at, mp.id)
        from public.match_predictions mp
        where mp.prediction_set_id = target_prediction_set_id
      ), '[]'::jsonb),
      'tiebreak_overrides', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pto.id, 'prediction_set_id', pto.prediction_set_id,
          'scope', pto.scope, 'scope_ref', pto.scope_ref,
          'tie_group_id', pto.tie_group_id,
          'tied_team_ids', pto.tied_team_ids,
          'affected_positions', pto.affected_positions,
          'ordered_team_ids', pto.ordered_team_ids,
          'reason', pto.reason, 'sync_status', pto.sync_status,
          'created_at', pto.created_at, 'updated_at', pto.updated_at
        ) order by pto.scope, pto.scope_ref, pto.tie_group_id)
        from public.prediction_tiebreak_overrides pto
        where pto.prediction_set_id = target_prediction_set_id
      ), '[]'::jsonb),
      'antepost_predictions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', ap.id, 'prediction_set_id', ap.prediction_set_id,
          'definition_id', ap.definition_id,
          'selected_payload', ap.selected_payload,
          'sync_status', ap.sync_status, 'updated_at', ap.updated_at
        ) order by ap.updated_at, ap.id)
        from public.antepost_predictions ap
        where ap.prediction_set_id = target_prediction_set_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.get_authenticated_prediction_read_model(uuid) from public, anon;
grant execute on function public.get_authenticated_prediction_read_model(uuid) to authenticated;

comment on function public.get_authenticated_prediction_read_model(uuid) is
  'Read-only C2B2 resolver inputs scoped to auth.uid(), active league membership, edition and league versions. No user_id argument and no writes.';

-- Repeat the protected target catalog function in C2B2 so both concurrent read
-- models expose the same complete league/version envelope.
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
     or target_league.prediction_requirement_version_id is null
     or target_league.scoring_preset_version_id is null
     or not exists (
       select 1 from public.format_template_versions v
       where v.id = target_league.format_template_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.ruleset_versions v
       where v.id = target_league.ruleset_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.prediction_requirement_versions v
       where v.id = target_league.prediction_requirement_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     )
     or not exists (
       select 1 from public.scoring_preset_versions v
       where v.id = target_league.scoring_preset_version_id
         and v.competition_edition_id = target_league.competition_edition_id
     ) then
    raise exception 'League competition versions are incomplete or mismatched';
  end if;

  return jsonb_build_object(
    'league_id', target_league.id,
    'edition_id', target_league.competition_edition_id,
    'format_template_version_id', target_league.format_template_version_id,
    'ruleset_version_id', target_league.ruleset_version_id,
    'prediction_requirement_version_id', target_league.prediction_requirement_version_id,
    'scoring_preset_version_id', target_league.scoring_preset_version_id,
    'bracket_nodes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'edition_id', n.edition_id,
        'format_template_version_id', n.format_template_version_id,
        'node_key', n.node_key, 'round_id', n.round_id,
        'target_match_id', n.target_match_id, 'sort_order', n.sort_order
      ) order by n.sort_order)
      from public.format_template_match_nodes n
      where n.format_template_version_id = target_league.format_template_version_id
    ), '[]'::jsonb),
    'bracket_slots', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', bs.id, 'edition_id', bs.edition_id,
        'format_template_version_id', bs.format_template_version_id,
        'target_node_id', bs.target_node_id, 'target_match_id', bs.target_match_id,
        'round_id', bs.round_id, 'target_side', bs.target_side,
        'target_leg', bs.target_leg, 'slot_key', bs.slot_key,
        'source_type', bs.source_type, 'source_payload', bs.source_payload
      ) order by n.sort_order, bs.target_side)
      from public.bracket_slots bs
      join public.format_template_match_nodes n on n.id = bs.target_node_id
      where bs.format_template_version_id = target_league.format_template_version_id
    ), '[]'::jsonb),
    'best_third_combinations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'edition_id', c.edition_id,
        'format_template_version_id', c.format_template_version_id,
        'option_number', c.option_number, 'combination_key', c.combination_key,
        'qualified_group_codes', c.qualified_group_codes,
        'assignments', (
          select jsonb_agg(jsonb_build_object(
            'format_template_version_id', a.format_template_version_id,
            'target_node_id', a.target_node_id, 'target_side', a.target_side,
            'winner_group_code', a.winner_group_code,
            'third_place_group_code', a.third_place_group_code
          ) order by a.winner_group_code)
          from public.format_template_best_third_assignments a
          where a.combination_id = c.id
        )
      ) order by c.option_number)
      from public.format_template_best_third_combinations c
      where c.format_template_version_id = target_league.format_template_version_id
    ), '[]'::jsonb),
    'antepost_definitions', coalesce((
      select jsonb_agg(to_jsonb(cad) order by cad.code)
      from public.competition_antepost_definitions cad
      where cad.edition_id = target_league.competition_edition_id
    ), '[]'::jsonb),
    'tiebreak_rules', coalesce((
      select jsonb_agg(to_jsonb(ctr) order by ctr.scope, ctr.sort_order)
      from public.competition_tiebreak_rules ctr
      where ctr.edition_id = target_league.competition_edition_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_prediction_target_catalog(uuid) from public, anon;
grant execute on function public.get_prediction_target_catalog(uuid) to authenticated;

comment on function public.get_prediction_target_catalog(uuid) is
  'Read-only C2B2 target catalog with a complete league/version envelope for client snapshot consistency checks.';
