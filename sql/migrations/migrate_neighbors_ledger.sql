-- =============================================================
--  📒 이웃 마을 원장 2종 — 방문 원장(village_views) · 🛡️ 모더레이션 감사 로그(moderation_log)
--  ------------------------------------------------------------
--  ① village_views — 이웃 공간에 들어간 기록(반응을 안 남겨도). GA4 는 광고 차단으로 빠질 수 있어서
--     성공 기준「주간 활동자 중 방문 경험 30%」를 서버 원장으로 센다. 게스트(익명)도 남긴다(is_guest).
--     neighbor_view_start(입장) → neighbor_view_end(퇴장, sec·reacted = GA4 neighbor_visit_end 와 같은 값).
--     ⚠️ 탭을 닫으면 end 가 안 와서 ended_at·sec 이 null 로 남는다 — 방문 수는 그대로 세고, 머문 시간은 ended_at 있는 행만.
--     남용 상한: 방문자당 KST 하루 30행('limit').
--  ② moderation_log — 앱인토스 UGC 자율 관리 증빙. admin_village_moderate 가 플래그를 실제로 바꾼 호출마다 1행
--     (action = hide|unhide|hide_nick|unhide_nick, 둘 다 바뀌면 'hide+hide_nick' 처럼 '+' 로 잇는다).
--     admin_moderation_log 는 uuid 없이 {at, action, nick(_nb_nick 표시 닉네임), before, after} 만 돌려준다.
--  ▶ 두 테이블 모두 RLS on · 정책 없음 = 직접 접근 금지. 전부 SECURITY DEFINER RPC 로만.
--  ▶ admin_village_moderate 본문은 migrate_neighbors.sql·_moderation.sql 의 최신 본문(보안 마이그레이션 2종은 이 함수를 안 건드림)에
--    로그만 덧붙였다. 이 파일을 적용한 뒤엔 그 두 파일을 다시 돌리지 말 것(로그 없는 옛 본문으로 돌아간다).
--  적용: migrate_neighbors.sql(+ _sim_split · _moderation) 뒤 SQL Editor 에서 1회(멱등) → sql/tests/neighbors_selftest.sql
-- =============================================================
begin;

create table if not exists public.village_views (
  id         bigserial primary key,
  visitor    uuid not null references auth.users(id) on delete cascade,
  host       uuid not null references auth.users(id) on delete cascade,
  day        date not null,                                     -- KST 날짜
  is_guest   boolean not null,                                  -- 익명(게스트) 방문
  revisit    boolean not null default false,                    -- 오늘 이미 반응한 집에 또 보기
  slot       smallint,                                          -- 오늘의 이웃 몇 번째 칸(0~2)
  sec        int,                                               -- 머문 초(0~3600) — end 가 와야 채워진다
  reacted    boolean not null default false,
  created_at timestamptz not null default now(),
  ended_at   timestamptz,
  check (visitor <> host)
);
create index if not exists village_views_host_created on public.village_views (host, created_at desc);
create index if not exists village_views_visitor_day on public.village_views (visitor, day);

create table if not exists public.moderation_log (
  id         bigserial primary key,
  admin_uid  uuid not null,                                     -- 조치한 관리자(auth.uid())
  target     uuid references auth.users(id) on delete set null, -- 계정이 지워져도 조치 기록은 남는다
  action     text not null,
  before     jsonb,
  after      jsonb,
  created_at timestamptz not null default now()
);
create index if not exists moderation_log_created on public.moderation_log (created_at desc);

alter table public.village_views  enable row level security;
alter table public.moderation_log enable row level security;
revoke all on table public.village_views  from public, anon, authenticated;
revoke all on table public.moderation_log from public, anon, authenticated;
revoke all on sequence public.village_views_id_seq  from public, anon, authenticated;
revoke all on sequence public.moderation_log_id_seq from public, anon, authenticated;
-- 정책 없음 = 직접 select/insert/update/delete 차단

