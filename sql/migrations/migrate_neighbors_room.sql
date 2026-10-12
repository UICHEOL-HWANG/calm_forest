-- =============================================================
--  🏠 이웃 마을 2단계 — 실내 가구(house.decor)를 showcase 에 'room' 으로 (2026-10-11)
--  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §4.1
--  ⚠️ 적용 순서: migrate_neighbors.sql → _sim_split → _moderation → _ledger → _report_block(_2) → **이 파일**.
--     _moderation.sql 을 다시 돌리면 neighbor_showcase 가 room 없는 본문으로 돌아간다 → 그 뒤 이 파일을 다시.
--  본문은 migrate_neighbors.sql(최종본)과 같아야 한다(tests/neighbors-sync).
-- =============================================================

-- 🏠 실내 가구만 — house.decor 의 {id,x,z,rot,f}. 좌표는 INT 기준 상대값(방 반폭 7 + 여유 = 7.5), 최대 120.
--    js/neighbors/sanitize.js ROOM_MAX·ROOM_MAX_XY 와 같아야 한다(tests/neighbors-sync)
create or replace function public._nb_room(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', y.o->'id', 'x', y.o->'x', 'z', y.o->'z',
           'rot', case when jsonb_typeof(y.o->'rot') = 'number' and (y.o->>'rot')::numeric in (0, 1, 2, 3) then y.o->'rot' else '0'::jsonb end,
           'f',   case when jsonb_typeof(y.o->'f') = 'number' and (y.o->>'f')::numeric in (0, 1, 2, 3) then y.o->'f' else '0'::jsonb end) order by y.ord), '[]'::jsonb)
  from (
    select e.o, e.ord
    from jsonb_array_elements(case when jsonb_typeof(p_state #> '{house,decor}') = 'array' then p_state #> '{house,decor}' else '[]'::jsonb end)
         with ordinality as e(o, ord)
    where jsonb_typeof(e.o) = 'object' and jsonb_typeof(e.o->'id') = 'string' and length(e.o->>'id') <= 40
      and jsonb_typeof(e.o->'x') = 'number' and jsonb_typeof(e.o->'z') = 'number'
      and abs((e.o->>'x')::numeric) <= 7.5 and abs((e.o->>'z')::numeric) <= 7.5
    order by e.ord
    limit 120
  ) y;
$$;

revoke all on function public._nb_room(jsonb) from public, anon, authenticated;

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
    'coop',       jsonb_build_object('built', coalesce(s #> '{coop,built}' = 'true'::jsonb, false))
  );
end $$;
