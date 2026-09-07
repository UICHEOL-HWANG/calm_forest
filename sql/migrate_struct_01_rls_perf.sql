-- =============================================================
--  🔐 구조화 ①  RLS 정책 성능 재정의 — 21개 정책 일괄
--  ------------------------------------------------------------
--  문제: 21개 정책 중 20개가 auth.uid() / auth.jwt() 를 맨몸으로 호출한다.
--        (나머지 1개 cafe_guests 는 auth 함수를 안 써서 명명만 통일)
--        Postgres 는 이를 volatile 로 보고 "행마다" 실행한다.
--        game_logs 55,675행 = 쿼리 1회에 함수 호출 5.6만 번.
--
--  해법: (select auth.uid()) 로 감싼다. 스칼라 서브쿼리는 InitPlan 으로
--        한 번만 평가되고 캐시된다. Supabase 공식 권장 패턴.
--        → 대형 테이블에서 100배 이상 차이 (supabase-postgres-best-practices)
--
--  같이 하는 것:
--   · to authenticated 명시 — anon 은 auth.uid() 가 null 이라 어차피
--     한 행도 못 통과하는데, public 이면 anon 요청마다 정책이 평가된다.
--     service_role 은 RLS 자체를 우회하므로 서버 로깅에는 영향 없다.
--   · 정책명을 <table>_<cmd>_own 으로 통일 (기존: "own boat insert" 등 공백 포함)
--
--  ⚠️ 동작 변경 없음. 같은 행이 보이고 같은 행이 써진다. 순수 성능/명명.
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

begin;

-- ── game_saves ────────────────────────────────────────────────
drop policy if exists "own save select" on public.game_saves;
drop policy if exists "own save update" on public.game_saves;
drop policy if exists "own save upsert" on public.game_saves;

create policy game_saves_select_own on public.game_saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy game_saves_insert_own on public.game_saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy game_saves_update_own on public.game_saves
  for update to authenticated using ((select auth.uid()) = user_id);

-- ── game_logs ─────────────────────────────────────────────────
drop policy if exists "own logs select" on public.game_logs;
drop policy if exists "own logs insert" on public.game_logs;

create policy game_logs_select_own on public.game_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy game_logs_insert_own on public.game_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ── session_logs ──────────────────────────────────────────────
drop policy if exists "own session select" on public.session_logs;
drop policy if exists "own session insert" on public.session_logs;
drop policy if exists "own session update" on public.session_logs;

create policy session_logs_select_own on public.session_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy session_logs_insert_own on public.session_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy session_logs_update_own on public.session_logs
  for update to authenticated using ((select auth.uid()) = user_id);

-- ── econ_logs ─────────────────────────────────────────────────
drop policy if exists "own econ select" on public.econ_logs;
drop policy if exists "own econ insert" on public.econ_logs;

create policy econ_logs_select_own on public.econ_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy econ_logs_insert_own on public.econ_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ── boat_runs ─────────────────────────────────────────────────
drop policy if exists "own boat select" on public.boat_runs;
drop policy if exists "own boat insert" on public.boat_runs;

create policy boat_runs_select_own on public.boat_runs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy boat_runs_insert_own on public.boat_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ── sea_records ───────────────────────────────────────────────
drop policy if exists "own sea select" on public.sea_records;
drop policy if exists "own sea insert" on public.sea_records;

create policy sea_records_select_own on public.sea_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy sea_records_insert_own on public.sea_records
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ── photos ────────────────────────────────────────────────────
drop policy if exists "own photos select" on public.photos;
drop policy if exists "own photos insert" on public.photos;
drop policy if exists "own photos delete" on public.photos;

create policy photos_select_own on public.photos
  for select to authenticated using ((select auth.uid()) = user_id);
create policy photos_insert_own on public.photos
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy photos_delete_own on public.photos
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ── feedback ──────────────────────────────────────────────────
--  user_id 는 ON DELETE SET NULL(익명 보존) — insert 시엔 본인만.
drop policy if exists "own feedback insert" on public.feedback;

create policy feedback_insert_own on public.feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- ── beta_testers / beta_diary ─────────────────────────────────
--  이쪽은 auth.jwt() 기반. 동일하게 행마다 호출되므로 감싼다.
drop policy if exists beta_testers_self_read on public.beta_testers;
drop policy if exists beta_diary_self_rw     on public.beta_diary;

create policy beta_testers_select_own on public.beta_testers
  for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));

create policy beta_diary_all_own on public.beta_diary
  for all to authenticated
  using      (email = lower(coalesce((select auth.jwt()) ->> 'email', '')))
  with check (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));

-- ── cafe_guests ───────────────────────────────────────────────
--  auth 함수를 안 쓰므로 성능 문제 없음. 명명만 통일.
drop policy if exists "cafe guests insert today" on public.cafe_guests;
create policy cafe_guests_insert_today on public.cafe_guests
  for insert to authenticated with check (gen_date = current_date);

commit;

-- ── 검증 ──────────────────────────────────────────────────────
--  qual/with_check 에 "SELECT auth." 가 들어갔는지 확인.
--  select tablename, policyname, roles::text, qual, with_check
--  from pg_policies where schemaname='public' order by 1,2;
