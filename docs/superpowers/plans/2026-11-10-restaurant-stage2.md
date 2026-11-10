# 식당 1차 (구현 2단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부엌 서식지를 완성한 플레이어가 마을 카페 옆 비스트로 식당에 들어가 100초 저녁 영업을 하고(직접 걷기·썰기·팬/냄비 자동 익힘·접시·서빙), 별점으로 코인과 식당 평점을 받아 ★1→★2를 올린다. 재료는 포구 섬 창고에서 꺼내 쓰고, 첫 영업은 길 안내가 끝까지 데려간다.

**Architecture:** 판정(조리 상태·별점·코인·DDA·평판 조건·재료 꺼내기·저장 정규화)과 영업 한 판의 상태 기계(손님 생성·주문표·설비 타이머·행동 해석)는 DOM·Three.js 없는 순수 모듈 `js/restaurant/rules.js`, `js/restaurant/session.js` 에 두고 node 테스트와 "봇이 한 판을 끝까지 도는" 테스트로 고정한다. 실내는 카페와 같은 새 인스턴스 공간(플래그 `atRestaurant`, 원점 `(0,0,620)`)이고, 마을 쪽 등록 목록은 배선 테스트로 빠짐없이 강제한다. 외관은 확정 시안 `sims/restaurant-exterior-models.js` 의 `bistro()` 를 `js/vertex-merge.js` 로 합쳐 옮긴다.

**Tech Stack:** Three.js 0.160 (ES module, 번들러 없음, 배포 때 `js/b/` 생성), node:test + node:assert/strict, GA4 `trackEvent`.

**Spec:** `docs/superpowers/specs/2026-10-31-restaurant-quest-design.md` 2·3·4·7·8·9·10절과 "식당 자리·외관" 행(2026-11-10). 시안: `sims/restaurant-kitchen-sim.html`(영업 규칙 원본), `sims/restaurant-exterior-models.js`(`bistro()`), `sims/restaurant-look-compare.html`, `sims/restaurant-site-compare.html`.

**Branch:** `feat/restaurant`, `feat/port-island` 끝에서 갈라진다. 포구 섬 창고(`port.pantry`)를 쓰기 때문.

## Global Constraints

- 새 코드·CSS·테스트에 주석을 쓰지 않는다.
- 화면 문구에 엠대시(—)와 "놀다/놀아요"를 쓰지 않는다. 새 문구는 Task 0 선검수에서 확정된 것만 쓴다.
- 월드 말풍선(손님 머리 위 주문)은 이모지만. 글자는 HUD(주문표·카드)로.
- 길 안내 표식에 화살표 이모지(⬇️ ➜) 금지. 기존 `js/guide/view.js` 의 SVG 화살표를 쓴다.
- 도구 휘두르는 모션은 바꾸지 않는다.
- 새 기능 코드는 `js/restaurant/`, 공간 진입·종료는 `js/spaces/restaurant.js`. `game.js` 에는 플래그·목록 등록·훅 한 줄씩만.
- 잠금: `restaurant` = `branch(s,'kitchen','habitat')`(카페·포구 섬과 같은 조건).
- 드로우콜: 외관 합친 메시 ≤ 6개, 실내 정적 부분 ≤ 12개. 측정은 `window.__perf()`.
- GA4: 이벤트당 파라미터 ≤5, 코드 키 ≤23. 새 이벤트는 `docs/analysis/event-taxonomy.csv` 에 행 추가.
- "커밋"만 지시받으면 푸시·병합·배포 금지. 배포는 승인 뒤 5곳 동시. 공개 저장소라 푸시 전 키 스캔.

## Rulings (기획서가 정하지 않은 것)

