# observatory-constellations — context
Last Updated: 2026-10-05

## 사용자 결정
- 별자리: 해금형 진행 + 별자리 도감 (2026-10-05)
- 데이터: GA4 + Supabase star_runs
- 같은 날 고친 것(main, 미푸시): 0609cf0 숙임 방향 · 43a2398 숙임 0.28/서는 자리 0.75·천문대 x 22→25 · b8439b8 계단 충돌

## 핵심 파일
- js/observatory/rhythm.js — DIPPER/ORDER 하드코딩(일반화 대상)
- js/observatory/render.js — DIPPER/ORDER 직접 import (50,203,210,232,239,253), 스프라이트 캐시 7개 가정(172)
- js/observatory/star-run.js — 정산·하루 1회 보상(starDay)·GA4 star_result
- js/observatory/ui.js — 렌즈 오버레이·abandon(86)
- js/spaces/observatory.js — star_start(96)·rollDifficulty
- js/difficulty.js:84 — star 점수/14 정규화
- js/game.js:969 starDay 기본값 · :2560 applySave 복원 (필드는 손으로 복원해야 남는다)
- js/supabase-client.js:690 sendBoatRun 패턴 · js/config.js:55 테이블명
- sql/migrations/migrate_boat_runs.sql · migrate_struct_01_rls_perf.sql:67 RLS 스타일 · migrate_struct_04_checks.sql:42 platform check
- sql/analytics/difficulty_probe.sql §1·§6·§7

## 함정
- star_runs 는 고정 컬럼 insert → DDL 먼저 적용, 그 다음 클라이언트 배포
- tests/kst-date.test.mjs 가 run_date: kstDate() 개수를 센다(2→3)
- DEX 에 넣지 않는다(DEX_TOTAL·박물관 층 테스트·save-migrate 점수 영향)
- 사용자 플레이 탭(localhost)과 세션 섞지 말 것 → 검증은 127.0.0.1 게스트 탭

## 2026-10-05 시안 결정 (look/compare.png)
- 고르기 UI: **C 별자리 수첩 그리드**(도감 겸용) — 카드 누르면 렌즈
- 목록·순서 확정: 북두칠성7 → 카시오페이아4(tempo .8) → 페가수스6 → 사자9 → 오리온9(.9) → 전갈11
- 문구 묶음 1: 제목 '🔭 별자리 수첩' · 잠김 '앞 별자리를 이으면 열려요' · 해금 '✨ 새 별자리가 보여요 · {이름}' · 완주 '{이름}을 그렸어요!' · 첫 클리어 '처음 그렸어요 +30🪙'
