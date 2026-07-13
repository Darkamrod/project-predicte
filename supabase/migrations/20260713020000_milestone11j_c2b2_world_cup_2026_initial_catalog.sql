-- Milestone 11J-C2B2: authoritative FIFA World Cup 2026 initial catalog.
-- Authority: FIFA, FIFA World Cup 2026 Match Schedule, 12 July 2026.
-- Source: https://digitalhub.fifa.com/asset/4b5d4417-3343-4732-9cdf-14b6662af407/FWC26-Match-Schedule_English.pdf
-- Acquired: 13 July 2026.
-- SHA-256: 1FFA43834656742AA69B9D5B98F826052BBD26B2E353161F7FA83DC97416D4EB
-- Scope: factual team/group assignments and matches M1-M72 only. No results,
-- standings, live state, qualified teams, players, or statistics are imported.

alter table public.teams
  add column if not exists fifa_code text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'teams_fifa_code_format_check'
      and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams
      add constraint teams_fifa_code_format_check
      check (fifa_code is null or fifa_code ~ '^[A-Z]{3}$');
  end if;
end;
$$;

create unique index if not exists teams_fifa_code_unique_idx
  on public.teams (fifa_code)
  where fifa_code is not null;

create unique index if not exists stages_edition_id_id_idx
  on public.stages (edition_id, id);
create unique index if not exists groups_edition_id_id_idx
  on public.groups (edition_id, id);
