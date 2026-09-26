-- =============================================================
--  calm forest · 🎚️ 미니게임 난이도 probe 분석
--  ------------------------------------------------------------
--  대상: GA4 export `calm-forest.analytics_547127440.events_*`
--  설계: docs/superpowers/specs/2026-09-22-difficulty-probe-design.md
--  실행: BigQuery 콘솔 → 쿼리 편집기. 질의마다 self-contained 이므로 하나씩 복사해 실행한다.
--
--  최종 난이도 e = clamp(e_dda × e_probe) 이고 **클수록 쉽다**.
--   · arm  — probe 팔 인덱스(0/1/2). 판마다 순회한다.
--   · ease — 그 판에 실제로 적용된 최종 계수.
--   · dda  — 유저별 보정값 단독. 이 사람의 난이도가 어디까지 밀렸는지.
--
--  ⚠️ ease·dda 는 GA4 가 값에 따라 int 로도 double 로도 넣는다(1.0 은 int 가 되기 쉽다).
--     반드시 coalesce 로 양쪽을 받을 것 — double_value 만 읽으면 ease 가 딱 1.0 인 판이
--     통째로 null 이 되어 팔 하나가 통계에서 사라진다.
--
--  ⚠️ 날짜는 probe 배포일부터. 그 이전에는 파라미터 자체가 없다.
--
--  ⚠️ probe_v — 팔 배정 방식. 없음/1 = 고정 순회(~2026-09-26), 2 = 블록 셔플.
--     고정 순회는 "어려운 팔 다음엔 늘 같은 팔" 이라 직전 실패로 오른 dda 가 특정 팔에 몰린다.
--     팔 비교는 probe_v = 2 로 거르거나, 최소한 dda 를 공변량으로 넣을 것.
--     토스는 검수 기간 동안 옛 번들(probe_v 없음)이 섞여 들어온다.
--
--  ⚠️ 결과 없이 끝난 판은 minigame_abandon{game, stage} 로 따로 온다(2026-09-26~).
--     성공률의 분모에서 빠진 판이므로 7번으로 팔별 포기율을 먼저 볼 것.
--     stage 가 wait(낚시)면 팔을 겪기 전 포기라 난이도와 무관하다.
--     바다는 판 도중 나갈 길이 없어(출구는 idle 에서만) 포기 이벤트가 없다 — 앱 종료만 빠진다.
-- =============================================================


-- =============================================================
--  1. 팔별 표본 — 순회가 실제로 도는가 (위생 검사, 제일 먼저 볼 것)
-- =============================================================
--  각 게임에서 팔 0/1/2 의 판 수가 엇비슷해야 한다. 한쪽이 두 배 이상이면 배정이 깨진 것이다
--  (예: 판 시작이 아닌 곳에서 rollDifficulty 를 부르고 있다 — 요리 메뉴판이 그 전례다).
with ev as (
  select
    event_name,
    (select value.int_value from unnest(event_params) where key = 'arm') as arm
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
)
select
  case
    when event_name like 'fishing_%'     then 'fish'
    when event_name like 'sea_%'         then 'sea'
    when event_name like 'mist_soothe%'  then 'mist'
    when event_name like 'cooking_%'     then 'cook'
    when event_name = 'craft_set'        then 'craft'
  end as game,
  arm, count(*) as plays
from ev
where arm is not null
group by game, arm
order by game, arm;


-- =============================================================
--  2. 🎣 낚시 성공률 곡선 — 입질창을 어디로 옮길 것인가
-- =============================================================
--  ⚠️ 팔 번호로 묶지 말 것. 낚싯대 업그레이드가 입질창에 함께 곱해져(2.6 vs 1.4)
--     업글 유저의 팔 0(2.6×0.45=1.17초)이 미업글 팔 2(1.4초)보다 **짧다**.
--     팔 번호는 절대 난이도가 아니다 — 비교는 반드시 실제 입질창 초로 한다.
--  읽는 법: catch_pct 가 급격히 꺾이는 지점 바로 위가 새 기본값 후보다.
with ev as (
  select
    event_name,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'ease') as ease,
    (select value.int_value from unnest(event_params) where key = 'rod') as rod
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
    and event_name in ('fishing_catch', 'fishing_miss')
)
select
  rod,
  round(ease * if(rod = 1, 2.6, 1.4), 2) as bite_sec,
  count(*)                               as casts,
  countif(event_name = 'fishing_catch')  as caught,
  round(100 * countif(event_name = 'fishing_catch') / count(*), 1) as catch_pct
