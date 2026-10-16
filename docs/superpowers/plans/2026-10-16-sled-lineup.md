# 썰매 라인업 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 장단점이 다른 썰매 5종(나무·터보건·바람·도토리·스키프)을 곡선 조형으로 넣고, 능력 썰매 3종을 코인 1,500과 웹 현금 ₩3,900으로 판다.

**Architecture:** 썰매 데이터의 단일 출처 `js/mountain/sled-lineup.js` 가 이름·능력치·물리·가격·팔레트를 갖는다. 물리(`sled.js`)는 썰매별 물리 묶음을 상태에 실어 계산하고, 조형(`sled-art.js`)은 id 별 빌더로 병합 메시 1개를 만든다. 현금 판매는 펫과 같은 "별도 kind" 방식으로 웹훅·원장 병합·시드에 `kind: 'sled'` 를 추가한다.

**Tech Stack:** Three.js 0.160 ES modules (번들러 없음), node:test (`npm test`), Supabase(Postgres, 풀러 직접 실행), Paddle Billing.

**Spec:** `docs/superpowers/specs/2026-10-16-sled-lineup-design.md`

## Global Constraints

- 코드·CSS·테스트에 주석을 넣지 않는다.
- 새 코드는 `js/mountain/*` 또는 `js/shop/*` 에 둔다. `js/game.js` 에는 필요하면 훅 한 줄만.
- 불변 갱신(스프레드)만 쓴다. 기존 함수 시그니처는 기본값으로 호환을 지킨다.
- 이상적 완주 시간(도토리 최대 = `ACORNS.length` 6개, 충돌 0): 모든 썰매가 basic 대비 ±0.1초.
- 썰매 1대 = 병합 메시 1개, 정점 ≤ 6,000.
- 썰매 물리 값은 스펙 §3 표 그대로. `PHYS_V = 2`.
- 화면 문구는 스펙 §4 확정 문구만(터보건 2문구 포함, 2026-10-16 확정).
- 색은 시안 `dev/active/mountain-sled/proto/sled-lineup.html` 의 `STYLES.f` 값 그대로.
- 현금 버튼은 `cashAvailable()` 가 true 일 때만. 서버 프리미엄 가드 목록에는 썰매를 넣지 않는다.
- 커밋은 `git commit -F <file>` 로. 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: 라인업 데이터 + 이상적 시간 계산기 + 공정성 테스트

**Files:**
- Create: `js/mountain/sled-lineup.js`
- Create: `js/mountain/sled-ideal.js`
- Test: `tests/sled-balance.test.mjs`

**Interfaces:**
- Produces: `SLED_LINEUP` (frozen, 키 순서 `basic, sky, forest, starry, toboggan, wind, acorn, skiff`), `SLED_IDS`, `sledOf(id)` (없으면 basic), `physOf(id)` (PHYS 와 합친 완전한 물리 묶음), `CASH_SLED_IDS = ['wind','acorn','skiff']`, `STAT_NAMES = ['속도','커브','튼튼함','도토리']`.
- Produces: `idealTimeMs(phys, acorns)` — 충돌 0, 부스터를 쓸 수 있을 때마다 즉시 쓰고 직선 주행한다고 보고 4ms 스텝으로 적분한 완주 시간(ms).

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLED_LINEUP, SLED_IDS, physOf, sledOf, CASH_SLED_IDS } from '../js/mountain/sled-lineup.js';
import { idealTimeMs } from '../js/mountain/sled-ideal.js';
import { ACORNS } from '../js/mountain/climb.js';

test('every sled has the same ideal time with the reachable acorn max', () => {
  const base = idealTimeMs(physOf('basic'), ACORNS.length);
  for (const id of SLED_IDS) assert.ok(Math.abs(idealTimeMs(physOf(id), ACORNS.length) - base) <= 100, id);
});

test('trade-offs show at low acorn counts', () => {
  assert.ok(idealTimeMs(physOf('wind'), 0) < idealTimeMs(physOf('basic'), 0) - 1500);
  assert.ok(idealTimeMs(physOf('acorn'), 0) > idealTimeMs(physOf('basic'), 0) + 500);
});

