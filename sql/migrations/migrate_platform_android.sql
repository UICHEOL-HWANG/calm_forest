-- =============================================================
--  📱 platform 에 'android'(구글 플레이 Capacitor 앱) 추가
--  ------------------------------------------------------------
--  js/platform.js 가 window.__ANDROID__ 플래그(scripts/build-cap.mjs 주입)를 보면
--  PLATFORM = 'android' 를 보낸다. 지금 DB 에 platform CHECK 가 걸린 곳은
--  retention_guidance_scores 하나뿐이다(2026-09-23 pg_constraint 조회 — struct_04 는 미적용).
--  이 제약을 안 고치면 앱의 리텐션 점수 insert 가 전부 거부된다.
--
--  순서: 이 SQL 먼저 → 앱 빌드 배포. (앱이 먼저 나가면 위 insert 가 실패한다)
--  적용: Supabase SQL Editor 에서 1회 실행. (MCP 는 읽기 전용이라 DDL 불가)
-- =============================================================

begin;

alter table public.retention_guidance_scores
  drop constraint if exists retention_guidance_scores_platform_chk;

alter table public.retention_guidance_scores
  add constraint retention_guidance_scores_platform_chk
  check (platform is null or platform in ('web','toss','itch','android'));

commit;

-- 검증: 'android' 가 목록에 보여야 한다
-- select pg_get_constraintdef(oid) from pg_constraint
--  where conname = 'retention_guidance_scores_platform_chk';
