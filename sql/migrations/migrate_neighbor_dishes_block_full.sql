begin;

create or replace function public.neighbor_dish_leave(p_public_id uuid, p_recipe text, p_score int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date := _nb_kst_today();
  v_score int  := greatest(0, least(100, coalesce(p_score, 0)));
  v_host  uuid;
  v_pub   boolean;
  v_hid   boolean;
  v_cnt   int;
  v_id    bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_recipe is null or p_recipe not in ('veg_stew','mushroom_soup','rice_ball','baked_yam','herb_salad','grilled_fish','omelette','bread','grape_juice','lunchbox','forest_feast') then
    return jsonb_build_object('ok', false, 'reason', 'recipe'); end if;
  select user_id, is_public, hidden_by_admin into v_host, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_host = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if exists (select 1 from auth.users u where u.id = v_host and coalesce(u.is_anonymous, false)) then
    return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if (select lower(coalesce(u.email, '')) like '%@sim.calmforest.local' from auth.users u where u.id = v_host)
     is distinct from (select lower(coalesce(u.email, '')) like '%@sim.calmforest.local' from auth.users u where u.id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not v_pub or v_hid then return jsonb_build_object('ok', false, 'reason', 'private'); end if;
  if _nb_blocked(v_uid, v_host) then return jsonb_build_object('ok', false, 'reason', 'private'); end if;
  if exists (select 1 from village_profiles where user_id = v_uid and hidden_by_admin) then
    return jsonb_build_object('ok', false, 'reason', 'hidden'); end if;
  perform pg_advisory_xact_lock(hashtext('nbd:' || v_uid::text));
  if exists (select 1 from village_dishes where giver = v_uid and host = v_host and day = v_day) then
    return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  select count(*) into v_cnt from village_dishes where giver = v_uid and day = v_day;
  if v_cnt >= 3 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  perform pg_advisory_xact_lock(hashtext('nbdh:' || v_host::text));
  select count(*) into v_cnt from village_dishes where host = v_host and eaten_at is null and created_at > now() - interval '7 days' and not _nb_blocked(v_host, giver);
  if v_cnt >= 6 then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
  insert into village_dishes (giver, host, day, recipe, score, stars) values (v_uid, v_host, v_day, p_recipe, v_score, _nb_dish_stars(v_score))
  on conflict (giver, host, day) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'stars', _nb_dish_stars(v_score), 'rewarded', true);
end $$;

commit;
