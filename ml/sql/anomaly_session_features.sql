-- =============================================================
--  calm forest · 이상치 탐지 — 세션 단위 원천 집계 (BQ 미러)
--  ------------------------------------------------------------
--  ml/train_anomaly.py 가 읽는다. counts(이벤트 횟수 jsonb 문자열)는 파이썬에서 풀어
--  다양성·반복 피처로 만든다(calm_ml/anomaly_features.py) — BQ JSON 함수 의존을 피하려고.
--  ⚠️ session_logs 미러는 updated_at 증분 append 라 세션당 여러 행 → 최신 1행만 쓴다.
--  파라미터: @since (DATE) — 이 날짜 이후 시작한 세션
-- =============================================================
with sess as (
  select * except(rn) from (
    select session_id, user_id, client_id, is_guest, platform, play_sec, counts, coins, started_at, updated_at,
           row_number() over (partition by session_id order by updated_at desc) rn
    from `calm-forest.calm_forest_raw.session_logs`
    where date(started_at) >= @since and user_id is not null
  ) where rn = 1
),
steps as (
  select session_id,
         sqrt(pow(char_x - lag(char_x) over w, 2) + pow(char_z - lag(char_z) over w, 2)) as d,
         abs(cam_yaw - lag(cam_yaw) over w) as dyaw,
         timestamp_diff(created_at, lag(created_at) over w, millisecond) / 1000.0 as dt
  from `calm-forest.calm_forest_raw.game_logs`
  where date(created_at) >= @since
  window w as (partition by session_id order by created_at)
),
move as (
  select session_id,
         count(*) as n_samples,
         sum(d) as path_len,
         countif(d < 0.2) / count(*) as idle_ratio,       -- 하트비트만 찍힌(제자리) 표본 비율
         sum(least(dyaw, 6.28)) as yaw_total,
         max(dt) as max_gap_sec                           -- 가장 긴 무입력 구간
  from steps where d is not null
  group by session_id
),
econ as (
  select session_id,
         count(*) as n_tx,
         sum(if(amount > 0, amount, 0)) as coin_in,
         sum(if(amount < 0, -amount, 0)) as coin_out,
         count(distinct source) as n_sources
  from `calm-forest.calm_forest_raw.econ_logs`
  where date(created_at) >= @since
  group by session_id
)
select s.session_id, s.user_id, s.client_id, s.is_guest, s.platform, s.play_sec, s.counts, s.coins, s.started_at,
       coalesce(m.n_samples, 0) as n_samples, coalesce(m.path_len, 0) as path_len,
       m.idle_ratio, coalesce(m.yaw_total, 0) as yaw_total, m.max_gap_sec,
       coalesce(e.n_tx, 0) as n_tx, coalesce(e.coin_in, 0) as coin_in,
       coalesce(e.coin_out, 0) as coin_out, coalesce(e.n_sources, 0) as n_sources
from sess s
left join move m using (session_id)
left join econ e using (session_id)