| # | 정한 것 | 이유 | 틀렸을 때 비용 |
|---|---|---|---|
| R1 | 재료 상자에서 하나 꺼낼 때 `port.pantry` 에서 1 차감(🐟 fish, 🍚 rice). 창고가 비면 상자에 빈 상자 표시 | 기획서 3.1 "식재료 창고 확인", 섬 루프를 식당에 잇는 핵심 | 낮음 |
| R2 | 첫 진입 때 한 번 시작 재료 🐟4 🍚4 를 창고에 넣어 준다(`restaurant.starterGiven`) | 해금이 섬과 같아 섬보다 식당을 먼저 오는 사람이 막히지 않게 | 낮음 |
| R3 | 영업은 하루 횟수·시간대 제한 없음("저녁 영업"은 이름). 재료량이 코인 상한 역할 | 기획서에 제한 없음 | 중간, 밸런스 조정 |
| R4 | **설비별 손놀림(사용자 확정 2026-11-10, Pao Pao 참고)**: 도마는 박자 표시에 맞춰 탭 4번(0.22초보다 빠른 탭은 무시), 팬은 올리면 게이지가 돌고 초록 구간(2.7초 ± 0.5초×DDA)에서 탭하면 뒤집기 성공 → 완벽, 못 뒤집으면 보통(별 −1), 5초에 다 익고 그 뒤 6.5초 안에 꺼내지 않으면 탐. 냄비는 자동 익힘 + 초록일 때 꺼내기 | 사용자가 기획서 "누르고 있기"를 바꿈 | 낮음 |
| R5 | 손님 = 마을 주민 모형 재사용(실내 인스턴스라 마을에서 숨길 필요 없음) | 기획서 3.3 "손님은 마을 이웃" | 낮음 |
| R6 | 1차 평판 패널은 탭 2개(⭐ 별 / ℹ️ 정보). 손님 명단 탭은 3단계로 미룸 | 기획서 순서 2 범위는 ★1~★2 | 낮음 |
| R7 | 실내 원점 `RESTAURANT = (0,0,620)` | 비어 있는 자리(420 부엌 무대·460 공방·480 프롤로그·540 천문대·700 이웃) | 없음 |
| R8 | 실내 색은 외관 비스트로에 맞춤(크림 벽·초록 징두리·나무 바닥·흰 타일 주방). 시뮬의 붉은 벽은 버림 | 밖과 안이 같은 가게로 읽히게 | 낮음, Task 6 캡처로 확인 |

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/restaurant/data.js` (새) | 값만: 좌표, 별 단계표, 조리 수치, 메뉴, 별 올리기 조건·보상, DDA 한계, 시작 재료, 실내 배치 |
| `js/restaurant/rules.js` (새, 순수) | `defaultRestaurant`, `sanitizeRestaurant`, `cookState`, `serveStars`, `spawnInterval`, `serviceAvg`, `adjustDda`, `recordServe`, `starUpReady`, `applyStarUp`, `takeIngredient`, `grantStarter` |
| `js/restaurant/session.js` (새, 순수) | 영업 한 판 상태 기계: `createSession`, `tickSession`, `contextAt`, `actAt`, `finishSession` |
| `js/restaurant/exterior.js` (새) | 비스트로 외관(합친 메시), 저녁 점등 |
| `js/restaurant/hall.js` (새) | 실내 방·설비·테이블 모형(합친 메시), 손님 모형 배치 |
| `js/restaurant/hud.js` (새) | 주문표·설비 링·결과 카드·평판 패널 DOM |
| `js/restaurant/index.js` (새) | 런타임: 세션 ↔ 모형 ↔ HUD ↔ 입력, `bindRestaurantEnv` |
| `js/spaces/restaurant.js` (새) | `spawnRestaurantGate`, `buildRestaurantHall`, `enterRestaurant`, `exitRestaurant`, `updateRestaurantInteract` |
| `js/restaurant/guide-steps.js` (새) | 첫 영업 안내 단계(데이터) |
| `game.js`, `js/spaces/doors.js`, `js/shadow-scope.js`, `js/world/unlocks.js`, `js/controls.js`, `index.html` | 등록 한 줄씩 |
| `tests/restaurant-rules.test.mjs`, `tests/restaurant-session.test.mjs`, `tests/restaurant-wiring.test.mjs`, `tests/restaurant-exterior.test.mjs` (새) | |

---

### Task 0: 문구 선검수 (사용자 확인, 코드 없음)

- [ ] **Step 1:** 아래 후보를 `dev/active/restaurant-port/restaurant-copy.md` 에 표로 쓰고 사용자에게 보여 준다. 모바일 가로(844px) 실측 폭은 Task 7 에서 다시 잰다.

| 자리 | 후보 |
|---|---|
| 팻말 | 🍽️ 식당 |
| 문 프롬프트 | 🍽️ 식당에 들어가기 |
| 실내 칠판 프롬프트 | 🍽️ 저녁 영업 시작 |
| 재료 부족 | 창고에 재료가 없어요. 포구 섬에서 구해 와요 |
| 시작 재료 토스트 | 첫 영업 재료를 받았어요 🐟4 🍚4 |
| 결과 카드 제목 | 영업 끝! |
| 결과 줄 | 🍽️ {n}명 · 평균 ★{avg} · 🪙 {coins} |
| 별 올리기 | ⭐{n} 식당이 됐어요 |
| 안내 1 | 카페 옆 식당으로 가 보세요 |
| 안내 2 | 칠판을 눌러 영업을 시작해요 |
| 안내 3 | 🐟 상자에서 생선을 꺼내요 |
| 안내 4 | 팬에 올려요 |
| 안내 5 | 게이지가 초록일 때 눌러 뒤집어요 |
| 안내 6 | 다 익으면 꺼내요 |
| 안내 7 | 접시에 담아요 |
| 안내 8 | 손님에게 가져다줘요 |
| 도마 첫 사용 | 박자에 맞춰 네 번 눌러요 |

- [ ] **Step 2:** 사용자 확정본으로 표를 고친다. 확정 전에는 Task 7·8 의 문구를 넣지 않는다(Task 1~6 은 진행 가능).

---

### Task 1: 데이터와 순수 규칙

**Files:**
- Create: `js/restaurant/data.js`, `js/restaurant/rules.js`
- Test: `tests/restaurant-rules.test.mjs`

**Interfaces:**
- Produces: 아래 함수 전부(이후 Task 가 그대로 import).

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAR, COOK, STARTER_STOCK } from '../js/restaurant/data.js';
import { defaultRestaurant, sanitizeRestaurant, cookState, panState, flipZone, flipOk, chopTap, chopDone, serveStars, spawnInterval, serviceAvg, adjustDda,
  recordServe, starUpReady, applyStarUp, takeIngredient, grantStarter } from '../js/restaurant/rules.js';

test('기본값과 정규화', () => {
  const d = defaultRestaurant();
  assert.deepEqual(d, { v: 1, star: 1, rating: 0, served: { grilled: 0, riceball: 0, soup: 0 }, combo: 0, bestCombo: 0,
    dda: { iv: 1, pat: 1, win: 1 }, starterGiven: false, guideDone: false, services: 0 });
  assert.deepEqual(sanitizeRestaurant(null), d);
  const s = sanitizeRestaurant({ star: 9, rating: -3, served: { grilled: 2.7, pizza: 4 }, dda: { iv: 5, pat: 0.1, win: 'x' }, starterGiven: 'yes', junk: 1 });
  assert.equal(s.star, 4);
  assert.equal(s.rating, 0);
  assert.deepEqual(s.served, { grilled: 2, riceball: 0, soup: 0 });
  assert.deepEqual(s.dda, { iv: 1.2, pat: 0.8, win: 1 });
  assert.equal(s.starterGiven, false);
  assert.equal('junk' in s, false);
});

test('냄비 상태는 익힘·완벽·지나침·탐 순서', () => {
  assert.equal(cookState('pot', 6.9, 1), 'raw');
  assert.equal(cookState('pot', 7.0, 1), 'perfect');
  assert.equal(cookState('pot', 7 + 3.2 - 0.01, 1), 'perfect');
  assert.equal(cookState('pot', 7 + 3.2, 1), 'over');
  assert.equal(cookState('pot', 7 + 3.2 + 8, 1), 'burnt');
  assert.equal(cookState('pot', 7 + 3.2 * 1.2 - 0.01, 1.2), 'perfect');
});

test('팬은 다 익음까지 5초, 그 뒤 6.5초에 탄다', () => {
  assert.equal(panState(4.9), 'raw');
  assert.equal(panState(5), 'done');
  assert.equal(panState(11.49), 'done');
  assert.equal(panState(11.5), 'burnt');
});

test('뒤집기 초록 구간은 2.7초 ± 0.5초×DDA', () => {
  assert.deepEqual(flipZone(1), [2.2, 3.2]);
  assert.equal(flipOk(2.19, 1), false);
  assert.equal(flipOk(2.2, 1), true);
  assert.equal(flipOk(3.2, 1), true);
  assert.equal(flipOk(3.25, 1), false);
  assert.equal(flipOk(3.25, 1.2), true);
});

test('도마는 탭 4번, 0.22초보다 빠른 탭은 무시', () => {
  let c = { taps: 0, last: -1 };
  c = chopTap(c, 0.0); c = chopTap(c, 0.1); c = chopTap(c, 0.3); c = chopTap(c, 0.6);
  assert.equal(c.taps, 3);
  c = chopTap(c, 0.9);
  assert.equal(c.taps, 4);
  assert.equal(chopDone(c), true);
});

test('별점은 5에서 깎고 최소 1', () => {
  assert.equal(serveStars(10, 1, 1), 5);
  assert.equal(serveStars(30, 1, 1), 4);
  assert.equal(serveStars(50, 1, 1), 3);
  assert.equal(serveStars(50, 0.75, 1), 2);
  assert.equal(serveStars(30, 1, 1.25), 5);
  assert.equal(serveStars(999, 0, 1), 1);
});

test('손님 간격은 영업 처음→끝으로 줄고 DDA 배율을 곱한다', () => {
  assert.equal(spawnInterval(1, 0, 1), 14);
  assert.equal(spawnInterval(1, 100, 1), 11);
  assert.equal(spawnInterval(1, 50, 1), 12.5);
  assert.equal(spawnInterval(2, 0, 1.1), 12 * 1.1);
});

test('평균은 못 받은 주문을 1점으로 센다', () => {
  assert.equal(serviceAvg([5, 5], 2), 3);
  assert.equal(serviceAvg([], 0), 0);
});

test('DDA: 쉽게 +0.08, 어렵게 -0.06, 0.8~1.2', () => {
  const one = { iv: 1, pat: 1, win: 1 };
  assert.deepEqual(adjustDda(one, { avg: 3.0, late: 0, unserved: 0, served: 4 }).dda, { iv: 1.08, pat: 1.08, win: 1.08 });
  assert.deepEqual(adjustDda(one, { avg: 4.5, late: 0, unserved: 1, served: 6 }).dda, { iv: 0.94, pat: 0.94, win: 0.94 });
  assert.deepEqual(adjustDda(one, { avg: 4.5, late: 1, unserved: 0, served: 6 }).dda, one);
  assert.deepEqual(adjustDda(one, { avg: 4.0, late: 0, unserved: 0, served: 6 }).dda, one);
  assert.deepEqual(adjustDda({ iv: 1.18, pat: 1.18, win: 1.18 }, { avg: 1, late: 3, unserved: 3, served: 0 }).dda, { iv: 1.2, pat: 1.2, win: 1.2 });
  assert.equal(adjustDda(one, { avg: 3.0, late: 0, unserved: 0, served: 4 }).dir, 'easy');
});

test('서빙 기록: 평점·메뉴 횟수·연속', () => {
  let r = defaultRestaurant();
  r = recordServe(r, 'riceball', 5);
  r = recordServe(r, 'riceball', 4);
  assert.equal(r.rating, 9);
  assert.equal(r.served.riceball, 2);
  assert.equal(r.combo, 2);
  r = recordServe(r, 'grilled', 3);
  assert.equal(r.combo, 0);
  assert.equal(r.bestCombo, 2);
});

test('★2 조건: 평점 40 + 주먹밥 5', () => {
  let r = { ...defaultRestaurant(), rating: 40, served: { grilled: 0, riceball: 4, soup: 0 } };
  assert.equal(starUpReady(r), false);
  r = { ...r, served: { ...r.served, riceball: 5 } };
  assert.equal(starUpReady(r), true);
  const up = applyStarUp(r);
  assert.equal(up.rest.star, 2);
  assert.equal(up.coins, 100);
  assert.equal(starUpReady({ ...r, star: 4 }), false);
});

test('★3 조건은 연속 4명(최고 기록)', () => {
  const r = { ...defaultRestaurant(), star: 2, rating: 100, bestCombo: 4 };
  assert.equal(starUpReady(r), true);
});

test('재료 꺼내기는 창고에서 1 차감, 없으면 실패', () => {
  const port = { pantry: { fish: 1, rice: 0 } };
  const a = takeIngredient(port, 'fish');
  assert.equal(a.ok, true);
  assert.equal(a.port.pantry.fish, 0);
  assert.equal(port.pantry.fish, 1);
  assert.equal(takeIngredient(a.port, 'fish').ok, false);
  assert.equal(takeIngredient(port, 'rice').ok, false);
});

test('시작 재료는 한 번만', () => {
  const g = grantStarter(defaultRestaurant(), { pantry: { fish: 1, rice: 0 } });
  assert.equal(g.given, true);
  assert.equal(g.port.pantry.fish, 1 + STARTER_STOCK.fish);
  assert.equal(g.rest.starterGiven, true);
  assert.equal(grantStarter(g.rest, g.port).given, false);
});

test('별 단계표 모양', () => {
  assert.deepEqual(Object.keys(STAR), ['1', '2', '3', '4']);
  assert.equal(COOK.pan.cook, 5);
});
```

