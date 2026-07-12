-- Milestone 11J-C2B1-2: authoritative FIFA World Cup 2026 bracket catalog.
-- Authority: FIFA, FIFA World Cup 2026 Regulations, May 2026.
-- Scope: Articles 12.6-12.11 and Annexe C (all 495 best-third combinations).
-- Acquired 2026-07-12 from:
-- https://digitalhub.fifa.com/m/636f5c9c6f29771f/original/FWC2026_regulations_EN.pdf
-- SHA-256: BAD4EA83CF1F51055598B0C12C3DAB280A78777E08A623B9E9098508B4ECC8D9
-- The source PDF is not stored in this repository.

create or replace function public.upsert_official_world_cup_bracket_slot(
  p_format_version_id uuid,
  p_node_key text,
  p_target_side text,
  p_source_type text,
  p_source_payload jsonb
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_node public.format_template_match_nodes%rowtype;
  legacy_slot public.bracket_slots%rowtype;
  matching_count integer;
  slot_id uuid;
begin
  select * into target_node
  from public.format_template_match_nodes
  where format_template_version_id = p_format_version_id and node_key = p_node_key;

  if not found then
    raise exception 'Official bracket node % is missing for version %', p_node_key, p_format_version_id;
  end if;

  slot_id := public.predicte_catalog_uuid(p_format_version_id::text || ':slot:' || p_node_key || ':' || p_target_side);

  select count(*) into matching_count
  from public.bracket_slots bs
  where bs.edition_id = target_node.edition_id
    and bs.source_type = p_source_type
    and bs.source_payload = p_source_payload;

  if matching_count > 1 then
    raise exception 'Ambiguous legacy bracket source for % %', p_node_key, p_target_side;
  end if;

  if matching_count = 1 then
    select * into legacy_slot from public.bracket_slots bs
    where bs.edition_id = target_node.edition_id
      and bs.source_type = p_source_type
      and bs.source_payload = p_source_payload;

    if legacy_slot.format_template_version_id is not null
       and (legacy_slot.format_template_version_id <> p_format_version_id
         or legacy_slot.target_node_id <> target_node.id
         or legacy_slot.target_side <> p_target_side) then
      raise exception 'Conflicting legacy bracket source for % %', p_node_key, p_target_side;
    end if;

    update public.bracket_slots set
      format_template_version_id = p_format_version_id,
      target_node_id = target_node.id,
      target_match_id = target_node.target_match_id,
      round_id = target_node.round_id,
      target_side = p_target_side,
      target_leg = 1,
      slot_key = p_node_key || ':' || p_target_side
    where id = legacy_slot.id;
    return;
  end if;

  insert into public.bracket_slots (
    id, edition_id, round_id, format_template_version_id, target_node_id,
    target_match_id, target_side, target_leg, slot_key, source_type, source_payload
  ) values (
    slot_id, target_node.edition_id, target_node.round_id, p_format_version_id,
    target_node.id, target_node.target_match_id, p_target_side, 1,
    p_node_key || ':' || p_target_side, p_source_type, p_source_payload
  ) on conflict (id) do update set
    target_node_id = excluded.target_node_id,
    target_match_id = excluded.target_match_id,
    round_id = excluded.round_id,
    target_side = excluded.target_side,
    source_type = excluded.source_type,
    source_payload = excluded.source_payload;
end;
$$;

revoke all on function public.upsert_official_world_cup_bracket_slot(uuid, text, text, text, jsonb)
from public, anon, authenticated;

create or replace function public.populate_supported_bracket_destination_catalog(p_format_version_id uuid)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  wc_edition constant uuid := '00000000-0000-4000-8000-000000000521'::uuid;
  wc_version constant uuid := '00000000-0000-4000-8000-000000000531'::uuid;
  item record;
  source_node public.format_template_match_nodes%rowtype;
  source_type text;
  source_payload jsonb;
begin
  if p_format_version_id <> wc_version then return; end if;

  if not exists (
    select 1 from public.format_template_versions
    where id = wc_version and competition_edition_id = wc_edition
  ) then
    raise exception 'World Cup 2026 format version does not match its edition';
  end if;

  insert into public.stages (id, edition_id, code, kind, name, sort_order)
  select public.predicte_catalog_uuid(wc_edition::text || ':stage:' || code), wc_edition,
    code, kind, name, sort_order
  from (values
    ('GROUP_STAGE','GROUP','Group stage',1),
    ('ROUND_OF_32','KNOCKOUT','Round of 32',10),
    ('ROUND_OF_16','KNOCKOUT','Round of 16',20),
    ('QUARTER_FINAL','KNOCKOUT','Quarter-finals',30),
    ('SEMI_FINAL','KNOCKOUT','Semi-finals',40),
    ('THIRD_PLACE','KNOCKOUT','Third-place match',50),
    ('FINAL','KNOCKOUT','Final',60)
  ) catalog(code,kind,name,sort_order)
  on conflict on constraint stages_edition_id_code_key do update set name = excluded.name;

  insert into public.groups (id, edition_id, stage_id, code, name, sort_order)
  select public.predicte_catalog_uuid(wc_edition::text || ':group:' || code), wc_edition,
    (select id from public.stages where edition_id = wc_edition and code = 'GROUP_STAGE'), code,
    'Group ' || code, sort_order
  from (values ('A',1),('B',2),('C',3),('D',4),('E',5),('F',6),
    ('G',7),('H',8),('I',9),('J',10),('K',11),('L',12)) groups(code,sort_order)
  on conflict on constraint groups_edition_id_code_key do update set name = excluded.name;

  insert into public.rounds (id, edition_id, stage_id, code, name, sort_order)
  select public.predicte_catalog_uuid(wc_edition::text || ':round:' || code), wc_edition,
    (select id from public.stages s where s.edition_id = wc_edition and s.code = rounds.code), code, name, sort_order
  from (values
    ('ROUND_OF_32','Round of 32',1),('ROUND_OF_16','Round of 16',2),
    ('QUARTER_FINAL','Quarter-finals',3),('SEMI_FINAL','Semi-finals',4),
    ('THIRD_PLACE','Third-place match',5),('FINAL','Final',6)
  ) rounds(code,name,sort_order)
  on conflict on constraint rounds_edition_id_code_key do update set name = excluded.name;

  for item in select * from (values
    ('M73','ROUND_OF_32',73),('M74','ROUND_OF_32',74),('M75','ROUND_OF_32',75),('M76','ROUND_OF_32',76),
    ('M77','ROUND_OF_32',77),('M78','ROUND_OF_32',78),('M79','ROUND_OF_32',79),('M80','ROUND_OF_32',80),
    ('M81','ROUND_OF_32',81),('M82','ROUND_OF_32',82),('M83','ROUND_OF_32',83),('M84','ROUND_OF_32',84),
    ('M85','ROUND_OF_32',85),('M86','ROUND_OF_32',86),('M87','ROUND_OF_32',87),('M88','ROUND_OF_32',88),
    ('M89','ROUND_OF_16',89),('M90','ROUND_OF_16',90),('M91','ROUND_OF_16',91),('M92','ROUND_OF_16',92),
    ('M93','ROUND_OF_16',93),('M94','ROUND_OF_16',94),('M95','ROUND_OF_16',95),('M96','ROUND_OF_16',96),
    ('M97','QUARTER_FINAL',97),('M98','QUARTER_FINAL',98),('M99','QUARTER_FINAL',99),('M100','QUARTER_FINAL',100),
    ('M101','SEMI_FINAL',101),('M102','SEMI_FINAL',102),('M103','THIRD_PLACE',103),('M104','FINAL',104)
  ) nodes(node_key,round_code,sort_order) loop
    insert into public.matches (id, edition_id, stage_id, round_id, bracket_payload, status, sort_order)
    values (
      public.predicte_catalog_uuid(wc_edition::text || ':match:' || item.node_key), wc_edition,
      (select id from public.stages where edition_id = wc_edition and code = item.round_code),
      (select id from public.rounds where edition_id = wc_edition and code = item.round_code),
      jsonb_build_object('catalog','FIFA World Cup 2026 Regulations','nodeKey',item.node_key),
      'NOT_STARTED', item.sort_order
    ) on conflict (id) do update set bracket_payload = excluded.bracket_payload,
      round_id = excluded.round_id, stage_id = excluded.stage_id, sort_order = excluded.sort_order;

    insert into public.format_template_match_nodes (
      id, edition_id, format_template_version_id, node_key, round_id, target_match_id, sort_order
    ) values (
      public.predicte_catalog_uuid(wc_version::text || ':node:' || item.node_key), wc_edition,
      wc_version, item.node_key,
      (select id from public.rounds where edition_id = wc_edition and code = item.round_code),
      public.predicte_catalog_uuid(wc_edition::text || ':match:' || item.node_key), item.sort_order
    ) on conflict (format_template_version_id, node_key) do update set
      round_id = excluded.round_id, target_match_id = excluded.target_match_id, sort_order = excluded.sort_order;
  end loop;

  for item in select * from (values
    ('M73','home','2A'),('M73','away','2B'),('M74','home','1E'),
    ('M75','home','1F'),('M75','away','2C'),('M76','home','1C'),('M76','away','2F'),
    ('M77','home','1I'),('M78','home','2E'),('M78','away','2I'),('M79','home','1A'),('M80','home','1L'),
    ('M81','home','1D'),('M82','home','1G'),('M83','home','2K'),('M83','away','2L'),
    ('M84','home','1H'),('M84','away','2J'),('M85','home','1B'),('M86','home','1J'),('M86','away','2H'),
    ('M87','home','1K'),('M88','home','2D'),('M88','away','2G'),
    ('M89','home','W74'),('M89','away','W77'),('M90','home','W73'),('M90','away','W75'),
    ('M91','home','W76'),('M91','away','W78'),('M92','home','W79'),('M92','away','W80'),
    ('M93','home','W83'),('M93','away','W84'),('M94','home','W81'),('M94','away','W82'),
    ('M95','home','W86'),('M95','away','W88'),('M96','home','W85'),('M96','away','W87'),
    ('M97','home','W89'),('M97','away','W90'),('M98','home','W93'),('M98','away','W94'),
    ('M99','home','W91'),('M99','away','W92'),('M100','home','W95'),('M100','away','W96'),
    ('M101','home','W97'),('M101','away','W98'),('M102','home','W99'),('M102','away','W100'),
    ('M103','home','L101'),('M103','away','L102'),('M104','home','W101'),('M104','away','W102')
  ) fixed(target_node_key,target_side,source_key) loop
    if item.source_key ~ '^[12][A-L]$' then
      source_type := 'GROUP_POSITION';
      source_payload := jsonb_build_object('groupCode',right(item.source_key,1),'position',left(item.source_key,1)::integer);
    else
      select * into strict source_node from public.format_template_match_nodes
      where format_template_version_id = wc_version and node_key = 'M' || substring(item.source_key from 2);
      source_type := case when left(item.source_key,1) = 'W' then 'WINNER_OF_MATCH' else 'LOSER_OF_MATCH' end;
      source_payload := jsonb_build_object('matchId',source_node.target_match_id,'nodeKey',source_node.node_key);
    end if;
    perform public.upsert_official_world_cup_bracket_slot(wc_version,item.target_node_key,item.target_side,source_type,source_payload);
  end loop;

  if exists (
    select 1 from public.format_template_best_third_combinations
    where format_template_version_id = wc_version
  ) then
    for item in select * from (values
      ('M74','away','E'),('M77','away','I'),('M79','away','A'),('M80','away','L'),
      ('M81','away','D'),('M82','away','G'),('M85','away','B'),('M87','away','K')
    ) conditional(target_node_key,target_side,winner_group_code) loop
      perform public.upsert_official_world_cup_bracket_slot(
        wc_version,item.target_node_key,item.target_side,'BEST_THIRD_MATRIX',
        jsonb_build_object('winnerGroupCode',item.winner_group_code)
      );
    end loop;
  end if;
end;
$$;

revoke all on function public.populate_supported_bracket_destination_catalog(uuid)
from public, anon, authenticated;

select public.populate_supported_bracket_destination_catalog('00000000-0000-4000-8000-000000000531'::uuid)
where exists (
  select 1 from public.format_template_versions
  where id = '00000000-0000-4000-8000-000000000531'::uuid
);

create or replace function public.official_world_cup_2026_best_third_matrix()
returns table (
  option_number integer,
  one_a text, one_b text, one_d text, one_e text,
  one_g text, one_i text, one_k text, one_l text
)
language sql
immutable
set search_path = pg_catalog
as $$
values
  (1,'E','J','I','F','H','G','L','K'),
  (2,'H','G','I','D','J','F','L','K'),
  (3,'E','J','I','D','H','G','L','K'),
  (4,'E','J','I','D','H','F','L','K'),
  (5,'E','G','I','D','J','F','L','K'),
  (6,'E','G','J','D','H','F','L','K'),
  (7,'E','G','I','D','H','F','L','K'),
  (8,'E','G','J','D','H','F','L','I'),
  (9,'E','G','J','D','H','F','I','K'),
  (10,'H','G','I','C','J','F','L','K'),
  (11,'E','J','I','C','H','G','L','K'),
  (12,'E','J','I','C','H','F','L','K'),
  (13,'E','G','I','C','J','F','L','K'),
  (14,'E','G','J','C','H','F','L','K'),
  (15,'E','G','I','C','H','F','L','K'),
  (16,'E','G','J','C','H','F','L','I'),
  (17,'E','G','J','C','H','F','I','K'),
  (18,'H','G','I','C','J','D','L','K'),
  (19,'C','J','I','D','H','F','L','K'),
  (20,'C','G','I','D','J','F','L','K'),
  (21,'C','G','J','D','H','F','L','K'),
  (22,'C','G','I','D','H','F','L','K'),
  (23,'C','G','J','D','H','F','L','I'),
  (24,'C','G','J','D','H','F','I','K'),
  (25,'E','J','I','C','H','D','L','K'),
  (26,'E','G','I','C','J','D','L','K'),
  (27,'E','G','J','C','H','D','L','K'),
  (28,'E','G','I','C','H','D','L','K'),
  (29,'E','G','J','C','H','D','L','I'),
  (30,'E','G','J','C','H','D','I','K'),
  (31,'C','J','E','D','I','F','L','K'),
  (32,'C','J','E','D','H','F','L','K'),
  (33,'C','E','I','D','H','F','L','K'),
  (34,'C','J','E','D','H','F','L','I'),
  (35,'C','J','E','D','H','F','I','K'),
  (36,'C','G','E','D','J','F','L','K'),
  (37,'C','G','E','D','I','F','L','K'),
  (38,'C','G','E','D','J','F','L','I'),
  (39,'C','G','E','D','J','F','I','K'),
  (40,'C','G','E','D','H','F','L','K'),
  (41,'C','G','J','D','H','F','L','E'),
  (42,'C','G','J','D','H','F','E','K'),
  (43,'C','G','E','D','H','F','L','I'),
  (44,'C','G','E','D','H','F','I','K'),
  (45,'C','G','J','D','H','F','E','I'),
  (46,'H','J','B','F','I','G','L','K'),
  (47,'E','J','I','B','H','G','L','K'),
  (48,'E','J','B','F','I','H','L','K'),
  (49,'E','J','B','F','I','G','L','K'),
  (50,'E','J','B','F','H','G','L','K'),
  (51,'E','G','B','F','I','H','L','K'),
  (52,'E','J','B','F','H','G','L','I'),
  (53,'E','J','B','F','H','G','I','K'),
  (54,'H','J','B','D','I','G','L','K'),
  (55,'H','J','B','D','I','F','L','K'),
  (56,'I','G','B','D','J','F','L','K'),
  (57,'H','G','B','D','J','F','L','K'),
  (58,'H','G','B','D','I','F','L','K'),
  (59,'H','G','B','D','J','F','L','I'),
  (60,'H','G','B','D','J','F','I','K'),
  (61,'E','J','B','D','I','H','L','K'),
  (62,'E','J','B','D','I','G','L','K'),
  (63,'E','J','B','D','H','G','L','K'),
  (64,'E','G','B','D','I','H','L','K'),
  (65,'E','J','B','D','H','G','L','I'),
  (66,'E','J','B','D','H','G','I','K'),
  (67,'E','J','B','D','I','F','L','K'),
  (68,'E','J','B','D','H','F','L','K'),
  (69,'E','I','B','D','H','F','L','K'),
  (70,'E','J','B','D','H','F','L','I'),
  (71,'E','J','B','D','H','F','I','K'),
  (72,'E','G','B','D','J','F','L','K'),
  (73,'E','G','B','D','I','F','L','K'),
  (74,'E','G','B','D','J','F','L','I'),
  (75,'E','G','B','D','J','F','I','K'),
  (76,'E','G','B','D','H','F','L','K'),
  (77,'H','G','B','D','J','F','L','E'),
  (78,'H','G','B','D','J','F','E','K'),
  (79,'E','G','B','D','H','F','L','I'),
  (80,'E','G','B','D','H','F','I','K'),
  (81,'H','G','B','D','J','F','E','I'),
  (82,'H','J','B','C','I','G','L','K'),
  (83,'H','J','B','C','I','F','L','K'),
  (84,'I','G','B','C','J','F','L','K'),
  (85,'H','G','B','C','J','F','L','K'),
  (86,'H','G','B','C','I','F','L','K'),
  (87,'H','G','B','C','J','F','L','I'),
  (88,'H','G','B','C','J','F','I','K'),
  (89,'E','J','B','C','I','H','L','K'),
  (90,'E','J','B','C','I','G','L','K'),
  (91,'E','J','B','C','H','G','L','K'),
  (92,'E','G','B','C','I','H','L','K'),
  (93,'E','J','B','C','H','G','L','I'),
  (94,'E','J','B','C','H','G','I','K'),
  (95,'E','J','B','C','I','F','L','K'),
  (96,'E','J','B','C','H','F','L','K'),
  (97,'E','I','B','C','H','F','L','K'),
  (98,'E','J','B','C','H','F','L','I'),
  (99,'E','J','B','C','H','F','I','K'),
  (100,'E','G','B','C','J','F','L','K'),
  (101,'E','G','B','C','I','F','L','K'),
  (102,'E','G','B','C','J','F','L','I'),
  (103,'E','G','B','C','J','F','I','K'),
  (104,'E','G','B','C','H','F','L','K'),
  (105,'H','G','B','C','J','F','L','E'),
  (106,'H','G','B','C','J','F','E','K'),
  (107,'E','G','B','C','H','F','L','I'),
  (108,'E','G','B','C','H','F','I','K'),
  (109,'H','G','B','C','J','F','E','I'),
  (110,'H','J','B','C','I','D','L','K'),
  (111,'I','G','B','C','J','D','L','K'),
  (112,'H','G','B','C','J','D','L','K'),
  (113,'H','G','B','C','I','D','L','K'),
  (114,'H','G','B','C','J','D','L','I'),
  (115,'H','G','B','C','J','D','I','K'),
  (116,'C','J','B','D','I','F','L','K'),
  (117,'C','J','B','D','H','F','L','K'),
  (118,'C','I','B','D','H','F','L','K'),
  (119,'C','J','B','D','H','F','L','I'),
  (120,'C','J','B','D','H','F','I','K'),
  (121,'C','G','B','D','J','F','L','K'),
  (122,'C','G','B','D','I','F','L','K'),
  (123,'C','G','B','D','J','F','L','I'),
  (124,'C','G','B','D','J','F','I','K'),
  (125,'C','G','B','D','H','F','L','K'),
  (126,'C','G','B','D','H','F','L','J'),
  (127,'H','G','B','C','J','F','D','K'),
  (128,'C','G','B','D','H','F','L','I'),
  (129,'C','G','B','D','H','F','I','K'),
  (130,'H','G','B','C','J','F','D','I'),
  (131,'E','J','B','C','I','D','L','K'),
  (132,'E','J','B','C','H','D','L','K'),
  (133,'E','I','B','C','H','D','L','K'),
  (134,'E','J','B','C','H','D','L','I'),
  (135,'E','J','B','C','H','D','I','K'),
  (136,'E','G','B','C','J','D','L','K'),
  (137,'E','G','B','C','I','D','L','K'),
  (138,'E','G','B','C','J','D','L','I'),
  (139,'E','G','B','C','J','D','I','K'),
  (140,'E','G','B','C','H','D','L','K'),
  (141,'H','G','B','C','J','D','L','E'),
  (142,'H','G','B','C','J','D','E','K'),
  (143,'E','G','B','C','H','D','L','I'),
  (144,'E','G','B','C','H','D','I','K'),
  (145,'H','G','B','C','J','D','E','I'),
  (146,'C','J','B','D','E','F','L','K'),
  (147,'C','E','B','D','I','F','L','K'),
  (148,'C','J','B','D','E','F','L','I'),
  (149,'C','J','B','D','E','F','I','K'),
  (150,'C','E','B','D','H','F','L','K'),
  (151,'C','J','B','D','H','F','L','E'),
  (152,'C','J','B','D','H','F','E','K'),
  (153,'C','E','B','D','H','F','L','I'),
  (154,'C','E','B','D','H','F','I','K'),
  (155,'C','J','B','D','H','F','E','I'),
  (156,'C','G','B','D','E','F','L','K'),
  (157,'C','G','B','D','J','F','L','E'),
  (158,'C','G','B','D','J','F','E','K'),
  (159,'C','G','B','D','E','F','L','I'),
  (160,'C','G','B','D','E','F','I','K'),
  (161,'C','G','B','D','J','F','E','I'),
  (162,'C','G','B','D','H','F','L','E'),
  (163,'C','G','B','D','H','F','E','K'),
  (164,'H','G','B','C','J','F','D','E'),
  (165,'C','G','B','D','H','F','E','I'),
  (166,'H','J','I','F','A','G','L','K'),
  (167,'E','J','I','A','H','G','L','K'),
  (168,'E','J','I','F','A','H','L','K'),
  (169,'E','J','I','F','A','G','L','K'),
  (170,'E','G','J','F','A','H','L','K'),
  (171,'E','G','I','F','A','H','L','K'),
  (172,'E','G','J','F','A','H','L','I'),
  (173,'E','G','J','F','A','H','I','K'),
  (174,'H','J','I','D','A','G','L','K'),
  (175,'H','J','I','D','A','F','L','K'),
  (176,'I','G','J','D','A','F','L','K'),
  (177,'H','G','J','D','A','F','L','K'),
  (178,'H','G','I','D','A','F','L','K'),
  (179,'H','G','J','D','A','F','L','I'),
  (180,'H','G','J','D','A','F','I','K'),
  (181,'E','J','I','D','A','H','L','K'),
  (182,'E','J','I','D','A','G','L','K'),
  (183,'E','G','J','D','A','H','L','K'),
  (184,'E','G','I','D','A','H','L','K'),
  (185,'E','G','J','D','A','H','L','I'),
  (186,'E','G','J','D','A','H','I','K'),
  (187,'E','J','I','D','A','F','L','K'),
  (188,'H','J','E','D','A','F','L','K'),
  (189,'H','E','I','D','A','F','L','K'),
  (190,'H','J','E','D','A','F','L','I'),
  (191,'H','J','E','D','A','F','I','K'),
  (192,'E','G','J','D','A','F','L','K'),
  (193,'E','G','I','D','A','F','L','K'),
  (194,'E','G','J','D','A','F','L','I'),
  (195,'E','G','J','D','A','F','I','K'),
  (196,'H','G','E','D','A','F','L','K'),
  (197,'H','G','J','D','A','F','L','E'),
  (198,'H','G','J','D','A','F','E','K'),
  (199,'H','G','E','D','A','F','L','I'),
  (200,'H','G','E','D','A','F','I','K'),
  (201,'H','G','J','D','A','F','E','I'),
  (202,'H','J','I','C','A','G','L','K'),
  (203,'H','J','I','C','A','F','L','K'),
  (204,'I','G','J','C','A','F','L','K'),
  (205,'H','G','J','C','A','F','L','K'),
  (206,'H','G','I','C','A','F','L','K'),
  (207,'H','G','J','C','A','F','L','I'),
  (208,'H','G','J','C','A','F','I','K'),
  (209,'E','J','I','C','A','H','L','K'),
  (210,'E','J','I','C','A','G','L','K'),
  (211,'E','G','J','C','A','H','L','K'),
  (212,'E','G','I','C','A','H','L','K'),
  (213,'E','G','J','C','A','H','L','I'),
  (214,'E','G','J','C','A','H','I','K'),
  (215,'E','J','I','C','A','F','L','K'),
  (216,'H','J','E','C','A','F','L','K'),
  (217,'H','E','I','C','A','F','L','K'),
  (218,'H','J','E','C','A','F','L','I'),
  (219,'H','J','E','C','A','F','I','K'),
  (220,'E','G','J','C','A','F','L','K'),
  (221,'E','G','I','C','A','F','L','K'),
  (222,'E','G','J','C','A','F','L','I'),
  (223,'E','G','J','C','A','F','I','K'),
  (224,'H','G','E','C','A','F','L','K'),
  (225,'H','G','J','C','A','F','L','E'),
  (226,'H','G','J','C','A','F','E','K'),
  (227,'H','G','E','C','A','F','L','I'),
  (228,'H','G','E','C','A','F','I','K'),
  (229,'H','G','J','C','A','F','E','I'),
  (230,'H','J','I','C','A','D','L','K'),
  (231,'I','G','J','C','A','D','L','K'),
  (232,'H','G','J','C','A','D','L','K'),
  (233,'H','G','I','C','A','D','L','K'),
  (234,'H','G','J','C','A','D','L','I'),
  (235,'H','G','J','C','A','D','I','K'),
  (236,'C','J','I','D','A','F','L','K'),
  (237,'H','J','F','C','A','D','L','K'),
  (238,'H','F','I','C','A','D','L','K'),
  (239,'H','J','F','C','A','D','L','I'),
  (240,'H','J','F','C','A','D','I','K'),
  (241,'C','G','J','D','A','F','L','K'),
  (242,'C','G','I','D','A','F','L','K'),
  (243,'C','G','J','D','A','F','L','I'),
  (244,'C','G','J','D','A','F','I','K'),
  (245,'H','G','F','C','A','D','L','K'),
  (246,'C','G','J','D','A','F','L','H'),
  (247,'H','G','J','C','A','F','D','K'),
  (248,'H','G','F','C','A','D','L','I'),
  (249,'H','G','F','C','A','D','I','K'),
  (250,'H','G','J','C','A','F','D','I'),
  (251,'E','J','I','C','A','D','L','K'),
  (252,'H','J','E','C','A','D','L','K'),
  (253,'H','E','I','C','A','D','L','K'),
  (254,'H','J','E','C','A','D','L','I'),
  (255,'H','J','E','C','A','D','I','K'),
  (256,'E','G','J','C','A','D','L','K'),
  (257,'E','G','I','C','A','D','L','K'),
  (258,'E','G','J','C','A','D','L','I'),
  (259,'E','G','J','C','A','D','I','K'),
  (260,'H','G','E','C','A','D','L','K'),
  (261,'H','G','J','C','A','D','L','E'),
  (262,'H','G','J','C','A','D','E','K'),
  (263,'H','G','E','C','A','D','L','I'),
  (264,'H','G','E','C','A','D','I','K'),
  (265,'H','G','J','C','A','D','E','I'),
  (266,'C','J','E','D','A','F','L','K'),
  (267,'C','E','I','D','A','F','L','K'),
  (268,'C','J','E','D','A','F','L','I'),
  (269,'C','J','E','D','A','F','I','K'),
  (270,'H','E','F','C','A','D','L','K'),
  (271,'H','J','F','C','A','D','L','E'),
  (272,'H','J','E','C','A','F','D','K'),
  (273,'H','E','F','C','A','D','L','I'),
  (274,'H','E','F','C','A','D','I','K'),
  (275,'H','J','E','C','A','F','D','I'),
  (276,'C','G','E','D','A','F','L','K'),
  (277,'C','G','J','D','A','F','L','E'),
  (278,'C','G','J','D','A','F','E','K'),
  (279,'C','G','E','D','A','F','L','I'),
  (280,'C','G','E','D','A','F','I','K'),
  (281,'C','G','J','D','A','F','E','I'),
  (282,'H','G','F','C','A','D','L','E'),
  (283,'H','G','E','C','A','F','D','K'),
  (284,'H','G','J','C','A','F','D','E'),
  (285,'H','G','E','C','A','F','D','I'),
  (286,'H','J','B','A','I','G','L','K'),
  (287,'H','J','B','A','I','F','L','K'),
  (288,'I','J','B','F','A','G','L','K'),
  (289,'H','J','B','F','A','G','L','K'),
  (290,'H','G','B','A','I','F','L','K'),
  (291,'H','J','B','F','A','G','L','I'),
  (292,'H','J','B','F','A','G','I','K'),
  (293,'E','J','B','A','I','H','L','K'),
  (294,'E','J','B','A','I','G','L','K'),
  (295,'E','J','B','A','H','G','L','K'),
  (296,'E','G','B','A','I','H','L','K'),
  (297,'E','J','B','A','H','G','L','I'),
  (298,'E','J','B','A','H','G','I','K'),
  (299,'E','J','B','A','I','F','L','K'),
  (300,'E','J','B','F','A','H','L','K'),
  (301,'E','I','B','F','A','H','L','K'),
  (302,'E','J','B','F','A','H','L','I'),
  (303,'E','J','B','F','A','H','I','K'),
  (304,'E','J','B','F','A','G','L','K'),
  (305,'E','G','B','A','I','F','L','K'),
  (306,'E','J','B','F','A','G','L','I'),
  (307,'E','J','B','F','A','G','I','K'),
  (308,'E','G','B','F','A','H','L','K'),
  (309,'H','J','B','F','A','G','L','E'),
  (310,'H','J','B','F','A','G','E','K'),
  (311,'E','G','B','F','A','H','L','I'),
  (312,'E','G','B','F','A','H','I','K'),
  (313,'H','J','B','F','A','G','E','I'),
  (314,'I','J','B','D','A','H','L','K'),
  (315,'I','J','B','D','A','G','L','K'),
  (316,'H','J','B','D','A','G','L','K'),
  (317,'I','G','B','D','A','H','L','K'),
  (318,'H','J','B','D','A','G','L','I'),
  (319,'H','J','B','D','A','G','I','K'),
  (320,'I','J','B','D','A','F','L','K'),
  (321,'H','J','B','D','A','F','L','K'),
  (322,'H','I','B','D','A','F','L','K'),
  (323,'H','J','B','D','A','F','L','I'),
  (324,'H','J','B','D','A','F','I','K'),
  (325,'F','J','B','D','A','G','L','K'),
  (326,'I','G','B','D','A','F','L','K'),
  (327,'F','J','B','D','A','G','L','I'),
  (328,'F','J','B','D','A','G','I','K'),
  (329,'H','G','B','D','A','F','L','K'),
  (330,'H','G','B','D','A','F','L','J'),
  (331,'H','G','B','D','A','F','J','K'),
  (332,'H','G','B','D','A','F','L','I'),
  (333,'H','G','B','D','A','F','I','K'),
  (334,'H','G','B','D','A','F','I','J'),
  (335,'E','J','B','A','I','D','L','K'),
  (336,'E','J','B','D','A','H','L','K'),
  (337,'E','I','B','D','A','H','L','K'),
  (338,'E','J','B','D','A','H','L','I'),
  (339,'E','J','B','D','A','H','I','K'),
  (340,'E','J','B','D','A','G','L','K'),
  (341,'E','G','B','A','I','D','L','K'),
  (342,'E','J','B','D','A','G','L','I'),
  (343,'E','J','B','D','A','G','I','K'),
  (344,'E','G','B','D','A','H','L','K'),
  (345,'H','J','B','D','A','G','L','E'),
  (346,'H','J','B','D','A','G','E','K'),
  (347,'E','G','B','D','A','H','L','I'),
  (348,'E','G','B','D','A','H','I','K'),
  (349,'H','J','B','D','A','G','E','I'),
  (350,'E','J','B','D','A','F','L','K'),
  (351,'E','I','B','D','A','F','L','K'),
  (352,'E','J','B','D','A','F','L','I'),
  (353,'E','J','B','D','A','F','I','K'),
  (354,'H','E','B','D','A','F','L','K'),
  (355,'H','J','B','D','A','F','L','E'),
  (356,'H','J','B','D','A','F','E','K'),
  (357,'H','E','B','D','A','F','L','I'),
  (358,'H','E','B','D','A','F','I','K'),
  (359,'H','J','B','D','A','F','E','I'),
  (360,'E','G','B','D','A','F','L','K'),
  (361,'E','G','B','D','A','F','L','J'),
  (362,'E','G','B','D','A','F','J','K'),
  (363,'E','G','B','D','A','F','L','I'),
  (364,'E','G','B','D','A','F','I','K'),
  (365,'E','G','B','D','A','F','I','J'),
  (366,'H','G','B','D','A','F','L','E'),
  (367,'H','G','B','D','A','F','E','K'),
  (368,'H','G','B','D','A','F','E','J'),
  (369,'H','G','B','D','A','F','E','I'),
  (370,'I','J','B','C','A','H','L','K'),
  (371,'I','J','B','C','A','G','L','K'),
  (372,'H','J','B','C','A','G','L','K'),
  (373,'I','G','B','C','A','H','L','K'),
  (374,'H','J','B','C','A','G','L','I'),
  (375,'H','J','B','C','A','G','I','K'),
  (376,'I','J','B','C','A','F','L','K'),
  (377,'H','J','B','C','A','F','L','K'),
  (378,'H','I','B','C','A','F','L','K'),
  (379,'H','J','B','C','A','F','L','I'),
  (380,'H','J','B','C','A','F','I','K'),
  (381,'C','J','B','F','A','G','L','K'),
  (382,'I','G','B','C','A','F','L','K'),
  (383,'C','J','B','F','A','G','L','I'),
  (384,'C','J','B','F','A','G','I','K'),
  (385,'H','G','B','C','A','F','L','K'),
  (386,'H','G','B','C','A','F','L','J'),
  (387,'H','G','B','C','A','F','J','K'),
  (388,'H','G','B','C','A','F','L','I'),
  (389,'H','G','B','C','A','F','I','K'),
  (390,'H','G','B','C','A','F','I','J'),
  (391,'E','J','B','A','I','C','L','K'),
  (392,'E','J','B','C','A','H','L','K'),
  (393,'E','I','B','C','A','H','L','K'),
  (394,'E','J','B','C','A','H','L','I'),
  (395,'E','J','B','C','A','H','I','K'),
  (396,'E','J','B','C','A','G','L','K'),
  (397,'E','G','B','A','I','C','L','K'),
  (398,'E','J','B','C','A','G','L','I'),
  (399,'E','J','B','C','A','G','I','K'),
  (400,'E','G','B','C','A','H','L','K'),
  (401,'H','J','B','C','A','G','L','E'),
  (402,'H','J','B','C','A','G','E','K'),
  (403,'E','G','B','C','A','H','L','I'),
  (404,'E','G','B','C','A','H','I','K'),
  (405,'H','J','B','C','A','G','E','I'),
  (406,'E','J','B','C','A','F','L','K'),
  (407,'E','I','B','C','A','F','L','K'),
  (408,'E','J','B','C','A','F','L','I'),
  (409,'E','J','B','C','A','F','I','K'),
  (410,'H','E','B','C','A','F','L','K'),
  (411,'H','J','B','C','A','F','L','E'),
  (412,'H','J','B','C','A','F','E','K'),
  (413,'H','E','B','C','A','F','L','I'),
  (414,'H','E','B','C','A','F','I','K'),
  (415,'H','J','B','C','A','F','E','I'),
  (416,'E','G','B','C','A','F','L','K'),
  (417,'E','G','B','C','A','F','L','J'),
  (418,'E','G','B','C','A','F','J','K'),
  (419,'E','G','B','C','A','F','L','I'),
  (420,'E','G','B','C','A','F','I','K'),
  (421,'E','G','B','C','A','F','I','J'),
  (422,'H','G','B','C','A','F','L','E'),
  (423,'H','G','B','C','A','F','E','K'),
  (424,'H','G','B','C','A','F','E','J'),
  (425,'H','G','B','C','A','F','E','I'),
  (426,'I','J','B','C','A','D','L','K'),
  (427,'H','J','B','C','A','D','L','K'),
  (428,'H','I','B','C','A','D','L','K'),
  (429,'H','J','B','C','A','D','L','I'),
  (430,'H','J','B','C','A','D','I','K'),
  (431,'C','J','B','D','A','G','L','K'),
  (432,'I','G','B','C','A','D','L','K'),
  (433,'C','J','B','D','A','G','L','I'),
  (434,'C','J','B','D','A','G','I','K'),
  (435,'H','G','B','C','A','D','L','K'),
  (436,'H','G','B','C','A','D','L','J'),
  (437,'H','G','B','C','A','D','J','K'),
  (438,'H','G','B','C','A','D','L','I'),
  (439,'H','G','B','C','A','D','I','K'),
  (440,'H','G','B','C','A','D','I','J'),
  (441,'C','J','B','D','A','F','L','K'),
  (442,'C','I','B','D','A','F','L','K'),
  (443,'C','J','B','D','A','F','L','I'),
  (444,'C','J','B','D','A','F','I','K'),
  (445,'H','F','B','C','A','D','L','K'),
  (446,'C','J','B','D','A','F','L','H'),
  (447,'H','J','B','C','A','F','D','K'),
  (448,'H','F','B','C','A','D','L','I'),
  (449,'H','F','B','C','A','D','I','K'),
  (450,'H','J','B','C','A','F','D','I'),
  (451,'C','G','B','D','A','F','L','K'),
  (452,'C','G','B','D','A','F','L','J'),
  (453,'C','G','B','D','A','F','J','K'),
  (454,'C','G','B','D','A','F','L','I'),
  (455,'C','G','B','D','A','F','I','K'),
  (456,'C','G','B','D','A','F','I','J'),
  (457,'C','G','B','D','A','F','L','H'),
  (458,'H','G','B','C','A','F','D','K'),
  (459,'H','G','B','C','A','F','D','J'),
  (460,'H','G','B','C','A','F','D','I'),
  (461,'E','J','B','C','A','D','L','K'),
  (462,'E','I','B','C','A','D','L','K'),
  (463,'E','J','B','C','A','D','L','I'),
  (464,'E','J','B','C','A','D','I','K'),
  (465,'H','E','B','C','A','D','L','K'),
  (466,'H','J','B','C','A','D','L','E'),
  (467,'H','J','B','C','A','D','E','K'),
  (468,'H','E','B','C','A','D','L','I'),
  (469,'H','E','B','C','A','D','I','K'),
  (470,'H','J','B','C','A','D','E','I'),
  (471,'E','G','B','C','A','D','L','K'),
  (472,'E','G','B','C','A','D','L','J'),
  (473,'E','G','B','C','A','D','J','K'),
  (474,'E','G','B','C','A','D','L','I'),
  (475,'E','G','B','C','A','D','I','K'),
  (476,'E','G','B','C','A','D','I','J'),
  (477,'H','G','B','C','A','D','L','E'),
  (478,'H','G','B','C','A','D','E','K'),
  (479,'H','G','B','C','A','D','E','J'),
  (480,'H','G','B','C','A','D','E','I'),
  (481,'C','E','B','D','A','F','L','K'),
  (482,'C','J','B','D','A','F','L','E'),
  (483,'C','J','B','D','A','F','E','K'),
  (484,'C','E','B','D','A','F','L','I'),
  (485,'C','E','B','D','A','F','I','K'),
  (486,'C','J','B','D','A','F','E','I'),
  (487,'H','F','B','C','A','D','L','E'),
  (488,'H','E','B','C','A','F','D','K'),
  (489,'H','J','B','C','A','F','D','E'),
  (490,'H','E','B','C','A','F','D','I'),
  (491,'C','G','B','D','A','F','L','E'),
  (492,'C','G','B','D','A','F','E','K'),
  (493,'C','G','B','D','A','F','E','J'),
  (494,'C','G','B','D','A','F','E','I'),
  (495,'H','G','B','C','A','F','D','E');
$$;

revoke all on function public.official_world_cup_2026_best_third_matrix() from public, anon, authenticated;

create or replace function public.populate_world_cup_2026_best_third_matrix(p_format_version_id uuid)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if p_format_version_id <> '00000000-0000-4000-8000-000000000531'::uuid
     or not exists (select 1 from public.format_template_versions where id = p_format_version_id and competition_edition_id = '00000000-0000-4000-8000-000000000521'::uuid) then
    return;
  end if;

insert into public.format_template_best_third_combinations (
  id, edition_id, format_template_version_id, option_number, combination_key, qualified_group_codes
)
select
  public.predicte_catalog_uuid('00000000-0000-4000-8000-000000000531:best-third:' || option_number),
  '00000000-0000-4000-8000-000000000521'::uuid,
  '00000000-0000-4000-8000-000000000531'::uuid,
  option_number,
  (select string_agg(code, '' order by code) from unnest(array[one_a,one_b,one_d,one_e,one_g,one_i,one_k,one_l]) code),
  (select array_agg(code order by code) from unnest(array[one_a,one_b,one_d,one_e,one_g,one_i,one_k,one_l]) code)
from public.official_world_cup_2026_best_third_matrix()
on conflict (format_template_version_id, option_number) do update set
  combination_key = excluded.combination_key,
  qualified_group_codes = excluded.qualified_group_codes;

insert into public.format_template_best_third_assignments (
  id, format_template_version_id, combination_id, target_node_id, target_side,
  winner_group_code, third_place_group_code
)
select
  public.predicte_catalog_uuid('00000000-0000-4000-8000-000000000531:best-third:' || matrix.option_number || ':' || assignment.winner_group_code),
  '00000000-0000-4000-8000-000000000531'::uuid,
  public.predicte_catalog_uuid('00000000-0000-4000-8000-000000000531:best-third:' || matrix.option_number),
  public.predicte_catalog_uuid('00000000-0000-4000-8000-000000000531:node:' || assignment.node_key),
  'away', assignment.winner_group_code, assignment.third_place_group_code
from public.official_world_cup_2026_best_third_matrix() matrix
cross join lateral (values
  ('A','M79',matrix.one_a),('B','M85',matrix.one_b),('D','M81',matrix.one_d),('E','M74',matrix.one_e),
  ('G','M82',matrix.one_g),('I','M77',matrix.one_i),('K','M87',matrix.one_k),('L','M80',matrix.one_l)
) assignment(winner_group_code,node_key,third_place_group_code)
on conflict (combination_id, winner_group_code) do update set
  target_node_id = excluded.target_node_id,
  target_side = excluded.target_side,
  third_place_group_code = excluded.third_place_group_code;
end;
$$;

revoke all on function public.populate_world_cup_2026_best_third_matrix(uuid) from public, anon, authenticated;

select public.populate_world_cup_2026_best_third_matrix('00000000-0000-4000-8000-000000000531'::uuid);
select public.populate_supported_bracket_destination_catalog('00000000-0000-4000-8000-000000000531'::uuid)
where exists (
  select 1 from public.format_template_versions
  where id = '00000000-0000-4000-8000-000000000531'::uuid
);
