# boat-lineup 컨텍스트

Last Updated: 2026-10-27 (1차 구현 완료 be3c21f3, 4271 tests)

## 핵심 파일
- 설계: docs/superpowers/specs/2026-10-27-boat-lineup-design.md (plan.md 는 같은 내용 사본)
- 시안: sims/boat-lineup-compare.html · sims/boat-redesign-compare.html · sims/boat-upgrade-compare.html(1차 시안)
- 조형 소스: sims/boat-models.js → 구현 때 js/boat/models.js 로 이식
- 현재 코드: js/spaces/river.js(런 루프·buildCourse·강화 상점), js/data/places.js(BOAT_* 상수·RIVER_OBS·RIVER_PICKS·BOAT_UPGRADES), js/game.js(gameState.boat 기본값·applySave 복원 한 줄), js/supabase-client.js sendBoatRun
- DB: boat_runs(migrate_boat_runs*.sql), leaderboard 함수 boat 보드(migrate_leaderboard.sql), econ_logs.source CHECK(migrate_struct_04_checks.sql)

## 결정
- 배 9척: ferry · lotus · raft · koi · catamaran · paper · walnut · lotuslamp · gourd (사용자 선택, 금붕어·나무조각 잉어·작은 집배 탈락)
- 새 배는 나룻배 선체 재사용 금지, 형태부터 새로
- 해금 = 별 + 강 재료 + 실력 조건, 전부 ⭐19,700 → 매일 3판 약 3달 · 1판 약 9달 (사용자 승인)
- 급류 보상은 별이 아니라 재료 ×1.5 (별 배율 얹으면 46일로 단축되는 문제)
- 기존 강화 up.oar/hull/lamp → 부품 이전, up 필드는 보존

## 의존성·순서
1. 마이그레이션(boat_runs 컬럼·CHECK·리더보드 코스 필터) 먼저 운영 DB 적용 (pg8000 풀러 직접 실행)
2. 1차 구현 → 5곳 동시 배포 → 공지는 토스 출시 후
3. 출시 2주 뒤 boat_unlock 분포 확인

## 데이터 근거 (2026-10-27 조회)
boat_runs 143판/50명 · 강화 0개 완주 36.9% vs 1개+ 100% · 충돌 40% 1구간 · 완주 1판 ⭐70 · 🪷0.92 🪵0.78 🐚0.84 🌕0.55 · 보유 별 중앙값 66 최대 1,518 · 코인 하루 수입 중앙값 409

## 1차 계획에서 정한 것 (2026-10-27)
- 계획: docs/superpowers/plans/2026-10-27-boat-lineup-stage1.md
- Node 테스트 환경엔 three 가 없다 → 강 상수를 js/boat/consts.js 로 옮기고 places.js 는 재수출
- econ_logs.source 는 CHECK 없음(열린 집합) → 마이그레이션 불필요
- 리더보드 최신 정의는 migrate_leaderboard_sled.sql. 적용 전 운영 pg_get_functiondef 와 diff
- 급류 재료 1.5배는 정산 때만(matMul). 코스 수집물 수는 잔잔과 비슷하게(pickP 0.16)
- 스킬 키 F (Q·E 는 카메라 회전)
- 1차 부품 효과는 쇄빙·순풍만, 뱃종은 2차. 나룻배 등불은 밤에 누구에게나
- 워크트리는 npm ci 후 기준선 4,127 테스트 통과

## 1차 구현 결과 (2026-10-27, be3c21f3)
- 공정성 조정값: lotus steer 1.3 hitR 0.6 · raft hitR 1.4 · 봇 LOOK 20. 비단잉어: 사용자가 잠수 대기 12초를 선택(지속 1.2초 유지)해 steer 0.68→0.88, hitR 1.3→1.42 로 재조정(0.9 는 급류 +0.10 경계라 여유 있는 0.88 선택, 급류 +0.06). steer 0.9 이상에서 공정성을 통과하려면 hitR 1.42 이상 필요(hitR 1.1 이하는 steer 0.7 이상 전부 급류 완주율 초과). 뗏목 램프 4→3 은 미결
- 급류 starP 0.47 · pickP 0.16 · 섬/폭포 ±10m 별·수집물 제거 · 상자도 폭포에서 10m 밀어냄
- 코스·능력 규칙을 바꾸면 tests/boat-balance.test.mjs 공정성 수치 재확인 필수(여유 좁음: 뗏목 잔잔 별 +13% / 한도 15%)
- 리더보드 API BOARDS 에 boat_rapid 추가 → Worker 재배포 필요
- 세이브 v>=2 는 이전 생략(v3 세이브가 와도 1차 클라가 별 300 재환급 안 함)
- 헤드리스 검증: tools/store-shots/cdp.mjs 기반 스크립트(배마다 한 판·결과 카드·창고 캡처). 미리보기 창이 뒤에 있으면 rAF 1fps라 헤드리스 필수
