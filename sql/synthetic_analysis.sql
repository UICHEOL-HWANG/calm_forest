-- =============================================================
--  calm forest · 합성 데이터 분석 & ML 피처 쿼리
--  ------------------------------------------------------------
--  대상: syn_* 테이블 (scripts/seed_synthetic.py 가 생성)
--  실제 유저 데이터는 건드리지 않습니다. 전부 읽기 전용 쿼리입니다.
--
--  구성
--    1) 일별 트래픽 / 리텐션 (D1·D3·D7 + 주간 코호트)
--    2) 온보딩 퍼널 — 어디서 끊기는지
--    3) 이탈 분석 — 마지막 세션의 특징
--    4) ★ ML 피처 테이블 — 유저 1행 = 첫 세션 피처 + 이탈 라벨
--
--  ※ 유저 식별은 client_id 입니다(합성 데이터는 user_id 가 항상 null).
--  ※ 날짜는 KST 로 자릅니다(실제 대시보드와 동일 규칙).
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 1-a) 일별 DAU / 신규 / 복귀
-- ─────────────────────────────────────────────────────────────
with ud as (   -- 유저×일 (중복 제거)
  select distinct client_id as uid, ((created_at at time zone 'Asia/Seoul'))::date as day
  from syn_game_logs
),
first_seen as (select uid, min(day) as first_day from ud group by uid)
select d.day,
       count(*)                                     as dau,
       count(*) filter (where f.first_day = d.day)  as new_users,
       count(*) filter (where f.first_day < d.day)  as returning_users
from ud d join first_seen f using (uid)
group by d.day order by d.day;


-- ─────────────────────────────────────────────────────────────
-- 1-b) N일차 복귀율 — 관측 기간이 지난 코호트만 분모에 포함
-- ─────────────────────────────────────────────────────────────
with ud as (
  select distinct client_id as uid, ((created_at at time zone 'Asia/Seoul'))::date as day
  from syn_game_logs
),
f as (select uid, min(day) as first_day from ud group by uid),
t as (select (now() at time zone 'Asia/Seoul')::date as d)
select
  round(100.0 * count(*) filter (where f.first_day <= t.d - 1
      and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 1))
    / nullif(count(*) filter (where f.first_day <= t.d - 1), 0), 1) as d1_pct,
  round(100.0 * count(*) filter (where f.first_day <= t.d - 3
      and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 3))
    / nullif(count(*) filter (where f.first_day <= t.d - 3), 0), 1) as d3_pct,
  round(100.0 * count(*) filter (where f.first_day <= t.d - 7
      and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 7))
    / nullif(count(*) filter (where f.first_day <= t.d - 7), 0), 1) as d7_pct
from f cross join t;


-- ─────────────────────────────────────────────────────────────
-- 1-c) 주간 코호트 잔존율
-- ─────────────────────────────────────────────────────────────
with ud as (
  select distinct client_id as uid, ((created_at at time zone 'Asia/Seoul'))::date as day
  from syn_game_logs
),
f as (select uid, min(day) as first_day from ud group by uid)
select date_trunc('week', f.first_day)::date  as cohort_week,
       (floor((u.day - f.first_day) / 7))::int as week_no,
       count(distinct u.uid)                  as users,
       round(100.0 * count(distinct u.uid)
             / max(count(distinct u.uid)) over (partition by date_trunc('week', f.first_day)), 1) as pct
from f join ud u using (uid)
group by 1, 2 order by 1, 2;


-- ─────────────────────────────────────────────────────────────
-- 2) 온보딩 퍼널 — 어디서 끊기는지
-- ─────────────────────────────────────────────────────────────
select
  count(*)                                                                   as 접속,
  count(*) filter (where state ->> 'character' is not null)                   as 캐릭터선택,
  count(*) filter (where (state ->> 'tutorialSeen')::boolean)                 as 튜토리얼완료,
  count(*) filter (where (state ->> 'houseStage')::int >= 1)                  as 집착공,
  count(*) filter (where (state ->> 'houseStage')::int >= 3)                  as 집완성,
  count(*) filter (where (select coalesce(sum((select count(*) from jsonb_object_keys(c.value))), 0)
                          from jsonb_each(state -> 'dex') c) >= 5)            as 도감5종,
  count(*) filter (where (select count(*) from jsonb_object_keys(state -> 'badges')) >= 1) as 배지1개
from syn_game_saves;


-- ─────────────────────────────────────────────────────────────
-- 3) 이탈 분석 — 마지막 세션이 어디서·어떻게 끝났나
--    (이탈 = 최근 14일간 접속 없음)
-- ─────────────────────────────────────────────────────────────
with last_sess as (
  select distinct on (client_id) client_id, last_place, play_sec, started_at
  from syn_session_logs order by client_id, started_at desc
)
select last_place                       as 마지막_장소,
       count(*)                         as 유저수,
       round(avg(play_sec))             as 평균_세션초,
       round(100.0 * count(*) filter (where started_at < now() - interval '14 days')
             / count(*), 1)             as 이탈률_pct
