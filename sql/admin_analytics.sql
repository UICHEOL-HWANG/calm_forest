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

-- 시그니처가 바뀌었으므로(무인자 → days → days+token) 구버전 제거
drop function if exists public.cf_admin_overview();
drop function if exists public.cf_admin_overview(int);

create or replace function public.cf_admin_overview(days int default 30, token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text[] := array['icuchoel@gmail.com'];  -- ★ 관리자 이메일(소문자)
  tz constant text := 'Asia/Seoul';
  allowed boolean := false;
  today date;
  since date;
  result jsonb;
begin
  -- ── 접근 권한: 관리자 계정 OR 유효한 임시 공유 토큰 ──────────
  --  공유 토큰은 cf_share_links 표에서 발급합니다(생성/발급 SQL 은 docs/DEPLOY.md).
  --  만료(expires_at)가 지나면 자동으로 막히고, 행을 지우면 즉시 회수됩니다.
  if caller_email = any (admins) then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s
       set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_admin_overview.token
       and s.expires_at > now();
    allowed := found;
  end if;

  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  days  := greatest(1, least(coalesce(days, 30), 365));
  today := (now() at time zone tz)::date;
  since := today - (days - 1);

  with
  -- ── 활동 원장: 기기 단위(uid) 로 정규화 ──────────────────────
  act as (
    select coalesce(nullif(client_id, ''), user_id::text) as uid,
           user_id,                                       -- 이탈 퍼널의 세이브(튜토리얼) 조인용
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
  ),
  -- ── 유저 흐름: 활동 퍼널 · 이탈 퍼널 · 유저별 위치 ─────────────
  --  활동 퍼널은 session_logs.counts(GA4 이벤트 카운트)를 uid 로 합산해
  --  "이번 기간에 어느 깊이까지 놀았는지"를 단계화합니다.
  --  단계는 누적 AND 로만 올라가므로(2단계 없이 3단계 불가) 퍼널이 항상 단조 감소합니다.
  sl_period as (
    select coalesce(nullif(client_id, ''), user_id::text) as uid,
           coalesce(counts, '{}'::jsonb)                  as counts
    from session_logs
    where ((coalesce(started_at, updated_at) at time zone tz))::date >= since
      and coalesce(nullif(client_id, ''), user_id::text) is not null
  ),
  ev_user as (
    select uid,
           bool_or(e.key in ('zone_enter','enter_farm','enter_house','enter_mine','enter_cafe','npc_talk'))  as s_field,
           bool_or(e.key in ('chop_tree','forage_pick','harvest_crop','plant_seed','water_crop','mine_ore',
                             'craft_item','coop_feed','coop_collect','first_chop'))                          as s_work,
           bool_or(e.key in ('carve_start','cooking_start','cafe_serve','fishing_cast','sea_cast',
                             'boat_start','mist_enter','firefly_swing'))                                     as s_mini,
           bool_or(e.key in ('shop_buy','shop_sell'))                                                        as s_trade
    from sl_period s, jsonb_each_text(s.counts) e
    where e.value ~ '^[0-9]+$' and e.value::numeric > 0
    group by uid
  ),
  -- 기간 내 접속 유저 전원의 단계(세션 요약이 없으면 1단계=접속으로만 집계)
  user_stage as (
    select p.uid,
           case when coalesce(v.s_field, false) and coalesce(v.s_work, false)
                     and coalesce(v.s_mini, false) and coalesce(v.s_trade, false) then 5
                when coalesce(v.s_field, false) and coalesce(v.s_work, false)
                     and coalesce(v.s_mini, false)                                then 4
                when coalesce(v.s_field, false) and coalesce(v.s_work, false)     then 3
                when coalesce(v.s_field, false)                                   then 2
                else 1 end as stage
    from (select distinct uid from ud where day >= since) p
    left join ev_user v using (uid)
  ),
  -- 유저별 관제 표용 최근 활동(최근 활성 40명)
  user_recent as (
    select uid,
           max(ts_local)              as last_seen,
           count(distinct session_id) as sessions,
           bool_and(is_guest)         as is_guest
    from act where day >= since group by uid
  ),
  -- 이탈 퍼널 코호트: 14일 관측이 "끝난" 신규만 분모에 넣습니다
  --  (덜 관측된 유저를 이탈로 오판하지 않기 위해 — 리텐션 분모와 같은 원칙).
  --  게스트는 재방문 시 새 익명 ID 가 되는 한계를 다른 지표와 공유합니다.
  uid_user as (
    select uid, (array_agg(user_id order by ts_local desc))[1] as user_id
    from act where user_id is not null group by uid
  ),
  churn_flags as (
    select f.uid,
           exists (select 1 from saves s join uid_user uu on uu.uid = f.uid
                    where s.user_id = uu.user_id and s.tutorial)                        as f_tut,
           exists (select 1 from ud u where u.uid = f.uid and u.day = f.first_day + 1)  as f_d2,
           (select count(distinct u.day) from ud u
             where u.uid = f.uid and u.day between f.first_day and f.first_day + 7) >= 3 as f_w7,
           exists (select 1 from ud u where u.uid = f.uid
                    and u.day between f.first_day + 8 and f.first_day + 14)             as f_d14
    from first_seen f
    where f.first_day <= today - 14
      and f.first_day >  today - 14 - days
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

    -- ── 유저 흐름(활동/이탈 퍼널 · 유저별 위치) ──
    'activity_funnel', (
      select jsonb_build_object(
        'active',   count(*),
        'field',    count(*) filter (where stage >= 2),
        'work',     count(*) filter (where stage >= 3),
        'minigame', count(*) filter (where stage >= 4),
        'trade',    count(*) filter (where stage >= 5)
      ) from user_stage
    ),
    'churn_funnel', (
      select jsonb_build_object(
        'entered',  count(*),
        'tutorial', count(*) filter (where f_tut),
        'd2',       count(*) filter (where f_tut and f_d2),
        'w7',       count(*) filter (where f_tut and f_d2 and f_w7),
        'd14',      count(*) filter (where f_tut and f_d2 and f_w7 and f_d14)
      ) from churn_flags
    ),
    'user_stages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'uid', left(r.uid, 6) || '…', 'stage', s.stage, 'sessions', r.sessions,
        'last_seen', r.last_seen, 'is_guest', r.is_guest) order by r.last_seen desc), '[]'::jsonb)
      from (select * from user_recent order by last_seen desc limit 40) r
      join user_stage s using (uid)
    ),

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

