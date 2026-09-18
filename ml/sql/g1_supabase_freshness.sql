-- G1 data reliability: hot-store freshness only.
-- Supabase retains roughly seven days, so these counts are never used as full-history totals.
select 'Supabase game_logs' as source, count(*) as row_count,
       count(distinct client_id) as devices, count(distinct session_id) as sessions,
       min(created_at) as first_at, max(created_at) as last_at
from game_logs
union all
select 'Supabase econ_logs', count(*), count(distinct client_id), count(distinct session_id),
       min(created_at), max(created_at)
from econ_logs
union all
select 'Supabase session_logs', count(*), count(distinct client_id), count(distinct session_id),
       min(started_at), max(updated_at)
from session_logs
order by source;
