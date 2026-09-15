-- 🎬 인트로 4번째 자막 전후 비교 — 조건부 생존율로 본다.
--
-- ⚠️ 교란 (이것 때문에 skip_pct 단순 비교는 무효다)
--    커밋 0fd4fd0(2026-09-15 13:20 KST) 은 자막만 넣은 게 아니다:
--      · 인트로 총 길이   18.9초 → 21.7초   (완주 정의 자체가 arm 마다 다르다)
--      · 자막3 until      16.0  → 15.2
--      · 자막4 신설       15.9~18.3
--    인트로가 3초 길어지면 "더 참아야 하니까" 스킵률이 기계적으로 오른다.
--    before 의 intro_complete 는 18.9초 완주, after 는 21.7초 완주라 같은 이름이 다른 사건이다.
--
-- ▶ 그래서 재는 것: **두 버전이 공통으로 재생 중인 0~18.9초 구간의 조건부 생존율**
--    reach_15_2 : 자막3이 사라지는 시점(두 버전 공통) 까지 버틴 재생
--    reach_18_9 : before 의 종료 시점까지 버틴 재생
--    surv_15_to_18 = reach_18_9 / reach_15_2
--      → 15.2초까지 버틴 사람 중 몇 %가 18.9초까지 갔나.
--        after 에서만 이 구간에 새 자막이 있다. 이 값이 떨어지면 자막이 이탈을 만든 것이고,
--        유지되면 최소한 해를 끼치진 않은 것이다. 인트로 길이 차이에 안 휘둘린다.
--    seen_caption : after 전용 절대수 — 15.9~18.3 구간을 스킵 없이 통과한 재생(= 자막을 실제로 본 수)
--
-- ▶ 실행 시점: **2026-09-16 이후**. after 는 9/16 부터다(9/15 는 배포 전후가 한 날에 섞여 mixed_day 로 뺀다).
--    GA4 export 지연을 감안하면 9/17 에 보는 게 안전하다. after 행이 안 나오면 아직 이르다는 뜻.
-- ▶ 절대수(skips·completes)는 arm 별 일수가 다르다 — 반드시 per_day 로 본다.
-- ▶ 제외: localhost(개발·촬영 세션 — 즉시 스킵이라 초반 구간을 부풀린다) · intraday · 미래 날짜
with e as (
  select
    parse_date('%Y%m%d', _table_suffix) as d,
    timestamp_micros(event_timestamp)   as ts,
    event_name,
    user_pseudo_id,
    (select coalesce(cast(value.int_value as float64), value.double_value, value.float_value)
       from unnest(event_params) where key = 'at_s') as at_s
  from `calm-forest.analytics_547127440.events_*`
  where regexp_contains(_table_suffix, r'^\d{8}$')
    and parse_date('%Y%m%d', _table_suffix)
        between date_sub(current_date('Asia/Seoul'), interval 45 day) and current_date('Asia/Seoul')
    and event_name in ('intro_skip', 'intro_complete')
    -- NULL hostname 은 필터에서 조용히 탈락한다(NULL not in → NULL) → coalesce 로 살린다
    and coalesce(device.web_info.hostname, '') not in ('localhost', '127.0.0.1')
),
tagged as (
  select *,
    case when ts <  timestamp '2026-09-15 04:20:00+00' then 'before'      -- 13:20 KST
         when d  =  date '2026-09-15'                  then 'mixed_day'   -- 배포 전후 혼재 — 결론에 쓰지 않는다
         else 'after' end as arm,
    -- 완주는 정의상 끝까지 간 것이므로 모든 기준점을 통과한다
    (event_name = 'intro_complete' or at_s >= 15.2) as reach_15_2,
    (event_name = 'intro_complete' or at_s >= 18.9) as reach_18_9,
    (event_name = 'intro_complete' or at_s >= 18.3) as passed_caption
  from e
)
select
  arm,
  count(distinct d)                                                   as days,
  countif(event_name='intro_skip')                                    as skips,
  countif(event_name='intro_complete')                                as completes,
  round(count(*) / nullif(count(distinct d), 0), 1)                   as plays_per_day,
  -- ⚠️ 이벤트 단위다. 기기 단위 비율과 섞어 읽지 말 것(이름을 갈라 둔 이유)
  round(100 * safe_divide(countif(event_name='intro_skip'), count(*)), 1) as skip_pct_events,
  countif(reach_15_2)                                                 as reach_15_2,
  countif(reach_18_9)                                                 as reach_18_9,
  -- ★ 핵심 지표 — 인트로 길이 차이에 휘둘리지 않는 조건부 생존율
  round(100 * safe_divide(countif(reach_18_9), countif(reach_15_2)), 1) as surv_15_to_18,
  -- after 전용 절대수: 자막을 끝까지 본 재생 (before 에는 대응물이 없다)
  countif(arm='after' and passed_caption)                             as seen_caption,
  round(approx_quantiles(if(event_name='intro_skip', at_s, null), 100)[offset(50)], 2) as skip_at_p50,
  count(distinct if(event_name='intro_skip',     user_pseudo_id, null)) as skip_devices,
  count(distinct if(event_name='intro_complete', user_pseudo_id, null)) as complete_devices
from tagged
group by arm
order by arm;