from ev
where ease is not null
group by rod, bite_sec
order by rod, bite_sec;


-- =============================================================
--  3. 🌊 바다 성공률 곡선 — 얼마나 쉽게 해야 넘어가나
-- =============================================================
--  실패해도 avg_miss_progress 가 높으면 거의 다 온 것이다. 그 비중이 크면
--  조금만 쉽게 해도 성공률이 크게 오른다(= 작은 조정으로 충분하다).
with ev as (
  select
    event_name,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'ease')     as ease,
    (select value.int_value    from unnest(event_params) where key = 'arm')      as arm,
    (select value.string_value from unnest(event_params) where key = 'species')  as species,
    (select value.int_value    from unnest(event_params) where key = 'progress') as progress
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
    and event_name in ('sea_catch', 'sea_miss')
)
select
  arm, round(ease, 2) as ease, species,
  count(*)                                                        as plays,
  round(100 * countif(event_name = 'sea_catch') / count(*), 1)    as catch_pct,
  round(avg(if(event_name = 'sea_miss', progress, null)), 1)      as avg_miss_progress
from ev
where arm is not null
group by arm, ease, species
order by arm, species;


-- =============================================================
--  4. 🌫️ 안개 성공률 곡선 — 판정창 0.734 / 0.62 / 0.506
-- =============================================================
--  연습 모드는 이벤트 이름이 달라(mist_practice_miss) 여기 안 들어온다.
--  현재 기본값(팔 1)이 80% 였으므로, 팔 0(쉬움)·팔 2(어려움)가 그 위아래로
--  얼마나 벌어지는지가 판정창 민감도다.
with ev as (
  select
    event_name,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'ease') as ease,
    (select value.int_value from unnest(event_params) where key = 'arm') as arm
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
    and event_name in ('mist_soothe', 'mist_soothe_miss')
)
--  ⚠️ 별칭을 ease 로 두면 안 된다. judge_lo 가 원본 ease 를 참조하는데 group by 의 ease 가
--     별칭(반올림값)으로 잡혀 "neither grouped nor aggregated" 로 죽는다(실제로 겪음).
select
  arm,
  round(ease, 2)                                                  as ease_r,
  round(1 - 0.38 * ease, 3)                                       as judge_lo,   -- 실제 판정창 하한
  count(*)                                                        as taps,
  round(100 * countif(event_name = 'mist_soothe') / count(*), 1)  as soothe_pct
from ev
where arm is not null
group by arm, ease
order by arm;


-- =============================================================
--  5. 🍳 요리 점수 곡선 — 표본이 제일 많은 곳
-- =============================================================
--  arms·eases 는 스테이지별 값을 쉼표로 이어 붙인 문자열이다. unnest 로 풀어
--  스테이지 인덱스와 함께 묶는다. 결과가 연속 점수라 이진 승패보다 표본 효율이 높다.
--
--  ⚠️ 위생 검사: stage_n(팔 개수)과 mg_n(코스 길이)이 **같아야** 한다.
--     length_mismatch 가 0 이 아니면 cookDiffs 와 코스 길이가 어긋난 것이다
--     (kitchenStart 의 base.map 확인).
with ev as (
  select
    (select value.string_value from unnest(event_params) where key = 'arms')    as arms,
    (select value.string_value from unnest(event_params) where key = 'eases')   as eases,
    (select value.string_value from unnest(event_params) where key = 'mg_type') as mg_type,
    (select value.int_value    from unnest(event_params) where key = 'score')   as score,
    (select value.int_value    from unnest(event_params) where key = 'n_miss')  as n_miss,
    (select value.int_value    from unnest(event_params) where key = 'avg_offset_ms') as avg_offset_ms
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
    and event_name = 'cooking_result'
),
staged as (
  select
    array_length(split(arms, ','))                as stage_n,
    array_length(split(mg_type, '>'))             as mg_n,
    score, n_miss, avg_offset_ms,
    cast(arm_s as int64)                          as arm,
    cast(split(eases, ',')[offset(i)] as float64) as ease,
    i                                             as stage_idx
  from ev, unnest(split(arms, ',')) as arm_s with offset i
  where arms is not null and arms != ''
)
select
  stage_idx, arm, round(ease, 2) as ease,
  count(*)                     as stages,
  round(avg(score), 1)         as avg_score,
  round(avg(n_miss), 2)        as avg_miss,
  round(avg(avg_offset_ms), 1) as avg_offset_ms,
  countif(stage_n != mg_n)     as length_mismatch   -- 0 이어야 한다
