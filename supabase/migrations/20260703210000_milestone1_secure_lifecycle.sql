create or replace function public.hash_invite_token(p_token text)
returns text
language sql
immutable
strict
as $$
  select encode(digest(p_token, 'sha256'), 'hex');
$$;

create or replace function public.generate_invite_token()
returns text
language sql
volatile
as $$
  select translate(replace(encode(gen_random_bytes(18), 'base64'), '=', ''), '+/', '-_');
$$;

create or replace function public.ensure_current_user_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, display_name, avatar_url, locale, timezone)
  select
    au.id,
    coalesce(
      nullif(au.raw_user_meta_data ->> 'display_name', ''),
      nullif(au.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(au.email, '@', 1), ''),
      'Nuovo utente'
    ),
    coalesce(au.raw_user_meta_data ->> 'avatar_url', au.raw_user_meta_data ->> 'picture'),
    coalesce(nullif(au.raw_user_meta_data ->> 'locale', ''), 'it-IT'),
    coalesce(nullif(au.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  from auth.users au
  where au.id = auth.uid()
  on conflict (id) do nothing;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale, timezone)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Nuovo utente'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'it-IT'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.current_user_is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = p_league_id
      and lm.user_id = auth.uid()
      and lm.status = 'active'
  );
$$;

create or replace function public.current_user_league_role(p_league_id uuid)
returns public.league_member_role
language sql
stable
security definer
set search_path = public
as $$
  select lm.role
  from public.league_members lm
  where lm.league_id = p_league_id
    and lm.user_id = auth.uid()
    and lm.status = 'active'
  limit 1;
$$;

