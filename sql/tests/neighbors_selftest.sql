-- =============================================================
--  🏡 이웃 마을 RPC 자가 테스트 — **DO 블록 하나**
--  (SQL Editor 는 문장마다 따로 커밋한다 → 여러 문장·temp table 로 나누면 안 된다. 2026-10-07 nb_t 사고)
--  사용법: migrate_neighbors.sql(+ _sim_split · _moderation) 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          통과: NOTICE 'NEIGHBORS SELFTEST ALL PASS'
--          실패: EXCEPTION 으로 멈추고 블록 전체가 자동 롤백(아무것도 안 남는다).
--  ⚠️ 가짜 계정(nb-selftest-*@example.invalid · nb-selftest-*@sim.calmforest.local)을 만들고, 통과하면 맨 끝에서 스스로 지운다(game_saves·village_* 는 cascade).
--     끝나고 확인: select count(*) from auth.users where email like 'nb-selftest-%';   -- 0
-- =============================================================
do $$
declare
  t0 timestamptz := clock_timestamp();
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
  d uuid := gen_random_uuid(); e uuid := gen_random_uuid(); f uuid := gen_random_uuid();
  g uuid := gen_random_uuid(); h uuid := gen_random_uuid(); i uuid := gen_random_uuid();
  j uuid := gen_random_uuid();   -- 🧑‍🤝‍🧑 페르소나(@sim.calmforest.local) 가짜
  -- 🛡️ 모더레이션 가짜: bad 금칙어 닉네임(페르소나) · hid 관리자 숨김 · nh 닉네임 가림 · simcaller bad 를 상위 3명에 두는 페르소나 호출자
  bad uuid := gen_random_uuid(); hid uuid := gen_random_uuid(); nh uuid := gen_random_uuid(); simcaller uuid; tries int;
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

  -- ── ①-b 페르소나 분리: sim 계정은 실사용자(a) 후보에 없고, sim 의 후보엔 실사용자(b) 가 없다 ──
  insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
  values (j, 'authenticated', 'authenticated', 'nb-selftest-sim@sim.calmforest.local', false, now(), now());
  insert into public.game_saves (user_id, state, updated_at)
  values (j, jsonb_build_object('nickname', 'selftest-sim', 'character', 'rabbit', 'houseStage', 3), now());
  ids := ids || j;   -- 정리 때 페르소나 가짜도 지운다
  select array_agg(uid) into full_list from public._nb_candidates(a, v_day, 100000);
  if j = any(full_list) then raise exception 'FAIL: 페르소나(sim)가 실사용자 후보에 있다'; end if;
  select array_agg(uid) into full_list from public._nb_candidates(j, v_day, 100000);
  if b = any(coalesce(full_list, '{}')) then raise exception 'FAIL: 실사용자(b)가 페르소나 후보에 있다'; end if;
  raise notice 'persona split checks pass';

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

  -- ── ⑥ 🛡️ 모더레이션: 금칙어 닉네임 가림 · 관리자 숨김 · 닉네임 가림 · 관리자 RPC 가드 ──
  perform set_config('request.jwt.claims', '', true);
  if public._nb_nick(jsonb_build_object('nickname', '시 발'), null) <> '이름 없는 여행자'
     or public._nb_nick(jsonb_build_object('nickname', 'F.U.C.K'), null) <> '이름 없는 여행자'
     or public._nb_nick(jsonb_build_object('nickname', 'ㅅㅂ'), null) <> '이름 없는 여행자'
     or public._nb_nick(jsonb_build_object('nickname', 'fuuuuck'), null) <> '이름 없는 여행자'
     or public._nb_nick(jsonb_build_object('nickname', '   '), null) <> '이름 없는 여행자'
     or public._nb_nick('{}'::jsonb, null) <> '이름 없는 여행자' then
    raise exception 'FAIL _nb_nick: 금칙어·빈 닉네임이 그대로 나간다'; end if;
  if public._nb_nick(jsonb_build_object('nickname', '  조용한 곰 #1234  '), null) <> '조용한 곰 #1234'
     or public._nb_nick(jsonb_build_object('nickname', 'Shiitake Bear'), null) <> 'Shiitake Bear'
     or public._nb_nick(jsonb_build_object('nickname', '시바견 키우는 고양이 집사랍니다'), null) <> left('시바견 키우는 고양이 집사랍니다', 16) then
    raise exception 'FAIL _nb_nick: 평범한 닉네임이 가려졌다'; end if;

  insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at) values
    (bad, 'authenticated', 'authenticated', 'nb-selftest-bad@sim.calmforest.local', false, now(), now()),
    (hid, 'authenticated', 'authenticated', 'nb-selftest-hid@example.invalid', false, now(), now()),
    (nh,  'authenticated', 'authenticated', 'nb-selftest-nh@example.invalid', false, now(), now());
  insert into public.game_saves (user_id, state, updated_at) values
    (bad, jsonb_build_object('nickname', '씨.발 selftest-bad', 'character', 'cat', 'houseStage', 3), now()),
    (hid, jsonb_build_object('nickname', 'selftest-hid', 'character', 'cat', 'houseStage', 3), now()),
    (nh,  jsonb_build_object('nickname', 'selftest-nh', 'character', 'cat', 'houseStage', 3), now());
  ids := ids || array[bad, hid, nh];
  insert into public.village_profiles (user_id, hidden_by_admin) values (hid, true);
  insert into public.village_profiles (user_id, nick_hidden) values (nh, true);

  -- 관리자 숨김은 후보·구경에서 빠지고, 닉네임만 가린 계정은 후보에 남되 이름이 가려진다
  select array_agg(uid) into full_list from public._nb_candidates(a, v_day, 100000);
  if hid = any(full_list) then raise exception 'FAIL: 관리자 숨김(hid)이 후보에 있다'; end if;
  if not (nh = any(full_list)) then raise exception 'FAIL: 닉네임만 가린(nh)은 후보에 있어야 한다'; end if;
  if public.neighbor_showcase(public._nb_public_id(hid)) is not null then raise exception 'FAIL: 관리자 숨김 showcase 가 null 이 아니다'; end if;
  sc := public.neighbor_showcase(public._nb_public_id(nh));
  if sc->>'nickname' <> '이름 없는 여행자' then raise exception 'FAIL: nick_hidden showcase: %', sc->>'nickname'; end if;
  sc := public.neighbor_showcase(public._nb_public_id(bad));
  if sc->>'nickname' <> '이름 없는 여행자' then raise exception 'FAIL: 금칙어 showcase: %', sc->>'nickname'; end if;
  if public.neighbor_showcase(public._nb_public_id(f))->>'nickname' <> 'selftest-f' then raise exception 'FAIL: 평범한 닉네임 showcase 가 가려졌다'; end if;

  -- 다녀간 이웃: f 에게 a(앞서 wave)·bad·nh 가 다녀간다 → bad·nh 는 가려진다
  perform set_config('request.jwt.claims', json_build_object('sub', bad, 'role', 'authenticated')::text, true);
  r := public.neighbor_react(public._nb_public_id(f), 'heart');
  if not (r->>'ok')::boolean then raise exception 'FAIL react bad: %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', nh, 'role', 'authenticated')::text, true);
  r := public.neighbor_react(public._nb_public_id(f), 'star');
  if not (r->>'ok')::boolean then raise exception 'FAIL react nh: %', r; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  r := public.my_visitors(now() - interval '1 hour');
  select count(*) into n from jsonb_array_elements(r->'list') e where e->>'nick' = '이름 없는 여행자';
  if (r->>'total')::int <> 3 or n <> 2 or strpos(r::text, 'selftest-bad') > 0 or strpos(r::text, 'selftest-nh') > 0
     or not exists (select 1 from jsonb_array_elements(r->'list') e where e->>'nick' = 'selftest-a') then
    raise exception 'FAIL visitors 가림: %', r; end if;

  -- 오늘의 이웃: bad 를 상위 3명에 두는 페르소나 호출자를 골라(md5 정렬은 결정적) today 응답에서 가려졌는지 본다
  select array_agg(uid) into full_list from public._nb_candidates(j, v_day, 100000);   -- j 를 뺀 페르소나 전원
  full_list := full_list || j;
  if not (bad = any(full_list)) then raise exception 'FAIL: bad 가 페르소나 후보에 없다'; end if;
  for tries in 1..20000 loop
    x := gen_random_uuid();
    select array_agg(u order by md5(x::text || v_day::text || u::text)) into sorted from unnest(full_list) u;
    if bad = any(sorted[1:3]) then simcaller := x; exit; end if;
  end loop;
  if simcaller is null then raise exception 'FAIL: bad 를 상위 3명에 둔 호출자를 못 찾았다'; end if;
  insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
  values (simcaller, 'authenticated', 'authenticated', 'nb-selftest-simcaller@sim.calmforest.local', false, now(), now());
  ids := ids || simcaller;
  select array_agg(uid order by k) into top3 from public._nb_candidates(simcaller, v_day, 3);
  if not (bad = any(top3)) then raise exception 'FAIL: 예측한 상위 3명과 다르다: %', top3; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', simcaller, 'role', 'authenticated')::text, true);
  t := public.neighbors_today();
  pid := public._nb_public_id(bad);
  if not exists (select 1 from jsonb_array_elements(t->'list') e where e->>'public_id' = pid::text and e->>'nick' = '이름 없는 여행자')
     or strpos(t::text, 'selftest-bad') > 0 then
    raise exception 'FAIL: today 가 금칙어 닉네임을 가리지 않았다: %', t; end if;

  -- 관리자 RPC: 관리자 아닌 로그인 유저 → forbidden, 플래그 그대로 · anon 은 실행 권한 없음
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated', 'email', 'nb-selftest-a@example.invalid')::text, true);
  r := public.admin_village_find('selftest');
  if r->>'reason' is distinct from 'forbidden' then raise exception 'FAIL: 비관리자 admin_village_find: %', r; end if;
  r := public.admin_village_moderate(public._nb_public_id(nh), true, false);
  if r->>'reason' is distinct from 'forbidden' then raise exception 'FAIL: 비관리자 admin_village_moderate: %', r; end if;
  if (select hidden_by_admin or not nick_hidden from public.village_profiles where user_id = nh) then
    raise exception 'FAIL: 비관리자 호출이 플래그를 바꿨다'; end if;
  execute 'set local role anon';
  begin
    r := public.admin_village_find('selftest');
    raise exception 'FAIL: anon 이 admin_village_find 를 실행했다';
  exception when insufficient_privilege then null;
  end;
  begin
    r := public.admin_village_moderate(gen_random_uuid(), true, true);
    raise exception 'FAIL: anon 이 admin_village_moderate 를 실행했다';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';

  -- 관리자(명단의 클레임을 흉내) → 찾기·숨김 해제·닉네임 가림·다시 숨김. 가짜 계정(hid)만 건드린다
  perform set_config('request.jwt.claims', json_build_object('sub', '17bb08c7-c4bc-4870-b464-1b131e67aff8', 'role', 'authenticated', 'email', 'icuchoel@gmail.com')::text, true);
  if not public.cf_is_admin() then raise exception 'FAIL: 관리자 클레임인데 cf_is_admin 이 false — 관리자 명단이 바뀌었으면 이 줄도 고칠 것'; end if;
  r := public.admin_village_find('selftest-hid');
  if not (r->>'ok')::boolean or jsonb_array_length(r->'list') <> 1 or r->'list'->0->>'nick' <> 'selftest-hid'
     or not (r->'list'->0->>'hidden_by_admin')::boolean or (r->'list'->0->>'house_stage')::int <> 3 then
    raise exception 'FAIL admin find: %', r; end if;
  if strpos(r::text, hid::text) > 0 or strpos(r::text, 'example.invalid') > 0 then raise exception 'FAIL: admin find 에 user_id/이메일: %', r; end if;
  r := public.admin_village_find('selftest_hid');   -- '_' 는 와일드카드가 아니라 글자 그대로
  if jsonb_array_length(r->'list') <> 0 then raise exception 'FAIL: ilike 이스케이프: %', r; end if;
  r := public.admin_village_find('  ');
  if r->>'reason' is distinct from 'query' then raise exception 'FAIL: 빈 검색어: %', r; end if;
  pid := public._nb_public_id(hid);
  r := public.admin_village_moderate(pid, false, null);
  if not (r->>'ok')::boolean or (r->>'hidden_by_admin')::boolean or (r->>'nick_hidden')::boolean then raise exception 'FAIL moderate unhide: %', r; end if;
  select array_agg(uid) into full_list from public._nb_candidates(a, v_day, 100000);
  if not (hid = any(full_list)) or public.neighbor_showcase(pid) is null then raise exception 'FAIL: 숨김 해제 뒤에도 안 보인다'; end if;
  r := public.admin_village_moderate(pid, null, true);
  if public.neighbor_showcase(pid)->>'nickname' <> '이름 없는 여행자' then raise exception 'FAIL: 닉네임 가림이 안 먹었다'; end if;
  r := public.admin_village_moderate(pid, true, null);
  select array_agg(uid) into full_list from public._nb_candidates(a, v_day, 100000);
  if hid = any(full_list) or public.neighbor_showcase(pid) is not null or not (r->>'nick_hidden')::boolean then
    raise exception 'FAIL: 다시 숨김: %', r; end if;
  r := public.admin_village_moderate(gen_random_uuid(), true, true);
  if r->>'reason' is distinct from 'not_found' then raise exception 'FAIL moderate not_found: %', r; end if;
  raise notice 'moderation checks pass';

  -- ── 정리: 가짜 계정(→ game_saves·village_* cascade) + 이 테스트가 만든 프로필 행(기능 출시 전이라 실사용자 행은 없다) ──
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where id = any(ids);
  delete from public.village_profiles where updated_at >= now();   -- now() = 이 트랜잭션 시작 시각(t0 는 그보다 늦어 남는 행이 생겼다)
  raise notice 'NEIGHBORS SELFTEST ALL PASS';
end $$;
