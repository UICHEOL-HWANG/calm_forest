-- =============================================================
--  calm forest · BigQuery (GA4 export) 쿼리 팩
--  ------------------------------------------------------------
--  실행: BigQuery 콘솔 → 쿼리 편집기
--  데이터셋 경로: `calm-forest.analytics_547127440.events_*`
--    (프로젝트 calm-forest / GA4 속성 547127440)
--
--  ★ GA4 export 스키마 특징:
--    - 하루 1테이블: events_YYYYMMDD (일별) / events_intraday_YYYYMMDD (실시간)
--    - 이벤트 매개변수는 event_params 배열에 중첩 → UNNEST 로 추출
--    - 유저 식별: user_pseudo_id(쿠키 기준), user_id(로그인 시 우리 값)
--    - 날짜 필터는 _TABLE_SUFFIX 사용(스캔량↓ = 비용↓)
--
--  ★ 데이터가 없으면: export 첫 실행 전이거나(최대 24h), 스트리밍 미설정.
--     오늘 데이터 보려면 events_intraday_* 도 포함해야 함(아래 D0 참고).
--
--  ⚠️ 아래 날짜( '20260701' 등 )는 상황에 맞게 바꾸세요.
-- =============================================================


-- =============================================================
--  0. 연결 확인 — 테이블/행이 잡히는지, 어떤 이벤트가 들어오는지
-- =============================================================

-- 0-A. 이벤트 종류별 개수 (최근 데이터)
select event_name, count(*) as cnt
from `calm-forest.analytics_547127440.events_*`
where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
group by event_name
order by cnt desc;

-- 0-B. (선택) 오늘/실시간 데이터까지 보려면 intraday 포함
--   events_* 와일드카드는 intraday 테이블도 함께 잡습니다.
--   intraday만 보고 싶으면 아래처럼:
-- select event_name, count(*) from `calm-forest.analytics_547127440.events_intraday_*` group by 1;


-- =============================================================
--  1. 규모 · DAU
-- =============================================================

-- 1-A. 일별 활성 유저(DAU) + 이벤트 수
select
  parse_date('%Y%m%d', event_date) as day,
  count(distinct user_pseudo_id)   as dau,
  count(*)                         as events
from `calm-forest.analytics_547127440.events_*`
where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
group by day
order by day;

-- 1-B. 로그인 방식 분포 (event_params 의 method 추출)
select
  (select value.string_value from unnest(event_params) where key = 'method') as method,
  count(*) as logins
from `calm-forest.analytics_547127440.events_*`
where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
  and event_name = 'login'
group by method
order by logins desc;


-- =============================================================
--  2. 행동 퍼널 (login → 벌목 → 심기 → 수확 → 집완성)
--     "해당 이벤트를 한 번이라도 한 유저 수" 기준 도달 퍼널
-- =============================================================
with steps as (
  select
    user_pseudo_id,
    countif(event_name = 'login')          > 0 as did_login,
    countif(event_name = 'first_chop')     > 0 as did_chop,
    countif(event_name = 'plant_seed')     > 0 as did_plant,
    countif(event_name = 'harvest_crop')   > 0 as did_harvest,
    countif(event_name = 'house_complete') > 0 as did_house
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
  group by user_pseudo_id
)
select
  countif(did_login)   as s1_login,
  countif(did_chop)    as s2_chop,
  countif(did_plant)   as s3_plant,
  countif(did_harvest) as s4_harvest,
  countif(did_house)   as s5_house,
  -- 전환율(로그인 대비 %)
  round(100.0 * countif(did_chop)    / nullif(countif(did_login), 0), 1) as pct_chop,
  round(100.0 * countif(did_harvest) / nullif(countif(did_login), 0), 1) as pct_harvest,
  round(100.0 * countif(did_house)   / nullif(countif(did_login), 0), 1) as pct_house
from steps;


-- =============================================================
--  3. 세션 분석 (GA4 자동 매개변수 ga_session_id)
-- =============================================================

-- 3-A. 세션 수 / 유저당 평균 세션
with s as (
  select
    user_pseudo_id,
    (select value.int_value from unnest(event_params) where key = 'ga_session_id') as session_id
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
)
select
  count(distinct format('%s-%d', user_pseudo_id, session_id)) as sessions,
  count(distinct user_pseudo_id)                             as users,
  round(count(distinct format('%s-%d', user_pseudo_id, session_id)) / nullif(count(distinct user_pseudo_id),0), 2) as sessions_per_user
from s;

-- 3-B. 세션 길이 분포 (초) — 평균 + 중앙값/P90
with ev as (
  select
    user_pseudo_id,
    (select value.int_value from unnest(event_params) where key = 'ga_session_id') as sid,
    event_timestamp
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
),
dur as (
  select (max(event_timestamp) - min(event_timestamp)) / 1e6 as sec  -- 마이크로초→초
  from ev group by user_pseudo_id, sid
)
select
  round(avg(sec))                                              as avg_sec,
  round(approx_quantiles(sec, 100)[offset(50)])                as median_sec,
  round(approx_quantiles(sec, 100)[offset(90)])                as p90_sec
from dur;


-- =============================================================
--  4. 경제/진행 이벤트 값 추출
-- =============================================================

-- 4-A. 수확 이벤트의 crop(누적 작물 수) 추이 — 세션 진척 감
select
  parse_date('%Y%m%d', event_date) as day,
  count(*)                          as harvests,
  round(avg((select value.int_value from unnest(event_params) where key = 'crop')), 1) as avg_crop_at_harvest
from `calm-forest.analytics_547127440.events_*`
where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
  and event_name = 'harvest_crop'
group by day
order by day;

-- 4-B. 벌목 시 획득 목재(wood) 분포
select
  (select value.int_value from unnest(event_params) where key = 'wood') as wood,
  count(*) as chops
from `calm-forest.analytics_547127440.events_*`
where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
  and event_name = 'chop_tree'
group by wood
order by wood;


-- =============================================================
--  5. 리텐션 (신규 vs 재방문, 간이)
-- =============================================================
with u as (
  select
    user_pseudo_id,
    count(distinct event_date) as active_days,
    count(distinct (select value.int_value from unnest(event_params) where key='ga_session_id')) as sessions
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260701' and format_date('%Y%m%d', current_date())
  group by user_pseudo_id
)
select
  count(*)                                   as users,
  countif(sessions >= 2)                     as returning_users,
  round(100.0 * countif(sessions >= 2) / nullif(count(*),0), 1) as retention_pct,
  round(avg(active_days), 2)                 as avg_active_days
from u;
