begin;

create table if not exists public.village_dishes (
  id         bigserial primary key,
  giver      uuid not null references auth.users(id) on delete cascade,
  host       uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  recipe     text not null check (recipe in ('veg_stew','mushroom_soup','rice_ball','baked_yam','herb_salad','grilled_fish','omelette','bread','grape_juice','lunchbox','forest_feast')),
  score      int  not null check (score between 0 and 100),
  stars      int  not null check (stars between 1 and 3),
  created_at timestamptz not null default now(),
  eaten_at   timestamptz,
  emoji      text check (emoji in ('wave','heart','flower','star')),
  rated_at   timestamptz,
  unique (giver, host, day),
  check (giver <> host)
);
create index if not exists village_dishes_host_open on public.village_dishes (host, created_at desc) where eaten_at is null;
create index if not exists village_dishes_host_eaten on public.village_dishes (host, eaten_at desc) where eaten_at is not null;
create index if not exists village_dishes_giver_day on public.village_dishes (giver, day);
create index if not exists village_dishes_giver_rated on public.village_dishes (giver, rated_at desc) where rated_at is not null;

alter table public.village_dishes enable row level security;
revoke all on table public.village_dishes from public, anon, authenticated;
revoke all on sequence public.village_dishes_id_seq from public, anon, authenticated;

create or replace function public._nb_dish_stars(p_score int)
returns int language sql immutable set search_path = public as $$
  select case when p_score >= 88 then 3 when p_score >= 65 then 2 else 1 end;
$$;
revoke all on function public._nb_dish_stars(int) from public, anon, authenticated;

create or replace function public._nb_open_id(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select vp.public_id from village_profiles vp
   where vp.user_id = p_user and vp.is_public and not vp.hidden_by_admin
     and not exists (select 1 from auth.users u where u.id = p_user and coalesce(u.is_anonymous, false));
$$;
revoke all on function public._nb_open_id(uuid) from public, anon, authenticated;

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
  select count(*) into v_cnt from village_dishes where host = v_host and eaten_at is null and created_at > now() - interval '7 days';
  if v_cnt >= 6 then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
  insert into village_dishes (giver, host, day, recipe, score, stars) values (v_uid, v_host, v_day, p_recipe, v_score, _nb_dish_stars(v_score))
  on conflict (giver, host, day) do nothing
  returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'stars', _nb_dish_stars(v_score), 'rewarded', true);
end $$;

create or replace function public.my_table_dishes()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_list jsonb;
  v_ate  boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  select exists (select 1 from village_dishes where host = v_uid and eaten_at is not null
                  and (eaten_at at time zone 'Asia/Seoul')::date = _nb_kst_today()) into v_ate;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'recipe', x.recipe, 'stars', x.stars, 'at', x.created_at,
           'nick', _nb_nick(gs.state, x.giver),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'public_id', _nb_open_id(x.giver)) order by x.created_at desc), '[]'::jsonb)
    into v_list
  from (
    select d.id, d.giver, d.recipe, d.stars, d.created_at from village_dishes d
     where d.host = v_uid and d.eaten_at is null and d.created_at > now() - interval '7 days' and not _nb_blocked(v_uid, d.giver)
     order by d.created_at desc limit 6
  ) x
  left join game_saves gs on gs.user_id = x.giver;
  return jsonb_build_object('ok', true, 'list', v_list, 'ate_today', v_ate);
end $$;

create or replace function public.neighbor_dish_eat(p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_recipe text;
  v_stars  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  perform pg_advisory_xact_lock(hashtext('nbe:' || v_uid::text));
  if exists (select 1 from village_dishes where host = v_uid and eaten_at is not null
              and (eaten_at at time zone 'Asia/Seoul')::date = _nb_kst_today()) then
    return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  update village_dishes set eaten_at = now()
   where id = p_id and host = v_uid and eaten_at is null and created_at > now() - interval '7 days' and not _nb_blocked(v_uid, giver)
  returning recipe, stars into v_recipe, v_stars;
  if not found then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'id', p_id, 'recipe', v_recipe, 'stars', v_stars);
