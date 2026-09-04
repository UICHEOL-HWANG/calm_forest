-- =============================================================
--  calm forest · 태블로 퍼블릭 대시보드용 집계 export
--  ------------------------------------------------------------
--  ★ 원칙 — 태블로 퍼블릭은 원본 데이터까지 공개·다운로드 가능합니다.
--    개인 식별자는 SELECT 목록에 절대 넣지 않습니다.
--      금지: client_id, user_id, session_id, feedback.message, 좌표 원본 행
--      허용: 집계된 수치, 격자화된 좌표, 카테고리 라벨
--
--  ★ 사람 단위 키
--      BigQuery(GA4) → user_pseudo_id   (user_id 는 익명 auth uid 라 세션마다
--                                        재발급 → 237기기가 604개로 쪼개짐. 쓰지 말 것)
--      Supabase      → client_id        (localStorage 영구 기기 식별자)
--    둘 다 "기기(브라우저) 기준"이며 사람 수의 상한입니다. 대시보드 라벨에 명시.
--
--  ★ 산출물: 아래 `-- @tab:` 마커가 붙은 쿼리 9개 = 구글 시트 탭 9장.
--    Airflow DAG(infra/airflow/dags/tableau_sheets.py)가 이 파일을 그대로 읽어
--    마커별로 쪼갠 뒤 BigQuery 에서 돌려 시트에 덮어씁니다.
--    ⇒ 이 파일이 유일한 원본입니다. DAG 안에 SQL 을 복사해 두지 않았습니다.
--    마커 규약: `-- @tab: <시트탭이름>` 다음 줄부터 세미콜론까지가 한 쿼리.
--    마커 없는 쿼리는 사람이 콘솔에 붙여넣는 용도(자동화 대상 아님).
--
--  ★ 갱신 경로: Supabase --(GH Actions 03:00 KST)--> BigQuery
--                --(Airflow 04:00 KST)--> 구글 시트 --(24h 자동)--> 태블로 퍼블릭
--    태블로 퍼블릭은 구글 시트 연결만 자동 갱신합니다(CSV/엑셀은 불가).
--
--  ※ 이 파일은 코드가 import 하지 않습니다. sql/ 의 다른 파일과 같은 규약으로,
--    사람이 콘솔에 붙여넣어 실행하는 쿼리 팩입니다.
--    탐색용은 analytics_queries.sql(Supabase) · bigquery_queries.sql(GA4),
--    이 파일은 "공개 대시보드로 내보낼 것"만 담습니다.
-- =============================================================


-- #############################################################
--  A 파트 · BigQuery (GA4 export)
--    실행: BigQuery 콘솔 → 쿼리 편집기 → 결과 저장 > CSV 다운로드
--    ✅ 2026-09-02 전량 실행 검증 완료
-- #############################################################

-- ─────────────────────────────────────────────────────────────
-- A1. t1_daily_activity — 일별 활동(신규/재방문 분리)
--     쓰임: 활동 추이 라인차트, 신규·재방문 스택
-- ─────────────────────────────────────────────────────────────
-- @tab: t1_daily_activity
with ev as (
  select
    user_pseudo_id,
    parse_date('%Y%m%d', event_date) as d,
    (select value.int_value from unnest(event_params) where key = 'ga_session_id') as sid
  from `calm-forest.analytics_547127440.events_*`
),
firsts as (select user_pseudo_id, min(d) as first_d from ev group by 1)
select
  e.d                                                                    as date,
  count(distinct e.user_pseudo_id)                                       as devices,
  count(distinct if(e.d = f.first_d, e.user_pseudo_id, null))            as new_devices,
  count(distinct if(e.d > f.first_d, e.user_pseudo_id, null))            as returning_devices,
  count(distinct concat(e.user_pseudo_id, '-', cast(e.sid as string)))   as sessions,
  count(*)                                                               as events
from ev e
join firsts f using (user_pseudo_id)
group by 1
order by 1;


-- ─────────────────────────────────────────────────────────────
-- A2. t2_event_frequency — 행동별 빈도·도달률
--     쓰임: 가로 막대(빈도 랭킹). 자동 수집 이벤트는 제외 — 게임 행동만.
-- ─────────────────────────────────────────────────────────────
-- @tab: t2_event_frequency
select
  event_name,
  count(*)                                            as events,
  count(distinct user_pseudo_id)                      as devices,
  round(count(*) / count(distinct user_pseudo_id), 1) as per_device
