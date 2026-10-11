-- =============================================================
--  🏡🚩 이웃 마을 신고·차단 — App Store 가이드라인 1.2(UGC: 신고·차단 필수)
--  ------------------------------------------------------------
--  ① village_reports  — 신고 기록(사유 nick|decor|other). 운영자가 관리 페이지에서 보고 기존 숨김(admin_village_moderate)으로 처리
--  ② village_blocks   — 차단 관계. 양방향 제외: 내 오늘의 이웃·방문 기록에서 사라지고, 상대도 나를 못 만난다
--  ③ RPC neighbor_report · neighbor_block (게스트 포함 — 심사관이 게스트로 확인) · admin_village_reports · admin_village_report_done
--  ④ 기존 _nb_candidates · neighbor_react · my_visitors 에 차단 제외만 덧붙인다
--     (2026-10-11 운영 정의 pg_get_functiondef 를 그대로 가져와 조건만 추가 — 페르소나 분리·관리자 숨김 유지)
--  적용: pg8000 풀러로 파일 전체 한 번에. 재실행 안전(if not exists · create or replace).
-- =============================================================

begin;

create table if not exists public.village_reports (
  id               bigint generated always as identity primary key,
  reporter         uuid not null references auth.users(id) on delete cascade,
  target           uuid not null references auth.users(id) on delete cascade,
  target_public_id uuid not null,
  reason           text not null check (reason in ('nick', 'decor', 'other')),
  day              date not null default _nb_kst_today(),
  created_at       timestamptz not null default now(),
  handled_at       timestamptz,
  unique (reporter, target, day)                          -- 같은 대상은 하루 1건
);
create index if not exists village_reports_open_idx on public.village_reports (created_at desc) where handled_at is null;
create index if not exists village_reports_target_idx on public.village_reports (target);
alter table public.village_reports enable row level security;   -- 정책 없음 = 직접 접근 불가(RPC 로만)
revoke all on public.village_reports from anon, authenticated;

