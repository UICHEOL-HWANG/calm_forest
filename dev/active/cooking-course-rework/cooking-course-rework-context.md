# 🍳 요리 코스 개편 — 컨텍스트

**Last Updated:** 2026-09-11
**브랜치:** feat/cooking-course-rework (main 에서 분기, f0fb807)

## 핵심 파일·위치
| 무엇 | 어디 |
|---|---|
| 레시피·버프 정의 | js/game.js:216 `RECIPES` / `CAFE_PAY` / `BUFF_META` |
| 주방 로직 | js/game.js:7134~ `COOK_TIERS` `kitchenView` `kitchenStart` `kitchenFinish` |
| 3D 조리 무대 | js/game.js:6236~ `buildKitchenSet` `mgSceneStart` `mgChopFrame` `mgPotHit` `updateMgScene` |
| 미니게임 판정 | index.html:2990~3210 `MG` `startPot` `startChop` `endMinigame` |
| 미니게임 HTML/CSS | index.html:757~795(CSS) / 1272~1296(HTML) |
| 주방 메뉴판 | index.html:2931 `renderKitchen` |
| 가방 | index.html:3779 `BAG_CATS` / 3797 `renderBag` |
| 카페 손님 생성 | js/game.js:3278 `localCafeGuests` / 3295 `cafeOrders` |
| 카페 서빙 | js/game.js:3690 `serveCafeGuest` |
| 카페 홀 3D | js/game.js:3446 `buildCafeHall` / 3558 `makeCafeGuest` / 3614 `refreshCafeGuests` |
| 인벤토리 | js/game.js:718 `gameState.inventory` / 1798~ `applySave` |

## 참고할 기존 패턴
- **재질별 병합**: `spawnCafeGate()` (js/game.js:3343) — `MATS` 색 7종 + `parts` Map + 마지막에 `mergeGeos()` 한 번.
  지오메트리는 `mesh.position` 대신 `.translate()/.rotateX()` 로 미리 굽는다.
- **병합 예외**: 밤마다 `emissiveIntensity` 바뀌는 유리, 캔버스 글자판(`makeWallPlate` — PlaneGeometry 1장)
- **드로우콜 측정**: `?dbg=1&weather=clear&time=0.32` → `__tp(x,z)` → `__perf()`. time 고정 필수(해 각도가 그림자 콜을 바꿈)
- **로컬 검증 훅**: `__kitchenOpen()` `__mgStart(id)` `__mgTap()` `__mgState()` (localhost 전용)

## 함정 (반드시 지킬 것)
1. **공유 자원 ↔ dispose**: `shared()`/`mergeGeos()` 결과를 `disposeTree()` 대상에 쓰면 공유 자원이 같이 해제된다.
   → 손님을 풀링으로 바꿔 dispose 자체를 없앤 뒤에만 병합할 것. 순서 뒤바뀌면 씬이 깨진다.
2. **CDP 키 주입**: 브라우저 자동화에서 `e.code` 가 빈 값이라 Space 가 안 먹힌다. 검증은 `__mgTap()` 훅으로.
3. **rAF 스로틀**: 백그라운드 탭에서 바늘/노트가 멈춘다 → 모든 미니게임에 종료 보증 타이머 필수.
4. **재료 선소비**: `kitchenStart` 가 먼저 소비 → 중도 포기해도 낮은 등급으로 완성(재시도 악용 방지). 유지할 것.
5. **i18n " · " 글루**: 문자열을 " · " 로 이어 붙이면 번역 키가 깨진다([[beta-feedback-r3]]).
6. **모바일 3단 레이아웃**: 안내는 컨텍스트 슬롯(12,162) 또는 프롬프트 줄에만([[mobile-hud-layout]]).
7. **홀드-릴리스 입력**: `#mg-layer` 가 화면 전체 pointerdown 을 먹으므로 pointerup 도 같은 규칙으로 걸어야 한다.
   `touch-action: manipulation` 유지 — 롱프레스 컨텍스트 메뉴가 뜨면 안 됨.

## 의사결정 기록
- **A안(코스 요리) 채택** — B(종류만 확장)·C(재조정만) 기각. "다양성"과 "단계별 난이도"를 한 구조로 푸는 게 A뿐.
- **손님 = 외지 캐스트 신설** — 주민을 마을에서 빼는 안 기각(퀘스트·상점 NPC 가 사라져 진행이 막히고, 풀 5명 < 손님 4명이라 중복도 못 피함).
- **신선도 없음** — YAGNI. 관리 부담만 늘고 재미가 없음.
- **난이도는 판정창 배율로만** — 속도/단계 수를 같이 흔들면 A/B 비교가 불가능해진다.
