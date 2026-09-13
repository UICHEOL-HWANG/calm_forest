# Context — farm-stage (🌾 밭 단계 증축, 논밭 확장 2단계)

Last Updated: 2026-09-14 (2~7단계 전부 구현·검증 — 문구 검수 후 배포 판단)

## 핵심 파일

| 위치 | 무엇 |
|---|---|
| `docs/superpowers/specs/2026-09-12-farm-expansion-design.md` §1 | 스펙 — 단계 표·해금 UI·손댈 곳 |
| `docs/superpowers/plans/2026-09-13-farm-stage.md` | 이 태스크 계획서(Task 1~4) |
| `js/farm-stage.js` | **신규** 순수 규칙 — FARM_STAGES·farmHalfOf·farmStageInfo·fencePosts·perimeterTrees |
| `tests/farm-stage.test.mjs` | **신규** 위 모듈 테스트 |
| `js/game.js:288` | `FARM_HALF = 6` → `farmHalf()` 로 교체(9곳) |
| `js/game.js` `rebuildFarm()` | 울타리·나무·문 + 📐측량소 마당(makeSurveyOffice: 사무소·제도 탁자·🔧자재 작업대·서쪽 문 콜라이더) |
| `js/farm-building.js` | 밭 시설 7종 규칙(발자국·스냅·배치 판정 · 밭∪마당 · 반경/배율 상수) |
| `js/farm-worker.js` | 일꾼 규칙(직군·등급·기술·월급·작업 우선순위·오프라인 스텝) |
| `js/game.js` `updateWorkers/workerSteps/hireWorker` | 일꾼 3D·FSM·정산·고용 창 |
| `index.html` `#hire-modal` / `openHire` | 📋 고용 UI |
| `js/game.js:3088` | `coopInteract()` — 말뚝 상호작용이 따르는 문법 |
| `js/game.js:8398` | 텃밭 근접 판정 브랜치(출구 + 말뚝) |
| `js/game.js:9704` | `interact()` 디스패치 |
| `js/game.js:2046` | `applySave` — farm.stage 복원(밭 복원보다 먼저) |
| `js/first-loop.js:18` | `DEV_PARAMS` — farmstage·farmmax 등록 |

## 의사결정
- 확인/모달 없이 닭장 문법(프롬프트에 비용 표시 → 액션 즉시 건설). 집 증축 메뉴는 쓰지 않음(근접 상호작용 원칙).
- 📐증축 창구는 **울타리 밖 서쪽 마당**(사용자 결정 2026-09-13: "논밭은 공간이 제일 중요"). 말뚝 팻말은 폐기, 측량소 건물로 교체. 마당 규칙(YARD_D/YARD_HZ·건물·탁자·작업대 자리)은 js/farm-stage.js.
- 밭 시설 주문은 마당의 🔧자재 작업대 — 마을 작업대 메뉴를 🌷야외 탭으로 연다(`ui.openCook('out')`).
- 흙·작물 인스턴스는 plots 기반 동적 버퍼라 half 와 무관 — 손대지 않음.
- 배지·progressScore 는 스펙에 없어 넣지 않음(YAGNI).
- 미니맵 죽은 허수아비 마크(FARM_HALF 코너)는 같이 삭제.

## 의존성
- 1단계 인스턴싱(main e0953da)·외관 A안(7d29b5f) 위에 얹힘.
- 다음: 스펙 §9-3 고급 작물. 노동자 상한은 FARM_STAGES[].workers 로 이미 정의.

## 브랜치
`feat/farm-stage` (main c5ff49e 에서 분기)
