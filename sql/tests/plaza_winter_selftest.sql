do $$
declare
  v_member uuid;
  v_guest  uuid;
  r jsonb;
  p jsonb;
begin
  select id into v_member from auth.users where coalesce(is_anonymous, false) = false order by created_at limit 1;
  select id into v_guest from auth.users where is_anonymous order by created_at limit 1;
  if v_member is null or v_guest is null then raise exception 'WINTER_SELFTEST_SETUP no users'; end if;

  insert into plaza_seasons (season, starts_at, ends_at, daily_cap, allow_guests, per_user)
    values ('wtest-selftest', now() - interval '1 hour', now() + interval '1 hour', 30, true, true);
  insert into plaza_needs (season, stage, item, need)
    values ('wtest-selftest', 1, 'wood', 20), ('wtest-selftest', 1, 'stone', 15), ('wtest-selftest', 2, 'coal', 10);

  perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := plaza_give('wtest-selftest', 1, 'wood', 25);
  assert (r->>'ok')::boolean and (r->>'accepted')::int = 20 and (r->>'today_left')::int = 10 and (r->>'village_before')::int = 0, 'guest give capped by personal need: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'wood', 1);
  assert r->>'reason' = 'need', 'personal need full: ' || r::text;
  r := plaza_give('wtest-selftest', 2, 'coal', 10);
  assert (r->>'accepted')::int = 10 and (r->>'today_left')::int = 0, 'stage order is client side: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'stone', 1);
  assert r->>'reason' = 'cap', 'daily cap: ' || r::text;
  r := plaza_give('wtest-selftest', 3, 'fish', 1);
  assert r->>'reason' = 'need', 'unknown need: ' || r::text;

  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  r := plaza_donate('wtest-selftest', 'wood', 1);
  assert r->>'reason' = 'season', 'plaza_donate refuses per-user season: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'wood', 5);
  assert (r->>'accepted')::int = 5 and (r->>'village_before')::int = 30 and (r->>'my_total')::int = 5, 'member give: ' || r::text;
  p := plaza_progress('wtest-selftest');
  assert (p->>'total')::int = 35 and (p->>'per_user')::boolean, 'progress total: ' || p::text;

  update plaza_seasons set allow_guests = false where season = 'wtest-selftest';
  perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := plaza_give('wtest-selftest', 1, 'stone', 1);
  assert r->>'reason' = 'login', 'guests off: ' || r::text;

  p := plaza_progress('harvest-2026');
  assert (p->>'completed')::boolean and (p->>'stage')::int = 4 and not (p->>'per_user')::boolean, 'harvest unchanged: ' || p::text;

  raise exception 'WINTER_SELFTEST_OK';
end $$;
