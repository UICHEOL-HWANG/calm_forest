-- 인트로 스킵 시점 분포 (이벤트 단위, 최근 30일)
-- 제외 기준
--   · localhost — 내 개발·촬영 세션. 즉시 스킵이라 초반 구간을 통째로 부풀린다
--   · intraday / 미래 날짜 — 당일 미확정 테이블
select
  parse_date('%Y%m%d', _table_suffix) as d,
  device.web_info.hostname as host,
  user_pseudo_id,
  (select coalesce(cast(value.int_value as float64), value.double_value, value.float_value)
     from unnest(event_params) where key = 'at_s') as at_s
from `calm-forest.analytics_547127440.events_*`
where regexp_contains(_table_suffix, r'^\d{8}$')
  and parse_date('%Y%m%d', _table_suffix)
      between date_sub(current_date('Asia/Seoul'), interval 30 day)
          and current_date('Asia/Seoul')
  and event_name = 'intro_skip'
  and coalesce(device.web_info.hostname, '') not in ('localhost', '127.0.0.1');
