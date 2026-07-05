-- Milestone 7.1: versioned multi-competition templates and immutable league competition snapshots.

create table if not exists public.competition_families (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports (id),
  code text not null unique,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint competition_families_status_check
    check (status in ('draft', 'active', 'deprecated', 'archived'))
);

alter table public.competition_templates
  add column if not exists family_id uuid references public.competition_families (id),
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'competition_templates_status_check'
      and conrelid = 'public.competition_templates'::regclass
  ) then
    alter table public.competition_templates
      add constraint competition_templates_status_check
      check (status in ('draft', 'active', 'deprecated', 'archived'));
  end if;
end $$;

create table if not exists public.format_template_versions (
  id uuid primary key default gen_random_uuid(),
  competition_family_id uuid not null references public.competition_families (id),
  competition_template_id uuid not null references public.competition_templates (id),
  competition_edition_id uuid references public.competition_editions (id),
  version text not null,
  status text not null default 'draft',
  valid_from timestamptz not null,
  valid_to timestamptz,
  supersedes_template_version_id uuid references public.format_template_versions (id),
  official_rules_source jsonb not null default '{}'::jsonb,
  format jsonb not null,
  stages jsonb not null default '[]'::jsonb,
  ranking_rule_sets jsonb not null default '[]'::jsonb,
  bracket_mapping_strategy text not null,
  created_at timestamptz not null default now(),
  constraint format_template_versions_status_check
    check (status in ('draft', 'active', 'deprecated', 'archived')),
  unique (competition_edition_id, version)
);

create table if not exists public.ruleset_versions (
  id uuid primary key default gen_random_uuid(),
  competition_family_id uuid not null references public.competition_families (id),
  competition_edition_id uuid references public.competition_editions (id),
  version text not null,
  status text not null default 'draft',
  valid_from timestamptz not null,
  valid_to timestamptz,
  official_rules_source jsonb not null default '{}'::jsonb,
  ranking_rule_set_codes text[] not null default '{}',
  rules_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ruleset_versions_status_check
    check (status in ('draft', 'active', 'deprecated', 'archived')),
  unique (competition_edition_id, version)
);

create table if not exists public.prediction_requirement_versions (
  id uuid primary key default gen_random_uuid(),
  competition_family_id uuid not null references public.competition_families (id),
  competition_edition_id uuid references public.competition_editions (id),
  version text not null,
  status text not null default 'draft',
  valid_from timestamptz not null,
  valid_to timestamptz,
  requirements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint prediction_requirement_versions_status_check
    check (status in ('draft', 'active', 'deprecated', 'archived')),
  unique (competition_edition_id, version)
);

create table if not exists public.scoring_preset_versions (
  id uuid primary key default gen_random_uuid(),
  competition_family_id uuid not null references public.competition_families (id),
  competition_template_id uuid references public.competition_templates (id),
  competition_edition_id uuid references public.competition_editions (id),
  preset_code text not null,
  version text not null,
  status text not null default 'draft',
  valid_from timestamptz not null,
  valid_to timestamptz,
  config jsonb not null,
  created_at timestamptz not null default now(),
  constraint scoring_preset_versions_status_check
    check (status in ('draft', 'active', 'deprecated', 'archived')),
  unique (competition_edition_id, preset_code, version)
);

alter table public.competition_editions
  add column if not exists edition_code text,
  add column if not exists family_id uuid references public.competition_families (id),
  add column if not exists format_template_version_id uuid references public.format_template_versions (id),
  add column if not exists ruleset_version_id uuid references public.ruleset_versions (id),
  add column if not exists prediction_requirement_version_id uuid references public.prediction_requirement_versions (id),
  add column if not exists scoring_preset_version_id uuid references public.scoring_preset_versions (id),
  add column if not exists official_rules_source jsonb not null default '{}'::jsonb;

create unique index if not exists competition_editions_edition_code_idx
on public.competition_editions (edition_code)
where edition_code is not null;

alter table public.leagues
  add column if not exists format_template_version_id uuid references public.format_template_versions (id),
  add column if not exists ruleset_version_id uuid references public.ruleset_versions (id),
  add column if not exists prediction_requirement_version_id uuid references public.prediction_requirement_versions (id),
  add column if not exists scoring_preset_version_id uuid references public.scoring_preset_versions (id),
  add column if not exists locked_competition_snapshot jsonb,
  add column if not exists locked_competition_snapshot_checksum text;

comment on table public.format_template_versions
is 'Milestone 7.1: edition-specific competition format templates. Formats are versioned per edition/stage shape.';

comment on table public.prediction_requirement_versions
is 'Milestone 7.1: versioned prediction requirements per competition edition.';

comment on table public.scoring_preset_versions
is 'Milestone 7.1: versioned scoring presets per competition edition.';

comment on column public.leagues.locked_competition_snapshot
is 'Milestone 7.1: immutable snapshot of format, prediction requirements, scoring preset, ruleset, and admin overrides captured at lock.';

alter table public.competition_families enable row level security;
alter table public.format_template_versions enable row level security;
alter table public.ruleset_versions enable row level security;
alter table public.prediction_requirement_versions enable row level security;
alter table public.scoring_preset_versions enable row level security;

drop policy if exists "competition families read authenticated" on public.competition_families;
create policy "competition families read authenticated"
on public.competition_families for select
to authenticated
using (true);

