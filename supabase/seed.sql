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
    "presetCode": "WORLD_CUP_DEFAULT",
    "schemaVersion": 1,
    "maxPointsPerField": 999,
    "stages": {
      "GROUP_STAGE": {
        "correctOutcome": 5,
        "exactScore": 10,
        "correctGroupPosition": 3,
        "stageQualification": 0,
        "correctPairing": 0,
        "extraTimeMethod": 0,
        "penaltyMethod": 0
      },
      "ROUND_OF_32": {
        "correctOutcome": 5,
        "exactScore": 10,
        "correctGroupPosition": 0,
        "stageQualification": 2,
        "correctPairing": 5,
        "extraTimeMethod": 2,
        "penaltyMethod": 5
      },
      "ROUND_OF_16": {
        "correctOutcome": 10,
        "exactScore": 15,
        "correctGroupPosition": 0,
        "stageQualification": 4,
        "correctPairing": 10,
        "extraTimeMethod": 4,
        "penaltyMethod": 10
      },
      "QUARTER_FINAL": {
        "correctOutcome": 15,
        "exactScore": 30,
        "correctGroupPosition": 0,
        "stageQualification": 8,
        "correctPairing": 15,
        "extraTimeMethod": 8,
        "penaltyMethod": 15
      },
      "SEMI_FINAL": {
        "correctOutcome": 25,
        "exactScore": 50,
        "correctGroupPosition": 0,
        "stageQualification": 15,
        "correctPairing": 5,
        "extraTimeMethod": 15,
        "penaltyMethod": 30
      },
      "THIRD_PLACE": {
        "correctOutcome": 20,
        "exactScore": 40,
        "correctGroupPosition": 0,
        "stageQualification": 10,
        "correctPairing": 10,
        "extraTimeMethod": 10,
        "penaltyMethod": 20
      },
      "FINAL": {
        "correctOutcome": 50,
        "exactScore": 100,
        "correctGroupPosition": 0,
        "stageQualification": 20,
        "correctPairing": 30,
        "extraTimeMethod": 20,
        "penaltyMethod": 30
      }
    },
    "antepost": {
      "tournamentWinner": 25,
      "topScorer": 25,
      "topScorerExactGoals": 50
    },
    "stacking": {
      "exactScoreReplacesOutcome": true,
      "topScorerExactGoalsReplacesTopScorer": true,
      "qualificationAndPairingAreIndependent": true,
      "advancementMethodRequiresDrawAndQualifier": true
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

insert into public.competition_families (id, sport_id, code, name, status)
values
  (
    '00000000-0000-4000-8000-000000000501',
    '00000000-0000-4000-8000-000000000001',
    'world_cup',
    'FIFA World Cup',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000502',
    '00000000-0000-4000-8000-000000000001',
    'euro',
    'UEFA EURO',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000503',
    '00000000-0000-4000-8000-000000000001',
    'champions_league',
    'UEFA Champions League',
    'active'
  )
on conflict (id) do update set
  sport_id = excluded.sport_id,
  code = excluded.code,
  name = excluded.name,
  status = excluded.status;

update public.competition_templates
set family_id = '00000000-0000-4000-8000-000000000501',
    status = 'active'
where id = '00000000-0000-4000-8000-000000000002';

insert into public.competition_templates (id, sport_id, family_id, code, name, status)
values
  (
    '00000000-0000-4000-8000-000000000512',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000502',
    'UEFA_EURO',
    'UEFA EURO',
    'active'
  ),
  (
    '00000000-0000-4000-8000-000000000513',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000503',
    'UEFA_CHAMPIONS_LEAGUE',
    'UEFA Champions League',
    'active'
  )
on conflict (id) do update set
  sport_id = excluded.sport_id,
  family_id = excluded.family_id,
  code = excluded.code,
  name = excluded.name,
  status = excluded.status;

update public.competition_editions
set edition_code = 'world_cup_2030',
    family_id = '00000000-0000-4000-8000-000000000501',
    official_rules_source = '{"label":"Project Predicte mock World Cup rules"}'::jsonb
where id = '00000000-0000-4000-8000-000000000003';

insert into public.competition_editions (
  id,
  template_id,
  name,
  season_label,
  enabled,
  first_kickoff_at,
  maximum_deadline_at,
  format,
  data_completeness,
  edition_code,
  family_id,
  official_rules_source
)
values
  (
    '00000000-0000-4000-8000-000000000521',
    '00000000-0000-4000-8000-000000000002',
    'FIFA World Cup 2026',
    '2026',
    true,
    '2026-11-20T19:00:00Z',
    '2026-11-20T18:30:00Z',
    '{"teamCount":48,"initialStageKind":"group_stage","groupCount":12,"teamsPerGroup":4,"automaticQualifiersPerGroup":2,"bestThirdPlacedTeams":8,"knockoutRounds":["ROUND_OF_32","ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","THIRD_PLACE","FINAL"],"bracketMappingStrategy":"fifa_2026_bracket_slots"}'::jsonb,
    'mock',
    'world_cup_2026',
    '00000000-0000-4000-8000-000000000501',
    '{"label":"Initial Project Predicte FIFA World Cup 2026 mock rules"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000522',
    '00000000-0000-4000-8000-000000000512',
    'UEFA EURO 2028',
    '2028',
    true,
    '2028-06-09T19:00:00Z',
    '2028-06-09T18:30:00Z',
    '{"teamCount":24,"initialStageKind":"group_stage","groupCount":6,"teamsPerGroup":4,"automaticQualifiersPerGroup":2,"bestThirdPlacedTeams":4,"knockoutRounds":["ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","FINAL"],"bracketMappingStrategy":"uefa_euro_2028_bracket_slots","rankingRuleSetCode":"uefa_group_head_to_head_first"}'::jsonb,
    'mock',
    'euro_2028',
    '00000000-0000-4000-8000-000000000502',
    '{"label":"Initial Project Predicte UEFA EURO 2028 mock rules"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000523',
    '00000000-0000-4000-8000-000000000513',
    'UEFA Champions League 2026/27',
    '2026/27',
    true,
    '2026-09-15T19:00:00Z',
    '2026-09-15T18:30:00Z',
    '{"teamCount":36,"initialStageKind":"league_phase","leaguePhase":{"tableSize":36,"matchesPerTeam":8,"homeMatchesPerTeam":4,"awayMatchesPerTeam":4,"directRoundOf16Positions":[1,8],"playoffPositions":[9,24],"eliminatedPositions":[25,36]},"bestThirdPlacedTeams":0,"knockoutRounds":["PLAYOFF","ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","FINAL"],"bracketMappingStrategy":"ucl_2026_27_seeded_playoff","knockoutTieModeByRound":{"PLAYOFF":"two_leg","ROUND_OF_16":"two_leg","QUARTER_FINAL":"two_leg","SEMI_FINAL":"two_leg","FINAL":"single_leg"}}'::jsonb,
    'mock',
    'champions_league_2026_27',
    '00000000-0000-4000-8000-000000000503',
    '{"label":"Initial Project Predicte UEFA Champions League 2026/27 mock rules"}'::jsonb
  )
on conflict (id) do update set
  template_id = excluded.template_id,
  name = excluded.name,
  season_label = excluded.season_label,
  enabled = excluded.enabled,
  first_kickoff_at = excluded.first_kickoff_at,
  maximum_deadline_at = excluded.maximum_deadline_at,
  format = excluded.format,
  data_completeness = excluded.data_completeness,
  edition_code = excluded.edition_code,
  family_id = excluded.family_id,
  official_rules_source = excluded.official_rules_source;

insert into public.format_template_versions (
  id,
  competition_family_id,
  competition_template_id,
  competition_edition_id,
  version,
  status,
  valid_from,
  official_rules_source,
  format,
  stages,
  ranking_rule_sets,
  bracket_mapping_strategy
)
select
  version_id,
  family_id,
  template_id,
  edition_id,
  '1.0.0',
  'active',
  valid_from,
  official_rules_source,
  format,
  stages,
  ranking_rule_sets,
  bracket_mapping_strategy
from (
  values
    (
      '00000000-0000-4000-8000-000000000531'::uuid,
      '00000000-0000-4000-8000-000000000501'::uuid,
      '00000000-0000-4000-8000-000000000002'::uuid,
      '00000000-0000-4000-8000-000000000521'::uuid,
      '2026-11-20T19:00:00Z'::timestamptz,
      '{"label":"Initial Project Predicte FIFA World Cup 2026 mock rules"}'::jsonb,
      '{"teamCount":48,"initialStageKind":"group_stage","groupCount":12,"teamsPerGroup":4,"automaticQualifiersPerGroup":2,"bestThirdPlacedTeams":8,"knockoutRounds":["ROUND_OF_32","ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","THIRD_PLACE","FINAL"]}'::jsonb,
      '[{"code":"GROUP_STAGE","kind":"group_stage"},{"code":"BEST_THIRDS","kind":"best_thirds_ranking"},{"code":"ROUND_OF_32","kind":"knockout_single_leg"},{"code":"THIRD_PLACE","kind":"third_place_final"},{"code":"FINAL","kind":"final_single_leg"}]'::jsonb,
      '[{"code":"fifa_group","rules":["points","goal_difference","goals_for","disciplinary","drawing_of_lots"]}]'::jsonb,
      'fifa_2026_bracket_slots'
    ),
    (
      '00000000-0000-4000-8000-000000000532'::uuid,
      '00000000-0000-4000-8000-000000000502'::uuid,
      '00000000-0000-4000-8000-000000000512'::uuid,
      '00000000-0000-4000-8000-000000000522'::uuid,
      '2028-06-09T19:00:00Z'::timestamptz,
      '{"label":"Initial Project Predicte UEFA EURO 2028 mock rules"}'::jsonb,
      '{"teamCount":24,"initialStageKind":"group_stage","groupCount":6,"teamsPerGroup":4,"automaticQualifiersPerGroup":2,"bestThirdPlacedTeams":4,"knockoutRounds":["ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","FINAL"]}'::jsonb,
      '[{"code":"GROUP_STAGE","kind":"group_stage"},{"code":"BEST_THIRDS","kind":"best_thirds_ranking"},{"code":"ROUND_OF_16","kind":"knockout_single_leg"},{"code":"FINAL","kind":"final_single_leg"}]'::jsonb,
      '[{"code":"uefa_group_head_to_head_first","rules":["points","head_to_head_points","head_to_head_goal_difference","goal_difference","goals_for","wins","disciplinary"]}]'::jsonb,
      'uefa_euro_2028_bracket_slots'
    ),
    (
      '00000000-0000-4000-8000-000000000533'::uuid,
      '00000000-0000-4000-8000-000000000503'::uuid,
      '00000000-0000-4000-8000-000000000513'::uuid,
      '00000000-0000-4000-8000-000000000523'::uuid,
      '2026-09-15T19:00:00Z'::timestamptz,
      '{"label":"Initial Project Predicte UEFA Champions League 2026/27 mock rules"}'::jsonb,
      '{"teamCount":36,"initialStageKind":"league_phase","leaguePhase":{"tableSize":36,"matchesPerTeam":8,"homeMatchesPerTeam":4,"awayMatchesPerTeam":4},"bestThirdPlacedTeams":0,"knockoutRounds":["PLAYOFF","ROUND_OF_16","QUARTER_FINAL","SEMI_FINAL","FINAL"]}'::jsonb,
      '[{"code":"LEAGUE_PHASE","kind":"league_phase"},{"code":"PLAYOFF","kind":"knockout_two_leg"},{"code":"ROUND_OF_16","kind":"knockout_two_leg"},{"code":"FINAL","kind":"final_single_leg"}]'::jsonb,
      '[{"code":"champions_league_phase","rules":["points","goal_difference","goals_for","wins","disciplinary","coefficient"]}]'::jsonb,
      'ucl_2026_27_seeded_playoff'
    )
) as seed(version_id, family_id, template_id, edition_id, valid_from, official_rules_source, format, stages, ranking_rule_sets, bracket_mapping_strategy)
on conflict (id) do update set
  competition_family_id = excluded.competition_family_id,
  competition_template_id = excluded.competition_template_id,
  competition_edition_id = excluded.competition_edition_id,
  version = excluded.version,
  status = excluded.status,
  valid_from = excluded.valid_from,
  official_rules_source = excluded.official_rules_source,
  format = excluded.format,
  stages = excluded.stages,
  ranking_rule_sets = excluded.ranking_rule_sets,
  bracket_mapping_strategy = excluded.bracket_mapping_strategy;

insert into public.ruleset_versions (
  id,
  competition_family_id,
  competition_edition_id,
  version,
  status,
  valid_from,
  official_rules_source,
  ranking_rule_set_codes,
  rules_payload
)
select id, family_id, edition_id, '1.0.0', 'active', valid_from, source, ranking_codes, payload
from (
  values
    ('00000000-0000-4000-8000-000000000541'::uuid, '00000000-0000-4000-8000-000000000501'::uuid, '00000000-0000-4000-8000-000000000521'::uuid, '2026-11-20T19:00:00Z'::timestamptz, '{"label":"FIFA World Cup 2026 mock rules"}'::jsonb, array['fifa_group'], '{"family":"world_cup"}'::jsonb),
    ('00000000-0000-4000-8000-000000000542'::uuid, '00000000-0000-4000-8000-000000000502'::uuid, '00000000-0000-4000-8000-000000000522'::uuid, '2028-06-09T19:00:00Z'::timestamptz, '{"label":"UEFA EURO 2028 mock rules"}'::jsonb, array['uefa_group_head_to_head_first'], '{"family":"euro"}'::jsonb),
    ('00000000-0000-4000-8000-000000000543'::uuid, '00000000-0000-4000-8000-000000000503'::uuid, '00000000-0000-4000-8000-000000000523'::uuid, '2026-09-15T19:00:00Z'::timestamptz, '{"label":"UEFA Champions League 2026/27 mock rules"}'::jsonb, array['champions_league_phase'], '{"family":"champions_league"}'::jsonb)
) as seed(id, family_id, edition_id, valid_from, source, ranking_codes, payload)
on conflict (id) do update set
  competition_family_id = excluded.competition_family_id,
  competition_edition_id = excluded.competition_edition_id,
  version = excluded.version,
  status = excluded.status,
  valid_from = excluded.valid_from,
  official_rules_source = excluded.official_rules_source,
  ranking_rule_set_codes = excluded.ranking_rule_set_codes,
  rules_payload = excluded.rules_payload;

insert into public.prediction_requirement_versions (
  id,
  competition_family_id,
  competition_edition_id,
  version,
  status,
  valid_from,
  requirements
)
select id, family_id, edition_id, '1.0.0', 'active', valid_from, requirements
from (
  values
    ('00000000-0000-4000-8000-000000000551'::uuid, '00000000-0000-4000-8000-000000000501'::uuid, '00000000-0000-4000-8000-000000000521'::uuid, '2026-11-20T19:00:00Z'::timestamptz, '["MATCH_SCORE","GROUP_STANDINGS","BEST_THIRDS","KNOCKOUT_QUALIFIER","KNOCKOUT_ADVANCEMENT_METHOD","TOURNAMENT_WINNER","TOP_SCORER","TOP_SCORER_GOALS"]'::jsonb),
    ('00000000-0000-4000-8000-000000000552'::uuid, '00000000-0000-4000-8000-000000000502'::uuid, '00000000-0000-4000-8000-000000000522'::uuid, '2028-06-09T19:00:00Z'::timestamptz, '["MATCH_SCORE","GROUP_STANDINGS","BEST_THIRDS","KNOCKOUT_QUALIFIER","KNOCKOUT_ADVANCEMENT_METHOD","TOURNAMENT_WINNER","TOP_SCORER","TOP_SCORER_GOALS"]'::jsonb),
    ('00000000-0000-4000-8000-000000000553'::uuid, '00000000-0000-4000-8000-000000000503'::uuid, '00000000-0000-4000-8000-000000000523'::uuid, '2026-09-15T19:00:00Z'::timestamptz, '["MATCH_SCORE","LEAGUE_PHASE_STANDINGS","KNOCKOUT_QUALIFIER","KNOCKOUT_ADVANCEMENT_METHOD","TOURNAMENT_WINNER","FINALISTS","TOP_SCORER","TOP_SCORER_GOALS"]'::jsonb)
) as seed(id, family_id, edition_id, valid_from, requirements)
on conflict (id) do update set
  competition_family_id = excluded.competition_family_id,
  competition_edition_id = excluded.competition_edition_id,
  version = excluded.version,
  status = excluded.status,
  valid_from = excluded.valid_from,
  requirements = excluded.requirements;

insert into public.scoring_preset_versions (
  id,
  competition_family_id,
  competition_template_id,
  competition_edition_id,
  preset_code,
  version,
  status,
  valid_from,
  config
)
select id, family_id, template_id, edition_id, preset_code, '1.0.0', 'active', valid_from, config
from (
  values
    ('00000000-0000-4000-8000-000000000561'::uuid, '00000000-0000-4000-8000-000000000501'::uuid, '00000000-0000-4000-8000-000000000002'::uuid, '00000000-0000-4000-8000-000000000521'::uuid, 'WORLD_CUP_DEFAULT', '2026-11-20T19:00:00Z'::timestamptz, '{"schemaVersion":1,"presetCode":"WORLD_CUP_DEFAULT","maxPointsPerField":999,"stages":{},"antepost":{},"stacking":{}}'::jsonb),
    ('00000000-0000-4000-8000-000000000562'::uuid, '00000000-0000-4000-8000-000000000502'::uuid, '00000000-0000-4000-8000-000000000512'::uuid, '00000000-0000-4000-8000-000000000522'::uuid, 'EURO_DEFAULT', '2028-06-09T19:00:00Z'::timestamptz, '{"schemaVersion":1,"presetCode":"EURO_DEFAULT","maxPointsPerField":999,"stages":{},"antepost":{},"stacking":{}}'::jsonb),
    ('00000000-0000-4000-8000-000000000563'::uuid, '00000000-0000-4000-8000-000000000503'::uuid, '00000000-0000-4000-8000-000000000513'::uuid, '00000000-0000-4000-8000-000000000523'::uuid, 'CHAMPIONS_LEAGUE_DEFAULT', '2026-09-15T19:00:00Z'::timestamptz, '{"schemaVersion":1,"presetCode":"CHAMPIONS_LEAGUE_DEFAULT","maxPointsPerField":999,"stages":{},"antepost":{},"stacking":{}}'::jsonb)
) as seed(id, family_id, template_id, edition_id, preset_code, valid_from, config)
on conflict (id) do update set
  competition_family_id = excluded.competition_family_id,
  competition_template_id = excluded.competition_template_id,
  competition_edition_id = excluded.competition_edition_id,
  preset_code = excluded.preset_code,
  version = excluded.version,
  status = excluded.status,
  valid_from = excluded.valid_from,
  config = excluded.config;

update public.competition_editions
set format_template_version_id = mapping.format_id,
    ruleset_version_id = mapping.ruleset_id,
    prediction_requirement_version_id = mapping.requirement_id,
    scoring_preset_version_id = mapping.scoring_id
from (
  values
    ('00000000-0000-4000-8000-000000000521'::uuid, '00000000-0000-4000-8000-000000000531'::uuid, '00000000-0000-4000-8000-000000000541'::uuid, '00000000-0000-4000-8000-000000000551'::uuid, '00000000-0000-4000-8000-000000000561'::uuid),
    ('00000000-0000-4000-8000-000000000522'::uuid, '00000000-0000-4000-8000-000000000532'::uuid, '00000000-0000-4000-8000-000000000542'::uuid, '00000000-0000-4000-8000-000000000552'::uuid, '00000000-0000-4000-8000-000000000562'::uuid),
    ('00000000-0000-4000-8000-000000000523'::uuid, '00000000-0000-4000-8000-000000000533'::uuid, '00000000-0000-4000-8000-000000000543'::uuid, '00000000-0000-4000-8000-000000000553'::uuid, '00000000-0000-4000-8000-000000000563'::uuid)
) as mapping(edition_id, format_id, ruleset_id, requirement_id, scoring_id)
where public.competition_editions.id = mapping.edition_id;
