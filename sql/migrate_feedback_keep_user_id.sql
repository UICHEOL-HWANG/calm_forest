-- =============================================================
--  calm forest · 💬 feedback.user_id 를 계정 삭제 후에도 보존
--  ------------------------------------------------------------
--  배경(2026-09-13): feedback.user_id 가 auth.users 를 참조하며 on delete set null 이라
--  게스트(익명) 계정이 7일 뒤 정리(scripts/export_to_bq.py)될 때 피드백의 작성자 id 가
--  null 로 바뀌었다(id=2, 토스 Android 게스트). 피드백은 운영 기록이라 작성자 id 를
--  계정 수명과 무관하게 남겨야 세션/원장(BigQuery 사본)과 다시 이을 수 있다.
--
--  조치: FK 만 제거한다. 컬럼·RLS 정책(auth.uid() = user_id)은 그대로 — 정책은 FK 가 없어도 동작한다.
--  이미 null 이 된 행(id=2)은 계정이 사라져 복구할 수 없다.
--  실행: Supabase SQL 편집기(MCP 는 DDL 불가).
-- =============================================================
alter table public.feedback drop constraint if exists feedback_user_id_fkey;
comment on column public.feedback.user_id is
  '작성 당시 auth.users.id — FK 없음(계정 삭제 뒤에도 보존, 2026-09-13)';
