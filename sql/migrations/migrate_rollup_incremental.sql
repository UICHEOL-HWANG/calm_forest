alter table public.session_logs add column if not exists server_updated_at timestamptz not null default now();
drop trigger if exists session_logs_touch on public.session_logs;
update public.session_logs set server_updated_at = least(updated_at, now());
create index if not exists idx_session_logs_server_updated on public.session_logs (server_updated_at);

create or replace function public.session_logs_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.server_updated_at := now();
  return new;
end
$$;

drop trigger if exists session_logs_touch on public.session_logs;
create trigger session_logs_touch before insert or update on public.session_logs
for each row execute function public.session_logs_touch();

create table if not exists public.cf_heat_sess (
  session_id text     not null,
  day        date     not null,
  slot       smallint not null check (slot between 0 and 3),
  map        text     not null check (map in ('main', 'dream', 'mirror')),
  persona    boolean  not null,
  gx         smallint not null,
  gz         smallint not null,
  hits       integer  not null,
  primary key (session_id, day, slot, map, persona, gx, gz)
);
create index if not exists cf_heat_sess_day_idx on public.cf_heat_sess (day);

create table if not exists public.cf_hour_sess (
  session_id text     not null,
  day        date     not null,
  hour       smallint not null check (hour between 0 and 23),
  map        text     not null check (map in ('main', 'dream', 'mirror', 'other')),
  persona    boolean  not null,
  uid        text     not null,
  hits       integer  not null,
  primary key (session_id, day, hour, map, persona, uid)
);
create index if not exists cf_hour_sess_day_idx on public.cf_hour_sess (day);

create table if not exists public.cf_rollup_state (
  id          smallint primary key check (id = 1),
  last_ts     timestamptz,
  staged_from date
);

alter table public.cf_heat_sess enable row level security;
alter table public.cf_hour_sess enable row level security;
alter table public.cf_rollup_state enable row level security;
revoke all on public.cf_heat_sess, public.cf_hour_sess, public.cf_rollup_state from anon, authenticated;

create or replace function public.cf_rollup_floor()
returns date
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (greatest((select min(created_at) from game_logs), (select min(created_at) from econ_logs)) at time zone 'Asia/Seoul')::date + 1
$$;

