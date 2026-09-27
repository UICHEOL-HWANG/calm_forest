-- =============================================================
--  🌾 수확제 광장 — 전 유저 공동 프로젝트 원장·규칙
--  ------------------------------------------------------------
--  ▶ 기부는 plaza_donate RPC 로만 들어온다(테이블 직접 쓰기 정책 없음)
--  ▶ 하루 상한·현재 단계 품목·남은 필요량 컷을 DB 안에서 원자적으로 판정
--    (시즌 단위 advisory lock — 동시 기부로 필요량을 넘지 않는다)
--  ▶ 서버는 유저 보유량을 모른다(세이브는 클라 JSON) — 어뷰징 피해는 하루 상한으로 제한
--  ▶ 숫자(기간·상한·필요량·등급 임계값)의 단일 출처. js/data/plaza.js 와의 일치는
--    tests/plaza-sync.test.mjs 가 검사한다
--  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
--  적용: Supabase SQL Editor 에서 1회 실행 → sql/tests/plaza_selftest.sql 로 검증
-- =============================================================
begin;

create table if not exists public.plaza_seasons (
  season    text primary key check (season ~ '^[a-z0-9-]{3,32}$'),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  daily_cap int not null default 30 check (daily_cap between 1 and 30),
  check (ends_at > starts_at)
);

create table if not exists public.plaza_needs (
  season text not null references public.plaza_seasons(season) on delete cascade,
  stage  smallint not null check (stage between 1 and 9),
  item   text not null check (item ~ '^[a-z_]{1,24}$'),
  need   int not null check (need > 0),
  primary key (season, stage, item)
);

create table if not exists public.plaza_donations (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  season     text not null references public.plaza_seasons(season),
  stage      smallint not null,
  item       text not null,
  qty        int not null check (qty between 1 and 30),
  kst_day    date not null,
  created_at timestamptz not null default now()
);
create index if not exists plaza_donations_season_item on public.plaza_donations (season, stage, item);
create index if not exists plaza_donations_season_user_day on public.plaza_donations (season, user_id, kst_day);

alter table public.plaza_seasons   enable row level security;
alter table public.plaza_needs     enable row level security;
alter table public.plaza_donations enable row level security;

drop policy if exists plaza_seasons_select_all on public.plaza_seasons;
create policy plaza_seasons_select_all on public.plaza_seasons for select to anon, authenticated using (true);
drop policy if exists plaza_needs_select_all on public.plaza_needs;
create policy plaza_needs_select_all on public.plaza_needs for select to anon, authenticated using (true);
drop policy if exists plaza_donations_select_own on public.plaza_donations;
create policy plaza_donations_select_own on public.plaza_donations
  for select to authenticated using ((select auth.uid()) = user_id);
-- insert/update/delete 정책 없음 = 직접 쓰기 차단(RPC 만 security definer 로 쓴다)

-- 등급 — 임계값은 js/data/plaza.js PLAZA_TIERS 와 같아야 한다(tests/plaza-sync.test.mjs)
create or replace function public._plaza_tier(p_total int)
returns text language sql immutable set search_path = public as $$
  select case when p_total >= 150 then 'gold'
              when p_total >= 60 then 'silver'
              when p_total >= 10 then 'bronze'
              else null end;
$$;

-- 현재 단계 = 필요량이 남은 첫 단계(없으면 null = 전부 충족)
create or replace function public._plaza_current_stage(p_season text)
returns smallint language sql stable security definer set search_path = public as $$
  select min(n.stage)::smallint
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season and h.have < n.need;
$$;

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
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or now() < v_s.starts_at or now() >= v_s.ends_at then
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

  select count(distinct user_id) into v_donors from plaza_donations where season = p_season;

  -- 명판 이름 — 식별자는 내보내지 않는다(리더보드와 같은 닉네임 규칙), 첫 기부 순
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
    'items', v_items, 'donors', v_donors, 'names', v_names);
end $$;

create or replace function public.plaza_mine(p_season text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_s     plaza_seasons;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_total int;
  v_used  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('ok', false, 'reason', 'season'); end if;
  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  return jsonb_build_object('ok', true, 'my_total', v_total,
    'today_left', greatest(0, v_s.daily_cap - v_used), 'tier', _plaza_tier(v_total));
end $$;

revoke all on function public._plaza_tier(int) from public, anon, authenticated;
revoke all on function public._plaza_current_stage(text) from public, anon, authenticated;
revoke all on function public.plaza_donate(text, text, int) from public, anon;
revoke all on function public.plaza_progress(text) from public;
revoke all on function public.plaza_mine(text) from public, anon;
grant execute on function public.plaza_donate(text, text, int) to authenticated;
grant execute on function public.plaza_progress(text) to anon, authenticated;
grant execute on function public.plaza_mine(text) to authenticated;

-- ── 시드: harvest-2026 (2026-10-09 00:00 ~ 10-23 00:00 KST) ──
insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('harvest-2026', '2026-10-09 00:00:00+09', '2026-10-23 00:00:00+09', 30)
on conflict (season) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, daily_cap = excluded.daily_cap;

insert into public.plaza_needs (season, stage, item, need) values
  ('harvest-2026', 1, 'wood', 300), ('harvest-2026', 1, 'stone', 200),
  ('harvest-2026', 2, 'stone', 400), ('harvest-2026', 2, 'wood', 200), ('harvest-2026', 2, 'coal', 100),
  ('harvest-2026', 3, 'crop', 500), ('harvest-2026', 3, 'forage', 80), ('harvest-2026', 3, 'wood', 120)
on conflict (season, stage, item) do update set need = excluded.need;

commit;

-- ── 검증 ──
-- select public.plaza_progress('harvest-2026');
