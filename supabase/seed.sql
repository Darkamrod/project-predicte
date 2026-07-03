insert into public.sports (id, code, name)
values ('00000000-0000-4000-8000-000000000001', 'FOOTBALL', 'Football')
on conflict (id) do update set code = excluded.code, name = excluded.name;

insert into public.competition_templates (id, sport_id, code, name)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'FIFA_WORLD_CUP',
  'FIFA World Cup'
)
on conflict (id) do update set
  sport_id = excluded.sport_id,
  code = excluded.code,
  name = excluded.name;

insert into public.competition_editions (
  id,
  template_id,
  name,
  season_label,
  enabled,
  first_kickoff_at,
  maximum_deadline_at,
  format,
  data_completeness
)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'Project Predicte Mock World Cup',
  '2030',
  true,
  '2030-06-08T19:00:00Z',
  '2030-06-08T18:30:00Z',
  '{"groups": 1, "teamsPerGroup": 4, "knockoutRounds": 0}'::jsonb,
  'mock'
)
on conflict (id) do update set
  template_id = excluded.template_id,
  name = excluded.name,
  season_label = excluded.season_label,
  enabled = excluded.enabled,
  first_kickoff_at = excluded.first_kickoff_at,
  maximum_deadline_at = excluded.maximum_deadline_at,
  format = excluded.format,
  data_completeness = excluded.data_completeness;

insert into public.stages (id, edition_id, code, kind, name, sort_order)
values (
  '00000000-0000-4000-8000-000000000010',
  '00000000-0000-4000-8000-000000000003',
  'GROUP_STAGE',
  'GROUP',
  'Group stage',
  1
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  code = excluded.code,
  kind = excluded.kind,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.groups (id, edition_id, stage_id, code, name, sort_order)
values (
  '00000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000010',
  'A',
  'Group A',
  1
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  stage_id = excluded.stage_id,
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.rounds (id, edition_id, stage_id, code, name, sort_order)
values (
  '00000000-0000-4000-8000-000000000030',
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000010',
  'GROUP_ROUND_1',
  'Group round 1',
  1
)
on conflict (id) do update set
  edition_id = excluded.edition_id,
  stage_id = excluded.stage_id,
  code = excluded.code,
  name = excluded.name,
  sort_order = excluded.sort_order;

insert into public.teams (id, name, short_name, country_code)
values
  ('00000000-0000-4000-8000-000000000101', 'Italia Mock', 'ITA', 'IT'),
  ('00000000-0000-4000-8000-000000000102', 'Brasile Mock', 'BRA', 'BR'),
  ('00000000-0000-4000-8000-000000000103', 'Giappone Mock', 'JPN', 'JP'),
  ('00000000-0000-4000-8000-000000000104', 'Canada Mock', 'CAN', 'CA')
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  country_code = excluded.country_code;

insert into public.edition_teams (edition_id, team_id, seed_group_id)
values
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000020'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000020'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000020'
  ),
  (
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000020'
  )
on conflict (edition_id, team_id) do update set seed_group_id = excluded.seed_group_id;

insert into public.matches (
  id,
  edition_id,
  stage_id,
  group_id,
  round_id,
  home_team_id,
  away_team_id,
  kickoff_at,
  status,
  sort_order
)
values
  (
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    '2030-06-08T19:00:00Z',
    'NOT_STARTED',
    1
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000010',
    '00000000-0000-4000-8000-000000000020',
    '00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000104',
    '2030-06-08T21:00:00Z',
    'NOT_STARTED',
    2
  )
on conflict (id) do update set
  edition_id = excluded.edition_id,
  stage_id = excluded.stage_id,
  group_id = excluded.group_id,
  round_id = excluded.round_id,
  home_team_id = excluded.home_team_id,
  away_team_id = excluded.away_team_id,
  kickoff_at = excluded.kickoff_at,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.competition_antepost_definitions (id, edition_id, code, label, value_type, required)
values
  (
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000003',
    'WINNER',
    'Winner',
    'TEAM_ID',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000402',
    '00000000-0000-4000-8000-000000000003',
    'RUNNER_UP',
    'Runner-up',
    'TEAM_ID',
    true
  )
on conflict (id) do update set
  edition_id = excluded.edition_id,
  code = excluded.code,
  label = excluded.label,
  value_type = excluded.value_type,
  required = excluded.required;

insert into public.scoring_presets (
  id,
  competition_template_id,
  competition_edition_id,
  name,
  schema_version,
  config,
  active
)
values (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000003',
  'World Cup Mock Default',
  1,
  '{
    "presetCode": "WORLD_CUP_MOCK_DEFAULT",
    "schemaVersion": 1,
    "maxPointsPerField": 10,
    "stages": {
      "GROUP_STAGE": {
        "exactScore": 5,
        "goalDifference": 3,
        "outcome": 2
      }
    },
    "antepost": {
      "winner": 10,
      "runnerUp": 7
    },
    "stacking": {
      "matchScoreMode": "BEST_ONLY"
    }
  }'::jsonb,
  true
)
on conflict (id) do update set
  competition_template_id = excluded.competition_template_id,
  competition_edition_id = excluded.competition_edition_id,
  name = excluded.name,
  schema_version = excluded.schema_version,
  config = excluded.config,
  active = excluded.active;
