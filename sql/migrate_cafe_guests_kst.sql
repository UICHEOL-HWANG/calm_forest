-- =============================================================
--  calm forest · ☕ cafe_guests INSERT 정책을 KST 기준으로 (2026-09-19)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(drop + create)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 무엇이 잘못됐나
--    기존 정책(sql/migrate_cafe_guests.sql)은 `with check (gen_date = current_date)` 였습니다.
--    그런데 Postgres 의 current_date 는 **DB 타임존(UTC)** 날짜이고,
--    게임이 보내는 gen_date 는 js/game.js todayStr() — **브라우저 로컬 날짜** 입니다.
--    한국(KST=UTC+9)에서 00:00~09:00 사이에는 두 값이 하루 어긋납니다.
--      예) KST 2026-09-19 01:13  →  gen_date 2026-09-19 / current_date 2026-09-18  → 403
--    그래서 **매일 KST 새벽 9시간 동안 카페 손님 아카이브가 항상 실패**했습니다.
--    (실제로 기존 행의 기록 시각은 전부 KST 09:59~21:39 사이 — 새벽 기록이 0건)
--    게임 동작에는 영향이 없습니다(예외를 전부 삼킴). 잃는 건 그 시간대의 생성 콘텐츠 기록뿐입니다.
--
--  ▶ 왜 ±1일인가
--    기준을 KST 로 옮기는 것만으로는 **해외 유저**가 또 어긋납니다.
--    gen_date 는 유저의 로컬 날짜라 KST 와 최대 하루까지 차이가 납니다(itch·영어판 유저).
--    그래서 KST 오늘을 중심으로 앞뒤 하루를 허용합니다.
--    과거·미래를 대량으로 채워 넣는 장난은 여전히 막힙니다.
-- =============================================================

drop policy if exists "cafe guests insert today" on public.cafe_guests;

create policy "cafe guests insert today" on public.cafe_guests
  for insert to authenticated
  with check (
    gen_date between ((now() at time zone 'Asia/Seoul')::date - 1)
                 and ((now() at time zone 'Asia/Seoul')::date + 1)
  );

-- ── 확인 ─────────────────────────────────────────────────────
-- select policyname, cmd, roles, with_check from pg_policies where tablename = 'cafe_guests';
--
-- 적용 뒤 KST 새벽(00~09시)에 카페를 열면 행이 쌓이기 시작합니다:
--   select gen_date, count(*), max(created_at at time zone 'Asia/Seoul') as last_kst
--   from public.cafe_guests group by gen_date order by gen_date desc limit 7;