from `calm-forest.analytics_547127440.events_*`
where event_name not in (
  'page_view', 'session_start', 'first_visit', 'scroll',
  'user_engagement', 'session_time', 'session_summary'
)
group by 1
having count(distinct user_pseudo_id) >= 3   -- 1~2기기짜리 꼬리는 노이즈 + 소규모 셀
order by events desc;


-- ─────────────────────────────────────────────────────────────
-- A3. t3_tutorial_funnel — 튜토리얼 스텝별 도달
--     쓰임: 퍼널(스텝 오름차순). 이 대시보드에서 가장 이야기가 분명한 차트.
--     ※ step 하나에 key 가 둘 이상 붙는 경우가 있어(개편 전후 혼재)
--        key 기준(2026-09-05 sell 단계 이동으로 번호가 바뀌어 key 로 전환)으로 합칩니다.
-- ─────────────────────────────────────────────────────────────
-- @tab: t3_tutorial_funnel
with s as (
  select
    (select value.string_value from unnest(event_params) where key = 'key')  as step_key,
    user_pseudo_id
  from `calm-forest.analytics_547127440.events_*`
  where event_name = 'tutorial_step'
)
select
  case step_key
    when 'move' then 1 when 'toolpage' then 2 when 'chop' then 3 when 'sell' then 4
    when 'till' then 5 when 'seed' then 6 when 'water' then 7 when 'harvest' then 8
    when 'market' then 9 when 'quest' then 10 when 'talk' then 10 when 'mine' then 11
    when 'carve' then 12 when 'dex' then 13 when 'fish' then 14 when 'build' then 15
    when 'enter' then 16 when 'decor' then 17 else 99 end as ord,   -- 2026-09-05 순서(개편 전후 혼재해도 key 로 합침)
  step_key,
  count(distinct user_pseudo_id) as devices,
  count(*)                       as events
from s
where step_key is not null
group by ord, step_key
order by ord, step_key;


-- ─────────────────────────────────────────────────────────────
-- A4. t4_economy_flow — 코인 유입/유출 (출처별 · 일별)
--     쓰임: 유입 출처 구성 막대. ⚠️ 아래 "관측" 주석 반드시 참고.
-- ─────────────────────────────────────────────────────────────
-- @tab: t4_economy_flow
with tx as (
  select
    parse_date('%Y%m%d', event_date) as d,
    user_pseudo_id,
    (select value.string_value from unnest(event_params) where key = 'source') as src,
    (select value.int_value    from unnest(event_params) where key = 'amount') as amt
  from `calm-forest.analytics_547127440.events_*`
  where event_name = 'econ_tx'
)
select
  d                                as date,
  src                              as source,
  count(*)                         as tx,
  count(distinct user_pseudo_id)   as devices,
  sum(greatest(amt, 0))            as inflow,
  -sum(least(amt, 0))              as outflow,
  sum(amt)                         as net
from tx
group by 1, 2
order by 1, 2;

--  ※ 2026-09-02 관측 — 전 기간 유출이 boat_upgrade 1건(-80코인)뿐입니다.
--    유입 6,694 / 유출 80. shop_buy 는 0건. 경제에 소비처(sink)가 사실상 없습니다.
--    대시보드에 유입/유출 대비 막대로 그리면 유출 막대가 보이지 않으니,
--    이 차트는 "유입 출처 구성"으로 프레이밍하고 유출은 주석으로 다루는 게 정직합니다.


