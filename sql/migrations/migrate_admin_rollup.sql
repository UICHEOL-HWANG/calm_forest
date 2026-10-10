-- =============================================================
--  📦 관리자 대시보드 롤업 (2026-10-10) — dev/active/admin-dashboard-v2/
--
--  Supabase 의 로그 3종(game_logs·session_logs·econ_logs)은 매일 03:00 KST 에
--  7일 지난 행이 지워진다(ml/scripts/export_to_bq.py prune). 원본으로 30·60일을
--  계산하면 7일치만 보고, 그 이전 유저를 신규로 오인한다.
--  → 지우기 전에 작은 집계표로 말아 두고, 대시보드 RPC 는 이 표를 읽는다.
--
--  표 3종(전부 RLS on · 정책 없음 = security definer 함수로만 읽고 쓴다)
--    cf_sessions  세션 1행 — 리텐션·퍼널·북극성·시간대·세션 길이의 원천
--    cf_heat_day  (날, 맵, 격자) 이동 밀도 — 맵은 월드 좌표로 판정(js/data/places.js)
--    cf_econ_day  (날, 출처) 코인 유입·유출
--
--  cf_rollup(from, to): 원본이 온전히 남아 있는 날만 다시 집계해 덮어쓴다(멱등).
--    prune 경계 날짜는 일부만 남아 있으므로 "원본 최초일 + 1" 보다 앞은 건드리지 않는다.
-- =============================================================

create table if not exists public.cf_sessions (
  session_id  text primary key,
  uid         text        not null,                 -- 기기(client_id) 우선, 없으면 user_id — 기존 대시보드와 같은 단위
  user_id     uuid,
  is_guest    boolean     not null default true,
  platform    text,
  variant     text        not null default 'control',
  day         date        not null,                 -- 세션 시작일(KST)
  start_ts    timestamptz not null,
  end_ts      timestamptz not null,
  dur_sec     integer     not null default 0,       -- 이동 로그 첫~끝 간격
  play_sec    integer,                              -- 세션 요약의 실제 플레이 시간
  last_place  text,
  counts      jsonb       not null default '{}'::jsonb,
  acq         boolean     not null default false,   -- 획득 행동 16종(docs/analysis/METRICS_FRAMEWORK.md §2) 1회 이상
  persona     boolean     not null default false,   -- 시뮬레이터 계정(롤업 시점에 고정)
  rolled_at   timestamptz not null default now()
);
create index if not exists cf_sessions_day_idx on public.cf_sessions (day);
create index if not exists cf_sessions_uid_day_idx on public.cf_sessions (uid, day);

create table if not exists public.cf_heat_day (
  day   date     not null,
  map     text     not null check (map in ('main', 'dream', 'mirror')),
  persona boolean  not null default false,          -- 시뮬레이터 계정의 이동은 따로 쌓는다(대시보드는 기본 제외)
  gx      smallint not null,                        -- 맵 원점 기준 로컬 좌표, 2유닛 격자
  gz      smallint not null,
  hits    integer  not null,
  primary key (day, map, persona, gx, gz)
);

create table if not exists public.cf_econ_day (
  day      date    not null,
  source   text    not null,
  persona  boolean not null default false,
  tx       integer not null,
  inflow   bigint  not null,
  outflow  bigint  not null,
  primary key (day, source, persona)
);

alter table public.cf_sessions enable row level security;
alter table public.cf_heat_day enable row level security;
alter table public.cf_econ_day enable row level security;
revoke all on public.cf_sessions, public.cf_heat_day, public.cf_econ_day from anon, authenticated;

-- 획득 행동 16종 — 북극성 정의와 같은 목록(바꾸면 METRICS_FRAMEWORK.md 도 같이)
create or replace function public.cf_is_acq(c jsonb)
returns boolean language sql immutable as $$
  select exists (
    select 1 from jsonb_each_text(coalesce(c, '{}'::jsonb)) e
    where e.key in ('harvest_crop','coop_collect','honey_collect',
                    'fishing_catch','sea_catch','firefly_catch','forage_pick','mine_ore',
                    'craft_item','craft_claim','cooking_result','cafe_serve','carve_result',
                    'quest_complete','star_result','duel_result')
      and e.value ~ '^[0-9]+$' and e.value::numeric > 0)