- [ ] **Step 2:** `node --test tests/restaurant-rules.test.mjs` → 모듈 없음으로 FAIL.

- [ ] **Step 3: 구현**

`js/restaurant/data.js`:
```js
export const RESTAURANT = { x: 0, z: 620 };
export const RESTAURANT_GATE = { x: 12, z: 20.5 };
export const SERVICE_SEC = 100;
export const LAST_SPAWN_SEC = 90;
export const CHOP_TAPS = 4;
export const CHOP_GAP = 0.22;
export const COOK = { pan: { cook: 5, burn: 6.5 }, pot: { cook: 7, win: 3.2, burn: 8 } };
export const FLIP = { at: 2.7, half: 0.5 };
export const PATIENCE = [25, 45];
export const COIN_PER_STAR = 5;
export const EAT_SEC = 3.5;
export const MENU_KEYS = ['grilled', 'riceball', 'soup'];
export const MENU = {
  grilled: { ico: '🐟', from: 'fish' },
  riceball: { ico: '🍙', from: 'rice' },
  soup: { ico: '🍲', from: 'fish' },
};
export const STAR = {
  1: { tables: 2, menus: ['grilled', 'riceball'], pans: 1, pot: false, staff: false, iv: [14, 11] },
  2: { tables: 3, menus: ['grilled', 'riceball', 'soup'], pans: 1, pot: true, staff: false, iv: [12, 9] },
  3: { tables: 3, menus: ['grilled', 'riceball', 'soup'], pans: 2, pot: true, staff: true, iv: [11, 8] },
  4: { tables: 4, menus: ['grilled', 'riceball', 'soup'], pans: 2, pot: true, staff: true, iv: [10, 7] },
};
export const STAR_UP = {
  2: { rating: 40, served: { riceball: 5 }, coins: 100 },
  3: { rating: 100, combo: 4, coins: 200 },
  4: { rating: 200, served: { soup: 8 }, coins: 300 },
};
export const DDA_MIN = 0.8, DDA_MAX = 1.2, DDA_EASY = 0.08, DDA_HARD = 0.06;
export const DDA_EASY_BELOW = 3.2, DDA_HARD_FROM = 4.3;
export const STARTER_STOCK = { fish: 4, rice: 4 };
```

