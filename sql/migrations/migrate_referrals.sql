-- =============================================================
--  calm forest · 🤝 친구 추천 보상 (referrals)
--  ------------------------------------------------------------
--  계획: dev/active/referral-reward/referral-reward-plan.md
--  실행: 풀러로 파일 전체를 한 번에(pg8000 con.run). 멱등.
--
--  ▶ 쓰기는 전부 Worker(service key) → security definer 함수(referral_bind/claim)로만.
--    클라이언트는 본인 행 select 만.
--  ▶ 보상은 원장(purchases)에 source='referral' 행으로 넣는다 → 보안 트리거가 출처와 무관하게
--    "살아 있는 원장 행"만 보므로 같은 보호를 받는다.
--  ▶ 활성화 = 피초대자가 가입 7일 안에 획득 행동 16종(METRICS_FRAMEWORK §획득 행동)을
--    서로 다른 KST 날짜 2일 이상. 원천 session_logs 는 클라이언트가 쓴다(조작 가능 — 수용, 계획 §리스크).
--  ⚠️ ⑦ 이 _premium_cosmetic_ids() 를 **통째로 대체**한다. 이후 이 함수를 다시 정의하는 마이그레이션은
--     이 파일의 목록(추천 3종 포함)에서 시작할 것 — 빠뜨리면 추천 보상 보호가 사라진다.
--  ⚠️ purchases 에 금액 0 인 추천 행이 섞인다 → 매출·구매자 집계는 where source = 'paddle'.
-- =============================================================
begin;

-- ① 초대 코드 — 사용자당 1개, 8자(헷갈리는 0·O·1·I 제외)
create table if not exists public.referral_codes (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  code        text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at  timestamptz not null default now()
);

-- ② 초대 관계 — 피초대자 1명당 1행, 바꿀 수 없다
create table if not exists public.referrals (
  invitee_id    uuid primary key references auth.users(id) on delete cascade,
  inviter_id    uuid not null references auth.users(id) on delete cascade,
  code          text not null,
  platform      text,
  bound_at      timestamptz not null default now(),
  activated_at  timestamptz,
  check (invitee_id <> inviter_id)
);
create index if not exists idx_referrals_inviter on public.referrals (inviter_id);

-- ②-1 남용 방지 — 정산 쿨다운(30초) · 틀린 코드 시도 수(계정당 10회)
alter table public.referral_codes add column if not exists last_claim_at timestamptz;
create table if not exists public.referral_bind_fails (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  n        int not null default 0,
  last_at  timestamptz not null default now()
);
alter table public.referral_bind_fails enable row level security;   -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.referral_bind_fails from anon, authenticated;

alter table public.referral_codes enable row level security;
alter table public.referrals      enable row level security;
drop policy if exists "own referral code select" on public.referral_codes;
create policy "own referral code select" on public.referral_codes
  for select using ((select auth.uid()) = user_id);
drop policy if exists "own referrals select" on public.referrals;
create policy "own referrals select" on public.referrals
  for select using ((select auth.uid()) in (inviter_id, invitee_id));
-- 다층 방어 — RLS 쓰기 정책이 없어도 기본 DML 권한 자체를 거둔다
revoke insert, update, delete on public.referral_codes, public.referrals from anon, authenticated;

-- 정산 조회용 — 피초대자별 가입 7일 구간을 훑는다
create index if not exists idx_session_logs_user_started on public.session_logs (user_id, started_at);

-- ③ 원장 — 출처 열 + 야외 장식 종류
alter table public.purchases add column if not exists source text not null default 'paddle';
alter table public.purchases drop constraint if exists purchases_source_check;
alter table public.purchases add constraint purchases_source_check check (source in ('paddle', 'referral'));
alter table public.purchases drop constraint if exists purchases_kind_check;
alter table public.purchases add constraint purchases_kind_check check (kind in ('cosmetic', 'pet', 'decor'));

-- ④ 상수 — 단계 보상 · 획득 행동
create or replace function public._referral_tiers()
returns table (need int, item_id text, kind text) language sql immutable set search_path = public as $$
  values (1, 'tools_star', 'cosmetic'), (3, 'friendarch', 'decor'), (5, 'friend_wing', 'cosmetic')
$$;

create or replace function public._referral_nsm_events()
returns text[] language sql immutable set search_path = public as $$
  select array[
    'harvest_crop', 'coop_collect', 'honey_collect',
    'fishing_catch', 'sea_catch', 'firefly_catch', 'forage_pick', 'mine_ore',
    'craft_item', 'craft_claim', 'cooking_result', 'cafe_serve', 'carve_result',
    'quest_complete', 'star_result', 'duel_result'
  ]::text[]
