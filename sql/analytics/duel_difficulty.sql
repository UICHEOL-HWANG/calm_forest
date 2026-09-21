-- =============================================================
--  calm forest · 🐗🦝 밤손님 승부 난이도 분석
--  ------------------------------------------------------------
--  대상: public.duel_logs (한 행 = 한 판). Supabase SQL Editor 에서 그대로 실행.
--  같은 값이 GA4 → BigQuery 에도 가지만 하루 뒤에 오므로, 오늘 만질 땐 이쪽을 본다.
--
--  ▶ 설계값(스펙): 🐗 승률 50% · 🦝 승률 60~75%
--    🦝 판별 난이도 — 1판 4회×450ms · 2판 6회×380ms · 3판 8회×320ms
--
--  ▶ ⚠️ miss 가 이 분석의 중심이다(GA4 의 off 와 같은 값).
--      0 = 정답 · 1 = 옆 그릇 · 2 = 반대쪽
--      1 이 많으면 **눈으로 좇다 마지막에 놓친 것** → 속도(ms)만 늦추면 된다.
--      2 가 많으면 **아예 못 좇은 것** → 횟수(swaps)까지 줄여야 한다.
--      이 둘을 안 가르면 "어려우니 다 쉽게"가 되어 게임이 싱거워진다.
-- =============================================================

-- ── 1. 승부 단위 승률 — 설계값과 맞나 ────────────────────────
--    🐗 45~55% · 🦝 60~75% 를 벗어나면 난수·판정 버그부터 의심한다.
with matches as (
  select session_id, animal, game, date_trunc('day', created_at) as day,
         -- 승부 하나는 1~3행이다. 마지막 판의 결과가 곧 승부 결과다(🦝 는 틀리면 거기서 끝,
         -- 🐗 는 2승/2패에서 끝나므로 어느 쪽이든 마지막 판이 승부를 결정한다)
         (array_agg(result order by round desc))[1] as last_result
  from public.duel_logs
  where created_at >= now() - interval '14 days'
  group by 1, 2, 3, 4
)
select day, game, animal,
       count(*)                                                as duels,
       round(100.0 * count(*) filter (where last_result = 'win') / count(*), 1) as win_pct
from matches
group by 1, 2, 3
order by day desc, game;

-- ── 2. 🦝 판별 정답률 — 어느 판에서 무너지나 ─────────────────
--    3판으로 갈수록 떨어지는 건 정상(빨라진다). 1판부터 낮으면 시작이 너무 어렵다.
select round, swaps, ms,
       count(*)                                                  as plays,
       round(100.0 * count(*) filter (where result = 'win') / count(*), 1) as correct_pct,
       round(avg(rt_ms))                                         as avg_rt_ms
from public.duel_logs
where game = 'shells' and created_at >= now() - interval '14 days'
group by 1, 2, 3
order by round;

-- ── 3. 🦝 miss 분포 — 속도 문제인가, 못 좇은 건가 ────────────
--    틀린 판만 본다. miss=1 이 압도적이면 ms 만 늦춘다.
--    miss=2 비중이 높으면 swaps 도 같이 줄인다(위 주석 참고).
select round, swaps, ms,
       count(*)                                          as wrong,
       count(*) filter (where miss = 1)                   as near,    -- 옆 그릇
       count(*) filter (where miss = 2)                   as far,     -- 반대쪽
       round(100.0 * count(*) filter (where miss = 2) / nullif(count(*), 0), 1) as far_pct
from public.duel_logs
where game = 'shells' and result = 'lose' and created_at >= now() - interval '14 days'
group by 1, 2, 3
order by round;

-- ── 4. 반응 시간 — 찍었나, 보고 골랐나 ───────────────────────
--    rt_ms 가 아주 짧은(< 400ms) 선택은 사실상 찍은 것이다. 그 비율이 높으면
--    "좇을 수 없다고 포기한" 신호라 miss 분포보다 먼저 봐야 한다.
select game, round,
       count(*)                                                         as plays,
       round(avg(rt_ms))                                                as avg_rt,
       percentile_cont(0.5) within group (order by rt_ms)::int           as median_rt,
       round(100.0 * count(*) filter (where rt_ms < 400) / count(*), 1)  as guess_pct
from public.duel_logs
where created_at >= now() - interval '14 days' and rt_ms is not null
group by 1, 2
order by game, round;

-- ── 5. 🐗 낸 손 분포 — 사람은 바위를 편중해 내는가 ───────────
--    상대는 균등 난수다. 사람 쪽이 치우쳐도 기대 승률은 50% 로 같지만,
--    편중이 크면 "고민 없이 같은 걸 누른다"는 신호라 연출·재미를 의심한다.
select mine,
       count(*)                                                as plays,
       round(100.0 * count(*) / sum(count(*)) over (), 1)      as pct,
       round(100.0 * count(*) filter (where result = 'win') / count(*), 1) as win_pct
from public.duel_logs
where game = 'rps' and created_at >= now() - interval '14 days' and mine is not null
group by 1
order by plays desc;

-- ── 6. 중간 이탈 — 몇 판째에 그만두나 ────────────────────────
--    승부를 끝내지 못한 세션을 센다. 🦝 는 3판을 다 이겨야 끝나므로
--    "이겼는데 3판 미만"이면 중간에 나간 것이다. 🐗 는 비긴 채로 끝난 경우.
select game, animal, round as quit_at_round, count(*) as sessions
from (
  select session_id, game, animal,
         max(round)                                        as round,
         (array_agg(result order by round desc))[1]        as last_result
  from public.duel_logs
  where created_at >= now() - interval '14 days'
  group by 1, 2, 3
) m
where (game = 'shells' and last_result = 'win' and round < 3)
   or (game = 'rps'    and last_result = 'draw')
group by 1, 2, 3
order by sessions desc;
