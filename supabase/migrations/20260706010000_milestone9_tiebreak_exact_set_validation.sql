-- Milestone 9: require tie-break ordered teams and tied teams to be the same set.

create or replace function public.upsert_prediction_tiebreak_override(
  p_league_id uuid,
  p_scope_ref text,
  p_ordered_team_ids uuid[],
  p_tie_group_id text default null,
  p_reason text default '',
  p_sync_status public.prediction_sync_status default 'SYNCED',
  p_scope text default 'GROUP',
  p_tied_team_ids uuid[] default '{}'::uuid[],
  p_affected_positions integer[] default '{}'::integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_prediction_set_id uuid;
  saved_override_id uuid;
  normalized_scope_ref text;
  normalized_tie_group_id text;
  normalized_scope text;
  normalized_tied_team_ids uuid[];
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

  normalized_scope_ref := btrim(coalesce(p_scope_ref, ''));
  normalized_tie_group_id := coalesce(nullif(btrim(coalesce(p_tie_group_id, '')), ''), normalized_scope_ref);
  normalized_scope := upper(btrim(coalesce(p_scope, 'GROUP')));
  normalized_tied_team_ids := case
    when coalesce(array_length(p_tied_team_ids, 1), 0) = 0 then p_ordered_team_ids
    else p_tied_team_ids
  end;

  if normalized_scope_ref = '' then
    raise exception 'Tie-break scope is required';
  end if;

  if normalized_tie_group_id = '' then
    raise exception 'Tie-break group is required';
  end if;

  if normalized_scope not in ('GROUP', 'BEST_THIRDS', 'LEAGUE_PHASE') then
    raise exception 'Unsupported tie-break scope';
  end if;

  if coalesce(array_length(p_ordered_team_ids, 1), 0) = 0 then
    raise exception 'Tie-break order cannot be empty';
  end if;

  if coalesce(array_length(normalized_tied_team_ids, 1), 0) = 0 then
    raise exception 'Tied teams cannot be empty';
  end if;

  if array_length(p_ordered_team_ids, 1) <> array_length(normalized_tied_team_ids, 1) then
    raise exception 'Tie-break order must match tied teams exactly';
  end if;

  if exists (
    select 1
    from unnest(p_ordered_team_ids) as ordered(team_id)
    group by ordered.team_id
    having count(*) > 1
  ) then
    raise exception 'Tie-break order cannot contain duplicate teams';
  end if;

  if exists (
    select 1
    from unnest(normalized_tied_team_ids) as tied(team_id)
    group by tied.team_id
    having count(*) > 1
  ) then
    raise exception 'Tied teams cannot contain duplicate teams';
  end if;

  if exists (
    select 1
    from unnest(normalized_tied_team_ids) as tied(team_id)
    where tied.team_id <> all(p_ordered_team_ids)
  ) or exists (
    select 1
    from unnest(p_ordered_team_ids) as ordered(team_id)
    where ordered.team_id <> all(normalized_tied_team_ids)
  ) then
    raise exception 'Tie-break order must match tied teams exactly';
  end if;

  insert into public.prediction_tiebreak_overrides (
    prediction_set_id,
    scope,
    scope_ref,
    tie_group_id,
    tied_team_ids,
    affected_positions,
    ordered_team_ids,
    reason,
    sync_status,
    updated_at
  )
  values (
    target_prediction_set_id,
    normalized_scope,
    normalized_scope_ref,
    normalized_tie_group_id,
    normalized_tied_team_ids,
    coalesce(p_affected_positions, '{}'::integer[]),
    p_ordered_team_ids,
    coalesce(p_reason, ''),
    p_sync_status,
    now()
  )
  on conflict on constraint prediction_tiebreak_overrides_prediction_set_scope_group_key
  do update set
    scope = excluded.scope,
    tied_team_ids = excluded.tied_team_ids,
    affected_positions = excluded.affected_positions,
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

grant execute on function public.upsert_prediction_tiebreak_override(
  uuid,
  text,
  uuid[],
  text,
  text,
  public.prediction_sync_status,
  text,
  uuid[],
  integer[]
) to authenticated;
