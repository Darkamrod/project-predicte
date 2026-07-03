create or replace function public.league_accepts_members(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leagues l
    where l.id = p_league_id
      and l.status = 'open'
      and now() < l.deadline_at
  );
$$;

create or replace function public.league_accepts_predictions(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leagues l
    where l.id = p_league_id
      and l.status = 'open'
      and now() < l.deadline_at
  );
$$;

create or replace function public.prediction_set_is_writable_by_current_user(p_prediction_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prediction_sets ps
    where ps.id = p_prediction_set_id
      and ps.user_id = auth.uid()
      and public.league_accepts_predictions(ps.league_id)
  );
$$;

create or replace function public.create_league_invite(
  p_league_id uuid,
  p_expires_at timestamptz default null,
  p_max_uses integer default null
)
returns table(invite_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_token text;
  effective_expires_at timestamptz;
  created_invite_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can create invites';
  end if;

  if not public.league_accepts_members(p_league_id) then
    raise exception 'League is not accepting new members';
  end if;

  if p_max_uses is not null and p_max_uses <= 0 then
    raise exception 'max uses must be positive';
  end if;

  effective_expires_at := coalesce(p_expires_at, now() + interval '7 days');

  if effective_expires_at <= now() then
    raise exception 'Invite expiry must be in the future';
  end if;

  generated_token := public.generate_invite_token();

  insert into public.league_invites (
    league_id,
    hashed_token,
    created_by,
    expires_at,
    max_uses
  )
  values (
    p_league_id,
    public.hash_invite_token(generated_token),
    auth.uid(),
    effective_expires_at,
    p_max_uses
  )
  returning id into created_invite_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'INVITE_CREATED',
    jsonb_build_object('invite_id', created_invite_id, 'expires_at', effective_expires_at),
    false
  );

  return query select created_invite_id, generated_token, effective_expires_at;
end;
$$;

create or replace function public.join_league_by_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record record;
  already_active boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_current_user_profile();

  select
    li.id,
    li.league_id,
    li.expires_at,
    li.max_uses,
    li.uses,
    li.revoked_at,
    l.status as league_status,
    l.deadline_at
  into invite_record
  from public.league_invites li
  join public.leagues l on l.id = li.league_id
  where li.hashed_token = public.hash_invite_token(trim(p_token))
  for update of li;

  if not found then
    raise exception 'Invite token is invalid';
  end if;

  if invite_record.revoked_at is not null then
    raise exception 'Invite token has been revoked';
  end if;

  if invite_record.expires_at is not null and now() >= invite_record.expires_at then
    raise exception 'Invite token has expired';
  end if;

  if invite_record.max_uses is not null and invite_record.uses >= invite_record.max_uses then
    raise exception 'Invite token has reached its use limit';
  end if;

  if invite_record.league_status <> 'open' or now() >= invite_record.deadline_at then
    raise exception 'League is not accepting new members';
  end if;

  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = invite_record.league_id
      and lm.user_id = auth.uid()
      and lm.status = 'active'
  )
  into already_active;

  if already_active then
    return invite_record.league_id;
  end if;

  update public.league_invites
  set uses = uses + 1
  where id = invite_record.id;

  insert into public.league_members (league_id, user_id, role, status)
  values (invite_record.league_id, auth.uid(), 'participant', 'active')
  on conflict (league_id, user_id)
  do update set status = 'active', role = 'participant', joined_at = now(), removed_at = null;

  insert into public.prediction_sets (league_id, user_id, status)
  values (invite_record.league_id, auth.uid(), 'draft')
  on conflict (league_id, user_id) do nothing;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    invite_record.league_id,
    auth.uid(),
    'INVITE_ACCEPTED',
    jsonb_build_object('invite_id', invite_record.id),
    true
  );

  return invite_record.league_id;
end;
$$;

