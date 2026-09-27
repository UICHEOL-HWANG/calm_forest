-- =============================================================
--  🌾 수확제 광장 RPC 자가 테스트 — 트랜잭션 안에서 돌리고 ROLLBACK
--  사용법: migrate_plaza.sql 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          마지막에 NOTICE 'PLAZA SELFTEST ALL PASS' 가 보이면 통과, 실패는 EXCEPTION 으로 멈춘다.
-- =============================================================
begin;

insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('selftest', now() - interval '1 hour', now() + interval '1 hour', 4);
insert into public.plaza_needs (season, stage, item, need) values
  ('selftest', 1, 'wood', 5), ('selftest', 2, 'stone', 3);

do $$
declare
  u1 uuid; u2 uuid; r jsonb; p jsonb;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at offset 1 limit 1;
  if u1 is null or u2 is null then raise exception 'FAIL: auth.users 에 2명 이상 필요'; end if;

  -- 비로그인(anon 역할) — 실행 권한 자체가 없어야 한다(revoke from anon)
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  begin
    r := public.plaza_donate('selftest', 'wood', 1);
    raise exception 'FAIL: anon 이 plaza_donate 를 실행했다';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  -- 토큰에 sub 가 없는 호출 → reason auth(함수 안 방어)
  r := public.plaza_donate('selftest', 'wood', 1);
  if r->>'reason' <> 'auth' then raise exception 'FAIL auth: %', r; end if;

  -- u1: 상한 4 로 컷
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest', 'wood', 10);
  if (r->>'accepted')::int <> 4 or (r->>'today_left')::int <> 0 then raise exception 'FAIL cap cut: %', r; end if;
  r := public.plaza_donate('selftest', 'wood', 1);
  if r->>'reason' <> 'cap' then raise exception 'FAIL cap block: %', r; end if;
  -- 현재 단계에 없는 품목
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest', 'stone', 1);
  if r->>'reason' <> 'need' then raise exception 'FAIL wrong item: %', r; end if;
  -- u2: 남은 필요량 1 로 컷 → 단계 2 로 넘어감
  r := public.plaza_donate('selftest', 'wood', 3);
  if (r->>'accepted')::int <> 1 or (r->>'item_have')::int <> 5 then raise exception 'FAIL need cut: %', r; end if;
  p := public.plaza_progress('selftest');
  if (p->>'stage')::int <> 2 or (p->>'completed')::boolean then raise exception 'FAIL stage advance: %', p; end if;
  r := public.plaza_donate('selftest', 'stone', 3);
  if (r->>'accepted')::int <> 3 or (r->>'stage')::int <> 2 then raise exception 'FAIL stage2: %', r; end if;
  p := public.plaza_progress('selftest');
  if not (p->>'completed')::boolean or (p->>'forced')::boolean or (p->>'stage')::int <> 3 then raise exception 'FAIL complete: %', p; end if;
  if jsonb_array_length(p->'names') <> 2 then raise exception 'FAIL names: %', p->'names'; end if;
  r := public.plaza_donate('selftest', 'stone', 1);
  if r->>'reason' <> 'full' then raise exception 'FAIL full: %', r; end if;
  -- 내 기록(u2 는 wood 1 + stone 3 = 4)
  r := public.plaza_mine('selftest');
  if (r->>'my_total')::int <> 4 or (r->>'today_left')::int <> 0 then raise exception 'FAIL mine: %', r; end if;
  if public._plaza_tier(9) is not null or public._plaza_tier(10) <> 'bronze' or public._plaza_tier(60) <> 'silver' or public._plaza_tier(150) <> 'gold' then
    raise exception 'FAIL tier bounds';
  end if;
  raise notice 'plaza rpc checks pass';
end $$;

-- 기간 밖 · 강제 완공
insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('selftest-over', now() - interval '2 day', now() - interval '1 day', 30);
insert into public.plaza_needs (season, stage, item, need) values ('selftest-over', 1, 'wood', 999);
do $$
declare r jsonb; p jsonb; u1 uuid;
begin
  select id into u1 from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest-over', 'wood', 1);
  if r->>'reason' <> 'season' then raise exception 'FAIL season: %', r; end if;
  p := public.plaza_progress('selftest-over');
  if not (p->>'forced')::boolean or not (p->>'completed')::boolean or (p->>'stage')::int <> 2 then raise exception 'FAIL forced: %', p; end if;
  raise notice 'season checks pass';
end $$;

-- 🔐 익명(게스트) 계정은 기부·내 기록에서 reason login 으로 거절된다(2026-09-27)
--    is_anonymous 클레임이 없는 기존 호출(위 블록들)은 여전히 비익명으로 통과해야 한다
do $$
declare u1 uuid; r jsonb; before_total int; after_total int;
begin
  select id into u1 from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  select coalesce(sum(qty), 0) into before_total from public.plaza_donations where season = 'selftest' and user_id = u1;
  r := public.plaza_donate('selftest', 'stone', 1);
  if r->>'reason' <> 'login' then raise exception 'FAIL anon donate: %', r; end if;
  select coalesce(sum(qty), 0) into after_total from public.plaza_donations where season = 'selftest' and user_id = u1;
  if after_total <> before_total then raise exception 'FAIL anon donate inserted a row: before % after %', before_total, after_total; end if;
  r := public.plaza_mine('selftest');
  if r->>'reason' <> 'login' then raise exception 'FAIL anon mine: %', r; end if;
  raise notice 'login-only checks pass';
end $$;

-- 직접 insert 차단(authenticated 역할로)
do $$
declare u1 uuid; blocked boolean := false;
begin
  select id into u1 from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (u1, 'selftest', 2, 'stone', 1, current_date);
  exception when others then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'FAIL: 직접 insert 가 통과했다'; end if;
  raise notice 'PLAZA SELFTEST ALL PASS';
end $$;

rollback;
