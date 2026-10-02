-- =============================================================
--  calm forest · 📊 결제 퍼널(서버 기준) — checkout_events
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회). 멱등.
--  ▶ Paddle 웹훅(functions/api/paddle-webhook.js)만 쓴다 — service key. 클라이언트는 읽지도 쓰지도 않는다.
--  ▶ 거래 하나당 생성·준비·실패·취소·완료 알림이 여러 행으로 쌓인다 → transaction_id 로 묶어 "어디서 멈췄나" 를 본다.
--  ▶ 개인정보(이메일·고객 id·주소)는 담지 않는다. user_id 는 우리가 결제창 customData 로 실은 값.
--  ▶ Paddle 대시보드 > Developer tools > Notifications 에서 transaction.created·updated·payment_failed·canceled 등을 구독해야 들어온다.
-- =============================================================

create table if not exists public.checkout_events (
  id              bigint generated always as identity primary key,
  event_id        text not null unique,        -- Paddle 알림 id(evt_…) — 재전송 멱등 키
  event_type      text not null,               -- 'transaction.created' | 'transaction.payment_failed' | …
  transaction_id  text,                        -- txn_… — 한 결제 시도의 묶음 키
  status          text,                        -- 그 시점의 거래 상태(draft·ready·completed·canceled…)
  user_id         uuid references auth.users(id) on delete set null,
  item_ids        text[] not null default '{}',-- 카탈로그 id ('tools_moon')
  origin          text,                        -- 'web' | 'api' …
  amount          integer,                     -- 통화 최소 단위(KRW 는 원)
  currency        text,
  method          text,                        -- 결제수단 종류('card' 등) — 카드번호 아님
  error_code      text,                        -- 결제 실패 코드('declined' 등)
  occurred_at     timestamptz not null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_checkout_events_txn  on public.checkout_events (transaction_id);
create index if not exists idx_checkout_events_time on public.checkout_events (occurred_at);

alter table public.checkout_events enable row level security;
-- 정책을 두지 않는다 → anon/authenticated 는 읽기·쓰기 모두 불가. Worker 의 service key 만 쓴다.

-- 📈 거래별 마지막 상태(퍼널 집계용) — 결제창을 열고 완료/실패/방치 중 어디서 끝났나
create or replace view public.checkout_funnel with (security_invoker = true) as   -- 호출자 권한(RLS 우회 금지)
select distinct on (transaction_id)
  transaction_id, user_id, item_ids, status as last_status, event_type as last_event,
  error_code, method, amount, currency,
  min(occurred_at) over (partition by transaction_id) as started_at,
  occurred_at as last_at
from public.checkout_events
where transaction_id is not null
order by transaction_id, occurred_at desc, id desc;   -- 같은 시각 알림(created·updated) 동점은 나중에 쌓인 행
-- 뷰도 서비스 키 전용(기본 권한 회수)
revoke all on public.checkout_funnel from anon, authenticated;
