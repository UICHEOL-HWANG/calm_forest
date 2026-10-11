-- =============================================================
--  🏡🚩 이웃 신고·차단 후속 — 코드 리뷰(2026-10-11) 반영. migrate_neighbors_report_block.sql 다음에 적용
--  ------------------------------------------------------------
--  ① 차단 양방향 약속("상대도 내 마을에 올 수 없어요")을 방문 시작에서도 지킨다
--     — 쇼케이스는 익명 엣지 캐시라 호출자를 모른다 → neighbor_view_start 가 'private' 를 주고 클라가 내보낸다
--  ② 차단에도 하루 상한(50) — 게스트 계정으로 무한히 쌓지 못하게
--  ③ _nb_candidates 의 차단 검사를 함수 호출 → not exists(인덱스 탐색, 인라인)로
--  ④ 신고 증거 보존: reporter 는 계정이 지워져도 행이 남게(set null) + 신고 시점 닉네임 사본
--  적용: pg8000 풀러로 파일 전체 한 번에. 재실행 안전.
-- =============================================================

begin;

-- ④ 신고 증거 보존
alter table public.village_reports alter column reporter drop not null;
alter table public.village_reports drop constraint if exists village_reports_reporter_fkey;
alter table public.village_reports add constraint village_reports_reporter_fkey
  foreign key (reporter) references auth.users(id) on delete set null;
alter table public.village_reports add column if not exists target_nick text;

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
  -- 👤 게스트(익명)도 허용 — iOS 심사관은 게스트로 들어와 신고·차단을 확인한다(가이드라인 1.2). 하루 20건 제한
  if p_reason is null or p_reason not in ('nick', 'decor', 'other') then return jsonb_build_object('ok', false, 'reason', 'reason'); end if;
  select user_id into v_target from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  select count(*) into v_today from village_reports where reporter = v_uid and day = v_day;
  if v_today >= 20 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_reports (reporter, target, target_public_id, reason, day, target_nick)
  values (v_uid, v_target, p_public_id, p_reason, v_day,
          (select _nb_nick(gs.state, v_target) from game_saves gs where gs.user_id = v_target))
  on conflict (reporter, target, day) do nothing
  returning id into v_id;
  return jsonb_build_object('ok', true, 'dup', v_id is null);
end $$;

-- ② 차단 하루 상한 50
create or replace function public.neighbor_block(p_public_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_today  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  -- 👤 게스트(익명)도 허용 — 심사관이 게스트로 확인한다. 하루 50건 제한
  select user_id into v_target from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  select count(*) into v_today from village_blocks where blocker = v_uid and created_at > now() - interval '1 day';
  if v_today >= 50 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_blocks (blocker, blocked) values (v_uid, v_target) on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- ③ 후보: not exists(인라인) — 정의는 첫 마이그레이션과 같고 차단 검사만 바뀐다
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
    and not exists (select 1 from village_blocks b                -- 🚫 차단(어느 쪽이든)
                     where (b.blocker = p_caller and b.blocked = gs.user_id) or (b.blocker = gs.user_id and b.blocked = p_caller))
    and gs.updated_at >= now() - interval '7 days'
    and case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric >= 1 else false end
    -- 🧑‍🤝‍🧑 페르소나(@sim.calmforest.local)는 페르소나끼리, 실사용자는 실사용자끼리만 만난다
    and (lower(coalesce(u.email, '')) like '%@sim.calmforest.local') = exists (select 1 from auth.users c where c.id = p_caller and lower(coalesce(c.email, '')) like '%@sim.calmforest.local')
  order by 2
  limit greatest(0, least(coalesce(p_limit, 3), 100000));
$function$;

-- ① 방문 시작: 차단 관계면 'private' (2026-10-11 운영 정의 + 차단 한 줄)
create or replace function public.neighbor_view_start(p_public_id uuid, p_slot integer, p_revisit boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
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
  if _nb_blocked(v_uid, v_host) then return jsonb_build_object('ok', false, 'reason', 'private'); end if;   -- 🚫 차단 관계(클라가 내보낸다)
  perform pg_advisory_xact_lock(hashtext('nbv:' || v_uid::text));   -- 동시 호출로 상한 30을 넘지 않게
  select count(*) into v_cnt from village_views where visitor = v_uid and day = v_day;
  if v_cnt >= 30 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_views (visitor, host, day, is_guest, revisit, slot)
  values (v_uid, v_host, v_day, v_guest, coalesce(p_revisit, false),
          case when p_slot between 0 and 2 then p_slot end)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'view_id', v_id);
end $function$;

-- 관리자 목록: 지워진 계정은 신고 시점 닉네임으로 · 누적은 신고한 사람 수
create or replace function public.admin_village_reports(p_limit int default 50, p_open_only boolean default true)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc) from (
      select vr.id, vr.reason, vr.created_at, vr.handled_at, vr.target_public_id as public_id,
             coalesce(_nb_nick(gs.state, vr.target), vr.target_nick) as nick,
             vp.hidden_by_admin, vp.nick_hidden,
             (select count(distinct x.reporter) from village_reports x where x.target = vr.target) as reports_on_target
        from village_reports vr
        left join game_saves gs on gs.user_id = vr.target
        left join village_profiles vp on vp.user_id = vr.target
       where (not coalesce(p_open_only, true) or vr.handled_at is null)
       order by vr.created_at desc
       limit greatest(1, least(coalesce(p_limit, 50), 500))
    ) r), '[]'::jsonb));
end $$;

commit;
