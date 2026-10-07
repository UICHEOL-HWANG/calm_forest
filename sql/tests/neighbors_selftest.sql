-- =============================================================
--  🏡 이웃 마을 RPC 자가 테스트 — 트랜잭션 안에서 가짜 계정을 만들고 마지막에 ROLLBACK
--  사용법: migrate_neighbors.sql 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          마지막에 NOTICE 'NEIGHBORS SELFTEST ALL PASS' 가 보이면 통과, 실패는 EXCEPTION 으로 멈춘다.
--  ⚠️ auth.users·game_saves 에 가짜 행(nb-selftest-*@example.invalid)을 넣는다 — 맨 끝 rollback 이 지운다.
--     중간에 EXCEPTION 으로 멈춰도 커밋된 문장이 없다. 끝나고 아래로 남은 게 없는지 확인할 것:
--     select count(*) from auth.users where email like 'nb-selftest-%';   -- 0
-- =============================================================
begin;

-- a 방문자 · b,f,g,h 공개 이웃 · c 비공개 · d 익명 · e 7일 넘게 안 들어옴 · i 집 0단계
create temp table nb_t (k text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into nb_t (k) values ('a'), ('b'), ('c'), ('d'), ('e'), ('f'), ('g'), ('h'), ('i');

insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
select id, 'authenticated', 'authenticated', 'nb-selftest-' || k || '@example.invalid', k = 'd', now(), now() from nb_t;

insert into public.game_saves (user_id, state, updated_at)
select id,
  jsonb_build_object(
    'nickname', 'selftest-' || k, 'character', 'rabbit', 'houseStage', case when k = 'i' then 0 else 3 end,
    'inventory', jsonb_build_object('coins', 999), 'cashOwned', jsonb_build_array('secret_pack'),
    'cosmetics', jsonb_build_object('owned', jsonb_build_array('beanie'),
                                    'equipped', jsonb_build_object('head', 'beanie', 'neck', null, 'back', null, 'trail', null, 'skin', null)),
    'pet', jsonb_build_object('kind', 'leaf', 'name', 'SECRET_PET_NAME', 'works', 50, 'restUntil', 0),
    'houseStyle', jsonb_build_object('roof', 1, 'wall', 2, 'door', 0),
    'house', jsonb_build_object('style', null, 'addons', jsonb_build_array('chimney_smoke'),
                                'decor', jsonb_build_array(jsonb_build_object('id', 'bed', 'x', 0, 'z', 0))),
    'outdoor', jsonb_build_array(jsonb_build_object('id', 'flowerbed', 'x', -5, 'z', -5, 'rot', 1),
                                 jsonb_build_object('id', 'fence', 'x', 20, 'z', 20, 'rot', 0)),
    'workers', jsonb_build_array(jsonb_build_object('id', 'w1', 'name', 'SECRET_WORKER_NAME')),
    'coop', jsonb_build_object('built', true, 'fed', '2026-10-07')),
  case when k = 'e' then now() - interval '10 days' else now() end
from nb_t;

insert into public.village_profiles (user_id, is_public) select id, false from nb_t where k = 'c';

-- ① 후보 규칙 · 날짜 고정 정렬 · today 응답에 user_id 없음
do $$
declare
  a uuid; b uuid; c uuid; d uuid; e uuid; f uuid; g uuid; h uuid; i uuid; x uuid;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  full_list uuid[]; sorted uuid[]; top3 uuid[]; t1 jsonb; t2 jsonb;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  select id into c from nb_t where k = 'c'; select id into d from nb_t where k = 'd';
  select id into e from nb_t where k = 'e'; select id into f from nb_t where k = 'f';
  select id into g from nb_t where k = 'g'; select id into h from nb_t where k = 'h';
  select id into i from nb_t where k = 'i';

  select array_agg(uid order by k) into full_list from public._nb_candidates(a, v_day, 100000);
  if not (b = any(full_list) and f = any(full_list) and g = any(full_list) and h = any(full_list)) then
    raise exception 'FAIL: 공개 이웃(b,f,g,h)이 후보에 없다'; end if;
  if a = any(full_list) then raise exception 'FAIL: 본인이 후보에 있다'; end if;
  if c = any(full_list) then raise exception 'FAIL: 비공개(c)가 후보에 있다'; end if;
  if d = any(full_list) then raise exception 'FAIL: 익명(d)이 후보에 있다'; end if;
  if e = any(full_list) then raise exception 'FAIL: 7일 넘게 안 들어온(e)이 후보에 있다'; end if;
  if i = any(full_list) then raise exception 'FAIL: 집 0단계(i)가 후보에 있다'; end if;

  select array_agg(u order by md5(a::text || v_day::text || u::text)) into sorted from unnest(full_list) u;
  if sorted <> full_list then raise exception 'FAIL: md5(caller‖day‖host) 정렬이 아니다'; end if;
  select array_agg(uid order by k) into top3 from public._nb_candidates(a, v_day, 3);
  if top3 <> full_list[1:3] then raise exception 'FAIL: 상위 3명이 아니다'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  t1 := public.neighbors_today();
  t2 := public.neighbors_today();
  if not (t1->>'ok')::boolean or jsonb_array_length(t1->'list') <> least(3, array_length(full_list, 1)) then
    raise exception 'FAIL today: %', t1; end if;
  if t1->'list' <> t2->'list' then raise exception 'FAIL: 같은 날 두 번 부르면 같은 3명이어야 한다'; end if;
  foreach x in array full_list || a loop
    if strpos(t1::text, x::text) > 0 then raise exception 'FAIL: today 응답에 user_id(%)가 있다', x; end if;
  end loop;
  raise notice 'candidate checks pass';
end $$;

-- ② showcase 허용 목록
do $$
declare a uuid; c uuid; d uuid; f uuid; pid uuid; sc jsonb; keys text[];
begin
  select id into a from nb_t where k = 'a'; select id into c from nb_t where k = 'c';
  select id into d from nb_t where k = 'd'; select id into f from nb_t where k = 'f';
  pid := public._nb_public_id(f);
  sc := public.neighbor_showcase(pid);
  if sc is null then raise exception 'FAIL: 공개 이웃 showcase 가 null'; end if;
  select array_agg(t.key order by t.key collate "C") into keys from jsonb_object_keys(sc) as t(key);
  if keys <> array['addons','character','coop','equipped','houseStage','houseStyle','nickname','outdoor','pet','style'] then
    raise exception 'FAIL keys: %', keys; end if;
  if strpos(sc::text, f::text) > 0 then raise exception 'FAIL: showcase 에 user_id 가 있다'; end if;
  if strpos(sc::text, 'inventory') > 0 or strpos(sc::text, 'cashOwned') > 0 or strpos(sc::text, 'owned') > 0
     or strpos(sc::text, 'SECRET_PET_NAME') > 0 or strpos(sc::text, 'SECRET_WORKER_NAME') > 0
     or strpos(sc::text, '"decor"') > 0 or strpos(sc::text, '"fed"') > 0 then
    raise exception 'FAIL: 허용 목록 밖 값이 나갔다: %', sc; end if;
  if jsonb_array_length(sc->'outdoor') <> 1 or sc->'outdoor'->0->>'id' <> 'flowerbed' then
    raise exception 'FAIL: 앞마당 반경 14 필터: %', sc->'outdoor'; end if;
  if sc->'pet'->>'kind' <> 'leaf' or (sc->'pet'->>'works')::int <> 50 or (sc->'pet') ? 'name' then
    raise exception 'FAIL pet: %', sc->'pet'; end if;
  if public.neighbor_showcase(public._nb_public_id(c)) is not null then raise exception 'FAIL: 비공개 showcase'; end if;
  if public.neighbor_showcase(public._nb_public_id(d)) is not null then raise exception 'FAIL: 익명 showcase'; end if;
  if public.neighbor_showcase(gen_random_uuid()) is not null then raise exception 'FAIL: 없는 id 가 null 이 아니다'; end if;
  -- 비로그인(anon 역할)도 볼 수 있다 — Worker 가 anon 키로 부른다
  execute 'set local role anon';
  sc := public.neighbor_showcase(pid);
  execute 'reset role';
  if sc is null then raise exception 'FAIL: anon 이 showcase 를 못 본다'; end if;
  raise notice 'showcase checks pass';
end $$;

-- ③ 반응: 하루 1회 · 보상 3회 상한 · 비공개/본인/없음/이모지 · KST 날짜 · 익명 거절 · anon 실행 불가
do $$
declare a uuid; b uuid; c uuid; d uuid; f uuid; g uuid; h uuid; r jsonb; t jsonb; n int; vday date;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  select id into c from nb_t where k = 'c'; select id into d from nb_t where k = 'd';
  select id into f from nb_t where k = 'f'; select id into g from nb_t where k = 'g';
  select id into h from nb_t where k = 'h';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  r := public.neighbor_react(public._nb_public_id(b), 'heart');
  if not (r->>'ok')::boolean or not (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 1 then raise exception 'FAIL react b: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(b), 'star');
  if r->>'reason' <> 'dup' then raise exception 'FAIL dup: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(f), 'wave');
  r := public.neighbor_react(public._nb_public_id(g), 'flower');
  if not (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 3 then raise exception 'FAIL 3rd: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(h), 'star');
  if not (r->>'ok')::boolean or (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 3 then raise exception 'FAIL cap: %', r; end if;
  t := public.neighbors_today();
  if (t->>'rewarded_today')::int <> 3 then raise exception 'FAIL today rewarded_today: %', t; end if;

  r := public.neighbor_react(public._nb_public_id(c), 'heart');
  if r->>'reason' <> 'private' then raise exception 'FAIL private: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(a), 'heart');
  if r->>'reason' <> 'self' then raise exception 'FAIL self: %', r; end if;
  r := public.neighbor_react(gen_random_uuid(), 'heart');
  if r->>'reason' <> 'not_found' then raise exception 'FAIL not_found: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(b), 'poop');
  if r->>'reason' <> 'emoji' then raise exception 'FAIL emoji: %', r; end if;

  select day into vday from public.village_visits where visitor = a and host = b;
  if vday <> (now() at time zone 'Asia/Seoul')::date then raise exception 'FAIL: KST 날짜가 아니다: %', vday; end if;

  -- 🔐 익명(게스트)은 거절되고 행도 안 생긴다
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := public.neighbor_react(public._nb_public_id(b), 'heart');
  if r->>'reason' <> 'login' then raise exception 'FAIL anon react: %', r; end if;
  select count(*) into n from public.village_visits where visitor = d;
  if n <> 0 then raise exception 'FAIL: 익명 반응이 행을 만들었다'; end if;
  r := public.set_village_public(false);
  if r->>'reason' <> 'login' then raise exception 'FAIL anon toggle: %', r; end if;
  r := public.my_visitors(now() - interval '1 day');
  if r->>'reason' <> 'login' then raise exception 'FAIL anon visitors: %', r; end if;

  -- 비로그인(anon 역할)은 반응 RPC 실행 권한 자체가 없다
  execute 'set local role anon';
  begin
    r := public.neighbor_react(gen_random_uuid(), 'heart');
    raise exception 'FAIL: anon 이 neighbor_react 를 실행했다';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  raise notice 'react checks pass';
end $$;

-- ④ 다녀간 이웃 · 공개 끄기
do $$
declare a uuid; b uuid; r jsonb; full_list uuid[];
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'total')::int <> 1 or r->'list'->0->>'emoji' <> 'heart' or r->'list'->0->>'nick' <> 'selftest-a'
     or not (r->>'is_public')::boolean then raise exception 'FAIL visitors: %', r; end if;
  if strpos(r::text, a::text) > 0 then raise exception 'FAIL: visitors 에 방문자 user_id 가 있다'; end if;
  r := public.my_visitors(now() + interval '1 hour');
  if (r->>'total')::int <> 0 then raise exception 'FAIL visitors since: %', r; end if;

  r := public.set_village_public(false);
  if not (r->>'ok')::boolean or (r->>'is_public')::boolean then raise exception 'FAIL toggle: %', r; end if;
  select array_agg(uid) into full_list from public._nb_candidates(a, (now() at time zone 'Asia/Seoul')::date, 100000);
  if b = any(full_list) then raise exception 'FAIL: 끈 뒤에도 후보에 있다'; end if;
  if public.neighbor_showcase(public._nb_public_id(b)) is not null then raise exception 'FAIL: 끈 뒤에도 showcase'; end if;
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'is_public')::boolean then raise exception 'FAIL: is_public 이 안 바뀌었다: %', r; end if;
  raise notice 'visitors/toggle checks pass';
end $$;

-- ⑤ 직접 쓰기 차단(authenticated 역할)
do $$
declare a uuid; b uuid; blocked boolean := false;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.village_visits (visitor, host, day, emoji) values (a, b, current_date - 1, 'heart');
  exception when others then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'FAIL: village_visits 직접 insert 가 통과했다'; end if;
  raise notice 'NEIGHBORS SELFTEST ALL PASS';
end $$;

rollback;
