# 💎 프리미엄 2단계 — 전신 스킨 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 🧥 스킨 칸을 새로 만들고, 현금 전용 전신 스킨 🌿 숲의 정령(S3)과 🧸 플러시 인형(P1)을 동물 7종에 덧입히며, 구매 직후 B+C 상자 폭발 연출을 띄운다.

**Architecture:** 카탈로그에 `skin` 칸과 `won` 상품 두 개를 더한다. 스킨은 `buildAnimalMesh` 결과를 받아 재질·장식을 바꾸는 함수 하나(`js/cosmetics/skin.js`)이고, 판정은 순수 함수(`js/cosmetics/skin-rules.js`)에 둔다. 게임은 스킨이 바뀌면 캐릭터를 다시 조립한다. 연출은 기존 `purchase-reveal.js` 에 `boxburst` 모드를 더한다.

**Tech Stack:** Vanilla JS ES modules · three r160(importmap, node 에선 import 불가) · `node --test`

**Spec:** `docs/superpowers/specs/2026-10-01-premium-skins-design.md` (먼저 읽는다). 승인 시안: `sims/skin-look-sim.html`(S3·P1 코드 원본), `sims/premium-reveal-sim.html`(mode D).

## Global Constraints

- 작업 디렉터리: `/Users/uicheol_hwang/calm_forest/.claude/worktrees/premium-skins` · 브랜치 `feat/premium-skins`. 루트 checkout 에서 작업하지 않는다.
- 테스트: `npm test` (= `node --test tests/*.test.mjs`). node 테스트는 `three` 를 import 할 수 없다 → THREE 를 쓰는 파일은 **소스 텍스트 검사**(`readFileSync`) 또는 `tests/helpers/game-source.mjs` 의 `gameSource()` 로 검사한다.
- 순수 함수는 **새 객체를 돌려준다**(제자리 변경 금지).
- 블룸 임계 0.85 — 넓은 면에 쓰는 색의 luma 는 그 아래.
- 캐릭터 기존 재질·지오메트리를 **dispose 하지 않는다**(월드 캐릭터와 공유). 스킨이 새로 만든 지오메트리만 버린다.
- 🚨 도구 휘두르는 모션(`playerArms`·`heldGroup` 회전)은 건드리지 않는다.
- 새 코드는 `game.js` 에 몰지 않는다 — 배선 몇 줄만 game.js, 본문은 `js/cosmetics/*`.
- 문구(스펙 §7, 검수 완료): 숲의 정령 / 밤이면 몸속에서 반딧불이 떠다녀요 · 플러시 인형 / 꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑 · PREMIUM · 전신 스킨 · 바로 입어보기 · 🧥 스킨.
- 커밋 메시지는 영어 conventional(`feat:`/`fix:`/`test:`/`docs:`), 끝에 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 브라우저 확인용 미리보기 서버: 루트 `/Users/uicheol_hwang/calm_forest/.claude/launch.json` 에 `premium-skins` 설정(포트 8022, `python3 -m http.server 8022 --directory <이 워크트리 절대경로>`)을 쓴다. 없으면 추가한다(작업 끝나면 컨트롤러가 되돌린다). 브라우저 패널이 가려지면 rAF 가 멈춘다 → 캡처 전 `tabs_select`.

---

## File Structure

| 파일 | 책임 | 작업 |
|---|---|---|
| `js/cosmetics/catalog.js` | SLOTS·상품 표 | 수정: `skin` 칸 + 2상품 |
| `js/shop/price-ids.js` | priceId 표 | 수정: 2칸 null |
| `js/cosmetics/skin-rules.js` | 순수 판정(effectiveTrail·squashOf) | 신규 |
| `js/animal-faces.js` | 머리 조립 | 수정: `userData.part` 표식 |
| `js/cosmetics/trail.js` | 자국 조형 | 수정: `sprout` 자국 + `mergeGeos` export |
| `js/cosmetics/skin.js` | 스킨 조형(applySkin·disposeSkin) | 신규 |
| `js/game.js` | 배선 | 수정: 표식·kk.id·applyCharacter·applyCosmetics·buildCharacterMesh·미리보기 루프·updateTrail·걷기 블록 |
| `js/shop/premium-row.js` | 가게 행 판정 | 수정: `slotVisible` 추가 |
| `js/spaces/cafe.js` · `js/spaces/wardrobe.js` | 가게·옷장 탭 / 연출 호출 | 수정 |
| `js/shop/reveal-pose.js` · `js/shop/purchase-reveal.js` · `index.html` | 연출 B+C | 수정 |
| `js/i18n-en.js` | 영어 사전 | 수정 |

---

### Task 1: 카탈로그 — 🧥 skin 칸과 현금 전용 스킨 2종

**Files:**
- Modify: `js/cosmetics/catalog.js` (SLOTS 줄, RAW 💎 프리미엄 블록 뒤)
- Modify: `js/shop/price-ids.js` (💎 프리미엄 줄)
- Test: `tests/cosmetics-catalog.test.mjs`, `tests/cosmetics-equip.test.mjs`, `tests/cash.test.mjs`, `tests/paddle-seed.test.mjs`

**Interfaces:**
- Produces: `SLOTS` = `['head','neck','back','trail','skin']` · `findItem('forest_spirit')` → `{ id, slot:'skin', ico:'🌿', name:'숲의 정령', tier:'프리미엄', premium:true, price:{ coins:null, won:10000, cash:null } }` · `plush_doll` 같은 모양(🧸, '플러시 인형', 9000).

- [ ] **Step 1: 테스트를 먼저 고친다**

`tests/cosmetics-catalog.test.mjs` 첫 테스트를 바꾸고 하나 더한다:
```js
test('슬롯 5개 · 품목 22종(코인 18 + 프리미엄 자국 2 + 프리미엄 스킨 2)', () => {
  assert.deepEqual([...SLOTS], ['head', 'neck', 'back', 'trail', 'skin']);
  assert.equal(ITEMS.length, 22);
  assert.equal(itemsOf('head').length, 7);
  assert.equal(itemsOf('neck').length, 3);
  assert.equal(itemsOf('back').length, 3);
  assert.equal(itemsOf('trail').length, 7);
  assert.equal(itemsOf('skin').length, 2);
});

test('🧥 스킨 2종 — 현금 전용(won), 정령 ₩10,000 · 인형 ₩9,000', () => {
  const s = findItem('forest_spirit'), p = findItem('plush_doll');
  assert.equal(s.slot, 'skin'); assert.equal(s.name, '숲의 정령'); assert.equal(s.ico, '🌿');
  assert.equal(s.price.won, 10000); assert.equal(s.price.coins, null); assert.equal(s.premium, true);
  assert.equal(p.slot, 'skin'); assert.equal(p.name, '플러시 인형'); assert.equal(p.ico, '🧸');
  assert.equal(p.price.won, 9000); assert.equal(p.price.coins, null); assert.equal(p.premium, true);
});
```
`tests/cosmetics-equip.test.mjs` 끝에(상단 import 에 `sanitize`, `equip` 이 없으면 더한다):
```js
test('sanitize — 옛 세이브(equipped.skin 없음)는 skin=null 로 채운다', () => {
  const out = sanitize({ owned: ['cap'], equipped: { head: 'cap' } });
  assert.equal(out.equipped.skin, null);
  assert.equal(out.equipped.head, 'cap');
});

test('sanitize — 안 산 스킨이 장착돼 있으면 벗긴다 · 산 스킨은 남긴다', () => {
  assert.equal(sanitize({ owned: [], equipped: { skin: 'plush_doll' } }).equipped.skin, null);
  assert.equal(sanitize({ owned: ['plush_doll'], equipped: { skin: 'plush_doll' } }).equipped.skin, 'plush_doll');
});

test('equip — 스킨은 다른 칸과 함께 입는다(모자를 벗기지 않는다)', () => {
  const cos = { owned: ['cap', 'forest_spirit'], equipped: { head: 'cap', neck: null, back: null, trail: null, skin: null } };
  const out = equip(cos, 'forest_spirit');
  assert.equal(out.equipped.skin, 'forest_spirit');
  assert.equal(out.equipped.head, 'cap');
});
```
`tests/cash.test.mjs` 32~34행: 제목을 `PRICE_IDS 는 꾸미기 22(코인 18 + 프리미엄 4) + 펫 4 = 26칸, 값은 null 이거나 pri_ 로 시작`, 단언을 `assert.equal(keys.length, 26)` 으로.
`tests/paddle-seed.test.mjs` 23행 기대값을 `['firefly', 'rainbow', 'forest_spirit', 'plush_doll']` 로, "금액은 won" 테스트 끝에:
```js
  assert.equal(by.forest_spirit.amount, '10000');
  assert.equal(by.plush_doll.amount, '9000');
  assert.equal(by.forest_spirit.name, '숲의 정령');   // 스킨은 "○○ 자국" 이 붙지 않는다
```

- [ ] **Step 2: 실패 확인**

Run: `npm test 2>&1 | grep -E "^not ok|^# fail"`
Expected: catalog·equip(skin 관련)·cash·paddle-seed 가 FAIL.

- [ ] **Step 3: 구현**

