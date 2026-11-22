# 식당 튀김기·새 메뉴·별 5·6 Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** 별 5·6 단계와 튀김 메뉴 3개(새우·오징어·채소튀김), 튀김기·반죽 그릇을 더한다.

**Spec:** `docs/superpowers/specs/2026-11-21-restaurant-fryer-star56-design.md`

## Global Constraints

- 코드·CSS·테스트 주석 금지. 테스트 먼저. 불변 갱신. 기존 패턴 유지.
- 커밋은 사용자 요청 시에만, 푸시·병합 금지.
- 새 UI 문구는 사용자 검수 후에만 넣는다. 이 계획의 Task 1·2는 화면 문구를 만들지 않는다.
- 테스트: `node --test tests/restaurant-*.test.mjs`, 끝에 전체 `node --test tests/*.test.mjs`(@capacitor/app 환경 실패 1건 허용).

## 결정

- 주방 배치 시안 B(2026-11-21): 가운데 조리대 섬. 식당 로컬 좌표로 반죽 그릇 (3.5, 0.9), 튀김기 1 (4.45, 0.9), 튀김기 2 (5.4, 0.9). 새 재료 상자: 새우 (1.6, 3.55), 오징어 (2.5, 3.55), 채소 (4.4, 3.55).

---

### Task 1: 메뉴·별 5·6·조리대 데이터와 코인

**Files:** `js/restaurant/data.js`, `js/restaurant/rules.js`, `js/restaurant/session.js`, tests (새 `tests/restaurant-fry.test.mjs` + 깨지는 기존 테스트 수정)

- [ ] `MENU_KEYS` 끝에 `'shrimpfry', 'squidfry', 'vegfry'`. `MENU`: `shrimpfry: { ico: '🍤', from: 'shrimp', fry: true }`, `squidfry: { ico: '🦑', from: 'squid', fry: true }`, `vegfry: { ico: '🥬', from: 'veg', fry: true }`.
- [ ] `export const FRY_COIN_MUL = 1.5`.
- [ ] `STAR[5] = { tables: 4, menus: ['grilled', 'riceball', 'soup', 'shrimpfry', 'squidfry'], pans: 2, pot: true, staff: true, fryers: 1, iv: [9, 6.5] }`, `STAR[6] = { tables: 4, menus: [...STAR[5].menus, 'vegfry'], pans: 2, pot: true, staff: true, fryers: 2, iv: [9, 6] }`.
- [ ] `STAR_UP[5] = { rating: 320, served: { soup: 15 }, coins: 400 }`, `STAR_UP[6] = { rating: 480, served: { shrimpfry: 10 }, coins: 600 }`.
- [ ] `HALL.stations` 에 추가: `{ id: 'crate_shrimp', kind: 'crate', give: 'shrimp', x: 1.6, z: 3.55, need: 5 }`, `{ id: 'crate_squid', kind: 'crate', give: 'squid', x: 2.5, z: 3.55, need: 5 }`, `{ id: 'crate_veg', kind: 'crate', give: 'veg', x: 4.4, z: 3.55, need: 6 }`, `{ id: 'bowl', kind: 'bowl', x: 3.5, z: 0.9, need: 5 }`, `{ id: 'fryer0', kind: 'fryer', x: 4.45, z: 0.9, need: 5 }`, `{ id: 'fryer1', kind: 'fryer', x: 5.4, z: 0.9, need: 6 }`. 쓰레기통 (3.4, 3.55) 과 새 상자 간격이 겹치지 않는지 테스트(중심 거리 ≥ 0.85).
- [ ] `sanitizeRestaurant`: 별 상한을 `4` 고정 대신 `STAR` 의 가장 큰 키로. 옛 세이브(`served` 에 새 키 없음)가 0 으로 채워지는지 테스트.
- [ ] 다른 곳의 "별 4가 최고" 가정(`4` 하드코딩, `STAR_UP[rest.star + 1]` 없을 때 처리 등)을 `git grep` 으로 찾아 고친다. 찾은 곳은 리포트에 적는다.
- [ ] `session.js` `serve`: 접시 코인 = `stars * COIN_PER_STAR * (특선 ? SPECIAL_COIN_MUL : 1) * (MENU[menu].fry ? FRY_COIN_MUL : 1)` 을 `Math.round`. 세트 합산은 지금 그대로.
- [ ] `BOARD_ROW_Y` 는 이번 Task 에서 건드리지 않는다. `tests/restaurant-special.test.mjs` 의 `Object.keys(BOARD_ROW_Y)` 와 `MENU_KEYS` 비교는 `MENU_KEYS.slice(0, 3)` 비교로 바꾼다(칠판 줄은 화면 Task 에서 늘린다).
- [ ] 튀김 메뉴 조리 과정(반죽·튀김기 동작)은 Task 2. 이 Task 에서는 `stationContext`/`actAt` 이 `bowl`·`fryer` 종류를 만나도 아무것도 하지 않음(null)을 확인하는 테스트만.
- [ ] 테스트: 별 5·6 데이터, 승급 조건(평점·접시), 별 5 손님이 튀김 메뉴도 시킴(재고 있을 때), 재고 없으면 안 시킴, 튀김 코인 1.5배(반올림), 특선·세트와 겹칠 때, sanitize 상한·옛 세이브.

