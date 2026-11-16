begin;
set local lock_timeout = '3s';

alter table public.push_tokens add column if not exists market_week int;

alter table public.push_logs drop constraint if exists push_logs_kind_check;
alter table public.push_logs add constraint push_logs_kind_check check (kind in ('night', 'craft', 'return', 'pond', 'market', 'season'));

create or replace function public.push_market_candidates(p_week int, p_today date, p_limit int default 100)
returns table (token text, user_id uuid, lang text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.token, c.user_id, c.lang, c.updated_at from (
  select distinct on (t.user_id) t.token, t.user_id, t.lang, s.updated_at
  from public.push_tokens t
  join public.game_saves s on s.user_id = t.user_id
  where t.enabled
    and t.last_checked_on = p_today
    and not exists (select 1 from public.push_tokens j where j.user_id = t.user_id and j.enabled and (j.last_checked_on is null or j.last_checked_on < p_today))
    and s.updated_at >= (p_today::timestamp at time zone 'Asia/Seoul') - interval '14 days'
    and s.updated_at < (p_today::timestamp at time zone 'Asia/Seoul')
    and not exists (select 1 from public.push_tokens m where m.user_id = t.user_id and m.market_week = p_week)
    and not exists (select 1 from public.push_logs l where l.user_id = t.user_id and l.sent_on = p_today and l.status = 'sent')
  order by t.user_id, t.updated_at desc
  ) c
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 1000);
$$;

create or replace function public.push_market_mark(p_week int, p_checked text[], p_dead text[])
returns void
language sql security definer set search_path = public as $$
  update public.push_tokens set market_week = p_week
   where user_id in (select user_id from public.push_tokens where token = any(coalesce(p_checked, '{}')));
  delete from public.push_tokens where token = any(coalesce(p_dead, '{}'));
$$;

revoke all on function public.push_market_candidates(int, date, int) from public, anon, authenticated;
revoke all on function public.push_market_mark(int, text[], text[]) from public, anon, authenticated;
grant execute on function public.push_market_candidates(int, date, int) to service_role;
grant execute on function public.push_market_mark(int, text[], text[]) to service_role;

commit;