-- ─────────────────────────────────────────────────────────────
-- A5. t5_move_heatmap — 캐릭터 체류 격자 (씬별)
--     쓰임: 씬별 소패널 히트맵(곰 갈색 단일 램프). 개인정보 위험 0.
--     격자 2단위 — 원본 좌표는 내보내지 않습니다.
--
--     ★ 왜 Supabase 가 아니라 BigQuery 인가 (2026-09-02 정정)
--       scripts/export_to_bq.py 가 적재 후 RETENTION_DAYS(7일) 지난 game_logs 를
--       Supabase 에서 지웁니다. 즉 Supabase 는 최근 7일 창(15,471행·120기기)만
--       갖고 있고, 전체 이력은 BigQuery 미러에 있습니다(77,425행·204기기).
--       Supabase 로 뽑으면 히트맵이 조용히 1/7 로 잘립니다.
--
--     ★ 씬 분리가 필수입니다. char_x/char_z 는 월드 좌표 한 벌인데, 게임은 공간마다
--       원점을 멀찍이 떨어뜨려 한 좌표계에 욱여넣습니다
--       (js/game.js: MINE(0,250)·CAFE(0,320)·KSET(0,420)·WSET(0,460)
--        ·CITY(0,480)·RIVER(0,-400)·SEA(400,0), 마을은 원점).
--       그대로 한 장에 그리면 x 0~401 · z -1025~483 캔버스에 마을이 점 하나로
--       뭉갭니다. 가장 가까운 원점으로 씬을 판정하고 씬 로컬 좌표로 되돌립니다.
-- ─────────────────────────────────────────────────────────────
-- @tab: t5_move_heatmap
with sp as (
  select * from unnest([
    struct('village' as scene, 0.0 as ox, 0.0 as oz), ('mine', 0, 250), ('cafe', 0, 320),
    ('kitchen', 0, 420), ('workshop', 0, 460), ('city', 0, 480), ('river', 0, -400), ('sea', 400, 0)
  ])
),
pt as (
  select
    g.client_id,
    s.scene,
    g.char_x - s.ox as lx,          -- 씬 로컬 좌표
    g.char_z - s.oz as lz
  from `calm-forest.calm_forest_raw.game_logs` g,
  unnest([(
    select as struct scene, ox, oz from sp
    order by pow(g.char_x - ox, 2) + pow(g.char_z - oz, 2)   -- 가장 가까운 공간 원점
    limit 1
  )]) s
  where g.char_x is not null and g.char_z is not null
    and not (g.char_x = 0 and g.char_z = 0)   -- 스폰 고정점 제외(아래 관측 참고)
)
select
  scene,
  round(lx / 2) * 2         as gx,
  round(lz / 2) * 2         as gz,
  count(*)                  as hits,
  count(distinct client_id) as devices
from pt
group by 1, 2, 3
having count(distinct client_id) >= 2   -- 1기기만 다녀간 칸 제외(개인 동선 추론 방지)
order by scene, hits desc;

--  ※ 2026-09-02 관측 (BigQuery 전체 이력 77,425행 / 204기기 / 07-27~09-01)
--    · 정확히 (0,0) 인 행은 스폰 고정점입니다. 빼지 않으면 마을 히트맵의 최댓값을
--      이 한 칸이 독점해 램프가 전부 죽습니다.
--    · 씬별 (칸수 → devices>=2 필터 후 / 보존 hits)
--        village 1,070 → 772칸 / 56,257   ← 히트맵의 주인공
--        river   1,161 → 673칸 /  6,342   ← 하류로 길게 흘러가는 동선
--        cafe       97 →  68칸 /  2,493
--        sea        19 →  14칸 /  2,322   ← 부두가 좁아 칸은 적고 체류는 김
--        mine      127 →  97칸 /  2,249
--        city        1 →   1칸 /  1,064   ← 좌표 고정. 히트맵 아님, "방문 수"로 쓸 것
--    · kitchen·workshop 은 행이 0입니다 — 클로즈업 무대라 캐릭터가 이동하지 않습니다.
--      대시보드 범례에서 빠지는 게 정상이며, 누락이 아닙니다.


