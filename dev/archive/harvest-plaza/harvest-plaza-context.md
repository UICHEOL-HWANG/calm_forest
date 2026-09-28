# harvest-plaza context
Last Updated: 2026-09-27 (Task 12 통합 검증)

- 스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
- 계획: docs/superpowers/plans/2026-09-27-harvest-plaza.md
- 브랜치: feat/harvest-plaza (main 49bc40c 분기)
- 핵심 결정: 영구 광장 · 위치 (23,-4) · 단계형 무조건 완공 · 하루 상한 30 · RPC 원장 · 좌판2+등급2 · 장식은 🧺 보관함 지급
- 연결 규칙: game.js 에는 연결 줄만(≤14, tests/plaza-wiring.test.mjs)
- 디자인 게이트: 3D·UI·문구는 시안 3개+ 캡처 비교 후 사용자 선택
- SQL: sql/migrations/migrate_plaza.sql → sql/tests/plaza_selftest.sql 적용됨(Task 8~9 에서 dev-plaza 시즌으로 실서버 검증)

## Task 12 통합 검증 (2026-09-27, HEAD 9e7067c)

- 테스트: `npm test` 1253/1253 · `node --check` js/·plaza/·spaces/·data/·functions/api 전부 통과 · plaza-wiring 3/3 · `grep -ci plaza js/game.js` = 12 (≤14)
- i18n: 빠짐 후보 92건(기준 49bc40c 90건) — 늘어난 2건은 `[plaza] {0} 실패:`/`예외:` console.warn(개발 로그, 다른 `[Supabase 폴백]` 로그와 같은 부류).
  ⚠️ scripts/i18n_check.mjs 대상에 js/plaza/ 가 없다 → 임시로 넣어 돌려 js/plaza 33/33(copy 31·ui 2) + data/plaza 12/12 커버 확인.
- 스모크(시즌 전, `?plaza` 없음): 49bc40c 두 번 vs 이 브랜치 → 11공간 calls·meshes 동일. 다른 값 5건:
  `state.plaza.*` 2건(새 세이브 칸 — 의도) · 밤 반딧불 계곡 `SphereGeometry|MeshBasicMaterial` 19→17(반딧불 1마리 = 코어+헤일로 2메시).
  반딧불은 1.2~3.6초마다 실시간으로 하나씩 피어나 캡처 시각에 따라 개수가 달라진다 — 같은 조건 단독 실행(기준·후보 병렬)에선 둘 다 6마리로 같았다 → 부팅 시간 차이로 본다(월드 차이 아님).
- 드로우콜(같은 페이지 광장 그룹 hide/show, `?dbg=1&weather=clear&time=0.32&plaza=N`, 3회 모두 같은 값):

| 단계 | `__tp(23,1)` 켬/끔 | 증가 | 스폰 `__tp(0,0)` 켬/끔 | 증가 |
|---|---|---|---|---|
| 0 | 379/379 | 0 | 586/586 | 0 |
| 1 | 395/389 | +6 | 588/583 | +5 |
| 2 | 395/388 | +7 | 573/568 | +5 |
| 3 | 397/390 | +7 | 580/575 | +5 |
| 4 | 397/391 | +6 | 584/579 | +5 |

  광장+돌길 증가분 최대 +7 (예산 ≤15). 페이지 로드마다 절대값은 ±15 흔들린다(기준 49bc40c 같은 URL: 392 / 576).
- 캡처 보드: `.scratch/plaza/final-board.png` (PC 1280×800 + 모바일 390×844 × 11장: 시작·돌길 중간·1~4단계 낮·4단계 밤·기부/좌판/명판 모달·올빼미 착지)

## 남은 운영 작업
- [ ] (사용자) 운영 DB 테스트 데이터 정리 SQL — dev-plaza 기부 5건·익명 테스트 계정 7개(game_saves 포함, progress.md Task 8·9 목록)
- [ ] 브랜치 기준 49bc40c(DDA 커밋)가 main(6513617)에 없다. 2026-09-27 사용자 결정은 "DDA 와 함께 병합(리베이스 없음)" — 병합 직전에 그대로인지 한 번 더 확인. 따로 가려면 `git rebase --onto main 49bc40c`
- [ ] 최종 리뷰 수정 묶음(디버그 단계 경제 가드·조회 실패 백오프·시즌 전 지도 라벨 숨김(game.js 5045)·modalKind 정리) 반영 여부 확인
- [ ] 배포 4곳: 웹 → 토스 `bundle_upload(memo)` → itch zip → 안드로이드 versionCode+1 (10/9 이전 라이브, 토스 검수 기간 역산)
- [ ] 공지: 토스 출시 후 notices_admin.html
- [ ] 출시 다음 날 BigQuery 에서 plaza_* 이벤트 10종 적재·파라미터 재검증