`js/restaurant/rules.js`:
```js
import { COOK, FLIP, CHOP_TAPS, CHOP_GAP, PATIENCE, STAR, STAR_UP, MENU_KEYS, DDA_MIN, DDA_MAX, DDA_EASY, DDA_HARD, DDA_EASY_BELOW, DDA_HARD_FROM, STARTER_STOCK } from './data.js';

const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const clampDda = v => Math.round(Math.max(DDA_MIN, Math.min(DDA_MAX, v)) * 100) / 100;
const ddaVal = v => (Number.isFinite(v) ? clampDda(v) : 1);

export function defaultRestaurant() {
  return { v: 1, star: 1, rating: 0, served: Object.fromEntries(MENU_KEYS.map(k => [k, 0])), combo: 0, bestCombo: 0,
    dda: { iv: 1, pat: 1, win: 1 }, starterGiven: false, guideDone: false, services: 0 };
}

export function sanitizeRestaurant(raw) {
  const base = defaultRestaurant();
  if (!raw || typeof raw !== 'object') return base;
  const star = Math.min(4, Math.max(1, nat(raw.star) || 1));
  return {
    ...base, star, rating: nat(raw.rating),
    served: Object.fromEntries(MENU_KEYS.map(k => [k, nat(raw.served?.[k])])),
    combo: nat(raw.combo), bestCombo: nat(raw.bestCombo),
    dda: { iv: ddaVal(raw.dda?.iv), pat: ddaVal(raw.dda?.pat), win: ddaVal(raw.dda?.win) },
    starterGiven: raw.starterGiven === true, guideDone: raw.guideDone === true, services: nat(raw.services),
  };
}

export function cookState(kind, t, win) {
  const k = COOK[kind];
  const w = k.win * win;
  if (t < k.cook) return 'raw';
  if (t < k.cook + w) return 'perfect';
  if (t < k.cook + w + k.burn) return 'over';
  return 'burnt';
}

export function panState(t) {
  if (t < COOK.pan.cook) return 'raw';
  if (t < COOK.pan.cook + COOK.pan.burn) return 'done';
  return 'burnt';
}

export function flipZone(win) {
  const r = v => Math.round(v * 100) / 100;
  return [r(FLIP.at - FLIP.half * win), r(FLIP.at + FLIP.half * win)];
}

export function flipOk(t, win) {
  const [a, b] = flipZone(win);
  return t >= a && t <= b;
}

export function chopTap(c, now) {
  if (c.last >= 0 && now - c.last < CHOP_GAP) return c;
  return { taps: Math.min(CHOP_TAPS, c.taps + 1), last: now };
}

export function chopDone(c) {
  return c.taps >= CHOP_TAPS;
}

export function serveStars(wait, quality, pat) {
  const [a, b] = PATIENCE;
  const late = wait < a * pat ? 0 : wait < b * pat ? 1 : 2;
  return Math.max(1, 5 - late - (quality < 1 ? 1 : 0));
}

export function spawnInterval(star, elapsed, ivMul) {
  const [s, e] = STAR[star].iv;
  return (s + (e - s) * Math.min(1, elapsed / 100)) * ivMul;
}

export function serviceAvg(stars, unserved) {
  const all = [...stars, ...Array(unserved).fill(1)];
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
}

export function adjustDda(dda, { avg, late, unserved, served }) {
  if (avg < DDA_EASY_BELOW || served === 0) return { dir: 'easy', dda: { iv: clampDda(dda.iv + DDA_EASY), pat: clampDda(dda.pat + DDA_EASY), win: clampDda(dda.win + DDA_EASY) } };
  if (avg >= DDA_HARD_FROM && late === 0 && unserved <= 1) return { dir: 'hard', dda: { iv: clampDda(dda.iv - DDA_HARD), pat: clampDda(dda.pat - DDA_HARD), win: clampDda(dda.win - DDA_HARD) } };
  return { dir: 'keep', dda: { ...dda } };
}

export function recordServe(rest, menu, stars) {
  const combo = stars >= 4 ? rest.combo + 1 : 0;
  return { ...rest, rating: rest.rating + stars, served: { ...rest.served, [menu]: (rest.served[menu] || 0) + 1 },
    combo, bestCombo: Math.max(rest.bestCombo, combo) };
}

export function starUpReady(rest) {
  const c = STAR_UP[rest.star + 1];
  if (!c) return false;
  if (rest.rating < c.rating) return false;
  if (c.combo && rest.bestCombo < c.combo) return false;
  for (const [k, n] of Object.entries(c.served || {})) if ((rest.served[k] || 0) < n) return false;
  return true;
}

export function applyStarUp(rest) {
  if (!starUpReady(rest)) return { rest, coins: 0 };
  return { rest: { ...rest, star: rest.star + 1 }, coins: STAR_UP[rest.star + 1].coins };
}

export function takeIngredient(port, kind) {
  const n = nat(port?.pantry?.[kind]);
  if (n < 1) return { ok: false, port };
  return { ok: true, port: { ...port, pantry: { ...port.pantry, [kind]: n - 1 } } };
}

export function grantStarter(rest, port) {
  if (rest.starterGiven) return { given: false, rest, port };
  const pantry = { ...port.pantry };
  for (const [k, n] of Object.entries(STARTER_STOCK)) pantry[k] = nat(pantry[k]) + n;
  return { given: true, rest: { ...rest, starterGiven: true }, port: { ...port, pantry } };
}
```