create or replace function public.current_user_is_league_owner(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_league_role(p_league_id) = 'owner';
$$;

create or replace function public.current_user_is_league_owner_or_admin(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_league_role(p_league_id) in ('owner', 'admin');
$$;

create or replace function public.league_accepts_member_and_prediction_writes(p_league_id uuid)
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
      and l.status in ('draft', 'open')
      and now() < l.deadline_at
  );
$$;

create or replace function public.prediction_set_is_visible(p_prediction_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.prediction_sets ps
    join public.leagues l on l.id = ps.league_id
    where ps.id = p_prediction_set_id
      and (
        ps.user_id = auth.uid()
        or (
          l.status in ('locked', 'live', 'completed', 'archived')
          and public.current_user_is_league_member(l.id)
        )
      )
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
      and public.league_accepts_member_and_prediction_writes(ps.league_id)
  );
$$;

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
  selected_preset_schema_version integer := 1;
  selected_preset_config jsonb := '{}'::jsonb;
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

  select sp.schema_version, sp.config
  into selected_preset_schema_version, selected_preset_config
  from public.scoring_presets sp
  where sp.active = true
    and (
      (p_scoring_preset_id is not null and sp.id = p_scoring_preset_id)
      or (p_scoring_preset_id is null and sp.competition_edition_id = p_competition_edition_id)
      or (p_scoring_preset_id is null and sp.competition_template_id = target_edition.template_id)
    )
  order by
    case
      when p_scoring_preset_id is not null and sp.id = p_scoring_preset_id then 0
      when sp.competition_edition_id = p_competition_edition_id then 1
      else 2
    end,
    sp.created_at desc
  limit 1;

  insert into public.leagues (
    competition_edition_id,
    owner_id,
    name,
    status,
    deadline_at,
    invite_settings
  )
  values (
    p_competition_edition_id,
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
    coalesce(selected_preset_schema_version, 1),
    coalesce(selected_preset_config, '{}'::jsonb),
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
    jsonb_build_object('deadline_at', p_deadline_at),
    true
  );

  return created_league_id;
end;
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

  if not public.league_accepts_member_and_prediction_writes(p_league_id) then
    raise exception 'League is locked or past deadline';
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

  if not public.league_accepts_member_and_prediction_writes(p_league_id) then
    raise exception 'League is locked or past deadline';
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

  if not public.league_accepts_member_and_prediction_writes(p_league_id) then
    raise exception 'League is locked or past deadline';
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

create or replace function public.update_league_deadline(
  p_league_id uuid,
  p_deadline_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can update deadlines';
  end if;

  select l.status, l.deadline_at, ce.maximum_deadline_at
  into target_league
  from public.leagues l
  join public.competition_editions ce on ce.id = l.competition_edition_id
  where l.id = p_league_id;

  if not found then
    raise exception 'League not found';
  end if;

  if target_league.status <> 'open' then
    raise exception 'Deadline can only be changed while league is open';
  end if;

  if now() >= target_league.deadline_at or now() >= p_deadline_at then
    raise exception 'A passed deadline cannot be extended or changed';
  end if;

  if target_league.maximum_deadline_at is not null
    and p_deadline_at > target_league.maximum_deadline_at then
    raise exception 'Deadline exceeds competition maximum deadline';
  end if;

  update public.leagues
  set deadline_at = p_deadline_at, updated_at = now()
  where id = p_league_id;

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (
    p_league_id,
    auth.uid(),
    'DEADLINE_UPDATED',
    jsonb_build_object('deadline_at', p_deadline_at),
    true
  );
end;
$$;

create or replace function public.lock_league(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league public.leagues%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.current_user_is_league_owner_or_admin(p_league_id) then
    raise exception 'Only league owners or admins can lock leagues';
  end if;

  select *
  into target_league
  from public.leagues
  where id = p_league_id
  for update;

  if not found then
    raise exception 'League not found';
  end if;

  if target_league.status not in ('draft', 'open') then
    return;
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
    checksum = coalesce(checksum, 'md5-' || md5(config::text)),
    locked_at = coalesce(locked_at, now())
  where id = target_league.current_scoring_rule_version_id
    and status = 'draft';

  insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
  values (p_league_id, auth.uid(), 'LEAGUE_LOCKED', '{}'::jsonb, true);
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
      checksum = coalesce(checksum, 'md5-' || md5(config::text)),
      locked_at = coalesce(locked_at, now())
    where id = due_league.current_scoring_rule_version_id
      and status = 'draft';

    insert into public.audit_log (league_id, actor_user_id, event_type, event_payload, visible_to_members)
    values (due_league.id, null, 'LEAGUE_LOCKED_BY_DEADLINE', '{}'::jsonb, true);

    locked_count := locked_count + 1;
  end loop;

  return locked_count;
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

  if not public.league_accepts_member_and_prediction_writes(new.league_id) then
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
    or not public.league_accepts_member_and_prediction_writes(target_league_id) then
    raise exception 'Predictions are locked or past deadline';
  end if;

  return new;
end;
$$;

drop trigger if exists prediction_sets_prevent_late_write on public.prediction_sets;
create trigger prediction_sets_prevent_late_write
before insert or update on public.prediction_sets
for each row execute function public.prevent_late_prediction_set_write();

drop trigger if exists prediction_tiebreak_overrides_prevent_late_write on public.prediction_tiebreak_overrides;
create trigger prediction_tiebreak_overrides_prevent_late_write
before insert or update on public.prediction_tiebreak_overrides
for each row execute function public.prevent_late_prediction_write();

drop trigger if exists antepost_predictions_prevent_late_write on public.antepost_predictions;
create trigger antepost_predictions_prevent_late_write
before insert or update on public.antepost_predictions
for each row execute function public.prevent_late_prediction_write();

drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "league members read own leagues" on public.leagues;
drop policy if exists "members read same league" on public.league_members;
drop policy if exists "own prediction sets before lock" on public.prediction_sets;
drop policy if exists "own match predictions before lock" on public.match_predictions;
drop policy if exists "leaderboard read members" on public.leaderboard_snapshots;
drop policy if exists "leaderboard entries read members" on public.leaderboard_entries;

create policy "profiles read own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles insert own"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles update own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "leagues read active members"
on public.leagues for select
using (public.current_user_is_league_member(id));

create policy "league members read same active league"
on public.league_members for select
using (public.current_user_is_league_member(league_id));

create policy "league invites read organizers"
on public.league_invites for select
using (public.current_user_is_league_owner_or_admin(league_id));

create policy "scoring presets read authenticated"
on public.scoring_presets for select
to authenticated
using (active = true);

create policy "league scoring rules read members"
on public.league_scoring_rule_versions for select
using (public.current_user_is_league_member(league_id));

create policy "league scoring rules update organizers before lock"
on public.league_scoring_rule_versions for update
using (
  status = 'draft'
  and public.current_user_is_league_owner_or_admin(league_id)
  and public.league_accepts_member_and_prediction_writes(league_id)
)
with check (
  status = 'draft'
  and public.current_user_is_league_owner_or_admin(league_id)
  and public.league_accepts_member_and_prediction_writes(league_id)
);

create policy "prediction sets visible own or after lock"
on public.prediction_sets for select
using (public.prediction_set_is_visible(id));

create policy "match predictions visible own or after lock"
on public.match_predictions for select
using (public.prediction_set_is_visible(prediction_set_id));

create policy "match predictions insert own before deadline"
on public.match_predictions for insert
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "match predictions update own before deadline"
on public.match_predictions for update
using (public.prediction_set_is_writable_by_current_user(prediction_set_id))
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "tiebreak overrides visible own or after lock"
on public.prediction_tiebreak_overrides for select
using (public.prediction_set_is_visible(prediction_set_id));

create policy "tiebreak overrides write own before deadline"
on public.prediction_tiebreak_overrides for all
using (public.prediction_set_is_writable_by_current_user(prediction_set_id))
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "antepost predictions visible own or after lock"
on public.antepost_predictions for select
using (public.prediction_set_is_visible(prediction_set_id));

create policy "antepost predictions write own before deadline"
on public.antepost_predictions for all
using (public.prediction_set_is_writable_by_current_user(prediction_set_id))
with check (public.prediction_set_is_writable_by_current_user(prediction_set_id));

create policy "scoring events read league members"
on public.scoring_events for select
using (public.current_user_is_league_member(league_id));

create policy "leaderboard snapshots read league members"
on public.leaderboard_snapshots for select
using (public.current_user_is_league_member(league_id));

create policy "leaderboard entries read league members"
on public.leaderboard_entries for select
using (
  exists (
    select 1
    from public.leaderboard_snapshots ls
    where ls.id = snapshot_id
      and public.current_user_is_league_member(ls.league_id)
  )
);

create policy "audit log read organizers and member visible"
on public.audit_log for select
using (
  (league_id is not null and public.current_user_is_league_owner_or_admin(league_id))
  or (
    visible_to_members = true
    and league_id is not null
    and public.current_user_is_league_member(league_id)
  )
);

create policy "notifications read own"
on public.notifications for select
using (user_id = auth.uid());

create policy "notifications update own read state"
on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "feature flags read enabled"
on public.feature_flags for select
to authenticated
using (enabled = true);

revoke execute on function public.lock_due_leagues() from anon, authenticated;
grant execute on function public.lock_due_leagues() to service_role;

grant execute on function public.create_private_league(uuid, text, timestamptz, uuid) to authenticated;
grant execute on function public.create_league_invite(uuid, timestamptz, integer) to authenticated;
grant execute on function public.join_league_by_invite(text) to authenticated;
grant execute on function public.set_league_member_role(uuid, uuid, public.league_member_role) to authenticated;
grant execute on function public.remove_league_member(uuid, uuid) to authenticated;
grant execute on function public.update_league_deadline(uuid, timestamptz) to authenticated;
grant execute on function public.lock_league(uuid) to authenticated;
