create or replace function public._nb_pond(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  with fish as (
    select k.key as id, (k.value #>> '{}')::numeric as t
    from jsonb_each(case when jsonb_typeof(p_state #> '{dex,fish}') = 'object' then p_state #> '{dex,fish}' else '{}'::jsonb end) k
    where k.key in ('sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common')
      and jsonb_typeof(k.value) = 'number'
    order by 2, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], k.key)
    limit 7
  ), sea as (
    select k.key as sp, (k.value #>> '{}')::numeric as w
    from jsonb_each(case when jsonb_typeof(p_state #> '{sea,best}') = 'object' then p_state #> '{sea,best}' else '{}'::jsonb end) k
    where k.key in ('aji','buri','mola','tuna')
      and case when jsonb_typeof(k.value) = 'number' then (k.value #>> '{}')::numeric > 0 else false end
    order by 2 desc, array_position(array['aji','buri','mola','tuna'], k.key)
    limit 1
  )
  select jsonb_build_object(
    'fish', coalesce((select jsonb_agg(id order by t, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], id)) from fish), '[]'::jsonb),
    'sea', (select jsonb_build_object('sp', sp, 'w', w) from sea));
$$;

revoke all on function public._nb_pond(jsonb) from public, anon, authenticated;

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
    'pond',       _nb_pond(s)
  );
end $$;
