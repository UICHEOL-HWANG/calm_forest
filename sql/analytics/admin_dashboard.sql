-- =============================================================
--  📊 관리자 애널리틱스 v2 RPC (2026-10-10) — dashboards/admin_analytics.html
--
--  원천 = 롤업 표(sql/migrations/migrate_admin_rollup.sql). Supabase 원본은 7일만 남으므로
--  원본을 직접 읽던 cf_admin_overview 는 30·90일을 눌러도 7일치였다(신규 과대·D7/코호트 오답).
--
--  · 기간: 7 / 30 / 60 일 고정. "직전 기간" = 바로 앞 같은 길이.
--  · 유저 = 기기(client_id, 없으면 user_id). 페르소나(시뮬레이터) 세션은 전부 뺀다.
--  · 오늘은 진행 중 → 평균 DAU·이탈·북극성은 어제까지의 완결된 날로만 잰다.
--  · 첫 주 퍼널: 7일 관측이 끝난 신규만(첫 접속 = 기간을 7일 앞으로 민 구간). 단계는 시간 순 —
--    진입 → 첫날 온보딩(캐릭터 선택) → 첫날 획득 → D1 복귀 → D7 복귀.
--    (튜토리얼은 대부분 건너뛰어 완료 이벤트가 거의 없다 — 2026-10-10 집계: skip 530 세션)
--  · 리텐션 곡선은 첫날(D0) 획득 여부로 나눈다. 첫 주 기준으로 나누면 "D3 에 획득 = D3 에 접속" 이라
--    획득 그룹 곡선이 저절로 부풀어 오른다(look-ahead).
--  · 열 때마다 cf_rollup(어제, 오늘) 로 오늘치를 새로 만다(멱등).
-- =============================================================