-- ─────────────────────────────────────────────────────────────
-- A6. t6_activity_funnel — 활동별 도달률(무엇을 해봤나)
--     쓰임: 가로 막대(도달 기기 수). 튜토리얼 퍼널(A3)이 "안내를 따라갔나"라면
--           이건 "게임을 실제로 했나"입니다.
--
--     ★ 이건 엄밀한 의미의 퍼널이 아닙니다 — 단계가 서로를 강제하지 않습니다
--       (낚시를 안 해도 집을 지을 수 있음). step 은 게임 진행 순서일 뿐이고,
--       각 행은 "그 활동을 한 번이라도 한 기기 수"입니다. 대시보드 라벨에 명시하세요.
--       단계 강제가 있는 진짜 퍼널은 낚시(던지기→성공)와 농사(심기→물→수확)뿐입니다.
--
--     ⚠️ 아래 활동 매핑은 A7 과 **똑같이** 유지해야 합니다. 한쪽만 고치지 마세요.
--        (활동을 추가하면 A6 의 막대와 A7 의 종류 수가 어긋납니다)
-- ─────────────────────────────────────────────────────────────
-- @tab: t6_activity_funnel
with ev as (
  select user_pseudo_id, event_name from `calm-forest.analytics_547127440.events_*`
),
base as (select count(distinct user_pseudo_id) as n from ev),
m as (
  select * from unnest([
    struct(1 as ord, '캐릭터 선택' as activity, ['character_select'] as names),
    (2,  '벌목',        ['chop_tree', 'first_chop']),
    (3,  '씨앗 심기',   ['plant_seed']),
    (4,  '물주기',      ['water_crop']),
    (5,  '수확',        ['harvest_crop']),
    (6,  '낚시 던지기', ['fishing_cast']),
    (7,  '낚시 성공',   ['fishing_catch']),
    (8,  '채굴',        ['mine_ore']),
    (9,  '카페',        ['enter_cafe']),
    (10, '뱃놀이',      ['boat_start']),
    (11, '집 완성',     ['house_complete']),
    (12, '도감 발견',   ['dex_discover']),
    (13, '퀘스트 완료', ['quest_complete']),
    (14, '배지 획득',   ['badge_earn']),
    (15, '사진 촬영',   ['photo_capture'])
  ])
)
select
  m.ord                                 as step,
  m.activity                            as activity,
  count(distinct ev.user_pseudo_id)     as devices,
  round(100 * count(distinct ev.user_pseudo_id) / (select n from base), 1) as pct_of_all
from m
left join ev on ev.event_name in unnest(m.names)   -- left join: 0건 활동도 행을 남긴다
group by 1, 2
order by 1;

--  ※ 2026-09-02 관측 (전체 239기기 기준)
--    캐릭터 선택 72(30.1%) · 도감 발견 65(27.2%) · 벌목 47(19.7%) · 씨앗 심기 30(12.6%)
--    낚시 던지기 28 → 성공 26(93% 전환, 난이도 낮음) · 물주기 25 → 수확 23
--    집 완성 22 · 채굴 12 · 뱃놀이 12 · 사진 11
--    → 낚시·농사는 시작만 하면 거의 끝까지 갑니다. 문제는 시작 자체입니다.


-- ─────────────────────────────────────────────────────────────
-- A7. t7_activity_breadth — 기기당 경험한 활동 "종류 수" 분포
--     쓰임: 히스토그램. A6 가 "무엇을"이라면 이건 "얼마나 폭넓게"입니다.
--     유저 단위 질문을 개인 노출 없이 답하는 방법 — 원본 행이 아니라 분포만 나갑니다.
--
--     ⚠️ 활동 매핑은 A6 와 동일해야 합니다(위 경고 참고).
-- ─────────────────────────────────────────────────────────────
-- @tab: t7_activity_breadth
with ev as (
  select user_pseudo_id, event_name from `calm-forest.analytics_547127440.events_*`
),
m as (
  select * from unnest([
    struct('캐릭터 선택' as activity, ['character_select'] as names),
    ('벌목', ['chop_tree', 'first_chop']), ('씨앗 심기', ['plant_seed']),
    ('물주기', ['water_crop']), ('수확', ['harvest_crop']),
    ('낚시 던지기', ['fishing_cast']), ('낚시 성공', ['fishing_catch']),
    ('채굴', ['mine_ore']), ('카페', ['enter_cafe']), ('뱃놀이', ['boat_start']),
    ('집 완성', ['house_complete']), ('도감 발견', ['dex_discover']),
    ('퀘스트 완료', ['quest_complete']), ('배지 획득', ['badge_earn']),
    ('사진 촬영', ['photo_capture'])
  ])
),
per as (
  select ev.user_pseudo_id, count(distinct m.activity) as kinds
  from ev join m on ev.event_name in unnest(m.names)
  group by 1
),
base as (select count(distinct user_pseudo_id) as n from ev),
counted as (
  select kinds, count(*) as devices from per group by 1
  union all
  -- 활동을 하나도 안 한 기기 — per 에 아예 없으므로 따로 세어 0 종으로 넣는다.
  -- 이 행이 이 표에서 제일 큽니다. 빼면 그림이 완전히 달라지니 절대 지우지 마세요.
  select 0, (select n from base) - (select count(*) from per)
)
select
  kinds                                              as activity_kinds,
  devices,
  round(100 * devices / (select n from base), 1)     as pct_of_all
