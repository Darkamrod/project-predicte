create extension if not exists pgcrypto;

create type public.league_status as enum (
  'draft',
  'open',
  'locked',
  'live',
  'completed',
  'archived',
  'cancelled'
);

create type public.league_member_role as enum ('owner', 'admin', 'participant');
create type public.member_status as enum ('active', 'removed');
create type public.rule_version_status as enum ('draft', 'locked');
create type public.prediction_set_status as enum ('draft', 'complete', 'locked');
create type public.prediction_validation_status as enum ('valid', 'invalid', 'incomplete');
create type public.advancement_method as enum ('REGULATION', 'EXTRA_TIME', 'PENALTIES');
create type public.match_status as enum (
  'NOT_STARTED',
  'LIVE',
  'HALFTIME',
  'FULL_TIME',
  'AFTER_EXTRA_TIME',
  'AFTER_PENALTIES',
  'POSTPONED',
  'SUSPENDED',
  'CANCELLED',
  'ABANDONED',
  'AWARDED',
  'UNKNOWN'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  locale text not null default 'it-IT',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  token text not null unique,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table public.competition_templates (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports (id),
  code text not null unique,
  name text not null
);

create table public.competition_editions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.competition_templates (id),
  name text not null,
  season_label text not null,
  enabled boolean not null default false,
  first_kickoff_at timestamptz,
  maximum_deadline_at timestamptz,
  format jsonb not null default '{}'::jsonb,
  data_completeness text not null default 'partial',
  created_at timestamptz not null default now()
);

create table public.stages (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  code text not null,
  kind text not null,
  name text not null,
  sort_order integer not null,
  unique (edition_id, code)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  stage_id uuid not null references public.stages (id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null,
  unique (edition_id, code)
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  stage_id uuid not null references public.stages (id) on delete cascade,
  code text not null,
  name text not null,
  sort_order integer not null,
  unique (edition_id, code)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  country_code text
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams (id),
  display_name text not null
);

create table public.edition_teams (
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  team_id uuid not null references public.teams (id),
  seed_group_id uuid references public.groups (id),
  primary key (edition_id, team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  stage_id uuid not null references public.stages (id),
  group_id uuid references public.groups (id),
  round_id uuid references public.rounds (id),
  home_team_id uuid references public.teams (id),
  away_team_id uuid references public.teams (id),
  bracket_payload jsonb not null default '{}'::jsonb,
  kickoff_at timestamptz,
  status public.match_status not null default 'NOT_STARTED',
  sort_order integer not null
);

create table public.bracket_slots (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  round_id uuid not null references public.rounds (id),
  source_type text not null,
  source_payload jsonb not null
);

create table public.competition_tiebreak_rules (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  scope text not null,
  sort_order integer not null,
  rule_code text not null,
  rule_payload jsonb not null default '{}'::jsonb
);

create table public.competition_antepost_definitions (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  code text not null,
  label text not null,
  value_type text not null,
  required boolean not null default true
);

create table public.provider_mappings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  entity_type text not null,
  local_entity_id uuid not null,
  external_id text not null,
  unique (provider, entity_type, external_id)
);

create table public.provider_payloads (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  sync_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_message text
);

create table public.match_result_versions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  source_payload_id uuid references public.provider_payloads (id),
  status public.match_status not null,
  home_score_90 integer,
  away_score_90 integer,
  extra_time_payload jsonb,
  penalty_payload jsonb,
  qualified_team_id uuid references public.teams (id),
  advancement_method public.advancement_method,
  provider_updated_at timestamptz,
  received_at timestamptz not null default now(),
  version integer not null,
  unique (match_id, version)
);

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  competition_edition_id uuid not null references public.competition_editions (id),
  owner_id uuid not null references public.profiles (id),
  name text not null,
  status public.league_status not null default 'draft',
  deadline_at timestamptz not null,
  current_scoring_rule_version_id uuid,
  invite_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.league_member_role not null default 'participant',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  primary key (league_id, user_id)
);

create table public.league_invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  hashed_token text not null unique,
  created_by uuid not null references public.profiles (id),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.scoring_presets (
  id uuid primary key default gen_random_uuid(),
  competition_template_id uuid references public.competition_templates (id),
  competition_edition_id uuid references public.competition_editions (id),
  name text not null,
  schema_version integer not null,
  config jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.league_scoring_rule_versions (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  version integer not null,
  status public.rule_version_status not null,
  schema_version integer not null,
  config jsonb not null,
  checksum text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  locked_at timestamptz,
  unique (league_id, version)
);

alter table public.leagues
  add constraint leagues_current_rule_fk
  foreign key (current_scoring_rule_version_id)
  references public.league_scoring_rule_versions (id);

create table public.prediction_sets (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.prediction_set_status not null default 'draft',
  total_required integer not null default 0,
  completed_items integer not null default 0,
  unsynced_items integer not null default 0,
  last_server_synced_at timestamptz,
  completed_at timestamptz,
  unique (league_id, user_id)
);

create table public.match_predictions (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null references public.prediction_sets (id) on delete cascade,
  match_id uuid not null references public.matches (id),
  regulation_home_goals integer not null check (regulation_home_goals >= 0),
  regulation_away_goals integer not null check (regulation_away_goals >= 0),
  qualified_team_id uuid references public.teams (id),
  advancement_method public.advancement_method,
  validation_status public.prediction_validation_status not null default 'valid',
  updated_at timestamptz not null default now(),
  unique (prediction_set_id, match_id)
);

create table public.prediction_tiebreak_overrides (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null references public.prediction_sets (id) on delete cascade,
  scope_ref text not null,
  ordered_team_ids uuid[] not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.antepost_predictions (
  id uuid primary key default gen_random_uuid(),
  prediction_set_id uuid not null references public.prediction_sets (id) on delete cascade,
  definition_id uuid not null references public.competition_antepost_definitions (id),
  selected_payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (prediction_set_id, definition_id)
);

create table public.scoring_events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  participant_user_id uuid not null references public.profiles (id),
  competition_edition_id uuid not null references public.competition_editions (id),
  reference_id text not null,
  scoring_rule_version_id uuid not null references public.league_scoring_rule_versions (id),
  event_type text not null,
  points integer not null check (points >= 0),
  reason text not null,
  calculation_version text not null,
  source_result_version_id uuid references public.match_result_versions (id),
  created_at timestamptz not null default now()
);

create table public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  source_result_version_id uuid references public.match_result_versions (id),
  created_at timestamptz not null default now()
);