create unique index if not exists rounds_edition_id_id_idx
  on public.rounds (edition_id, id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'edition_teams_group_edition_fkey') then
    alter table public.edition_teams
      add constraint edition_teams_group_edition_fkey
      foreign key (edition_id, seed_group_id)
      references public.groups (edition_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_stage_edition_fkey') then
    alter table public.matches
      add constraint matches_stage_edition_fkey
      foreign key (edition_id, stage_id)
      references public.stages (edition_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_group_edition_fkey') then
    alter table public.matches
      add constraint matches_group_edition_fkey
      foreign key (edition_id, group_id)
      references public.groups (edition_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_round_edition_fkey') then
    alter table public.matches
      add constraint matches_round_edition_fkey
      foreign key (edition_id, round_id)
      references public.rounds (edition_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_home_team_edition_fkey') then
    alter table public.matches
      add constraint matches_home_team_edition_fkey
      foreign key (edition_id, home_team_id)
      references public.edition_teams (edition_id, team_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_away_team_edition_fkey') then
    alter table public.matches
      add constraint matches_away_team_edition_fkey
      foreign key (edition_id, away_team_id)
      references public.edition_teams (edition_id, team_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'matches_distinct_participants_check') then
    alter table public.matches
      add constraint matches_distinct_participants_check
      check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id);
  end if;
end;
$$;

create unique index if not exists matches_edition_official_match_number_idx
  on public.matches (edition_id, (bracket_payload ->> 'officialMatchNumber'))
  where bracket_payload ? 'officialMatchNumber';

create or replace function public.populate_world_cup_2026_initial_catalog()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
with official_teams(ordinal, id, fifa_code, name, group_code) as (
  values
    (1, 'c2b20000-0000-4000-8000-000000000001'::uuid, 'MEX', 'Mexico', 'A'),
    (2, 'c2b20000-0000-4000-8000-000000000002'::uuid, 'RSA', 'South Africa', 'A'),
    (3, 'c2b20000-0000-4000-8000-000000000003'::uuid, 'KOR', 'Korea Republic', 'A'),
    (4, 'c2b20000-0000-4000-8000-000000000004'::uuid, 'CZE', 'Czechia', 'A'),
    (5, 'c2b20000-0000-4000-8000-000000000005'::uuid, 'CAN', 'Canada', 'B'),
    (6, 'c2b20000-0000-4000-8000-000000000006'::uuid, 'BIH', 'Bosnia & Herzegovina', 'B'),
    (7, 'c2b20000-0000-4000-8000-000000000007'::uuid, 'QAT', 'Qatar', 'B'),
    (8, 'c2b20000-0000-4000-8000-000000000008'::uuid, 'SUI', 'Switzerland', 'B'),
    (9, 'c2b20000-0000-4000-8000-000000000009'::uuid, 'BRA', 'Brazil', 'C'),
    (10, 'c2b20000-0000-4000-8000-000000000010'::uuid, 'MAR', 'Morocco', 'C'),
    (11, 'c2b20000-0000-4000-8000-000000000011'::uuid, 'HAI', 'Haiti', 'C'),
    (12, 'c2b20000-0000-4000-8000-000000000012'::uuid, 'SCO', 'Scotland', 'C'),
    (13, 'c2b20000-0000-4000-8000-000000000013'::uuid, 'USA', 'USA', 'D'),
    (14, 'c2b20000-0000-4000-8000-000000000014'::uuid, 'PAR', 'Paraguay', 'D'),
    (15, 'c2b20000-0000-4000-8000-000000000015'::uuid, 'AUS', 'Australia', 'D'),
    (16, 'c2b20000-0000-4000-8000-000000000016'::uuid, 'TUR', 'Türkiye', 'D'),
    (17, 'c2b20000-0000-4000-8000-000000000017'::uuid, 'GER', 'Germany', 'E'),
    (18, 'c2b20000-0000-4000-8000-000000000018'::uuid, 'CUW', 'Curaçao', 'E'),
    (19, 'c2b20000-0000-4000-8000-000000000019'::uuid, 'CIV', 'Côte d’Ivoire', 'E'),
    (20, 'c2b20000-0000-4000-8000-000000000020'::uuid, 'ECU', 'Ecuador', 'E'),
    (21, 'c2b20000-0000-4000-8000-000000000021'::uuid, 'NED', 'Netherlands', 'F'),
    (22, 'c2b20000-0000-4000-8000-000000000022'::uuid, 'JPN', 'Japan', 'F'),
    (23, 'c2b20000-0000-4000-8000-000000000023'::uuid, 'SWE', 'Sweden', 'F'),
    (24, 'c2b20000-0000-4000-8000-000000000024'::uuid, 'TUN', 'Tunisia', 'F'),
    (25, 'c2b20000-0000-4000-8000-000000000025'::uuid, 'BEL', 'Belgium', 'G'),
    (26, 'c2b20000-0000-4000-8000-000000000026'::uuid, 'EGY', 'Egypt', 'G'),
    (27, 'c2b20000-0000-4000-8000-000000000027'::uuid, 'IRN', 'IR Iran', 'G'),
    (28, 'c2b20000-0000-4000-8000-000000000028'::uuid, 'NZL', 'New Zealand', 'G'),
    (29, 'c2b20000-0000-4000-8000-000000000029'::uuid, 'ESP', 'Spain', 'H'),
    (30, 'c2b20000-0000-4000-8000-000000000030'::uuid, 'CPV', 'Cabo Verde', 'H'),
    (31, 'c2b20000-0000-4000-8000-000000000031'::uuid, 'KSA', 'Saudi Arabia', 'H'),
    (32, 'c2b20000-0000-4000-8000-000000000032'::uuid, 'URU', 'Uruguay', 'H'),
    (33, 'c2b20000-0000-4000-8000-000000000033'::uuid, 'FRA', 'France', 'I'),
    (34, 'c2b20000-0000-4000-8000-000000000034'::uuid, 'SEN', 'Senegal', 'I'),
    (35, 'c2b20000-0000-4000-8000-000000000035'::uuid, 'IRQ', 'Iraq', 'I'),
    (36, 'c2b20000-0000-4000-8000-000000000036'::uuid, 'NOR', 'Norway', 'I'),
    (37, 'c2b20000-0000-4000-8000-000000000037'::uuid, 'ARG', 'Argentina', 'J'),
    (38, 'c2b20000-0000-4000-8000-000000000038'::uuid, 'ALG', 'Algeria', 'J'),
    (39, 'c2b20000-0000-4000-8000-000000000039'::uuid, 'AUT', 'Austria', 'J'),
    (40, 'c2b20000-0000-4000-8000-000000000040'::uuid, 'JOR', 'Jordan', 'J'),
    (41, 'c2b20000-0000-4000-8000-000000000041'::uuid, 'POR', 'Portugal', 'K'),
    (42, 'c2b20000-0000-4000-8000-000000000042'::uuid, 'COD', 'Congo DR', 'K'),
    (43, 'c2b20000-0000-4000-8000-000000000043'::uuid, 'UZB', 'Uzbekistan', 'K'),
    (44, 'c2b20000-0000-4000-8000-000000000044'::uuid, 'COL', 'Colombia', 'K'),
    (45, 'c2b20000-0000-4000-8000-000000000045'::uuid, 'ENG', 'England', 'L'),
    (46, 'c2b20000-0000-4000-8000-000000000046'::uuid, 'CRO', 'Croatia', 'L'),
    (47, 'c2b20000-0000-4000-8000-000000000047'::uuid, 'GHA', 'Ghana', 'L'),
    (48, 'c2b20000-0000-4000-8000-000000000048'::uuid, 'PAN', 'Panama', 'L')
)
insert into public.teams (id, name, short_name, country_code, fifa_code)
select id, name, fifa_code, null::text, fifa_code
from official_teams
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  country_code = excluded.country_code,
  fifa_code = excluded.fifa_code;

with official_teams(ordinal, id, fifa_code, name, group_code) as (
  values
    (1, 'c2b20000-0000-4000-8000-000000000001'::uuid, 'MEX', 'Mexico', 'A'),
    (2, 'c2b20000-0000-4000-8000-000000000002'::uuid, 'RSA', 'South Africa', 'A'),
    (3, 'c2b20000-0000-4000-8000-000000000003'::uuid, 'KOR', 'Korea Republic', 'A'),
    (4, 'c2b20000-0000-4000-8000-000000000004'::uuid, 'CZE', 'Czechia', 'A'),
    (5, 'c2b20000-0000-4000-8000-000000000005'::uuid, 'CAN', 'Canada', 'B'),
    (6, 'c2b20000-0000-4000-8000-000000000006'::uuid, 'BIH', 'Bosnia & Herzegovina', 'B'),
    (7, 'c2b20000-0000-4000-8000-000000000007'::uuid, 'QAT', 'Qatar', 'B'),
    (8, 'c2b20000-0000-4000-8000-000000000008'::uuid, 'SUI', 'Switzerland', 'B'),
    (9, 'c2b20000-0000-4000-8000-000000000009'::uuid, 'BRA', 'Brazil', 'C'),
    (10, 'c2b20000-0000-4000-8000-000000000010'::uuid, 'MAR', 'Morocco', 'C'),
    (11, 'c2b20000-0000-4000-8000-000000000011'::uuid, 'HAI', 'Haiti', 'C'),
    (12, 'c2b20000-0000-4000-8000-000000000012'::uuid, 'SCO', 'Scotland', 'C'),
    (13, 'c2b20000-0000-4000-8000-000000000013'::uuid, 'USA', 'USA', 'D'),
    (14, 'c2b20000-0000-4000-8000-000000000014'::uuid, 'PAR', 'Paraguay', 'D'),
    (15, 'c2b20000-0000-4000-8000-000000000015'::uuid, 'AUS', 'Australia', 'D'),
    (16, 'c2b20000-0000-4000-8000-000000000016'::uuid, 'TUR', 'Türkiye', 'D'),
    (17, 'c2b20000-0000-4000-8000-000000000017'::uuid, 'GER', 'Germany', 'E'),
    (18, 'c2b20000-0000-4000-8000-000000000018'::uuid, 'CUW', 'Curaçao', 'E'),
    (19, 'c2b20000-0000-4000-8000-000000000019'::uuid, 'CIV', 'Côte d’Ivoire', 'E'),
    (20, 'c2b20000-0000-4000-8000-000000000020'::uuid, 'ECU', 'Ecuador', 'E'),
    (21, 'c2b20000-0000-4000-8000-000000000021'::uuid, 'NED', 'Netherlands', 'F'),
    (22, 'c2b20000-0000-4000-8000-000000000022'::uuid, 'JPN', 'Japan', 'F'),
    (23, 'c2b20000-0000-4000-8000-000000000023'::uuid, 'SWE', 'Sweden', 'F'),
    (24, 'c2b20000-0000-4000-8000-000000000024'::uuid, 'TUN', 'Tunisia', 'F'),
    (25, 'c2b20000-0000-4000-8000-000000000025'::uuid, 'BEL', 'Belgium', 'G'),
    (26, 'c2b20000-0000-4000-8000-000000000026'::uuid, 'EGY', 'Egypt', 'G'),
    (27, 'c2b20000-0000-4000-8000-000000000027'::uuid, 'IRN', 'IR Iran', 'G'),
    (28, 'c2b20000-0000-4000-8000-000000000028'::uuid, 'NZL', 'New Zealand', 'G'),
    (29, 'c2b20000-0000-4000-8000-000000000029'::uuid, 'ESP', 'Spain', 'H'),
    (30, 'c2b20000-0000-4000-8000-000000000030'::uuid, 'CPV', 'Cabo Verde', 'H'),
    (31, 'c2b20000-0000-4000-8000-000000000031'::uuid, 'KSA', 'Saudi Arabia', 'H'),
    (32, 'c2b20000-0000-4000-8000-000000000032'::uuid, 'URU', 'Uruguay', 'H'),
    (33, 'c2b20000-0000-4000-8000-000000000033'::uuid, 'FRA', 'France', 'I'),
    (34, 'c2b20000-0000-4000-8000-000000000034'::uuid, 'SEN', 'Senegal', 'I'),
    (35, 'c2b20000-0000-4000-8000-000000000035'::uuid, 'IRQ', 'Iraq', 'I'),
    (36, 'c2b20000-0000-4000-8000-000000000036'::uuid, 'NOR', 'Norway', 'I'),
    (37, 'c2b20000-0000-4000-8000-000000000037'::uuid, 'ARG', 'Argentina', 'J'),
    (38, 'c2b20000-0000-4000-8000-000000000038'::uuid, 'ALG', 'Algeria', 'J'),
    (39, 'c2b20000-0000-4000-8000-000000000039'::uuid, 'AUT', 'Austria', 'J'),
    (40, 'c2b20000-0000-4000-8000-000000000040'::uuid, 'JOR', 'Jordan', 'J'),
    (41, 'c2b20000-0000-4000-8000-000000000041'::uuid, 'POR', 'Portugal', 'K'),
    (42, 'c2b20000-0000-4000-8000-000000000042'::uuid, 'COD', 'Congo DR', 'K'),
    (43, 'c2b20000-0000-4000-8000-000000000043'::uuid, 'UZB', 'Uzbekistan', 'K'),
    (44, 'c2b20000-0000-4000-8000-000000000044'::uuid, 'COL', 'Colombia', 'K'),
    (45, 'c2b20000-0000-4000-8000-000000000045'::uuid, 'ENG', 'England', 'L'),
    (46, 'c2b20000-0000-4000-8000-000000000046'::uuid, 'CRO', 'Croatia', 'L'),
    (47, 'c2b20000-0000-4000-8000-000000000047'::uuid, 'GHA', 'Ghana', 'L'),
    (48, 'c2b20000-0000-4000-8000-000000000048'::uuid, 'PAN', 'Panama', 'L')
)
insert into public.edition_teams (edition_id, team_id, seed_group_id)
select
  '00000000-0000-4000-8000-000000000521'::uuid,
  source.id,
  target_group.id
from official_teams source
join public.groups target_group
  on target_group.edition_id = '00000000-0000-4000-8000-000000000521'::uuid
 and target_group.code = source.group_code
on conflict (edition_id, team_id) do update set
  seed_group_id = excluded.seed_group_id;

with official_matches(
  match_number, id, match_date, kickoff_et, group_code, home_code, away_code, matchday
) as (
  values
    (1, 'c2b21000-0000-4000-8000-000000000001'::uuid, '2026-06-11'::date, '15:00'::time, 'A', 'MEX', 'RSA', 1),
    (2, 'c2b21000-0000-4000-8000-000000000002'::uuid, '2026-06-11'::date, '22:00'::time, 'A', 'KOR', 'CZE', 1),
    (3, 'c2b21000-0000-4000-8000-000000000003'::uuid, '2026-06-12'::date, '15:00'::time, 'B', 'CAN', 'BIH', 1),
    (4, 'c2b21000-0000-4000-8000-000000000004'::uuid, '2026-06-12'::date, '21:00'::time, 'D', 'USA', 'PAR', 1),
    (5, 'c2b21000-0000-4000-8000-000000000005'::uuid, '2026-06-13'::date, '21:00'::time, 'C', 'HAI', 'SCO', 1),
    (6, 'c2b21000-0000-4000-8000-000000000006'::uuid, '2026-06-13'::date, '00:00'::time, 'D', 'AUS', 'TUR', 1),
    (7, 'c2b21000-0000-4000-8000-000000000007'::uuid, '2026-06-13'::date, '18:00'::time, 'C', 'BRA', 'MAR', 1),
    (8, 'c2b21000-0000-4000-8000-000000000008'::uuid, '2026-06-13'::date, '15:00'::time, 'B', 'QAT', 'SUI', 1),
    (9, 'c2b21000-0000-4000-8000-000000000009'::uuid, '2026-06-14'::date, '19:00'::time, 'E', 'CIV', 'ECU', 1),
    (10, 'c2b21000-0000-4000-8000-000000000010'::uuid, '2026-06-14'::date, '13:00'::time, 'E', 'GER', 'CUW', 1),
    (11, 'c2b21000-0000-4000-8000-000000000011'::uuid, '2026-06-14'::date, '16:00'::time, 'F', 'NED', 'JPN', 1),
    (12, 'c2b21000-0000-4000-8000-000000000012'::uuid, '2026-06-14'::date, '22:00'::time, 'F', 'SWE', 'TUN', 1),
    (13, 'c2b21000-0000-4000-8000-000000000013'::uuid, '2026-06-15'::date, '18:00'::time, 'H', 'KSA', 'URU', 1),
    (14, 'c2b21000-0000-4000-8000-000000000014'::uuid, '2026-06-15'::date, '12:00'::time, 'H', 'ESP', 'CPV', 1),
    (15, 'c2b21000-0000-4000-8000-000000000015'::uuid, '2026-06-15'::date, '21:00'::time, 'G', 'IRN', 'NZL', 1),
    (16, 'c2b21000-0000-4000-8000-000000000016'::uuid, '2026-06-15'::date, '15:00'::time, 'G', 'BEL', 'EGY', 1),
    (17, 'c2b21000-0000-4000-8000-000000000017'::uuid, '2026-06-16'::date, '15:00'::time, 'I', 'FRA', 'SEN', 1),
    (18, 'c2b21000-0000-4000-8000-000000000018'::uuid, '2026-06-16'::date, '18:00'::time, 'I', 'IRQ', 'NOR', 1),
    (19, 'c2b21000-0000-4000-8000-000000000019'::uuid, '2026-06-16'::date, '21:00'::time, 'J', 'ARG', 'ALG', 1),
    (20, 'c2b21000-0000-4000-8000-000000000020'::uuid, '2026-06-16'::date, '00:00'::time, 'J', 'AUT', 'JOR', 1),
    (21, 'c2b21000-0000-4000-8000-000000000021'::uuid, '2026-06-17'::date, '19:00'::time, 'L', 'GHA', 'PAN', 1),
    (22, 'c2b21000-0000-4000-8000-000000000022'::uuid, '2026-06-17'::date, '16:00'::time, 'L', 'ENG', 'CRO', 1),
    (23, 'c2b21000-0000-4000-8000-000000000023'::uuid, '2026-06-17'::date, '13:00'::time, 'K', 'POR', 'COD', 1),
    (24, 'c2b21000-0000-4000-8000-000000000024'::uuid, '2026-06-17'::date, '22:00'::time, 'K', 'UZB', 'COL', 1),
    (25, 'c2b21000-0000-4000-8000-000000000025'::uuid, '2026-06-18'::date, '12:00'::time, 'A', 'CZE', 'RSA', 2),
    (26, 'c2b21000-0000-4000-8000-000000000026'::uuid, '2026-06-18'::date, '15:00'::time, 'B', 'SUI', 'BIH', 2),
    (27, 'c2b21000-0000-4000-8000-000000000027'::uuid, '2026-06-18'::date, '18:00'::time, 'B', 'CAN', 'QAT', 2),
    (28, 'c2b21000-0000-4000-8000-000000000028'::uuid, '2026-06-18'::date, '21:00'::time, 'A', 'MEX', 'KOR', 2),
    (29, 'c2b21000-0000-4000-8000-000000000029'::uuid, '2026-06-19'::date, '20:30'::time, 'C', 'BRA', 'HAI', 2),
    (30, 'c2b21000-0000-4000-8000-000000000030'::uuid, '2026-06-19'::date, '18:00'::time, 'C', 'SCO', 'MAR', 2),
    (31, 'c2b21000-0000-4000-8000-000000000031'::uuid, '2026-06-19'::date, '23:00'::time, 'D', 'TUR', 'PAR', 2),
    (32, 'c2b21000-0000-4000-8000-000000000032'::uuid, '2026-06-19'::date, '15:00'::time, 'D', 'USA', 'AUS', 2),
    (33, 'c2b21000-0000-4000-8000-000000000033'::uuid, '2026-06-20'::date, '16:00'::time, 'E', 'GER', 'CIV', 2),
    (34, 'c2b21000-0000-4000-8000-000000000034'::uuid, '2026-06-20'::date, '20:00'::time, 'E', 'ECU', 'CUW', 2),
    (35, 'c2b21000-0000-4000-8000-000000000035'::uuid, '2026-06-20'::date, '13:00'::time, 'F', 'NED', 'SWE', 2),
    (36, 'c2b21000-0000-4000-8000-000000000036'::uuid, '2026-06-20'::date, '00:00'::time, 'F', 'TUN', 'JPN', 2),
    (37, 'c2b21000-0000-4000-8000-000000000037'::uuid, '2026-06-21'::date, '18:00'::time, 'H', 'URU', 'CPV', 2),
    (38, 'c2b21000-0000-4000-8000-000000000038'::uuid, '2026-06-21'::date, '12:00'::time, 'H', 'ESP', 'KSA', 2),
    (39, 'c2b21000-0000-4000-8000-000000000039'::uuid, '2026-06-21'::date, '15:00'::time, 'G', 'BEL', 'IRN', 2),
    (40, 'c2b21000-0000-4000-8000-000000000040'::uuid, '2026-06-21'::date, '21:00'::time, 'G', 'NZL', 'EGY', 2),
    (41, 'c2b21000-0000-4000-8000-000000000041'::uuid, '2026-06-22'::date, '20:00'::time, 'I', 'NOR', 'SEN', 2),
    (42, 'c2b21000-0000-4000-8000-000000000042'::uuid, '2026-06-22'::date, '17:00'::time, 'I', 'FRA', 'IRQ', 2),
    (43, 'c2b21000-0000-4000-8000-000000000043'::uuid, '2026-06-22'::date, '13:00'::time, 'J', 'ARG', 'AUT', 2),
    (44, 'c2b21000-0000-4000-8000-000000000044'::uuid, '2026-06-22'::date, '23:00'::time, 'J', 'JOR', 'ALG', 2),
    (45, 'c2b21000-0000-4000-8000-000000000045'::uuid, '2026-06-23'::date, '16:00'::time, 'L', 'ENG', 'GHA', 2),
    (46, 'c2b21000-0000-4000-8000-000000000046'::uuid, '2026-06-23'::date, '19:00'::time, 'L', 'PAN', 'CRO', 2),
    (47, 'c2b21000-0000-4000-8000-000000000047'::uuid, '2026-06-23'::date, '13:00'::time, 'K', 'POR', 'UZB', 2),
    (48, 'c2b21000-0000-4000-8000-000000000048'::uuid, '2026-06-23'::date, '22:00'::time, 'K', 'COL', 'COD', 2),
    (49, 'c2b21000-0000-4000-8000-000000000049'::uuid, '2026-06-24'::date, '18:00'::time, 'C', 'SCO', 'BRA', 3),
    (50, 'c2b21000-0000-4000-8000-000000000050'::uuid, '2026-06-24'::date, '18:00'::time, 'C', 'MAR', 'HAI', 3),
    (51, 'c2b21000-0000-4000-8000-000000000051'::uuid, '2026-06-24'::date, '15:00'::time, 'B', 'SUI', 'CAN', 3),
    (52, 'c2b21000-0000-4000-8000-000000000052'::uuid, '2026-06-24'::date, '15:00'::time, 'B', 'BIH', 'QAT', 3),
    (53, 'c2b21000-0000-4000-8000-000000000053'::uuid, '2026-06-24'::date, '21:00'::time, 'A', 'CZE', 'MEX', 3),
    (54, 'c2b21000-0000-4000-8000-000000000054'::uuid, '2026-06-24'::date, '21:00'::time, 'A', 'RSA', 'KOR', 3),
    (55, 'c2b21000-0000-4000-8000-000000000055'::uuid, '2026-06-25'::date, '16:00'::time, 'E', 'CUW', 'CIV', 3),
    (56, 'c2b21000-0000-4000-8000-000000000056'::uuid, '2026-06-25'::date, '16:00'::time, 'E', 'ECU', 'GER', 3),
    (57, 'c2b21000-0000-4000-8000-000000000057'::uuid, '2026-06-25'::date, '19:00'::time, 'F', 'JPN', 'SWE', 3),
    (58, 'c2b21000-0000-4000-8000-000000000058'::uuid, '2026-06-25'::date, '19:00'::time, 'F', 'TUN', 'NED', 3),
    (59, 'c2b21000-0000-4000-8000-000000000059'::uuid, '2026-06-25'::date, '22:00'::time, 'D', 'TUR', 'USA', 3),
    (60, 'c2b21000-0000-4000-8000-000000000060'::uuid, '2026-06-25'::date, '22:00'::time, 'D', 'PAR', 'AUS', 3),
    (61, 'c2b21000-0000-4000-8000-000000000061'::uuid, '2026-06-26'::date, '15:00'::time, 'I', 'NOR', 'FRA', 3),
    (62, 'c2b21000-0000-4000-8000-000000000062'::uuid, '2026-06-26'::date, '15:00'::time, 'I', 'SEN', 'IRQ', 3),
    (63, 'c2b21000-0000-4000-8000-000000000063'::uuid, '2026-06-26'::date, '23:00'::time, 'G', 'EGY', 'IRN', 3),
    (64, 'c2b21000-0000-4000-8000-000000000064'::uuid, '2026-06-26'::date, '23:00'::time, 'G', 'NZL', 'BEL', 3),
    (65, 'c2b21000-0000-4000-8000-000000000065'::uuid, '2026-06-26'::date, '20:00'::time, 'H', 'CPV', 'KSA', 3),
    (66, 'c2b21000-0000-4000-8000-000000000066'::uuid, '2026-06-26'::date, '20:00'::time, 'H', 'URU', 'ESP', 3),
    (67, 'c2b21000-0000-4000-8000-000000000067'::uuid, '2026-06-27'::date, '17:00'::time, 'L', 'PAN', 'ENG', 3),
    (68, 'c2b21000-0000-4000-8000-000000000068'::uuid, '2026-06-27'::date, '17:00'::time, 'L', 'CRO', 'GHA', 3),
    (69, 'c2b21000-0000-4000-8000-000000000069'::uuid, '2026-06-27'::date, '22:00'::time, 'J', 'ALG', 'AUT', 3),
    (70, 'c2b21000-0000-4000-8000-000000000070'::uuid, '2026-06-27'::date, '22:00'::time, 'J', 'JOR', 'ARG', 3),
    (71, 'c2b21000-0000-4000-8000-000000000071'::uuid, '2026-06-27'::date, '19:30'::time, 'K', 'COL', 'POR', 3),
    (72, 'c2b21000-0000-4000-8000-000000000072'::uuid, '2026-06-27'::date, '19:30'::time, 'K', 'COD', 'UZB', 3)
)
insert into public.matches (
  id, edition_id, stage_id, group_id, round_id,
  home_team_id, away_team_id, bracket_payload, kickoff_at, status, sort_order
)
select
  source.id,
  '00000000-0000-4000-8000-000000000521'::uuid,
  target_stage.id,
  target_group.id,
  null,
  home_team.id,
  away_team.id,
  jsonb_build_object(
    'catalogSource', 'FIFA World Cup 2026 Match Schedule, 12 July 2026',
    'officialMatchNumber', source.match_number,
    'matchday', source.matchday,
    'matchFormat', 'REGULATION_90',
    'leg', 1
  ),
  (source.match_date + source.kickoff_et) at time zone 'America/New_York',
  'NOT_STARTED'::public.match_status,
  source.match_number
from official_matches source
join public.stages target_stage
  on target_stage.edition_id = '00000000-0000-4000-8000-000000000521'::uuid
 and target_stage.code = 'GROUP_STAGE'
join public.groups target_group
  on target_group.edition_id = '00000000-0000-4000-8000-000000000521'::uuid
 and target_group.code = source.group_code
join public.teams home_team on home_team.fifa_code = source.home_code
join public.teams away_team on away_team.fifa_code = source.away_code
on conflict (id) do update set
  edition_id = excluded.edition_id,
  stage_id = excluded.stage_id,
  group_id = excluded.group_id,
  round_id = excluded.round_id,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  bracket_payload = excluded.bracket_payload,
  kickoff_at = excluded.kickoff_at,
  status = excluded.status,
  sort_order = excluded.sort_order;

  perform public.validate_world_cup_2026_initial_catalog();
end;
$$;

create or replace function public.validate_world_cup_2026_initial_catalog()
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_edition constant uuid := '00000000-0000-4000-8000-000000000521'::uuid;
  group_stage_id uuid;
begin
  select id into strict group_stage_id
  from public.stages
  where edition_id = target_edition and code = 'GROUP_STAGE';

  if (select count(*) from public.edition_teams where edition_id = target_edition) <> 48 then
    raise exception 'World Cup 2026 catalog must contain exactly 48 edition teams';
  end if;

  if (
    select count(distinct t.fifa_code)
    from public.edition_teams et
    join public.teams t on t.id = et.team_id
    where et.edition_id = target_edition and t.fifa_code is not null
  ) <> 48 then
    raise exception 'World Cup 2026 FIFA codes must be complete and unique';
  end if;

  if (select count(*) from public.groups where edition_id = target_edition and stage_id = group_stage_id) <> 12 then
    raise exception 'World Cup 2026 catalog must contain exactly 12 initial groups';
  end if;

  if exists (
    select 1
    from public.groups g
    left join public.edition_teams et
      on et.edition_id = g.edition_id and et.seed_group_id = g.id
    where g.edition_id = target_edition and g.stage_id = group_stage_id
    group by g.id
    having count(et.team_id) <> 4
  ) then
    raise exception 'Every World Cup 2026 group must contain exactly four teams';
  end if;

  if exists (
    select 1 from public.edition_teams et
    left join public.groups g
      on g.id = et.seed_group_id and g.edition_id = et.edition_id and g.stage_id = group_stage_id
    where et.edition_id = target_edition and g.id is null
  ) then
    raise exception 'Every World Cup 2026 team must belong to one initial group';
  end if;

  if (select count(*) from public.matches where edition_id = target_edition and stage_id = group_stage_id) <> 72 then
    raise exception 'World Cup 2026 catalog must contain exactly 72 initial matches';
  end if;

  if exists (
    select 1 from public.groups g
    left join public.matches m
      on m.edition_id = g.edition_id and m.group_id = g.id and m.stage_id = group_stage_id
    where g.edition_id = target_edition and g.stage_id = group_stage_id
    group by g.id
    having count(m.id) <> 6
  ) then
    raise exception 'Every World Cup 2026 group must contain exactly six matches';
  end if;

  if exists (
    with appearances as (
      select home_team_id as team_id from public.matches
      where edition_id = target_edition and stage_id = group_stage_id
      union all
      select away_team_id from public.matches
      where edition_id = target_edition and stage_id = group_stage_id
    )
    select 1 from appearances group by team_id having count(*) <> 3
  ) then
    raise exception 'Every World Cup 2026 team must play exactly three initial matches';
  end if;

  if exists (
    select 1
    from public.matches m
    join public.edition_teams home_et
      on home_et.edition_id = m.edition_id and home_et.team_id = m.home_team_id
    join public.edition_teams away_et
      on away_et.edition_id = m.edition_id and away_et.team_id = m.away_team_id
    where m.edition_id = target_edition
      and m.stage_id = group_stage_id
      and (
        m.group_id is null
        or m.home_team_id is null
        or m.away_team_id is null
        or m.home_team_id = m.away_team_id
        or home_et.seed_group_id <> m.group_id
        or away_et.seed_group_id <> m.group_id
      )
  ) then
    raise exception 'World Cup 2026 initial match participants must be complete and group-scoped';
  end if;

  if (
    select count(*)
    from (
      select
        least(home_team_id, away_team_id) as first_team_id,
        greatest(home_team_id, away_team_id) as second_team_id
      from public.matches
      where edition_id = target_edition and stage_id = group_stage_id
      group by least(home_team_id, away_team_id), greatest(home_team_id, away_team_id)
      having count(*) = 1
    ) unique_pairs
  ) <> 72 then
    raise exception 'Every World Cup 2026 intra-group pair must occur exactly once';
  end if;

  if (
    select count(distinct (bracket_payload ->> 'officialMatchNumber')::integer)
    from public.matches
    where edition_id = target_edition and stage_id = group_stage_id
      and bracket_payload ? 'officialMatchNumber'
      and (bracket_payload ->> 'officialMatchNumber')::integer between 1 and 72
  ) <> 72 then
    raise exception 'World Cup 2026 official match numbers 1-72 must be complete and unique';
  end if;

  if exists (
    select 1 from public.matches
    where edition_id = target_edition and stage_id = group_stage_id
      and (status <> 'NOT_STARTED' or round_id is not null)
  ) then
    raise exception 'World Cup 2026 initial catalog must not contain results or knockout metadata';
  end if;
end;
$$;

revoke all on function public.populate_world_cup_2026_initial_catalog() from public, anon, authenticated;
revoke all on function public.validate_world_cup_2026_initial_catalog() from public, anon, authenticated;

select public.populate_world_cup_2026_initial_catalog()
where exists (
  select 1 from public.competition_editions
  where id = '00000000-0000-4000-8000-000000000521'::uuid
);

comment on function public.populate_world_cup_2026_initial_catalog() is
  'Idempotent migration-owned population helper for the factual FIFA World Cup 2026 teams, groups and matches M1-M72. Not executable by client roles.';

comment on function public.validate_world_cup_2026_initial_catalog() is
  'Migration/test-only material validator for the edition-scoped FIFA World Cup 2026 initial catalog. Not executable by client roles.';
