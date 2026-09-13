# Context — farm-stage (🌾 밭 단계 증축, 논밭 확장 2단계)

Last Updated: 2026-09-13 (검증 완료, 리뷰 대기)

## 핵심 파일

| 위치 | 무엇 |
|---|---|
| `docs/superpowers/specs/2026-09-12-farm-expansion-design.md` §1 | 스펙 — 단계 표·해금 UI·손댈 곳 |
| `docs/superpowers/plans/2026-09-13-farm-stage.md` | 이 태스크 계획서(Task 1~4) |
| `js/farm-stage.js` | **신규** 순수 규칙 — FARM_STAGES·farmHalfOf·farmStageInfo·fencePosts·perimeterTrees |
| `tests/farm-stage.test.mjs` | **신규** 위 모듈 테스트 |
| `js/game.js:288` | `FARM_HALF = 6` → `farmHalf()` 로 교체(9곳) |
| `js/game.js:8062` | `buildFarm()` → `rebuildFarm(silent)` + 📐측량 말뚝 |
| `js/game.js:3088` | `coopInteract()` — 말뚝 상호작용이 따르는 문법 |
| `js/game.js:8398` | 텃밭 근접 판정 브랜치(출구 + 말뚝) |
| `js/game.js:9704` | `interact()` 디스패치 |
| `js/game.js:2046` | `applySave` — farm.stage 복원(밭 복원보다 먼저) |
| `js/first-loop.js:18` | `DEV_PARAMS` — farmstage·farmmax 등록 |

## 의사결정
- 확인/모달 없이 닭장 문법(프롬프트에 비용 표시 → 액션 즉시 건설). 집 증축 메뉴는 쓰지 않음(근접 상호작용 원칙).
- 말뚝 위치 (-2.2, H-0.2) — 출구 팻말(+1.9)의 거울. 울타리가 커지면 말뚝도 따라감.
- 흙·작물 인스턴스는 plots 기반 동적 버퍼라 half 와 무관 — 손대지 않음.
- 배지·progressScore 는 스펙에 없어 넣지 않음(YAGNI).
- 미니맵 죽은 허수아비 마크(FARM_HALF 코너)는 같이 삭제.

## 의존성
- 1단계 인스턴싱(main e0953da)·외관 A안(7d29b5f) 위에 얹힘.
- 다음: 스펙 §9-3 고급 작물. 노동자 상한은 FARM_STAGES[].workers 로 이미 정의.

## 브랜치
`feat/farm-stage` (main c5ff49e 에서 분기)