$$;

-- 시뮬레이터(페르소나) 계정 판정 — 이메일 접두어만으로는 누구나 흉내 낼 수 있다(이메일 OTP 가입이 열려 있음).
--   접두어 + 시뮬 전용 도메인이 둘 다 맞아야 한다. 도메인은 PUBLIC 저장소에 두지 않고 이 표에만 넣는다(풀러로 직접 insert).
create table if not exists public.cf_persona_domains (domain text primary key);
alter table public.cf_persona_domains enable row level security;
revoke all on public.cf_persona_domains from anon, authenticated;

create or replace function public.cf_persona_user_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select u.id from auth.users u
  join cf_persona_domains d on lower(split_part(u.email, '@', 2)) = d.domain
  where u.email like 'persona-%'
$$;
revoke all on function public.cf_persona_user_ids() from public, anon, authenticated;

-- 맵 판정은 cf_rollup 안에서 한다(아래 '맵별 이동 밀도').
--   좌표만으로는 안 된다: 강 나룻배 코스(z -408 ~ -1028, |x|≤6.4)가 꿈의 숲(0,-550)·거울 마을(0,-700)과
--   월드 좌표가 겹친다. 그래서 세션 안에서 '먼 구역(z ≤ -380)' 방문 구간을 묶고, 구간의 첫 위치로 가른다 —
--   나룻배는 늘 나루터(z≈-400)에서 출발해 이어서 내려가고, 꿈·거울은 착지점(z < -470)으로 순간이동해 시작한다.