### Task 2: 튀김 조리 규칙 (session·rules)

결정(2026-11-21): 불 맞추기는 **자동 바늘에 탭**. 바늘이 저절로 오르내리고 초록 칸일 때 한 번 누르면 고정.

**Files:** `js/restaurant/data.js`, `js/restaurant/rules.js`, `js/restaurant/session.js`, Test `tests/restaurant-fry.test.mjs`

- [ ] data: `export const FRY = { swing: 1.6, zone: [0.58, 0.82], cook: 4.5, win: 1.8, burn: 2.5, bubbles: [1.2, 2.8], bubbleWin: 0.8 }`, `export const BATTER_TAPS = 2`, `export const FRY_OF = { shrimp: 'shrimpfry', squid: 'squidfry', veg: 'vegfry' }`.
- [ ] rules (순수 함수):
  - `chopDone(c, taps = CHOP_TAPS)`, `chopTap(c, now, taps = CHOP_TAPS)` 로 목표 탭 수를 받게(기존 호출은 그대로 동작).
  - `fryNeedle(t)`: 0..1 삼각파, 주기 `FRY.swing`, `t=0` 에서 0.
  - `fryZone(win)`: 초록 칸. 가운데 `(0.58+0.82)/2`, 폭 `(0.82-0.58) * win`.
  - `fryHeatOk(t, win)`: `fryNeedle(t)` 가 `fryZone(win)` 안이면 true.
  - `fryBubble(t)`: 튀기는 시간 t 에서 열린 거품 번호(0 또는 1) 또는 -1. 거품 i 는 `[FRY.bubbles[i], FRY.bubbles[i] + FRY.bubbleWin)`.
  - `fryState(t, win)`: `'raw'`(t < cook) / `'perfect'`(< cook + FRY.win*win) / `'over'`(< cook + FRY.win*win + burn) / `'burnt'`.
- [ ] session:
  - `DISH` 는 `MENU_KEYS` 전체. `RAW` 에 shrimp·squid·veg 추가. 반죽 입은 재료 kind 는 `shrimpBat`·`squidBat`·`vegBat`.
  - 반죽 그릇(`kind: 'bowl'`): 빈손 아님 + 들고 있는 것이 shrimp/squid/veg(접시 안 담은) + 그릇 비었음 → `put`. 그릇에 재료 있고 `chopDone(st.chop, BATTER_TAPS)` 아님 + 빈손 → `do: 'batter'`(chopTap 를 BATTER_TAPS 로). 다 되면 아이템이 `{ kind: '<재료>Bat', q: 1 }`. 다 된 것 + 빈손 → `pick`.
  - 튀김기(`kind: 'fryer'`): 들고 있는 것이 `*Bat` + 비었음 → `put`, 상태 `{ phase: 'heat', h0: S.time, heat: null, shakes: [false, false], t: 0 }`. `phase === 'heat'` → `do: 'heat'`(손에 뭘 들고 있어도 됨): `heat = fryHeatOk(S.time - h0, S.dda.win)`, `phase = 'fry'`, `t = 0`. `phase === 'fry'` 동안 매 틱 `t += dt`. 거품이 열려 있고 그 거품을 아직 안 흔들었으면 → `do: 'shake'`(손 상관없음) → `shakes[i] = true`. 아니고 `t >= FRY.cook` + 빈손 → `pickCook`. 결과: 탔으면 `{ kind: 'burnt' }`, 아니면 `{ kind: FRY_OF[재료], q: (heat && shakes 둘 다 && fryState === 'perfect') ? 1 : 0.75 }`.
  - 튀김기·그릇은 `isActive`(need) 로 별 5·6 에서만.
  - 반환 이벤트: 기존 패턴(`put`, `chop` 류, `cooked`)을 따르고 새 타입이 필요하면 `heat`(ok), `shake`(i) 를 낸다.
  - `stationView`: 그릇은 썰기와 같은 모양 `{ kind: 'chop', taps, beat, need: BATTER_TAPS }`. 튀김기 heat 단계 `{ kind: 'fryHeat', p: fryNeedle, zone }`, fry 단계 `{ kind: 'gauge', p, zone, state, perfect, bubble: 열린 거품 번호 또는 -1 }`.
