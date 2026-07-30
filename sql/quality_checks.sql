-- =============================================================
--  calm forest · 데이터 품질 체크 (계측 검증)
--  ------------------------------------------------------------
--  실행 위치: Supabase 대시보드 → SQL Editor (RLS 우회, 전체 집계)
--  용도: 체험단/런칭 전에 "로그가 제대로·정상적으로 쌓이는지" 확인.
--        계측이 깨진 채 유저를 받으면 그 코호트 데이터를 통째로 날리므로,
--        모집 직전 이 쿼리들을 위에서 아래로 훑어 초록불인지 본다.
--
--  각 쿼리 아래 [기대값]이 정상 기준. 벗어나면 원인 메모 참고.
-- =============================================================


-- Q1. 신선도(freshness) — 마지막 로그가 방금인가?
--     [기대] minutes_since_last 가 작아야 함(활성 유저 있으면 몇 분 내).
select
  max(created_at)                                                as last_log,
  round(extract(epoch from (now() - max(created_at))) / 60, 1)   as minutes_since_last
from game_logs;


-- Q2. 최근 유입량 — 24시간/1시간 규모
--     [기대] 플레이가 있었다면 rows/sessions > 0.
select
  count(*) filter (where created_at > now() - interval '24 hours')       as rows_24h,
  count(distinct session_id) filter (where created_at > now() - interval '24 hours') as sessions_24h,
  count(*) filter (where created_at > now() - interval '1 hour')         as rows_1h
from game_logs;


-- Q3. 신규 필드 커버리지 — client_id / is_guest / variant 채워지는가?
--     [기대] 오늘 배포 이후 데이터면 세 컬럼 null_pct 가 0에 가까움.
--     [원인] variant/client_id 가 높은 NULL → 구버전 클라이언트가 아직 캐시됨(강력 새로고침),
--            또는 배포 전 데이터. is_guest NULL 다수 → 로그인 전 로그거나 옛 데이터.
select
  count(*)                                                                          as rows_24h,
  round(100.0 * count(*) filter (where client_id is null) / nullif(count(*),0), 1)  as client_id_null_pct,
  round(100.0 * count(*) filter (where is_guest  is null) / nullif(count(*),0), 1)  as is_guest_null_pct,
  round(100.0 * count(*) filter (where variant   is null) / nullif(count(*),0), 1)  as variant_null_pct
from game_logs
where created_at > now() - interval '24 hours';


-- Q4. 게스트가 DB에 실제로 쌓이나? (익명 로그인 정상작동 확인)
--     [기대] is_guest=true 행이 존재 → Anonymous sign-ins 켜져 있고 정상.
--     [원인] is_guest=true 가 아예 없음 → 익명 로그인 비활성(게스트가 오프라인 폴백 중).
--            Supabase → Authentication → Sign In/Providers → Anonymous sign-ins 켜기.
select
  coalesce(is_guest::text, 'null') as is_guest,
  count(distinct user_id)          as users,
  count(distinct client_id)        as devices,
  count(*)                         as rows
from game_logs
where created_at > now() - interval '7 days'
group by 1
order by 1;


-- Q5. 변형 배정 균형 (실험 켰을 때만 의미) — A/B 가 대략 50:50인가?
--     [기대] 실험 off면 전부 control(정상). 'map' 켜면 A/B devices 가 비슷해야 함.
--     [원인] 한쪽으로 크게 치우침 → 해시 배정/노출 로직 점검.
select
  coalesce(variant, 'control') as variant,
  count(distinct client_id)    as devices,
  count(distinct session_id)   as sessions
from game_logs
where created_at > now() - interval '7 days'
group by 1
order by 1;


-- Q6. 좌표 정상성 — 쓰레기 값/맵 밖 튐이 없나?
--     [기대] min/max 가 맵 범위 안, out_of_bounds = 0.
--     [원인] 큰 값/NaN → 좌표 수집 버그 또는 손상 데이터.
select
  round(min(char_x)::numeric, 1) as min_x, round(max(char_x)::numeric, 1) as max_x,
  round(min(char_z)::numeric, 1) as min_z, round(max(char_z)::numeric, 1) as max_z,
  count(*) filter (where abs(char_x) > 200 or abs(char_z) > 200) as out_of_bounds
from game_logs
where created_at > now() - interval '24 hours';


-- Q7. 세이브 정상성 — game_saves 가 갱신되고 있나?
--     [기대] 최근 updated_at 존재, users > 0.
select
  count(*)                                                       as saves,
  max(updated_at)                                               as last_save,
  round(extract(epoch from (now() - max(updated_at))) / 60, 1)  as minutes_since_last_save
from game_saves;


-- Q8. 세션 길이 분포 정상성 — 초단타(1샘플) 세션 비율
--     [기대] 1샘플 세션 비율이 지나치게 높지 않음(과도하면 즉시 이탈 or 로깅 조기중단).
with s as (
  select session_id, count(*) as samples
  from game_logs
  where created_at > now() - interval '7 days'
  group by session_id
)
select
  count(*)                                                          as sessions,
  count(*) filter (where samples = 1)                              as one_sample_sessions,
  round(100.0 * count(*) filter (where samples = 1) / nullif(count(*),0), 1) as one_sample_pct
from s;
