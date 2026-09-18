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

-- ── 사고로 null 이 된 1행 복원 (2026-09-13) ─────────────────────────────
--  feedback id=2 (2026-09-05 05:53:18Z, 토스 Android 게스트): BigQuery calm_forest_raw 의 게스트 세션
--  (sess-ewbk47dm3thmtnxgg82, client c-e50a4ba7-cd9b-4f52-8ca8-512e4ec650d8) 원장과 대조 —
--  05:52:42Z house_expand stage5 직후 잔액 755 = 피드백 meta 의 coins 755 · houseStage 5 와 일치.
--  계정(auth.users)은 이미 삭제돼 되살릴 수 없고, 작성자 id 값만 다시 적어 BQ 세션·원장과 이어지게 한다.
--  ⚠️ 위의 FK 제거 뒤에만 실행 가능(FK 가 있으면 없는 계정이라 거부된다).
update public.feedback
   set user_id = '32fa2ae4-f85a-4c79-960a-7701a5691a21'
 where id = 2 and user_id is null;
