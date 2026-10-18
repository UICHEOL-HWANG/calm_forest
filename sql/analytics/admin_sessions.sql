create or replace function public.cf_admin_sessions(days int default 7, zone_last text default null, seg text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tz constant text := 'Asia/Seoul';
  since date;
begin
  if not public.cf_is_admin() then
    raise exception '권한 없음: 관리자만 조회할 수 있습니다.';
  end if;
  since := (now() at time zone tz)::date - (least(greatest(coalesce(days, 7), 1), 60) - 1);
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'session_id', q.session_id, 'uid', left(q.uid, 6) || '…', 'day', q.day, 'start', q.start_ts,
             'sec', q.sec, 'acq', q.acq, 'is_new', q.is_new, 'path', q.path) order by q.start_ts desc), '[]'::jsonb)
    from (
      select z.session_id, coalesce(cs.uid, z.uid) as uid, z.day, coalesce(cs.start_ts, z.day::timestamp at time zone tz) as start_ts,
             coalesce(nullif(cs.play_sec, 0), cs.dur_sec) as sec, coalesce(cs.acq, false) as acq,
             (coalesce(cs.day, z.day) = f.first_day) as is_new, z.path
      from cf_session_zones z
      left join cf_sessions cs on cs.session_id = z.session_id
      left join (select uid, min(day) as first_day from cf_sessions where not persona group by uid) f on f.uid = coalesce(cs.uid, z.uid)
      where not z.persona and z.day >= since and cardinality(z.path) > 0
        and (zone_last is null or z.path[cardinality(z.path)] = zone_last)
        and (seg is null or seg = 'all' or (seg = 'new') = (coalesce(cs.day, z.day) = f.first_day))
      order by start_ts desc
      limit 60
    ) q
  );
end;
$$;

create or replace function public.cf_admin_session_track(p_session text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  step int;
  t0 timestamptz;
begin
  if not public.cf_is_admin() then
    raise exception '권한 없음: 관리자만 조회할 수 있습니다.';
  end if;
  select count(*), min(created_at) into n, t0 from game_logs where session_id = p_session and char_x is not null and char_z is not null;
  step := greatest(1, ceil(n / 1500.0)::int);
  return jsonb_build_object(
    'start', t0,
    'total', n,
    'points', (select coalesce(jsonb_agg(jsonb_build_array(round(extract(epoch from (created_at - t0)))::int,
                                                           round(char_x::numeric, 1), round(char_z::numeric, 1)) order by created_at, id), '[]'::jsonb)
               from (select created_at, id, char_x, char_z, row_number() over (order by created_at, id) as rn
                     from game_logs where session_id = p_session and char_x is not null and char_z is not null) g
               where (rn - 1) % step = 0 or rn = n));
end;
$$;

revoke all on function public.cf_admin_sessions(int, text, text) from public, anon;
revoke all on function public.cf_admin_session_track(text) from public, anon;
grant execute on function public.cf_admin_sessions(int, text, text) to authenticated;
grant execute on function public.cf_admin_session_track(text) to authenticated;