`js/cosmetics/catalog.js`:
```js
export const SLOTS = Object.freeze(['head', 'neck', 'back', 'trail', 'skin']);
```
RAW 의 `rainbow` 줄 바로 뒤(👣 발자국 주석 앞)에:
```js
  // 🧥 전신 스킨 — 현금 전용(2026-10-01 2단계 스펙). 동물 체형은 그대로, 재질·장식만 바뀐다(js/cosmetics/skin.js)
  { id: 'forest_spirit', slot: 'skin', ico: '🌿', name: '숲의 정령',   won: 10000, tier: '프리미엄' },
  { id: 'plush_doll',    slot: 'skin', ico: '🧸', name: '플러시 인형', won: 9000,  tier: '프리미엄' },
```
`js/shop/price-ids.js` 💎 줄:
```js
  firefly: null, rainbow: null, forest_spirit: null, plush_doll: null,
```

- [ ] **Step 4: 통과 확인**

Run: `npm test 2>&1 | tail -6`
Expected: `# fail 0`. 다른 테스트가 개수(20·24)로 깨지면 같은 식으로 22·26 에 맞춘다. 그 외 실패는 원인을 고친다(테스트를 약하게 만들지 않는다).

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/catalog.js js/shop/price-ids.js tests/
git commit -m "feat: 💎 skin slot + forest spirit / plush doll cash-only items"
```

---

### Task 2: 순수 판정 — effectiveTrail · squashOf

**Files:**
- Create: `js/cosmetics/skin-rules.js`
- Test: `tests/skin-rules.test.mjs`

**Interfaces:**
- Produces:
  - `SKIN_TRAIL: { forest_spirit: 'sprout' }`
  - `effectiveTrail(cos): string|null` — 자국 칸 우선, 비었으면 스킨 자취, 없으면 null
  - `SQUASH = 0.08` · `skinSquashes(skinId): boolean`(plush_doll 만 true) · `squashOf(phase, on): number`

- [ ] **Step 1: 테스트** `tests/skin-rules.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveTrail, SKIN_TRAIL, squashOf, skinSquashes, SQUASH } from '../js/cosmetics/skin-rules.js';

const cos = (trail, skin) => ({ owned: [], equipped: { head: null, neck: null, back: null, trail, skin } });

