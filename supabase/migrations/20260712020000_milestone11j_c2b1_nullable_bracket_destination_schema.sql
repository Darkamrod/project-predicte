-- Milestone 11J-C2B1-1: nullable, version-scoped bracket catalog structure.

create or replace function public.predicte_catalog_uuid(p_key text)
returns uuid
language sql
immutable
set search_path = pg_catalog
as $$
  select (
    substr(md5(p_key), 1, 8) || '-' || substr(md5(p_key), 9, 4) || '-4' ||
    substr(md5(p_key), 14, 3) || '-8' || substr(md5(p_key), 18, 3) || '-' ||
    substr(md5(p_key), 21, 12)
  )::uuid;
$$;

revoke all on function public.predicte_catalog_uuid(text) from public, anon, authenticated;

create table public.format_template_match_nodes (
  id uuid primary key,
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  format_template_version_id uuid not null references public.format_template_versions (id) on delete cascade,
  node_key text not null,
  round_id uuid not null references public.rounds (id),
  target_match_id uuid not null references public.matches (id) on delete cascade,
  sort_order integer not null,
  unique (format_template_version_id, node_key),
  unique (format_template_version_id, id),
  unique (format_template_version_id, target_match_id)
);

create table public.format_template_best_third_combinations (
  id uuid primary key,
  edition_id uuid not null references public.competition_editions (id) on delete cascade,
  format_template_version_id uuid not null references public.format_template_versions (id) on delete cascade,
  option_number integer not null,
  combination_key text not null,
  qualified_group_codes text[] not null,
  unique (format_template_version_id, option_number),
  unique (format_template_version_id, combination_key),
  unique (format_template_version_id, id)
);

create table public.format_template_best_third_assignments (
  id uuid primary key,
  format_template_version_id uuid not null references public.format_template_versions (id) on delete cascade,
  combination_id uuid not null,
  target_node_id uuid not null,
  target_side text not null,
  winner_group_code text not null,
  third_place_group_code text not null,
  foreign key (format_template_version_id, combination_id)
    references public.format_template_best_third_combinations (format_template_version_id, id)
    on delete cascade,
  foreign key (format_template_version_id, target_node_id)
    references public.format_template_match_nodes (format_template_version_id, id)
    on delete cascade,
  unique (combination_id, target_node_id, target_side),
  unique (combination_id, winner_group_code),
  unique (combination_id, third_place_group_code)
);

alter table public.bracket_slots
  add column format_template_version_id uuid references public.format_template_versions (id),
  add column target_node_id uuid,
  add column target_match_id uuid references public.matches (id) on delete cascade,
  add column target_side text,
  add column target_leg integer default 1,
  add column slot_key text,
  add constraint bracket_slots_target_node_version_fkey
    foreign key (format_template_version_id, target_node_id)
    references public.format_template_match_nodes (format_template_version_id, id),
  add constraint bracket_slots_target_side_transitional_check
    check (target_side is null or target_side in ('home', 'away')),
  add constraint bracket_slots_target_leg_transitional_check
    check (target_leg is null or target_leg > 0);

alter table public.format_template_match_nodes enable row level security;
alter table public.format_template_best_third_combinations enable row level security;
alter table public.format_template_best_third_assignments enable row level security;

revoke all on public.format_template_match_nodes from public, anon, authenticated;
revoke all on public.format_template_best_third_combinations from public, anon, authenticated;
revoke all on public.format_template_best_third_assignments from public, anon, authenticated;
revoke insert, update, delete on public.bracket_slots from anon, authenticated;

comment on table public.format_template_match_nodes is
  'Version-scoped official bracket nodes. node_key is the stable authority identifier (M73-M104 for FIFA World Cup 2026).';
comment on table public.format_template_best_third_combinations is
  'Explicit conditional best-third combinations from the governing-body format catalog.';
comment on table public.format_template_best_third_assignments is
  'Explicit per-combination assignment of each qualified third-place group to a versioned bracket side.';
