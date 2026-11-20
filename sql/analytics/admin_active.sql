create or replace function public.cf_admin_active(token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
  today date := (now() at time zone 'Asia/Seoul')::date;
  since date;
  result jsonb;
begin
  if public.cf_is_admin() then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s
       set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_admin_active.token and s.expires_at > now();
    allowed := found;
  end if;
  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  since := today - 149;

  with
  s as (select uid, day, platform from cf_sessions where not persona),
  ud as (select uid, day from s where day >= since - 29 group by uid, day),
  fs as (select uid, min(day) as first_day from s group by uid),
  ds as (select g::date as d from generate_series(since, today, interval '1 day') g),
  series as (
    select ds.d,
           (select count(*) from ud where ud.day = ds.d) as dau,
           (select count(distinct ud.uid) from ud where ud.day between ds.d - 6 and ds.d) as wau,
           (select count(distinct ud.uid) from ud where ud.day between ds.d - 29 and ds.d) as mau,
           (select count(*) from fs where fs.first_day = ds.d) as new_users
    from ds
  ),
  plat as (
    select coalesce(platform, 'unknown') as platform,
           count(distinct uid) filter (where day = today - 1) as dau,
           count(distinct uid) filter (where day >= today - 7) as wau,
           count(distinct uid) as mau
    from s
    where day between today - 30 and today - 1
    group by 1
  )
  select jsonb_build_object(
    'today', today,
    'series', (select jsonb_agg(jsonb_build_object('d', d, 'dau', dau, 'wau', wau, 'mau', mau, 'new', new_users) order by d) from series),
    'platforms', (select coalesce(jsonb_agg(jsonb_build_object('platform', platform, 'dau', dau, 'wau', wau, 'mau', mau) order by mau desc), '[]'::jsonb) from plat)
  ) into result;

  return result;
end;
$$;

revoke all on function public.cf_admin_active(text) from public;
grant execute on function public.cf_admin_active(text) to authenticated, anon;