create table public.leaderboard_entries (
  snapshot_id uuid not null references public.leaderboard_snapshots (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  rank integer not null,
  total_points integer not null,
  latest_points integer not null default 0,
  position_delta integer not null default 0,
  tied boolean not null default false,
  primary key (snapshot_id, user_id)
);

create table public.scoring_recalculation_runs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  status text not null,
  reason text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references public.leagues (id) on delete cascade,
  actor_user_id uuid references public.profiles (id),
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  visible_to_members boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  category text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index league_members_user_id_idx on public.league_members (user_id);
create index matches_edition_kickoff_idx on public.matches (edition_id, kickoff_at);
create index prediction_sets_league_user_idx on public.prediction_sets (league_id, user_id);
create index scoring_events_league_user_idx on public.scoring_events (league_id, participant_user_id);
create index leaderboard_entries_snapshot_rank_idx on public.leaderboard_entries (snapshot_id, rank);

alter table public.profiles enable row level security;
alter table public.push_tokens enable row level security;
alter table public.sports enable row level security;
alter table public.competition_templates enable row level security;
alter table public.competition_editions enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.rounds enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.edition_teams enable row level security;
alter table public.matches enable row level security;
alter table public.bracket_slots enable row level security;
alter table public.competition_tiebreak_rules enable row level security;
alter table public.competition_antepost_definitions enable row level security;
alter table public.provider_mappings enable row level security;
alter table public.provider_payloads enable row level security;
alter table public.sync_runs enable row level security;
alter table public.match_result_versions enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_invites enable row level security;
alter table public.scoring_presets enable row level security;
alter table public.league_scoring_rule_versions enable row level security;
alter table public.prediction_sets enable row level security;
alter table public.match_predictions enable row level security;
alter table public.prediction_tiebreak_overrides enable row level security;
alter table public.antepost_predictions enable row level security;
alter table public.scoring_events enable row level security;
alter table public.leaderboard_snapshots enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.scoring_recalculation_runs enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.feature_flags enable row level security;

create policy "profiles own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id);
create policy "enabled catalog read" on public.competition_editions for select using (enabled = true);
create policy "sports read authenticated" on public.sports for select to authenticated using (true);
create policy "templates read authenticated" on public.competition_templates for select to authenticated using (true);
create policy "stages read authenticated" on public.stages for select to authenticated using (true);
create policy "groups read authenticated" on public.groups for select to authenticated using (true);
create policy "rounds read authenticated" on public.rounds for select to authenticated using (true);
create policy "teams read authenticated" on public.teams for select to authenticated using (true);
create policy "players read authenticated" on public.players for select to authenticated using (true);
create policy "matches read authenticated" on public.matches for select to authenticated using (true);

create policy "league members read own leagues" on public.leagues
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = id and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create policy "members read same league" on public.league_members
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_id and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create policy "own prediction sets before lock" on public.prediction_sets
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.leagues l
      join public.league_members lm on lm.league_id = l.id
      where l.id = league_id and l.status in ('locked', 'live', 'completed', 'archived')
        and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create policy "own match predictions before lock" on public.match_predictions
  for select using (
    exists (
      select 1 from public.prediction_sets ps
      where ps.id = prediction_set_id and ps.user_id = auth.uid()
    )
    or exists (
      select 1 from public.prediction_sets ps
      join public.leagues l on l.id = ps.league_id
      join public.league_members lm on lm.league_id = l.id
      where ps.id = prediction_set_id and l.status in ('locked', 'live', 'completed', 'archived')
        and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create policy "leaderboard read members" on public.leaderboard_snapshots
  for select using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_id and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create policy "leaderboard entries read members" on public.leaderboard_entries
  for select using (
    exists (
      select 1 from public.leaderboard_snapshots ls
      join public.league_members lm on lm.league_id = ls.league_id
      where ls.id = snapshot_id and lm.user_id = auth.uid() and lm.status = 'active'
    )
  );

create or replace function public.prevent_late_prediction_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league record;
begin
  select l.status, l.deadline_at
  into target_league
  from public.prediction_sets ps
  join public.leagues l on l.id = ps.league_id
  where ps.id = new.prediction_set_id;

  if target_league.status not in ('draft', 'open') or now() >= target_league.deadline_at then
    raise exception 'Predictions are locked or past deadline';
  end if;

  return new;
end;
$$;

create trigger match_predictions_prevent_late_write
before insert or update on public.match_predictions
for each row execute function public.prevent_late_prediction_write();

create or replace function public.prevent_locked_rule_update()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'locked' then
    raise exception 'Locked scoring rules are immutable';
  end if;

  return new;
end;
$$;

create trigger scoring_rules_prevent_locked_update
before update on public.league_scoring_rule_versions
for each row execute function public.prevent_locked_rule_update();
