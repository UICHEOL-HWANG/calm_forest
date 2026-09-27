-- =============================================================
--  🌾 수확제 광장 — 기부는 로그인 계정만(익명 게스트 거절)
--  ------------------------------------------------------------
--  ▶ 결정(사용자, 2026-09-27): 게스트(익명)는 광장을 구경할 수 있지만 기부는 못 한다.
--    토스·구글·플레이 게임즈 계정은 auth.users 에서 is_anonymous = false 라 그대로 동작한다.
--  ▶ plaza_donate · plaza_mine 에 v_uid is null(reason auth) 체크 바로 뒤에
--    is_anonymous 체크(reason login)를 추가한다. 나머지 본문은 migrate_plaza.sql 과 동일 —
--    create or replace 라 기존 grant 는 그대로 유지된다(별도 grant/revoke 불필요).
--  ▶ 신규 설치 시엔 migrate_plaza.sql 자체에도 같은 체크가 들어 있어 이 파일 없이도 동일하다.
--  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
--  적용: Supabase SQL Editor 에서 1회 실행(멱등) → sql/tests/plaza_selftest.sql 로 검증
-- =============================================================
begin;

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
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('ok', false, 'reason', 'season'); end if;
  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  return jsonb_build_object('ok', true, 'my_total', v_total,
    'today_left', greatest(0, v_s.daily_cap - v_used), 'tier', _plaza_tier(v_total));
end $$;

commit;

-- ── 검증 ──
-- select public.plaza_donate('harvest-2026', 'wood', 1);  -- 익명 세션이면 { ok:false, reason:'login' }
