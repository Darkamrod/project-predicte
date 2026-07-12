insert into public.sports (id, code, name)
values ('20000000-0000-4000-8000-000000000001', 'C2B1_UNKNOWN', 'C2B1 Unknown');

insert into public.competition_families (id, sport_id, code, name, status)
values (
  '20000000-0000-4000-8000-000000000501',
  '20000000-0000-4000-8000-000000000001',
  'c2b1_unknown', 'C2B1 Unknown', 'active'
);

insert into public.competition_templates (id, sport_id, family_id, code, name, status)
values (
  '20000000-0000-4000-8000-000000000511',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000501',
  'C2B1_UNKNOWN', 'C2B1 Unknown', 'active'
);

insert into public.competition_editions (
  id, template_id, family_id, edition_code, name, season_label, enabled,
  format, data_completeness
) values (
  '20000000-0000-4000-8000-000000000521',
  '20000000-0000-4000-8000-000000000511',
  '20000000-0000-4000-8000-000000000501',
  'c2b1_unknown_edition', 'C2B1 Unknown', 'future', false, '{}'::jsonb, 'partial'
);

insert into public.format_template_versions (
  id, competition_family_id, competition_template_id, competition_edition_id,
  version, status, valid_from, format, stages, ranking_rule_sets,
  bracket_mapping_strategy
) values (
  '20000000-0000-4000-8000-000000000531',
  '20000000-0000-4000-8000-000000000501',
  '20000000-0000-4000-8000-000000000511',
  '20000000-0000-4000-8000-000000000521',
  '1.0.0', 'active', now(), '{}'::jsonb, '[]'::jsonb, '[]'::jsonb,
  'unsupported'
);

insert into public.stages (id, edition_id, code, kind, name, sort_order)
values (
  '20000000-0000-4000-8000-000000000010',
  '20000000-0000-4000-8000-000000000521',
  'UNKNOWN_ROUND', 'KNOCKOUT', 'Unknown round', 1
);

insert into public.rounds (id, edition_id, stage_id, code, name, sort_order)
values (
  '20000000-0000-4000-8000-000000000030',
  '20000000-0000-4000-8000-000000000521',
  '20000000-0000-4000-8000-000000000010',
  'UNKNOWN_ROUND', 'Unknown round', 1
);

insert into public.bracket_slots (id, edition_id, round_id, source_type, source_payload)
values (
  '20000000-0000-4000-8000-000000000099',
  '20000000-0000-4000-8000-000000000521',
  '20000000-0000-4000-8000-000000000030',
  'GROUP_POSITION', '{"groupCode":"Z","position":1}'::jsonb
);
