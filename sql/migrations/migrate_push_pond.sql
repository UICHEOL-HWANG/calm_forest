begin;

do $$
declare c text;
begin
  for c in select conname from pg_constraint where conrelid = 'public.push_logs'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%kind%' loop
    execute format('alter table public.push_logs drop constraint %I', c);
  end loop;
end $$;
alter table public.push_logs add constraint push_logs_kind_check check (kind in ('night', 'craft', 'return', 'pond', 'market', 'season'));

drop function if exists public.push_candidates(date, int);
create or replace function public.push_candidates(p_today date, p_limit int default 100)
returns table (
  token text, user_id uuid, lang text, updated_at timestamptz,
  plots jsonb, outdoor jsonb, truce jsonb, night_last text, craft jsonb, returns_7d int, pond_day text
)
language sql stable security definer set search_path = public as $$
  select c.token, c.user_id, c.lang, c.updated_at, c.plots, c.outdoor, c.truce, c.night_last, c.craft, c.returns_7d, c.pond_day from (
  select distinct on (t.user_id)
         t.token, t.user_id, t.lang, s.updated_at,
         s.state -> 'plots' as plots, s.state -> 'outdoor' as outdoor, s.state -> 'night' -> 'truce' as truce,
         s.state -> 'night' ->> 'lastDate' as night_last, s.state -> 'craft' as craft,
         (select count(*)::int from public.push_logs l
           where l.user_id = t.user_id and l.kind = 'return' and l.status = 'sent'
             and l.sent_at > now() - interval '7 days') as returns_7d,
         s.state -> 'hintsSeen' ->> 'pondDay' as pond_day
  from public.push_tokens t
  join public.game_saves s on s.user_id = t.user_id
  where t.enabled and (t.last_checked_on is null or t.last_checked_on < p_today)
  order by t.user_id, t.updated_at desc
  ) c
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.push_candidates(date, int) from public, anon, authenticated;
grant execute on function public.push_candidates(date, int) to service_role;

commit;