-- 실행 자체는 익명도 가능하지만, 함수 안에서 관리자 이메일 또는 유효한
-- 공유 토큰을 재검사합니다(토큰 없이 부르면 그대로 '권한 없음').
-- ※ 임시 공개를 끝내고 완전히 잠그려면 아래 anon grant 만 revoke 하면 됩니다.
revoke all on function public.cf_admin_overview(int, text) from public;
grant execute on function public.cf_admin_overview(int, text) to authenticated, anon;

-- =============================================================
--  🧪 베타 A/B (2026-09-02) — docs/BETA_AB_TEST_PLAN.md
--  베타테스터 명단: email → A/B 군 직접 배정(5:5)
-- =============================================================
create table if not exists public.beta_testers (
  email text primary key,           -- 소문자로 저장할 것
  grp   text not null check (grp in ('A','B')),
  note  text
);
alter table public.beta_testers enable row level security;
drop policy if exists beta_testers_self_read on public.beta_testers;
create policy beta_testers_self_read on public.beta_testers
  for select to authenticated
  using (email = lower(coalesce(auth.jwt() ->> 'email', '')));
-- 쓰기 정책 없음 → service role(SQL 편집기)로만 등록/변경
-- 명단 등록 예시(운영자가 SQL 편집기에서 실행):
-- insert into public.beta_testers (email, grp, note) values
--   ('tester1@gmail.com','A','1기'), ('tester2@gmail.com','B','1기');
