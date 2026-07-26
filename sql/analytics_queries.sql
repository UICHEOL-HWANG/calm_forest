-- =============================================================
--  calm forest · 전체 유저 집계 분석 쿼리 팩
--  ------------------------------------------------------------
--  실행 위치: Supabase 대시보드 → SQL Editor
--    (SQL Editor는 postgres 권한으로 실행돼 RLS를 우회 → 모든 유저 집계 가능)
--  ⚠️ 브라우저(anon/publishable key)에서는 RLS 때문에 본인 데이터만 보입니다.
--     전체 집계는 반드시 SQL Editor 또는 service_role 로 실행하세요.
--
--  데이터 출처:
--    game_logs  = 행동/센서(좌표·카메라·마우스, 1~2초 배치)   → 참여/이동 분석
--    game_saves = 진행도 스냅샷(state jsonb: inventory/houseStage/plots) → 진척 분석
--  통계 관점 메모: 평균은 이상치에 약하므로 백분위(중앙값/P90)를 함께 봅니다.
-- =============================================================


-- =============================================================
--  A. 규모 · 참여 (game_logs)
-- =============================================================

-- A1. 전체 규모 한눈에 (유저 수 / 세션 수 / 샘플 수)
select
  count(distinct user_id)    as users,
  count(distinct session_id) as sessions,
  count(*)                   as samples,
  min(created_at)            as first_seen,
  max(created_at)            as last_seen
from game_logs;

-- A2. DAU (일별 활성 유저) — 날짜별 고유 유저/세션
select
  date_trunc('day', created_at)::date as day,
  count(distinct user_id)             as dau,
  count(distinct session_id)          as sessions
from game_logs
group by day
order by day;

-- A3. 시간대(HH)별 활동량 — 언제 많이 노는지 (0~23시, UTC 기준)
--     한국시간으로 보려면 created_at 대신 (created_at at time zone 'Asia/Seoul')
select
  extract(hour from created_at at time zone 'Asia/Seoul')::int as hour_kst,
  count(*)                    as samples,
  count(distinct session_id)  as sessions
from game_logs
group by hour_kst
order by hour_kst;


-- =============================================================
--  B. 세션 길이 분포 (평균 + 백분위)
-- =============================================================

-- B1. 세션별 지속시간/이동거리 원자료 (뷰처럼 재사용)
with session_stats as (
  select
    session_id,
    user_id,
    count(*)                                                   as samples,
    extract(epoch from (max(created_at) - min(created_at)))   as duration_sec
  from game_logs
  group by session_id, user_id
)
-- B2. 세션 길이 요약: 평균은 참고용, 중앙값(P50)·P90 이 실제 체감에 가까움
select
  count(*)                                                        as sessions,
  round(avg(duration_sec))                                        as avg_sec,
  round(percentile_cont(0.5)  within group (order by duration_sec)) as median_sec,
  round(percentile_cont(0.9)  within group (order by duration_sec)) as p90_sec,
  round(percentile_cont(0.95) within group (order by duration_sec)) as p95_sec,
  round(avg(samples))                                             as avg_samples
from session_stats;

-- B3. 세션 길이 히스토그램 (구간별 세션 수) — 이탈 지점 파악
with session_stats as (
  select session_id,
         extract(epoch from (max(created_at) - min(created_at))) as duration_sec
  from game_logs group by session_id
)
select
  case
    when duration_sec < 30   then '0-30초'
    when duration_sec < 60   then '30-60초'
    when duration_sec < 180  then '1-3분'
    when duration_sec < 600  then '3-10분'
    else '10분+'
  end                         as bucket,
  count(*)                    as sessions
from session_stats
group by bucket
order by min(duration_sec);


-- =============================================================
--  C. 이동 히트맵 · 핫스팟 (game_logs) — 어디에 모이는가
-- =============================================================

-- C1. 2×2 격자 체류 빈도 (전체 유저 합산) — 대시보드 히트맵/QGIS 등에 활용
select
  round(char_x / 2.0) * 2 as gx,
  round(char_z / 2.0) * 2 as gz,
  count(*)                as hits,
  count(distinct user_id) as users
from game_logs
group by gx, gz
order by hits desc;

-- C2. 상위 인기 구역 TOP 10 (집 터 -8,-8 / 스폰 0,0 등과 비교)
select
  round(char_x / 2.0) * 2 as gx,
  round(char_z / 2.0) * 2 as gz,
  count(*)                as hits
from game_logs
group by gx, gz
order by hits desc
limit 10;

-- C3. 세션당 이동거리 (연속 샘플 간 유클리드 거리 합) — 활동성 지표
with steps as (
  select
    session_id,
    sqrt(power(char_x - lag(char_x) over w, 2) + power(char_z - lag(char_z) over w, 2)) as d
  from game_logs
  window w as (partition by session_id order by created_at)
)
select
  round(avg(total))                                          as avg_distance,
  round(percentile_cont(0.5) within group (order by total))  as median_distance
from (select session_id, sum(d) as total from steps group by session_id) t;


-- =============================================================
--  D. 진행도 · 리텐션 (game_saves.state jsonb)
-- =============================================================

-- D1. 집 건설 단계 분포 (0=없음 1=기초 2=벽 3=완성) — 진행 퍼널
select
  coalesce((state->>'houseStage')::int, 0) as house_stage,
  count(*)                                  as users
from game_saves
group by house_stage
order by house_stage;

-- D2. 인벤토리/작물 통계 — 경제 밸런스 감 잡기 (평균 + 중앙값)
select
  round(avg((state->'inventory'->>'wood')::numeric), 1)  as avg_wood,
  round(avg((state->'inventory'->>'crop')::numeric), 1)  as avg_crop,
  round(avg((state->'inventory'->>'seed')::numeric), 1)  as avg_seed,
  percentile_cont(0.5) within group (order by (state->'inventory'->>'crop')::numeric) as median_crop,
  round(avg(jsonb_array_length(coalesce(state->'plots', '[]'::jsonb))), 1) as avg_plots
from game_saves;

-- D3. 진행 퍼널: "플레이 → 밭 1개+ → 집 완성" 도달 비율
select
  count(*)                                                                as total_users,
  count(*) filter (where jsonb_array_length(coalesce(state->'plots','[]'::jsonb)) > 0) as reached_farming,
  count(*) filter (where (state->>'houseStage')::int >= 3)               as completed_house,
  round(100.0 * count(*) filter (where (state->>'houseStage')::int >= 3) / nullif(count(*),0), 1) as house_complete_pct
from game_saves;

-- D4. 리텐션(간이): 세션이 2회 이상인 유저 비율 = 재방문율
with per_user as (
  select user_id, count(distinct session_id) as sessions
  from game_logs group by user_id
)
select
  count(*)                                                      as users,
  count(*) filter (where sessions >= 2)                         as returning_users,
  round(100.0 * count(*) filter (where sessions >= 2) / nullif(count(*),0), 1) as retention_pct
from per_user;
