# 🧰 나룻배 보물상자 — Context

**Last Updated:** 2026-09-29

## 결정
- 세 기능(보물상자·요리 심사·사공 퀴즈) 중 가장 가벼워 **첫 번째**. 디자인은 사용자 검토 필수, 트래킹은 체크리스트 전 항목.
- 코인 금지 — 나룻배는 원래 코인을 안 준다(`endBoatRun` 주석: 인플레 방지).
- 하루 1개, 건질 때까지 그날 런마다(최대 `BOAT_RUNS_PER_DAY = 3`). `gameState.boat.chestDate` 로 판정.
- 상자 삽입은 `buildCourse` 루프 **뒤**에서만 난수 소비 → 상자 없는 날 코스는 기존과 동일.

## 승인 대기 (Task 1 에서 채움)
- 외형: ✅ **A2 확정(2026-09-29)** — 나무 궤짝+금테, 크기 1.25배, 🌙 밤엔 금테·자물쇠 발광(emissive 0.55)+부드러운 물빛(방사형 그라데이션, 블룸 임계 이하), 작은 부표(0.75배·채도 낮춘 빨강·깃발 없음)를 옆에 밧줄로. 시안 `sims/boat-chest-sim.html?set=A`
  - 기각: B(부표가 궤짝보다 먼저 보임), C(멀리서 소풍 바구니로 읽힘), A3(게임 시점에서 부표가 가려 안 보임)
- 건지는 연출: ✅ **확정(2026-09-29)** — 달리는 중엔 ①(상자 쏙 + 반짝이 + 배 앞 10 글자, 시야 방해 없음), **결과 카드에서** 상자를 열어 보상 3D 모형을 보여 준다. ②③을 달리는 중에 쓰면 3구간(최고 속도)에서 1.3초간 시야 가림 → 충돌 유발이라 기각
- 보상 표시: ✅ **이모지 대신 로우폴리 3D 모형 6종**(`itemMesh` in 시안) — 로우폴리 화면에서 평면 이모지가 튄다(사용자). 떠오르는 글자에도 이모지 없음
- 결과 카드 → **미정**
- 보상표 수치 → **미정** (초안: 사과묘목10·배묘목5·미끼25·비료20·별조각25·집색15)
- 지급 규칙 always / clear_only → **미정**
- 위치 3구간 70~85% / 2구간 → **미정**

## 핵심 파일 (조사 결과)
- `js/spaces/river.js` — `startBoatRun` 332, `buildCourse` 249, `makeRiverMesh` 283, `endBoatRun` 407, `updateRiverObjects` 585(줍기 612)
- `js/data/places.js` — `RIVER`(157) `RIVER_LEN 620`(163) `BOAT_RUNS_PER_DAY 3`(165) `RIVER_PICKS`(182) `BOAT_UPGRADES`(190)
- `js/game.js` — 런 상태 `boat`(450), 세이브 기본값(970), `giveReward`(코인만 econ_logs), `tryUnlockDrop`(1370), `showCatchItem`(5696), `spawnFloatText`(6630)
- `js/supabase-client.js:644` `sendBoatRun` → `boat_runs` **고정 컬럼 insert**(모르는 필드 = 행 실패)
- `index.html` `showBoatResult`, 재도전 버튼 5020

## 함정
- `econ_logs` 는 코인 전용 → 상자 지급 원장은 `boat_runs.chest_loot/chest_paid`.
- 마이그레이션을 클라이언트보다 **먼저** 적용. Supabase MCP 는 읽기 전용.
- `boat_runs` 는 dev 세션에서 안 쓴다(`IS_DEV_SESSION`) → 트래킹 실측은 trackEvent 가로채기로.
- 맨 localhost 는 dev 세션이 아니다(프로덕션 기록됨) — 검증 땐 dev 파라미터를 붙인다.