create or replace function public.cf_rollup(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tz constant text := 'Asia/Seoul';
  v_floor date;
  v_from  date;
  t0 timestamptz;
  t1 timestamptz;
  n_sess int; n_heat int; n_econ int;
begin
  -- 같은 날을 두 곳(대시보드 열기·03:00 적재)이 동시에 지우고 다시 넣으면 PK 충돌 → 한 번에 하나만
  perform pg_advisory_xact_lock(hashtext('cf_rollup'));
  -- prune 경계 날은 일부만 남아 있다 → 원본 최초일 다음 날부터만 집계(로그 두 종 중 늦게 시작한 쪽 기준)
  select (greatest((select min(created_at) from game_logs), (select min(created_at) from econ_logs)) at time zone tz)::date + 1
    into v_floor;
  v_from := greatest(p_from, coalesce(v_floor, p_from));
  if v_from > p_to then
    return jsonb_build_object('from', v_from, 'to', p_to, 'skipped', true);
  end if;
  t0 := (v_from::timestamp at time zone tz);
  t1 := ((p_to + 1)::timestamp at time zone tz);

  -- ── 세션: 이동 로그(시작·끝·기기) + 세션 요약(카운트·플레이 시간) ──
  with gl as (
    select session_id,
           min(created_at) as start_ts, max(created_at) as end_ts,
           (array_agg(coalesce(nullif(client_id, ''), user_id::text) order by created_at))[1] as uid,
           (array_agg(user_id order by created_at desc) filter (where user_id is not null))[1] as user_id,
           bool_and(coalesce(is_guest, true)) as is_guest,
           (array_agg(platform order by created_at desc) filter (where platform is not null))[1] as platform,
           (array_agg(nullif(variant, '') order by created_at desc) filter (where nullif(variant, '') is not null))[1] as variant
    from game_logs
    where created_at >= t0 - interval '1 day' and created_at < t1 + interval '1 day'
      and session_id is not null
    group by session_id
  ),
  sl as (
    select session_id, user_id, client_id, is_guest, platform, variant, play_sec, counts, last_place,
           coalesce(started_at, updated_at) as started_at, updated_at
    from session_logs
    where coalesce(started_at, updated_at) >= t0 - interval '1 day'
      and coalesce(started_at, updated_at) <  t1 + interval '1 day'
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
  where j.uid is not null and j.start_ts >= t0 and j.start_ts < t1
  on conflict (session_id) do update set
    uid = excluded.uid, user_id = excluded.user_id, is_guest = excluded.is_guest,
    platform = excluded.platform, variant = excluded.variant, day = excluded.day,
    start_ts = excluded.start_ts, end_ts = excluded.end_ts, dur_sec = excluded.dur_sec,
    play_sec = excluded.play_sec, last_place = excluded.last_place, counts = excluded.counts,
    acq = excluded.acq, persona = excluded.persona, rolled_at = excluded.rolled_at;
  get diagnostics n_sess = row_count;

  -- ── 맵별 이동 밀도: 날 단위로 통째 교체 ──
  delete from cf_heat_day where day between v_from and p_to;
  insert into cf_heat_day (day, map, persona, gx, gz, hits)
  with g as (
    select g.session_id, g.created_at, g.char_x as x, g.char_z as z, g.user_id,
           (g.char_z <= -380 and abs(g.char_x) <= 45) as far
    from game_logs g
    -- 자정을 넘긴 나룻배 구간이 다음 날 '강 한가운데에서 시작'한 것처럼 보이지 않게 앞 3시간을 맥락으로 읽는다(집계는 t0 부터)
    where g.created_at >= t0 - interval '3 hours' and g.created_at < t1 and g.char_x is not null and g.char_z is not null
  ),
  r as (   -- 먼 구역에 새로 들어설 때마다 구간 번호를 올린다
    select *, sum(case when far and not coalesce(prev_far, false) then 1 else 0 end)
                over (partition by session_id order by created_at rows unbounded preceding) as run_no
    from (select *, lag(far) over (partition by session_id order by created_at) as prev_far from g) q
  ),
  st as (
    select session_id, run_no, (array_agg(z order by created_at))[1] as start_z,
           max(abs(x)) as max_ax, max(z) - min(z) as z_span
    from r where far group by 1, 2
  ),
  lab as (
    select r.created_at, r.x, r.z, r.user_id,
           case
             when not r.far then case when abs(r.x) <= 44 and abs(r.z) <= 44 then 'main' end
             -- 나룻배(강 코스): 나루터 근처에서 시작했거나, 강폭(|x|≤6.4) 안에서만 60유닛 넘게 내려간 구간
             --   (로그가 듬성듬성해 첫 기록이 -470 아래로 찍혀도 강 띠 모양이면 잡힌다)
             when st.start_z > -470 or (st.max_ax <= 6.5 and st.z_span > 60) then null
             when abs(r.x) <= 40 and r.z between -590 and -510 then 'dream'
             when abs(r.x) <= 40 and r.z between -740 and -660 then 'mirror'
           end as map
    from r left join st using (session_id, run_no)
  )
  select (l.created_at at time zone tz)::date, l.map, (pu.id is not null),
         (round(l.x / 2.0) * 2)::smallint,
         (round((l.z - case l.map when 'dream' then -550 when 'mirror' then -700 else 0 end) / 2.0) * 2)::smallint,
         count(*)
  from lab l
  left join cf_persona_user_ids() pu(id) on pu.id = l.user_id
  where l.map is not null and l.created_at >= t0
  group by 1, 2, 3, 4, 5;
  get diagnostics n_heat = row_count;

  -- ── 경제 ──
  delete from cf_econ_day where day between v_from and p_to;
  insert into cf_econ_day (day, source, persona, tx, inflow, outflow)
  select (e.created_at at time zone tz)::date, coalesce(nullif(e.source, ''), 'unknown'), (pu.id is not null), count(*),
         sum(case when e.amount > 0 then e.amount else 0 end),
         sum(case when e.amount < 0 then -e.amount else 0 end)
  from econ_logs e
  left join cf_persona_user_ids() pu(id) on pu.id = e.user_id
  where e.created_at >= t0 and e.created_at < t1
  group by 1, 2, 3;
  get diagnostics n_econ = row_count;

  return jsonb_build_object('from', v_from, 'to', p_to, 'sessions', n_sess, 'heat', n_heat, 'econ', n_econ);
end;
$$;

revoke all on function public.cf_rollup(date, date) from public, anon, authenticated;
grant execute on function public.cf_rollup(date, date) to service_role;
revoke all on function public.cf_is_acq(jsonb) from public, anon, authenticated;
drop function if exists public.cf_map_of(double precision, double precision);