from counted
where devices > 0
order by kinds;

--  ※ 2026-09-02 관측 — **239기기 중 142대(59.4%)가 활동 0종**입니다.
--    게임을 열고 캐릭터조차 고르지 않고 떠납니다. 2종 27대 · 3종 20대로 급감하고,
--    10종 이상은 11대(4.6%)뿐. tutorial_skip 76기기(첫 화면 즉시 스킵)와 같은 이야기입니다.
--    → 대시보드의 핵심 메시지는 "퍼널 중간 이탈"이 아니라 "입구에서의 이탈"입니다.


-- ─────────────────────────────────────────────────────────────
-- A8. t8_dau_wau — 일별 활성 + 롤링 7일 활성
--     쓰임: 라인 차트. DAU만 보면 들쭉날쭉해서 추세가 안 보입니다.
--
--     ⚠️ WAU 는 t1 의 일별 devices 를 더해서 만들 수 없습니다.
--        순 사용자 수는 가산적이지 않습니다 — 월요일 10대·수요일 10대라도
--        주간 순 사용자는 20이 아닙니다(겹치는 기기). 반드시 창 안에서 distinct 를 다시 셉니다.
-- ─────────────────────────────────────────────────────────────
-- @tab: t8_dau_wau
with ev as (
  select user_pseudo_id, parse_date('%Y%m%d', event_date) as d
  from `calm-forest.analytics_547127440.events_*`
),
days as (select distinct d from ev),
firsts as (select user_pseudo_id, min(d) as first_d from ev group by 1)
select
  format_date('%Y-%m-%d', dd.d)                                              as date,
  count(distinct if(e.d = dd.d, e.user_pseudo_id, null))                     as dau,
  count(distinct e.user_pseudo_id)                                           as wau_7d,
  count(distinct if(e.d = dd.d and e.d = f.first_d, e.user_pseudo_id, null)) as new_devices,
  count(distinct if(e.d = dd.d and e.d > f.first_d, e.user_pseudo_id, null)) as returning_devices
from days dd
join ev e on e.d between date_sub(dd.d, interval 6 day) and dd.d
join firsts f using (user_pseudo_id)
group by 1
order by 1;

--  ※ 2026-09-02 관측 — WAU 는 8/21 최고 115 에서 9/1 30 으로 74% 감소.
--    8/15 유입 스파이크(신규 44)가 7일 창을 밀어올렸다가 그대로 빠집니다.
--    재방문은 전 기간 하루 1~5대로 거의 평평 — 유입은 있었고 잔류가 없었습니다.


-- ─────────────────────────────────────────────────────────────
-- A9. t9_last_activity — 기기별 "마지막으로 한 활동"
--     쓰임: 산키(흐름도). 어디까지 갔다가 떠났는지를 한 장으로 보여줍니다.
--
--     활동 매핑은 A6·A7 과 동일해야 합니다. 셋 중 하나만 고치면 숫자가 어긋납니다.
--     활동 이력이 아예 없는 기기는 '활동 없음' 으로 남깁니다 — 이 행이 제일 큽니다.
-- ─────────────────────────────────────────────────────────────
-- @tab: t9_last_activity
with ev as (
  select user_pseudo_id, event_name, event_timestamp
  from `calm-forest.analytics_547127440.events_*`
),
m as (
  select * from unnest([
    struct(1 as ord, '캐릭터 선택' as activity, ['character_select'] as names),
    (2,  '벌목',        ['chop_tree', 'first_chop']),
    (3,  '씨앗 심기',   ['plant_seed']),
    (4,  '물주기',      ['water_crop']),
    (5,  '수확',        ['harvest_crop']),
    (6,  '낚시 던지기', ['fishing_cast']),
    (7,  '낚시 성공',   ['fishing_catch']),
    (8,  '채굴',        ['mine_ore']),
    (9,  '카페',        ['enter_cafe']),
    (10, '뱃놀이',      ['boat_start']),
    (11, '집 완성',     ['house_complete']),
    (12, '도감 발견',   ['dex_discover']),
    (13, '퀘스트 완료', ['quest_complete']),
    (14, '배지 획득',   ['badge_earn']),
    (15, '사진 촬영',   ['photo_capture'])
  ])
),
act as (
  select ev.user_pseudo_id, m.ord, m.activity,
         row_number() over (partition by ev.user_pseudo_id
                            order by ev.event_timestamp desc) as rn
  from ev join m on ev.event_name in unnest(m.names)
),
last_act as (select user_pseudo_id, ord, activity from act where rn = 1),
all_dev as (select distinct user_pseudo_id from ev)
select
  coalesce(l.ord, 99)                as ord,
  coalesce(l.activity, '활동 없음')  as last_activity,
  count(*)                           as devices
