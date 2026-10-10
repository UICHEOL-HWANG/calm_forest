-- =============================================================
--  🍎 platform 에 'ios'(App Store Capacitor 앱) 추가
--  ------------------------------------------------------------
--  js/platform.js 가 window.__IOS__ 플래그(scripts/build-cap.mjs ios 주입)를 보면
--  PLATFORM = 'ios' 를 보낸다. 지금 DB 에 platform CHECK 가 걸린 곳은 2곳이다
--  (2026-10-11 pg_constraint 조회): retention_guidance_scores · star_runs.
--  이 제약을 안 고치면 iOS 앱의 리텐션 점수·별자리 기록 insert 가 전부 거부된다.
--
--  순서: 이 SQL 먼저 → iOS 앱 배포. (앱이 먼저 나가면 위 insert 가 실패한다)
--  적용: pg8000 풀러로 직접 실행(파일 전체 한 번에). 재실행해도 안전(drop if exists → add).
-- =============================================================

begin;

alter table public.retention_guidance_scores
  drop constraint if exists retention_guidance_scores_platform_chk;
alter table public.retention_guidance_scores
  add constraint retention_guidance_scores_platform_chk
  check (platform is null or platform in ('web','toss','itch','android','ios'));

alter table public.star_runs
  drop constraint if exists star_runs_platform_chk;
alter table public.star_runs
  add constraint star_runs_platform_chk
  check (platform is null or platform in ('web','toss','itch','android','ios'));

commit;

-- 검증: 두 제약 모두 'ios' 가 보여야 한다
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--  where conname in ('retention_guidance_scores_platform_chk', 'star_runs_platform_chk');
