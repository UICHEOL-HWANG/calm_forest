-- =============================================================
--  calm forest · 🍎 과수원 이벤트 원장 테이블 (orchard_events)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 왜 있나 — GA4 는 광고차단에 유실되고 BigQuery export 가 일별이라
--    당일 확인이 안 된다. 과수원은 리텐션 측정이 존재 이유인 기능이라
--    핵심 생애주기 이벤트를 Supabase 에도 직접 남긴다.
--  ▶ game_logs(좌표 전용 센서 로그)와 섞지 않는다 — 별도 테이블.
--  ▶ 적재 경로: POST /api/orchard-events (functions/api/orchard-events.js,
--    worker/index.js 에 라우트 등록됨) — 유저 access_token 으로 본인 행만 쓴다.
-- =============================================================

create table if not exists public.orchard_events (
  id          bigserial primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  at          timestamptz not null default now(),
  event       text not null,      -- sapling_plant | tree_water | fruit_ready | fruit_harvest | fruit_capped | tree_chop
  kind        text,               -- apple | pear | peach | persimmon | chestnut
  n           int,
  near_stream boolean,
  method      text,               -- manual | stream | sprinkler  (source 금지 — GA4 예약어)
  trees       int,
  platform    text                -- web | toss | itch
);

create index if not exists orchard_events_user_at on public.orchard_events (user_id, at desc);

alter table public.orchard_events enable row level security;

-- ⚠️ (select auth.uid()) 로 감싼다 — 저장소 규칙(행마다 함수 호출이 도는 것을 막는다).
--    bare auth.uid() = user_id 로 쓰면 안 된다(알려진 성능 문제).
create policy "own rows" on public.orchard_events
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
