# 식당 단골 이웃 2단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이웃이 단골이 되면 단골 편지(식당 재료 3개 동봉)가 소식함에 오고, 식당 입구 옆 걸이 기둥에 단골 명패가 걸린다.

**Architecture:** 편지 본문·선물은 새 데이터 파일 `js/data/regular-letters.js`. 기존 호감도 편지 흐름(`hintsSeen.affOrder` 키 목록 → `letterView` → 소식함 UI → `claimLetter`)에 `npc:regular` 키를 더해 그대로 태운다. 선물은 인벤토리가 아니라 포구 창고(`gameState.port.pantry`)로 들어간다(`addToPantry`). 명패 기둥은 `js/restaurant/regular-board.js`(조형, 시안 B 이식)와 순수 배치 함수, `js/spaces/restaurant.js` 가 단골 목록이 바뀔 때 다시 세운다.

**Spec:** `docs/superpowers/specs/2026-11-20-restaurant-regulars-design.md` 6·7절. 문구 확정본: `dev/active/restaurant-regulars/regular-letters-copy.md`.

## Global Constraints

- 코드·CSS·테스트에 주석 금지. 테스트 먼저. 불변 갱신. 기존 패턴 유지.
- 새 UI 문구는 사용자 검수를 거친 것만(아래 "확정 문구").
- 화면 이모지는 그대로 두면 전역 변환기가 아이콘으로 바꾼다. 3D 명패의 얼굴·메뉴는 `js/icons/toss-icons-all.js` 아이콘을 캔버스에 그린다(시안과 같은 방식, svg 에 width/height 지정).
- GA4 새 이벤트 없음. 기존 `affinity_letter_open`·`affinity_reward_claim`의 `stage` 파라미터에 단골 편지는 `0`.
- 커밋은 사용자 요청 시에만, 푸시·병합 금지.
- 테스트: `node --test tests/restaurant-*.test.mjs tests/affinity-*.test.mjs`, 끝에 전체 `node --test tests/*.test.mjs`(@capacitor/app 환경 실패 1건 허용).

## 확정 문구

- 편지 8통 본문(한/영): `regular-letters-copy.md` 표 그대로.
- 편지 제목: 기존 `letterTitle` 그대로("✉️ 농부 삼촌의 편지").
- 소식함 목록 줄: `농부 삼촌 · 🍙 단골` (수첩 칩과 같은 표현, 영어 `Farmer · 🍙 Regular`).
- 선물: 좋아하는 메뉴 재료 3. 주먹밥 이웃 `{ rice: 3 }`, 생선구이·생선국 이웃 `{ fish: 3 }`.
- 동봉 줄·받기 뒤 토스트: **검수 대기**(Task 2 Step 0).

---

### Task 1: 단골 편지 데이터

**Files:** Create `js/data/regular-letters.js`, Test `tests/restaurant-regulars.test.mjs`(끝에 추가)

**Produces:** `REGULAR_LETTERS[npc] = { body, bodyEn, pantry }`, `regularLetterOf(npc, lang) → { npc, body, pantry } | null`

- [ ] Step 1 테스트:
```js
test('단골 편지는 8명 모두 있고 선물은 좋아하는 메뉴 재료 3개', async () => {
  const { REGULAR_LETTERS, regularLetterOf } = await import('../js/data/regular-letters.js');
  const { MENU } = await import('../js/restaurant/data.js');
  assert.deepEqual(Object.keys(REGULAR_LETTERS).sort(), [...GUEST_NPCS].sort());
  for (const id of GUEST_NPCS) {
    assert.deepEqual(REGULAR_LETTERS[id].pantry, { [MENU[FAV[id]].from]: 3 });
    assert.ok(REGULAR_LETTERS[id].body.length > 20 && REGULAR_LETTERS[id].bodyEn.length > 20);
    assert.doesNotMatch(REGULAR_LETTERS[id].body + REGULAR_LETTERS[id].bodyEn, /—/);
  }
  assert.equal(regularLetterOf('farmer', 'en').body, REGULAR_LETTERS.farmer.bodyEn);
  assert.equal(regularLetterOf('chef'), null);
});
```
- [ ] Step 2 실패 확인 → Step 3 구현: 확정 문구 표를 그대로 옮긴 `Object.freeze` 객체(npc-letters.js 스타일), `pantry` 는 위 규칙. `regularLetterOf(npc, lang = 'ko')` 는 `{ npc, body: lang === 'en' ? bodyEn : body, pantry }`.
- [ ] Step 4 통과 확인.

### Task 2: 소식함에 단골 편지 태우기

