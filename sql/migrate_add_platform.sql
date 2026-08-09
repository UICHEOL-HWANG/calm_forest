-- =============================================================
--  [마이그레이션] 앱인토스 대비: 로그 테이블에 platform 세그먼트 추가
--  ------------------------------------------------------------
--  클라이언트(supabase-client.js)가 모든 로그 행에
--  platform: 'web'(브라우저) | 'toss'(앱인토스 웹뷰) 를 붙입니다.
--  Supabase SQL Editor에서 1회 실행하세요. (기존 행은 'web'으로 채움)
-- =============================================================

alter table game_logs    add column if not exists platform text not null default 'web';
alter table econ_logs    add column if not exists platform text not null default 'web';
alter table session_logs add column if not exists platform text not null default 'web';

-- 플랫폼별 집계가 잦으면 인덱스(선택):
-- create index if not exists idx_session_logs_platform on session_logs (platform);
