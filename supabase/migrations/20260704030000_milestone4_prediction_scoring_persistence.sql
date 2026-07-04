do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'prediction_sync_status'
  ) then
    create type public.prediction_sync_status as enum (
      'SAVED',
      'SYNCING',
      'SYNCED',
      'SYNC_FAILED',
      'LOCAL'
    );
  end if;
end $$;

alter table public.match_predictions
  add column if not exists prediction_ref text;

update public.match_predictions
set prediction_ref = match_id::text
where prediction_ref is null;

alter table public.match_predictions
  alter column prediction_ref set not null,
  alter column match_id drop not null,
  add column if not exists stage_code text not null default 'GROUP_STAGE',
  add column if not exists home_team_id uuid references public.teams (id),
  add column if not exists away_team_id uuid references public.teams (id),
  add column if not exists depends_on_prediction_refs text[] not null default '{}',
  add column if not exists sync_status public.prediction_sync_status not null default 'SYNCED';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'match_predictions_prediction_ref_not_empty'
  ) then
    alter table public.match_predictions
      add constraint match_predictions_prediction_ref_not_empty
      check (length(btrim(prediction_ref)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'match_predictions_prediction_set_ref_key'
  ) then
    alter table public.match_predictions
      add constraint match_predictions_prediction_set_ref_key
      unique (prediction_set_id, prediction_ref);
  end if;
end $$;

alter table public.prediction_tiebreak_overrides
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists sync_status public.prediction_sync_status not null default 'SYNCED';

update public.prediction_tiebreak_overrides
set updated_at = created_at
where updated_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prediction_tiebreak_overrides_prediction_set_scope_key'
  ) then
    alter table public.prediction_tiebreak_overrides
      add constraint prediction_tiebreak_overrides_prediction_set_scope_key
      unique (prediction_set_id, scope_ref);
  end if;
end $$;

alter table public.antepost_predictions
  add column if not exists sync_status public.prediction_sync_status not null default 'SYNCED';

alter table public.scoring_events
  add column if not exists event_key text,
  add column if not exists source_result_key text not null default 'legacy';

update public.scoring_events
set event_key = id::text
where event_key is null;

update public.scoring_events
set source_result_key = coalesce(source_result_version_id::text, id::text)
where source_result_key = 'legacy';

alter table public.scoring_events
  alter column event_key set not null;

alter table public.leaderboard_snapshots
  add column if not exists snapshot_key text,
  add column if not exists source_result_key text not null default 'legacy';

update public.leaderboard_snapshots
set snapshot_key = id::text
where snapshot_key is null;

update public.leaderboard_snapshots
set source_result_key = coalesce(source_result_version_id::text, id::text)
where source_result_key = 'legacy';

alter table public.leaderboard_snapshots
  alter column snapshot_key set not null;

alter table public.scoring_recalculation_runs
  add column if not exists source_result_key text,
  add column if not exists actor_user_id uuid references public.profiles (id),
  add column if not exists snapshot_id uuid references public.leaderboard_snapshots (id);