- [ ] **Step 4:** `node --test tests/restaurant-rules.test.mjs` → PASS. `npm test` 전체 PASS.
- [ ] **Step 5:** 커밋 `feat(restaurant): data table and pure rules for service scoring, DDA and reputation`

---

### Task 2: 영업 한 판 상태 기계 (순수)

**Files:**
- Create: `js/restaurant/session.js`
- Modify: `js/restaurant/data.js` (`HALL` 추가)
- Test: `tests/restaurant-session.test.mjs`

**Interfaces:**
- Consumes: Task 1 전부.
- Produces:
  - `createSession({ star, dda, rng })` → 세션 객체 `S` (`time, next, guests, tickets, held, stations{id→{item,t,chop}}, stats, ended`).
  - `tickSession(S, dt, { pos })` → 이벤트 배열 `[{ type: 'spawn'|'seat'|'chopDone'|'staffServed'|'leave'|'end', ... }]`. `S` 는 한 판 동안만 쓰는 임시 상태라 제자리에서 바꾼다(저장하지 않음).
  - `contextAt(S, pos)` → `{ do, id, ico } | null`, `do` ∈ `take|put|chop|flip|pick|pickCook|plate|trash|serve`.
  - `actAt(S, pos, { take })` → 이벤트 배열. `take(kind)` 콜백이 창고 차감을 맡는다(`true` 면 꺼냄, `false` 면 `{type:'empty', kind}` 이벤트).
  - `finishSession(S)` → `{ served, stars, unserved, late, perfect, takes, burnt, coins, avg }`.

`data.js` 에 추가(실내 로컬 좌표, 원점 `RESTAURANT`, 문은 +z 쪽):
```js
export const HALL = {
  half: { x: 7.2, z: 4.2 },
  door: { x: -6.3, z: 3.4 },
  board: { x: -5.2, z: 3.2 },
  tables: [[-4.7, -2.0], [-1.7, -2.0], [-4.7, 1.5], [-1.7, 1.5]],
  stations: [
    { id: 'crate_fish', kind: 'crate', give: 'fish', x: 1.9, z: -3.5 },
    { id: 'crate_rice', kind: 'crate', give: 'rice', x: 3.05, z: -3.5 },
    { id: 'board', kind: 'board', x: 4.6, z: -3.5 },
    { id: 'pan0', kind: 'pan', x: 6.55, z: -2.6, need: 1 },
    { id: 'pan1', kind: 'pan', x: 6.55, z: -1.45, need: 3 },
    { id: 'pot', kind: 'pot', x: 6.55, z: -0.3, need: 2 },
    { id: 'plates', kind: 'plates', x: 6.55, z: 1.2 },
    { id: 'trash', kind: 'trash', x: 3.4, z: 3.55 },
    { id: 'pass', kind: 'pass', x: 0.8, z: -0.9 },
  ],
  reach: 1.35, tableReach: 1.7, guestWalk: 3,
};
```