$$;

revoke all on function public._referral_tiers()      from public, anon, authenticated;
revoke all on function public._referral_nsm_events() from public, anon, authenticated;

-- ⑤-0 내 초대 코드 — 없으면 만든다(충돌 시 재시도). 익명 계정은 코드를 못 받는다
create or replace function public.referral_get_code(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_abc   constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not exists (select 1 from auth.users where id = p_user and not coalesce(is_anonymous, false)) then
    return jsonb_build_object('ok', false, 'reason', 'anonymous');
  end if;
  select code into v_code from referral_codes where user_id = p_user;
  for i in 1..8 loop
    exit when v_code is not null;
    v_code := (select string_agg(substr(v_abc, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 8));
    begin
      insert into referral_codes (user_id, code) values (p_user, v_code);
    exception when unique_violation then
      v_code := null;                                     -- 코드 충돌 → 다시 뽑기
      select code into v_code from referral_codes where user_id = p_user;   -- 동시 호출이 먼저 만들었으면 그것
    end;
  end loop;
  if v_code is null then return jsonb_build_object('ok', false, 'reason', 'code_exhausted'); end if;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- ⑤ 바인딩 — 피초대자가 로그인 직후 1회. 웰컴 핀 지급
create or replace function public.referral_bind(p_invitee uuid, p_code text, p_platform text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_inviter uuid;
  v_code    text := upper(trim(coalesce(p_code, '')));
  v_user    auth.users%rowtype;
begin
  select * into v_user from auth.users where id = p_invitee;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_user'); end if;
  if coalesce(v_user.is_anonymous, false) then return jsonb_build_object('ok', false, 'reason', 'anonymous'); end if;
  if v_user.created_at < now() - interval '72 hours' then return jsonb_build_object('ok', false, 'reason', 'not_new'); end if;
  if exists (select 1 from referrals where invitee_id = p_invitee) then
    return jsonb_build_object('ok', false, 'reason', 'already_bound');
  end if;

  if (select n from referral_bind_fails where user_id = p_invitee) >= 10 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  select user_id into v_inviter from referral_codes where code = v_code;
  if v_inviter is null then
    insert into referral_bind_fails (user_id, n) values (p_invitee, 1)
    on conflict (user_id) do update set n = referral_bind_fails.n + 1, last_at = now();
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  if v_inviter = p_invitee then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if exists (select 1 from referrals where invitee_id = v_inviter and inviter_id = p_invitee) then
    return jsonb_build_object('ok', false, 'reason', 'cycle');           -- 서로 초대하기 차단
  end if;
  perform pg_advisory_xact_lock(hashtextextended('referral:' || v_inviter::text, 0));   -- 상한 경쟁 직렬화
  if (select count(*) from referrals where inviter_id = v_inviter) >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'inviter_full');
  end if;

  insert into referrals (invitee_id, inviter_id, code, platform)
  values (p_invitee, v_inviter, v_code, left(p_platform, 16))
  on conflict (invitee_id) do nothing;
  if not found then return jsonb_build_object('ok', false, 'reason', 'already_bound'); end if;

  insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, amount, occurred_at, source)
  values ('referral:welcome:' || p_invitee, 'referral', p_invitee, 'friend_pin', 'cosmetic', 'referral', 0, now(), 'referral')
  on conflict (event_id) do nothing;
  return jsonb_build_object('ok', true, 'welcome', 'friend_pin');
end $$;

-- ⑥ 정산 — 초대자가 게임을 켤 때. pending 피초대자를 활성화하고, 넘은 단계 보상을 멱등 지급
create or replace function public.referral_claim(p_inviter uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_active   int;
  v_newly    int;
  v_granted  text[];
begin
  -- 쿨다운 — 30초 안에 다시 부르면 훑지 않고 현재 상태만 돌려준다(코드 없는 사람은 초대한 적도 없다)
  update referral_codes set last_claim_at = now()
  where user_id = p_inviter and (last_claim_at is null or last_claim_at < now() - interval '30 seconds');
  if not found then
    return jsonb_build_object(
      'active',  (select count(*) from referrals where inviter_id = p_inviter and activated_at is not null),
      'pending', (select count(*) from referrals where inviter_id = p_inviter and activated_at is null),
      'newly_active', 0, 'granted', '[]'::jsonb, 'throttled', true);
  end if;

  with days as (
    select r.invitee_id,
           count(distinct (s.started_at at time zone 'Asia/Seoul')::date) as d
    from referrals r
    join auth.users u on u.id = r.invitee_id
    join session_logs s on s.user_id = r.invitee_id
     and s.started_at >= u.created_at and s.started_at < u.created_at + interval '7 days'
    where r.inviter_id = p_inviter and r.activated_at is null
      and u.created_at > now() - interval '8 days'                     -- 7일 창이 끝난 사람은 다시 안 훑는다
      and exists (select 1 from jsonb_each(case when jsonb_typeof(s.counts) = 'object' then s.counts else '{}'::jsonb end) c
                  where c.key = any (_referral_nsm_events())
                    and jsonb_typeof(c.value) = 'number' and (c.value #>> '{}')::numeric > 0)
    group by r.invitee_id
  )
  update referrals r set activated_at = now()
  from days where days.invitee_id = r.invitee_id and days.d >= 2;
  get diagnostics v_newly = row_count;

  select count(*) into v_active from referrals where inviter_id = p_inviter and activated_at is not null;

  with ins as (
    insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, amount, occurred_at, source)
    select 'referral:' || p_inviter || ':' || t.need, 'referral', p_inviter, t.item_id, t.kind, 'referral', 0, now(), 'referral'
    from _referral_tiers() t where t.need <= v_active
    on conflict (event_id) do nothing
    returning item_id
  )
  select array_agg(item_id) into v_granted from ins;

  return jsonb_build_object(
    'active', v_active, 'newly_active', v_newly,
    'pending', (select count(*) from referrals where inviter_id = p_inviter and activated_at is null),
    'granted', coalesce(to_jsonb(v_granted), '[]'::jsonb));
end $$;

revoke all on function public.referral_get_code(uuid)         from public, anon, authenticated;
grant execute on function public.referral_get_code(uuid)         to service_role;
revoke all on function public.referral_bind(uuid, text, text) from public, anon, authenticated;
revoke all on function public.referral_claim(uuid)            from public, anon, authenticated;
grant execute on function public.referral_bind(uuid, text, text) to service_role;
grant execute on function public.referral_claim(uuid)            to service_role;

-- ⑦ 보안 트리거 — 추천 꾸미기 3종을 프리미엄 목록에 (migrate_security_hardening.sql 의 정의를 대체)
create or replace function public._premium_cosmetic_ids()
returns text[] language sql immutable set search_path = public as $$
  select array[
    'firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl',
    'forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry',
    'tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest',
    'bat_wing', 'bat_cape',
    'tools_star', 'friend_wing', 'friend_pin'
  ]::text[]
$$;

-- ⑧ 야외 장식 가드 — 원장 없는 보상 장식은 outdoor·outdoorStored 에서 뺀다
create or replace function public._reward_decor_ids()
returns text[] language sql immutable set search_path = public as $$
  select array['friendarch']::text[]
$$;

create or replace function public._game_saves_guard_decor()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_seen text[];
  v_bad  text[];
begin
  -- 세이브에 등장한 보상 장식만 원장을 본다(대부분의 저장은 여기서 끝)
  select array_agg(distinct x) into v_seen from (
    select o->>'id' as x from jsonb_array_elements(
      case when jsonb_typeof(new.state->'outdoor') = 'array' then new.state->'outdoor' else '[]'::jsonb end) o
    union all
    select k from jsonb_object_keys(
      case when jsonb_typeof(new.state->'outdoorStored') = 'object' then new.state->'outdoorStored' else '{}'::jsonb end) k
  ) t where x = any (_reward_decor_ids());
  if v_seen is null then return new; end if;

  select array_agg(u.item) into v_bad from unnest(v_seen) as u(item)
  where not exists (select 1 from purchases p where p.user_id = new.user_id and p.item_id = u.item and p.revoked_at is null);
  if v_bad is null then return new; end if;

  if jsonb_typeof(new.state->'outdoor') = 'array' then
    new.state := jsonb_set(new.state, '{outdoor}', coalesce(
      (select jsonb_agg(o) from jsonb_array_elements(new.state->'outdoor') o
        where not coalesce(o->>'id' = any (v_bad), false)), '[]'::jsonb));
  end if;
  if jsonb_typeof(new.state->'outdoorStored') = 'object' then
    new.state := jsonb_set(new.state, '{outdoorStored}', (new.state->'outdoorStored') - v_bad);
  end if;
  return new;
end $$;

revoke all on function public._game_saves_guard_decor() from public, anon, authenticated;

drop trigger if exists trg_game_saves_guard_decor on public.game_saves;
create trigger trg_game_saves_guard_decor
  before insert or update of state on public.game_saves
  for each row execute function public._game_saves_guard_decor();

commit;
