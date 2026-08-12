-- =============================================================
--  calm forest · 관리자 전체통계용 보안 함수 (security definer)
--  ------------------------------------------------------------
--  브라우저(로그인 유저)는 RLS 때문에 본인 데이터만 보이지만,
--  아래 함수는 security definer(소유자 권한)로 실행돼 RLS를 우회해
--  "전체 유저 집계"를 돌려줍니다. 단, 함수 안에서 호출자의 이메일이
--  관리자 허용목록에 있는지 검사해 아무나 못 부르게 막습니다.
--
--  실행: Supabase SQL Editor 에 붙여넣고 Run (한 번).
--  ★ 관리자 이메일을 본인 계정으로 바꾸세요(아래 ARRAY 부분).
--
--  ── 분석 설계 노트 ────────────────────────────────────────────
--  ▶ 유저 식별은 client_id(기기 영구 ID) 기준입니다.
--    게스트는 재방문마다 새 익명 user_id 가 발급되므로(supabase-client.js
--    "게스트 재방문 → 이전 익명 세션 정리"), user_id 로 세면 같은 사람이
--    올 때마다 신규로 잡혀 DAU/리텐션이 부풀려집니다.
--  ▶ 날짜 버킷은 KST(Asia/Seoul). UTC 로 자르면 한국 유저의 밤 플레이가
--    다음날로 넘어가 일별 추이가 왜곡됩니다.
--  ▶ 활동의 원천은 game_logs(플레이 중 상시 적재). session_logs 는
--    플레이타임·이벤트 카운트 같은 세션 품질 지표에만 사용합니다.
--  ▶ 리텐션 분모는 "관측 기간이 충분히 지난 코호트"만 포함합니다
--    (예: D7 은 첫 접속 후 7일이 지난 유저만).
-- =============================================================

-- 시그니처가 바뀌었으므로(무인자 → days 파라미터) 구버전 제거
drop function if exists public.cf_admin_overview();

