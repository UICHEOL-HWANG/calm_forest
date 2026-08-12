-- =============================================================
--  calm forest · 계측 테이블 마이그레이션 (경제 원장 + 세션 요약)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ econ_logs    : 코인 증감 원장 — 모든 획득/소비를 {source,item,amount,balance}로 기록
--  ▶ session_logs : 세션 요약 — 세션당 1행 upsert(행동 카운트·플레이 시간·마지막 상태)
--  두 테이블 모두 ML 피처(이탈 예측·경제 밸런싱·군집화)의 원천 데이터.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) 경제 원장 (append-only)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.econ_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  session_id text,
  client_id  text,                 -- 분석용 영구 기기 식별자
  is_guest   boolean,              -- 게스트(익명) 여부
  variant    text,                 -- A/B 변형(control/A/B)
  source     text not null,        -- 거래 출처: shop_sell/shop_buy/quest_reward/affinity_gift/...
  item       text,                 -- 대상 아이템 또는 quest_id(npc:idx)
  currency   text not null default 'coins',
  amount     integer not null,     -- +획득 / -소비
  balance    integer,              -- 거래 후 잔액(시점별 경제 상태 복원용)
  created_at timestamptz not null default now()
);

create index if not exists idx_econ_logs_user    on public.econ_logs (user_id);
create index if not exists idx_econ_logs_session on public.econ_logs (session_id);
create index if not exists idx_econ_logs_created on public.econ_logs (created_at);
create index if not exists idx_econ_logs_source  on public.econ_logs (source);

alter table public.econ_logs enable row level security;

drop policy if exists "own econ insert" on public.econ_logs;
create policy "own econ insert" on public.econ_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own econ select" on public.econ_logs;
create policy "own econ select" on public.econ_logs
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2) 세션 요약 (세션당 1행, 60초 주기 + 이탈 시 upsert)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.session_logs (
  session_id text primary key,     -- 클라이언트 세션 ID(sess-...)
  user_id    uuid references auth.users(id) on delete cascade,
  client_id  text,
  is_guest   boolean,
  variant    text,
  play_sec   integer,              -- 누적 플레이 시간(초)
  counts     jsonb,                -- GA4 이벤트별 발생 횟수 {"chop_tree":5,...}
  coins      integer,              -- 마지막 코인 잔액
  last_place text,                 -- 마지막 위치(village/house/farm/mine)
  last_x     real, last_z real,    -- 마지막 좌표
  started_at timestamptz,          -- 세션 시작 시각
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_logs_user    on public.session_logs (user_id);
create index if not exists idx_session_logs_client  on public.session_logs (client_id);
create index if not exists idx_session_logs_updated on public.session_logs (updated_at);

alter table public.session_logs enable row level security;

drop policy if exists "own session insert" on public.session_logs;
create policy "own session insert" on public.session_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own session update" on public.session_logs;
create policy "own session update" on public.session_logs
  for update using (auth.uid() = user_id);

drop policy if exists "own session select" on public.session_logs;
create policy "own session select" on public.session_logs
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3) 분석용 뷰(선택) — 경제 흐름 일별 sink/source 요약
--
--    ⚠️ `with (security_invoker = on)` 필수 — 빼면 RLS 가 우회됩니다.
--    Postgres 뷰는 기본이 정의자(definer) 권한 실행이라, RLS 걸린 econ_logs 를
--    감싸도 소유자(postgres) 권한으로 돌아 전체 유저 데이터가 노출됩니다.
--    자세한 배경은 sql/supabase_setup.sql 의 "4) 분석용 뷰" 주석 참고.
--
--    security_invoker = on → 조회자 권한 실행 → 본인 데이터만(전체는 service_role)
--    이미 만든 뷰: alter view public.v_econ_daily set (security_invoker = on);
-- ─────────────────────────────────────────────────────────────
create or replace view public.v_econ_daily
with (security_invoker = on) as
select
  date_trunc('day', created_at) as day,
  source,
  count(*)                      as tx_count,
  sum(amount)                   as net_amount,          -- 양수=유입, 음수=유출
  sum(case when amount > 0 then amount else 0 end) as inflow,
  sum(case when amount < 0 then -amount else 0 end) as outflow
from public.econ_logs
group by day, source
order by day desc, source;