-- ── 📒 방문 원장 RPC ──
create or replace function public.neighbor_view_start(p_public_id uuid, p_slot int, p_revisit boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_day   date := _nb_kst_today();
  v_guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  v_host  uuid;
  v_pub   boolean;
  v_hid   boolean;
  v_cnt   int;
  v_id    bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  select user_id, is_public, hidden_by_admin into v_host, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_host = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if exists (select 1 from auth.users u where u.id = v_host and coalesce(u.is_anonymous, false)) then
    return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;   -- showcase 와 같다: 익명 집은 없는 집
  if not v_pub or v_hid then return jsonb_build_object('ok', false, 'reason', 'private'); end if;   -- 🛡️ 관리자 숨김도 비공개처럼
  perform pg_advisory_xact_lock(hashtext('nbv:' || v_uid::text));   -- 동시 호출로 상한 30을 넘지 않게
  select count(*) into v_cnt from village_views where visitor = v_uid and day = v_day;
  if v_cnt >= 30 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_views (visitor, host, day, is_guest, revisit, slot)
  values (v_uid, v_host, v_day, v_guest, coalesce(p_revisit, false),
          case when p_slot between 0 and 2 then p_slot end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'view_id', v_id);
end $$;

create or replace function public.neighbor_view_end(p_view_id bigint, p_sec int, p_reacted boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  update village_views
     set ended_at = now(),
         sec      = least(3600, greatest(0, coalesce(p_sec, 0))),
         reacted  = coalesce(p_reacted, false)
   where id = p_view_id and visitor = v_uid and ended_at is null;
  if found then return jsonb_build_object('ok', true); end if;
  -- 내 행인데 이미 닫힘 = dup · 남의 행·없는 행 = not_found(남의 행 존재 여부는 알려 주지 않는다)
  if exists (select 1 from village_views where id = p_view_id and visitor = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  return jsonb_build_object('ok', false, 'reason', 'not_found');
end $$;

-- ── 🛡️ 관리자: 숨기기 플래그 바꾸기 — null 인자는 그대로 둔다 · 실제로 바뀐 호출만 moderation_log 에 남긴다 ──
create or replace function public.admin_village_moderate(p_public_id uuid, p_hide boolean, p_hide_nick boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_user uuid; v_hid0 boolean; v_nh0 boolean; v_hid boolean; v_nh boolean; v_act text;
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  select user_id, hidden_by_admin, nick_hidden into v_user, v_hid0, v_nh0
    from village_profiles where public_id = p_public_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update village_profiles
     set hidden_by_admin = coalesce(p_hide, hidden_by_admin),
         nick_hidden     = coalesce(p_hide_nick, nick_hidden),
         updated_at      = now()
   where public_id = p_public_id
  returning hidden_by_admin, nick_hidden into v_hid, v_nh;
  v_act := concat_ws('+',
             case when v_hid <> v_hid0 then case when v_hid then 'hide' else 'unhide' end end,
             case when v_nh <> v_nh0 then case when v_nh then 'hide_nick' else 'unhide_nick' end end);
  if v_act <> '' then
    insert into moderation_log (admin_uid, target, action, before, after)
    values (auth.uid(), v_user, v_act,
            jsonb_build_object('hidden_by_admin', v_hid0, 'nick_hidden', v_nh0),
            jsonb_build_object('hidden_by_admin', v_hid, 'nick_hidden', v_nh));
  end if;
  return jsonb_build_object('ok', true, 'hidden_by_admin', v_hid, 'nick_hidden', v_nh);
end $$;

-- 최근 조치(최신순) — uuid 없음. nick 은 남에게 보이는 표시 닉네임(_nb_nick), 계정이 지워졌으면 null
create or replace function public.admin_moderation_log(p_limit int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_list jsonb;
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', m.created_at,
           'action', m.action,
           'nick', case when m.target is null then null else _nb_nick(gs.state, m.target) end,
           'before', m.before,
           'after', m.after
         ) order by m.created_at desc, m.id desc), '[]'::jsonb)
    into v_list
  from (select * from moderation_log order by created_at desc, id desc
        limit greatest(1, least(coalesce(p_limit, 30), 200))) m
  left join game_saves gs on gs.user_id = m.target;
  return jsonb_build_object('ok', true, 'list', v_list);
end $$;

-- ── 권한 ──
revoke all on function public.neighbor_view_start(uuid, int, boolean) from public, anon;
revoke all on function public.neighbor_view_end(bigint, int, boolean) from public, anon;
revoke all on function public.admin_village_moderate(uuid, boolean, boolean) from public, anon;
revoke all on function public.admin_moderation_log(int) from public, anon;
grant execute on function public.neighbor_view_start(uuid, int, boolean) to authenticated;
grant execute on function public.neighbor_view_end(bigint, int, boolean) to authenticated;
grant execute on function public.admin_village_moderate(uuid, boolean, boolean) to authenticated;
grant execute on function public.admin_moderation_log(int) to authenticated;

commit;

-- ── 검증 ── sql/tests/neighbors_selftest.sql (⑥ 모더레이션 · ⑦ 📒 원장 구간)