test('effectiveTrail — 자국 칸이 우선(스펙 결정 A)', () => {
  assert.equal(effectiveTrail(cos('firefly', 'forest_spirit')), 'firefly');
});
test('effectiveTrail — 자국 칸이 비었고 정령이면 새싹', () => {
  assert.equal(effectiveTrail(cos(null, 'forest_spirit')), 'sprout');
  assert.equal(SKIN_TRAIL.forest_spirit, 'sprout');
});
test('effectiveTrail — 인형은 자취가 없다 · 둘 다 없으면 null · 깨진 입력도 null', () => {
  assert.equal(effectiveTrail(cos(null, 'plush_doll')), null);
  assert.equal(effectiveTrail(cos(null, null)), null);
  assert.equal(effectiveTrail(null), null);
  assert.equal(effectiveTrail({}), null);
});
test('effectiveTrail — 자국만 있으면 그 자국', () => {
  assert.equal(effectiveTrail(cos('paw', null)), 'paw');
});
test('squashOf — 꺼져 있으면 1, 발이 닿는 순간(sin=0) 가장 눌리고 떠 있을 때(|sin|=1) 1', () => {
  assert.equal(squashOf(1.3, false), 1);
  assert.equal(squashOf(0, true), 1 - SQUASH);
  assert.equal(squashOf(Math.PI / 2, true), 1);
  const s = squashOf(0.7, true);
  assert.ok(s > 1 - SQUASH && s < 1);
});
test('skinSquashes — 플러시 인형만', () => {
  assert.equal(skinSquashes('plush_doll'), true);
  assert.equal(skinSquashes('forest_spirit'), false);
  assert.equal(skinSquashes(null), false);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/skin-rules.test.mjs` → FAIL(모듈 없음)

- [ ] **Step 3: 구현** `js/cosmetics/skin-rules.js`:
```js
// js/cosmetics/skin-rules.js
// =============================================================
//  calm forest · 🧥 전신 스킨 규칙 (순수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-skins-design.md §2-2·§3-2
//  ▶ 정령 자취는 **자국 칸이 비었을 때만**(결정 A, sims/skin-trail-rule-sim.html).
//    산 자국이 쓸모없어지지 않고, 자국 두 겹이 겹치지 않는다.
//  ▶ 'sprout' 는 카탈로그 상품이 아니다 — js/cosmetics/trail.js 조형 표에만 있다(살 수 없음).
//  ▶ 테스트: tests/skin-rules.test.mjs
// =============================================================

export const SKIN_TRAIL = Object.freeze({ forest_spirit: 'sprout' });
export const SQUASH = 0.08;   // 🧸 걸을 때 말랑 — 발이 닿는 순간 키가 8% 눌린다(부피는 xz 로 보존)

/** 실제로 찍을 자국 id — 자국 칸이 우선, 비었으면 스킨 자취, 둘 다 없으면 null */
export function effectiveTrail(cos) {
  const eq = cos?.equipped;
  return eq?.trail || SKIN_TRAIL[eq?.skin] || null;
}

export function skinSquashes(skinId) { return skinId === 'plush_doll'; }

/** 세로 배율 — phase 는 game.js walkPhase(발 높이 = |sin|). 꺼져 있으면 1 */
export function squashOf(phase, on) {
  return on ? 1 - SQUASH * (1 - Math.abs(Math.sin(phase))) : 1;
}
```

- [ ] **Step 4: 통과 확인** — `node --test tests/skin-rules.test.mjs` → PASS

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/skin-rules.js tests/skin-rules.test.mjs
git commit -m "feat: 💎 skin rules — effectiveTrail (trail slot wins) + plush squash"
```

---

### Task 3: 부위 표식 — 눈동자·하이라이트·머리·두개·몸통·배 + 동물 id

시뮬은 눈을 "어둡고 작은 구"로 추측했다(코·판다 무늬와 헷갈릴 위험). 게임은 조립할 때 표식을 단다.

**Files:**
- Modify: `js/animal-faces.js` (`eyes()` 와 `buildAnimalHead()`)
- Modify: `js/game.js` `buildAnimalMesh` — 몸통·배 메시 표식, `const kk = { … }`(≈3308행)에 `id: a.id`
- Test: `tests/skin-parts.test.mjs`

**Interfaces:**
- Produces: `userData.part` ∈ `'pupil' | 'highlight' | 'head' | 'skull' | 'body' | 'belly'`. 머리 그룹(`'head'`)은 buildAnimalMesh 그룹의 직계 자식, `'skull'` 은 머리 그룹의 `children[0]`(모든 HEADS 가 `S(1)` 로 시작한다). `built.k.id` = 동물 id.

- [ ] **Step 1: 테스트** `tests/skin-parts.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const faces = readFileSync(new URL('../js/animal-faces.js', import.meta.url), 'utf8');

test('animal-faces — 눈동자·하이라이트에 표식(스킨이 추측하지 않고 찾는다)', () => {
  const body = faces.slice(faces.indexOf('function eyes('), faces.indexOf('function ear('));
  assert.match(body, /userData\.part = 'pupil'/);
  assert.match(body, /userData\.part = 'highlight'/);
});
test('animal-faces — 머리 그룹 head · 첫 구 skull', () => {
  const body = faces.slice(faces.indexOf('export function buildAnimalHead('));
  assert.match(body, /g\.userData\.part = 'head'/);
  assert.match(body, /g\.children\[0\]\.userData\.part = 'skull'/);
});
test('game.js buildAnimalMesh — 몸통 body · 배 belly 표식 · kk 에 동물 id', () => {
  const src = gameSource();
  const i = src.indexOf('function buildAnimalMesh(');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /body\.userData\.part = 'body'/);
  assert.match(body, /belly\.userData\.part = 'belly'/);
  assert.match(body, /const kk = \{ id: a\.id,/);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/skin-parts.test.mjs` → FAIL

- [ ] **Step 3: 구현**

`js/animal-faces.js` `eyes()` 의 forEach 안을:
```js
  [-1, 1].forEach(s => {
    if (ring) noShadow(put(g, S(r * 1.10), ringMat, s * x, y, z - r * 0.40));
    noShadow(put(g, S(r), pupil, s * x, y, z)).userData.part = 'pupil';   // 🧥 스킨이 단추 눈으로 바꾸는 자리
    noShadow(put(g, S(r * 0.36), hi, s * x + r * 0.34, y + r * 0.42, z + r * 0.78)).userData.part = 'highlight';
    noShadow(put(g, S(r * 0.16), hi, s * x - r * 0.30, y - r * 0.30, z + r * 0.86)).userData.part = 'highlight';
  });
```
(`noShadow` 는 `(m) => { m.castShadow = false; return m; }` 라 메시를 돌려준다.)

`buildAnimalHead()`:
```js
export function buildAnimalHead(id, { HR, HY, body, belly }) {
  const build = HEADS[id] || HEADS.fox;
  const g = new THREE.Group();
  build(g, body, belly);
  g.userData.part = 'head';
  g.children[0].userData.part = 'skull';   // 모든 HEADS 가 S(1) 두개로 시작한다 — 🧥 스킨 테두리·솔기의 기준 구
  g.scale.setScalar(HR); g.position.y = HY;
  return g;
}
```
`js/game.js` `buildAnimalMesh`: `body.position.y = bodyY; body.scale.set(...)…g.add(body);` 줄 뒤에 `body.userData.part = 'body';`, belly 줄 뒤에 `belly.userData.part = 'belly';`. kk 줄을:
```js
  const kk = { id: a.id, R, HR, HY, bs, bodyY, tail: a.tail, side: sideAnchor(bs, R, bodyY), neckR: neckR(HR) };
```

- [ ] **Step 4: 통과 확인** — `npm test 2>&1 | tail -4` → `# fail 0`

- [ ] **Step 5: Commit**
```bash
git add js/animal-faces.js js/game.js tests/skin-parts.test.mjs
git commit -m "feat: 💎 tag face/body parts so skins find eyes without guessing"
```

---

### Task 4: 🌱 새싹 자국 + mergeGeos 공개

**Files:**
- Modify: `js/cosmetics/trail.js` (TRAIL 표에 `sprout`, `function mergeGeos` → `export function mergeGeos`)
- Test: `tests/trail-marks.test.mjs`

**Interfaces:**
- Produces: `buildTrailMark(THREE, 'sprout', o)` → 단일 메시(기존 bake 경로) · `export function mergeGeos(THREE, geos)`(position·normal·color 를 이어 붙인 BufferGeometry — Task 5 가 쓴다)

- [ ] **Step 1: 테스트** — `tests/trail-marks.test.mjs` 끝에:
```js
test('🌱 sprout 자국 — 정령 자취(카탈로그엔 없다) · 잎 2장 + 초록 원판', () => {
  const m = src.match(/sprout: \(g, s, o\) =>[\s\S]*?\n\s{4}\},/);
  assert(m, 'sprout builder');
  assert.match(m[0], /petalMesh\(/);
  assert.match(m[0], /forEach\(k =>/);
  assert.match(m[0], /CircleGeometry/);
});
test('mergeGeos 는 공개 — 🧥 스킨이 바늘땀을 한 메시로 굽는 데 같이 쓴다', () => {
  assert.match(src, /export function mergeGeos\(THREE, geos\)/);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/trail-marks.test.mjs` → FAIL 2개

- [ ] **Step 3: 구현** — TRAIL 표의 `rainbow` 항목 뒤에(들여쓰기 4칸 — 다른 항목과 같게):
```js
    //  🌱 새싹 — 🌿 숲의 정령을 입고 자국 칸이 비었을 때만(js/cosmetics/skin-rules.js effectiveTrail).
    //     살 수 있는 상품이 아니다. 잎 2장(V자) + 은은한 초록 원판. 색은 시안 sims/skin-trail-rule-sim.html.
    sprout: (g, s, o) => {
      put(g, new THREE.Mesh(new THREE.CircleGeometry(s * 0.8, 14), film(0x3f9a50, o * 0.45)), 0, 0.004, 0, false)
        .rotation.x = -Math.PI / 2;
      [-1, 1].forEach(k => {
        const leaf = petalMesh(s * 0.62, 0.55, film(0x8fe08a, o));
        leaf.position.set(k * s * 0.22, 0.02, 0); leaf.rotation.set(0, 0, k * 0.5);
        g.add(leaf);
      });
    },
```
(⚠️ `petalMesh` 의 두 번째 인자는 **비율**이다 — s 를 곱하지 않는다. 1단계 함정.)
`function mergeGeos(THREE, geos) {` → `export function mergeGeos(THREE, geos) {`

- [ ] **Step 4: 통과 확인** — `npm test 2>&1 | tail -4`

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/trail.js tests/trail-marks.test.mjs
git commit -m "feat: 💎 sprout trail mark for forest spirit + export mergeGeos"
```

---

### Task 5: 스킨 조형 — `applySkin` · `disposeSkin`

시안 `sims/skin-look-sim.html` 의 S3·P1 코드를 옮긴다. 차이: ① 부위는 `userData.part` 로 찾는다 ② 바늘땀·단추는 재질별로 **병합**한다 ③ 정령 몸은 `depthWrite:false`, 빛 알갱이는 깊이 검사 켬(월드에서 벽 너머로 비치지 않게) ④ 재질은 모듈 캐시 ⑤ 🐤 병아리는 볏 자리를 피해 새싹을 이마 쪽에.

**Files:**
- Create: `js/cosmetics/skin.js`
- Test: `tests/skin-art.test.mjs`(소스 검사)

**Interfaces:**
- Consumes: Task 3 표식·`built.k.id` · Task 4 `mergeGeos` · `built = { group, k: { id, R, bs, bodyY, HR, HY } }`(buildAnimalMesh 반환)
- Produces:
  - `applySkin(THREE, built, skinId): THREE.Group` — `built.group` 을 제자리에서 고쳐 돌려준다. skinId 가 없거나 모르면 그대로. 움직이는 게 있으면 `group.userData.skinTick = (t) => void`.
  - `disposeSkin(group)` — 스킨이 **새로 만든 지오메트리**(`userData.skinOwned`)만 dispose. 재질(캐시)·캐릭터 원래 것은 손대지 않는다.
  - `SKIN_IDS = ['forest_spirit', 'plush_doll']`

- [ ] **Step 1: 테스트** `tests/skin-art.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin.js', import.meta.url), 'utf8');

test('부위는 표식으로 찾는다 — 어두운 구 추측 금지', () => {
  assert.match(src, /=== 'pupil'/);
  assert.match(src, /=== 'highlight'/);
  assert.match(src, /=== 'skull'/);
  assert.doesNotMatch(src, /radiusOf\(m\) < 0\.25/);
});
test('밝기 판정은 sRGB(getHex) — Color 내부는 선형이다', () => {
  assert.match(src, /getHex\(\)/);
});
test('캐릭터 재질을 dispose 하지 않는다 — skinOwned 지오메트리만', () => {
  const d = src.slice(src.indexOf('export function disposeSkin('));
  assert.match(d, /skinOwned/);
  assert.doesNotMatch(d, /material\.dispose/);
});
test('바늘땀·단추는 병합 — mergeGeos 를 쓴다', () => {
  assert.match(src, /import \{ mergeGeos \} from '\.\/trail\.js'/);
});
test('정령 빛 알갱이는 깊이 검사를 끄지 않는다(월드에서 벽 너머로 비치지 않게)', () => {
  assert.doesNotMatch(src, /depthTest: false/);
});
test('색 상수 — 블룸 임계 0.85 아래(넓은 면)', () => {
  const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
  for (const hex of [0x5fc4a8, 0x9be07a, 0xf6e6c8]) assert.ok(luma(hex) < 0.85, hex.toString(16));
  for (const hex of [0x5fc4a8, 0x9be07a, 0xf6e6c8]) assert.match(src, new RegExp('0x' + hex.toString(16)));
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/skin-art.test.mjs` → FAIL(파일 없음)

- [ ] **Step 3: 구현** `js/cosmetics/skin.js`:
```js
// js/cosmetics/skin.js
// =============================================================
//  calm forest · 🧥 전신 스킨 조형 — 🌿 숲의 정령(S3) · 🧸 플러시 인형(P1)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-skins-design.md §3 · 시안 sims/skin-look-sim.html
//  ▶ **덧입히기**(결정 A): buildAnimalMesh 가 만든 캐릭터를 받아 재질·장식만 바꾼다. 7종 공통.
//    모자·목·등 앵커는 건드리지 않는다 → 다른 꾸미기와 같이 입는다.
//  ▶ 부위는 userData.part 표식으로 찾는다(animal-faces.js · game.js buildAnimalMesh).
//  ▶ ⚠️ 캐릭터 원래 재질은 월드·미리보기와 공유 — dispose 금지. 스킨 재질은 모듈 캐시(스킨·색당 1벌).
//  ▶ ⚠️ Color 내부값은 선형이다 — 밝기 판정은 getHex()(sRGB). 시안에서 갈색 발바닥이 "어두움"으로 잡혔다.
//  ▶ 드로우콜: 정령 ≤ +4(껍질 2·알갱이 1·새싹 1) · 인형 ≤ +6(땀·단추·테·구멍·패치판, 재질별 병합)
// =============================================================
import { mergeGeos } from './trail.js';

export const SKIN_IDS = Object.freeze(['forest_spirit', 'plush_doll']);

const SPIRIT = { body: 0x5fc4a8, emissive: 0x1f7a68, ei: 0.8, opacity: 0.6, rim: 0x9af0c8, rimOpacity: 0.22, rimGrow: 1.06,
  mote: 0xe6ff9a, moteSize: 0.09, motes: 26, sprout: 0x9be07a, sproutGlow: 0x3f9a40 };
//  🐤 병아리는 정수리에 볏(z 0.05~−0.38)이 있다 — 새싹을 이마 쪽으로 비켜 세운다(머리 단위 공간)
const SPROUT_AT = { default: [0, 0.96, 0.05], chick: [0, 0.86, 0.45] };
const PLUSH = { patch: 0xf6e6c8, button: 0x3b2a22, hole: 0xcdbca4, threadK: 0.55 };

const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const srgbSum = (c) => { const h = c.getHex(); return (((h >> 16) & 255) + ((h >> 8) & 255) + (h & 255)) / 255; };
const isDark = (m) => !!m.material?.color && srgbSum(m.material.color) < 0.5;
const part = (o) => o.userData?.part;
const own = (m) => { m.userData.skinOwned = true; m.userData.skin = true; return m; };

function headOf(g) { return g.children.find(c => part(c) === 'head') || null; }
function skullOf(head) { return head?.children.find(c => part(c) === 'skull') || null; }

/** 타원체(중심 c, 반축 ax) 표면에서 방향 d 쪽 점 · 법선 */
function onEllipsoid(THREE, c, ax, d) {
  const n = d.clone().normalize();
  const s = 1 / Math.sqrt((n.x / ax.x) ** 2 + (n.y / ax.y) ** 2 + (n.z / ax.z) ** 2);
  const p = c.clone().addScaledVector(n, s);
  return { p, nrm: p.clone().sub(c).divide(ax).divide(ax).normalize() };
}
/** 타원체 위 대원 — axis 'x' 면 yz 평면(정수리), 'z' 면 xy 평면(옆구리) */
function arcOn(THREE, c, ax, axis, t0, t1, n, lift = 1.012) {
  const u = new THREE.Vector3(0, 1, 0), v = axis === 'x' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
  const big = ax.clone().multiplyScalar(lift), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (t1 - t0) * i / n;
    pts.push(onEllipsoid(THREE, c, big, u.clone().multiplyScalar(Math.cos(t)).addScaledVector(v, Math.sin(t))).p);
  }
  return pts;
}

/** 스테이징 → 재질별로 한 메시씩 구워 parent 에 붙인다.
 *  ⚠️ stage 는 **부모 없이** 만든 그룹 — 그래야 matrixWorld 가 곧 parent 좌표계다. */
function bakeInto(THREE, parent, stage) {
  stage.updateMatrixWorld(true);
  const byMat = new Map();
  stage.traverse(o => {
    if (!o.isMesh) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
    o.geometry.dispose();
  });
  for (const [mat, geos] of byMat) {
    const m = own(new THREE.Mesh(mergeGeos(THREE, geos), mat));
    m.castShadow = false;
    parent.add(m);
    geos.forEach(g => g.dispose());
  }
}

/** 바늘땀 — 점열을 둘씩 짝지어 짧은 캡슐(간격이 생겨 점선이 된다) */
function stitches(THREE, stage, pts, mat, w) {
  for (let i = 0; i < pts.length - 1; i += 2) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(w, Math.max(0.001, len - 2 * w), 2, 6), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    stage.add(m);
  }
}

// ── 🌿 숲의 정령 ──────────────────────────────────────────────
function applySpirit(THREE, built) {
  const g = built.group, { id, R, bs, bodyY, HR, HY } = built.k;
  const bodyMat = cached('spirit-body', () => new THREE.MeshStandardMaterial({ color: SPIRIT.body, emissive: SPIRIT.emissive,
    emissiveIntensity: SPIRIT.ei, roughness: 0.5, transparent: true, opacity: SPIRIT.opacity, depthWrite: false }));
  const rimMat = cached('spirit-rim', () => new THREE.MeshBasicMaterial({ color: SPIRIT.rim, side: THREE.BackSide, transparent: true,
    opacity: SPIRIT.rimOpacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  const shells = [];
  g.traverse(o => {
    if (!o.isMesh || o.userData.skin) return;
    if (part(o) === 'pupil' || part(o) === 'highlight' || isDark(o)) return;   // 눈·검은 무늬(판다 팔·귀)는 남긴다 — 무슨 동물인지 읽히게
    o.material = bodyMat;
    if (part(o) === 'body' || part(o) === 'skull') shells.push(o);
  });
  //  빛 테두리 — 몸통·두개에만 뒤집힌 껍질 한 겹(가장자리가 번진다). 지오메트리는 원본 공유(새로 안 만든다)
  for (const o of shells) {
    const s = new THREE.Mesh(o.geometry, rimMat);
    s.userData.skin = true;
    s.position.copy(o.position); s.rotation.copy(o.rotation); s.scale.copy(o.scale).multiplyScalar(SPIRIT.rimGrow);
    o.parent.add(s);
  }
  //  머리 새싹 — 줄기 + 잎 2장, 한 메시로
  const head = headOf(g);
  if (head) {
    const mat = cached('spirit-sprout', () => new THREE.MeshStandardMaterial({ color: SPIRIT.sprout, emissive: SPIRIT.sproutGlow, emissiveIntensity: 0.6, roughness: 0.6 }));
    const wrap = new THREE.Group(), stage = new THREE.Group();
    stage.position.set(...(SPROUT_AT[id] || SPROUT_AT.default));
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.32, 6), mat); stem.position.y = 0.14; stage.add(stem);
    [-1, 1].forEach(k => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat);
      l.position.set(k * 0.17, 0.33, 0); l.scale.set(1, 0.32, 0.6); l.rotation.z = k * 0.45; stage.add(l);
    });
    wrap.add(stage);
    bakeInto(THREE, head, wrap);
  }
  //  몸속 빛 알갱이 — Points 1개. 궤도는 skinTick 이 돌린다(시드는 결정적 — 미리보기와 월드가 같게)
  const n = SPIRIT.motes, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) {
    const inHead = i % 3 === 0;
    seed.push({ cy: inHead ? HY : bodyY, rr: inHead ? HR * 0.7 : R * 0.75, a: (i * 2.39) % 6.28, b: (i * 1.31) % 6.28, sp: 0.3 + (i % 5) * 0.1 });
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = cached('spirit-mote-tex', () => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
    const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
  });
  const moteMat = cached('spirit-mote', () => new THREE.PointsMaterial({ color: SPIRIT.mote, size: SPIRIT.moteSize, map: tex,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const pts = own(new THREE.Points(geo, moteMat));
  pts.renderOrder = 5; pts.frustumCulled = false;
  g.add(pts);
  const tick = (t) => {
    seed.forEach((s, i) => {
      const a = s.a + t * s.sp, b = s.b + t * s.sp * 0.7;
      pos[i * 3] = Math.cos(a) * Math.sin(b) * s.rr * bs[0];
      pos[i * 3 + 1] = s.cy + Math.cos(b) * s.rr * 0.9;
      pos[i * 3 + 2] = Math.sin(a) * Math.sin(b) * s.rr * bs[2];
    });
    geo.attributes.position.needsUpdate = true;
  };
  tick(0);
  g.userData.skinTick = tick;
}

// ── 🧸 플러시 인형 ────────────────────────────────────────────
function applyPlush(THREE, built) {
  const g = built.group, { R, bs, bodyY } = built.k;
  let bodyMesh = null; g.traverse(o => { if (part(o) === 'body') bodyMesh = o; });
  const bodyHex = bodyMesh ? bodyMesh.material.color.getHex() : 0xc8a080;
  const threadHex = new THREE.Color(bodyHex).multiplyScalar(PLUSH.threadK).getHex();
  const thread = cached(`plush-thread-${threadHex}`, () => new THREE.MeshStandardMaterial({ color: threadHex, roughness: 0.9 }));

  //  몸 좌표계: 옆구리 솔기 2줄 + 배 천 패치(판 + 테두리 땀)
  const bodyStage = new THREE.Group();
  const c = new THREE.Vector3(0, bodyY, 0), ax = new THREE.Vector3(R * bs[0], R * bs[1], R * bs[2]);
  stitches(THREE, bodyStage, arcOn(THREE, c, ax, 'z', 0.4, 2.5, 21), thread, 0.016);
  stitches(THREE, bodyStage, arcOn(THREE, c, ax, 'z', -2.5, -0.4, 21), thread, 0.016);
  const w = R * 0.62, h = R * 0.52;
  const patch = new THREE.Group();
  patch.position.set(0, bodyY - R * 0.16, R * 0.55 + R * 0.62 * 0.6 + 0.004);
  patch.rotation.z = 0.08;
  const shape = new THREE.Shape(); const r = Math.min(w, h) * 0.28, x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y); shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const patchMat = cached('plush-patch', () => new THREE.MeshStandardMaterial({ color: PLUSH.patch, roughness: 0.92 }));
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: w * 0.04, bevelEnabled: true, bevelSize: w * 0.02,
    bevelThickness: w * 0.02, bevelSegments: 2, curveSegments: 6 }), patchMat);
  plate.position.z = -w * 0.03; patch.add(plate);
  stitches(THREE, patch, shape.getSpacedPoints(28).map(p => new THREE.Vector3(p.x * 0.8, p.y * 0.8, w * 0.07)), thread, w * 0.022);
  bodyStage.add(patch);
  bakeInto(THREE, g, bodyStage);

  //  머리 좌표계(단위 구): 정수리 솔기 + 단추 눈
  const head = headOf(g);
  if (!head) return;
  const skull = skullOf(head);
  const hax = skull ? skull.scale.clone() : new THREE.Vector3(1, 1, 1);
  const headStage = new THREE.Group();
  stitches(THREE, headStage, arcOn(THREE, new THREE.Vector3(), hax, 'x', -0.5, 2.4, 25), thread, 0.04);
  const btn = cached('plush-button', () => new THREE.MeshStandardMaterial({ color: PLUSH.button, roughness: 0.3, metalness: 0.1 }));
  const rim = cached('plush-button-rim', () => new THREE.MeshStandardMaterial({ color: new THREE.Color(PLUSH.button).multiplyScalar(1.6).getHex(), roughness: 0.35 }));
  const hole = cached('plush-button-hole', () => new THREE.MeshStandardMaterial({ color: PLUSH.hole, roughness: 0.7 }));
  for (const m of [...head.children]) {
    if (part(m) === 'highlight') { m.visible = false; continue; }
    if (part(m) !== 'pupil') continue;
    m.visible = false;
    const rr = m.geometry.parameters.radius * 1.15, n = m.position.clone().normalize();
    const b = new THREE.Group(); b.position.copy(m.position).addScaledVector(n, rr * 0.15);
    b.lookAt(b.position.clone().add(n));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, rr * 0.35, 20), btn); disc.rotation.x = Math.PI / 2; b.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 0.9, rr * 0.1, 6, 20), rim); ring.position.z = rr * 0.18; b.add(ring);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
      const hm = new THREE.Mesh(new THREE.SphereGeometry(rr * 0.12, 8, 6), hole);
      hm.position.set(sx * rr * 0.28, sy * rr * 0.28, rr * 0.17); hm.scale.z = 0.4; b.add(hm);
    });
    headStage.add(b);
  }
  bakeInto(THREE, head, headStage);
}

