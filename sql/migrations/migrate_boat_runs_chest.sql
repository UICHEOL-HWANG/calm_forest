-- =============================================================
--  calm forest · 🧰 나룻배 보물상자 — boat_runs 에 4컬럼
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ⚠️ 클라이언트 배포 **전에** 적용할 것 — boat_runs 는 고정 컬럼 insert 라
--     모르는 필드(chest…)가 오면 행 전체가 실패해 🛶 리더보드·런 기록이 비게 된다.
--
--  ▶ econ_logs 는 코인 전용이라 코인 없는 상자 보상은 거기 안 남는다 → 여기가 지급 원장.
--  ▶ chest: 0 없음(오늘 이미 건짐) · 1 보고 놓침 · 2 건짐 · 3 상자까지 못 감(건짐률 분모에서 제외)   (js/boat-chest.js chestOutcome)
--    chest_loot: 실제 지급 기준 id(sap_apple·sap_peach·sap_chestnut·fert·bait·gem·color·color_gem) — color_gem = 집 색이 다 열려 보석으로 대체
--    chest_paid: 실제 지급 0/1 (규칙 always — 난파·그만두기에도 1)
--    chest_d: 상자 위치(코스 거리, 70~85% = 434~527) — 위치별 건짐률 분석용
-- =============================================================

alter table public.boat_runs
  add column if not exists chest      smallint not null default 0 check (chest between 0 and 3),
  add column if not exists chest_loot text,
  add column if not exists chest_paid smallint check (chest_paid in (0, 1)),
  add column if not exists chest_d    real;

-- 확인: select column_name, data_type from information_schema.columns
--       where table_schema = 'public' and table_name = 'boat_runs' and column_name like 'chest%';