세션 규칙(시뮬 `restaurant-kitchen-sim.html` 의 `spawn/context/act/serve/update/finish` 를 화면 코드 없이 옮긴다):
- 첫 손님 `S.next = 1.5`. `tickSession` 이 `S.next` 를 줄여 0 이하이고 `S.time < LAST_SPAWN_SEC` 이면 손님을 만든다. `rng()` 를 **메뉴에 먼저, 테이블에 다음** 쓴다(메뉴 `menus[floor(rng()*len)]`, 빈 테이블 `free[floor(rng()*len)]`). 빈 테이블이 없으면 1초 뒤 다시. 다음 간격 `spawnInterval(star, S.time, dda.iv)`.
- 손님 이동은 문→자리 거리/`guestWalk` 초 뒤 앉음(`seat`, 주문표 `t0` 기록). 먹기 `EAT_SEC` 뒤 `leave`.
- 설비: 별 단계 `need` 보다 낮으면 그 설비는 없는 것으로 친다. 팬·냄비에 재료가 있으면 `t += dt`.
- 도마: 빈손으로 재료 있는 도마 앞 → `chop`. `actAt` 한 번이 `chopTap(c, S.time)`. `chopDone` 이면 생선→`fishChop`, 쌀→`riceball` 완성품(`chopDone` 이벤트), 그다음 맥락은 `pick`.
- 팬: 생선을 올리면 `t=0, flipped=null`. `panState(t)==='raw'` 이고 아직 안 뒤집었으면 맥락 `flip`(ico 🍳). `actAt` 이 `flipped = flipOk(t, dda.win)`(`flip` 이벤트 `{ok}`). `done` 이 되면 맥락 `pickCook`. 꺼낸 생선구이 `q = flipped ? 1 : 0.75`, `burnt` 면 `{kind:'burnt'}`.
- 냄비: `fishChop` 만 넣는다. `cookState('pot', t, dda.win)` 가 `raw` 가 아니면 `pickCook`. 완벽 `q=1`, 지나침 `0.75`, 탐 `burnt`.
- 맥락 우선순위: 접시에 담긴 메뉴를 들고 그 메뉴를 기다리는 테이블 `tableReach` 안 → `serve`. 그다음 가장 가까운 설비(`reach` 안)의 규칙(시뮬 `context()` 와 같고 위 도마·팬만 다름).
- 탄 것은 접시에 못 담고 버리기만.
- 서빙 별점 `serveStars(S.time - t0, q, dda.pat)`, 코인 `stars * COIN_PER_STAR`, 이벤트 `{type:'served', menu, stars, coins, table}`.
- 서빙 직원(★3+)은 배식대 위 접시를 맞는 테이블로 2초 뒤 옮긴다(`staffServed`).
- 끝: `S.time >= SERVICE_SEC` 이고 먹는 손님이 없으면 `end` 한 번.

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALL, SERVICE_SEC } from '../js/restaurant/data.js';
import { createSession, tickSession, contextAt, actAt, finishSession } from '../js/restaurant/session.js';

const at = id => { const s = HALL.stations.find(s => s.id === id); return { x: s.x, z: s.z + 0.9 }; };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const yes = () => true;
const one = { iv: 1, pat: 1, win: 1 };

test('★1 첫 손님이 생기고 앉으면 주문표가 생긴다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0, 0) });
  const ev = [];
  for (let i = 0; i < 200; i++) ev.push(...tickSession(S, 0.05, { pos: at('board') }));
  assert.ok(ev.some(e => e.type === 'spawn'));
  assert.ok(ev.some(e => e.type === 'seat'));
  assert.equal(S.tickets.length, 1);
});

test('주먹밥: 쌀 꺼내기 → 도마 → 누르고 있기 → 접시 → 서빙 5점', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.99, 0) });
  for (let i = 0; i < 200; i++) tickSession(S, 0.05, { pos: at('crate_rice') });
  assert.equal(S.tickets[0].menu, 'riceball');
  assert.equal(contextAt(S, at('crate_rice')).do, 'take');
  actAt(S, at('crate_rice'), { take: yes });
  assert.equal(S.held.kind, 'rice');
  assert.equal(contextAt(S, at('board')).do, 'put');
  actAt(S, at('board'), { take: yes });
  for (let k = 0; k < 4; k++) {
    assert.equal(contextAt(S, at('board')).do, 'chop');
    actAt(S, at('board'), { take: yes });
    for (let i = 0; i < 6; i++) tickSession(S, 0.05, { pos: at('board') });
  }
  assert.equal(contextAt(S, at('board')).do, 'pick');
  actAt(S, at('board'), { take: yes });
  actAt(S, at('plates'), { take: yes });
  assert.equal(S.held.plated, true);
  const tb = HALL.tables[S.tickets[0].table];
  const near = { x: tb[0], z: tb[1] + 1.0 };
  assert.equal(contextAt(S, near).do, 'serve');
  const sv = actAt(S, near, { take: yes }).find(e => e.type === 'served');
  assert.equal(sv.stars, 5);
  assert.equal(sv.menu, 'riceball');
  assert.equal(sv.coins, 25);
});

test('창고가 비면 상자에서 못 꺼낸다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  const ev = actAt(S, at('crate_fish'), { take: () => false });
  assert.equal(S.held, null);
  assert.ok(ev.some(e => e.type === 'empty' && e.kind === 'fish'));
});

test('팬: 초록에서 뒤집으면 q=1, 안 뒤집으면 0.75, 너무 늦게 꺼내면 burnt', () => {
  const run = (flipAt, pickAt) => {
    const S = createSession({ star: 1, dda: one, rng: seq(0) });
    actAt(S, at('crate_fish'), { take: yes });
    actAt(S, at('pan0'), { take: yes });
    for (let t = 0; t < pickAt; t += 0.05) {
      tickSession(S, 0.05, { pos: at('pan0') });
      if (flipAt !== null && Math.abs(t - flipAt) < 0.025) {
        assert.equal(contextAt(S, at('pan0')).do, 'flip');
        actAt(S, at('pan0'), { take: yes });
      }
    }
    assert.equal(contextAt(S, at('pan0')).do, 'pickCook');
    actAt(S, at('pan0'), { take: yes });
    return S.held;
  };
  assert.equal(run(2.7, 6).q, 1);
  assert.equal(run(1.0, 6).q, 0.75);
  assert.equal(run(null, 6).q, 0.75);
  assert.equal(run(2.7, 12).kind, 'burnt');
});

test('★1 에서는 냄비가 없다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  assert.equal(contextAt(S, at('pot')), null);
});

