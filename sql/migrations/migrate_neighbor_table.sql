-- =============================================================
--  🍽️ 이웃 마당 식탁 — kitchen.best 를 showcase 에 'table' 로 (2026-11-17)
--  neighbor_showcase 본문은 migrate_neighbor_pond.sql 의 것(= migrate_neighbors.sql 최종본)에 'table' 한 줄을 더했다.
--  ⚠️ 이 파일을 적용한 뒤에는 migrate_neighbor_pond.sql · _room · _moderation 을 다시 돌리지 말 것(table 이 빠진다).
--  본문은 migrate_neighbors.sql(최종본)과 같아야 한다(tests/neighbors-sync).
-- =============================================================

create or replace function public._nb_table(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  with d as (
    select k.key as id, (k.value #>> '{}')::numeric as s
    from jsonb_each(case when jsonb_typeof(p_state #> '{kitchen,best}') = 'object' then p_state #> '{kitchen,best}' else '{}'::jsonb end) k
    where k.key in ('veg_stew','mushroom_soup','rice_ball','baked_yam','herb_salad','grilled_fish','omelette','bread','grape_juice','lunchbox','forest_feast')
      and case when jsonb_typeof(k.value) = 'number' then (k.value #>> '{}')::numeric > 0 else false end
  )
  select jsonb_build_object('dishes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'tier',
    case when s >= 88 then 'perfect' when s >= 65 then 'great' when s >= 35 then 'good' else 'plain' end)
    order by array_position(array['veg_stew','mushroom_soup','rice_ball','baked_yam','herb_salad','grilled_fish','omelette','bread','grape_juice','lunchbox','forest_feast'], id)) from d), '[]'::jsonb));
$$;

revoke all on function public._nb_table(jsonb) from public, anon, authenticated;

create or replace function public.neighbor_showcase(p_public_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid; v_pub boolean; v_hid boolean; s jsonb;
begin
  if p_public_id is null then return null; end if;
  select user_id, is_public, hidden_by_admin into v_user, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found or not v_pub or v_hid then return null; end if;
  if exists (select 1 from auth.users u where u.id = v_user and coalesce(u.is_anonymous, false)) then return null; end if;
  select state into s from game_saves where user_id = v_user;
  if s is null or jsonb_typeof(s) <> 'object' then return null; end if;
  -- ⚠️ 허용 목록 — 키를 하나씩 고른다. 여기 없는 세이브 필드는 절대 나가지 않는다
  return jsonb_build_object(
    'nickname',   to_jsonb(_nb_nick(s, v_user)),
    'character',  _nb_str(s->'character', 16),
    'equipped',   jsonb_build_object(
                    'head',  _nb_str(s #> '{cosmetics,equipped,head}'),
                    'neck',  _nb_str(s #> '{cosmetics,equipped,neck}'),
                    'back',  _nb_str(s #> '{cosmetics,equipped,back}'),
                    'trail', _nb_str(s #> '{cosmetics,equipped,trail}'),
                    'skin',  _nb_str(s #> '{cosmetics,equipped,skin}')),
    'pet',        case when jsonb_typeof(s->'pet') = 'object'
                    then jsonb_build_object('kind', _nb_str(s #> '{pet,kind}', 16), 'works', _nb_num(s #> '{pet,works}'))
                    else 'null'::jsonb end,
    'houseStage', _nb_num(s->'houseStage'),
    'houseStyle', jsonb_build_object('roof', _nb_num(s #> '{houseStyle,roof}'),
                                     'wall', _nb_num(s #> '{houseStyle,wall}'),
                                     'door', _nb_num(s #> '{houseStyle,door}')),
    'style',      _nb_str(s #> '{house,style}', 16),
    'addons',     (select coalesce(jsonb_agg(q.v), '[]'::jsonb) from (
                     select e.v from jsonb_array_elements(case when jsonb_typeof(s #> '{house,addons}') = 'array'
                                                               then s #> '{house,addons}' else '[]'::jsonb end) as e(v)
                     where jsonb_typeof(e.v) = 'string' and length(e.v #>> '{}') <= 40 limit 40) q),
    'outdoor',    _nb_yard(s),
    'room',       _nb_room(s),
    'coop',       jsonb_build_object('built', coalesce(s #> '{coop,built}' = 'true'::jsonb, false)),
    'pond',       _nb_pond(s),
    'table',      _nb_table(s)
  );
end $$;