create table if not exists public.village_blocks (
  blocker    uuid not null references auth.users(id) on delete cascade,
  blocked    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists village_blocks_blocked_idx on public.village_blocks (blocked);
alter table public.village_blocks enable row level security;
revoke all on public.village_blocks from anon, authenticated;

-- 두 사람 사이에 어느 쪽이든 차단이 있나
create or replace function public._nb_blocked(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from village_blocks b
                  where (b.blocker = p_a and b.blocked = p_b) or (b.blocker = p_b and b.blocked = p_a));
$$;
revoke all on function public._nb_blocked(uuid, uuid) from public, anon, authenticated;

-- ── 🚩 신고 ──
create or replace function public.neighbor_report(p_public_id uuid, p_reason text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_day    date := _nb_kst_today();
  v_target uuid;
  v_today  int;
  v_id     bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  -- 👤 게스트(익명)도 허용 — iOS 심사관은 게스트로 들어와 신고·차단을 확인한다(가이드라인 1.2). 하루 20건 제한이 남용을 막는다
  if p_reason is null or p_reason not in ('nick', 'decor', 'other') then return jsonb_build_object('ok', false, 'reason', 'reason'); end if;
  select user_id into v_target from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  select count(*) into v_today from village_reports where reporter = v_uid and day = v_day;
  if v_today >= 20 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_reports (reporter, target, target_public_id, reason, day)
  values (v_uid, v_target, p_public_id, p_reason, v_day)
  on conflict (reporter, target, day) do nothing
  returning id into v_id;
  -- 같은 날 같은 대상 재신고는 성공으로 본다(이미 접수됨) — 유저에게 실패처럼 보일 이유가 없다
  return jsonb_build_object('ok', true, 'dup', v_id is null);
end $$;
revoke all on function public.neighbor_report(uuid, text) from public, anon;
grant execute on function public.neighbor_report(uuid, text) to authenticated;

-- ── 🚫 차단 ──
create or replace function public.neighbor_block(p_public_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  -- 👤 게스트(익명)도 허용 — iOS 심사관은 게스트로 들어와 신고·차단을 확인한다(가이드라인 1.2). 하루 20건 제한이 남용을 막는다
  select user_id into v_target from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  insert into village_blocks (blocker, blocked) values (v_uid, v_target) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.neighbor_block(uuid) from public, anon;
grant execute on function public.neighbor_block(uuid) to authenticated;

-- ── 오늘의 이웃 후보: 차단(양방향) 제외 ──
create or replace function public._nb_candidates(p_caller uuid, p_day date, p_limit integer default 3)
returns table(uid uuid, k text) language sql stable security definer set search_path to 'public' as $function$
  select gs.user_id, md5(p_caller::text || p_day::text || gs.user_id::text)
  from game_saves gs
  join auth.users u on u.id = gs.user_id
  left join village_profiles vp on vp.user_id = gs.user_id
  where gs.user_id <> p_caller
    and coalesce(u.is_anonymous, false) = false
    and coalesce(vp.is_public, true)
    and not coalesce(vp.hidden_by_admin, false)
    and not _nb_blocked(p_caller, gs.user_id)                -- 🚫 차단(어느 쪽이든)
    and gs.updated_at >= now() - interval '7 days'
    and case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric >= 1 else false end
    -- 🧑‍🤝‍🧑 페르소나(@sim.calmforest.local)는 페르소나끼리, 실사용자는 실사용자끼리만 만난다
    and (lower(coalesce(u.email, '')) like '%@sim.calmforest.local') = exists (select 1 from auth.users c where c.id = p_caller and lower(coalesce(c.email, '')) like '%@sim.calmforest.local')
  order by 2
  limit greatest(0, least(coalesce(p_limit, 3), 100000));
$function$;

-- ── 반응: 차단 관계면 비공개처럼 ──
create or replace function public.neighbor_react(p_public_id uuid, p_emoji text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_host uuid;
  v_pub  boolean;
  v_hid  boolean;
  v_cnt  int;
  v_rew  boolean;
  v_id   bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_emoji is null or p_emoji not in ('wave', 'heart', 'flower', 'star') then return jsonb_build_object('ok', false, 'reason', 'emoji'); end if;
  select user_id, is_public, hidden_by_admin into v_host, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_host = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if not v_pub or v_hid then return jsonb_build_object('ok', false, 'reason', 'private'); end if;   -- 🛡️ 관리자 숨김도 비공개처럼(행·보상 없음)
  if _nb_blocked(v_uid, v_host) then return jsonb_build_object('ok', false, 'reason', 'private'); end if;   -- 🚫 차단 관계
  perform pg_advisory_xact_lock(hashtext('nb:' || v_uid::text));   -- 동시 반응으로 상한 3을 넘지 않게
  select count(*) into v_cnt from village_visits where visitor = v_uid and day = v_day and rewarded;
  v_rew := v_cnt < 3;
  insert into village_visits (visitor, host, day, emoji, rewarded) values (v_uid, v_host, v_day, p_emoji, v_rew)
  on conflict (visitor, host, day) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'dup', 'rewarded', false, 'rewarded_today', v_cnt);
  end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'rewarded', v_rew,
                            'rewarded_today', v_cnt + case when v_rew then 1 else 0 end);
end $function$;

-- ── 다녀간 이웃: 차단 관계 제외 ──
create or replace function public.my_visitors(p_since timestamp with time zone)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_uid   uuid := auth.uid();
  v_since timestamptz := coalesce(p_since, now() - interval '2 days');
  v_total int;
  v_list  jsonb;
  v_pub   boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  insert into village_profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  select is_public into v_pub from village_profiles where user_id = v_uid;
  select count(distinct visitor) into v_total from village_visits
   where host = v_uid and created_at > v_since and not _nb_blocked(v_uid, visitor);
  select coalesce(jsonb_agg(jsonb_build_object(
           'nick', _nb_nick(gs.state, x.visitor),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'emoji', x.emoji, 'at', x.created_at) order by x.created_at desc), '[]'::jsonb)
    into v_list
  from (
    select dd.visitor, dd.emoji, dd.created_at from (
      select distinct on (v.visitor) v.visitor, v.emoji, v.created_at
      from village_visits v where v.host = v_uid and v.created_at > v_since and not _nb_blocked(v_uid, v.visitor)
      order by v.visitor, v.created_at desc
    ) dd order by dd.created_at desc limit 10
  ) x
  left join game_saves gs on gs.user_id = x.visitor;
  return jsonb_build_object('ok', true, 'total', v_total, 'list', v_list, 'is_public', v_pub);
end $function$;

-- ── 🛡️ 관리자: 신고 목록 · 처리 완료 표시 ──
create or replace function public.admin_village_reports(p_limit int default 50, p_open_only boolean default true)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc) from (
      select vr.id, vr.reason, vr.created_at, vr.handled_at, vr.target_public_id as public_id,
             _nb_nick(gs.state, vr.target) as nick,
             vp.hidden_by_admin, vp.nick_hidden,
             (select count(*) from village_reports x where x.target = vr.target) as reports_on_target
        from village_reports vr
        left join game_saves gs on gs.user_id = vr.target
        left join village_profiles vp on vp.user_id = vr.target
       where (not coalesce(p_open_only, true) or vr.handled_at is null)
       order by vr.created_at desc
       limit greatest(1, least(coalesce(p_limit, 50), 500))
    ) r), '[]'::jsonb));
end $$;
revoke all on function public.admin_village_reports(int, boolean) from public, anon;
grant execute on function public.admin_village_reports(int, boolean) to authenticated;

create or replace function public.admin_village_report_done(p_report_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  update village_reports set handled_at = now() where id = p_report_id and handled_at is null;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_village_report_done(bigint) from public, anon;
grant execute on function public.admin_village_report_done(bigint) to authenticated;

commit;
