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
-- =============================================================

create or replace function public.cf_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  admins text[] := array['icuchoel@gmail.com'];  -- ★ 관리자 이메일(소문자)
  result jsonb;
begin
  -- 관리자 아니면 차단
  if not (caller_email = any (admins)) then
    raise exception '권한 없음: 관리자만 조회할 수 있습니다.';
  end if;

  select jsonb_build_object(
    -- 규모 KPI
    'kpis', (
      select jsonb_build_object(
        'users', count(distinct user_id),
        'sessions', count(distinct session_id),
        'samples', count(*)
      ) from game_logs
    ),
    -- 일별 활성 유저(DAU)
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'dau', dau, 'sessions', sessions) order by day), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date as day,
               count(distinct user_id) as dau,
               count(distinct session_id) as sessions
        from game_logs group by 1
      ) d
    ),
    -- 이동 히트맵(2×2 격자 전체 합산)
    'heatmap', (
      select coalesce(jsonb_agg(jsonb_build_object('gx', gx, 'gz', gz, 'hits', hits)), '[]'::jsonb)
      from (
        select round(char_x / 2.0) * 2 as gx, round(char_z / 2.0) * 2 as gz, count(*) as hits
        from game_logs group by 1, 2
      ) h
    ),
    -- 세션 길이 히스토그램
    'session_buckets', (
      select coalesce(jsonb_agg(jsonb_build_object('bucket', bucket, 'sessions', c) order by o), '[]'::jsonb)
      from (
        select bucket, count(*) c, min(dsec) o
        from (
          select session_id, extract(epoch from (max(created_at) - min(created_at))) as dsec
          from game_logs group by session_id
        ) s
        cross join lateral (select case
            when dsec < 30 then '0-30초' when dsec < 60 then '30-60초'
            when dsec < 180 then '1-3분' when dsec < 600 then '3-10분'
            else '10분+' end as bucket) b
        group by bucket
      ) x
    ),
    -- 집 건설 단계 분포(진행 퍼널)
    'house_stages', (
      select coalesce(jsonb_agg(jsonb_build_object('stage', house_stage, 'users', users) order by house_stage), '[]'::jsonb)
      from (
        select coalesce((state ->> 'houseStage')::int, 0) as house_stage, count(*) as users
        from game_saves group by 1
      ) s
    ),
    -- 리텐션(세션 2회+ 비율)
    'retention', (
      select jsonb_build_object(
        'users', count(*),
        'returning', count(*) filter (where sessions >= 2),
        'pct', round(100.0 * count(*) filter (where sessions >= 2) / nullif(count(*), 0), 1)
      )
      from (select user_id, count(distinct session_id) as sessions from game_logs group by user_id) u
    )
  ) into result;

  return result;
end;
$$;

-- 로그인 유저만 실행 가능(내부에서 관리자 재검사). 익명/공개는 차단.
revoke all on function public.cf_admin_overview() from public, anon;
grant execute on function public.cf_admin_overview() to authenticated;
