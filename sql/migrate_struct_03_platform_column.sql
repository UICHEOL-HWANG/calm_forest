-- =============================================================
--  📱 구조화 ③  공통 컬럼 계약 — platform 을 미니게임 테이블까지
--  ------------------------------------------------------------
--  문제: 로그성 테이블 5개가 같은 식별 컬럼 묶음을 반복하는데
--        platform 만 3개(game_logs/session_logs/econ_logs)에 있고
--        boat_runs·sea_records 엔 없다.
--        → "토스에서 나룻배를 얼마나 하나"를 지금은 답할 수 없다.
--        (game_logs 기준 토스 46,023 / 웹 9,652 — 이미 토스가 주력인데도)
--
--  ⚠️ default 'web' 로 소급 백필하면 안 된다 — 실제로 확인해 보니
--     기존 30행(boat 18 · sea 12)의 다수가 토스 유입이다.
--     'web' 으로 채웠다면 17행을 잘못 라벨링할 뻔했다.
--
--  ✅ 대신 session_logs 를 조인해 "실제 관측값"을 복원한다.
--     boat_runs·sea_records 는 session_id 를 갖고 있고 session_logs 에는
--     platform 이 이미 있다. 같은 세션이면 같은 플랫폼이므로 추정이 아니라
--     복원이다. 복원 가능: boat 12/18 (toss 9·web 3) · sea 9/12 (toss 8·web 1)
--     복원 안 되는 9행(세션 요약이 안 남은 런)은 NULL = "미상" 으로 둔다.
--
--  ⚠️ nullable 불일치 주의 — 기존 3테이블(game_logs·session_logs·econ_logs)의
--     platform 은 not null default 'web' 이지만, 여기 2개는 nullable 이다.
--     (2026-08-09 당시엔 토스 출시 전이라 전량 'web' 백필이 정당했고,
--      지금은 그렇지 않기 때문에 생긴 의도적 차이다)
--     → 집계 쿼리에서 where platform = 'web' 이나 group by platform 을 쓰면
--       NULL 행이 조용히 빠진다. 아래 패턴을 쓸 것:
--         group by coalesce(platform, 'unknown')
--
--  ⚠️ 이 마이그레이션만으로는 신규 행에 값이 안 들어온다.
--     js/supabase-client.js 의 sendBoatRun / sendSeaRecord 가
--     platform: PLATFORM 을 보내도록 함께 수정해야 한다. (같은 커밋에 포함)
--
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

begin;

alter table public.boat_runs   add column if not exists platform text;
alter table public.sea_records add column if not exists platform text;

-- ── 기존 행 복원: 같은 세션의 session_logs.platform 을 가져온다 ──
update public.boat_runs b
   set platform = s.platform
  from public.session_logs s
 where s.session_id = b.session_id
   and b.platform is null;

update public.sea_records r
   set platform = s.platform
  from public.session_logs s
 where s.session_id = r.session_id
   and r.platform is null;

-- ⚠️ default 는 "클라이언트 배포 이후에" 걸어야 한다 — 순서가 중요하다.
--    sendBoatRun/sendSeaRecord 가 platform 을 보내기 전에 default 를 걸어두면,
--    값을 안 보내는 구버전 클라이언트의 행이 전부 'web' 으로 박힌다.
--    실제로 2026-09-07 16:16 에 이걸로 boat_runs id 51 · sea_records id 23 이
--    'web' 으로 오염됐다(배포 커밋 5100f2a 는 16:42). 둘 다 NULL 로 되돌렸다.
--    NULL(=미상) 이 거짓 'web' 보다 낫다.
--
--    ✅ 현재: 클라이언트 배포 완료(5100f2a, origin/dev) → default 를 걸어 둔 상태.
--       배포본이 항상 'web'|'toss' 를 보내므로 default 가 발동할 일이 거의 없고,
--       발동한다면 아주 오래된 캐시 번들이라는 뜻이다.
alter table public.boat_runs   alter column platform set default 'web';
alter table public.sea_records alter column platform set default 'web';

comment on column public.boat_runs.platform is
  'web | toss. NULL = 세션 요약이 없어 플랫폼을 복원하지 못한 2026-09-07 이전 기록.';
comment on column public.sea_records.platform is
  'web | toss. NULL = 세션 요약이 없어 플랫폼을 복원하지 못한 2026-09-07 이전 기록.';

commit;

-- ── 검증 ──────────────────────────────────────────────────────
--  select coalesce(platform,'unknown') as platform, count(*)
--  from public.boat_runs group by 1 order by 2 desc;
--  → 예상: toss 9 · web 3 · unknown 6   (실행 시점에 따라 신규 행이 더해짐)
