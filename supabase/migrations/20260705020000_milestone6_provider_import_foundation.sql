-- Milestone 6: provider result import, correction workflow, and deployable worker foundation.
-- This keeps imports mock/provider-agnostic and service-role-only.

alter table public.sync_runs
  add column if not exists external_fixture_key text,
  add column if not exists source_result_key text,
  add column if not exists correction_of_source_result_key text,
  add column if not exists retry_attempt integer not null default 0,
  add column if not exists max_retries integer not null default 0,
  add column if not exists next_retry_at timestamptz;

alter table public.provider_payloads
  add column if not exists sync_run_id uuid references public.sync_runs (id) on delete set null,
  add column if not exists payload_kind text not null default 'result_import',
  add column if not exists source_result_key text,
  add column if not exists correction_of_source_result_key text;

alter table public.result_ingestion_runs
  add column if not exists provider text,
  add column if not exists external_fixture_key text,
  add column if not exists provider_payload_id uuid references public.provider_payloads (id) on delete set null,
  add column if not exists sync_run_id uuid references public.sync_runs (id) on delete set null,
  add column if not exists retry_attempt integer not null default 0,
  add column if not exists max_retries integer not null default 0,
  add column if not exists next_retry_at timestamptz,
  add column if not exists correction_status text not null default 'not_required';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'result_ingestion_runs_correction_status_check'
      and conrelid = 'public.result_ingestion_runs'::regclass
  ) then
    alter table public.result_ingestion_runs
      add constraint result_ingestion_runs_correction_status_check
      check (correction_status in ('not_required', 'verified', 'missing'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sync_runs_retry_attempt_non_negative'
      and conrelid = 'public.sync_runs'::regclass
  ) then
    alter table public.sync_runs
      add constraint sync_runs_retry_attempt_non_negative
      check (retry_attempt >= 0 and max_retries >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'result_ingestion_runs_retry_attempt_non_negative'
      and conrelid = 'public.result_ingestion_runs'::regclass
  ) then
    alter table public.result_ingestion_runs
      add constraint result_ingestion_runs_retry_attempt_non_negative
      check (retry_attempt >= 0 and max_retries >= 0);
  end if;
end $$;

create index if not exists sync_runs_m6_source_idx
on public.sync_runs (provider, source_result_key);

create index if not exists provider_payloads_m6_source_idx
on public.provider_payloads (provider, source_result_key);

create index if not exists result_ingestion_runs_m6_provider_idx
on public.result_ingestion_runs (provider, external_fixture_key);

comment on column public.sync_runs.retry_attempt
is 'Milestone 6: server-side provider import retry attempt count.';

comment on column public.result_ingestion_runs.correction_status
is 'Milestone 6: whether correction_of_source_result_key was not required, verified, or missing at import time.';

create or replace function public.trusted_result_ingestion_exists(
  p_league_id uuid,
  p_source_result_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Trusted result lookup requires service role';
  end if;

  if nullif(btrim(coalesce(p_source_result_key, '')), '') is null then
    return false;
  end if;

  return exists (
    select 1
    from public.result_ingestion_runs rir
    where rir.league_id = p_league_id
      and rir.source_result_key = btrim(p_source_result_key)
      and rir.status = 'scored'
  );
end;
$$;

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
  correction_state text := 'not_required';
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
    next_retry_at
  )
  values (
    normalized_provider,
    'result_import',
    normalized_status,
    case when normalized_status in ('scored', 'failed') then now() else null end,
    nullif(btrim(coalesce(p_error_message, '')), ''),
    normalized_external_key,
    normalized_source_key,
    normalized_correction_key,
    p_retry_attempt,
    p_max_retries,
    p_next_retry_at
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
    correction_status
  )
  values (
    p_league_id,
    normalized_source_key,
    normalized_correction_key,
    p_payload,
    normalized_status,
    'provider_import_worker',
    nullif(btrim(coalesce(p_error_message, '')), ''),
    case when normalized_status in ('scored', 'failed') then now() else null end,
    normalized_provider,
    normalized_external_key,
    created_payload_id,
    created_sync_run_id,
    p_retry_attempt,
    p_max_retries,
    p_next_retry_at,
    correction_state
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
    correction_status = excluded.correction_status
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
      'max_retries', p_max_retries
    ),
    false
  );

  return query select created_sync_run_id, created_payload_id, created_ingestion_id;
end;
$$;

revoke all on function public.trusted_result_ingestion_exists(uuid, text) from public;
grant execute on function public.trusted_result_ingestion_exists(uuid, text) to service_role;

revoke all on function public.record_provider_result_import(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  integer,
  integer,
  timestamptz
) from public;

grant execute on function public.record_provider_result_import(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  text,
  integer,
  integer,
  timestamptz
) to service_role;
