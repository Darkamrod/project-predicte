-- Milestone 7: deployable trusted worker foundation, explicit provider runtime revokes, and retry candidates.

alter table public.sync_runs
  add column if not exists failure_kind text not null default 'none';

alter table public.result_ingestion_runs
  add column if not exists failure_kind text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sync_runs_failure_kind_check'
      and conrelid = 'public.sync_runs'::regclass
  ) then
    alter table public.sync_runs
      add constraint sync_runs_failure_kind_check
      check (failure_kind in ('none', 'retryable', 'non_retryable'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'result_ingestion_runs_failure_kind_check'
      and conrelid = 'public.result_ingestion_runs'::regclass
  ) then
    alter table public.result_ingestion_runs
      add constraint result_ingestion_runs_failure_kind_check
      check (failure_kind in ('none', 'retryable', 'non_retryable'));
  end if;
end $$;

create index if not exists result_ingestion_runs_m7_retry_idx
on public.result_ingestion_runs (next_retry_at, created_at)
where status = 'failed'
  and failure_kind = 'retryable';

comment on column public.sync_runs.failure_kind
is 'Milestone 7: retry classification for provider import attempts: none, retryable, or non_retryable.';

comment on column public.result_ingestion_runs.failure_kind
is 'Milestone 7: retry classification used by trusted retry candidate selection.';

revoke insert, update, delete on public.sync_runs from anon, authenticated;
revoke insert, update, delete on public.provider_payloads from anon, authenticated;
revoke insert, update, delete on public.result_ingestion_runs from anon, authenticated;
revoke insert, update, delete on public.scoring_events from anon, authenticated;
revoke insert, update, delete on public.leaderboard_snapshots from anon, authenticated;
revoke insert, update, delete on public.leaderboard_entries from anon, authenticated;
revoke insert, update, delete on public.scoring_breakdown_items from anon, authenticated;
revoke insert, update, delete on public.scoring_recalculation_runs from anon, authenticated;

grant select on public.scoring_events to authenticated;
grant select on public.leaderboard_snapshots to authenticated;
grant select on public.leaderboard_entries to authenticated;
grant select on public.scoring_breakdown_items to authenticated;
grant select on public.scoring_recalculation_runs to authenticated;
grant select on public.result_ingestion_runs to authenticated;

create or replace function public.record_provider_result_import(
  p_league_id uuid,
  p_provider text,
  p_external_fixture_key text,
  p_source_result_key text,
  p_payload jsonb,
  p_status text default 'accepted',
  p_correction_of_source_result_key text default null,
  p_error_message text default null,
  p_retry_attempt integer default 0,
  p_max_retries integer default 0,
  p_next_retry_at timestamptz default null
)
returns table(sync_run_id uuid, provider_payload_id uuid, ingestion_run_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := coalesce(nullif(btrim(p_status), ''), 'accepted');
  normalized_provider text := nullif(btrim(coalesce(p_provider, '')), '');
  normalized_external_key text := nullif(btrim(coalesce(p_external_fixture_key, '')), '');
  normalized_source_key text := nullif(btrim(coalesce(p_source_result_key, '')), '');
  normalized_correction_key text := nullif(btrim(coalesce(p_correction_of_source_result_key, '')), '');
  normalized_error_message text := nullif(btrim(coalesce(p_error_message, '')), '');
  correction_state text := 'not_required';
  failure_state text := 'none';
  created_sync_run_id uuid;
  created_payload_id uuid;
  created_ingestion_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Provider result import requires service role';
  end if;

  if not exists (select 1 from public.leagues where id = p_league_id) then
    raise exception 'League not found';
  end if;

  if normalized_provider is null then
    raise exception 'Provider is required';
  end if;

  if normalized_external_key is null then
    raise exception 'External fixture key is required';
  end if;

  if normalized_source_key is null then
    raise exception 'Source result key is required';
  end if;

  if normalized_status not in ('accepted', 'scored', 'failed') then
    raise exception 'Provider import status is invalid';
  end if;

  if p_retry_attempt < 0 or p_max_retries < 0 then
    raise exception 'Retry metadata must be non-negative';
  end if;

  if coalesce(jsonb_typeof(p_payload), '') not in ('object', 'array') then
    raise exception 'Provider payload must be a JSON object or array';
  end if;

  if normalized_correction_key is not null then
    correction_state := case
      when exists (
        select 1
        from public.result_ingestion_runs rir
        where rir.league_id = p_league_id
          and rir.source_result_key = normalized_correction_key
          and rir.status = 'scored'
      )
        then 'verified'
      else 'missing'
    end;

    if correction_state = 'missing' and normalized_status <> 'failed' then
      raise exception 'Correction source result key was not found';
    end if;
  end if;

  if normalized_status = 'failed' then
    failure_state := case
      when lower(coalesce(normalized_error_message, '')) like '%correction source result key was not found%'
        then 'non_retryable'
      when p_retry_attempt < p_max_retries and p_next_retry_at is not null
        then 'retryable'
      else 'non_retryable'
    end;
  end if;

  insert into public.sync_runs (
    provider,
    sync_type,
    status,
    finished_at,
    error_message,
    external_fixture_key,
    source_result_key,
    correction_of_source_result_key,
    retry_attempt,
    max_retries,
    next_retry_at,
    failure_kind
  )
  values (
    normalized_provider,
    'result_import',
    normalized_status,
    case when normalized_status in ('scored', 'failed') then now() else null end,
    normalized_error_message,
    normalized_external_key,
    normalized_source_key,
    normalized_correction_key,
    p_retry_attempt,
    p_max_retries,
    p_next_retry_at,
    failure_state
  )
  returning id into created_sync_run_id;

  insert into public.provider_payloads (
    provider,
    external_id,
    payload,
    sync_run_id,
    payload_kind,
    source_result_key,
    correction_of_source_result_key
  )
  values (
    normalized_provider,
    normalized_external_key,
    p_payload,
    created_sync_run_id,
    'result_import',
    normalized_source_key,
    normalized_correction_key
  )
  returning id into created_payload_id;

  insert into public.result_ingestion_runs (
    league_id,
    source_result_key,
    correction_of_source_result_key,
    payload,
    status,
    trusted_actor,
    error_message,
    completed_at,
    provider,
    external_fixture_key,
    provider_payload_id,
    sync_run_id,
    retry_attempt,
    max_retries,
    next_retry_at,
    correction_status,
    failure_kind
  )
  values (
    p_league_id,
    normalized_source_key,
    normalized_correction_key,
    p_payload,
    normalized_status,
    'provider_import_worker',
    normalized_error_message,
    case when normalized_status in ('scored', 'failed') then now() else null end,
    normalized_provider,
    normalized_external_key,
    created_payload_id,
    created_sync_run_id,
    p_retry_attempt,
    p_max_retries,
    p_next_retry_at,
    correction_state,
    failure_state
  )
  on conflict (league_id, source_result_key)
  do update set
    correction_of_source_result_key = excluded.correction_of_source_result_key,
    payload = excluded.payload,
    status = excluded.status,
    trusted_actor = excluded.trusted_actor,
    error_message = excluded.error_message,
    completed_at = excluded.completed_at,
    provider = excluded.provider,
    external_fixture_key = excluded.external_fixture_key,
    provider_payload_id = excluded.provider_payload_id,
    sync_run_id = excluded.sync_run_id,
    retry_attempt = excluded.retry_attempt,
    max_retries = excluded.max_retries,
    next_retry_at = excluded.next_retry_at,
    correction_status = excluded.correction_status,
    failure_kind = excluded.failure_kind
  returning id into created_ingestion_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    null,
    'PROVIDER_RESULT_IMPORT_RECORDED',
    jsonb_build_object(
      'sync_run_id', created_sync_run_id,
      'provider_payload_id', created_payload_id,
      'ingestion_run_id', created_ingestion_id,
      'provider', normalized_provider,
      'external_fixture_key', normalized_external_key,
      'source_result_key', normalized_source_key,
      'correction_of_source_result_key', normalized_correction_key,
      'correction_status', correction_state,
      'status', normalized_status,
      'retry_attempt', p_retry_attempt,
      'max_retries', p_max_retries,
      'failure_kind', failure_state
    ),
    false
  );

  return query select created_sync_run_id, created_payload_id, created_ingestion_id;
end;
$$;

create or replace function public.trusted_provider_retry_candidates(p_limit integer default 50)
returns table(
  league_id uuid,
  source_result_key text,
  correction_of_source_result_key text,
  provider text,
  external_fixture_key text,
  retry_attempt integer,
  max_retries integer,
  next_retry_at timestamptz,
  error_message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted retry candidates require service role';
  end if;

  if p_limit < 1 or p_limit > 500 then
    raise exception 'Retry candidate limit is outside the allowed range';
  end if;

  return query
    select
      rir.league_id,
      rir.source_result_key,
      rir.correction_of_source_result_key,
      rir.provider,
      rir.external_fixture_key,
      rir.retry_attempt,
      rir.max_retries,
      rir.next_retry_at,
      rir.error_message
    from public.result_ingestion_runs rir
    where rir.status = 'failed'
      and rir.failure_kind = 'retryable'
      and rir.retry_attempt < rir.max_retries
      and rir.next_retry_at is not null
      and rir.next_retry_at <= now()
    order by rir.next_retry_at asc, rir.created_at asc
    limit p_limit;
end;
$$;

revoke all on function public.trusted_provider_retry_candidates(integer) from public;
grant execute on function public.trusted_provider_retry_candidates(integer) to service_role;