from all_dev a
left join last_act l using (user_pseudo_id)
group by 1, 2
order by 3 desc;

--  ※ 2026-09-02 관측 (합계 239) — 활동 없음 142 · 도감 발견 29 · 캐릭터 선택 22 ·
--    벌목 14 · 물주기 8 · 퀘스트 완료 6 · 뱃놀이 4 · 채굴 3 · 낚시 던지기 3 ·
--    낚시 성공 2 · 씨앗 심기 2 · 카페 2 · 수확 1 · 집 완성 1.
--    → 22대는 캐릭터만 고르고, 29대는 도감만 넘겨보고 떠났습니다.
--      둘을 합치면 51대 — 활동을 한 97대의 절반이 "구경만" 하고 나간 셈입니다.


-- #############################################################
--  B 파트 · Supabase (Postgres) — 자동화 대상 아님(마커 없음)
--    실행: Supabase 대시보드 → SQL Editor (postgres 권한 → RLS 우회)
--    ⚠️ Supabase 는 최근 7일 창만 보관합니다(export_to_bq.py 의 prune).
--       전체 이력이 필요한 지표는 반드시 BigQuery 미러를 쓰세요.
-- #############################################################

-- ─────────────────────────────────────────────────────────────
-- B2. 미니게임 성적 분포
--     ⛔ 2026-09-02 현재 공개 대시보드에 쓰지 마세요. 쿼리는 정상 동작하지만
--        표본이 boat_runs 9행 · sea_records 11행(어종 1종·4기기)뿐입니다.
--        셀 대부분이 1~2행이라 (가) 그림이 이야기를 못 하고,
--        (나) 태블로 퍼블릭은 원본 다운로드가 가능해 devices=1 셀이 그대로 노출됩니다.
--        대안: A2(GA4 이벤트 빈도)로 대체하고, 셀당 5기기 쌓인 뒤 승격하세요.
--        승격할 땐 boat_runs·sea_records 를 export_to_bq.py 미러 대상에 먼저 추가해야
--        합니다(현재 미러는 game_logs·econ_logs·session_logs·game_saves 4개뿐).
--     ※ avg_score 컬럼은 게임에 따라 의미가 다릅니다
--        boat = 점수 / sea_fishing = 평균 무게(kg). 대시보드에서 분리해 쓰세요.
-- ─────────────────────────────────────────────────────────────
select
  'boat'                                  as game,
  result                                  as outcome,
  coalesce(weather, 'unknown')            as weather,
  count(*)                                as runs,
  count(distinct client_id)               as devices,
  round(avg(score)::numeric, 1)           as avg_score,
  round(avg(dist_m)::numeric, 1)          as avg_dist,
  round(avg(time_sec)::numeric, 1)        as avg_time,
  round(avg(hits)::numeric, 2)            as avg_hits
from public.boat_runs
group by 1, 2, 3

union all

select
  'sea_fishing',
  species,
  'n/a',
  count(*),
  count(distinct client_id),
  round(avg(weight)::numeric, 2),         -- 점수 자리에 평균 무게(kg)
  null, null, null
from public.sea_records
group by 1, 2, 3

order by game, runs desc;
