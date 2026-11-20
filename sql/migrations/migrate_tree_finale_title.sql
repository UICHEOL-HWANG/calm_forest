create or replace function public.neighbors_today()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_list jsonb;
  v_rew  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  insert into village_profiles (user_id) select c.uid from _nb_candidates(v_uid, v_day, 3) c
  on conflict (user_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', vp.public_id,
           'nick', _nb_nick(gs.state, c.uid),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'house_stage', (gs.state->>'houseStage')::numeric::int,
           'decor_n', jsonb_array_length(_nb_yard(gs.state)),
           'visited_today', vv.emoji is not null,
           'reacted_emoji', vv.emoji,
           'title', case when jsonb_typeof(gs.state->'story'->'ch') = 'number'
                          and (gs.state->'story'->>'ch')::numeric >= 9 then 'keeper' end
         ) order by c.k), '[]'::jsonb)
    into v_list
  from _nb_candidates(v_uid, v_day, 3) c
  join game_saves gs on gs.user_id = c.uid
  join village_profiles vp on vp.user_id = c.uid
  left join village_visits vv on vv.visitor = v_uid and vv.host = c.uid and vv.day = v_day;
  select count(*) into v_rew from village_visits where visitor = v_uid and day = v_day and rewarded;
  return jsonb_build_object('ok', true, 'list', v_list, 'rewarded_today', v_rew);
end $$;
