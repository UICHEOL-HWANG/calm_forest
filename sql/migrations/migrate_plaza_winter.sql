begin;

alter table public.plaza_seasons add column if not exists allow_guests boolean not null default false;
alter table public.plaza_seasons add column if not exists per_user boolean not null default false;

create or replace function public.plaza_donate(p_season text, p_item text, p_qty int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_s     plaza_seasons;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_stage smallint;
  v_need  int;
  v_have  int;
  v_used  int;
  v_left  int;
  v_acc   int;
  v_total int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'season');
  end if;

  perform pg_advisory_xact_lock(hashtext('plaza:' || p_season));

  v_stage := _plaza_current_stage(p_season);
  if v_stage is null then return jsonb_build_object('ok', false, 'reason', 'full'); end if;

  select need into v_need from plaza_needs where season = p_season and stage = v_stage and item = p_item;
  if not found then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;
  select coalesce(sum(qty), 0) into v_have from plaza_donations
    where season = p_season and stage = v_stage and item = p_item;
  if v_have >= v_need then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;

  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  v_left := v_s.daily_cap - v_used;
  if v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap', 'today_left', 0); end if;

  v_acc := least(p_qty, v_left, v_need - v_have);
  insert into plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (v_uid, p_season, v_stage, p_item, v_acc, v_today);

  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  return jsonb_build_object('ok', true, 'accepted', v_acc, 'today_left', v_left - v_acc,
    'my_total', v_total, 'tier', _plaza_tier(v_total), 'stage', v_stage,
    'item_have', v_have + v_acc, 'item_need', v_need);
end $$;

create or replace function public.plaza_give(p_season text, p_stage int, p_item text, p_qty int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_s      plaza_seasons;
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_need   int;
  v_mine   int;
  v_used   int;
  v_left   int;
  v_acc    int;
  v_before int;
  v_total  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or not v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'season');
  end if;
  if not v_s.allow_guests and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;

  perform pg_advisory_xact_lock(hashtext('plaza:' || p_season || ':' || v_uid::text));

  select need into v_need from plaza_needs where season = p_season and stage = p_stage and item = p_item;
  if not found then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', p_stage); end if;
  select coalesce(sum(qty), 0) into v_mine from plaza_donations
    where season = p_season and user_id = v_uid and stage = p_stage and item = p_item;
  if v_mine >= v_need then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', p_stage); end if;

  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  v_left := v_s.daily_cap - v_used;
  if v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap', 'today_left', 0); end if;

  v_acc := least(p_qty, v_left, v_need - v_mine);
  select coalesce(sum(qty), 0) into v_before from plaza_donations where season = p_season;
  insert into plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (v_uid, p_season, p_stage, p_item, v_acc, v_today);

  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  return jsonb_build_object('ok', true, 'accepted', v_acc, 'today_left', v_left - v_acc,
    'my_total', v_total, 'stage', p_stage, 'item_have', v_mine + v_acc, 'item_need', v_need,
    'village_before', v_before);
end $$;

create or replace function public.plaza_progress(p_season text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_s      plaza_seasons;
  v_cur    smallint;
  v_max    smallint;
  v_done   boolean;
  v_forced boolean;
  v_items  jsonb;
  v_names  jsonb;
  v_donors int;
  v_total  int;
begin
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('error', 'unknown season'); end if;
  v_cur := _plaza_current_stage(p_season);
  select max(stage) into v_max from plaza_needs where season = p_season;
  v_forced := v_cur is not null and now() >= v_s.ends_at;
  v_done := v_cur is null or v_forced;

  select coalesce(jsonb_agg(jsonb_build_object('stage', n.stage, 'item', n.item, 'have', h.have, 'need', n.need)
                            order by n.stage, n.item), '[]'::jsonb)
    into v_items
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season;

  select count(distinct user_id), coalesce(sum(qty), 0) into v_donors, v_total from plaza_donations where season = p_season;

  select coalesce(jsonb_agg(x.nick order by x.first_at), '[]'::jsonb) into v_names
  from (
    select coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자') as nick, min(d.created_at) as first_at
    from plaza_donations d
    left join game_saves gs on gs.user_id = d.user_id
    where d.season = p_season
    group by d.user_id, gs.state->>'nickname'
    order by min(d.created_at)
    limit 500
  ) x;

  return jsonb_build_object('season', p_season, 'starts_at', v_s.starts_at, 'ends_at', v_s.ends_at,
    'started', now() >= v_s.starts_at,
    'active', now() >= v_s.starts_at and now() < v_s.ends_at,
    'completed', v_done, 'forced', v_forced,
    'stage', case when v_done then v_max + 1 else v_cur end, 'max_stage', v_max,
    'items', v_items, 'donors', v_donors, 'names', v_names,
    'total', v_total, 'per_user', v_s.per_user);
end $$;

revoke all on function public.plaza_give(text, int, text, int) from public, anon;
grant execute on function public.plaza_give(text, int, text, int) to authenticated;

insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap, allow_guests, per_user)
values ('winter-2026', '2026-12-18 00:00:00+09', '2027-01-01 00:00:00+09', 30, true, true)
on conflict (season) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  daily_cap = excluded.daily_cap, allow_guests = excluded.allow_guests, per_user = excluded.per_user;

insert into public.plaza_needs (season, stage, item, need) values
  ('winter-2026', 1, 'stone', 15), ('winter-2026', 1, 'wood', 20),
  ('winter-2026', 2, 'coal', 10), ('winter-2026', 2, 'stone', 25),
  ('winter-2026', 3, 'fish', 10), ('winter-2026', 3, 'forage', 15)
on conflict (season, stage, item) do update set need = excluded.need;

commit;
