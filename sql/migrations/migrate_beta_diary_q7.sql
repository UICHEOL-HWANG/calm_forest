-- =============================================================
--  📝 베타 일지 7번 "기타 건의사항" 추가 (2026-09-09)
--  Supabase SQL Editor 에서 그대로 실행. 두 번 실행해도 안전(if not exists · or replace).
--  ① beta_diary.q7 컬럼 추가  ② cf_beta_overview 집계에 q7 포함(모니터 대시보드용)
--  원본은 sql/admin_analytics.sql — 여기와 같이 맞춰 둔다.
-- =============================================================
alter table public.beta_diary add column if not exists q7 text;

drop function if exists public.cf_beta_overview(int, text);
create or replace function public.cf_beta_overview(days int default 7, token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text[] := array['icuchoel@gmail.com', 'cheorish.hw@gmail.com'];  -- ★ 관리자 이메일(소문자) — cf_admin_overview와 동일하게 유지
  tz constant text := 'Asia/Seoul';
  allowed boolean := false;
  since timestamptz;
  result jsonb;
begin
  if caller_email = any (admins) then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s
       set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_beta_overview.token and s.expires_at > now();
    allowed := found;
  end if;
  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  days := greatest(1, least(coalesce(days, 7), 90));
  since := now() - make_interval(days => days);

  with
  roster as (  -- 명단 ⨝ 계정(가입 전 테스터는 user_id null로 표시)
    select bt.email, bt.grp, bt.map_order, u.id as user_id
    from beta_testers bt
    left join auth.users u on lower(u.email) = bt.email
  ),
  diary_cnt as (
    select email, count(*) as diary_days from beta_diary group by email
  ),
  tester_sessions as (
    select r.email, r.grp, r.map_order, r.user_id,
           max(sl.updated_at)                          as last_seen,
           count(sl.session_id)                        as sessions,
           coalesce(sum(nullif(sl.play_sec, 0)), 0)    as play_sec
    from roster r
    left join session_logs sl on sl.user_id = r.user_id and sl.updated_at >= since
    group by r.email, r.grp, r.map_order, r.user_id
  ),
  tester_saves as (
    select gs.user_id,
           coalesce((gs.state -> 'inventory' ->> 'coins')::int, 0)        as coins,
           coalesce((gs.state ->> 'houseStage')::int, 0)                  as house_stage,
           coalesce((gs.state ->> 'tutorialSeen')::boolean, false)        as tutorial,
           coalesce((gs.state -> 'daily' ->> 'streak')::int, 0)           as streak
    from game_saves gs
    where gs.user_id in (select user_id from roster where user_id is not null)
  ),
  ab_daily as (  -- 군별 일별 활동(베타 variant만)
    select ((gl.created_at at time zone tz))::date as day,
           gl.variant,
           count(distinct coalesce(nullif(gl.client_id,''), gl.user_id::text)) as dau
    from game_logs gl
    where gl.variant in ('beta_A','beta_B') and gl.created_at >= since
    group by 1, 2
  ),
  ab_play as (
    select ((coalesce(sl.started_at, sl.updated_at) at time zone tz))::date as day,
           sl.variant, round(avg(nullif(sl.play_sec,0)))::int as avg_play_sec
    from session_logs sl
    where sl.variant in ('beta_A','beta_B') and sl.updated_at >= since
    group by 1, 2
  ),
  tut_funnel as (  -- 군별 스텝 도달 유저 수 (session_logs.counts의 tut_<key>)
    select sl.variant, replace(e.key, 'tut_', '') as key,
           count(distinct sl.user_id) as users
    from session_logs sl, jsonb_each_text(coalesce(sl.counts, '{}'::jsonb)) e
    where sl.variant in ('beta_A','beta_B') and e.key like 'tut\_%' and sl.updated_at >= since
    group by 1, 2
  ),
  minigame as (  -- 군별 미니게임 성공/실패 이벤트 합
    select sl.variant, e.key as event, sum(e.value::numeric)::bigint as n
    from session_logs sl, jsonb_each_text(coalesce(sl.counts, '{}'::jsonb)) e
    where sl.variant in ('beta_A','beta_B') and sl.updated_at >= since
      and e.key in ('fishing_catch','fishing_miss','sea_catch','sea_miss','mist_soothe','mist_soothe_miss','boat_hit')
      and e.value ~ '^[0-9]+$'
    group by 1, 2
  )
  select jsonb_build_object(
    'testers', (select coalesce(jsonb_agg(jsonb_build_object(
                  'email', ts.email, 'grp', ts.grp, 'user_id', ts.user_id,
                  'last_seen', ts.last_seen, 'sessions', ts.sessions, 'play_sec', ts.play_sec,
                  'coins', sv.coins, 'house_stage', sv.house_stage, 'tutorial', sv.tutorial, 'streak', sv.streak,
                  'map_order', ts.map_order, 'diary_days', coalesce(dc.diary_days, 0)
                ) order by ts.grp, ts.email), '[]'::jsonb)
                from tester_sessions ts
                left join tester_saves sv using (user_id)
                left join diary_cnt dc on dc.email = ts.email),
    'ab_daily', (select coalesce(jsonb_agg(jsonb_build_object(
                  'day', d.day, 'variant', d.variant, 'dau', d.dau, 'avg_play_sec', p.avg_play_sec
                ) order by d.day), '[]'::jsonb)
                from ab_daily d left join ab_play p using (day, variant)),
    'tut_funnel', (select coalesce(jsonb_agg(jsonb_build_object(
                  'variant', variant, 'key', key, 'users', users)), '[]'::jsonb) from tut_funnel),
    'minigame', (select coalesce(jsonb_agg(jsonb_build_object(
                  'variant', variant, 'event', event, 'n', n)), '[]'::jsonb) from minigame),
    'diary', (select coalesce(jsonb_agg(jsonb_build_object(
                  'email', d.email, 'grp', bt.grp, 'day', d.day, 'q1', d.q1, 'q2', d.q2, 'q3', d.q3,
                  'q4', d.q4, 'q5', d.q5, 'q6', d.q6, 'q7', d.q7, 'updated_at', d.updated_at
                ) order by d.updated_at desc), '[]'::jsonb)
                from (select * from beta_diary order by updated_at desc limit 70) d
                join beta_testers bt on bt.email = d.email)
  ) into result;
  return result;
end $$;

revoke all on function public.cf_beta_overview(int, text) from public;
grant execute on function public.cf_beta_overview(int, text) to authenticated, anon;
