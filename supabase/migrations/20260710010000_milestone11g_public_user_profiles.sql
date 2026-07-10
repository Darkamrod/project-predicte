create table if not exists public.public_user_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null,
  username text,
  avatar_url text,
  updated_at timestamptz not null default now(),
  constraint public_user_profiles_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint public_user_profiles_username_shape check (
    username is null or username ~ '^[A-Za-z0-9._-]{2,32}$'
  )
);

comment on table public.public_user_profiles is
  'Minimal public identity read model for league members. It intentionally excludes email, auth metadata, external account identifiers, locale, timezone, and private profile fields.';
comment on column public.public_user_profiles.display_name is
  'Sanitized public display name copied from profiles.display_name, never from auth metadata in this read model.';
comment on column public.public_user_profiles.username is
  'Optional future public username. Null in Milestone 11G until a dedicated safe username UX exists.';
comment on column public.public_user_profiles.avatar_url is
  'Optional future public avatar URL. Not copied from profiles in Milestone 11G.';

create index if not exists public_user_profiles_username_idx
on public.public_user_profiles (username)
where username is not null;

create or replace function public.safe_public_profile_display_name(
  p_display_name text,
  p_user_id uuid
)
returns text
language sql
stable
set search_path = public
as $$
  select case
    when candidate is null then
      null
    when candidate ~* '(^|[^[:alnum:]_.%+-])[[:alnum:]_.%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}([^[:alnum:]_.%+-]|$)' then
      null
    else
      left(candidate, 60)
  end
  from (
    select nullif(regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g'), '') as candidate
  ) normalized;
$$;

create or replace function public.sync_public_user_profile_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.public_user_profiles (user_id, display_name, username, avatar_url, updated_at)
  values (
    new.id,
    coalesce(
      public.safe_public_profile_display_name(new.display_name, new.id),
      'Utente ' || left(replace(new.id::text, '-', ''), 8)
    ),
    null,
    null,
    now()
  )
  on conflict (user_id) do update
  set
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists profiles_sync_public_user_profile on public.profiles;

create trigger profiles_sync_public_user_profile
after insert or update of display_name on public.profiles
for each row execute function public.sync_public_user_profile_from_profile();

insert into public.public_user_profiles (user_id, display_name, username, avatar_url, updated_at)
select
  p.id,
  coalesce(
    public.safe_public_profile_display_name(p.display_name, p.id),
    'Utente ' || left(replace(p.id::text, '-', ''), 8)
  ),
  null,
  null,
  now()
from public.profiles p
on conflict (user_id) do update
set
  display_name = excluded.display_name,
  updated_at = now();

alter table public.public_user_profiles enable row level security;

revoke all on public.public_user_profiles from anon, authenticated;
grant select on public.public_user_profiles to authenticated;

revoke execute on function public.safe_public_profile_display_name(text, uuid) from anon, authenticated;
revoke execute on function public.sync_public_user_profile_from_profile() from anon, authenticated;

drop policy if exists "public user profiles read self or shared league" on public.public_user_profiles;

create policy "public user profiles read self or shared league"
on public.public_user_profiles
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.league_members target_member
    where target_member.user_id = public_user_profiles.user_id
      and target_member.status = 'active'
      and public.current_user_is_league_member(target_member.league_id)
  )
);
