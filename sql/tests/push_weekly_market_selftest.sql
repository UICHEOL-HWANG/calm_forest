do $$
declare
  wk int := 99999;
  kst_today date := (now() at time zone 'Asia/Seoul')::date;
  kst_yesterday date := ((now() at time zone 'Asia/Seoul')::date - 1);
  day_start timestamptz := ((now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul');
  ks text[] := array['in3', 'today', 'old20', 'off', 'notok', 'done', 'prev', 'logged', 'edge', 'start',
                     'two', 'd13', 'd15', 'unjy', 'unjn', 'part', 'dis'];
  ids uuid[] := array[]::uuid[];
  picked uuid[];
  cut_off boolean;
  nrows int;
  idx int;
begin
  for idx in 1..cardinality(ks) loop
    ids := ids || gen_random_uuid();
  end loop;

  insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
  select ids[g.k], 'authenticated', 'authenticated', 'pm-selftest-' || ks[g.k] || '@example.invalid', false, now(), now()
  from generate_series(1, cardinality(ks)) as g(k);

  insert into public.game_saves (user_id, state, updated_at) values
    (ids[1], '{}'::jsonb, now() - interval '3 days'),
    (ids[2], '{}'::jsonb, now()),
    (ids[3], '{}'::jsonb, now() - interval '20 days'),
    (ids[4], '{}'::jsonb, now() - interval '3 days'),
    (ids[5], '{}'::jsonb, now() - interval '3 days'),
    (ids[6], '{}'::jsonb, now() - interval '3 days'),
    (ids[7], '{}'::jsonb, now() - interval '3 days'),
    (ids[8], '{}'::jsonb, now() - interval '3 days'),
    (ids[9], '{}'::jsonb, day_start - interval '1 second'),
    (ids[10], '{}'::jsonb, day_start),
    (ids[11], '{}'::jsonb, now() - interval '3 days'),
    (ids[12], '{}'::jsonb, now() - interval '13 days'),
    (ids[13], '{}'::jsonb, now() - interval '15 days'),
    (ids[14], '{}'::jsonb, now() - interval '3 days'),
    (ids[15], '{}'::jsonb, now() - interval '3 days'),
    (ids[16], '{}'::jsonb, now() - interval '3 days'),
    (ids[17], '{}'::jsonb, now() - interval '3 days');

  insert into public.push_tokens (token, user_id, platform, enabled, lang, market_week, last_checked_on) values
    ('pm-selftest-token-in3-0000000000', ids[1], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-today-00000000', ids[2], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-old20-00000000', ids[3], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-off-0000000000', ids[4], 'android', false, 'ko', null, kst_today),
    ('pm-selftest-token-done-000000000', ids[6], 'android', true, 'ko', wk, kst_today),
    ('pm-selftest-token-prev-000000000', ids[7], 'ios', true, 'en', wk - 1, kst_today),
    ('pm-selftest-token-logged-0000000', ids[8], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-edge-000000000', ids[9], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-start-00000000', ids[10], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-two-a-00000000', ids[11], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-two-b-00000000', ids[11], 'ios', true, 'ko', null, kst_today),
    ('pm-selftest-token-d13-0000000000', ids[12], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-d15-0000000000', ids[13], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-unjy-000000000', ids[14], 'android', true, 'ko', null, kst_yesterday),
    ('pm-selftest-token-unjn-000000000', ids[15], 'android', true, 'ko', null, null),
    ('pm-selftest-token-part-a-0000000', ids[16], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-part-b-0000000', ids[16], 'ios', true, 'ko', null, null),
    ('pm-selftest-token-dis-a-00000000', ids[17], 'android', true, 'ko', null, kst_today),
    ('pm-selftest-token-dis-b-00000000', ids[17], 'android', false, 'ko', null, null);

  insert into public.push_logs (id, user_id, kind, status, http, sent_on)
  values (gen_random_uuid(), ids[8], 'night', 'sent', 200, kst_today);

  select coalesce(array_agg(c.user_id), array[]::uuid[]) into picked
    from public.push_market_candidates(wk, kst_today, 1000) c;
  cut_off := coalesce(array_length(picked, 1), 0) >= 1000;

  if not (ids[1] = any(picked)) and not cut_off then raise exception 'FAIL: active 3 days ago and judged today must be included'; end if;
  if ids[2] = any(picked) then raise exception 'FAIL: active today must be excluded'; end if;
  if ids[3] = any(picked) then raise exception 'FAIL: active 20 days ago must be excluded'; end if;
  if ids[4] = any(picked) then raise exception 'FAIL: opted out must be excluded'; end if;
  if ids[5] = any(picked) then raise exception 'FAIL: no token must be excluded'; end if;
  if ids[6] = any(picked) then raise exception 'FAIL: already marked this week must be excluded'; end if;
  if not (ids[7] = any(picked)) and not cut_off then raise exception 'FAIL: marked last week must be included'; end if;
  if ids[8] = any(picked) then raise exception 'FAIL: already pushed today must be excluded'; end if;
  if not (ids[9] = any(picked)) and not cut_off then raise exception 'FAIL: last second of yesterday KST must be included'; end if;
  if ids[10] = any(picked) then raise exception 'FAIL: first second of today KST must be excluded'; end if;
  if not (ids[12] = any(picked)) and not cut_off then raise exception 'FAIL: active 13 days ago must be included'; end if;
  if ids[13] = any(picked) then raise exception 'FAIL: active 15 days ago must be excluded'; end if;
  if ids[14] = any(picked) then raise exception 'FAIL: not yet judged today (checked yesterday) must be excluded'; end if;
  if ids[15] = any(picked) then raise exception 'FAIL: never judged (null last_checked_on) must be excluded'; end if;
  if ids[16] = any(picked) then raise exception 'FAIL: account with a still-unjudged token must be excluded'; end if;
  if not (ids[17] = any(picked)) and not cut_off then raise exception 'FAIL: disabled unstamped token must not block an account with a judged enabled token'; end if;

  select count(*) into nrows from public.push_market_candidates(wk, kst_today, 1000) c where c.user_id = ids[11];
  if nrows > 1 or (nrows = 0 and not cut_off) then raise exception 'FAIL: two-token account must yield exactly one row, got %', nrows; end if;

  perform public.push_market_mark(wk, array['pm-selftest-token-in3-0000000000', 'pm-selftest-token-two-a-00000000'],
                                     array['pm-selftest-token-prev-000000000']);

  select count(*) into nrows from public.push_tokens where user_id = ids[11] and market_week = wk;
  if nrows <> 2 then raise exception 'FAIL: marker must be set on both tokens of the account, got %', nrows; end if;
  select count(*) into nrows from public.push_tokens where user_id = ids[1] and market_week = wk;
  if nrows <> 1 then raise exception 'FAIL: marker not written'; end if;
  select count(*) into nrows from public.push_tokens where user_id = ids[7];
  if nrows <> 0 then raise exception 'FAIL: dead token must be deleted'; end if;
  select count(*) into nrows from public.push_tokens where user_id = ids[1] and last_checked_on is distinct from kst_today;
  if nrows <> 0 then raise exception 'FAIL: market mark must not touch last_checked_on'; end if;

  select coalesce(array_agg(c.user_id), array[]::uuid[]) into picked
    from public.push_market_candidates(wk, kst_today, 1000) c;
  if ids[1] = any(picked) or ids[11] = any(picked) then raise exception 'FAIL: marked users must drop out of the second run'; end if;

  if has_function_privilege('anon', 'public.push_market_candidates(int, date, int)', 'execute')
     or has_function_privilege('authenticated', 'public.push_market_candidates(int, date, int)', 'execute')
     or has_function_privilege('anon', 'public.push_market_mark(int, text[], text[])', 'execute')
     or has_function_privilege('authenticated', 'public.push_market_mark(int, text[], text[])', 'execute') then
    raise exception 'FAIL: client roles must not execute the market functions';
  end if;
  if not has_function_privilege('service_role', 'public.push_market_candidates(int, date, int)', 'execute')
     or not has_function_privilege('service_role', 'public.push_market_mark(int, text[], text[])', 'execute') then
    raise exception 'FAIL: service_role must execute the market functions';
  end if;

  delete from auth.users where id = any(ids);
  select count(*) into nrows from auth.users where email like 'pm-selftest-%';
  if nrows <> 0 then raise exception 'FAIL: fixtures left behind: %', nrows; end if;
  if cut_off then raise notice 'inclusion checks skipped: more than 1000 real candidates'; end if;
  raise notice 'PUSH WEEKLY MARKET SELFTEST ALL PASS';
end $$;
