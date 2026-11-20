begin;

with db as (select id from metabase_database where engine = 'postgres' and details::jsonb->>'dbname' = 'bi'),
t(name, label, descr, hide) as (values
  ('events_real', '이벤트', 'GA4 이벤트 1건 = 1행. 테스트 기기(localhost·페르소나) 제외. 매일 13시 갱신, 하루 늦음', false),
  ('devices_real', '기기', '기기 1대 = 1행. 첫 방문·유입·실험 무리·첫날 도달·재방문. 테스트 기기 제외', false),
  ('event_dict', '이벤트 사전', '이벤트 이름의 한국어 이름·영역·설명', false),
  ('events', '이벤트(테스트 포함 원본)', null, true),
  ('devices', '기기(테스트 포함 원본)', null, true),
  ('sync_log', '동기화 기록', null, true))
update metabase_table mt
   set display_name = t.label, description = t.descr, visibility_type = case when t.hide then 'hidden' end
  from t, db
 where mt.db_id = db.id and mt.name = t.name;

with db as (select id from metabase_database where engine = 'postgres' and details::jsonb->>'dbname' = 'bi'),
f(tbl, name, label, descr, vis, sem) as (values
  ('events_real', 'ga_day', 'GA 내보내기 날짜', 'GA4 일일 표 기준 날짜(동기화 단위)', 'details-only', null),
  ('events_real', 'day', '날짜', '한국 시간 기준 날짜', null, null),
  ('events_real', 'ts', '시각', null, null, null),
  ('events_real', 'device', '기기', 'GA4 기기 ID(user_pseudo_id)', null, 'type/FK'),
  ('events_real', 'user_id', '계정 ID', '로그인한 경우 Supabase 계정 ID', 'details-only', null),
  ('events_real', 'event', '이벤트', '이벤트 이름. 뜻은 이벤트 사전 참고', null, 'type/Category'),
  ('events_real', 'session_id', '세션', 'GA4 세션 ID', 'details-only', null),
  ('events_real', 'host', '접속 도메인', 'calmforest.cloud·토스·itch 등', null, 'type/Category'),
  ('events_real', 'country', '국가', null, null, 'type/Country'),
  ('events_real', 'os', 'OS', null, null, 'type/Category'),
  ('events_real', 'device_cat', '기기 종류', 'mobile·desktop·tablet', null, 'type/Category'),
  ('events_real', 'platform', '플랫폼', 'web·android·ios·toss·itch', null, 'type/Category'),
  ('events_real', 'stage', '단계(stage)', '집 짓기 단계 등 이벤트마다 뜻이 다름', null, 'type/Category'),
  ('events_real', 'result', '결과(result)', null, null, 'type/Category'),
  ('events_real', 'kind', '종류(kind)', null, null, 'type/Category'),
  ('events_real', 'item', '아이템(item)', null, null, 'type/Category'),
  ('events_real', 'reason', '이유(reason)', null, null, 'type/Category'),
  ('events_real', 'arm', '실험 무리(arm)', '이벤트에 실린 실험 무리 값', null, 'type/Category'),
  ('events_real', 'step', '단계(step)', '이름 화면 view·type·done·leave 등', null, 'type/Category'),
  ('events_real', 'slot', '광고 자리(slot)', null, null, 'type/Category'),
  ('events_real', 'via', '경로(via)', null, null, 'type/Category'),
  ('events_real', 'src', '출처(src)', null, null, 'type/Category'),
  ('events_real', 'npc', 'NPC', null, null, 'type/Category'),
  ('events_real', 'mode', '모드(mode)', null, null, 'type/Category'),
  ('events_real', 'quest_id', '의뢰 ID', null, null, 'type/Category'),
  ('events_real', 'params', '파라미터 전체', '모든 이벤트 파라미터(JSON)', null, null),
  ('events_real', 'uprops', '사용자 속성 전체', '이벤트 시점의 사용자 속성(JSON)', 'details-only', null),
  ('events_real', 'is_test', '테스트 기기', null, 'sensitive', null),
  ('devices_real', 'device', '기기', 'GA4 기기 ID', null, 'type/PK'),
  ('devices_real', 'first_day', '첫 방문일', '한국 시간 기준', null, null),
  ('devices_real', 'first_platform', '첫 플랫폼', null, null, 'type/Category'),
  ('devices_real', 'first_host', '첫 접속 도메인', null, null, 'type/Category'),
  ('devices_real', 'country', '국가', '첫 이벤트 기준', null, 'type/Country'),
  ('devices_real', 'os', 'OS', null, null, 'type/Category'),
  ('devices_real', 'device_cat', '기기 종류', null, null, 'type/Category'),
  ('devices_real', 'utm_source', '유입 소스(utm)', '첫 페이지 주소의 utm_source', null, 'type/Category'),
  ('devices_real', 'utm_campaign', '유입 캠페인(utm)', null, null, 'type/Category'),
  ('devices_real', 'utm_content', '광고 소재(utm)', null, null, 'type/Category'),
  ('devices_real', 'exp_login', 'E5 로그인 화면 무리', 'guest_first·control', null, 'type/Category'),
  ('devices_real', 'exp_guide', 'E6 안내 개편 무리', 'new·old', null, 'type/Category'),
  ('devices_real', 'exp_name', 'E7 이름 미리 채움 무리', 'prefill·control', null, 'type/Category'),
  ('devices_real', 'exp_space', 'E3 공간 연결 무리', null, null, 'type/Category'),
  ('devices_real', 'exp_arm', 'E1 등 배정(exp_arm)', null, null, 'type/Category'),
  ('devices_real', 'install_source', '설치 경로', '앱 설치 귀속(Install Referrer)', null, 'type/Category'),
  ('devices_real', 'install_campaign', '설치 캠페인', null, null, 'type/Category'),
  ('devices_real', 'heard_from', '알게 된 곳(설문)', '첫 실행 설문 답', null, 'type/Category'),
  ('devices_real', 'day0_login_screen', '첫날 로그인 화면 봄', null, null, 'type/Category'),
  ('devices_real', 'day0_login', '첫날 로그인', null, null, 'type/Category'),
  ('devices_real', 'day0_name_screen', '첫날 이름 화면 봄', null, null, 'type/Category'),
  ('devices_real', 'day0_character', '첫날 캐릭터 선택', null, null, 'type/Category'),
  ('devices_real', 'day0_first_action', '첫날 첫 행동', '나무 베기·씨앗 심기·수확 중 하나', null, 'type/Category'),
  ('devices_real', 'day0_harvest', '첫날 첫 수확', null, null, 'type/Category'),
  ('devices_real', 'day0_house1', '첫날 집 기초 완공', 'house_build stage ≥ 1', null, 'type/Category'),
  ('devices_real', 'day0_house3', '첫날 집 지붕까지', 'house_build stage ≥ 3', null, 'type/Category'),
  ('devices_real', 'd1', 'D1 재방문', '첫 방문 다음 날 접속', null, 'type/Category'),
  ('devices_real', 'd7', 'D7 재방문', '첫 방문 7일째 접속', null, 'type/Category'),
  ('devices_real', 'w1', '7일 안 재방문', '첫 방문 뒤 1~7일 중 한 번이라도 접속', null, 'type/Category'),
  ('devices_real', 'last_day', '마지막 방문일', null, null, null),
  ('devices_real', 'active_days', '방문한 날 수', null, null, 'type/Quantity'),
  ('devices_real', 'events', '이벤트 수', null, null, 'type/Quantity'),
  ('devices_real', 'is_test', '테스트 기기', null, 'sensitive', null),
  ('event_dict', 'event', '이벤트', null, null, 'type/PK'),
  ('event_dict', 'label', '한국어 이름', null, null, 'type/Name'),
  ('event_dict', 'area', '영역', null, null, 'type/Category'),
  ('event_dict', 'description', '설명', null, null, 'type/Description'),
  ('event_dict', 'hidden', '숨김', '디버그·안 쓰는 이벤트', null, 'type/Category'))
