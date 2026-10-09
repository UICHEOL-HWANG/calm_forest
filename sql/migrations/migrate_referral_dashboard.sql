-- =============================================================
--  calm forest · 🤝 친구 초대 관리자 대시보드 (2026-10-09)
--  ------------------------------------------------------------
--  ① referral_bind_log — 연결 시도 1건 = 1행(사유 포함). Worker(functions/api/referral.js logBind)가
--     service key 로만 쓴다. 클라이언트 접근 없음(RLS 켜고 정책 없음).
--  ② cf_admin_referral(days) — dashboards/admin_analytics.html 🤝 섹션(C안)이 부른다. 관리자만.
--     단계 출처: 시트·공유·도착 = session_logs.counts(클라이언트 GA4 카운터 사본) ·
--               연결·활성 = referrals · 보상 지급 = purchases(source='referral') · 실패 사유 = ①
--  ▶ 페르소나·셀프테스트 계정은 뺀다(이메일 패턴 — dev/active/persona-sim).
--  ▶ 멱등 — 다시 돌려도 된다.
-- =============================================================

create table if not exists public.referral_bind_log (
  id        bigint generated always as identity primary key,
  user_id   uuid not null references auth.users(id) on delete cascade,
  reason    text not null,                 -- 'ok' | referral_bind 거절 사유 | 'bad_code'(형식 오류)
  platform  text,
  at        timestamptz not null default now()
);
create index if not exists idx_referral_bind_log_at on public.referral_bind_log (at);
alter table public.referral_bind_log enable row level security;   -- 정책 없음 = 클라이언트 접근 불가
revoke all on public.referral_bind_log from anon, authenticated;

-- (첫 적용 때 만든 행 단위 제외 함수 — 집합(ex CTE)으로 바꿔 더 안 쓴다)
drop function if exists public._referral_excluded(uuid);

create or replace function public.cf_admin_referral(days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(days, 30), 365)));
  v jsonb;
begin
  if not public.cf_is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  -- 제외 계정은 한 번만 모은다 — 행마다 함수를 부르면 session_logs 가 커질수록 느려진다(리뷰 2026-10-09)
  with ex as materialized (
    select id from auth.users
    where email like '%@sim.calmforest.local' or email like 'selftest-%' or email like 'nb-selftest-%'
  ),
  sl as (   -- ⚠️ 숫자가 아닌 값이 섞여도 함수 전체가 죽지 않게 jsonb 타입을 보고 꺼낸다
    select s.user_id, s.client_id,
           case when jsonb_typeof(s.counts->'invite_sheet_open') = 'number' then (s.counts->>'invite_sheet_open')::numeric else 0 end as sheet,
           case when jsonb_typeof(s.counts->'invite_share') = 'number'      then (s.counts->>'invite_share')::numeric      else 0 end as share,
           case when jsonb_typeof(s.counts->'invite_land') = 'number'       then (s.counts->>'invite_land')::numeric       else 0 end as land
    from session_logs s
    where s.started_at >= v_since
      and not exists (select 1 from ex where ex.id = s.user_id)
  ),
  r as (
    select * from referrals x
    where not exists (select 1 from ex where ex.id in (x.inviter_id, x.invitee_id))
  ),
  steps as (
    select
      (select count(distinct user_id) from sl where sheet > 0)                              as sheet,
      (select count(distinct user_id) from sl where share > 0)                              as share,
      (select count(distinct coalesce(client_id, user_id::text)) from sl where land > 0)    as land,
      (select count(*) from r where bound_at >= v_since)                                    as bound,
      (select count(*) from r where activated_at >= v_since)                                as active,
      (select count(*) from purchases p
         where p.source = 'referral' and p.revoked_at is null and p.created_at >= v_since
           and p.item_id in ('tools_star', 'friendarch', 'friend_wing')
           and not exists (select 1 from ex where ex.id = p.user_id))                                    as granted
  ),
  fails as (
    select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'n', n) order by n desc), '[]'::jsonb) as j
    from (select reason, count(*) n from referral_bind_log
          where at >= v_since and reason <> 'ok' and not exists (select 1 from ex where ex.id = referral_bind_log.user_id)
          group by reason) q
  ),
  tiers as (   -- 단계 보상을 받은 사람 수(누적 — 단계는 한 번 받으면 끝)
    select jsonb_build_object(
      'tools_star',  count(distinct user_id) filter (where item_id = 'tools_star'),
      'friendarch',  count(distinct user_id) filter (where item_id = 'friendarch'),
      'friend_wing', count(distinct user_id) filter (where item_id = 'friend_wing')) as j
    from purchases
    where source = 'referral' and revoked_at is null and not exists (select 1 from ex where ex.id = purchases.user_id)
  ),
  per_day as (
    select inviter_id, (bound_at at time zone 'Asia/Seoul')::date d, count(*) c
    from r where bound_at >= v_since group by 1, 2
  ),
  top as (     -- 기간 안에 연결이 많은 초대자 8명 · peak = 하루 최다 연결(부계정 감시)
    select coalesce(jsonb_agg(jsonb_build_object(
             'who', left(t.inviter_id::text, 3) || '…' || right(t.inviter_id::text, 3),
             'bound', t.bound, 'active', t.active, 'peak', t.peak, 'platforms', t.platforms)
             order by t.bound desc, t.active desc), '[]'::jsonb) as j
    from (
      select r1.inviter_id, count(*) bound, count(r1.activated_at) active,
             (select max(c) from per_day pd where pd.inviter_id = r1.inviter_id) peak,
             string_agg(distinct coalesce(r1.platform, '?'), '·') platforms
      from r r1 where r1.bound_at >= v_since
      group by r1.inviter_id order by count(*) desc, count(r1.activated_at) desc limit 8
    ) t
  )
  select jsonb_build_object(
    'days', greatest(1, least(coalesce(days, 30), 365)),
    'steps', to_jsonb(steps), 'fails', fails.j, 'tiers', tiers.j, 'top', top.j)
  into v
  from steps, fails, tiers, top;
  return v;
end $$;
revoke all on function public.cf_admin_referral(integer) from public, anon;
grant execute on function public.cf_admin_referral(integer) to authenticated;   -- 안에서 cf_is_admin() 으로 거른다
