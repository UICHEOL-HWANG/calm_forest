-- =============================================================
--  📮 소식함 — 공지 + 1:1 답장을 한 테이블로 (2026-09-11)
--  ------------------------------------------------------------
--  · target_user_id null  = 전체 공지(게스트 포함 모두에게)
--  · target_user_id 값    = 그 유저에게만 보이는 답장
--  · reply_to             = 어느 feedback 행의 답인지(선택) — 클라이언트가 원문 한 줄을 인용
--  · title_en / body_en   = 영어 모드용(없으면 한국어 폴백 — i18n 과 같은 철학)
--
--  클라이언트는 select 만. insert 는 SQL Editor / MCP(service_role) 로만:
--
--    -- 전체 공지
--    insert into public.notices (title, body, title_en, body_en) values
--      ('🌧️ 비 오는 날 안내', '비 오는 날엔 밭에 물을 안 줘도 돼요.', 'Rainy days', 'No need to water on rainy days.');
--
--    -- 답장 (feedback.id 로 원문을 찾아 그 user_id 에게)
--    insert into public.notices (title, body, target_user_id, reply_to)
--      select '밤 밭 가시성', '밤에 밭 주변 램프를 밝게 했어요. 알려주셔서 고마워요!', user_id, id
--        from public.feedback where id = 12;
--
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

begin;

create table if not exists public.notices (
  id             bigint generated always as identity primary key,
  title          text not null,
  body           text not null,
  title_en       text,
  body_en        text,
  target_user_id uuid references auth.users(id) on delete cascade,   -- null = 전체 공지
  reply_to       bigint references public.feedback(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists notices_target_idx on public.notices (target_user_id, id);

alter table public.notices enable row level security;

-- 전체 공지 또는 내게 온 것만. (select auth.uid()) = InitPlan 1회 평가(migrate_struct_01 규칙)
drop policy if exists notices_select_visible on public.notices;
create policy notices_select_visible on public.notices
  for select to authenticated
  using (target_user_id is null or target_user_id = (select auth.uid()));

-- 답장 창에서 내 원문을 인용하려면 본인 feedback 읽기가 필요(지금은 insert 정책만 있음)
drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select to authenticated
  using (user_id = (select auth.uid()));

commit;
