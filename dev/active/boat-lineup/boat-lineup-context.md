# boat-lineup 컨텍스트

Last Updated: 2026-10-27 (1차 계획 작성)

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