from staged
group by stage_idx, arm, ease
order by stage_idx, arm;


-- =============================================================
--  6. 🎚️ DDA 궤적 — 유저별 난이도가 어떻게 진행됐나
-- =============================================================
--  원래 물어본 것이 이것이다: "유저별로 난이도가 어떻게 흘러갔는가".
--  dda 는 한 판에 최대 0.10 만 움직이므로 며칠에 걸쳐 완만하게 이동한다.
--
--  읽는 법: wall_pct(벽 0.7·1.5 에 붙은 판의 비율)가 높으면 clamp 가 좁다는 뜻이다.
--  clamp 를 넓히기 전에, 그 유저들이 정말 극단인지 성공률로 먼저 확인할 것.
with ev as (
  select
    user_pseudo_id,
    parse_date('%Y%m%d', regexp_extract(_TABLE_SUFFIX, r'\d{8}$')) as day,
    case
      when event_name like 'fishing_%'    then 'fish'
      when event_name like 'sea_%'        then 'sea'
      when event_name like 'mist_soothe%' then 'mist'
    end as game,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'dda') as dda
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
    and event_name in ('fishing_catch', 'fishing_miss', 'sea_catch', 'sea_miss',
                       'mist_soothe', 'mist_soothe_miss')
)
select
  day, game,
  count(distinct user_pseudo_id) as users,
  round(avg(dda), 3)             as avg_dda,
  round(min(dda), 3)             as min_dda,
  round(max(dda), 3)             as max_dda,
  round(100 * countif(dda <= 0.7 or dda >= 1.5) / count(*), 1) as wall_pct
from ev
where dda is not null and game is not null
group by day, game
order by day, game;


-- =============================================================
--  7. 🚪 팔별 포기율 — 기록된 판만의 성공률이 부풀었나
-- =============================================================
--  어려운 팔에서만 포기가 많으면 2~4번 곡선의 어려운 쪽이 실제보다 쉬워 보인다.
--  exposed = 팔을 겪은 뒤의 포기(낚시 bite · 안개 walk_away/end).
--  안개 연습(practice = 1)은 제외한다 — 성공/실패 쪽도 연습을 뺐다.
with ab as (
  select
    (select value.string_value from unnest(event_params) where key = 'game')  as game,
    (select value.string_value from unnest(event_params) where key = 'stage') as stage,
    (select value.int_value    from unnest(event_params) where key = 'arm')   as arm,
    (select value.int_value    from unnest(event_params) where key = 'practice') as practice
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260926' and format_date('%Y%m%d', current_date())
    and event_name = 'minigame_abandon'
),
done as (
  select
    case
      when event_name like 'fishing_%'    then 'fish'
      when event_name like 'sea_%'        then 'sea'
      when event_name like 'mist_soothe%' then 'mist'
    end as game,
    (select value.int_value from unnest(event_params) where key = 'arm') as arm
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260926' and format_date('%Y%m%d', current_date())
    and event_name in ('fishing_catch', 'fishing_miss', 'sea_catch', 'sea_miss',
                       'mist_soothe', 'mist_soothe_miss')
    and (select value.int_value from unnest(event_params) where key = 'probe_v') = 2
),
ab_n as (
  select game, arm,
    countif(stage != 'wait')              as exposed_abandons,
    countif(stage = 'wait')               as pre_abandons
  from ab
  where coalesce(practice, 0) = 0 and arm is not null
  group by game, arm
),
done_n as (
  select game, arm, count(*) as finished from done where arm is not null group by game, arm
)
select
  coalesce(d.game, a.game) as game, coalesce(d.arm, a.arm) as arm,
  coalesce(d.finished, 0)          as finished,
  coalesce(a.exposed_abandons, 0)  as exposed_abandons,
  coalesce(a.pre_abandons, 0)      as pre_abandons,
  round(100 * coalesce(a.exposed_abandons, 0)
        / nullif(coalesce(d.finished, 0) + coalesce(a.exposed_abandons, 0), 0), 1) as abandon_pct
from done_n d
full outer join ab_n a on a.game = d.game and a.arm = d.arm
order by game, arm;