test('lineup order, cash sleds and fallbacks', () => {
  assert.deepEqual(SLED_IDS, ['basic', 'sky', 'forest', 'starry', 'toboggan', 'wind', 'acorn', 'skiff']);
  assert.deepEqual(CASH_SLED_IDS, ['wind', 'acorn', 'skiff']);
  for (const id of CASH_SLED_IDS) { assert.equal(SLED_LINEUP[id].coins, 1500); assert.equal(SLED_LINEUP[id].cashWon, 3900); }
  assert.equal(sledOf('nope').id, 'basic');
  assert.equal(SLED_LINEUP.toboggan.needs, 'finish');
  assert.equal(SLED_LINEUP.starry.needs, 'perfect');
});

test('peak speed stays under the server floor speed', () => {
  for (const id of SLED_IDS) { const p = physOf(id); assert.ok(p.baseSpeed * p.boostMult < 24, id); }
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/sled-balance.test.mjs` → 모듈 없음.

- [ ] **Step 3: 구현**

`sled-lineup.js`: `import { PHYS } from './sled.js'`. 각 항목 `{ id, ico, name, line, stats:[속도,커브,튼튼함,도토리], model, palette, phys, coins, cashWon, needs }`.
- basic: model 'davos', 🛷 '나무 썰매', line '균형 잡힌 기본 썰매', stats [3,3,3,3], coins 0, phys {}.
- sky/forest/starry: model 'davos', 이름은 기존 cafe-catalog 값(하늘 썰매·숲 썰매·별밤 썰매), line '균형 잡힌 기본 썰매', stats [3,3,3,3], coins 400/400/900, starry needs 'perfect', palette 는 기존 `SLED_SKINS` 색을 davos 팔레트 키로 옮긴 것(wood←wood, dark←woodDark, metal←runner, accent←runner, starry 는 `stars: true`).
- toboggan: model 'toboggan', ⛄ '눈뭉치 터보건', line '부딪혀도 덜 느려져요. 커브는 둔해요', stats [3,2,5,3], coins 0, needs 'finish', phys { steerRate: 5.2, hitSlowMult: 0.65, hitRecoverMs: 1100 }.
- wind: model 'bobsled', 💨 '바람 썰매', line '기본 속도가 빨라요. 도토리 힘은 약해요', stats [5,3,2,1], coins 1500, cashWon 3900, phys { baseSpeed: 9.1, boostMult: 1.31 }.
- acorn: model 'acorn', 🌰 '도토리 로켓', line '도토리 부스터가 세요. 출발이 느려요', stats [2,3,3,5], coins 1500, cashWon 3900, phys { baseSpeed: 8.4, accel: 5.0, boostMult: 1.60 }.
- skiff: model 'skiff', ⛸️ '얼음 스키프', line '커브가 날렵해요. 부딪히면 오래 느려요', stats [3,5,1,3], coins 1500, cashWon 3900, phys { steerRate: 8.2, hitRecoverMs: 1900 }.
- palette(davos 외): 시안 `STYLES.f` 의 tank/turbo/rocket/skate 값 그대로. basic 팔레트는 `STYLES.f.basic`.
- `physOf(id) = Object.freeze({ ...PHYS, ...sledOf(id).phys })`.

`sled-ideal.js`:

```js
import { COURSE } from './course.js';

export function idealTimeMs(p, acorns, length = COURSE.length, dt = 4) {
  let z = 0, v = p.baseSpeed * 0.5, t = 0, boost = 0, left = acorns;
  while (z < length) {
    if (left > 0 && boost <= 0) { left -= 1; boost = p.boostMs; }
    const goal = Math.min(p.maxSpeed * p.boostMult, p.baseSpeed * (boost > 0 ? p.boostMult : 1));
    const rate = p.accel * dt / 1000 * (goal < v ? 4 : 1);
    v += Math.sign(goal - v) * Math.min(Math.abs(goal - v), rate);
    z += v * dt / 1000;
    t += dt;
    boost = Math.max(0, boost - dt);
  }
  return t;
}
```

- [ ] **Step 4: 통과 확인** — `node --test tests/sled-balance.test.mjs` → PASS.
- [ ] **Step 5: 커밋** — `feat(mountain): sled lineup data and ideal-time balance test`

---

### Task 2: 썰매별 물리 + PHYS_V 2

**Files:**
- Modify: `js/mountain/sled.js`, `js/spaces/mountain.js` (createSled 호출 ~416), `js/mountain/sled-run.js`
- Test: `tests/mountain-sled-physics.test.mjs`

**Interfaces:**
- Consumes: `physOf(id)` (Task 1). `sled-lineup.js` 가 `sled.js` 의 `PHYS` 를 import 하므로 `sled.js` 는 `sled-lineup.js` 를 import 하지 않는다(순환 금지).
- Produces: `createSled(acorns, phys = PHYS)` → 상태에 `phys`. `tryBoost`·`stepSled`·`finalTimeMs` 는 `s.phys` 사용. `PHYS_V = 2`.

- [ ] **Step 1: 실패하는 테스트** (기존 파일에 추가)

```js
test('createSled carries its physics and stepSled uses it', () => {
  const fast = { ...PHYS, baseSpeed: 9.1 };
  let a = createSled(0), b = createSled(0, fast);
  for (let i = 0; i < 300; i++) { a = stepSled(a, 16, 0); b = stepSled(b, 16, 0); }
  assert.ok(b.z > a.z);
  assert.equal(PHYS_V, 2);
});
test('hit recovery follows the sled physics', () => {
  const s = createSled(0, { ...PHYS, hitRecoverMs: 1100 });
  assert.equal(s.phys.hitRecoverMs, 1100);
});
```

`PHYS_V === 1` 을 고정한 기존 줄은 2로.

- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `targetSpeed`·`stepSled`·`collide`·`tryBoost`·`finalTimeMs` 의 `PHYS.` 를 `s.phys.` 로. `createSled` 초기 속도 `phys.baseSpeed * 0.5`. `js/spaces/mountain.js` 의 `createSled(...)` 에 `physOf(sledSkin())`. 깃발 감점(`flagPenaltyMs`)은 공통이라 그대로.
- [ ] **Step 4: `npm test` 전체 통과** (행의 `phys_v` 를 1로 고정한 테스트는 2로)
- [ ] **Step 5: 커밋** — `feat(mountain): per-sled physics, PHYS_V 2`

---

### Task 3: 곡선 조형 5종 (F 투톤 아이스크림)

**Files:**
- Modify: `js/mountain/sled-art.js`
- Create: `js/mountain/sled-models.js`
- Test: `tests/mountain-sled-skins.test.mjs`

**Interfaces:**
- Consumes: `SLED_LINEUP[id].model`, `.palette` (Task 1), `colored`·`mergeColored` (`js/mountain/merge-colored.js`).
- Produces: `buildSledGeometry(THREE, id = 'basic')` (모르는 id → basic), `buildSledMesh(THREE, id)`, `setSledSkin(mesh, THREE, id)` — 기존 이름·시그니처 유지.

- [ ] **Step 1: 실패하는 테스트**

```js
import { SLED_IDS } from '../js/mountain/sled-lineup.js';
test('every lineup sled builds one coloured geometry under the vertex budget', () => {
  for (const id of SLED_IDS) {
    const g = buildSledGeometry(THREE, id);
    assert.ok(g.getAttribute('color'), id);
    assert.ok(g.getAttribute('position').count <= 6000, id);
    assert.ok(g.getAttribute('position').count > 300, id);
  }
});
test('models differ in silhouette length', () => {
  const len = id => { const g = buildSledGeometry(THREE, id); g.computeBoundingBox(); return g.boundingBox.max.z - g.boundingBox.min.z; };
  assert.ok(len('skiff') > len('acorn'));
});
```

`SLED_SKINS` 키와 `SLED_SKIN_IDS` 를 비교하던 테스트는 `SLED_IDS` 기준으로 바꾼다.

- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — 시안의 `tube`·`latheZ`·`rbox`·`bend`·`slab`·`side` 도우미와 `BUILD.basic/tank/turbo/rocket/skate` 를 `sled-models.js` 로 옮기고 이름을 `davos/toboggan/bobsled/acorn/skiff` 로. 시안의 스타일 분기는 F 결과로 고정(줄무늬 색 `0xfff6ea`, 도토리 눈 켬, 나뭇결 끔). `col()` 대신 `colored()`, 병합은 `mergeColored()`. davos 는 `palette.stars` 면 기존 별 5개를 판 위에. 좌표계는 기존과 같다(+z 앞, 바닥 y≈0). 앉는 높이를 쓰는 곳(`grep -rn SLED_DECK_TOP js`)을 확인하고, 모델별 높이가 다르면 `deckTopOf(id)` 를 export 해 호출부를 바꾼다.
- [ ] **Step 4: `npm test` 통과 + 브라우저(미리보기 `mountain-sled` 8807, `?dbg=1`) 5종 탑승 스크린샷 — 캐릭터가 뜨거나 파묻히지 않는지**
- [ ] **Step 5: 커밋** — `feat(mountain): curved sled models for the lineup`

---

### Task 4: 카페 썰매 탭 + 세이브 + 터보건 첫 완주 지급

**Files:**
- Modify: `js/mountain/save.js`, `js/mountain/cafe-catalog.js`, `js/mountain/cafe-shop.js`, `js/mountain/cafe-ui.js`, `js/spaces/mountain.js`, `js/i18n-en.js`
- Test: 기존 카페·세이브 테스트 파일(`ls tests | grep -i "cafe\|mountain-save"` 로 확인)

**Interfaces:**
- Consumes: `SLED_LINEUP`, `SLED_IDS`, `STAT_NAMES`.
- Produces: `save.js` 의 `SLED_SKIN_IDS` 는 `SLED_IDS` 재수출(이름 유지). `grantFinishSled(hut)` → 터보건이 없으면 추가한 새 hut, 있으면 같은 객체. `TOBOGGAN_LOCK`, `TOBOGGAN_TOAST` 문구 상수.

- [ ] **Step 1: 실패하는 테스트**
  - `restoreMountain({ hut: { sleds: ['basic','wind','acorn','zzz'], sled: 'acorn' } }).hut` → `{ sleds: ['basic','wind','acorn'], sled: 'acorn' }`.
  - `restoreMountain({ sled: { best: 40000, plays: 3 } }).hut.sleds` 에 `toboggan` 포함(기존 완주자 소급).
  - `grantFinishSled({ sleds:['basic'], sled:'basic' })` → sleds `['basic','toboggan']`, sled 그대로.
  - `itemsOfTab('sled').map(i => i.id)` → `SLED_IDS`.
  - 터보건 행: 미보유 → `{ kind: 'locked', label: TOBOGGAN_LOCK }`, 보유 → 'ride'.
  - wind 행 미보유 → `{ kind:'buy', label:'1,500🪙' }`.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
  - `cafe-catalog.js` 썰매 줄을 `SLED_IDS` 에서 만든다(ico·name·coins·needs·line·stats).
  - `cafe-shop.js` `rowOf`: `needs === 'finish'` 이고 미보유면 locked + `TOBOGGAN_LOCK`.
  - `save.js` `restoreHut`: 허용 = `SLED_IDS`, `best` 정수면 toboggan 소급.
  - `js/spaces/mountain.js`: 완주 처리 지점에서 `grantFinishSled` 결과가 바뀌면 hut 갱신 + `TOBOGGAN_TOAST` 1회.
  - `cafe-ui.js` 썰매 탭 행: 이름 아래 `line`, 그 아래 `속도 ●●●○○` 4개를 2열 작은 글씨. 360px 폭에서 버튼과 겹치지 않게. 다른 탭은 그대로.
  - `i18n-en.js`: 새 이름·한 줄·능력치 이름·두 문구.
- [ ] **Step 4: `npm test` 통과 + 브라우저 썰매 탭 스크린샷(모바일 390, PC)**
- [ ] **Step 5: 커밋** — `feat(mountain): sled lineup in the hut cafe, toboggan on first finish`

---

### Task 5: 웹 현금 판매 (kind 'sled')

**Files:**
- Modify: `js/shop/price-ids.js`, `js/mountain/sled-lineup.js`, `functions/api/_paddle.js`(`priceIndex`), `js/shop/entitlements.js`, `scripts/lib/paddle-seed.mjs`(`buildPlan`) 와 `scripts/paddle-seed.mjs`, `js/mountain/cafe-ui.js`, `js/spaces/mountain.js`, `js/spaces/cafe.js`(현금 버튼 공용화만)
- Test: 기존 `tests/entitlements.test.mjs`, `tests/paddle-seed.test.mjs`, 웹훅 테스트 파일, 새 `tests/sled-cash.test.mjs`

**Interfaces:**
- Consumes: `CASH_SLED_IDS`, `SLED_LINEUP[id].cashWon`, `cashFor(id, null, won)` (`js/shop/cash.js`), `cashAvailable`·`openCheckout` (`js/shop/paddle.js`).
- Produces: `sledCash(id)` → `cashFor(id, null, cashWon)` 또는 null. `priceIndex()` 에 `{ itemId, kind: 'sled' }`. `applyPurchases` 가 `kind 'sled'` 를 처리하고, 썰매가 오갔을 때만 patch 에 `mountain` 을 싣는다.

- [ ] **Step 1: 실패하는 테스트**
  - `applyPurchases(gs, [{ item_id:'wind' }])` → `patch.mountain.hut.sleds` 에 wind, `granted[0].kind === 'sled'`, `cashOwned` 에 wind.
  - 회수: `cashOwned:['wind']`, 행 `[{ item_id:'wind', revoked_at:'2026-10-20T00:00:00Z' }]`, `hut.sled:'wind'` → sleds 에서 빠지고 sled 'basic'.
  - 썰매가 오가지 않으면 patch 에 `mountain` 키 없음.
  - 시드 계획에 wind/acorn/skiff 가 `amount '3900'`, `kind 'sled'` 로 나온다(현 `buildPlan` 시그니처를 보고 호환되게 확장).
  - priceId 가 있는 썰매만 `priceIndex()` 에 `kind:'sled'` 로 들어간다.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
  - `price-ids.js` 에 `wind: null, acorn: null, skiff: null`.
  - `cafe.js` 의 `cashButton`·`setCheckoutHandlers`·`awaitGrant` 흐름을 먼저 읽는다. 완료 → 원장 동기화가 kind 와 무관하면 재사용하고, 완료 뒤 `refreshCafeModal()` 만 추가. `cashButton` 이 `drawCosMenu` 에 묶여 있으면 다시 그리기 콜백을 인자로 받게 최소 변경.
  - 카페 썰매 행: `rowOf` 가 'buy' 이고 `sledCash(id)` 가 있고 `cashAvailable(...)` 이면 코인 버튼 옆 현금 버튼(라벨 `cash.label`).
  - 트래킹: 코인 구매 `hut_cafe_buy` 에 `pay: 'coin'` 추가. 현금은 기존 `cash_checkout_open`(kind 'sled').
  - 서버 프리미엄 가드 SQL 은 건드리지 않는다.
- [ ] **Step 4: `npm test` 통과** + 개발 세션에서 priceId 가 null 이면 현금 버튼이 숨는지 확인
- [ ] **Step 5: 커밋** — `feat(shop): sell power sleds for web cash alongside coins`

---

### Task 6: 기록 서버 (sled 열, phys_v 2)

**Files:**
- Create: `sql/migrations/migrate_sled_lineup.sql`
- Modify: `js/mountain/sled-run.js`
- Test: 기존 sled-run 행 테스트 파일

**Interfaces:**
- Consumes: `ctx.sledSkin`, `SLED_IDS`.
- Produces: `sled_runs.sled text`, CHECK `sled is null or sled in (...)`, `phys_v in (1, 2)`.

- [ ] **Step 1: 실패하는 테스트** — 행에 `sled: 'acorn'`, `phys_v: 2`. SQL 파일 CHECK 가 `SLED_IDS` 전부를 담는지 정규식 테스트.
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**

```sql
alter table public.sled_runs add column if not exists sled text;
alter table public.sled_runs drop constraint if exists sled_runs_sled;
alter table public.sled_runs add constraint sled_runs_sled check (sled is null or sled in ('basic','sky','forest','starry','toboggan','wind','acorn','skiff'));
alter table public.sled_runs drop constraint if exists sled_runs_phys_v;
alter table public.sled_runs add constraint sled_runs_phys_v check (phys_v in (1, 2));
```

`sled-run.js` 행에 `sled: ctx.sledSkin ?? 'basic'`.

- [ ] **Step 4: `npm test` 통과.** 운영 적용은 컨트롤러가 배포 때 풀러로 직접 실행(서브에이전트는 실행 금지).
- [ ] **Step 5: 커밋** — `feat(mountain): record sled id per run, phys_v 2`

---

### Task 7: 검증과 문서

**Files:**
- Modify: `dev/active/mountain-sled/mountain-sled-tasks.md`, `dev/active/mountain-sled/mountain-sled-context.md`

- [ ] **Step 1:** `npm test` 전체 통과.
- [ ] **Step 2:** 브라우저: 썰매마다 한 판(눈 오는 밤 포함) — 콘솔 오류 0, 드로우콜 기존 대비 +0, 카페 썰매 탭 PC·모바일.
- [ ] **Step 3:** 배포 점검표: SQL 적용 → 웹·토스·itch·안드로이드·iOS 동시 배포 → ⚠️ Paddle 시드(production, 사용자 확인) → price-ids 커밋 → 웹 재배포. 2주 뒤 `sled_runs.sled` 별 평균 기록·충돌 수 비교 쿼리 메모.
- [ ] **Step 4:** 커밋 — `docs(mountain): sled lineup deploy checklist`