/** 🧥 스킨 입히기 — built.group 을 제자리에서 고쳐 돌려준다. 모르는 id·null 이면 그대로 */
export function applySkin(THREE, built, skinId) {
  if (skinId === 'forest_spirit') applySpirit(THREE, built);
  else if (skinId === 'plush_doll') applyPlush(THREE, built);
  return built.group;
}

/** 스킨이 새로 만든 지오메트리만 버린다(재질은 캐시 공유, 캐릭터 원본은 손대지 않는다) */
export function disposeSkin(group) {
  group?.traverse(o => { if (o.userData?.skinOwned) o.geometry?.dispose(); });
}
```
⚠️ `b.lookAt(...)` 은 부모 없는 그룹 `b` 에서 호출한다(부모가 없어야 lookAt 이 b 의 로컬=월드로 계산된다 — `headStage.add(b)` 는 lookAt **뒤**). 위 코드 순서가 그렇다.

- [ ] **Step 4: 통과 확인** — `npm test 2>&1 | tail -4` → `# fail 0`

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/skin.js tests/skin-art.test.mjs
git commit -m "feat: 💎 skin art — forest spirit (S3) and plush doll (P1) over any animal"
```

---

### Task 6: 게임 배선 — 캐릭터·미리보기·자취·말랑

**Files:**
- Modify: `js/game.js` — import(≈88행 `trail.js` import 다음), `applyCharacter`(≈3322), `let charAnchors…`(≈3342), `applyCosmetics`(≈3343), `updateTrail`(≈3369), `buildCharacterMesh`(≈3405), `makeCharacterPreview` 의 `rebuild`·`loop`, 메인 루프 꼬리 블록 뒤(≈5458)
- Test: `tests/skin-wiring.test.mjs`

**Interfaces:**
- Consumes: `applySkin`, `disposeSkin`(Task 5) · `effectiveTrail`, `squashOf`, `skinSquashes`(Task 2)
- Produces: game.js 내부 `charSkin`(지금 입힌 스킨 id). `buildCharacterMesh` 를 **export** 한다(Task 8 이 cafe.js 에서 쓴다).

- [ ] **Step 1: 테스트** `tests/skin-wiring.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };

