insert into public.sports (id, code, name)
values ('10000000-0000-4000-8000-000000000001', 'C2B1_FOOTBALL', 'C2B1 Football');

insert into public.competition_families (id, sport_id, code, name, status)
values (
  '00000000-0000-4000-8000-000000000501',
  '10000000-0000-4000-8000-000000000001',
  'c2b1_world_cup', 'C2B1 World Cup', 'active'
);

insert into public.competition_templates (id, sport_id, family_id, code, name, status)
values (
  '00000000-0000-4000-8000-000000000511',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000501',
  'C2B1_WORLD_CUP', 'C2B1 World Cup', 'active'
);

insert into public.competition_editions (
  id, template_id, family_id, edition_code, name, season_label, enabled,
  format, data_completeness
) values (
  '00000000-0000-4000-8000-000000000521',
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000501',
  'c2b1_world_cup_2026', 'C2B1 World Cup 2026', '2026', true,
  '{}'::jsonb, 'mock'
);

insert into public.format_template_versions (
  id, competition_family_id, competition_template_id, competition_edition_id,
  version, status, valid_from, format, stages, ranking_rule_sets,
  bracket_mapping_strategy
) values (
  '00000000-0000-4000-8000-000000000531',
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000511',
  '00000000-0000-4000-8000-000000000521',
  '1.0.0-c2b1', 'active', now(), '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'explicit_versioned_slots'
);

insert into public.stages (id, edition_id, code, kind, name, sort_order)
values
  ('04a94cb6-eae6-4d6e-8809-078564286d46', '00000000-0000-4000-8000-000000000521', 'GROUP_STAGE', 'GROUP', 'Group stage', 1),
  ('96cf3727-c5d0-4dd1-8851-075cd0ed1e10', '00000000-0000-4000-8000-000000000521', 'ROUND_OF_32', 'KNOCKOUT', 'Round of 32', 2);

insert into public.groups (id, edition_id, stage_id, code, name, sort_order)
values (
  '10000000-0000-4000-8000-000000000020',
  '00000000-0000-4000-8000-000000000521',
  '04a94cb6-eae6-4d6e-8809-078564286d46', 'A', 'Group A', 1
);

insert into public.rounds (id, edition_id, stage_id, code, name, sort_order)
values (
  '808fdaf5-6d32-487e-8e4d-59d6543ab6b5',
  '00000000-0000-4000-8000-000000000521',
  '96cf3727-c5d0-4dd1-8851-075cd0ed1e10', 'ROUND_OF_32', 'Round of 32', 1
);

insert into public.bracket_slots (id, edition_id, round_id, source_type, source_payload)
values (
  '10000000-0000-4000-8000-000000000099',
  '00000000-0000-4000-8000-000000000521',
  '808fdaf5-6d32-487e-8e4d-59d6543ab6b5',
  'GROUP_POSITION', '{"groupCode":"A","position":1}'::jsonb
);
