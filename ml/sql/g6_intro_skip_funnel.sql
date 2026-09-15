-- 인트로 퍼널: 시작 → 스킵/완주 (최근 30일)
--
-- ▶ 분모를 세션으로 내린 이유
--    30일 창에서 기기 단위로 세면 **한 기기가 스킵 세션과 완주 세션을 둘 다 가질 때
--    분모에 두 번** 들어간다(재관람이 실제로 있다 — 기기 99 < 스킵 69 + 완주 37).
--    분모가 부풀어 skip_pct 가 실제보다 낮게 나온다. 인트로 재생 1회 = ga_session_id 1개로 센다.
-- ▶ 비율 이름에 단위를 박아 둔다 — 같은 'skip_pct' 가 파일마다 다른 걸 재는 사고를 막는다.
-- ▶ 제외
--    · localhost / 127.0.0.1 — 내 개발·촬영 세션. 즉시 스킵이라 초반 구간을 통째로 부풀린다
--      (실측: 안 빼면 스킵률 65.1%, 빼면 71.6%). NULL hostname 은 coalesce 로 살린다
--    · intraday · 미래 날짜 — 당일 미확정 테이블
--    · user_id 는 쓰지 않는다 — 인트로는 로그인 전이라 대부분 null
with e as (
  select
    parse_date('%Y%m%d', _table_suffix) as d,
    user_pseudo_id,
    (select value.int_value from unnest(event_params) where key='ga_session_id') as sess,
    event_name
  from `calm-forest.analytics_547127440.events_*`
  where regexp_contains(_table_suffix, r'^\d{8}$')
    and parse_date('%Y%m%d', _table_suffix)
        between date_sub(current_date('Asia/Seoul'), interval 30 day)
            and current_date('Asia/Seoul')
    and event_name in ('intro_start','intro_skip','intro_complete')
    and coalesce(device.web_info.hostname, '') not in ('localhost', '127.0.0.1')
),
-- 세션 1개 = 인트로 재생 1회. 같은 세션에서 스킵과 완주가 둘 다 있으면 스킵으로 본다(보수적).
sess as (
  select
    user_pseudo_id, sess,
    logical_or(event_name='intro_start')    as started,
    logical_or(event_name='intro_skip')     as skipped,
    logical_or(event_name='intro_complete') as completed
  from e
  where sess is not null
  group by 1, 2
)
select
  countif(started)                                                as start_sessions,
  countif(skipped)                                                as skip_sessions,
  countif(completed and not skipped)                              as complete_sessions,
  -- 헤더대로 '시작 대비'. 종료 이벤트가 유실된 세션(이탈·크래시)은 분자에 안 들어간다
  round(100 * safe_divide(countif(skipped), countif(started)), 1)  as skip_pct_of_starts,
  -- 종료한 재생만 놓고 본 비율 — 위 값과 다른 걸 재므로 이름을 가른다
  round(100 * safe_divide(countif(skipped),
        countif(skipped) + countif(completed and not skipped)), 1) as skip_pct_of_finished,
  count(distinct user_pseudo_id)                                   as devices,
  (select min(d) from e)                                           as first_day,
  (select max(d) from e)                                           as last_day
from sess;
