-- G1 data reliability: full-history source inventory.
-- Analysis ends at today's KST date. Synthetic/local smoke rows are not removed here:
-- this query measures raw coverage and quality before analytical exclusions.
with ga4 as (
  select
    event_date,
    event_timestamp,
    event_name,
    user_pseudo_id,
    user_id,
    (select value.int_value from unnest(event_params) where key = 'ga_session_id') as ga_session_id
  from `calm-forest.analytics_547127440.events_*`
  where regexp_contains(_table_suffix, r'^\d{8}$')
    and parse_date('%Y%m%d', event_date) <= current_date('Asia/Seoul')
),
session_all as (
  select *
  from `calm-forest.calm_forest_raw.session_logs`
  where date(updated_at, 'Asia/Seoul') <= current_date('Asia/Seoul')
),
session_latest as (
  select *
  from session_all
  qualify row_number() over (
    partition by session_id order by updated_at desc
  ) = 1
)
select
  'GA4 events' as source,
  '행동·유입·기기·지역' as analytical_role,
  count(*) as row_count,
  count(distinct user_pseudo_id) as devices,
  count(distinct user_id) as auth_ids,
  count(distinct if(
    ga_session_id is not null and user_pseudo_id is not null,
    concat(user_pseudo_id, '-', cast(ga_session_id as string)), null
  )) as sessions,
  timestamp_micros(min(event_timestamp)) as first_at,
  timestamp_micros(max(event_timestamp)) as last_at,
  round(100 * safe_divide(countif(user_pseudo_id is null), count(*)), 2) as missing_primary_key_pct,
  cast(0 as int64) as duplicate_rows
from ga4

union all

select
  'BQ game_logs', '좌표·카메라·플레이 표본', count(*),
  count(distinct client_id), count(distinct user_id), count(distinct session_id),
  min(created_at), max(created_at),
  round(100 * safe_divide(countif(client_id is null or client_id = ''), count(*)), 2), 0
from `calm-forest.calm_forest_raw.game_logs`
where date(created_at, 'Asia/Seoul') <= current_date('Asia/Seoul')

union all

select
  'BQ econ_logs', '재화 증감 원장', count(*),
  count(distinct client_id), count(distinct user_id), count(distinct session_id),
  min(created_at), max(created_at),
  round(100 * safe_divide(countif(client_id is null or client_id = ''), count(*)), 2), 0
from `calm-forest.calm_forest_raw.econ_logs`
where date(created_at, 'Asia/Seoul') <= current_date('Asia/Seoul')

union all

select
  'BQ session_logs', '세션 요약·행동 카운트', count(*),
  count(distinct client_id), count(distinct user_id), count(distinct session_id),
  min(started_at), max(updated_at),
  round(100 * safe_divide(countif(client_id is null or client_id = ''), count(*)), 2),
  (select count(*) from session_all) - count(*)
from session_latest

union all

select
  'BQ game_saves', '현재 진행도 스냅샷', count(*),
  cast(null as int64), count(distinct user_id), cast(null as int64),
  cast(null as timestamp), max(updated_at),
  round(100 * safe_divide(countif(user_id is null or user_id = ''), count(*)), 2), 0
from `calm-forest.calm_forest_raw.game_saves`
where date(updated_at, 'Asia/Seoul') <= current_date('Asia/Seoul')

union all

select
  'BQ churn_events', '이탈 개입 점수·실험군', count(*),
  count(distinct client_id), cast(null as int64), count(distinct session_id),
  min(`at`), max(`at`),
  round(100 * safe_divide(countif(client_id is null or client_id = ''), count(*)), 2), 0
from `calm-forest.calm_forest_raw.churn_events`
where date(`at`, 'Asia/Seoul') <= current_date('Asia/Seoul')
order by source;