update metabase_field mf
   set display_name = f.label, description = f.descr,
       visibility_type = coalesce(f.vis, 'normal'),
       semantic_type = coalesce(f.sem, mf.semantic_type)
  from f, metabase_table mt, db
 where mf.table_id = mt.id and mt.db_id = db.id and mt.name = f.tbl and mf.name = f.name and mf.parent_id is null;

commit;

begin;

with t as (select id from metabase_table where db_id = (select id from metabase_database where engine = 'postgres' and details::jsonb->>'dbname' = 'bi')),
fid(tbl, col, id) as (
  select mt.name, mf.name, mf.id from metabase_field mf join metabase_table mt on mt.id = mf.table_id
   where mt.id in (select id from t) and mf.parent_id is null)
update metabase_field mf
   set semantic_type = 'type/FK',
       fk_target_field_id = case mf.name when 'event' then (select id from fid where tbl = 'event_dict' and col = 'event')
                                         when 'device' then (select id from fid where tbl = 'devices_real' and col = 'device') end
 where mf.id in (select id from fid where tbl = 'events_real' and col in ('event', 'device'));

insert into dimension (field_id, name, type, human_readable_field_id, created_at, updated_at, entity_id)
select ev.id, '이벤트', 'external', lb.id, now(), now(), substr(md5(random()::text) || md5(random()::text), 1, 21)
  from metabase_field ev join metabase_table et on et.id = ev.table_id and et.name = 'events_real' and ev.name = 'event' and ev.parent_id is null
  join metabase_table dt on dt.db_id = et.db_id and dt.name = 'event_dict'
  join metabase_field lb on lb.table_id = dt.id and lb.name = 'label'
 where not exists (select 1 from dimension d where d.field_id = ev.id);

commit;
