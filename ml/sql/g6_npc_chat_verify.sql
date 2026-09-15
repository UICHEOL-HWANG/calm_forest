-- 💬 잡담 트래킹 재검증 — 배포 다음 날 실행한다(GA4 export 는 일별).
--  ⚠️ 이름을 두 벌 본다:
--     · 2026-09-15 첫 배포분은 `npc_talk_*` 로 나갔다
--     · 이름 정리 배포 뒤부터 `npc_chat_*`
--     둘 다 0 이면 전송 자체가 안 된 것이고, `npc_talk_` 만 나오면 이름 정리가 아직 안 나간 것이다.
--     `starts_with('npc_talk_')` 의 **밑줄이 핵심** — 밑줄이 없으면 퀘스트 `npc_talk` 까지 빨려 든다.
--  ▶ 파라미터 누락은 배포 후 되돌릴 수 없다. 이벤트별로 '그 이벤트가 보내야 하는 키'만 센다
--    (모든 행에서 전부 세면 npc_chat_open 의 miss_turn 이 항상 100% 로 나와 경보처럼 보인다).
--  ▶ 제외: localhost(개발·촬영 세션) · intraday · 미래 날짜. NULL hostname 은 coalesce 로 살린다.
with e as (
  select
    event_name,
    parse_date('%Y%m%d', _table_suffix) as d,
    user_pseudo_id,
    (select count(*) from unnest(event_params) where key='npc')         as has_npc,
    (select count(*) from unnest(event_params) where key='lang')        as has_lang,
    (select count(*) from unnest(event_params) where key='set_index')   as has_set_index,
    (select count(*) from unnest(event_params) where key='turn')        as has_turn,
    (select count(*) from unnest(event_params) where key='choice')      as has_choice,
    (select count(*) from unnest(event_params) where key='duration_ms') as has_duration,
    (select count(*) from unnest(event_params) where key='reason')      as has_reason
  from `calm-forest.analytics_547127440.events_*`
  where regexp_contains(_table_suffix, r'^\d{8}$')
    and parse_date('%Y%m%d', _table_suffix) >= date '2026-09-15'
    and parse_date('%Y%m%d', _table_suffix) <= current_date('Asia/Seoul')
    and (starts_with(event_name, 'npc_chat') or starts_with(event_name, 'npc_talk_'))
    and coalesce(device.web_info.hostname, '') not in ('localhost', '127.0.0.1')
)
select
  event_name,
  d,
  count(*)                       as events,
  count(distinct user_pseudo_id) as devices,
  -- 각 키는 그 키를 보내야 하는 이벤트에서만 센다. 0 이 아니면 그 기간 데이터는 못 고친다.
  countif(has_npc = 0)                                                     as miss_npc,
  countif(ends_with(event_name,'_open')      and has_lang = 0)             as miss_lang,
  countif(ends_with(event_name,'_open')      and has_set_index = 0)        as miss_set_index,
  countif(ends_with(event_name,'_turn')      and has_turn = 0)             as miss_turn,
  countif(ends_with(event_name,'_turn')      and has_choice = 0)           as miss_choice,
  countif(ends_with(event_name,'_done')      and has_duration = 0)         as miss_duration,
  countif(ends_with(event_name,'_empty')     and has_reason = 0)           as miss_reason
from e
group by 1, 2
order by d, event_name;
