# 식당 오늘의 특선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 하루 한 메뉴가 특선이 되어 코인 두 배·주문 확률 절반, 식당 칠판과 영업 시작 안내로 알린다.

**Architecture:** 특선 계산은 순수 함수 파일 `js/restaurant/special.js`. 세이브 `restaurant.special = { date, menu }`. 입장 때 `js/spaces/restaurant.js`가 정하고, `sessionOpts`로 세션에 넘긴다. 화면(칠판·안내)은 시안 선택 뒤 Task 4.

**Spec:** `docs/superpowers/specs/2026-11-21-restaurant-daily-special-design.md`

## Global Constraints

- 코드·CSS·테스트 주석 금지. 테스트 먼저. 불변 갱신. 기존 패턴 유지.
- 새 GA4 이벤트·파라미터 없음.
- 연습판(`first`)에는 특선 미적용.
- 커밋은 사용자 요청 시에만, 푸시·병합 금지.
- 테스트: `node --test tests/restaurant-*.test.mjs`, 끝에 전체 `node --test tests/*.test.mjs`(@capacitor/app 환경 실패 1건 허용).

---

### Task 1: special.js

**Files:** Create `js/restaurant/special.js`, Test `tests/restaurant-special.test.mjs`

**Produces:** `SPECIAL_ODDS = 0.5`, `SPECIAL_COIN_MUL = 2`, `pickSpecial(menus, pantry, date) → menu|null`, `todaySpecial(rest, menus, pantry, date) → { rest, menu }`, `sanitizeSpecial(raw) → { date, menu } | null`

- [ ] 테스트: 후보 없음(pantry 비거나 undefined) → null; `pantry.fish = 0, rice = 2` 이면 riceball 만 후보; 같은 인자면 같은 결과; 여러 날짜(예: 2026-11-01~30)에서 후보 둘 이상이 모두 한 번 이상 나온다; `todaySpecial` 은 `rest.special.date === date` 면 저장 값을 그대로(재고가 바뀌어도) 돌려주고 `rest` 는 같은 참조; 날짜가 다르면 새로 골라 `{ ...rest, special: { date, menu } }`; 후보 없으면 `{ date, menu: null }` 저장; sanitize: `{date:'2026-11-21', menu:'soup'}` 유지, `menu:'pizza'`·`date:3`·null → null, `menu:null` 은 유지.
- [ ] 구현: 날짜 해시는 문자열 문자 코드 누적(`h = (h * 31 + c) >>> 0`) 후 `% 후보 수`. 후보 순서는 `menus` 순서 그대로.

### Task 2: 주문 확률·코인

**Files:** Modify `js/restaurant/regulars.js` (`pickMenu`), `js/restaurant/session.js` (`createSession`, `spawn`, `serve`), `js/restaurant/rules.js` (default·sanitize 에 `special`), Test: 기존 restaurant 테스트 파일 중 맞는 곳에 추가

- [ ] `pickMenu(npc, menus, rng, special = null)`: 단골 좋아하는 메뉴 판정(지금 그대로) → 아니면 `special && menus.includes(special) && rng() < SPECIAL_ODDS` 면 special → 아니면 `pick(menus, rng)`.
- [ ] `createSession({ ..., special = null })` 저장, `first` 면 special 은 null. `spawn` 이 `pickMenu(npc, menus, S.rng, S.special)`. `serve` 코인: `tk.menu === S.special` 이면 `* SPECIAL_COIN_MUL`. 직원 대접 경로도 같은 `serve` 를 쓰는지 확인하고 같게.
- [ ] rules: `defaultRestaurant()` 에 `special: null`, `sanitizeRestaurant` 에 `special: sanitizeSpecial(raw.special)`.
- [ ] 테스트: 시드 고정 rng 2000회에서 special 비율이 0.5 + 0.5/메뉴 수 근처(±0.06); 단골 좋아하는 메뉴가 special 보다 먼저; menus 에 special 없으면 무시; 세션 특선 코인 두 배; first 세션 special null.

### Task 3: 입장 연결

**Files:** Modify `js/spaces/restaurant.js`, Test `tests/restaurant-wiring.test.mjs`

- [ ] `enterRestaurant` 에서 `todaySpecial(gameState.restaurant, STAR[gameState.restaurant.star].menus, gameState.port?.pantry, todayStr())` 결과 `rest` 가 바뀌었으면 `gameState.restaurant` 갱신·`requestSave()`. 현재 특선은 모듈 변수 `special` 에.
- [ ] `sessionOpts`: 연습판이면 `{ first: true }`, 아니면 `{ special }`.
- [ ] 소스 확인 테스트: `/todaySpecial\(/`, `/sessionOpts: \(\) => \(restaurantGuideActive\(\) \? \{ first: true \} : \{ special \}\)/`.

### Task 4: 칠판·영업 시작 안내 (시안 선택 후)

- 칠판: 시안 D 확정(2026-11-21). 특선 메뉴 줄에 금색 타원 링 + 칠판 위 Sprite 말풍선(메뉴 아이콘 + ✨, 글자 없음). 원본 `sims/restaurant-special/models.js` `boardD`. 말풍선 SpriteMaterial color `0xd8d2c4`(블룸 번짐 방지), scale 0.95, y 2.3. 특선 없는 날은 만들지 않는다.
- 영업 시작 안내: 시안 A 확정(2026-11-21). 영업 전 "오늘의 메뉴" 카드에서 특선 줄을 금색으로, 이름 아래 칩 `✨ 오늘의 특선`, 줄 아래 한 줄 `코인 두 배, 주문도 많이 들어와요`(문구 1). 연습판·특선 없는 날은 표시 없음.
- 구현: `js/restaurant/special-board.js` `buildSpecialMark`, `data.js` `BOARD_ROW_Y`, `hud.js` `SPECIAL_COPY`·`menuView(..., special)`, `spaces/restaurant.js` `rebuildSpecialMark`.

### Task 5: 최종 확인

- [ ] 전체 테스트, 미리보기(특선 있는 날·없는 날), 최종 리뷰, dev docs.