from last_sess group by 1 order by 2 desc;


-- ─────────────────────────────────────────────────────────────
-- 4) ★ ML 피처 테이블 — 유저 1행 = 첫 세션 피처 + 이탈 라벨
-- ─────────────────────────────────────────────────────────────
--    설계 원칙
--      · 피처는 "첫 세션에서 관측 가능한 것"만 씁니다. 미래 정보가 섞이면
--        (data leakage) 모델 성능이 비현실적으로 높게 나와 실험이 무의미해집니다.
--      · 라벨 2종: y_returned_d1(다음날 복귀) / y_returned_ever(한 번이라도 복귀)
--      · truth_* 컬럼은 생성 시 사용한 정답값입니다. 학습 피처로 쓰면 정답 유출이니
--        "모델이 archetype 을 얼마나 복원했나" 사후 검증에만 쓰세요.
--      · 관측 기간이 1일도 안 지난 유저는 라벨이 정의되지 않아 제외합니다.
--
--    결과를 CSV 로 내려 pandas/sklearn 에 그대로 넣으면 됩니다.
--    (기대: f_tutorial 과 f_first_session_sec 이 가장 강한 피처로 나와야 정상)
-- ─────────────────────────────────────────────────────────────
with ud as (
  select distinct client_id as uid, ((created_at at time zone 'Asia/Seoul'))::date as day
  from syn_game_logs
),
f as (select uid, min(day) as first_day from ud group by uid),
first_sess as (   -- 유저별 첫 세션
  select distinct on (client_id)
         client_id, session_id, play_sec, counts, last_place, is_guest, started_at
  from syn_session_logs order by client_id, started_at asc
),
first_econ as (   -- 첫 세션에서 코인을 벌었는가(= 조기 보상 경험)
  select fs.client_id,
         count(e.id)                              as econ_tx,
         coalesce(sum(greatest(e.amount, 0)), 0)  as earned
  from first_sess fs
  left join syn_econ_logs e on e.session_id = fs.session_id
  group by fs.client_id
),
places as (       -- 첫 세션에 방문한 서로 다른 구역 수(탐색 폭)
  select fs.client_id,
         count(distinct case
           when l.char_z >  4 and abs(l.char_x) < 6 then 'farm'
           when l.char_x < -9                       then 'mine'
           when l.char_x > 11                       then 'lake'
           when l.char_x < -4 and l.char_z < -4     then 'house'
           else 'village' end) as areas
  from first_sess fs join syn_game_logs l on l.session_id = fs.session_id
  group by fs.client_id
)
select
  fs.client_id,
  -- ── 피처(첫 세션에서만 관측 가능) ──
  fs.play_sec                                                              as f_first_session_sec,
  coalesce((select sum(v::int) from jsonb_each_text(fs.counts) t(k, v)), 0) as f_first_events,
  coalesce((fs.counts ->> 'chop_tree')::int, 0)                            as f_chop,
  coalesce((fs.counts ->> 'harvest_crop')::int, 0)                         as f_harvest,
  coalesce((fs.counts ->> 'fishing_cast')::int, 0)                         as f_fish,
  coalesce((fs.counts ->> 'quest_complete')::int, 0)                       as f_quest,
  coalesce(fe.econ_tx, 0)                                                  as f_econ_tx,
  coalesce(fe.earned, 0)                                                   as f_coins_earned,
  coalesce(pl.areas, 1)                                                    as f_areas_visited,
  (fs.is_guest)::int                                                       as f_is_guest,
  ((sv.state ->> 'tutorialSeen')::boolean)::int                            as f_tutorial,
  (sv.state ->> 'character' is not null)::int                              as f_picked_character,
  extract(hour from (fs.started_at at time zone 'Asia/Seoul'))::int         as f_start_hour_kst,
  extract(dow  from (fs.started_at at time zone 'Asia/Seoul'))::int         as f_start_dow,
  -- ── 라벨 ──
  (exists (select 1 from ud u where u.uid = fs.client_id and u.day = f.first_day + 1))::int as y_returned_d1,
  (exists (select 1 from ud u where u.uid = fs.client_id and u.day >  f.first_day))::int    as y_returned_ever,
  -- ── 검증 전용(학습 피처로 쓰지 말 것) ──
  sv.state -> '_syn' ->> 'archetype'                                       as truth_archetype,
  (sv.state -> '_syn' ->> 'days_active')::int                              as truth_days_active
from first_sess fs
join f  on f.uid = fs.client_id
join syn_game_saves sv on sv.client_id = fs.client_id
left join first_econ fe on fe.client_id = fs.client_id
left join places    pl on pl.client_id = fs.client_id
where f.first_day <= (now() at time zone 'Asia/Seoul')::date - 1   -- 라벨 관측 가능한 유저만
order by fs.client_id;
