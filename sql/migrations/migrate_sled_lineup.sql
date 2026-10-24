alter table public.sled_runs add column if not exists sled text;
alter table public.sled_runs drop constraint if exists sled_runs_sled;
alter table public.sled_runs add constraint sled_runs_sled check (sled is null or sled in ('basic','sky','forest','starry','toboggan','wind','acorn','skiff'));
alter table public.sled_runs drop constraint if exists sled_runs_phys_v;
alter table public.sled_runs add constraint sled_runs_phys_v check (phys_v in (1, 2, 3, 4));

CREATE OR REPLACE FUNCTION public.leaderboard(p_board text, p_uid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  kst_now   timestamp := (now() at time zone 'Asia/Seoul');
  kst_today date      := (now() at time zone 'Asia/Seoul')::date;
  wk_start  timestamptz;
  day_start timestamptz := (now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul';
  day_end   timestamptz := ((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul';
  sc        jsonb;
  rows_     jsonb;
  me_       jsonb;
begin
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';
  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where created_at >= day_start and created_at < day_end
            and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s, 'sp', species)) into sc
    from (select distinct on (user_id) user_id, species, least(round(weight * 10), 3000)::bigint as s
          from sea_records
          where created_at >= day_start and created_at < day_end
            and user_id is not null and weight is not null and weight > 0
          order by user_id, weight desc) x;
  elsif p_board = 'rich' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(amount, 100000)), 10000000)::bigint as s from econ_logs
          where created_at >= wk_start and amount > 0 and user_id is not null
          group by user_id) x;
  elsif p_board = 'quest' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(count(*), 1000)::bigint as s from econ_logs
          where created_at >= wk_start and source = 'quest_reward' and user_id is not null
          group by user_id) x;
  elsif p_board = 'mine' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'mine_ore'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'mine_ore')) > 0) x;
  elsif p_board = 'cook' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'cooking_result'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'cooking_result')) > 0) x;
  elsif p_board = 'sled' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, -min(time_ms)::bigint as s from sled_runs
          where run_date = kst_today and outcome = 'finish' and course_v = 2 and phys_v in (1, 2, 3, 4)
            and user_id is not null and time_ms is not null
          group by user_id) x;
  else
    return jsonb_build_object('error', 'unknown board');
  end if;
  sc := coalesce(sc, '[]'::jsonb);
  with s as (
    select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
    from jsonb_array_elements(sc) e
  ), ranked as (
    select s.user_id, s.score, s.sp,
           rank() over (order by s.score desc) as rnk
    from s
  ), top_ as (
    select r.user_id, r.score, r.sp, r.rnk, _nb_nick(gs.state, r.user_id) as nick
    from ranked r left join game_saves gs on gs.user_id = r.user_id
    where r.rnk <= 50
  )
  select jsonb_agg(jsonb_build_object('rank', rnk, 'nick', nick, 'score', score)
                   || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end
                   order by rnk, nick)
    into rows_
  from (select * from top_ order by rnk, nick limit 50) t;
  if p_uid is not null then
    with s as (
      select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
      from jsonb_array_elements(sc) e
    ), ranked as (
      select s.user_id, s.score, s.sp, rank() over (order by s.score desc) as rnk
      from s
    )
    select jsonb_build_object('rank', rnk, 'score', score)
           || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end into me_
    from ranked where user_id = p_uid;
  end if;
  return jsonb_build_object(
    'board', p_board,
    'week',  to_char(kst_now, 'IYYY-"W"IW'),
    'date',  to_char(kst_today, 'YYYY-MM-DD'),
    'top',   coalesce(rows_, '[]'::jsonb),
    'me',    me_,
    'total', (select count(*) from jsonb_array_elements(sc))
  );
end $function$;