create table if not exists public.league_scoring_rule_changes (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  rule_version_id uuid not null references public.league_scoring_rule_versions (id) on delete cascade,
  actor_user_id uuid references public.profiles (id),
  scope text not null check (scope in ('stage', 'antepost')),
  stage text,
  field text not null,
  previous_value integer not null check (previous_value >= 0),
  next_value integer not null check (next_value >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.scoring_breakdown_items (
  id uuid primary key default gen_random_uuid(),
  breakdown_key text not null,
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_user_id uuid not null references public.profiles (id),
  scoring_event_id uuid references public.scoring_events (id) on delete cascade,
  source_result_key text not null,
  scope text not null check (scope in ('MATCH', 'STAGE', 'ANTEPOST')),
  reference_id text not null,
  stage text,
  event_type text not null,
  points integer not null check (points >= 0),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.league_scoring_rule_changes enable row level security;
alter table public.scoring_breakdown_items enable row level security;

create unique index if not exists scoring_events_m4_idempotency_idx
on public.scoring_events (
  league_id,
  participant_user_id,
  reference_id,
  event_type,
  scoring_rule_version_id,
  source_result_key
);

create unique index if not exists scoring_events_m4_event_key_idx
on public.scoring_events (league_id, source_result_key, event_key);

create unique index if not exists leaderboard_snapshots_m4_source_key_idx
on public.leaderboard_snapshots (league_id, source_result_key);

create unique index if not exists leaderboard_snapshots_m4_snapshot_key_idx
on public.leaderboard_snapshots (league_id, snapshot_key);

create unique index if not exists scoring_breakdown_items_m4_key_idx
on public.scoring_breakdown_items (league_id, source_result_key, breakdown_key);

create index if not exists scoring_breakdown_items_m4_user_idx
on public.scoring_breakdown_items (league_id, participant_user_id);

create index if not exists rule_changes_m4_league_idx
on public.league_scoring_rule_changes (league_id, created_at);

create index if not exists scoring_recalculation_runs_m4_source_idx
on public.scoring_recalculation_runs (league_id, source_result_key);

create or replace function public.calculate_scoring_rule_checksum(p_config jsonb)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select 'sha256-' || encode(extensions.digest(p_config::text, 'sha256'::text), 'hex');
$$;

create or replace function public.current_user_prediction_set_id(p_league_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ps.id
  from public.prediction_sets ps
  join public.league_members lm
    on lm.league_id = ps.league_id
   and lm.user_id = ps.user_id
  where ps.league_id = p_league_id
    and ps.user_id = auth.uid()
    and lm.status = 'active'
  limit 1;
$$;

create or replace function public.save_match_prediction(
  p_league_id uuid,
  p_match_id uuid default null,
  p_prediction_ref text default null,
  p_stage_code text default null,
  p_regulation_home_goals integer default 0,
  p_regulation_away_goals integer default 0,
  p_qualified_team_id uuid default null,
  p_advancement_method public.advancement_method default null,
  p_home_team_id uuid default null,
  p_away_team_id uuid default null,
  p_depends_on_prediction_refs text[] default '{}',
  p_validation_status public.prediction_validation_status default 'valid',
  p_sync_status public.prediction_sync_status default 'SYNCED'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prediction_set_id uuid;
  saved_prediction_id uuid;
  effective_prediction_ref text;
  effective_stage_code text;
  effective_home_team_id uuid;
  effective_away_team_id uuid;
  official_match record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  target_prediction_set_id := public.current_user_prediction_set_id(p_league_id);

  if target_prediction_set_id is null then
    raise exception 'Prediction set not found for current user';
  end if;

  if not public.prediction_set_is_writable_by_current_user(target_prediction_set_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  if p_regulation_home_goals < 0 or p_regulation_away_goals < 0 then
    raise exception 'Prediction goals cannot be negative';
  end if;

  effective_prediction_ref := nullif(btrim(coalesce(p_prediction_ref, '')), '');

  if p_match_id is not null then
    effective_prediction_ref := p_match_id::text;
  end if;

  if effective_prediction_ref is null then
    raise exception 'Prediction reference is required';
  end if;

  effective_stage_code := nullif(btrim(coalesce(p_stage_code, '')), '');

  if p_match_id is not null then
    select
      m.id,
      s.code as stage_code,
      m.home_team_id,
      m.away_team_id
    into official_match
    from public.matches m
    join public.stages s on s.id = m.stage_id
    join public.leagues l on l.competition_edition_id = m.edition_id
    where l.id = p_league_id
      and m.id = p_match_id;

    if not found then
      raise exception 'Match does not belong to league competition edition';
    end if;

    effective_stage_code := coalesce(effective_stage_code, official_match.stage_code);
    effective_home_team_id := coalesce(p_home_team_id, official_match.home_team_id);
    effective_away_team_id := coalesce(p_away_team_id, official_match.away_team_id);
  else
    effective_home_team_id := p_home_team_id;
    effective_away_team_id := p_away_team_id;
  end if;

  if effective_stage_code is null then
    raise exception 'Stage code is required for virtual prediction matches';
  end if;

  insert into public.match_predictions (
    prediction_set_id,
    match_id,
    prediction_ref,
    stage_code,
    regulation_home_goals,
    regulation_away_goals,
    qualified_team_id,
    advancement_method,
    home_team_id,
    away_team_id,
    depends_on_prediction_refs,
    validation_status,
    sync_status,
    updated_at
  )
  values (
    target_prediction_set_id,
    p_match_id,
    effective_prediction_ref,
    effective_stage_code,
    p_regulation_home_goals,
    p_regulation_away_goals,
    p_qualified_team_id,
    p_advancement_method,
    effective_home_team_id,
    effective_away_team_id,
    coalesce(p_depends_on_prediction_refs, '{}'),
    p_validation_status,
    p_sync_status,
    now()
  )
  on conflict on constraint match_predictions_prediction_set_ref_key
  do update set
    match_id = excluded.match_id,
    stage_code = excluded.stage_code,
    regulation_home_goals = excluded.regulation_home_goals,
    regulation_away_goals = excluded.regulation_away_goals,
    qualified_team_id = excluded.qualified_team_id,
    advancement_method = excluded.advancement_method,
    home_team_id = excluded.home_team_id,
    away_team_id = excluded.away_team_id,
    depends_on_prediction_refs = excluded.depends_on_prediction_refs,
    validation_status = excluded.validation_status,
    sync_status = excluded.sync_status,
    updated_at = now()
  returning id into saved_prediction_id;

  update public.prediction_sets
  set last_server_synced_at = now()
  where id = target_prediction_set_id;

  return saved_prediction_id;
end;
$$;

create or replace function public.upsert_prediction_tiebreak_override(
  p_league_id uuid,
  p_scope_ref text,
  p_ordered_team_ids uuid[],
  p_reason text default '',
  p_sync_status public.prediction_sync_status default 'SYNCED'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prediction_set_id uuid;
  saved_override_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  target_prediction_set_id := public.current_user_prediction_set_id(p_league_id);

  if target_prediction_set_id is null then
    raise exception 'Prediction set not found for current user';
  end if;

  if not public.prediction_set_is_writable_by_current_user(target_prediction_set_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  if nullif(btrim(coalesce(p_scope_ref, '')), '') is null then
    raise exception 'Tie-break scope is required';
  end if;

  if array_length(p_ordered_team_ids, 1) is null then
    raise exception 'Tie-break order cannot be empty';
  end if;

  insert into public.prediction_tiebreak_overrides (
    prediction_set_id,
    scope_ref,
    ordered_team_ids,
    reason,
    sync_status,
    updated_at
  )
  values (
    target_prediction_set_id,
    btrim(p_scope_ref),
    p_ordered_team_ids,
    coalesce(p_reason, ''),
    p_sync_status,
    now()
  )
  on conflict on constraint prediction_tiebreak_overrides_prediction_set_scope_key
  do update set
    ordered_team_ids = excluded.ordered_team_ids,
    reason = excluded.reason,
    sync_status = excluded.sync_status,
    updated_at = now()
  returning id into saved_override_id;

  update public.prediction_sets
  set last_server_synced_at = now()
  where id = target_prediction_set_id;

  return saved_override_id;
end;
$$;

create or replace function public.upsert_antepost_prediction(
  p_league_id uuid,
  p_definition_id uuid,
  p_selected_payload jsonb,
  p_sync_status public.prediction_sync_status default 'SYNCED'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prediction_set_id uuid;
  saved_prediction_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  target_prediction_set_id := public.current_user_prediction_set_id(p_league_id);

  if target_prediction_set_id is null then
    raise exception 'Prediction set not found for current user';
  end if;

  if not public.prediction_set_is_writable_by_current_user(target_prediction_set_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  if jsonb_typeof(p_selected_payload) <> 'object' then
    raise exception 'Antepost payload must be a JSON object';
  end if;

  if not exists (
    select 1
    from public.competition_antepost_definitions cad
    join public.leagues l on l.competition_edition_id = cad.edition_id
    where l.id = p_league_id
      and cad.id = p_definition_id
  ) then
    raise exception 'Antepost definition does not belong to league competition edition';
  end if;

  insert into public.antepost_predictions (
    prediction_set_id,
    definition_id,
    selected_payload,
    sync_status,
    updated_at
  )
  values (
    target_prediction_set_id,
    p_definition_id,
    p_selected_payload,
    p_sync_status,
    now()
  )
  on conflict (prediction_set_id, definition_id)
  do update set
    selected_payload = excluded.selected_payload,
    sync_status = excluded.sync_status,
    updated_at = now()
  returning id into saved_prediction_id;

  update public.prediction_sets
  set last_server_synced_at = now()
  where id = target_prediction_set_id;

  return saved_prediction_id;
end;
$$;

create or replace function public.update_prediction_set_completion(
  p_league_id uuid,
  p_status public.prediction_set_status,
  p_total_required integer,
  p_completed_items integer,
  p_unsynced_items integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prediction_set_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  target_prediction_set_id := public.current_user_prediction_set_id(p_league_id);

  if target_prediction_set_id is null then
    raise exception 'Prediction set not found for current user';
  end if;

  if not public.prediction_set_is_writable_by_current_user(target_prediction_set_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  if p_status not in ('draft', 'complete') then
    raise exception 'Prediction completion RPC cannot lock prediction sets';
  end if;

  if p_total_required < 0
    or p_completed_items < 0
    or p_unsynced_items < 0
    or p_completed_items > p_total_required
    or p_unsynced_items > p_total_required then
    raise exception 'Invalid prediction completion counters';
  end if;

  update public.prediction_sets
  set
    status = p_status,
    total_required = p_total_required,
    completed_items = p_completed_items,
    unsynced_items = p_unsynced_items,
    last_server_synced_at = now(),
    completed_at = case
      when p_status = 'complete' then coalesce(completed_at, now())
      else null
    end
  where id = target_prediction_set_id;

  return target_prediction_set_id;
end;
$$;

create or replace function public.update_stage_scoring_rule_value(
  p_league_id uuid,
  p_stage text,
  p_field text,
  p_value integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rule public.league_scoring_rule_versions%rowtype;
  config_path text[];
  previous_value integer;
  max_points integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can update scoring rules';
  end if;

  if not public.league_accepts_members(p_league_id) then
    raise exception 'Scoring rules can only be edited before lock and deadline';
  end if;

  select lsr.*
  into target_rule
  from public.league_scoring_rule_versions lsr
  join public.leagues l on l.current_scoring_rule_version_id = lsr.id
  where l.id = p_league_id
  for update of lsr;

  if not found then
    raise exception 'Current scoring rule version not found';
  end if;

  if target_rule.status <> 'draft' then
    raise exception 'Locked scoring rules are immutable';
  end if;

  if p_value < 0 then
    raise exception 'Scoring value is outside the allowed range';
  end if;

  max_points := coalesce((target_rule.config ->> 'maxPointsPerField')::integer, 0);

  if p_value > max_points then
    raise exception 'Scoring value is outside the allowed range';
  end if;

  config_path := array['stages', p_stage, p_field];
  previous_value := (target_rule.config #>> config_path)::integer;

  if previous_value is null then
    raise exception 'Unknown stage scoring rule field';
  end if;

  update public.league_scoring_rule_versions
  set config = jsonb_set(config, config_path, to_jsonb(p_value), false)
  where id = target_rule.id;

  insert into public.league_scoring_rule_changes (
    league_id,
    rule_version_id,
    actor_user_id,
    scope,
    stage,
    field,
    previous_value,
    next_value
  )
  values (
    p_league_id,
    target_rule.id,
    auth.uid(),
    'stage',
    p_stage,
    p_field,
    previous_value,
    p_value
  );

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'SCORING_RULE_UPDATED',
    jsonb_build_object(
      'rule_version_id', target_rule.id,
      'scope', 'stage',
      'stage', p_stage,
      'field', p_field,
      'previous_value', previous_value,
      'next_value', p_value
    ),
    true
  );

  return target_rule.id;
end;
$$;

create or replace function public.update_antepost_scoring_rule_value(
  p_league_id uuid,
  p_field text,
  p_value integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rule public.league_scoring_rule_versions%rowtype;
  config_path text[];
  previous_value integer;
  max_points integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can update scoring rules';
  end if;

  if not public.league_accepts_members(p_league_id) then
    raise exception 'Scoring rules can only be edited before lock and deadline';
  end if;

  select lsr.*
  into target_rule
  from public.league_scoring_rule_versions lsr
  join public.leagues l on l.current_scoring_rule_version_id = lsr.id
  where l.id = p_league_id
  for update of lsr;

  if not found then
    raise exception 'Current scoring rule version not found';
  end if;

  if target_rule.status <> 'draft' then
    raise exception 'Locked scoring rules are immutable';
  end if;

  if p_value < 0 then
    raise exception 'Scoring value is outside the allowed range';
  end if;

  max_points := coalesce((target_rule.config ->> 'maxPointsPerField')::integer, 0);

  if p_value > max_points then
    raise exception 'Scoring value is outside the allowed range';
  end if;

  config_path := array['antepost', p_field];
  previous_value := (target_rule.config #>> config_path)::integer;

  if previous_value is null then
    raise exception 'Unknown antepost scoring rule field';
  end if;

  update public.league_scoring_rule_versions
  set config = jsonb_set(config, config_path, to_jsonb(p_value), false)
  where id = target_rule.id;

  insert into public.league_scoring_rule_changes (
    league_id,
    rule_version_id,
    actor_user_id,
    scope,
    field,
    previous_value,
    next_value
  )
  values (
    p_league_id,
    target_rule.id,
    auth.uid(),
    'antepost',
    p_field,
    previous_value,
    p_value
  );

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'SCORING_RULE_UPDATED',
    jsonb_build_object(
      'rule_version_id', target_rule.id,
      'scope', 'antepost',
      'field', p_field,
      'previous_value', previous_value,
      'next_value', p_value
    ),
    true
  );

  return target_rule.id;
end;
$$;

create or replace function public.lock_scoring_rule_snapshot(p_league_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league public.leagues%rowtype;
  target_rule public.league_scoring_rule_versions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can lock scoring rules';
  end if;

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  for update;

  if not found then
    raise exception 'League not found';
  end if;

  select *
  into target_rule
  from public.league_scoring_rule_versions
  where id = target_league.current_scoring_rule_version_id
  for update;

  if not found then
    raise exception 'Current scoring rule version not found';
  end if;

  if target_league.status in ('locked', 'live', 'completed', 'archived') then
    return target_rule.id;
  end if;

  if target_league.status not in ('draft', 'open') then
    raise exception 'League cannot be locked from its current status';
  end if;

  if now() < target_league.deadline_at then
    raise exception 'League cannot be locked before deadline';
  end if;

  update public.leagues
  set status = 'locked', updated_at = now()
  where id = p_league_id;

  update public.prediction_sets
  set status = 'locked'
  where league_id = p_league_id;

  update public.league_scoring_rule_versions
  set
    status = 'locked',
    checksum = coalesce(checksum, public.calculate_scoring_rule_checksum(config)),
    locked_at = coalesce(locked_at, now())
  where id = target_rule.id
    and status = 'draft';

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'SCORING_RULE_SNAPSHOT_LOCKED',
    jsonb_build_object('rule_version_id', target_rule.id),
    true
  );

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (p_league_id, auth.uid(), 'LEAGUE_LOCKED', '{}'::jsonb, true);

  return target_rule.id;
end;
$$;

create or replace function public.lock_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.lock_scoring_rule_snapshot(p_league_id);
end;
$$;

create or replace function public.lock_due_leagues()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_count integer := 0;
  due_league record;
begin
  for due_league in
    select *
    from public.leagues
    where status in ('draft', 'open')
      and now() >= deadline_at
    for update
  loop
    update public.leagues
    set status = 'locked', updated_at = now()
    where id = due_league.id;

    update public.prediction_sets
    set status = 'locked'
    where league_id = due_league.id;

    update public.league_scoring_rule_versions
    set
      status = 'locked',
      checksum = coalesce(checksum, public.calculate_scoring_rule_checksum(config)),
      locked_at = coalesce(locked_at, now())
    where id = due_league.current_scoring_rule_version_id
      and status = 'draft';

    insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
    values (
      due_league.id,
      null,
      'SCORING_RULE_SNAPSHOT_LOCKED_BY_DEADLINE',
      jsonb_build_object('rule_version_id', due_league.current_scoring_rule_version_id),
      true
    );

    insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
    values (due_league.id, null, 'LEAGUE_LOCKED_BY_DEADLINE', '{}'::jsonb, true);

    locked_count := locked_count + 1;
  end loop;

  return locked_count;
end;
$$;

create or replace function public.persist_scoring_recalculation(
  p_league_id uuid,
  p_source_result_key text,
  p_calculation_version text,
  p_events jsonb,
  p_leaderboard_entries jsonb,
  p_breakdown_items jsonb default '[]'::jsonb,
  p_reason text default 'manual_recalculation'
)
returns table(run_id uuid, snapshot_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league public.leagues%rowtype;
  current_rule public.league_scoring_rule_versions%rowtype;
  created_run_id uuid;
  created_snapshot_id uuid;
  event_item record;
  entry_item record;
  breakdown_item record;
  related_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can persist scoring recalculations';
  end if;

  if nullif(btrim(coalesce(p_source_result_key, '')), '') is null then
    raise exception 'Source result key is required';
  end if;

  if jsonb_typeof(p_events) <> 'array' then
    raise exception 'Scoring events payload must be an array';
  end if;

  if jsonb_typeof(p_leaderboard_entries) <> 'array' then
    raise exception 'Leaderboard entries payload must be an array';
  end if;

  if jsonb_typeof(p_breakdown_items) <> 'array' then
    raise exception 'Breakdown items payload must be an array';
  end if;

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  for update;

  if not found then
    raise exception 'League not found';
  end if;

  if target_league.status not in ('locked', 'live', 'completed', 'archived') then
    raise exception 'Scoring can only be persisted after league lock';
  end if;

  select *
  into current_rule
  from public.league_scoring_rule_versions
  where id = target_league.current_scoring_rule_version_id;

  if not found or current_rule.status <> 'locked' then
    raise exception 'Locked scoring rule snapshot is required before scoring';
  end if;

  insert into public.scoring_recalculation_runs (
    league_id,
    source_result_key,
    status,
    reason,
    actor_user_id
  )
  values (
    p_league_id,
    btrim(p_source_result_key),
    'running',
    coalesce(p_reason, 'manual_recalculation'),
    auth.uid()
  )
  returning id into created_run_id;

  delete from public.scoring_breakdown_items
  where league_id = p_league_id
    and source_result_key = btrim(p_source_result_key);

  delete from public.leaderboard_snapshots
  where league_id = p_league_id
    and source_result_key = btrim(p_source_result_key);

  delete from public.scoring_events
  where league_id = p_league_id
    and source_result_key = btrim(p_source_result_key);

  for event_item in
    select *
    from jsonb_to_recordset(p_events) as event_payload(
      event_key text,
      participant_user_id uuid,
      reference_id text,
      scoring_rule_version_id uuid,
      event_type text,
      points integer,
      reason text,
      calculation_version text,
      created_at timestamptz
    )
  loop
    if nullif(btrim(coalesce(event_item.event_key, '')), '') is null then
      raise exception 'Scoring event key is required';
    end if;

    if event_item.points is null or event_item.points < 0 then
      raise exception 'Scoring event points must be non-negative';
    end if;

    if event_item.scoring_rule_version_id is not null
      and event_item.scoring_rule_version_id <> current_rule.id then
      raise exception 'Scoring event rule version does not match locked snapshot';
    end if;

    if not exists (
      select 1
      from public.league_members lm
      where lm.league_id = p_league_id
        and lm.user_id = event_item.participant_user_id
        and lm.status = 'active'
    ) then
      raise exception 'Scoring event participant is not an active league member';
    end if;

    insert into public.scoring_events (
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
      source_result_key,
      created_at
    )
    values (
      btrim(event_item.event_key),
      p_league_id,
      event_item.participant_user_id,
      target_league.competition_edition_id,
      event_item.reference_id,
      current_rule.id,
      event_item.event_type,
      event_item.points,
      event_item.reason,
      coalesce(event_item.calculation_version, p_calculation_version),
      btrim(p_source_result_key),
      coalesce(event_item.created_at, now())
    );
  end loop;

  insert into public.leaderboard_snapshots (
    league_id,
    snapshot_key,
    source_result_key,
    created_at
  )
  values (
    p_league_id,
    p_league_id::text || ':leaderboard:' || btrim(p_source_result_key),
    btrim(p_source_result_key),
    now()
  )
  returning id into created_snapshot_id;

  for entry_item in
    select *
    from jsonb_to_recordset(p_leaderboard_entries) as entry_payload(
      user_id uuid,
      rank integer,
      total_points integer,
      latest_points integer,
      position_delta integer,
      tied boolean
    )
  loop
    if not exists (
      select 1
      from public.league_members lm
      where lm.league_id = p_league_id
        and lm.user_id = entry_item.user_id
        and lm.status = 'active'
    ) then
      raise exception 'Leaderboard entry user is not an active league member';
    end if;

    insert into public.leaderboard_entries (
      snapshot_id,
      user_id,
      rank,
      total_points,
      latest_points,
      position_delta,
      tied
    )
    values (
      created_snapshot_id,
      entry_item.user_id,
      entry_item.rank,
      entry_item.total_points,
      coalesce(entry_item.latest_points, 0),
      coalesce(entry_item.position_delta, 0),
      coalesce(entry_item.tied, false)
    );
  end loop;

  for breakdown_item in
    select *
    from jsonb_to_recordset(p_breakdown_items) as breakdown_payload(
      breakdown_key text,
      event_key text,
      participant_user_id uuid,
      scope text,
      reference_id text,
      stage text,
      event_type text,
      points integer,
      reason text
    )
  loop
    if nullif(btrim(coalesce(breakdown_item.breakdown_key, '')), '') is null then
      raise exception 'Breakdown key is required';
    end if;

    if breakdown_item.scope not in ('MATCH', 'STAGE', 'ANTEPOST') then
      raise exception 'Breakdown scope is invalid';
    end if;

    if not exists (
      select 1
      from public.league_members lm
      where lm.league_id = p_league_id
        and lm.user_id = breakdown_item.participant_user_id
        and lm.status = 'active'
    ) then
      raise exception 'Breakdown participant is not an active league member';
    end if;

    select se.id
    into related_event_id
    from public.scoring_events se
    where se.league_id = p_league_id
      and se.source_result_key = btrim(p_source_result_key)
      and se.event_key = breakdown_item.event_key
    limit 1;

    insert into public.scoring_breakdown_items (
      breakdown_key,
      league_id,
      participant_user_id,
      scoring_event_id,
      source_result_key,
      scope,
      reference_id,
      stage,
      event_type,
      points,
      reason
    )
    values (
      btrim(breakdown_item.breakdown_key),
      p_league_id,
      breakdown_item.participant_user_id,
      related_event_id,
      btrim(p_source_result_key),
      breakdown_item.scope,
      breakdown_item.reference_id,
      breakdown_item.stage,
      breakdown_item.event_type,
      breakdown_item.points,
      breakdown_item.reason
    );
  end loop;

  update public.scoring_recalculation_runs
  set
    status = 'succeeded',
    finished_at = now(),
    snapshot_id = created_snapshot_id
  where id = created_run_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'SCORING_RECALCULATED',
    jsonb_build_object(
      'run_id', created_run_id,
      'snapshot_id', created_snapshot_id,
      'source_result_key', btrim(p_source_result_key)
    ),
    true
  );

  return query select created_run_id, created_snapshot_id;
end;
$$;

drop policy if exists "rule changes read league members" on public.league_scoring_rule_changes;
create policy "rule changes read league members"
on public.league_scoring_rule_changes for select
using (public.current_user_is_league_member(league_id));

drop policy if exists "scoring breakdown read league members" on public.scoring_breakdown_items;
create policy "scoring breakdown read league members"
on public.scoring_breakdown_items for select
using (public.current_user_is_league_member(league_id));

drop policy if exists "scoring recalculation runs read organizers" on public.scoring_recalculation_runs;
create policy "scoring recalculation runs read organizers"
on public.scoring_recalculation_runs for select
using (public.current_user_is_league_owner_or_admin(league_id));

grant execute on function public.save_match_prediction(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  uuid,
  public.advancement_method,
  uuid,
  uuid,
  text[],
  public.prediction_validation_status,
  public.prediction_sync_status
) to authenticated;

grant execute on function public.upsert_prediction_tiebreak_override(
  uuid,
  text,
  uuid[],
  text,
  public.prediction_sync_status
) to authenticated;

grant execute on function public.upsert_antepost_prediction(
  uuid,
  uuid,
  jsonb,
  public.prediction_sync_status
) to authenticated;

grant execute on function public.update_prediction_set_completion(
  uuid,
  public.prediction_set_status,
  integer,
  integer,
  integer
) to authenticated;

grant execute on function public.update_stage_scoring_rule_value(
  uuid,
  text,
  text,
  integer
) to authenticated;

grant execute on function public.update_antepost_scoring_rule_value(
  uuid,
  text,
  integer
) to authenticated;

grant execute on function public.lock_scoring_rule_snapshot(uuid) to authenticated;

grant execute on function public.persist_scoring_recalculation(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
) to authenticated;

revoke execute on function public.lock_due_leagues() from anon, authenticated;
grant execute on function public.lock_due_leagues() to service_role;