end $$;

create or replace function public.neighbor_dish_rate(p_id bigint, p_emoji text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_emoji is null or p_emoji not in ('wave', 'heart', 'flower', 'star') then return jsonb_build_object('ok', false, 'reason', 'emoji'); end if;
  update village_dishes set emoji = p_emoji, rated_at = now()
   where id = p_id and host = v_uid and eaten_at is not null and rated_at is null;
  if found then return jsonb_build_object('ok', true, 'reason', 'ok'); end if;
  if exists (select 1 from village_dishes where id = p_id and host = v_uid and rated_at is not null) then
    return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  return jsonb_build_object('ok', false, 'reason', 'gone');
end $$;

create or replace function public.my_visitors(p_since timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_since   timestamptz := coalesce(p_since, now() - interval '2 days');
  v_total   int;
  v_list    jsonb;
  v_replies jsonb;
  v_pub     boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  insert into village_profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  select is_public into v_pub from village_profiles where user_id = v_uid;
  select count(distinct u.visitor) into v_total from (
    select visitor from village_visits where host = v_uid and created_at > v_since
    union all
    select giver from village_dishes where host = v_uid and created_at > v_since
  ) u where not _nb_blocked(v_uid, u.visitor);
  select coalesce(jsonb_agg(jsonb_build_object(
           'nick', _nb_nick(gs.state, x.visitor),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'emoji', x.emoji, 'at', x.created_at,
           'public_id', _nb_open_id(x.visitor),
           'dish', (select max(dd.stars) from village_dishes dd where dd.host = v_uid and dd.giver = x.visitor and dd.created_at > v_since))
           order by x.created_at desc), '[]'::jsonb)
    into v_list
  from (
    select dd.visitor, dd.emoji, dd.created_at from (
      select distinct on (u.visitor) u.visitor, u.emoji, u.created_at from (
        select v.visitor, v.emoji, v.created_at from village_visits v where v.host = v_uid and v.created_at > v_since
        union all
        select d.giver, null::text, d.created_at from village_dishes d where d.host = v_uid and d.created_at > v_since
      ) u
      where not _nb_blocked(v_uid, u.visitor)
      order by u.visitor, u.emoji is null, u.created_at desc
    ) dd order by dd.created_at desc limit 10
  ) x
  left join game_saves gs on gs.user_id = x.visitor;
  select coalesce(jsonb_agg(jsonb_build_object(
           'nick', _nb_nick(gs.state, y.host),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'emoji', y.emoji, 'at', y.rated_at,
           'public_id', _nb_open_id(y.host)) order by y.rated_at desc), '[]'::jsonb)
    into v_replies
  from (
    select d.host, d.emoji, d.rated_at from village_dishes d
     where d.giver = v_uid and d.rated_at > v_since and not _nb_blocked(v_uid, d.host)
     order by d.rated_at desc limit 10
  ) y
  left join game_saves gs on gs.user_id = y.host;
  return jsonb_build_object('ok', true, 'total', v_total, 'list', v_list, 'replies', v_replies, 'is_public', v_pub);
end $$;

revoke all on function public.neighbor_dish_leave(uuid, text, int) from public, anon;
revoke all on function public.my_table_dishes() from public, anon;
revoke all on function public.neighbor_dish_eat(bigint) from public, anon;
revoke all on function public.neighbor_dish_rate(bigint, text) from public, anon;
revoke all on function public.my_visitors(timestamptz) from public, anon;
grant execute on function public.neighbor_dish_leave(uuid, text, int) to authenticated;
grant execute on function public.my_table_dishes() to authenticated;
grant execute on function public.neighbor_dish_eat(bigint) to authenticated;
grant execute on function public.neighbor_dish_rate(bigint, text) to authenticated;
grant execute on function public.my_visitors(timestamptz) to authenticated;

commit;
