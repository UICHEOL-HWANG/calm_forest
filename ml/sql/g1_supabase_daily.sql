-- G1 data reliability: KST daily coverage in the seven-day Supabase hot store.
with game as (
  select
    (created_at at time zone 'Asia/Seoul')::date as day,
    count(*) as supabase_game_rows,
    count(distinct client_id) as supabase_game_devices
  from game_logs
  group by 1
),
sessions as (
  select
    (started_at at time zone 'Asia/Seoul')::date as day,
    count(*) as supabase_sessions,
    count(distinct client_id) as supabase_session_devices
  from session_logs
  group by 1
)
select
  coalesce(game.day, sessions.day) as day,
  coalesce(supabase_game_rows, 0) as supabase_game_rows,
  coalesce(supabase_game_devices, 0) as supabase_game_devices,
  coalesce(supabase_sessions, 0) as supabase_sessions,
  coalesce(supabase_session_devices, 0) as supabase_session_devices
from game
full outer join sessions using (day)
order by day;
