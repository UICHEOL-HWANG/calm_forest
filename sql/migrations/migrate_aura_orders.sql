-- =============================================================
--  🏮 빛 공방 — 오라 주문 원장 (2026-10)
--  쓰기는 Worker(서비스 키)만: 주문 접수 API·새벽 크론. 클라이언트는 본인 행 읽기만.
--  하루 1회는 unique (user_id, order_date) 가 강제한다(금칙어 거절은 행을 남기지 않는다).
--  멱등 — 여러 번 실행해도 된다.
-- =============================================================
create table if not exists public.aura_orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text check (client_id is null or char_length(client_id) <= 64),
  platform    text check (platform is null or char_length(platform) <= 16),
  order_date  date not null,
  text        text not null check (char_length(text) between 1 and 60),
  cards       jsonb not null check (jsonb_typeof(cards) = 'object' and octet_length(cards::text) <= 4096),
  status      text not null default 'pending' check (status in ('pending', 'submitted', 'done', 'fallback', 'claimed')),
  recipe      jsonb check (recipe is null or (jsonb_typeof(recipe) = 'object' and octet_length(recipe::text) <= 4096)),
  batch_id    text,
  attempts    smallint not null default 0,
  model       text,
  created_at  timestamptz not null default now(),
  ready_at    timestamptz,
  claimed_at  timestamptz,
  unique (user_id, order_date)
);
create index if not exists aura_orders_status_idx on public.aura_orders (status) where status in ('pending', 'submitted');

alter table public.aura_orders enable row level security;
-- ⚠️ (select auth.uid()) 로 감싸는 것이 이 저장소 규칙
drop policy if exists aura_orders_select_own on public.aura_orders;
create policy aura_orders_select_own on public.aura_orders for select to authenticated using ((select auth.uid()) = user_id);

-- 크론 실행 기록에 종류 칸(기존 행은 null = ai-pregen)
alter table public.ai_pregen_runs add column if not exists kind text;
