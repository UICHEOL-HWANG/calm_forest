# 🍎 과수원 — 단계별 체크리스트

각 태스크의 실제 코드와 검증 방법은 `docs/superpowers/plans/2026-09-17-orchard.md` 에 있다.
여기는 진행 상황만 본다.

## Phase 1 — 순수 규칙 (단독 머지 가능)

- [ ] Task 1 · 과일 표와 키 규칙 (`js/orchard.js` 신설)
- [ ] Task 2 · 시냇가 물 면제 · 수확량 · 상한
- [ ] Task 3 · 일일 정산 `settleTrees`
- [ ] Task 4 · 진행도 해금 게이트 (`js/tuning.js` 일반화)

## Phase 2 — 게임 배선

- [ ] Task 5 · 상점 묘목 5종 · 판매가 · 도감
- [ ] Task 6 · 공간 · 잠긴 입구 (**`isBlocked(22,2)` 실측 포함**)
- [ ] Task 7 · 언덕 지형 · 과일나무 조형 (**드로우콜 측정 포함**)
- [ ] Task 8 · 심기 · 물주기 · 수확 · 정산 배선
- [ ] Task 9 · 세이브 · 복원

## Phase 3 — 트래킹과 검증

- [ ] Task 10 · `orchard_events` 테이블 · API (**worker 라우트 등록 필수**)
- [ ] Task 11 · 배포 전 검증
- [ ] Task 11-5 · **배포 다음 날** BigQuery 재검증 (`kind_missing = 0`)

## 완료 판정

- `npm test` 전부 통과
- 이벤트 9종이 한 바퀴에 전부 찍힘
- `econ_logs.item` 에 과일 id 다섯 종만 보임
- 배포 다음 날 BQ 에서 `kind` 누락 0건