drop policy if exists "format template versions read authenticated" on public.format_template_versions;
create policy "format template versions read authenticated"
on public.format_template_versions for select
to authenticated
using (status in ('active', 'deprecated'));

drop policy if exists "ruleset versions read authenticated" on public.ruleset_versions;
create policy "ruleset versions read authenticated"
on public.ruleset_versions for select
to authenticated
using (status in ('active', 'deprecated'));

drop policy if exists "prediction requirement versions read authenticated" on public.prediction_requirement_versions;
create policy "prediction requirement versions read authenticated"
on public.prediction_requirement_versions for select
to authenticated
using (status in ('active', 'deprecated'));

drop policy if exists "scoring preset versions read authenticated" on public.scoring_preset_versions;
create policy "scoring preset versions read authenticated"
on public.scoring_preset_versions for select
to authenticated
using (status in ('active', 'deprecated'));

grant select on public.competition_families to authenticated;
grant select on public.format_template_versions to authenticated;
grant select on public.ruleset_versions to authenticated;
grant select on public.prediction_requirement_versions to authenticated;
grant select on public.scoring_preset_versions to authenticated;

revoke insert, update, delete on public.competition_families from anon, authenticated;
revoke insert, update, delete on public.format_template_versions from anon, authenticated;
revoke insert, update, delete on public.ruleset_versions from anon, authenticated;
revoke insert, update, delete on public.prediction_requirement_versions from anon, authenticated;
revoke insert, update, delete on public.scoring_preset_versions from anon, authenticated;

create or replace function public.calculate_template_snapshot_checksum(p_payload jsonb)
returns text
language sql
stable
set search_path = public
as $$
  select 'sha256-' || encode(extensions.digest(p_payload::text, 'sha256'::text), 'hex');
$$;

create or replace function public.build_league_competition_snapshot(p_league_id uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_strip_nulls(
    jsonb_build_object(
      'league_id', l.id,
      'competition_edition_id', ce.id,
      'competition_family', jsonb_build_object(
        'id', cf.id,
        'code', cf.code,
        'name', cf.name
      ),
      'competition_template', jsonb_build_object(
        'id', ct.id,
        'code', ct.code,
        'name', ct.name
      ),
      'competition_edition', jsonb_build_object(
        'id', ce.id,
        'edition_code', ce.edition_code,
        'name', ce.name,
        'season_label', ce.season_label
      ),
      'format_template_version', to_jsonb(ftv),
      'ruleset_version', to_jsonb(rv),
      'prediction_requirement_version', to_jsonb(prv),
      'scoring_preset_version', to_jsonb(spv),
      'admin_overrides', jsonb_build_object(
        'league_scoring_rule_version_id', l.current_scoring_rule_version_id,
        'league_scoring_rule_config', lsr.config,
        'league_scoring_rule_checksum', lsr.checksum
      )
    )
  )
  from public.leagues l
  join public.competition_editions ce on ce.id = l.competition_edition_id
  join public.competition_templates ct on ct.id = ce.template_id
  left join public.competition_families cf on cf.id = coalesce(ce.family_id, ct.family_id)
  left join public.format_template_versions ftv
    on ftv.id = coalesce(l.format_template_version_id, ce.format_template_version_id)
  left join public.ruleset_versions rv
    on rv.id = coalesce(l.ruleset_version_id, ce.ruleset_version_id)
  left join public.prediction_requirement_versions prv
    on prv.id = coalesce(l.prediction_requirement_version_id, ce.prediction_requirement_version_id)
  left join public.scoring_preset_versions spv
    on spv.id = coalesce(l.scoring_preset_version_id, ce.scoring_preset_version_id)
  left join public.league_scoring_rule_versions lsr on lsr.id = l.current_scoring_rule_version_id
  where l.id = p_league_id;
$$;

create or replace function public.populate_league_competition_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select
    coalesce(new.format_template_version_id, ce.format_template_version_id),
    coalesce(new.ruleset_version_id, ce.ruleset_version_id),
    coalesce(new.prediction_requirement_version_id, ce.prediction_requirement_version_id),
    coalesce(
      new.scoring_preset_version_id,
      ce.scoring_preset_version_id,
      (
        select spv.id
        from public.scoring_preset_versions spv
        where spv.competition_edition_id = ce.id
          and spv.status = 'active'
        order by spv.valid_from desc, spv.created_at desc
        limit 1
      )
    )
  into
    new.format_template_version_id,
    new.ruleset_version_id,
    new.prediction_requirement_version_id,
    new.scoring_preset_version_id
  from public.competition_editions ce
  where ce.id = new.competition_edition_id;

  return new;
end;
$$;

drop trigger if exists leagues_populate_competition_versions on public.leagues;
create trigger leagues_populate_competition_versions
before insert on public.leagues
for each row execute function public.populate_league_competition_versions();

create or replace function public.capture_locked_competition_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  snapshot_payload jsonb;
begin
  if new.status in ('locked', 'live', 'completed', 'archived')
    and new.locked_competition_snapshot is null then
    snapshot_payload := public.build_league_competition_snapshot(old.id);

    if snapshot_payload is not null then
      new.locked_competition_snapshot := snapshot_payload;
      new.locked_competition_snapshot_checksum :=
        public.calculate_template_snapshot_checksum(snapshot_payload);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists leagues_capture_locked_competition_snapshot on public.leagues;
create trigger leagues_capture_locked_competition_snapshot
before update of status on public.leagues
for each row execute function public.capture_locked_competition_snapshot();