- [ ] 테스트: 바늘 삼각파·초록 칸 판정, 거품 창, fryState 경계, 그릇 2탭 → Bat, 튀김기 전체 흐름(heat 성공·실패, 흔들기 0·1·2번, 꺼내는 시점별 품질, 탐), 별 4에서 그릇·튀김기 비활성, 접시 담기·내가기까지 한 접시 끝까지(코인 1.5배).
- [ ] 화면 문구(`LABEL`, `NEXT_TEXT`, 메뉴 카드)는 Task 3. 새 `do` 값(`batter`, `heat`, `shake`)에 `LABEL` 이 없어 프롬프트가 비는 것은 그대로 둔다.

### Task 3: 화면·조형·문구·아이콘 (시안·문구 검수 후 채움)

- 튀김기 표시: 시안 A 확정(2026-11-21). 팬·냄비와 같은 가로 막대. 불 맞추기는 🔥 + 바늘 막대(초록 칸), 튀기는 중은 🫧 + 금빛 막대 + 흔들기 점 2개. 튀김기 두 대 표시는 위아래로 엇갈려 겹치지 않게.
- 화면 이모지는 모두 아이콘으로(사용자 지시). 확인 결과 🔥·🥣·🍤·✨ 는 아이콘 있음, 🫧·🦐·🦑·🥬 는 없음 → 토스페이스 원본 4개 필요(내려받기 허락 대기).
- 아이콘: 🫧 u1FAE7·🦐 u1F990·🦑 u1F991·🥬 u1F96C 토스페이스 원본 추가 완료(`tools/icons/build-game-icons.mjs` `TOSSFACE_FILES`, 모듈 재생성).
- 문구: 아래 확정본(2026-11-21 사용자 "문구 그대로").

**확정 문구 (그대로 쓴다)**
- `LABEL`: `batter: '🥣 반죽 묻히기'`, `heat: '🔥 불 맞추기'`, `shake: '🫧 흔들기'`
- `NEXT_TEXT`: `crate_shrimp: '🦐 상자에서 새우를 꺼내요'`, `crate_squid: '🦑 상자에서 오징어를 꺼내요'`, `crate_veg: '🥬 상자에서 채소를 꺼내요'`, `bowlPut: '🥣 반죽 그릇에 올려요'`, `bowlBusy: '🥣 반죽 그릇이 비면 올려요'`, `bowlTap: '🥣 박자에 맞춰 두 번 눌러요'`, `bowlPick: '🥣 반죽 묻힌 걸 들어요'`, `fryerPut: '🍤 튀김기에 넣어요'`, `fryerBusy: '🍤 튀김기가 비면 넣어요'`, `fryHeat: '🔥 바늘이 초록 칸일 때 눌러요'`, `fryShake: '🫧 거품이 오르면 눌러서 흔들어요'`, `fryWait: '🍤 금빛이 되면 꺼내요'`, `fryTake: '🍤 금빛이에요, 꺼내요'`
- `DISH_NAME`: `shrimpfry: '🍤 새우튀김'`, `squidfry: '🦑 오징어튀김'`, `vegfry: '🥬 채소튀김'`
- 메뉴 카드 팁(별 5 이상, 튀김 메뉴가 있을 때만 세 번째 줄): `'🔥 바늘이 초록 칸일 때 불을 맞춰요'`
- `STOCK_COPY.items`: `shrimp: { ico: '🦐', name: '새우', where: '포구 섬 가까운 바다에서 낚아 와요' }`, `squid: { ico: '🦑', name: '오징어', where: '포구 섬 먼바다나 밤바다에서 낚아 와요' }`, `veg: { ico: '🥬', name: '채소', where: '포구 섬 시장에서 사 와요' }`
- 영어(`js/i18n-en.js`)에 위 한국어 문구 전부 짝을 넣는다(이모지 뺀 글자 부분이 키가 되는 기존 방식 확인 후 그대로).

