-- Milestone 7.2: make league creation use edition-specific version references and non-empty versioned scoring presets.

create or replace function public.create_private_league(
  p_competition_edition_id uuid,
  p_name text,
  p_deadline_at timestamptz,
  p_scoring_preset_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_edition public.competition_editions%rowtype;
  selected_scoring_preset_version_id uuid;
  selected_preset_schema_version integer := 1;
  selected_preset_config jsonb;
  override_preset_version_id uuid;
  override_preset_schema_version integer;
  override_preset_config jsonb;
  legacy_preset_schema_version integer;
  legacy_preset_config jsonb;
  created_league_id uuid;
  created_rule_version_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_current_user_profile();

  select *
  into target_edition
  from public.competition_editions
  where id = p_competition_edition_id
    and enabled = true;

  if not found then
    raise exception 'Competition edition is not available';
  end if;

  if target_edition.format_template_version_id is null
    or target_edition.ruleset_version_id is null
    or target_edition.prediction_requirement_version_id is null
    or target_edition.scoring_preset_version_id is null then
    raise exception 'Competition edition is missing version references';
  end if;

  if length(trim(p_name)) < 3 then
    raise exception 'League name is too short';
  end if;

  if p_deadline_at <= now() then
    raise exception 'Deadline must be in the future';
  end if;

  if target_edition.maximum_deadline_at is not null
    and p_deadline_at > target_edition.maximum_deadline_at then
    raise exception 'Deadline exceeds competition maximum deadline';
  end if;

  select
    spv.id,
    coalesce((spv.config ->> 'schemaVersion')::integer, 1),
    spv.config
  into
    selected_scoring_preset_version_id,
    selected_preset_schema_version,
    selected_preset_config
  from public.scoring_preset_versions spv
  where spv.id = target_edition.scoring_preset_version_id
    and spv.competition_edition_id = target_edition.id
    and spv.status = 'active';

  if not found then
    raise exception 'Competition edition scoring preset version is not available';
  end if;

  if p_scoring_preset_id is not null then
    select
      spv.id,
      coalesce((spv.config ->> 'schemaVersion')::integer, 1),
      spv.config
    into
      override_preset_version_id,
      override_preset_schema_version,
      override_preset_config
    from public.scoring_preset_versions spv
    where spv.id = p_scoring_preset_id
      and spv.competition_edition_id = target_edition.id
      and spv.status = 'active';

    if found then
      selected_scoring_preset_version_id := override_preset_version_id;
      selected_preset_schema_version := override_preset_schema_version;
      selected_preset_config := override_preset_config;
    else
      select sp.schema_version, sp.config
      into legacy_preset_schema_version, legacy_preset_config
      from public.scoring_presets sp
      where sp.active = true
        and sp.id = p_scoring_preset_id
        and (
          sp.competition_edition_id = p_competition_edition_id
          or sp.competition_template_id = target_edition.template_id
        )
      order by sp.created_at desc
      limit 1;

      if not found then
        raise exception 'Scoring preset is not available for this competition edition';
      end if;

      -- Legacy scoring_presets is accepted only for backward-compatible explicit overrides.
      -- The league still stores the edition's versioned scoring_preset_version_id.
      selected_preset_schema_version := legacy_preset_schema_version;
      selected_preset_config := legacy_preset_config;
      selected_scoring_preset_version_id := target_edition.scoring_preset_version_id;
    end if;
  end if;

  if selected_preset_config is null
    or jsonb_typeof(selected_preset_config) is distinct from 'object'
    or nullif(selected_preset_config ->> 'presetCode', '') is null
    or jsonb_typeof(selected_preset_config -> 'stages') is distinct from 'object'
    or selected_preset_config -> 'stages' = '{}'::jsonb
    or jsonb_typeof(selected_preset_config -> 'antepost') is distinct from 'object'
    or selected_preset_config -> 'antepost' = '{}'::jsonb
    or jsonb_typeof(selected_preset_config -> 'stacking') is distinct from 'object'
    or selected_preset_config -> 'stacking' = '{}'::jsonb then
    raise exception 'Scoring preset config is incomplete';
  end if;

  insert into public.leagues (
    competition_edition_id,
    format_template_version_id,
    ruleset_version_id,
    prediction_requirement_version_id,
    scoring_preset_version_id,
    owner_id,
    name,
    status,
    deadline_at,
    invite_settings
  )
  values (
    p_competition_edition_id,
    target_edition.format_template_version_id,
    target_edition.ruleset_version_id,
    target_edition.prediction_requirement_version_id,
    selected_scoring_preset_version_id,
    auth.uid(),
    trim(p_name),
    'open',
    p_deadline_at,
    '{}'::jsonb
  )
  returning id into created_league_id;

  insert into public.league_members (league_id, user_id, role, status)
  values (created_league_id, auth.uid(), 'owner', 'active');

  insert into public.league_scoring_rule_versions (
    league_id,
    version,
    status,
    schema_version,
    config,
    created_by
  )
  values (
    created_league_id,
    1,
    'draft',
    selected_preset_schema_version,
    selected_preset_config,
    auth.uid()
  )
  returning id into created_rule_version_id;

  update public.leagues
  set current_scoring_rule_version_id = created_rule_version_id
  where id = created_league_id;

  insert into public.prediction_sets (league_id, user_id, status)
  values (created_league_id, auth.uid(), 'draft')
  on conflict (league_id, user_id) do nothing;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    created_league_id,
    auth.uid(),
    'LEAGUE_CREATED',
    jsonb_build_object(
      'deadline_at', p_deadline_at,
      'format_template_version_id', target_edition.format_template_version_id,
      'ruleset_version_id', target_edition.ruleset_version_id,
      'prediction_requirement_version_id', target_edition.prediction_requirement_version_id,
      'scoring_preset_version_id', selected_scoring_preset_version_id
    ),
    true
  );

  return created_league_id;
end;
$$;

grant execute on function public.create_private_league(uuid, text, timestamptz, uuid) to authenticated;
