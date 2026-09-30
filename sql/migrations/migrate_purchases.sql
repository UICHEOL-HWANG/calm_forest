-- =============================================================
--  calm forest · 💳 현금 구매 원장 (purchases)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회). 멱등.
--  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §3
--
--  ▶ Paddle 웹훅(functions/api/paddle-webhook.js)만 쓴다 — service key. 클라이언트는 본인 행 select 만.
--  ▶ 환불·차지백은 행을 지우지 않고 revoked_at 만 찍는다(분쟁 기록).
--  ▶ event_id 가 멱등 키 — Paddle 은 같은 알림을 여러 번 보낼 수 있다(라이브 3일간 60회 재시도).
-- =============================================================

create table if not exists public.purchases (
  id              bigint generated always as identity primary key,
  event_id        text not null unique,        -- '<notification_id>:<price_id>' — 항목당 1행
  transaction_id  text not null,               -- txn_… — 환불이 이 값으로 찾아온다
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_id         text not null,               -- 카탈로그/펫 id ('straw_hat', 'leaf')
  kind            text not null check (kind in ('cosmetic', 'pet')),
  price_id        text not null,               -- pri_…
  amount          integer,                     -- 결제 총액(통화 최소 단위, Paddle details.totals.total)
  currency        text,                        -- 'KRW' | 'USD' …
  occurred_at     timestamptz not null,        -- Paddle occurred_at
  revoked_at      timestamptz,                 -- 환불·차지백 승인 시각. null = 유효
  raw             jsonb,                       -- 웹훅 data 원문
  created_at      timestamptz not null default now()
);

create index if not exists idx_purchases_user on public.purchases (user_id);
create index if not exists idx_purchases_txn  on public.purchases (transaction_id);

alter table public.purchases enable row level security;

drop policy if exists "own purchases select" on public.purchases;
create policy "own purchases select" on public.purchases
  for select using ((select auth.uid()) = user_id);
-- insert/update 정책은 두지 않는다 → anon/authenticated 는 쓸 수 없다. Worker 의 service key 만 쓴다.