test('아무것도 안 하면 손님 2명이 못 받고 끝난다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0.2, 0.7, 0.4) });
  let ended = false;
  for (let i = 0; i < (SERVICE_SEC + 40) / 0.05 && !ended; i++) {
    if (tickSession(S, 0.05, { pos: at('board') }).some(e => e.type === 'end')) ended = true;
  }
  assert.ok(ended);
  const r = finishSession(S);
  assert.equal(r.served, 0);
  assert.equal(r.unserved, 2);
  assert.equal(r.avg, 1);
});
```

추가 "완주 봇" 테스트: 주문표를 보고 위 동선대로 처리하는 스크립트 봇(순간이동 위치로 행동)이 ★1 한 판에서 `served >= 6`, `avg >= 4` 를 낸다.

- [ ] **Step 2:** FAIL 확인. **Step 3:** 구현. **Step 4:** PASS + `npm test`. **Step 5:** 커밋 `feat(restaurant): pure service session state machine with bot playthrough test`

---

### Task 3: 저장·해금·공간 플래그 배선

**Files:**
- Modify `js/game.js`:
  - gameState 리터럴 `restaurant: defaultRestaurant()`, applySave `gameState.restaurant = sanitizeRestaurant(saved.restaurant)`.
  - `let atRestaurant = false, restaurantInGroup = null`, `$w` 접근자, export 목록.
  - `_spaceFlags`·`spaceFlags()`, `setSpaceVisible`(`restaurantInGroup.visible = atRestaurant`).
  - 비 소리·계절 흐름·비·오라·발자국·우산·도구 안개 목록, `toolZoneKey`(→`'restaurant'`, `js/data/tools.js` `ZONE_PAGE.restaurant='none'`), `hintPlace`, `startMetrics` place, 미니맵 place·중심·반경·표식.
  - `updatePlayer` 클램프(`RESTAURANT ± HALL.half - 0.7`), `userCamOn` 제외, `updateDayNight` 조명(카페 값 복사), 행동 분기 `nearDoor==='restaurant'|'restaurantexit'`.
  - `VILLAGE_PLACES` 🍽️ 식당, `PLACE_UNLOCK['식당']='restaurant'`, `window.__space.restaurant`.
  - `getGameState` 저장 위치: 실내면 문 앞 `(12, 24.4)` 으로 저장.
- Modify: `js/shadow-scope.js` `OUT_OF_REACH_FLAGS`, `js/spaces/doors.js` `updateZoneHint`·`inVillage2`, `js/spaces/outdoor-decor.js` `outdoorZone`, `js/spaces/sea.js:94`, `js/spaces/farm-auto.js:551` 카페 검사 옆에 식당.
- Modify: `js/world/unlocks.js` `{ id: 'restaurant', kind: 'place', when: s => branch(s,'kitchen','habitat') }`.
- Test: `tests/restaurant-wiring.test.mjs`(`tests/observatory-wiring.test.mjs` 방식, 위 목록마다 assert), `tests/world-unlocks.test.mjs` 에 `restaurant`, `tests/shadow-scope.test.mjs` 에 플래그.

- [ ] **Step 1:** 배선 테스트 먼저, FAIL 확인.
- [ ] **Step 2:** 등록 한 줄씩. `grep -n atCafe js/game.js js/spaces/*.js js/shadow-scope.js` 로 다시 훑어 빠진 곳 확인(산장 `inCafe()` 는 다른 기능).
- [ ] **Step 3:** PASS + `npm test`. **Step 4:** 커밋 `feat(restaurant): register the restaurant space flag, save key and unlock`

---

### Task 4: 비스트로 외관(합친 메시)과 마을 배치

**Files:**
- Create: `js/restaurant/exterior.js`: 시안 `bistro()` 를 `part()`/`mergedMesh()` 로 옮김. 불투명 몸체 1, 저녁 발광부 1(창·지붕창·줄전구), 쇠 부품 1, 칠판·간판 1 = 메시 4개 + PointLight 2개(낮 0).
- Create: `js/spaces/restaurant.js` 의 `spawnRestaurantGate()`.
- Modify: `js/game.js`(`lockFrom('restaurant'); spawnRestaurantGate(); lockTo();` 카페 줄 옆, 나무 제외 사슬 `dist2D({x,z}, RESTAURANT_GATE) < 6`, 꽃·풀 제외 루프 같은 줄), `js/spaces/glade.js:42`, `js/data/catalog.js:265 kilnAvoidPoints`.
- Test: `tests/restaurant-exterior.test.mjs`(three 로 모형 생성, 메시 ≤6, 바운딩 x폭 6.4~7.2·높이 4.5~5.6, 정면 +z, 발광 재질 `userData.glow`).

배치:
- 중심 `(12, 20.5)`, 회전 0.
- 충돌: 몸체 `solidBox(8.9, 18.1, 15.1, 22.9)`, 테라스 원탁 `solidCircle(10, 24.0, 0.5)`·`solidCircle(14, 24.0, 0.5)`, 줄전구 기둥 `solidCircle(8.75, 25, 0.15)`·`solidCircle(15.25, 25, 0.15)`. 문 앞 (12, 23.6) 은 비운다.
- 팻말 `makeSignpost('🍽️ 식당', ...)` 건물 왼쪽 앞.
- 겹침 측정: 별 보는 아이 NPC (6, 20.5), 정류장 (16, 17), 계곡 반딧불 반경. 겹치면 `RESTAURANT_GATE` 를 0.5 단위로 옮기고 다시 캡처.
- 밤 점등: 발광 재질을 `houseWindows` 에 넣고, PointLight 세기는 `nightLevel` 에 맞춰 0~6.

- [ ] 테스트 FAIL → 구현 → 브라우저 캡처(낮·저녁 PC, 가로 폰)를 시안 `sims/restaurant-look/rl-bistro-*.png` 와 나란히 비교, `__perf()` 로 마을 드로우콜 증가 ≤6 → 커밋 `feat(restaurant): bistro exterior next to the cafe with merged meshes`

---

### Task 5: 문·진입·퇴장

**Files:**
- Modify: `js/spaces/restaurant.js`(`enterRestaurant`, `exitRestaurant`, `updateRestaurantInteract`), `js/spaces/doors.js`(마을: `isOpen('restaurant') && dist2D({x:12,z:23.6}, player) < 2.2` → `'restaurant'`, 실내: 문 1.9 안 → `'restaurantexit'`, 아니면 `updateRestaurantInteract()`), `index.html` 문 아이콘 정규식에 '식당'·'영업' → 🍽️.
- 진입: `$w.atRestaurant = true`, `setFogExempt(player,true)`, 플레이어를 문 안쪽에, `snapCamera(); setSpaceVisible()`, `trackEvent('enter_restaurant')`, 처음이면 `grantStarter` 후 저장·토스트.
- 퇴장: 영업 중이면 세션을 결과 없이 버린다(기획서 10절). 플레이어 `(12, 0, 24.4)`, `trackEvent('exit_restaurant')`.
- Test: 배선 테스트에 doors 분기·행동 분기·taxonomy 행(`enter_restaurant`, `exit_restaurant`).

- [ ] TDD 순서 동일. 커밋 `feat(restaurant): door prompt, enter and exit`

---

### Task 6: 실내 방·설비·손님 모형

**Files:**
- Create: `js/restaurant/hall.js`: `buildHall(group)` → 정적 방(바닥·벽·배식대·문 매트·화분) 합친 메시 ≤8, 설비별 그룹(별 단계로 보이기/숨기기), 테이블 4개, 칠판, `setStationItem(id, item)` 이 올리는 음식 모형(시뮬 `itemMesh` 이식), 손님은 마을 주민 모형 빌더 재사용.
- 색(R8): 홀 바닥 나무 `0xc99a63`, 주방 바닥 타일 `0xe9e4da`/`0xd8cfbf`, 벽 크림 `0xf3e6cc` + 징두리 초록 `0x2f5e47`, 조리대 상판 `0x2f6b4f`.
- 충돌: 벽·조리대·테이블 `solidBox`/`solidCircle`(로컬→월드).
- 확인: PC·가로 폰 캡처를 시뮬 화면과 나란히 `dev/active/restaurant-port/hall-compare.png` 로 저장해 사용자에게 보여 준다.

- [ ] 커밋 `feat(restaurant): hall interior, stations and guest models`

---

### Task 7: 영업 런타임·HUD·입력

**Files:**
- Create: `js/restaurant/index.js`(매 프레임 `tickSession` → 모형·HUD 반영, 행동 버튼 → `actAt`, 창고 차감 `takeIngredient` + 저장), `js/restaurant/hud.js`(위쪽 주문표: 테이블 번호·메뉴 이모지·기다림 막대, 설비 위 진행 링(초록 깜빡임=완벽), 결과 카드, 평판 패널 ⭐/ℹ️).
- 손놀림 HUD(R4): 도마 위 박자 칸 ▢▢▢▢(탭마다 채움, 0.35초 박자로 깜빡여 리듬 안내), 팬 위 게이지(초록 구간 = `flipZone(dda.win)`, 뒤집기 성공 ✨·실패 💨), 냄비 위 진행 링(초록 깜빡임 = 완벽). 입력은 기존 행동 버튼 탭 하나(`doAction`)만 쓴다.
- 영업 끝: `finishSession` → `adjustDda`, `services+1`, `earnCoins`, `starUpReady` 면 `applyStarUp` + 보상 + 축하 카드, `trackEvent('restaurant_service', { star, served, avg_score, dda })`, 별 올림 시 `trackEvent('restaurant_star_up', { star })`, 저장. 서빙 때마다 `recordServe`.
- 손님 머리 위: 메뉴 이모지만, 기다림에 따라 😊🙂😟.
- Test: 배선 테스트에 이벤트 파라미터 ≤5, taxonomy 행.

- [ ] 커밋 `feat(restaurant): service runtime, order tickets, result card and reputation panel`

---

### Task 8: 첫 영업 길 안내

**Files:**
- Create: `js/restaurant/guide-steps.js`(Task 0 확정 문구 8단계), `createGuide` 재사용(`flow: 'restaurant'`, `guide_step` 재사용).
- 시작 조건: `isOpen('restaurant') && !restaurant.guideDone` 이고 다른 안내가 돌고 있지 않을 때. 1단계는 마을에서 식당 문까지 경유점 안내, 2~8단계는 칠판→상자→팬에 올리기→초록에서 뒤집기→다 익으면 꺼내기→접시→테이블.
- 첫 영업은 손님 1명 고정, 첫 메뉴 🐟 생선구이, 인내 1.2배.
- 검증: 화살표만 따라가는 봇으로 마을 시작점에서 첫 서빙까지 완주.

- [ ] 커밋 `feat(restaurant): first service guide`

---

### Task 9: 마무리 검증

- [ ] `npm test` 전체 PASS.
- [ ] 봇: 첫 영업 안내 완주, ★1 한 판 `served ≥ 6`·평균 ★4 이상, ★2 저장으로 냄비·생선국 동작.
- [ ] `__perf()`: 마을 드로우콜 증가 ≤6, 실내 ≤ 카페 홀 수준.
- [ ] 새 인스턴스 함정 8곳(SEA_FISHING_PLAN §7) 체크.
- [ ] code-reviewer 에이전트 리뷰 → 지적 반영.
- [ ] `dev/active/restaurant-port/` 세 파일 갱신, 기획서 3·10절에 R1~R8 반영.
- [ ] 커밋만. 병합·배포는 사용자 승인 뒤.
