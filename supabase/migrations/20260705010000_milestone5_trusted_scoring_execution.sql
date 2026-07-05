-- Milestone 5: trusted server scoring execution and mock result ingestion foundation.
-- Official scoring persistence is restricted to service-role server execution.

create table if not exists public.result_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  source_result_key text not null,
  correction_of_source_result_key text,
  payload jsonb not null,
  status text not null check (status in ('accepted', 'scored', 'failed')),
  trusted_actor text not null default 'server_worker',
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (league_id, source_result_key)
);

alter table public.result_ingestion_runs enable row level security;

comment on table public.result_ingestion_runs
is 'Milestone 5: service-role-only result ingestion audit rows for mock/server-side result payloads, corrections, retries, and future provider result versioning.';

comment on column public.result_ingestion_runs.source_result_key
is 'Stable idempotency key used by trusted scoring recalculation and future result-version imports.';

comment on column public.result_ingestion_runs.correction_of_source_result_key
is 'Optional previous source_result_key corrected by this ingestion run.';

drop policy if exists "result ingestion runs read organizers" on public.result_ingestion_runs;
create policy "result ingestion runs read organizers"
on public.result_ingestion_runs for select
to authenticated
using (public.current_user_is_league_owner_or_admin(league_id));

grant select on public.result_ingestion_runs to authenticated;
revoke insert, update, delete on public.result_ingestion_runs from anon, authenticated;
revoke insert, update, delete on public.scoring_events from anon, authenticated;
revoke insert, update, delete on public.leaderboard_snapshots from anon, authenticated;
revoke insert, update, delete on public.leaderboard_entries from anon, authenticated;
revoke insert, update, delete on public.scoring_breakdown_items from anon, authenticated;
revoke insert, update, delete on public.scoring_recalculation_runs from anon, authenticated;

create or replace function public.record_trusted_result_ingestion(
  p_league_id uuid,
  p_source_result_key text,
  p_payload jsonb,
  p_status text default 'accepted',
  p_correction_of_source_result_key text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_run_id uuid;
  normalized_status text := coalesce(nullif(btrim(p_status), ''), 'accepted');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted result ingestion requires service role';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'League not found';
  end if;

  if nullif(btrim(coalesce(p_source_result_key, '')), '') is null then
    raise exception 'Source result key is required';
  end if;

  if normalized_status not in ('accepted', 'scored', 'failed') then
    raise exception 'Result ingestion status is invalid';
  end if;

  if coalesce(jsonb_typeof(p_payload), '') not in ('object', 'array') then
    raise exception 'Result ingestion payload must be a JSON object or array';
  end if;

  insert into public.result_ingestion_runs (
    league_id,
    source_result_key,
    correction_of_source_result_key,
    payload,
    status,
    trusted_actor,
    error_message,
    completed_at
  )
  values (
    p_league_id,
    btrim(p_source_result_key),
    nullif(btrim(coalesce(p_correction_of_source_result_key, '')), ''),
    p_payload,
    normalized_status,
    'server_worker',
    nullif(btrim(coalesce(p_error_message, '')), ''),
    case when normalized_status in ('scored', 'failed') then now() else null end
  )
  on conflict (league_id, source_result_key)
  do update set
    correction_of_source_result_key = excluded.correction_of_source_result_key,
    payload = excluded.payload,
    status = excluded.status,
    trusted_actor = excluded.trusted_actor,
    error_message = excluded.error_message,
    completed_at = excluded.completed_at
  returning id into created_run_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    null,
    'TRUSTED_RESULT_INGESTED',
    jsonb_build_object(
      'ingestion_run_id', created_run_id,
      'source_result_key', btrim(p_source_result_key),
      'correction_of_source_result_key', nullif(btrim(coalesce(p_correction_of_source_result_key, '')), ''),
      'status', normalized_status
    ),
    false
  );

  return created_run_id;
end;
$$;

create or replace function public.persist_scoring_recalculation(
  p_league_id uuid,
  p_source_result_key text,
  p_calculation_version text,
  p_events jsonb,
  p_leaderboard_entries jsonb,
  p_breakdown_items jsonb default '[]'::jsonb,
  p_reason text default 'trusted_result_recalculation'
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted scoring persistence requires service role';
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
    coalesce(p_reason, 'trusted_result_recalculation'),
    null
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

  update public.result_ingestion_runs
  set
    status = 'scored',
    completed_at = now(),
    error_message = null
  where league_id = p_league_id
    and source_result_key = btrim(p_source_result_key);

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    null,
    'TRUSTED_SCORING_RECALCULATED',
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

revoke all on function public.record_trusted_result_ingestion(
  uuid,
  text,
  jsonb,
  text,
  text,
  text
) from public;

grant execute on function public.record_trusted_result_ingestion(
  uuid,
  text,
  jsonb,
  text,
  text,
  text
) to service_role;

revoke all on function public.persist_scoring_recalculation(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
) from public;

revoke execute on function public.persist_scoring_recalculation(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
) from anon, authenticated;

grant execute on function public.persist_scoring_recalculation(
  uuid,
  text,
  text,
  jsonb,
  jsonb,
  jsonb,
  text
) to service_role;