**Files:** Modify `js/affinity/index.js`(letterView, claimLetter, 새 `issueRegularLetter`), `js/affinity/copy.js`(`regularRowText`, 확정 동봉 줄·토스트 함수), `js/affinity/letters-ui.js`(동봉 줄·토스트), Test `tests/affinity-copy.test.mjs`·`tests/restaurant-wiring.test.mjs`

- [ ] **Step 0 문구 검수(컨트롤러가 사용자에게):** 동봉 줄과 받기 뒤 토스트 후보를 보여 주고 고른 것만 쓴다.
- [ ] Step 1 테스트: `regularRowText({ name: '농부 삼촌', nameEn: 'Farmer', ico: '🍙', lang })` → `'농부 삼촌 · 🍙 단골'` / `'Farmer · 🍙 Regular'`. `affinity/index.js` 는 game.js 를 import 해 node 에서 못 부르므로 소스 확인 테스트: `/key\.endsWith\(':regular'\)/`, `/addToPantry\(/`, `/export function issueRegularLetter\(npc\)/`.
- [ ] Step 2 구현:
  - `issueRegularLetter(npc)`: 키 `${npc}:regular` 가 `affOrder` 에 없을 때만 추가, `requestSave()`, `notify()`.
  - `letterView(key)`: `key.endsWith(':regular')` 이면 `regularLetterOf(npc, L)` 로 `{ key, npc, idx: -1, face, title: letterTitle(...), row: regularRowText(...), stage: '', body, gift: { pantry }, giftText: <확정 동봉 줄>, read, claimed }`.
  - `claimLetter(key)`: `v.gift.pantry` 면 `gameState.port = addToPantry(gameState.port, v.gift.pantry)`(`js/port/rules.js`), giveReward 는 부르지 않는다.
  - letters-ui 토스트: `l.gift.pantry` 면 확정 토스트.
- [ ] Step 3 통과 확인.

### Task 3: 단골이 되면 편지 발송

**Files:** Modify `js/spaces/restaurant.js` `onGuestServed`, Test `tests/restaurant-wiring.test.mjs`

- [ ] 테스트: `/if \(became\) \{[\s\S]*issueRegularLetter\(npc\)/`.
- [ ] 구현: `became` 일 때 `trackEvent` 와 함께 `issueRegularLetter(npc)`(기존 `../affinity/index.js` import 줄에 추가).

### Task 4: 입구 옆 단골 명패 기둥 (시안 B)

**Files:** Create `js/restaurant/regular-board.js`, Modify `js/spaces/restaurant.js`, Test `tests/restaurant-regulars.test.mjs`

**Produces:** `tagSlots(n) → [{ x, y }]`, `buildRegularBoard(THREE, regs) → Promise<THREE.Group>`(regs = `[{ face, name, menu }]`)

- [ ] Step 1 테스트:
```js
test('명패는 한 줄에 4개씩 두 줄, 위에서부터 걸린다', async () => {
  const { tagSlots } = await import('../js/restaurant/regular-board.js');
  assert.equal(tagSlots(0).length, 0);
  const s = tagSlots(8);
  assert.equal(s.length, 8);
  assert.equal(new Set(s.map(p => p.x)).size, 2);
  assert.ok(s[0].y > s[3].y);
  assert.equal(s[4].y, s[0].y);
  assert.ok(Math.min(...s.map(p => p.y)) > 0.2);
});
```
  regular-board.js 는 three 를 직접 import 하지 않고 THREE 를 인자로 받는다. `toss-icons-all.js` 는 `buildRegularBoard` 안에서 동적 import.
- [ ] Step 2 구현: `sims/restaurant-regular-board/models.js` 의 `boardB` 를 옮기되 팔을 두 줄(4개씩)에 맞게 늘리고 `tagSlots` 로 배치. 명패 이름은 NPCS 이름 전체, 캔버스 폭에 맞춰 글자 크기를 줄인다.
- [ ] Step 3 spaces 연결: 단골이 1명 이상일 때만 세운다. 식당 로컬 `(-6.85, 1.9)`, `scale 1.35`, 기둥 `solidCircle` r 0.15. `enterRestaurant` 와 `became` 때 다시 세운다(이전 그룹은 dispose).
- [ ] Step 4 통과 확인 + 미리보기(단골 1·4·8명) PC·모바일 캡처.

### Task 5: 최종 확인

- [ ] 단골 5회 대접 → 소식함 편지 1통, 받기 → `port.pantry` +3, 두 번 받기 불가, 명패 기둥 등장.
- [ ] 전체 테스트, 최종 리뷰, dev docs 갱신. 커밋은 요청 시.
