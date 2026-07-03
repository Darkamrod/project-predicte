insert into public.sports (id, code, name)
values ('00000000-0000-4000-8000-000000000001', 'FOOTBALL', 'Football')
on conflict do nothing;

insert into public.competition_templates (id, sport_id, code, name)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'FIFA_WORLD_CUP',
  'FIFA World Cup'
)
on conflict do nothing;
