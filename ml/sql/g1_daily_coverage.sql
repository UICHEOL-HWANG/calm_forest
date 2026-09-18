-- G1 data reliability: comparable daily device coverage by source.
-- GA4 uses user_pseudo_id; mirrored game/session logs use persistent client_id.
with ga4 as (
  select
    parse_date('%Y%m%d', event_date) as day,
    count(*) as ga4_events,
    count(distinct user_pseudo_id) as ga4_devices
  from `calm-forest.analytics_547127440.events_*`
  where regexp_contains(_table_suffix, r'^\d{8}$')
    and parse_date('%Y%m%d', event_date) <= current_date('Asia/Seoul')
  group by 1
),
game as (
  select
    date(created_at, 'Asia/Seoul') as day,
    count(*) as game_rows,
    count(distinct client_id) as game_devices
  from `calm-forest.calm_forest_raw.game_logs`
  where date(created_at, 'Asia/Seoul') <= current_date('Asia/Seoul')
  group by 1
),
session_latest as (
  select *
  from `calm-forest.calm_forest_raw.session_logs`
  where date(updated_at, 'Asia/Seoul') <= current_date('Asia/Seoul')
  qualify row_number() over (
    partition by session_id order by updated_at desc
  ) = 1
),
sessions as (
  select
    date(started_at, 'Asia/Seoul') as day,
    count(*) as session_count,
    count(distinct client_id) as session_devices
  from session_latest
  group by 1
)
select
  coalesce(ga4.day, game.day, sessions.day) as day,
  coalesce(ga4_events, 0) as ga4_events,
  coalesce(ga4_devices, 0) as ga4_devices,
  coalesce(game_rows, 0) as game_rows,
  coalesce(game_devices, 0) as game_devices,
  coalesce(session_count, 0) as session_count,
  coalesce(session_devices, 0) as session_devices
from ga4
full outer join game using (day)
full outer join sessions using (day)
order by day;
