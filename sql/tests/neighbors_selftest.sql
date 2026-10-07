-- =============================================================
--  🏡 이웃 마을 RPC 자가 테스트 — **DO 블록 하나**
--  (SQL Editor 는 문장마다 따로 커밋한다 → 여러 문장·temp table 로 나누면 안 된다. 2026-10-07 nb_t 사고)
--  사용법: migrate_neighbors.sql 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          통과: NOTICE 'NEIGHBORS SELFTEST ALL PASS'
--          실패: EXCEPTION 으로 멈추고 블록 전체가 자동 롤백(아무것도 안 남는다).
--  ⚠️ 가짜 계정(nb-selftest-*@example.invalid)을 만들고, 통과하면 맨 끝에서 스스로 지운다(game_saves·village_* 는 cascade).
--     끝나고 확인: select count(*) from auth.users where email like 'nb-selftest-%';   -- 0
-- =============================================================
do $$
declare
  t0 timestamptz := clock_timestamp();
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  d uuid := gen_random_uuid(); e uuid := gen_random_uuid(); f uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); h uuid := gen_random_uuid(); i uuid := gen_random_uuid();
  ids uuid[]; ks text[] := array['a','b','c','d','e','f','g','h','i'];
  x uuid; pid uuid; r jsonb; t jsonb; sc jsonb; t1 jsonb; t2 jsonb; n int; vday date; keys text[];
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  full_list uuid[]; sorted uuid[]; top3 uuid[]; blocked boolean := false;
begin
  ids := array[a, b, c, d, e, f, g, h, i];

  -- ── 준비: a 방문자 · b,f,g,h 공개 이웃 · c 비공개 · d 익명 · e 7일 넘게 안 들어옴 · i 집 0단계 ──
  insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
  select ids[s], 'authenticated', 'authenticated', 'nb-selftest-' || ks[s] || '@example.invalid', ks[s] = 'd', now(), now()
  from generate_subscripts(ids, 1) s;

  insert into public.game_saves (user_id, state, updated_at)
  select ids[s],
    jsonb_build_object(
      'nickname', 'selftest-' || ks[s], 'character', 'rabbit', 'houseStage', case when ks[s] = 'i' then 0 else 3 end,
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
    case when ks[s] = 'e' then now() - interval '10 days' else now() end
  from generate_subscripts(ids, 1) s;

  insert into public.village_profiles (user_id, is_public) values (c, false);

  -- ── ① 후보 규칙 · 날짜 고정 정렬 · today 응답에 user_id 없음 ──
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

  -- ── ② showcase 허용 목록 ──
  pid := public._nb_public_id(f);
  sc := public.neighbor_showcase(pid);
  if sc is null then raise exception 'FAIL: 공개 이웃 showcase 가 null'; end if;
  select array_agg(k2.key order by k2.key collate "C") into keys from jsonb_object_keys(sc) as k2(key);
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

  -- ── ③ 반응: 하루 1회 · 보상 3회 상한 · 비공개/본인/없음/이모지 · KST 날짜 · 익명 거절 · anon 실행 불가 ──
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

  -- ── ④ 다녀간 이웃 · 공개 끄기 ──
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'total')::int <> 1 or r->'list'->0->>'emoji' <> 'heart' or r->'list'->0->>'nick' <> 'selftest-a'
     or not (r->>'is_public')::boolean then raise exception 'FAIL visitors: %', r; end if;
  if strpos(r::text, a::text) > 0 then raise exception 'FAIL: visitors 에 방문자 user_id 가 있다'; end if;
  r := public.my_visitors(now() + interval '1 hour');
  if (r->>'total')::int <> 0 then raise exception 'FAIL visitors since: %', r; end if;

  r := public.set_village_public(false);
  if not (r->>'ok')::boolean or (r->>'is_public')::boolean then raise exception 'FAIL toggle: %', r; end if;
  select array_agg(uid) into full_list from public._nb_candidates(a, v_day, 100000);
  if b = any(full_list) then raise exception 'FAIL: 끈 뒤에도 후보에 있다'; end if;
  if public.neighbor_showcase(public._nb_public_id(b)) is not null then raise exception 'FAIL: 끈 뒤에도 showcase'; end if;
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'is_public')::boolean then raise exception 'FAIL: is_public 이 안 바뀌었다: %', r; end if;
  raise notice 'visitors/toggle checks pass';

  -- ── ⑤ 직접 쓰기 차단(authenticated 역할) ──
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.village_visits (visitor, host, day, emoji) values (a, b, current_date - 1, 'heart');
  exception when others then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'FAIL: village_visits 직접 insert 가 통과했다'; end if;

  -- ── 정리: 가짜 계정(→ game_saves·village_* cascade) + 이 테스트가 만든 프로필 행(기능 출시 전이라 실사용자 행은 없다) ──
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where id = any(ids);
  delete from public.village_profiles where updated_at >= now();   -- now() = 이 트랜잭션 시작 시각(t0 는 그보다 늦어 남는 행이 생겼다)
  raise notice 'NEIGHBORS SELFTEST ALL PASS';
end $$;