create or replace function public.cf_admin_dashboard(days int default 30, token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tz constant text := 'Asia/Seoul';
  allowed boolean := false;
  is_admin boolean := false;
  today  date;
  since  date;   -- 기간 첫날
  psince date;   -- 직전 기간 첫날
  result jsonb;
begin
  -- ── 접근: 관리자(이메일+UUID, cf_is_admin) 또는 유효한 임시 공유 토큰 ──
  is_admin := public.cf_is_admin();
  if is_admin then
    allowed := true;
  elsif coalesce(token, '') <> '' then
    update public.cf_share_links s
       set hits = s.hits + 1, last_used_at = now()
     where s.token = cf_admin_dashboard.token and s.expires_at > now();
    allowed := found;
  end if;
  if not allowed then
    raise exception '권한 없음: 관리자 또는 유효한 공유 링크만 조회할 수 있습니다.';
  end if;

  days   := case when coalesce(days, 30) <= 7 then 7 when days <= 30 then 30 else 60 end;
  today  := (now() at time zone tz)::date;
  since  := today - (days - 1);
  psince := since - days;

  -- 오늘치 신선도: 관리자가 열 때만, 다른 롤업이 돌고 있으면 건너뛰고, 실패해도 화면은 연다(어제까지는 03:00 롤업이 채움)
  if is_admin then
    begin
      if pg_try_advisory_xact_lock(hashtext('cf_rollup')) then
        perform public.cf_rollup(today - 1, today);
      end if;
    exception when others then
      raise notice 'cf_rollup skipped: %', sqlerrm;
    end;
  end if;

  with
  s as (select * from cf_sessions where not persona),
  -- 유저×날
  ud as (
    select uid, day,
           bool_or(acq) as acq,
           bool_or(counts ? 'character_select') as onboard,
           count(*) as sessions
    from s group by uid, day
  ),
  fs as (select uid, min(day) as first_day from ud group by uid),
  fx as (   -- 신규 1명당 첫 주 행동 플래그
    select f.uid, f.first_day,
           coalesce(bool_or(u.acq)     filter (where u.day = f.first_day), false) as acq_d0,
           coalesce(bool_or(u.onboard) filter (where u.day = f.first_day), false) as onb_d0,
           coalesce(bool_or(u.day = f.first_day + 1), false) as d1,
           coalesce(bool_or(u.day = f.first_day + 7), false) as d7
    from fs f join ud u using (uid) group by f.uid, f.first_day
  ),
  ds as (select generate_series(psince - 7, today, interval '1 day')::date as d),
  day_act as (select day, count(*) as dau, count(*) filter (where acq) as acq_users from ud group by day),
  nsm as (
    select ds.d, coalesce(a.acq_users, 0) as acq_users, coalesce(a.dau, 0) as dau,
           avg(coalesce(a.acq_users, 0)) over (order by ds.d rows 6 preceding) as ma7
    from ds left join day_act a on a.day = ds.d
  ),
  daily as (
    select ds.d,
           count(u.uid) as dau,
           count(u.uid) filter (where f.first_day = ds.d) as new_users,
           count(u.uid) filter (where f.first_day < ds.d and p.uid is not null) as retained,
           count(u.uid) filter (where f.first_day < ds.d and p.uid is null) as resurrected
    from ds
    left join ud u on u.day = ds.d
    left join fs f on f.uid = u.uid
    left join ud p on p.uid = u.uid and p.day = ds.d - 1
    where ds.d between since and today
    group by ds.d
  ),
  churned as (   -- 전날 왔는데 그날 안 온 유저(오늘은 진행 중이라 계산하지 않음)
    select ds.d, count(*) as churned
    from ds join ud p on p.day = ds.d - 1
    left join ud u on u.uid = p.uid and u.day = ds.d
    where ds.d between since and today - 1 and u.uid is null
    group by ds.d
  ),
  sess_day as (
    select day, count(*) as sessions,
           percentile_cont(0.5) within group (order by coalesce(nullif(play_sec, 0), nullif(dur_sec, 0)))::int as med_sec
    from s where day between since and today group by day
  ),
  -- Stickiness 는 기간 버튼과 무관하게 '최근 30일 평균 DAU ÷ 30일 MAU' 로 고정(7·30·60일 화면끼리 비교되게)
  mau as (
    select count(distinct uid) filter (where day between today - 30 and today - 1) as cur,
           count(distinct uid) filter (where day between today - 60 and today - 31) as prev,
           (select avg(coalesce(a.dau, 0)) from generate_series(today - 30, today - 1, interval '1 day') g(d)
              left join day_act a on a.day = g.d::date) as dau30,
           (select avg(coalesce(a.dau, 0)) from generate_series(today - 60, today - 31, interval '1 day') g(d)
              left join day_act a on a.day = g.d::date) as dau30_prev
    from ud
  ),
  kp as (
    select
      (select ma7 from nsm where d = today - 1) as nsm,
      (select ma7 from nsm where d = today - 8) as nsm_prev,
      (select avg(dau) from nsm where d between since and today - 1) as avg_dau,
      (select avg(dau) from nsm where d between psince and since - 1) as avg_dau_prev,
      (select count(*) from fs where first_day between since and today) as new_users,
      (select count(*) from fs where first_day between psince and since - 1) as new_prev,
      -- 관측일이 오늘(진행 중)인 코호트는 뺀다: D1 은 첫날 ≤ 오늘-2, D7 은 ≤ 오늘-8
      (select count(*) filter (where d1) from fx where first_day between since - 2 and today - 2) as d1_n,
      (select count(*) from fx where first_day between since - 2 and today - 2) as d1_base,
      (select count(*) filter (where d1) from fx where first_day between psince - 2 and since - 3) as d1p_n,
      (select count(*) from fx where first_day between psince - 2 and since - 3) as d1p_base,
      (select count(*) filter (where d7) from fx where first_day between since - 8 and today - 8) as d7_n,
      (select count(*) from fx where first_day between since - 8 and today - 8) as d7_base,
      (select count(*) filter (where d7) from fx where first_day between psince - 8 and since - 9) as d7p_n,
      (select count(*) from fx where first_day between psince - 8 and since - 9) as d7p_base,
      (select percentile_cont(0.5) within group (order by coalesce(nullif(play_sec, 0), nullif(dur_sec, 0)))
         from s where day between since and today) as med_sec,
      (select percentile_cont(0.5) within group (order by coalesce(nullif(play_sec, 0), nullif(dur_sec, 0)))
         from s where day between psince and since - 1) as med_prev
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'days', days, 'today', today, 'since', since, 'prev_since', psince, 'tz', tz,
      'data_from', (select min(day) from cf_sessions),
      'rolled_at', (select max(rolled_at) from cf_sessions),
      'persona_sessions', (select count(*) from cf_sessions where persona and day between since and today),
      'funnel_from', since - 8, 'funnel_to', today - 8
    ),

    'kpis', (select jsonb_build_object(
      'nsm', round(kp.nsm, 2), 'nsm_prev', round(kp.nsm_prev, 2),
      'avg_dau', round(kp.avg_dau, 1), 'avg_dau_prev', round(kp.avg_dau_prev, 1),
      'dau_today', (select dau from nsm where d = today),
      'new_users', kp.new_users, 'new_prev', kp.new_prev,
      'd1', round(100.0 * kp.d1_n / nullif(kp.d1_base, 0), 1), 'd1_base', kp.d1_base,
      'd1_prev', round(100.0 * kp.d1p_n / nullif(kp.d1p_base, 0), 1),
      'd7', round(100.0 * kp.d7_n / nullif(kp.d7_base, 0), 1), 'd7_base', kp.d7_base,
      'd7_prev', round(100.0 * kp.d7p_n / nullif(kp.d7p_base, 0), 1),
      'stickiness', round(100.0 * (select dau30 from mau) / nullif((select cur from mau), 0), 1),
      'stickiness_prev', round(100.0 * (select dau30_prev from mau) / nullif((select prev from mau), 0), 1),
      'mau', (select cur from mau),
      'med_session_sec', kp.med_sec::int, 'med_session_prev', kp.med_prev::int
    ) from kp),

    'nsm_daily', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'acq_users', acq_users, 'ma7', round(ma7, 2)) order by d), '[]'::jsonb)
                  from nsm where d between since and today),

    'daily', (select coalesce(jsonb_agg(jsonb_build_object(
                'day', d.d, 'dau', d.dau, 'new_users', d.new_users, 'retained', d.retained,
                'resurrected', d.resurrected, 'churned', c.churned,
                'sessions', coalesce(sd.sessions, 0), 'med_sec', sd.med_sec) order by d.d), '[]'::jsonb)
              from daily d left join churned c using (d) left join sess_day sd on sd.day = d.d),

    'funnel', (select jsonb_build_object(
                 'entered', count(*),
                 'onboard', count(*) filter (where onb_d0),
                 'acq',     count(*) filter (where onb_d0 and acq_d0),
                 'd1',      count(*) filter (where onb_d0 and acq_d0 and d1),
                 'd7',      count(*) filter (where onb_d0 and acq_d0 and d1 and d7),
                 -- 같은 코호트를 단계 없이 본 값 — "첫날 획득이 재방문을 가르나" 비교용
                 'd1_if_acq', count(*) filter (where acq_d0 and d1),  'n_acq', count(*) filter (where acq_d0),
                 'd1_if_non', count(*) filter (where not acq_d0 and d1), 'n_non', count(*) filter (where not acq_d0))
               from fx where first_day between since - 8 and today - 8),

    'curve', (select coalesce(jsonb_agg(jsonb_build_object(
                'n', n, 'base', base, 'ret', ret, 'base_acq', base_acq, 'ret_acq', ret_acq,
                'base_non', base_non, 'ret_non', ret_non) order by n), '[]'::jsonb)
              from (
                select g.n,
                       count(*) as base, count(u.uid) as ret,
                       count(*) filter (where x.acq_d0) as base_acq, count(u.uid) filter (where x.acq_d0) as ret_acq,
                       count(*) filter (where not x.acq_d0) as base_non, count(u.uid) filter (where not x.acq_d0) as ret_non
                from generate_series(0, 30) g(n)
                join fx x on x.first_day between since and today - 1 and x.first_day <= today - g.n - 1
                left join ud u on u.uid = x.uid and u.day = x.first_day + g.n
                group by g.n
              ) c),

    'cohorts', (select coalesce(jsonb_agg(jsonb_build_object('week', wk, 'size', size, 'cells', cells) order by wk), '[]'::jsonb)
                from (
                  select w.wk, count(*) filter (where w.n is null) as size,
                         jsonb_agg(jsonb_build_object('n', w.n, 'base', w.b, 'ret', w.r) order by w.n)
                           filter (where w.n is not null) as cells
                  from (
                    select date_trunc('week', x.first_day)::date as wk, null::int as n, null::bigint as b, null::bigint as r, x.uid
                    from fx x where x.first_day between since and today
                    union all
                    select date_trunc('week', x.first_day)::date, g.n,
                           count(*) filter (where x.first_day <= today - g.n - 1),
                           count(u.uid) filter (where x.first_day <= today - g.n - 1), null
                    from fx x cross join unnest(array[1, 3, 7, 14, 30]) g(n)
                    left join ud u on u.uid = x.uid and u.day = x.first_day + g.n
                    where x.first_day between since and today
                    group by 1, 2
                  ) w
                  group by w.wk
                ) c),

    'hourly', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hour, 'sessions', n)), '[]'::jsonb)
               from (select extract(dow from start_ts at time zone tz)::int as dow,
                            extract(hour from start_ts at time zone tz)::int as hour, count(*) as n
                     from s where day between since and today group by 1, 2) h),

    'session_buckets', (select coalesce(jsonb_agg(jsonb_build_object('bucket', b, 'sessions', n) order by o), '[]'::jsonb)
                        from (select case when v < 30 then '30초 미만' when v < 60 then '30초–1분' when v < 180 then '1–3분'
                                          when v < 600 then '3–10분' when v < 1800 then '10–30분' else '30분+' end as b,
                                     case when v < 30 then 1 when v < 60 then 2 when v < 180 then 3
                                          when v < 600 then 4 when v < 1800 then 5 else 6 end as o,
                                     count(*) as n
                              from (select coalesce(nullif(play_sec, 0), dur_sec) as v from s where day between since and today) q
                              group by 1, 2) b),

    'heat', (select coalesce(jsonb_agg(jsonb_build_object('map', map, 'gx', gx, 'gz', gz, 'hits', hits)), '[]'::jsonb)
             from (select map, gx, gz, sum(hits)::int as hits from cf_heat_day
                   where not persona and day between since and today group by 1, 2, 3) h),

    'econ_daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'inflow', i, 'outflow', o, 'net', i - o) order by day), '[]'::jsonb)
                   from (select day, sum(inflow)::bigint as i, sum(outflow)::bigint as o from cf_econ_day
                         where not persona and day between since and today group by day) e),
    'econ_sources', (select coalesce(jsonb_agg(jsonb_build_object('source', source, 'tx', tx, 'inflow', i, 'outflow', o, 'net', i - o) order by i + o desc), '[]'::jsonb)
                     from (select source, sum(tx)::int as tx, sum(inflow)::bigint as i, sum(outflow)::bigint as o from cf_econ_day
                           where not persona and day between since and today group by source order by sum(inflow + outflow) desc limit 12) e),

    'users', case when not is_admin then '[]'::jsonb else (select coalesce(jsonb_agg(jsonb_build_object(
                'uid', left(r.uid, 6) || '…', 'is_guest', r.is_guest, 'platform', r.platform,
                'first_day', f.first_day, 'active_days', r.active_days, 'acq_days', r.acq_days,
                'sessions', r.sessions, 'last_seen', r.last_seen) order by r.last_seen desc), '[]'::jsonb)
              from (select uid, bool_and(is_guest) as is_guest, max(platform) as platform,
                           count(distinct day) as active_days, count(distinct day) filter (where acq) as acq_days,
                           count(*) as sessions, max(end_ts) as last_seen
                    from s where day between since and today
                    group by uid order by max(end_ts) desc limit 40) r
              join fs f using (uid)) end,

    'segments', jsonb_build_object(
      'platform', (select coalesce(jsonb_agg(jsonb_build_object('seg', seg, 'users', n) order by n desc), '[]'::jsonb)
                   from (select coalesce(platform, 'web') as seg, count(distinct uid) as n from s where day between since and today group by 1) p),
      'guest', (select coalesce(jsonb_agg(jsonb_build_object('seg', seg, 'users', n) order by n desc), '[]'::jsonb)
                from (select case when is_guest then '게스트' else '로그인' end as seg, count(distinct uid) as n
                      from s where day between since and today group by 1) g),
      'variant', (select coalesce(jsonb_agg(jsonb_build_object('seg', variant, 'users', n) order by n desc), '[]'::jsonb)
                  from (select variant, count(distinct uid) as n from s where day between since and today group by 1) v)
    ),

    -- 진행도(세이브 누적 — 기간과 무관, 페르소나 계정 제외)
    'progress', (
      with sv as (
        select case when g.state ->> 'houseStage' ~ '^[0-9]{1,2}$' then (g.state ->> 'houseStage')::int else 0 end as house_stage,
               nullif(g.state ->> 'character', '') as character,
               case when jsonb_typeof(g.state -> 'dex') = 'object' then
                 (select coalesce(sum(case when jsonb_typeof(c.value) = 'object'
                                           then (select count(*) from jsonb_object_keys(c.value)) else 0 end), 0)
                    from jsonb_each(g.state -> 'dex') c)
               else 0 end as dex_count
        from game_saves g
        where g.user_id not in (select * from cf_persona_user_ids())
      )
      select jsonb_build_object(
        'house', (select coalesce(jsonb_agg(jsonb_build_object('stage', house_stage, 'users', n) order by house_stage), '[]'::jsonb)
                  from (select house_stage, count(*) as n from sv group by 1) h),
        'characters', (select coalesce(jsonb_agg(jsonb_build_object('character', character, 'users', n) order by n desc), '[]'::jsonb)
                       from (select character, count(*) as n from sv where character is not null group by 1) c),
        'dex', (select coalesce(jsonb_agg(jsonb_build_object('bucket', b, 'users', n) order by o), '[]'::jsonb)
                from (select case when dex_count = 0 then '0종' when dex_count < 5 then '1–4종' when dex_count < 10 then '5–9종'
                                  when dex_count < 20 then '10–19종' else '20종+' end as b,
                             case when dex_count = 0 then 1 when dex_count < 5 then 2 when dex_count < 10 then 3
                                  when dex_count < 20 then 4 else 5 end as o, count(*) as n
                      from sv group by 1, 2) d)
      )
    )
  ) into result;

  return result;
end;
$$;

-- 함수 안에서 관리자/공유 토큰을 다시 검사한다(익명은 토큰 없이 부르면 '권한 없음').
revoke all on function public.cf_admin_dashboard(int, text) from public;
grant execute on function public.cf_admin_dashboard(int, text) to authenticated, anon;