**Task 3 할 일**
- [ ] `hud.js`: 위 문구, `menuView` 의 튀김 메뉴(RECIPE), 팁 줄, `station()` 에 `fryHeat` 뷰(시안 A: 🔥 아이콘 + 기존 `.gauge` 막대, 초록 `em` 과 흰 바늘 `s`), 튀기는 중 `gauge` 뷰에 `bubble >= 0` 이면 🫧 아이콘을 막대 위에 띄우고(통통 튀는 애니메이션) 흔들기 점 2개(성공 수)를 막대 아래에. `stationView` 가 흔들기 성공 수를 주지 않으면 session 에 `shaken: shakes.filter(Boolean).length` 를 더한다.
- [ ] 튀김기 두 대 표시 겹침 방지: `fryer1` 표시는 `fryer0` 보다 위로 엇갈리게(예: y 를 화면 기준 46px 위). 다른 조리대 표시 위치는 그대로.
- [ ] `next-step.js`: `RECIPE` 튀김 3종(`['🦐','🥣','🔥','🍤','🍽️','🙋']` 꼴, 재료 아이콘만 바꿈), `USES`, `workStep`/`readyStep`/`heldStep` 에 반죽 그릇·튀김기 단계와 위 `NEXT_TEXT`. 상자 안내는 메뉴 재료의 상자로.
- [ ] `data.js` `BOARD_ROW_Y` 를 6줄로: 칠판 판(높이 0.88, 가운데 1.12) 안에서 위에서부터 `grilled 1.31, riceball 1.2, soup 1.09, shrimpfry 0.98, squidfry 0.87, vegfry 0.76`. `hall.js` 칠판은 지금 별에서 열린 메뉴 줄만 그리거나 6줄 모두 그리되 열린 메뉴만 밝게(둘 중 단순한 쪽). 특선 링·말풍선(`special-board.js`)이 새 줄 높이에 맞는지 미리보기 확인. `tests/restaurant-special.test.mjs` 의 `BOARD_ROW_Y` 키 비교를 다시 `MENU_KEYS` 전체로.
- [ ] `hall.js`: 새 상자 3개는 재료 모양(기존 생선·쌀 상자처럼 내용물 표현, 새우·오징어·채소 색), 반죽 그릇(크림색 그릇 + 노란 반죽 + 거품기), 튀김기(스테인리스 몸통 + 금빛 기름 + 바구니 손잡이) — `sims/restaurant-fryer/models.js` 의 `bowl`, `fryer` 모양을 기존 hall 부품 방식(paint-merge, put/box/cyl)으로 옮긴다. B안 섬 조리대로 보이게 그릇·튀김기 받침이 이어지도록. `food()` 에 `*Bat`(반죽 묻은 크림색)과 튀김 3종(금빛)의 손에 든/조리대 위 모양.
- [ ] `runtime.js`: `heat`(ok면 ✨ 아니면 💨), `shake`(🫧) 팝. 그릇 `chop` 은 `onChopStart`(썰기 첫 안내 토스트)를 부르지 않게.
- [ ] 충돌: 새 조리대(섬·상자)가 `hallSolids`/`syncSolids` 에서 별에 맞게 막히는지 확인하고 빠졌으면 추가.
- [ ] 테스트: 문구 상수(확정본과 정확히 같은지), `menuView(5)` 가 오류 없이 5줄, 재고 부족 줄에 새 재료, 다음 단계 안내(튀김 각 단계), `BOARD_ROW_Y` 6줄, `ticketHtml` 튀김 아이콘, i18n 짝.