test('applyCharacter — buildAnimalMesh 직후 applySkin, 그다음 applyCosmetics · 옛 캐릭터 disposeSkin', () => {
  const b = fn('applyCharacter');
  const build = b.indexOf('buildAnimalMesh('), skin = b.indexOf('applySkin(THREE, built'), cos = b.indexOf('applyCosmetics(');
  assert.ok(build > 0 && skin > build && cos > skin);
  assert.match(b, /disposeSkin\(charGroup\)/);
});
test('applyCosmetics — 스킨이 바뀌면 캐릭터를 다시 조립한다 · 스킨은 앵커 꾸미기가 아니다', () => {
  const b = fn('applyCosmetics');
  assert.match(b, /!== charSkin/);
  assert.match(b, /applyCharacter\(/);
  assert.match(b, /it\.slot === 'skin'/);
});
test('buildCharacterMesh — 미리보기도 스킨을 입힌다(꾸미기보다 먼저)', () => {
  const b = fn('buildCharacterMesh');
  const skin = b.indexOf('applySkin('), cos = b.indexOf('buildCosmetic(');
  assert.ok(skin > 0 && cos > skin);
  assert.match(b, /it\.slot === 'skin'/);
});
test('updateTrail — 자국 id 는 effectiveTrail 이 정한다(정령 새싹)', () => {
  assert.match(fn('updateTrail'), /const id = effectiveTrail\(gameState\.cosmetics\)/);
});
test('메인 루프 — 말랑(squashOf)과 skinTick', () => {
  assert.match(src, /squashOf\(walkPhase, moving && skinSquashes\(charSkin\)\)/);
  assert.match(src, /charGroup\?\.userData\.skinTick\?\.\(t\)/);
});
test('미리보기 — skinTick · rebuild 때 disposeSkin', () => {
  assert.match(src, /mesh\?\.userData\?\.skinTick\?\.\(now \/ 1000\)/);
  assert.match(src, /if \(mesh\) \{ pivot\.remove\(mesh\); disposeSkin\(mesh\); \}/);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/skin-wiring.test.mjs` → FAIL

- [ ] **Step 3: 구현** (game.js)

import(`./cosmetics/trail.js` import 줄 바로 다음):
```js
import { applySkin, disposeSkin } from './cosmetics/skin.js';   // 🧥 전신 스킨 — 캐릭터에 덧입힌다
import { effectiveTrail, squashOf, skinSquashes } from './cosmetics/skin-rules.js';   // 🌱 정령 자취 · 🧸 말랑
```
`applyCharacter` 의 첫 두 줄(charGroup 제거·buildAnimalMesh)을:
```js
  if (charGroup) { playerAnchor.remove(charGroup); disposeSkin(charGroup); charGroup = null; tailPivot = null; }
  const built = buildAnimalMesh(a.id);
  charSkin = gameState.cosmetics?.equipped?.skin || null;
  applySkin(THREE, built, charSkin);   // 🧥 재질·장식만 바꾼다(체형 그대로) — 꾸미기 앵커는 아래 applyCosmetics 가 채운다
```
`let charAnchors = null, charK = null;` → `let charAnchors = null, charK = null, charSkin = null;`
`applyCosmetics` 의 `if (!charAnchors) return;` 다음 줄에:
```js
  //  🧥 스킨은 몸 재질을 바꾼다 — 앵커 자식만 갈아서는 안 되고 캐릭터를 다시 조립해야 한다
  if ((cos?.equipped?.skin || null) !== charSkin) { applyCharacter(curAnimal?.id || gameState.character); return; }
```
같은 함수 루프의 `if (it.slot === 'trail') continue;` → `if (it.slot === 'trail' || it.slot === 'skin') continue;   // 자국은 월드 이펙트, 스킨은 몸 재질 — 둘 다 앵커가 아니다`
(재귀 안전: applyCharacter 가 charSkin 을 gameState.cosmetics 로 맞추고 applyCosmetics(gameState.cosmetics) 를 부르므로 두 번째 호출은 같다. `grep -rn "applyCosmetics(" js/` 로 모든 호출이 `gameState.cosmetics` 를 넘기는지 확인하고, 아니면 보고한다.)
`updateTrail`: `const id = gameState.cosmetics.equipped.trail;` → `const id = effectiveTrail(gameState.cosmetics);   // 🌱 자국 칸이 비었고 정령이면 새싹`
`buildCharacterMesh`(앞에 `export` 를 붙인다):
```js
export function buildCharacterMesh(id, cos = gameState.cosmetics) {
  const built = buildAnimalMesh(id);
  applySkin(THREE, built, cos?.equipped?.skin);   // 🧥 입어보기 포함 — 꾸미기보다 먼저(몸 재질을 바꾼다)
  for (const it of equippedItems(cos)) {
    if (it.slot === 'trail' || it.slot === 'skin') continue;
```
(나머지 그대로.) `makeCharacterPreview` `rebuild()` 의 `if (mesh) pivot.remove(mesh);` → `if (mesh) { pivot.remove(mesh); disposeSkin(mesh); }`
`loop()` 의 `rend.render(sc, cam);` 바로 앞에 `mesh?.userData?.skinTick?.(now / 1000);   // 🌿 정령 빛 알갱이`
메인 루프 꼬리 블록(`if (tailPivot) { … }`) 바로 뒤:
```js
  //  🧸 플러시 인형 — 발이 닿을 때 살짝 눌린다(부피 보존). charGroup 배율만 — 도구 휘두르기와 무관
  if (charGroup) {
    const s = squashOf(walkPhase, moving && skinSquashes(charSkin));
    charGroup.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
  }
  charGroup?.userData.skinTick?.(t);   // 🌿 정령 빛 알갱이
```
(그 지점에 `moving`·`walkPhase`·`t` 가 스코프에 있는지 확인한다 — 걷기 블록이 같은 함수에 있다.)

- [ ] **Step 4: 통과 확인** — `npm test 2>&1 | tail -4` → `# fail 0`

- [ ] **Step 5: 브라우저 확인** — 미리보기 서버(Global Constraints) → `http://localhost:8022/?dbg&time=0.92&weather=clear` → 게스트 → 캐릭터 선택 → 프롤로그 건너뛰기 → `tut-skip`. 콘솔:
```js
const gs = __gs();
gs.cosmetics = { owned: [...gs.cosmetics.owned, 'forest_spirit', 'plush_doll'], equipped: { ...gs.cosmetics.equipped, skin: 'forest_spirit', trail: null } };
```
그다음 ☰ › 캐릭터·꾸미기 › 옷장 › 🧥 스킨 탭이 아직 없으므로(Task 7) 캐릭터 재조립은 페이지 내부 함수로 유도한다: 옷장/가게 아무 칸 입기·벗기로 `applyCosmetics(gameState.cosmetics)` 를 한 번 부르게 한다(입은 모자를 한 번 벗었다 다시 입기). → 정령이 보이고 콘솔 에러 0, 걸으면(키보드 실제 입력 또는 조이스틱 — 합성 키 이벤트는 이동이 잘 안 된다) 새싹 자국. 스킨을 `plush_doll` 로 바꿔 같은 방법으로 단추 눈·솔기·말랑 확인. 스크린샷 2장을 보고서에 첨부.

- [ ] **Step 6: Commit**
```bash
git add js/game.js tests/skin-wiring.test.mjs
git commit -m "feat: 💎 wire skins — rebuild on change, preview, sprout trail, plush squash"
```

---

### Task 7: 가게·옷장 🧥 스킨 탭 + 영어 사전

**Files:**
- Modify: `js/shop/premium-row.js` — `slotVisible` 추가
- Modify: `js/spaces/cafe.js:808` `COS_TABS`, `drawCosMenu`
- Modify: `js/spaces/wardrobe.js:18` `SLOT_TABS`
- Modify: `js/i18n-en.js` 꾸미기 블록(`'🎩 머리': …` 줄 근처)
- Test: `tests/premium-row.test.mjs`, `tests/premium-shop-wiring.test.mjs`

**Interfaces:**
- Produces: `slotVisible(items, ctxOf): boolean` — 그 칸 품목 중 코인 상품이 있거나, 프리미엄 중 하나라도 `premiumRowMode(it, ctxOf(it)) !== 'hidden'` 이면 true.

- [ ] **Step 1: 테스트**

`tests/premium-row.test.mjs`(import 에 `slotVisible` 추가) 끝에:
```js
test('slotVisible — 프리미엄만 있는 칸이 웹 밖에서 전부 hidden 이면 탭을 숨긴다', () => {
  const ctx = (p) => () => ({ ...base, platform: p });
  assert.equal(slotVisible([it, it], ctx('web')), true);
  assert.equal(slotVisible([it, it], ctx('toss')), false);
});
test('slotVisible — 산 게 있으면(owned) 웹 밖에서도 보인다 · 코인 상품이 있으면 늘 보인다', () => {
  assert.equal(slotVisible([it], () => ({ ...base, platform: 'toss', owned: true })), true);
  const coin = { id: 'cap', price: { coins: 1500 } };
  assert.equal(slotVisible([coin], () => ({ ...base, platform: 'toss' })), true);
});
```
`tests/premium-shop-wiring.test.mjs` 끝에(상단에 `readFileSync` import 가 없으면 `import { readFileSync } from 'node:fs';` 추가):
```js
test('🧥 스킨 탭 — 가게(이펙트 뒤·펫 앞)와 옷장(이펙트 뒤) · 빈 탭 숨김', () => {
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  const ward = readFileSync(new URL('../js/spaces/wardrobe.js', import.meta.url), 'utf8');
  assert.match(cafe, /\['trail', '✨ 이펙트'\], \['skin', '🧥 스킨'\], \['pet', '🐾 펫'\]/);
  assert.match(ward, /\['trail', '✨ 이펙트'\], \['skin', '🧥 스킨'\]\]/);
  assert.match(cafe, /slotVisible\(itemsOf\(id\), rowCtx\)/);
});
test('i18n — 스킨 문구 통문장 등재', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const k of ['🧥 스킨', '숲의 정령', '플러시 인형', '밤이면 몸속에서 반딧불이 떠다녀요', '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑', 'PREMIUM · 전신 스킨', '바로 입어보기'])
    assert.ok(en.includes(`'${k}'`), k);
});
```

- [ ] **Step 2: 실패 확인** — `npm test 2>&1 | grep -E "^not ok"`

- [ ] **Step 3: 구현**

`js/shop/premium-row.js` 끝에:
```js
/** 가게 탭을 보일까 — 그 칸이 전부 hidden(웹 밖 + 안 산 프리미엄)이면 빈 탭이 되므로 숨긴다 */
export function slotVisible(items, ctxOf) {
  return items.some(it => !it.premium || premiumRowMode(it, ctxOf(it)) !== 'hidden');
}
```
`js/spaces/cafe.js`:
```js
export const COS_TABS = [['head', '🎩 머리'], ['neck', '🧣 목'], ['back', '🎒 가방'], ['trail', '✨ 이펙트'], ['skin', '🧥 스킨'], ['pet', '🐾 펫']];
```
import `import { premiumRowMode } from '../shop/premium-row.js';` → `import { premiumRowMode, slotVisible } from '../shop/premium-row.js';`
`drawCosMenu()` 맨 앞(`document.getElementById('cos-coin')…` 다음 줄)에:
```js
  const rowCtx = (it) => ({ owned: gameState.cosmetics.owned.includes(it.id), platform: PLATFORM,
    online: !!authState.online, isGuest: !!authState.isGuest, tokenSet: !!CONFIG.PADDLE.token,
    storeOpen: cashAvailable(authState) });   // cashAvailable = 상점 열림 또는 개발 세션(+웹·로그인·토큰)
  //  🧥 토스·안드로이드·itch 에서 안 산 스킨만 있는 칸 = 빈 탭 → 탭 자체를 숨긴다(외부 결제 안내 금지)
  if (cosTab !== 'pet' && !slotVisible(itemsOf(cosTab), rowCtx)) cosTab = 'head';
```
탭 루프 `for (const [id, label] of COS_TABS) {` 첫 줄에 `if (id !== 'pet' && !slotVisible(itemsOf(id), rowCtx)) continue;`
행 루프의 `mode = premiumRowMode(it, { owned: …, storeOpen: cashAvailable(authState) });   // …` 두 줄을 `mode = premiumRowMode(it, rowCtx(it));` 한 줄로.
`js/spaces/wardrobe.js:18`:
```js
const SLOT_TABS = [['head', '🎩 머리'], ['neck', '🧣 목'], ['back', '🎒 가방'], ['trail', '✨ 이펙트'], ['skin', '🧥 스킨']];
```
`js/i18n-en.js` `'🎩 머리': '🎩 Head', …` 줄 바로 아래에:
```js
  //   🧥 전신 스킨(2026-10-01 2단계) — 상품명·설명·연출 카드는 통문장
  '🧥 스킨': '🧥 Skins', '숲의 정령': 'Forest Spirit', '플러시 인형': 'Plush Doll',
  '밤이면 몸속에서 반딧불이 떠다녀요': 'At night, fireflies drift inside you',
  '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑': 'Stitched seams, button eyes, and a squishy step',
  'PREMIUM · 전신 스킨': 'PREMIUM · Full-body skin', '바로 입어보기': 'Wear it now',
```

- [ ] **Step 4: 통과 확인** — `npm test 2>&1 | tail -4`

- [ ] **Step 5: 브라우저 확인** — 가게(?dbg 세션)에서 🧥 스킨 탭 → 💎 두 줄, 줄 클릭(입어보기)으로 미리보기 캐릭터가 정령/인형으로 바뀌는지, 옷장 🧥 스킨 탭에서 입기/벗기 → 월드 캐릭터가 재조립되는지. 스크린샷.

- [ ] **Step 6: Commit**
```bash
git add js/shop/premium-row.js js/spaces/cafe.js js/spaces/wardrobe.js js/i18n-en.js tests/
git commit -m "feat: 💎 skin tab in shop and wardrobe (hidden off-web when nothing owned) + en copy"
```

---

### Task 8: 획득 연출 B+C — 상자 폭발

**Files:**
- Modify: `js/shop/reveal-pose.js` — `REVEAL_COPY` 스킨 2종, `REVEAL_CARD`, `revealModeOf`, `BOX_OPEN`, `boxburstPose`
- Modify: `js/shop/purchase-reveal.js` — `mode`·`buildShowcase`, `boxStage`·`startBox`, stop 정리
- Modify: `index.html` — `.br-tag` 에 `id="br-tag"`, `<div class="br-flash">`, CSS 1줄
- Modify: `js/spaces/cafe.js` `onGranted` + import
- Test: `tests/reveal-pose.test.mjs`, `tests/purchase-reveal-wiring.test.mjs`

**Interfaces:**
- Consumes: `buildCharacterMesh(id, cos)`(Task 6 에서 export) · 스킨 메시의 `userData.skinTick`
- Produces:
  - `REVEAL_COPY.forest_spirit = { name: '숲의 정령', desc: '밤이면 몸속에서 반딧불이 떠다녀요' }`, `REVEAL_COPY.plush_doll = { name: '플러시 인형', desc: '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑' }`
  - `REVEAL_CARD = { spot: { tag: 'PREMIUM · 걷는 자국', cta: '바로 걸어보기' }, boxburst: { tag: 'PREMIUM · 전신 스킨', cta: '바로 입어보기' } }`
  - `revealModeOf(item): 'spot'|'boxburst'`
  - `boxburstPose(t)` → `{ dim, box, shake, open, lid:{x,y,z,rz}, flash, ring:{on,scale,opacity}, rise, riseY, rays, card }`
  - `playPurchaseReveal({ itemId, animalId, mode = 'spot', buildShowcase = null, onWalk, onClose })` — 기존 호출(mode 없음)은 그대로 A.

- [ ] **Step 1: 테스트** — `tests/reveal-pose.test.mjs` import 에 `REVEAL_CARD, revealModeOf, boxburstPose` 추가, 끝에:
```js
test('스킨 문구(스펙 §7)', () => {
  assert.deepEqual(REVEAL_COPY.forest_spirit, { name: '숲의 정령', desc: '밤이면 몸속에서 반딧불이 떠다녀요' });
  assert.deepEqual(REVEAL_COPY.plush_doll, { name: '플러시 인형', desc: '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑' });
  assert.deepEqual(REVEAL_CARD.boxburst, { tag: 'PREMIUM · 전신 스킨', cta: '바로 입어보기' });
  assert.deepEqual(REVEAL_CARD.spot, { tag: 'PREMIUM · 걷는 자국', cta: '바로 걸어보기' });
});
test('revealModeOf — 스킨은 상자 폭발, 나머지는 스포트라이트', () => {
  assert.equal(revealModeOf({ slot: 'skin' }), 'boxburst');
  assert.equal(revealModeOf({ slot: 'trail' }), 'spot');
  assert.equal(revealModeOf(null), 'spot');
});
test('boxburstPose — 시안 D 시간축: 등장 0.4 · 덜컹 0.5~1.4 · 열림 1.4 · 솟음 ~2.2 · 카드 2.3', () => {
  assert.equal(boxburstPose(0).box, 0);
  assert.ok(boxburstPose(0.4).box > 0.99);
  assert.equal(boxburstPose(0.45).shake, 0);
  assert.notEqual(boxburstPose(0.97).shake, 0);
  assert.equal(boxburstPose(1.39).open, false);
  assert.equal(boxburstPose(1.39).rise, 0);
  const o = boxburstPose(1.5);
  assert.equal(o.open, true); assert.ok(o.flash > 0); assert.equal(o.ring.on, true);
  assert.ok(boxburstPose(2.2).rise > 0.99);
  assert.equal(boxburstPose(2.29).card, false);
  assert.equal(boxburstPose(2.3).card, true);
  assert.equal(boxburstPose(3).ring.on, false);
  assert.equal(boxburstPose(2.0).flash, 0);
});
```
`tests/purchase-reveal-wiring.test.mjs` 끝에:
```js
test('B+C — 카드 태그·버튼 문구를 모드에 따라 바꾼다 · 섬광 마크업', () => {
  assert.match(html, /id="br-tag"/);
  assert.match(html, /class="br-flash"/);
  assert.match(rev, /REVEAL_CARD\[mode\]/);
  assert.match(rev, /boxburstPose\(/);
});
test('onGranted — 스킨은 내 캐릭터(스킨 입은)를 진열한다 · 닫기 via wear', () => {
  const body = cafe.slice(cafe.indexOf('function onGranted('));
  assert.match(body, /buildShowcase/);
  assert.match(body, /'wear'/);
});
test('stop — B+C 진열 캐릭터는 재질 공유라 disposeTree 하지 않는다 · 카메라를 A 값으로 되돌린다', () => {
  const s = rev.slice(rev.indexOf('export function stopPurchaseReveal('));
  assert.match(s, /if \(!rig\.extra\) disposeTree\(rig\.root\)/);
  assert.match(s, /camera\?\.position\.set\(0, 1\.1, 1\.9\)/);
});
```

- [ ] **Step 2: 실패 확인** — `npm test 2>&1 | grep -E "^not ok"`

- [ ] **Step 3: reveal-pose.js 구현** — `REVEAL_COPY` 를 아래로 바꾸고 나머지를 파일 끝에 덧붙인다:
```js
export const REVEAL_COPY = Object.freeze({
  firefly: Object.freeze({ name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' }),
  rainbow: Object.freeze({ name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' }),
  forest_spirit: Object.freeze({ name: '숲의 정령', desc: '밤이면 몸속에서 반딧불이 떠다녀요' }),
  plush_doll: Object.freeze({ name: '플러시 인형', desc: '꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑' }),
});
```
```js
/** 카드 태그·버튼 — 스킨은 "입어보기", 자국은 "걸어보기" */
export const REVEAL_CARD = Object.freeze({
  spot: Object.freeze({ tag: 'PREMIUM · 걷는 자국', cta: '바로 걸어보기' }),
  boxburst: Object.freeze({ tag: 'PREMIUM · 전신 스킨', cta: '바로 입어보기' }),
});

/** 가격대별 연출(메모리 확정): 전신 스킨 = B+C 상자 폭발, 나머지 = A 스포트라이트 */
export function revealModeOf(item) { return item?.slot === 'skin' ? 'boxburst' : 'spot'; }

/** 🎁 B+C — sims/premium-reveal-sim.html mode D 와 같은 시간축 */
export const BOX_OPEN = 1.4;
export function boxburstPose(t) {
  const o = t - BOX_OPEN, open = o >= 0;
  const shake = t > 0.5 && t < BOX_OPEN ? Math.sin(t * 40) * 0.08 * (1 - Math.abs(t - 0.95) / 0.45) : 0;
  const rise = open ? clamp01(o / 0.8) : 0;
  return {
    dim: clamp01(t / 0.25),
    box: t > 0 ? easeOutBack(clamp01(t / 0.4)) : 0,
    shake, open,
    lid: open ? { x: o * 1.2, y: -0.25 + o * 3 - o * o * 3, z: o * 0.5, rz: -o * 4 } : { x: 0, y: -0.25, z: 0, rz: 0 },
    flash: open ? Math.max(0, 0.85 - o * 3) : 0,
    ring: { on: open && o < 1.2, scale: 0.5 + Math.max(0, o) * 4, opacity: open ? Math.max(0, 1 - o / 1.1) : 0 },
    rise: rise === 0 ? 0 : easeOutBack(rise), riseY: -0.9 + rise * 1.6,
    rays: rise, card: t >= 2.3,
  };
}
```
(검산: easeOutBack(1)=1 → `boxburstPose(0.4).box` = 1 · `boxburstPose(2.2)` rise=1 · `boxburstPose(2.0).flash` o=0.6 → 0.85−1.8 < 0 → 0.)

- [ ] **Step 4: purchase-reveal.js 구현**

import 를 `import { revealPose, boxburstPose, REVEAL_COPY, REVEAL_CARD } from './reveal-pose.js';` 로.
`raysMesh()` 아래에 상자 무대:
```js
//  🎁 B+C 무대 — 상자(몸·리본·뚜껑) + 충격파 링 + 무지개 버스트(Points 1개). 시안 sims/premium-reveal-sim.html mode D
function boxStage() {
  const box = new THREE.Group();
  const boxMat = new THREE.MeshLambertMaterial({ color: 0xc8553d, flatShading: true });
  const ribMat = new THREE.MeshLambertMaterial({ color: 0xf2c14e });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 1.3), boxMat); body.position.y = -0.9;
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.02, 1.32), ribMat); rib.position.y = -0.9;
  const lid = new THREE.Group();
  lid.add(new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.3, 1.45), boxMat), new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 1.47), ribMat));
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 12), ribMat); bow.position.y = 0.25; lid.add(bow);
  box.add(body, rib, lid);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  ring.visible = false;
  const N = 70, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = [];
  for (let i = 0; i < N; i++) {
    const c = new THREE.Color().setHSL(i / N, 0.9, 0.68); col.set([c.r, c.g, c.b], i * 3);
    const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 3;
    vel.push(new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp + 1, (Math.random() - 0.5) * 2));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const burst = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  burst.visible = false; burst.frustumCulled = false;
  return { box, lid, ring, burst, vel, pos };
}
```
`stopPurchaseReveal()` 를:
```js
export function stopPurchaseReveal() {
  cancelAnimationFrame(raf); raf = 0;
  if (rig) {
    scene.remove(rig.root, rig.rays, ...(rig.extra || []));
    if (!rig.extra) disposeTree(rig.root);          // A 진열물(자국)은 연출 전용이라 버린다 · B+C 의 캐릭터는 월드와 재질 공유라 떼기만
    disposeTree(rig.rays); (rig.extra || []).forEach(disposeTree);
    rig = null;
  }
  camera?.position.set(0, 1.1, 1.9); camera?.lookAt(0, 0.15, 0);   // 다음 A 연출이 상자 카메라를 물려받지 않게
  const fl = document.querySelector('#buy-reveal .br-flash'); if (fl) fl.style.opacity = '0';
  const wrap = document.getElementById('buy-reveal');
  wrap?.classList.remove('show', 'card');
  wrap?.style.setProperty('--br-dim', '0');   // 다시 틀 때 이전 어둠이 한 프레임 비치지 않게
}
```
`playPurchaseReveal` 를:
```js
/** mode: 'spot'(A 스포트라이트, 자국) | 'boxburst'(B+C 상자 폭발, 스킨) · buildShowcase: boxburst 진열 캐릭터 팩토리
 *  onWalk: [바로 걸어보기/입어보기] · onClose: [닫기] — 연출을 닫은 뒤 부른다. 인자 = 열려 있던 ms */
export function playPurchaseReveal({ itemId, animalId = null, mode = 'spot', buildShowcase = null, onWalk = () => {}, onClose = () => {} }) {
  const wrap = document.getElementById('buy-reveal');
  const canvas = document.getElementById('br-canvas');
  if (!wrap || !canvas) return;
  stopPurchaseReveal();
  ensure(canvas);
  const copy = REVEAL_COPY[itemId] || { name: itemId, desc: '' };
  const card = REVEAL_CARD[mode] || REVEAL_CARD.spot;
  document.getElementById('br-name').textContent = copy.name;
  document.getElementById('br-desc').textContent = copy.desc;
  document.getElementById('br-tag').textContent = card.tag;
  document.getElementById('br-walk').textContent = card.cta;
  wrap.classList.add('show');
  try {
    if (mode === 'boxburst') startBox(wrap, canvas, onWalk, onClose, buildShowcase);
    else start(wrap, canvas, itemId, animalId, onWalk, onClose);
  } catch (e) { stopPurchaseReveal(); throw e; }   // 중간에 터지면 투명한 전면 오버레이가 클릭을 다 먹는다
}
```
파일 끝에 `startBox`:
```js
function startBox(wrap, canvas, onWalk, onClose, buildShowcase) {
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.position.set(0, 0.4, 6); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();   // 상자 무대는 시안 카메라
  const st = boxStage();
  const root = new THREE.Group();
  const hero = buildShowcase ? buildShowcase() : new THREE.Group();   // 🧥 스킨 입은 내 캐릭터(cafe.js 가 만든다)
  hero.scale.setScalar(0.001); root.add(hero);
  const rays = raysMesh(); rays.position.set(0, 0.3, -1); rays.scale.setScalar(2.1);
  scene.add(root, rays, st.box, st.ring, st.burst);
  rig = { root, rays, extra: [st.box, st.ring, st.burst] };
  const flash = wrap.querySelector('.br-flash');
  const t0 = performance.now(); let last = t0;
  const frame = (now) => {
    if (!rig) return;
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = boxburstPose(t);
    wrap.style.setProperty('--br-dim', String(p.dim));
    st.box.visible = t < 2.0;                       // 뚜껑이 날아간 뒤 잠깐 남았다가 치운다
    st.box.scale.setScalar(Math.max(0.001, p.box)); st.box.rotation.set(0, -0.4, p.shake);
    st.lid.position.set(p.lid.x, p.lid.y, p.lid.z); st.lid.rotation.z = p.lid.rz;
    if (flash) flash.style.opacity = String(p.flash);
    st.ring.visible = p.ring.on; st.ring.scale.setScalar(p.ring.scale); st.ring.material.opacity = p.ring.opacity;
    if (p.open) {
      st.burst.visible = true;
      st.vel.forEach((v, i) => { v.y -= 2.5 * dt; st.pos[i * 3] += v.x * dt; st.pos[i * 3 + 1] += v.y * dt; st.pos[i * 3 + 2] += v.z * dt; });
      st.burst.geometry.attributes.position.needsUpdate = true;
      st.burst.material.opacity = Math.max(0, 1 - (t - 1.4) / 1.8);
    }
    hero.scale.setScalar(Math.max(0.001, p.rise * 0.95)); hero.position.y = p.riseY; hero.rotation.y = t * 0.8;
    hero.userData.skinTick?.(t);
    rays.material.opacity = p.rays * 0.4; rays.rotation.z = t * 0.15;
    if (p.card) wrap.classList.add('card');
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const t0ms = t0;
  const done = (cb) => () => { const ms = Math.round(performance.now() - t0ms); stopPurchaseReveal(); cb(ms); };
  document.getElementById('br-walk').onclick = done(onWalk);
  document.getElementById('br-close').onclick = done(onClose);
}
```
⚠️ 시안 상자 크기(1.3) 기준 카메라(0, 0.4, 6) — 캐릭터 키는 ~1.7 이라 0.95 배율로 riseY −0.9→0.7 사이에 선다. 화면에서 머리가 잘리면 hero 배율을 0.8 로 낮춘다(Task 9 에서 캡처로 판단).

`index.html` — `#buy-reveal` 블록을:
```html
  <div id="buy-reveal">
    <div class="br-flash"></div>
    <div class="br-wrap">
      <canvas id="br-canvas"></canvas>
      <div class="br-card">
        <div class="br-tag" id="br-tag">PREMIUM · 걷는 자국</div>
```
(나머지 그대로.) CSS `#buy-reveal .br-row { … }` 줄 아래에:
```css
  #buy-reveal .br-flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
```

- [ ] **Step 5: cafe.js onGranted 구현** — import 추가 `import { revealModeOf } from '../shop/reveal-pose.js';`, game.js import 목록(17행 `} from '../game.js';` 앞)에 `buildCharacterMesh` 추가. `playPurchaseReveal({ … })` 호출을:
```js
      const mode = revealModeOf(findItem(c.itemId));
      playPurchaseReveal({ itemId: c.itemId, animalId: gameState.character, mode,
        //  🧥 스킨은 "입은 내 캐릭터"를 진열한다 — 이미 장착했으니 실제 장착 그대로 만든다
        buildShowcase: mode === 'boxburst' ? () => buildCharacterMesh(gameState.character, gameState.cosmetics) : null,
        onWalk: (ms) => { trackEvent('premium_reveal_close', { item_id: c.itemId, via: mode === 'boxburst' ? 'wear' : 'walk', ms }); closeCosShopForWalk(); },
        onClose: (ms) => trackEvent('premium_reveal_close', { item_id: c.itemId, via: 'close', ms }) });
```
(기존 테스트 `/playPurchaseReveal\(\{ itemId: c\.itemId/` 와 `/premium && cosShopOpen\(\)\) \{\s*try \{\s*playPurchaseReveal/` 를 깨지 않도록 — `const mode` 줄은 `try {` **앞**, `if (…premium && cosShopOpen())` 조건문 **밖**에 둘 수 없으면 조건 안 `try {` 다음에 두고 그 테스트 정규식을 `try \{[\s\S]*?playPurchaseReveal` 로 고친다. 테스트를 고쳤다면 보고에 적는다.)

- [ ] **Step 6: 통과 확인** — `npm test 2>&1 | tail -4` → `# fail 0`

- [ ] **Step 7: 브라우저 확인** — Task 6 Step 5 상태에서 콘솔:
```js
const r = await import('/js/shop/purchase-reveal.js');
const g = await import('/js/game.js');
const cos = { ...__gs().cosmetics, equipped: { ...__gs().cosmetics.equipped, skin: 'forest_spirit' } };
r.playPurchaseReveal({ itemId: 'forest_spirit', mode: 'boxburst', buildShowcase: () => g.buildCharacterMesh(__gs().character, cos) });
```
→ 0.6s·1.0s·1.5s·2.6s 스크린샷(`tabs_select` 로 패널을 앞에). 상자 등장·덜컹 → 섬광·버스트·링 → 캐릭터 솟음 → 카드 "PREMIUM · 전신 스킨 / 숲의 정령 / 바로 입어보기". [닫기] 후 `r.playPurchaseReveal({ itemId: 'firefly' })` 로 A 연출이 예전 카메라·태그("PREMIUM · 걷는 자국 / 바로 걸어보기")로 정상인지.

- [ ] **Step 8: Commit**
```bash
git add js/shop/reveal-pose.js js/shop/purchase-reveal.js js/spaces/cafe.js index.html tests/
git commit -m "feat: 💎 boxburst (B+C) reveal for skins — box shake, lid pop, flash, rainbow burst, hero rises"
```

---

### Task 9: 화면 검증 · 드로우콜 · 리뷰 · 문서

**Files:**
- Modify: `dev/active/premium-cosmetics/premium-cosmetics-tasks.md`(2단계 섹션), `dev/active/premium-cosmetics/premium-cosmetics-context.md`
- (수정이 나오면) 해당 소스 + 테스트

- [ ] **Step 1: 7종 × 2스킨 캡처** — 동물마다(🦊🐶🐰🐱🐻🐼🐤) 정령·인형을 입혀 가게 미리보기(입어보기) 또는 월드에서 캡처. 확인:
  - 🐤 병아리 — 새싹(`SPROUT_AT.chick`)이 볏과 겹치지 않고 이마에 서는가. 어긋나면 `SPROUT_AT.chick` 값만 고친다.
  - 🐼 판다 검은 팔·귀가 정령에서 검게 남는다(의도) — 어색하면 보고만.
  - 🐱 고양이 수염(흰 실린더)이 정령 재질로 바뀌어도 보이는가 · 🐰 토끼 긴 귀 사이 새싹.
  - 인형 단추 눈이 고양이·판다의 흰 눈 테두리 안에 들어가는가. 정수리 솔기가 귀를 뚫고 떠 보이지 않는가.
  - 🧢 모자·🦸 망토를 같이 입었을 때 깨지지 않는가.
  - 밤(time=0.92)·낮, PC 1280 · 375px.
- [ ] **Step 2: 정령 투명 정렬** — `depthWrite:false` 로 머리·몸이 겹치는 곳이 뒤집혀 보이면(뒤 몸이 앞 머리 위로) `depthWrite:true` 와 비교 캡처 2장으로 고른다.
- [ ] **Step 3: 드로우콜 실측** — 같은 프레임에서 `renderer.info.render.calls` 를 스킨 없음/정령/인형으로 비교(1단계 T9 방법: `?dbg`, 카메라 고정, 헤드리스 480×360 또는 브라우저 패널). 목표 정령 ≤ +4, 인형 ≤ +6. 넘으면 병합 누락을 고친다.
- [ ] **Step 4: 가게·옷장·플랫폼** — 가게 🧥 스킨 탭(💎 행, 상점 닫힘이면 "지금은 살 수 없어요"), 옷장 입기/벗기 → 월드 재조립, 토스 빌드 분기(PLATFORM ≠ 'web')에서 가게 스킨 탭이 숨는지(1단계 T9 의 hidden 분기 확인 방법 재사용).
- [ ] **Step 5: 코드 리뷰** — `superpowers:requesting-code-review` 로 `git diff feat/premium-trails...HEAD` 전체 리뷰. CRITICAL/HIGH 수정.
- [ ] **Step 6: 문서** — tasks 파일에 2단계 체크리스트·실측 드로우콜·남은 판단 사항, context 파일에 결정·함정·`Last Updated`.
- [ ] **Step 7: 전체 테스트 + 키 스캔 + Commit + push**
```bash
npm test 2>&1 | tail -4
git grep -nE "AIza|GOCSPX-|pdl_sdbx_apikey|pdl_live_apikey" -- . ':!*.md'   # 결과 0 이어야 한다
git add -A && git commit -m "docs: 💎 premium skins verified — captures, draw calls, review fixes"
git push -u origin feat/premium-skins
```