create or replace function public.cf_admin_overview(days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text[] := array['icuchoel@gmail.com'];  -- ★ 관리자 이메일(소문자)
  tz constant text := 'Asia/Seoul';
  today date;
  since date;
  result jsonb;
begin
  -- 관리자 아니면 차단
  if not (caller_email = any (admins)) then
    raise exception '권한 없음: 관리자만 조회할 수 있습니다.';
  end if;

  days  := greatest(1, least(coalesce(days, 30), 365));
  today := (now() at time zone tz)::date;
  since := today - (days - 1);

  with
  -- ── 활동 원장: 기기 단위(uid) 로 정규화 ──────────────────────
  act as (
    select coalesce(nullif(client_id, ''), user_id::text) as uid,
           session_id,
           ((created_at at time zone tz))::date          as day,
           (created_at at time zone tz)                  as ts_local,
           coalesce(is_guest, true)                      as is_guest,
           coalesce(nullif(variant, ''), 'control')      as variant
    from game_logs
    where coalesce(nullif(client_id, ''), user_id::text) is not null
  ),
  first_seen as (
    select uid, min(day) as first_day from act group by uid
  ),
  -- 유저×일 (중복 제거된 활동 매트릭스)
  ud as (
    select distinct uid, day from act
  ),
  -- ── 일별 트래픽 ─────────────────────────────────────────────
  daily as (
    select d.day,
           count(distinct d.uid)                                    as dau,
           count(distinct d.uid) filter (where f.first_day = d.day) as new_users,
           count(distinct d.uid) filter (where f.first_day < d.day) as returning_users
    from ud d join first_seen f using (uid)
    where d.day >= since
    group by d.day
  ),
  daily_sessions as (
    select day, count(distinct session_id) as sessions
    from act where day >= since group by day
  ),
  daily_play as (
    select ((coalesce(started_at, updated_at) at time zone tz))::date as day,
           round(avg(nullif(play_sec, 0)))::int as avg_play_sec,
           percentile_cont(0.5) within group (order by nullif(play_sec, 0))::int as med_play_sec
    from session_logs
    where ((coalesce(started_at, updated_at) at time zone tz))::date >= since
    group by 1
  ),
  -- ── 요일×시간 접속 분포(KST) ─────────────────────────────────
  hourly as (
    select extract(dow  from ts_local)::int as dow,
           extract(hour from ts_local)::int as hour,
           count(distinct session_id)       as sessions
    from act where day >= since group by 1, 2
  ),
  -- ── 리텐션(D1/D3/D7) — 관측 기간이 지난 코호트만 분모에 포함 ──
  ret as (
    select
      count(*) filter (where f.first_day <= today - 1) as base_d1,
      count(*) filter (where f.first_day <= today - 3) as base_d3,
      count(*) filter (where f.first_day <= today - 7) as base_d7,
      count(*) filter (where f.first_day <= today - 1
        and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 1)) as ret_d1,
      count(*) filter (where f.first_day <= today - 3
        and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 3)) as ret_d3,
      count(*) filter (where f.first_day <= today - 7
        and exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 7)) as ret_d7
    from first_seen f
  ),
  -- ── 주간 코호트 리텐션(최근 8주) ─────────────────────────────
  cohort as (
    select date_trunc('week', f.first_day)::date   as cohort_week,
           (floor((u.day - f.first_day) / 7))::int as week_no,
           count(distinct u.uid)                   as users
    from first_seen f join ud u using (uid)
    where f.first_day >= today - 56
    group by 1, 2
  ),
  cohort_size as (
    select date_trunc('week', first_day)::date as cohort_week, count(*) as size
    from first_seen where first_day >= today - 56 group by 1
  ),
  -- ── 세션 길이 분포 ───────────────────────────────────────────
  sess_dur as (
    select session_id, extract(epoch from (max(created_at) - min(created_at))) as dsec
    from game_logs group by session_id
  ),
  buckets as (
    select b.bucket, count(*) as sessions, min(b.ord) as ord
    from sess_dur s
    cross join lateral (select case
        when s.dsec <  30 then '0-30초'  when s.dsec <  60 then '30-60초'
        when s.dsec < 180 then '1-3분'   when s.dsec < 600 then '3-10분'
        else '10분+' end as bucket,
      case when s.dsec <  30 then 1 when s.dsec <  60 then 2
           when s.dsec < 180 then 3 when s.dsec < 600 then 4 else 5 end as ord) b
    group by b.bucket
  ),
  -- ── 행동 이벤트 Top (session_logs.counts jsonb 합산) ─────────
  events as (
    select e.key as event, sum(e.value::numeric)::bigint as n
    from session_logs sl, jsonb_each_text(coalesce(sl.counts, '{}'::jsonb)) e
    where e.value ~ '^[0-9]+$'
    group by e.key order by n desc limit 18
  ),
  -- ── 마지막 체류 장소 ─────────────────────────────────────────
  places as (
    select coalesce(nullif(last_place, ''), 'unknown') as place, count(*) as sessions
    from session_logs group by 1
  ),
  -- ── 진행도(게임 세이브 기반) ─────────────────────────────────
  saves as (
    select user_id,
           coalesce((state ->> 'houseStage')::int, 0)                          as house_stage,
           nullif(state ->> 'character', '')                                   as character,
           coalesce((state ->> 'tutorialSeen')::boolean, false)                as tutorial,
           coalesce((state -> 'daily' ->> 'streak')::int, 0)                   as streak,
           coalesce((state -> 'inventory' ->> 'coins')::int, 0)                as coins,
           (select coalesce(sum((select count(*) from jsonb_object_keys(c.value))), 0)
              from jsonb_each(coalesce(state -> 'dex', '{}'::jsonb)) c)        as dex_count,
           (select count(*) from jsonb_object_keys(coalesce(state -> 'badges', '{}'::jsonb))) as badge_count
    from game_saves
  ),
  -- ── 경제: 일별 / 출처별 ──────────────────────────────────────
  econ_daily as (
    select ((created_at at time zone tz))::date as day,
           sum(case when amount > 0 then  amount else 0 end)::bigint as inflow,
           sum(case when amount < 0 then -amount else 0 end)::bigint as outflow
    from econ_logs
    where ((created_at at time zone tz))::date >= since
    group by 1
  ),
  econ_src as (
    select source,
           count(*)::bigint                                         as tx,
           sum(case when amount > 0 then  amount else 0 end)::bigint as inflow,
           sum(case when amount < 0 then -amount else 0 end)::bigint as outflow
    from econ_logs group by source order by sum(abs(amount)) desc limit 14
  )
  select jsonb_build_object(
    'meta', jsonb_build_object('days', days, 'today', today, 'since', since, 'tz', tz),

    -- ── 헤드라인 KPI ──
    'kpis', (
      select jsonb_build_object(
        'dau',        (select count(distinct uid) from ud where day = today),
        'dau_prev',   (select count(distinct uid) from ud where day = today - 1),
        'wau',        (select count(distinct uid) from ud where day >  today - 7),
        'mau',        (select count(distinct uid) from ud where day >  today - 30),
        'stickiness', (select round(100.0 * (select count(distinct uid) from ud where day = today)
                                   / nullif((select count(distinct uid) from ud where day > today - 30), 0), 1)),
        'new_today',  (select count(*) from first_seen where first_day = today),
        'users',      (select count(*) from first_seen),
        'sessions',   (select count(distinct session_id) from act),
        'samples',    (select count(*) from act),
        'avg_session_sec', (select round(avg(dsec))::int from sess_dur where dsec > 0),
        'med_session_sec', (select percentile_cont(0.5) within group (order by dsec)::int from sess_dur where dsec > 0),
        -- 재방문율: "서로 다른 날 2일 이상 접속"(세션 2회보다 엄격한 진짜 복귀 신호)
        'returning_pct', (
          select round(100.0 * count(*) filter (where d >= 2) / nullif(count(*), 0), 1)
          from (select uid, count(*) d from ud group by uid) t
        )
      )
    ),

    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day, 'dau', d.dau, 'new_users', d.new_users, 'returning', d.returning_users,
        'sessions', coalesce(s.sessions, 0), 'avg_play_sec', coalesce(p.avg_play_sec, 0),
        'med_play_sec', coalesce(p.med_play_sec, 0)) order by d.day), '[]'::jsonb)
      from daily d
      left join daily_sessions s using (day)
      left join daily_play p using (day)
    ),

    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'sessions', sessions)), '[]'::jsonb) from hourly),

    'retention', (
      select jsonb_build_object(
        'd1', round(100.0 * ret_d1 / nullif(base_d1, 0), 1), 'd1_base', base_d1,
        'd3', round(100.0 * ret_d3 / nullif(base_d3, 0), 1), 'd3_base', base_d3,
        'd7', round(100.0 * ret_d7 / nullif(base_d7, 0), 1), 'd7_base', base_d7
      ) from ret
    ),

    'cohorts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'cohort', c.cohort_week, 'week', c.week_no, 'users', c.users,
        'size', z.size, 'pct', round(100.0 * c.users / nullif(z.size, 0), 1)) order by c.cohort_week, c.week_no), '[]'::jsonb)
      from cohort c join cohort_size z using (cohort_week)
    ),

    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('gx', gx, 'gz', gz, 'hits', hits)), '[]'::jsonb)
      from (select round(char_x / 2.0) * 2 as gx, round(char_z / 2.0) * 2 as gz, count(*) as hits
            from game_logs group by 1, 2) h
    ),

    'session_buckets', (select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'sessions', sessions) order by ord), '[]'::jsonb) from buckets),
    'events',          (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) order by n desc), '[]'::jsonb) from events),
    'places',          (select coalesce(jsonb_agg(jsonb_build_object('place', place, 'sessions', sessions) order by sessions desc), '[]'::jsonb) from places),

    -- ── 온보딩/진행 퍼널 ──
    'funnel', (
      select jsonb_build_object(
        'saves',     count(*),
        'character', count(*) filter (where character is not null),
        'tutorial',  count(*) filter (where tutorial),
        'house1',    count(*) filter (where house_stage >= 1),
        'house3',    count(*) filter (where house_stage >= 3),
        'dex5',      count(*) filter (where dex_count >= 5),
        'badge1',    count(*) filter (where badge_count >= 1)
      ) from saves
    ),
    'house_stages', (
      select coalesce(jsonb_agg(jsonb_build_object('stage', house_stage, 'users', users) order by house_stage), '[]'::jsonb)
      from (select house_stage, count(*) as users from saves group by 1) s
    ),
    'dex_dist', (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'users', users) order by ord), '[]'::jsonb)
      from (
        select case when dex_count = 0 then '0종' when dex_count < 5 then '1-4종'
                    when dex_count < 10 then '5-9종' when dex_count < 20 then '10-19종'
                    else '20종+' end as bucket,
               case when dex_count = 0 then 1 when dex_count < 5 then 2
                    when dex_count < 10 then 3 when dex_count < 20 then 4 else 5 end as ord,
               count(*) as users
        from saves group by 1, 2
      ) d
    ),
    'badge_dist', (
      select coalesce(jsonb_agg(jsonb_build_object('badges', badge_count, 'users', users) order by badge_count), '[]'::jsonb)
      from (select badge_count, count(*) as users from saves group by 1) b
    ),
    'characters', (
      select coalesce(jsonb_agg(jsonb_build_object('character', character, 'users', users) order by users desc), '[]'::jsonb)
      from (select character, count(*) as users from saves where character is not null group by 1) c
    ),
    'streaks', (
      select coalesce(jsonb_agg(jsonb_build_object('streak', streak, 'users', users) order by streak), '[]'::jsonb)
      from (select least(streak, 8) as streak, count(*) as users from saves group by 1) s
    ),

    -- ── 경제 ──
    'econ_daily',   (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'inflow', inflow, 'outflow', outflow, 'net', inflow - outflow) order by day), '[]'::jsonb) from econ_daily),
    'econ_sources', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'tx', tx, 'inflow', inflow, 'outflow', outflow, 'net', inflow - outflow) order by (inflow + outflow) desc), '[]'::jsonb) from econ_src),

    -- ── 세그먼트 ──
    'segments', jsonb_build_object(
      'guest', (
        select coalesce(jsonb_agg(jsonb_build_object('seg', case when is_guest then '게스트' else '로그인' end, 'users', users)), '[]'::jsonb)
        from (select is_guest, count(distinct uid) as users from act group by 1) g
      ),
      'variant', (
        select coalesce(jsonb_agg(jsonb_build_object('seg', variant, 'users', users)), '[]'::jsonb)
        from (select variant, count(distinct uid) as users from act group by 1) v
      )
    )
  ) into result;

  return result;
end;
$$;

-- 로그인 유저만 실행 가능(내부에서 관리자 재검사). 익명/공개는 차단.
revoke all on function public.cf_admin_overview(int) from public, anon;
grant execute on function public.cf_admin_overview(int) to authenticated;