create or replace function public.cf_rollup_sessions(p_sessions text[], p_floor date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tz constant text := 'Asia/Seoul';
  f0 timestamptz := (p_floor::timestamp at time zone tz);
  v_days date[];
  n_sess int;
  n_path int;
begin
  if coalesce(cardinality(p_sessions), 0) = 0 then
    return jsonb_build_object('days', '[]'::jsonb, 'sessions', 0, 'zone_paths', 0);
  end if;

  with gl as (
    select session_id,
           min(created_at) as start_ts, max(created_at) as end_ts,
           (array_agg(coalesce(nullif(client_id, ''), user_id::text) order by created_at, id))[1] as uid,
           (array_agg(user_id order by created_at desc, id desc) filter (where user_id is not null))[1] as user_id,
           bool_and(coalesce(is_guest, true)) as is_guest,
           (array_agg(platform order by created_at desc, id desc) filter (where platform is not null))[1] as platform,
           (array_agg(nullif(variant, '') order by created_at desc, id desc) filter (where nullif(variant, '') is not null))[1] as variant
    from game_logs
    where session_id = any(p_sessions)
    group by session_id
  ),
  sl as (
    select session_id, user_id, client_id, is_guest, platform, variant, play_sec, counts, last_place,
           coalesce(started_at, updated_at) as started_at, updated_at
    from session_logs
    where session_id = any(p_sessions)
  ),
  j as (
    select coalesce(g.session_id, s.session_id) as session_id,
           coalesce(g.uid, nullif(s.client_id, ''), s.user_id::text) as uid,
           coalesce(g.user_id, s.user_id) as user_id,
           coalesce(g.is_guest, s.is_guest, true) as is_guest,
           coalesce(g.platform, s.platform) as platform,
           coalesce(g.variant, nullif(s.variant, ''), 'control') as variant,
           least(g.start_ts, s.started_at) as start_ts,
           greatest(g.end_ts, s.updated_at) as end_ts,
           coalesce(extract(epoch from (g.end_ts - g.start_ts)), 0)::int as dur_sec,
           s.play_sec, s.last_place,
           coalesce(s.counts, '{}'::jsonb) as counts
    from gl g full join sl s using (session_id)
  )
  insert into cf_sessions as c (session_id, uid, user_id, is_guest, platform, variant, day,
                                start_ts, end_ts, dur_sec, play_sec, last_place, counts, acq, persona, rolled_at)
  select j.session_id, j.uid, j.user_id, j.is_guest, j.platform, j.variant,
         (j.start_ts at time zone tz)::date, j.start_ts, j.end_ts, j.dur_sec, j.play_sec, j.last_place,
         j.counts, cf_is_acq(j.counts),
         coalesce(j.user_id in (select * from cf_persona_user_ids()), false),
         now()
  from j
  where j.uid is not null and j.start_ts >= f0
  on conflict (session_id) do update set
    uid = excluded.uid, user_id = excluded.user_id, is_guest = excluded.is_guest,
    platform = excluded.platform, variant = excluded.variant, day = excluded.day,
    start_ts = excluded.start_ts, end_ts = excluded.end_ts, dur_sec = excluded.dur_sec,
    play_sec = excluded.play_sec, last_place = excluded.last_place, counts = excluded.counts,
    acq = excluded.acq, persona = excluded.persona, rolled_at = excluded.rolled_at
  where c.start_ts >= f0;
  get diagnostics n_sess = row_count;

  delete from cf_heat_sess where session_id = any(p_sessions);
  delete from cf_hour_sess where session_id = any(p_sessions);
  delete from cf_session_zones where session_id = any(p_sessions) and day >= p_floor;

  with g as (
    select g.id, g.session_id, g.created_at, g.char_x as x, g.char_z as z, g.user_id,
           coalesce(nullif(g.client_id, ''), g.user_id::text) as uid,
           (g.char_z <= -380 and abs(g.char_x) <= 45) as far
    from game_logs g
    where g.session_id = any(p_sessions) and g.char_x is not null and g.char_z is not null
  ),
  r as (
    select *, sum(case when far and not coalesce(prev_far, false) then 1 else 0 end)
                over (partition by session_id order by created_at, id rows unbounded preceding) as run_no
    from (select *, lag(far) over (partition by session_id order by created_at, id) as prev_far from g) q
  ),
  st as (
    select session_id, run_no, (array_agg(z order by created_at, id))[1] as start_z,
           max(abs(x)) as max_ax, max(z) - min(z) as z_span
    from r where far group by 1, 2
  ),
  lab as (
    select r.id, r.session_id, r.created_at, r.x, r.z, r.user_id, r.uid,
           (r.far and (st.start_z > -470 or (st.max_ax <= 6.5 and st.z_span > 60))) as boat,
           case
             when not r.far then case when abs(r.x) <= 44 and abs(r.z) <= 44 then 'main' end
             when st.start_z > -470 or (st.max_ax <= 6.5 and st.z_span > 60) then null
             when abs(r.x) <= 40 and r.z between -590 and -510 then 'dream'
             when abs(r.x) <= 40 and r.z between -740 and -660 then 'mirror'
           end as map
    from r left join st using (session_id, run_no)
  ),
  pl as (
    select l.*, (pu.id is not null) as persona,
           (l.created_at at time zone tz)::date as day,
           extract(hour from l.created_at at time zone tz)::smallint as hour
    from lab l
    left join cf_persona_user_ids() pu(id) on pu.id = l.user_id
    where l.created_at >= f0
  ),
  ins_heat as (
    insert into cf_heat_sess (session_id, day, slot, map, persona, gx, gz, hits)
    select session_id, day, (hour / 6)::smallint, map, persona,
           (round(x / 2.0) * 2)::smallint,
           (round((z - case map when 'dream' then -550 when 'mirror' then -700 else 0 end) / 2.0) * 2)::smallint,
           count(*)
    from pl
    where map is not null
    group by 1, 2, 3, 4, 5, 6, 7
    returning day
  ),
  ins_hour as (
    insert into cf_hour_sess (session_id, day, hour, map, persona, uid, hits)
    select session_id, day, hour, coalesce(map, 'other'), persona, coalesce(uid, ''), count(*)
    from pl
    group by 1, 2, 3, 4, 5, 6
    returning day
  ),
  zl as (
    select id, session_id, created_at, uid, persona, day,
           case when map in ('dream', 'mirror') then map when boat then 'river' else cf_zone_of(x, z) end as zone,
           (abs(x) <= 46 and abs(z) <= 46) as inv
    from pl
  ),
  zc as (
    select session_id, day, created_at, id, zone, inv,
           case when zone is distinct from lag(zone) over (partition by session_id, day order by created_at, id) then 1 else 0 end as chg
    from zl
  ),
  zr as (
    select session_id, day, zone, inv, sum(chg) over (partition by session_id, day order by created_at, id) as run
    from zc
  ),
  zrun as (
    select session_id, day, run, zone, count(*) as len, bool_and(inv) as inv
    from zr
    where zone not in ('road', 'unknown')
    group by 1, 2, 3, 4
  ),
  zn as (
    select session_id, day, run, zone, len, inv,
           lag(zone) over (partition by session_id, day order by run) as pz,
           lead(zone) over (partition by session_id, day order by run) as nz
    from zrun
  ),
  zk as (
    select session_id, day, run, zone,
           lag(zone) over (partition by session_id, day order by run) as prev
    from zn
    where not (inv and len = 1 and pz is not null and pz = nz)
  ),
  zp as (
    select session_id, day, array_agg(zone order by run) as path
    from zk
    where prev is distinct from zone
    group by 1, 2
  ),
  zd as (
    select session_id, day, bool_or(persona) as persona, max(uid) as uid, jsonb_object_agg(zone, n) as dwell
    from (select session_id, day, zone, bool_or(persona) as persona, max(uid) as uid, count(*) as n
          from zl group by 1, 2, 3) q
    group by 1, 2
  ),
  ins_path as (
    insert into cf_session_zones (session_id, day, persona, uid, path, dwell)
    select zd.session_id, zd.day, zd.persona, zd.uid, coalesce(zp.path, '{}'), zd.dwell
    from zd left join zp using (session_id, day)
    returning day
  )
  select array(select day from ins_heat union select day from ins_hour union select day from ins_path),
         (select count(*) from ins_path)
    into v_days, n_path;

  return jsonb_build_object('days', to_jsonb(v_days), 'sessions', n_sess, 'zone_paths', n_path);
end
$$;

create or replace function public.cf_rollup_days(p_days date[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tz constant text := 'Asia/Seoul';
  lo timestamptz;
  hi timestamptz;
  n_heat int; n_slot int; n_hour int; n_econ int;
begin
  if coalesce(cardinality(p_days), 0) = 0 then
    return jsonb_build_object('heat', 0, 'heat_slot', 0, 'map_hour', 0, 'econ', 0);
  end if;
  lo := ((select min(d) from unnest(p_days) d)::timestamp at time zone tz);
  hi := (((select max(d) from unnest(p_days) d) + 1)::timestamp at time zone tz);

  delete from cf_heat_day where day = any(p_days);
  delete from cf_heat_slot where day = any(p_days);
  delete from cf_map_hour where day = any(p_days);
  delete from cf_econ_day where day = any(p_days);

  insert into cf_heat_day (day, map, persona, gx, gz, hits)
  select day, map, persona, gx, gz, sum(hits)::int
  from cf_heat_sess where day = any(p_days)
  group by 1, 2, 3, 4, 5;
  get diagnostics n_heat = row_count;

  insert into cf_heat_slot (day, slot, map, persona, gx, gz, hits)
  select day, slot, map, persona, gx, gz, sum(hits)::int
  from cf_heat_sess where day = any(p_days)
  group by 1, 2, 3, 4, 5, 6;
  get diagnostics n_slot = row_count;

  insert into cf_map_hour (day, hour, map, persona, hits, users)
  select day, hour, map, persona, sum(hits)::int, count(distinct nullif(uid, ''))
  from cf_hour_sess where day = any(p_days)
  group by 1, 2, 3, 4;
  get diagnostics n_hour = row_count;

  insert into cf_econ_day (day, source, persona, tx, inflow, outflow)
  select (e.created_at at time zone tz)::date, coalesce(nullif(e.source, ''), 'unknown'), (pu.id is not null), count(*),
         sum(case when e.amount > 0 then e.amount else 0 end),
         sum(case when e.amount < 0 then -e.amount else 0 end)
  from econ_logs e
  left join cf_persona_user_ids() pu(id) on pu.id = e.user_id
  where e.created_at >= lo and e.created_at < hi
    and (e.created_at at time zone tz)::date = any(p_days)
  group by 1, 2, 3;
  get diagnostics n_econ = row_count;

  return jsonb_build_object('heat', n_heat, 'heat_slot', n_slot, 'map_hour', n_hour, 'econ', n_econ);
end
$$;

create or replace function public.cf_rollup(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tz constant text := 'Asia/Seoul';
  v_floor date;
  v_from  date;
  v_staged date;
  t0 timestamptz;
  t1 timestamptz;
  v_sess text[];
  v_days date[];
  rs jsonb;
  rd jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('cf_rollup'));
  v_floor := cf_rollup_floor();
  v_from := greatest(p_from, coalesce(v_floor, p_from));
  if v_from > p_to then
    return jsonb_build_object('from', v_from, 'to', p_to, 'skipped', true);
  end if;
  v_floor := coalesce(v_floor, v_from);
  t0 := (v_from::timestamp at time zone tz);
  t1 := ((p_to + 1)::timestamp at time zone tz);

  select coalesce(array_agg(distinct s), '{}') into v_sess from (
    select session_id as s from game_logs
    where created_at >= t0 and created_at < t1 and session_id is not null
    union
    select session_id from session_logs
    where coalesce(started_at, updated_at) >= t0 and coalesce(started_at, updated_at) < t1
    union
    select session_id from session_logs
    where server_updated_at >= t0 and server_updated_at < t1
  ) q;

  rs := cf_rollup_sessions(v_sess, v_floor);

  insert into cf_rollup_state (id, staged_from) values (1, v_from)
  on conflict (id) do update set staged_from = least(coalesce(cf_rollup_state.staged_from, excluded.staged_from), excluded.staged_from)
  returning staged_from into v_staged;

  select coalesce(array_agg(distinct d), '{}') into v_days from (
    select jsonb_array_elements_text(rs->'days')::date as d
    union
    select generate_series(v_from, p_to, interval '1 day')::date
  ) q
  where d >= greatest(v_floor, v_staged);

  rd := cf_rollup_days(v_days);

  delete from cf_heat_sess where day < v_floor;
  delete from cf_hour_sess where day < v_floor;

  return jsonb_build_object('from', v_from, 'to', p_to, 'sessions', rs->'sessions', 'zone_paths', rs->'zone_paths') || rd;
end
$$;

create or replace function public.cf_rollup_incremental()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  tz constant text := 'Asia/Seoul';
  today date := (now() at time zone tz)::date;
  v_last timestamptz;
  v_since timestamptz;
  v_staged date;
  v_floor date;
  v_sess text[];
  v_days date[];
  rs jsonb;
  rd jsonb;
begin
  if not pg_try_advisory_xact_lock(hashtext('cf_rollup')) then
    return jsonb_build_object('skipped', 'locked');
  end if;

  select last_ts, staged_from into v_last, v_staged from cf_rollup_state where id = 1;
  v_floor := coalesce(cf_rollup_floor(), today);

  if v_last is null or v_staged is null or v_staged > v_floor then
    rs := cf_rollup(v_floor, today);
    update cf_rollup_state set last_ts = now() where id = 1;
    return rs || jsonb_build_object('bootstrap', true);
  end if;

  v_since := v_last - interval '15 minutes';

  select coalesce(array_agg(distinct s), '{}') into v_sess from (
    select session_id as s from game_logs where created_at >= v_since and session_id is not null
    union
    select session_id from session_logs where server_updated_at >= v_since
  ) q;

  rs := cf_rollup_sessions(v_sess, v_floor);

  select coalesce(array_agg(distinct d), '{}') into v_days from (
    select jsonb_array_elements_text(rs->'days')::date as d
    union
    select (created_at at time zone tz)::date from econ_logs where created_at >= v_since
    union
    select today
  ) q
  where d >= greatest(v_floor, v_staged);

  rd := cf_rollup_days(v_days);

  update cf_rollup_state set last_ts = now() where id = 1;

  return jsonb_build_object('since', v_since, 'sessions', rs->'sessions', 'zone_paths', rs->'zone_paths', 'days', to_jsonb(v_days)) || rd;
end
$$;

revoke all on function public.cf_rollup_floor() from public, anon, authenticated;
revoke all on function public.cf_rollup_sessions(text[], date) from public, anon, authenticated;
revoke all on function public.cf_rollup_days(date[]) from public, anon, authenticated;
revoke all on function public.cf_rollup(date, date) from public, anon, authenticated;
revoke all on function public.cf_rollup_incremental() from public, anon, authenticated;
revoke all on function public.cf_rollup_floor(), public.cf_rollup_sessions(text[], date), public.cf_rollup_days(date[]), public.cf_rollup_incremental() from service_role;
revoke all on function public.session_logs_touch() from public, anon, authenticated;
grant execute on function public.cf_rollup(date, date) to service_role;

select cron.unschedule(jobid) from cron.job where jobname in ('cf_rollup_recent', 'cf_rollup_incremental');
select cron.schedule('cf_rollup_incremental', '*/10 * * * *', $$select public.cf_rollup_incremental()$$);