create or replace function public.set_league_member_role(
  p_league_id uuid,
  p_user_id uuid,
  p_role public.league_member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.league_member_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_role = 'owner' then
    raise exception 'Ownership transfer is not implemented in Milestone 1';
  end if;

  if not public.current_user_is_league_owner(p_league_id) then
    raise exception 'Only the league owner can change roles';
  end if;

  if not public.league_accepts_members(p_league_id) then
    raise exception 'League is not accepting member changes';
  end if;

  select role
  into target_role
  from public.league_members
  where league_id = p_league_id
    and user_id = p_user_id
    and status = 'active';

  if not found then
    raise exception 'Target member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'Owner role cannot be changed here';
  end if;

  update public.league_members
  set role = p_role
  where league_id = p_league_id
    and user_id = p_user_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'MEMBER_ROLE_CHANGED',
    jsonb_build_object('user_id', p_user_id, 'role', p_role),
    true
  );
end;
$$;

create or replace function public.remove_league_member(p_league_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role public.league_member_role;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can remove members';
  end if;

  if not public.league_accepts_members(p_league_id) then
    raise exception 'League is not accepting member changes';
  end if;

  select role
  into target_role
  from public.league_members
  where league_id = p_league_id
    and user_id = p_user_id
    and status = 'active';

  if not found then
    raise exception 'Target member not found';
  end if;

  if target_role = 'owner' then
    raise exception 'Owner cannot be removed';
  end if;

  update public.league_members
  set status = 'removed', removed_at = now()
  where league_id = p_league_id
    and user_id = p_user_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'MEMBER_REMOVED',
    jsonb_build_object('user_id', p_user_id),
    true
  );
end;
$$;

create or replace function public.prevent_late_prediction_set_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and new.status = 'locked' then
    return new;
  end if;

  if not public.league_accepts_predictions(new.league_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_late_prediction_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league_id uuid;
begin
  select ps.league_id
  into target_league_id
  from public.prediction_sets ps
  where ps.id = new.prediction_set_id;

  if target_league_id is null
    or not public.league_accepts_predictions(target_league_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  return new;
end;
$$;

drop policy if exists "league scoring rules update organizers before lock" on public.league_scoring_rule_versions;

create policy "league scoring rules update organizers before lock"
on public.league_scoring_rule_versions for update
using (
  status = 'draft'
  and public.current_user_is_league_owner_or_admin(league_id)
  and public.league_accepts_members(league_id)
)
with check (
  status = 'draft'
  and public.current_user_is_league_owner_or_admin(league_id)
  and public.league_accepts_members(league_id)
);

drop policy if exists "tiebreak overrides visible own or after lock" on public.prediction_tiebreak_overrides;
drop policy if exists "tiebreak overrides write own before deadline" on public.prediction_tiebreak_overrides;
drop policy if exists "tiebreak overrides insert own before deadline" on public.prediction_tiebreak_overrides;
drop policy if exists "tiebreak overrides update own before deadline" on public.prediction_tiebreak_overrides;

create policy "tiebreak overrides visible own or after lock"
on public.prediction_tiebreak_overrides for select
using (public.prediction_set_is_visible(prediction_set_id));

create policy "tiebreak overrides insert own before deadline"
on public.prediction_tiebreak_overrides for insert
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "tiebreak overrides update own before deadline"
on public.prediction_tiebreak_overrides for update
using (public.prediction_set_is_writable_by_current_user(prediction_set_id))
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

drop policy if exists "antepost predictions visible own or after lock" on public.antepost_predictions;
drop policy if exists "antepost predictions write own before deadline" on public.antepost_predictions;
drop policy if exists "antepost predictions insert own before deadline" on public.antepost_predictions;
drop policy if exists "antepost predictions update own before deadline" on public.antepost_predictions;

create policy "antepost predictions visible own or after lock"
on public.antepost_predictions for select
using (public.prediction_set_is_visible(prediction_set_id));

create policy "antepost predictions insert own before deadline"
on public.antepost_predictions for insert
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "antepost predictions update own before deadline"
on public.antepost_predictions for update
using (public.prediction_set_is_writable_by_current_user(prediction_set_id))
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

drop function if exists public.league_accepts_member_and_prediction_writes(uuid);
