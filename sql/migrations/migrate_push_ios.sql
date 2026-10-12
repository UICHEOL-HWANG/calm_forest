-- =============================================================
--  calm forest · 🔔🍎 푸시 토큰에 iOS 허용 (push_tokens.platform)
--  ------------------------------------------------------------
--  실행: pg8000 풀러로 직접(파일 전체 한 번에). 멱등.
--  ⚠️ iOS 앱 빌드(푸시 포함)보다 먼저 — 없으면 iOS 기기 등록이 CHECK 위반으로 거부된다(재시도는 된다).
--  ▶ iOS 도 FCM 토큰으로 보낸다(AppDelegate 가 APNs 토큰을 Firebase Messaging 에 넘겨 FCM 토큰을 받는다)
--    → 발송(functions/push-cron.js)·판정은 안드로이드와 그대로 같다.
-- =============================================================

alter table public.push_tokens drop constraint if exists push_tokens_platform_check;
alter table public.push_tokens add constraint push_tokens_platform_check check (platform in ('android','ios'));
