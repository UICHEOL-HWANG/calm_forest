# 🏠 집 실내 다층화 + 층별 고급 가구 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 집 증축 단계에 따라 실내 위층·루프탑을 열고, 층별로 해금되는 코인 전용 고급 가구 10종을 더한다.

**Architecture:** 층 규칙은 `js/house-floors.js` 순수 모듈에 두고 node 테스트가 잠근다(박물관 `js/museum.js`와 같은 패턴). `js/game.js`는 그 모듈을 읽어 방을 짓고·토글하고·클램프한다. 층 전환은 나가는 문과 같은 근접 프롬프트 문법이고, 계단을 걸어 올라가지 않는다.

**Tech Stack:** ES 모듈 · Three.js · `node --test` (`npm test`) · Playwright(시각 검증)

**Spec:** `docs/superpowers/specs/2026-09-17-house-floors-design.md`

## Global Constraints

- 새 규칙 코드는 `js/game.js`(11,000줄+)에 몰지 않는다 — **순수 모듈 + 테스트**로 뺀다.
- 고급 가구 화폐는 **코인 전용**(`pay: 'coins'`). 기존 22종의 `pay: 'crop'|'fish'`는 건드리지 않는다.
- 가구 이름·가격은 스펙 §5 표에서 **그대로** 가져온다(사용자 검수 완료). 임의로 바꾸지 않는다.
- 새 한국어 라벨은 전부 `js/i18n-en.js`에 영문 키를 같이 넣는다.
- 층 인덱스는 `f` (0=1층, 1=위층, 2=루프탑). 세이브에 `f`가 없으면 **0으로 읽는다**.
- 커밋 메시지는 `<type>: <이모지> <한국어 설명>` 형식.

---

### Task 1: 층 규칙 순수 모듈

**Files:**
- Create: `js/house-floors.js`
- Test: `tests/house-floors.test.mjs`

**Interfaces:**
- Consumes: 없음(순수)
- Produces:
  - `floorsFor(stage) → [{f,id,name,half,outdoor}]`
  - `floorAt(stage, f) → {f,id,name,half,outdoor} | null`
  - `normalizeFloor(f, stage) → number` (유효하지 않으면 0)
  - `decorUnlocked(def, stage) → boolean`
  - `canPlaceOn(def, floor) → boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/house-floors.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floorsFor, floorAt, normalizeFloor, decorUnlocked, canPlaceOn } from '../js/house-floors.js';

test('3단계는 1층뿐', () => {
  const fs = floorsFor(3);
  assert.equal(fs.length, 1);
  assert.equal(fs[0].half, 7);
});

test('4단계는 다락이 열린다(작은 층)', () => {
  const fs = floorsFor(4);
  assert.deepEqual(fs.map(f => f.id), ['ground', 'attic']);
  assert.equal(floorAt(4, 1).half, 4.5);
});

test('5단계에서 위층이 2층으로 넓어진다 — f 는 그대로 1', () => {
  assert.equal(floorAt(5, 1).id, 'upper');
  assert.equal(floorAt(5, 1).half, 6);
});

test('6단계에서만 루프탑이 열리고 실외다', () => {
  assert.equal(floorAt(5, 2), null);
  assert.equal(floorAt(6, 2).outdoor, true);
});

test('위층은 넓어지기만 한다 — 다락 가구 좌표가 2층에서도 유효', () => {
  assert.ok(floorAt(5, 1).half >= floorAt(4, 1).half);
});

test('normalizeFloor: 없거나 아직 안 열린 층은 1층으로 떨군다', () => {
  assert.equal(normalizeFloor(undefined, 6), 0);
  assert.equal(normalizeFloor(2, 4), 0);   // 4단계엔 루프탑이 없다
  assert.equal(normalizeFloor(1, 4), 1);
});

test('고급 가구는 stage 로 해금되고, 기존 가구는 항상 열려 있다', () => {
  assert.equal(decorUnlocked({ id: 'sofa' }, 3), true);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 5), false);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 6), true);
});

test('실외 전용 가구는 루프탑에만 놓인다', () => {
  const firepit = { id: 'firepit', stage: 6, outdoorOnly: true };
  assert.equal(canPlaceOn(firepit, floorAt(6, 2)), true);
  assert.equal(canPlaceOn(firepit, floorAt(6, 0)), false);
  assert.equal(canPlaceOn({ id: 'sofa' }, floorAt(6, 2)), true);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: FAIL — `Cannot find module '../js/house-floors.js'`

- [ ] **Step 3: 모듈을 쓴다**

`js/house-floors.js`:

```js
// =============================================================
//  calm forest · 🏠 집 실내 층 규칙 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 층은 **증축 단계**로 열린다. 증축이 이미 코인·자재를 받았으므로 별도 해금 조건을 두지 않는다.
//  ▶ 층 인덱스 f 는 0=1층 · 1=위층 · 2=루프탑. **f=1 의 생김새를 단계가 정한다** —
//    4단계엔 다락(half 4.5), 5단계부터 2층(half 6)으로 넓어진다.
//    위층은 넓어지기만 하므로 다락에 놓았던 가구 좌표는 2층에서도 그대로 유효하다.
//  ▶ 해금 상태를 세이브에 따로 저장하지 않는다 — houseStage 에서 계산한다(museum.js 와 같은 규칙).
//  ▶ 테스트: npm test (tests/house-floors.test.mjs)
// =============================================================

const GROUND = { f: 0, id: 'ground', name: '1층', half: 7, outdoor: false };
const ATTIC  = { f: 1, id: 'attic',  name: '다락', half: 4.5, outdoor: false };
const UPPER  = { f: 1, id: 'upper',  name: '2층',  half: 6,   outdoor: false };
const ROOF   = { f: 2, id: 'roof',   name: '루프탑', half: 5, outdoor: true };

/** 그 단계에서 열려 있는 층들 — 아래에서 위 순서. */
export function floorsFor(stage) {
  const out = [GROUND];
  if (stage >= 5) out.push(UPPER);
  else if (stage >= 4) out.push(ATTIC);
  if (stage >= 6) out.push(ROOF);
  return out;
}

/** 단계·인덱스로 층 하나. 아직 안 열렸으면 null. */
export function floorAt(stage, f) {
  return floorsFor(stage).find(fl => fl.f === f) || null;
}

/** 저장된 f 를 현재 단계에서 쓸 수 있는 값으로. 없거나 안 열린 층이면 1층으로 떨군다. */
export function normalizeFloor(f, stage) {
  return floorAt(stage, Number.isFinite(f) ? f : 0) ? f : 0;
}

/** 가구가 상점에 풀렸는가 — stage 가 없는 정의(기존 22종)는 항상 열려 있다. */
export function decorUnlocked(def, stage) {
  return !def?.stage || stage >= def.stage;
}

/** 이 층에 놓을 수 있는가 — 실외 전용 가구는 루프탑에만. 실내 가구는 어디든. */
export function canPlaceOn(def, floor) {
  if (!floor) return false;
  return def?.outdoorOnly ? !!floor.outdoor : true;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/house-floors.js tests/house-floors.test.mjs
git commit -m "feat: 🏠 집 실내 층 규칙을 순수 모듈로 만든다"
```

---

### Task 2: 고급 가구 10종 데이터 + 코인 결제

**Files:**
- Modify: `js/game.js:203` (`DECOR` 배열 끝에 추가)
- Modify: `js/game.js:7419` (`placeDecor` 결제 분기)
- Test: `tests/house-floors.test.mjs` (테스트 추가)

**Interfaces:**
- Consumes: Task 1의 `decorUnlocked`
- Produces: `DECOR` 항목에 `pay: 'coins'` · `stage: 4|5|6` · `outdoorOnly?: true`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/house-floors.test.mjs` 끝에 추가:

```js
import { readFileSync } from 'node:fs';
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const DECOR_SRC = SRC.slice(SRC.indexOf('const DECOR = ['), SRC.indexOf('\n];', SRC.indexOf('const DECOR = [')));

test('고급 가구 10종이 코인 전용으로 들어 있다', () => {
  const coinLines = DECOR_SRC.split('\n').filter(l => l.includes("pay: 'coins'"));
  assert.equal(coinLines.length, 10);
});

test('고급 가구 가격은 구성품 대역과 같다', () => {
  const costs = [...DECOR_SRC.matchAll(/cost: (\d+),\s*pay: 'coins'/g)].map(m => +m[1]);
  assert.deepEqual(costs.sort((a, b) => a - b), [120, 150, 180, 250, 280, 300, 400, 500, 700, 900]);
});

test('루프탑 가구 3종만 실외 전용이다', () => {
  assert.equal((DECOR_SRC.match(/outdoorOnly: true/g) || []).length, 3);
});

test('기존 22종은 작물·생선 그대로다', () => {
  const old = DECOR_SRC.split('\n').filter(l => /pay: '(crop|fish)'/.test(l));
  assert.equal(old.length, 22);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: FAIL — 코인 가구가 0개

- [ ] **Step 3: DECOR 에 10종을 더한다**

`js/game.js` `DECOR` 배열의 마지막 항목(`bigaquarium`) 뒤에 추가:

```js
  // 🏠 층별 해금 고급 가구 — 코인 전용(후반 싱크). stage = 증축 단계 해금, outdoorOnly = 루프탑에만.
  { id: 'rocker',    name: '흔들의자',   ico: '🪑', cost: 120, pay: 'coins', stage: 4, foot: [0.7, 0.8] },
  { id: 'telescope', name: '망원경',     ico: '🔭', cost: 150, pay: 'coins', stage: 4, foot: [0.6, 0.6] },
  { id: 'trunk',     name: '여행 트렁크', ico: '🧳', cost: 180, pay: 'coins', stage: 4, foot: [0.9, 0.55] },
  { id: 'bathtub',   name: '욕조',       ico: '🛁', cost: 250, pay: 'coins', stage: 5, big: true, foot: [1.6, 0.8] },
  { id: 'bigart',    name: '큰 그림',    ico: '🖼️', cost: 280, pay: 'coins', stage: 5, foot: [1.2, 0.2] },
  { id: 'chandelier', name: '샹들리에',  ico: '💠', cost: 300, pay: 'coins', stage: 5 },
  { id: 'grandpiano', name: '그랜드 피아노', ico: '🎹', cost: 400, pay: 'coins', stage: 5, big: true, foot: [2.0, 1.6] },
  { id: 'firepit',   name: '파이어핏',   ico: '🔥', cost: 500, pay: 'coins', stage: 6, outdoorOnly: true, foot: [0.9, 0.9] },
  { id: 'planttree', name: '큰 화분나무', ico: '🌿', cost: 700, pay: 'coins', stage: 6, outdoorOnly: true, foot: [0.8, 0.8] },
  { id: 'jacuzzi',   name: '자쿠지',     ico: '♨️', cost: 900, pay: 'coins', stage: 6, outdoorOnly: true, big: true, foot: [2.0, 1.6] },
```

> 💠샹들리에는 천장에 달리므로 `foot` 없음(밟고 지나간다). 🖼️큰 그림은 벽에 걸리지만 벽 앞을 막으므로 얇은 발자국을 준다.

- [ ] **Step 4: 가구 10종의 메시를 그린다**

`js/game.js:7294` `decorMesh(id)` 의 if-else 체인 끝(마지막 `else if` 뒤)에 추가한다.
기존 가구와 같은 규칙 — 부품은 안쪽 그룹 `g` 에 넣고(배율은 안쪽만), 밤에 켜질 재질은 `houseWindows` 에 등록한다.

```js
  } else if (id === 'rocker') {
    const w = woodMat(1, 1, 0x9c6b40);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.55), w); seat.position.y = 0.42; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), w); back.position.set(0, 0.72, -0.24); back.rotation.x = -0.18; g.add(back);
    [-0.26, 0.26].forEach(x => {   // 곡선 다리(흔들이)
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 8, Math.PI), w);
      r.position.set(x, 0.3, 0); r.rotation.set(Math.PI / 2, 0, Math.PI); g.add(r);
    });
  } else if (id === 'telescope') {
    const tri = clayMat(0x4a4f57);
    [0, 2.1, 4.2].forEach(a => {   // 삼각대
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), tri);
      leg.position.set(Math.cos(a) * 0.16, 0.35, Math.sin(a) * 0.16); leg.rotation.z = Math.cos(a) * 0.32; leg.rotation.x = -Math.sin(a) * 0.32; g.add(leg);
    });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.66, 10), clayMat(0xd8dde0, false));
    tube.position.set(0, 0.82, 0); tube.rotation.z = 0.5; g.add(tube);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), clayMat(0x23252a));
    eye.position.set(-0.3, 0.68, 0); eye.rotation.z = 0.5; g.add(eye);
  } else if (id === 'trunk') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.5), woodMat(1, 1, 0x7a4a2e)); body.position.y = 0.23; g.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.85, 10, 1, false, 0, Math.PI), woodMat(1, 1, 0x8d5636));
    lid.position.y = 0.45; lid.rotation.z = Math.PI / 2; g.add(lid);
    [-0.28, 0.28].forEach(x => {   // 가죽 띠
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.53), clayMat(0x4a3526)); b.position.set(x, 0.24, 0); g.add(b);
    });
  } else if (id === 'bathtub') {
    const porcelain = clayMat(0xf7f5f0, false);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.75), porcelain); outer.position.y = 0.25; g.add(outer);
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.06, 0.58), clayMat(0x8fd0e8, false)); water.position.y = 0.46; g.add(water);
    [-0.6, 0.6].forEach(x => {     // 발
      const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 6), clayMat(0xd8dde0, false)); ft.position.set(x, 0.06, 0.26); g.add(ft);
    });
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), clayMat(0xd8dde0, false)); tap.position.set(-0.68, 0.6, 0); g.add(tap);
  } else if (id === 'bigart') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 0.07), clayMat(0xb98a4e)); frame.position.y = 1.15; g.add(frame);
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.03), clayMat(0xe8ddc8, false)); canvas.position.set(0, 1.15, 0.04); g.add(canvas);
    [[-0.22, 1.05, 0x7fb08a], [0.16, 1.24, 0xd98b6a], [0.3, 1.0, 0x8fa8d0]].forEach(([x, y, c]) => {
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), clayMat(c, false)); blob.position.set(x, y, 0.06); blob.scale.z = 0.2; g.add(blob);
    });
  } else if (id === 'chandelier') {
    const gold = clayMat(0xe9b949, { roughness: 0.35, metalness: 0.5 });
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), gold); chain.position.y = 2.35; g.add(chain);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 14), gold); ring.position.y = 2.05; ring.rotation.x = Math.PI / 2; g.add(ring);
    const cmat = new THREE.MeshStandardMaterial({ color: 0xfff2c4, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
    houseWindows.push(cmat);       // 🌙 밤에 창문·램프와 함께 켜진다
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 7), cmat);
      c.position.set(Math.cos(a) * 0.34, 2.14, Math.sin(a) * 0.34); g.add(c);
    }
  } else if (id === 'grandpiano') {
    const black = clayMat(0x1a1b1f);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.26, 16, 1, false, 0, Math.PI), black);
    body.position.y = 0.62; body.rotation.y = -Math.PI / 2; g.add(body);
    const front = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.26, 0.5), black); front.position.set(0, 0.62, 0.62); g.add(front);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.9), clayMat(0x26282e, false)); lid.position.set(0.1, 0.9, -0.1); lid.rotation.z = -0.28; g.add(lid);
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.24), clayMat(0xf5f2e8, false)); keys.position.set(0, 0.76, 0.8); g.add(keys);
    [[-0.6, 0.72], [0.6, 0.72], [0, -0.5]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.5, 6), black); leg.position.set(x, 0.25, z); g.add(leg);
    });
  } else if (id === 'firepit') {
    const stone = clayMat(0x8b857a);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), stone);
      s.position.set(Math.cos(a) * 0.36, 0.08, Math.sin(a) * 0.36); s.rotation.y = -a; g.add(s);
    }
    const fmat = new THREE.MeshStandardMaterial({ color: 0xffb057, emissive: 0xff7b2e, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(fmat);       // 🌙 밤에 켜진다(실외 층이라 더 잘 보인다)
    [[0, 0.2, 0.17], [0.1, 0.3, 0.12], [-0.09, 0.28, 0.1]].forEach(([x, y, r]) => {
      const f = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.4, 6), fmat); f.position.set(x, y, 0); g.add(f);
    });
  } else if (id === 'planttree') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.42, 10), clayMat(0xb87f5e)); pot.position.y = 0.21; g.add(pot);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.07, 10), clayMat(0xa06d4e)); rim.position.y = 0.44; g.add(rim);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), clayMat(0x6b4a34)); trunk.position.y = 0.72; g.add(trunk);
    [[0, 1.16, 0.34], [-0.2, 0.98, 0.24], [0.22, 1.0, 0.22]].forEach(([x, y, r]) => {
      const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMat(0x6b9a4c)); l.position.set(x, y, 0); g.add(l);
    });
  } else if (id === 'jacuzzi') {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.72, 0.55, 14), clayMat(0xe9e4d8)); shell.position.y = 0.28; g.add(shell);
    const wmat = new THREE.MeshStandardMaterial({ color: 0x5fd3e8, emissive: 0x2aa8c4, emissiveIntensity: 0, roughness: 0.25 });
    houseWindows.push(wmat);       // 🌙 밤에 물이 파랗게 빛난다(구성품 수영장 조명과 같은 문법)
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.07, 14), wmat); water.position.y = 0.53; g.add(water);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.1, 14), woodMat(2, 2, 0xc19a66)); deck.position.y = 0.05; g.add(deck);
  } else if (id === 'parasol_set') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), clayMat(0xd8dde0, false)); pole.position.y = 0.75; g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.4, 10), clayMat(0x6fd3e3, false)); top.position.y = 1.55; g.add(top);
    [-0.55, 0.55].forEach(x => {   // 라운지 체어 2개
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.09, 0.85), clayMat(0xf4f3ee)); seat.position.set(x, 0.26, 0.5); g.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.08), clayMat(0xf4f3ee)); back.position.set(x, 0.46, 0.12); back.rotation.x = 0.42; g.add(back);
    });
  }
```

> §8.3 — 가구당 메시가 많아졌다. 위 정의는 **재질을 부품마다 새로 만들지 않고** 지역 변수로 한 번 만들어
> 재사용한다(`const w = woodMat(...)` 패턴). 같은 규칙을 지키면 드로우콜이 가구당 재질 수만큼만 는다.

- [ ] **Step 5: placeDecor 가 코인으로도 결제하게 한다**

`js/game.js:7419` `placeDecor` 안, `const pay = def.pay || 'crop';` 블록을 교체:

```js
    const pay = def.pay || 'crop';                          // 화폐: 작물 · 물고기 · 🪙코인(고급 가구)
    const have = pay === 'coins' ? (gameState.inventory.coins || 0) : (gameState.inventory[pay] || 0);
    if (have < def.cost) {
      ui.toast?.(pay === 'coins' ? `코인이 부족해요 (필요 ${def.cost} 🪙)`
               : pay === 'fish'  ? `물고기가 부족해요 (필요 ${def.cost} 🐟)`
               :                   `작물이 부족해요 (필요 ${def.cost} 🥕)`);
      return false;
    }
    gameState.inventory[pay] -= def.cost; refreshInventoryUI();
    if (pay === 'coins') trackEvent('decor_buy_coins', { item: id, coins: def.cost, stage: gameState.houseStage }); // [GA4] 코인 싱크 퍼널
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add js/game.js tests/house-floors.test.mjs
git commit -m "feat: 🛋️ 층별 해금 고급 가구 10종을 코인 전용으로 더한다"
```

---

### Task 3: 가구 `f`(층) 저장 + 복원 마이그레이션

**Files:**
- Modify: `js/game.js:7419` (`placeDecor` — `rec` 에 `f` 기록)
- Modify: `js/game.js:2300` (세이브 복원 — `f` 정규화해 전달)
- Test: `tests/house-floors.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `normalizeFloor`
- Produces: `house.decor[] = [{id,x,z,rot,f}]`

> ⚠️ 여기는 세이브 덮어쓰기 사고가 났던 자리다. `f` 부재(옛 세이브 — 1층으로 읽는다)와
> `house` 부재(저장 없음)를 절대 같이 다루지 않는다. 기존 `if (saved.house && Array.isArray(saved.house.decor))`
> 가드는 **그대로 둔다**.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
test('옛 세이브(f 없음)의 가구는 전부 1층으로 읽힌다', () => {
  const oldSave = [{ id: 'sofa', x: 1, z: 2, rot: 0 }, { id: 'bed', x: -3, z: 0, rot: 1 }];
  const restored = oldSave.map(d => ({ ...d, f: normalizeFloor(d.f, 6) }));
  assert.deepEqual(restored.map(d => d.f), [0, 0]);
});

test('복원 코드가 house 부재 가드를 유지한다', () => {
  assert.ok(SRC.includes('if (saved.house && Array.isArray(saved.house.decor))'));
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: FAIL — `normalizeFloor` 는 통과하지만 두 번째가 실패할 수 있다(문자열 확인)

- [ ] **Step 3: placeDecor 가 층을 기록하게 한다**

`js/game.js:7419` 안의 `rec` 생성 줄을 교체:

```js
  const rec = { id, x: lx - INT.x, z: lz - INT.z, rot: ry, f: curFloor };   // f = 지금 서 있는 층
```

`placeDecor` 시그니처에 층 인자를 더한다(복원용):

```js
function placeDecor(id, wx, wz, silent = false, rot = null, free = false, f = null) {
```

그리고 함수 앞부분에:

```js
  const curFloor = f == null ? houseFloor : f;    // houseFloor = 지금 있는 층(Task 4에서 도입)
```

> Task 4 이전에는 `houseFloor` 가 없으므로, 이 커밋에서 `js/game.js` 전역에 `let houseFloor = 0;`
> 를 `let interiorGroup, interiorFloor, interiorLamp;`(`js/game.js:1440`) 옆에 함께 선언한다.

- [ ] **Step 4: 복원이 f 를 정규화해 넘기게 한다**

`js/game.js:2300` 블록을 교체:

```js
  if (saved.house && Array.isArray(saved.house.decor)) {                 // 실내 가구 복원
    gameState.house.decor = [];
    // ⚠️ f 부재(옛 세이브)는 1층으로 읽는다 — house 부재(저장 없음)와 절대 섞지 않는다.
    saved.house.decor.forEach(d => placeDecor(d.id, INT.x + d.x, INT.z + d.z, true, d.rot || 0, false,
                                              normalizeFloor(d.f, saved.houseStage || 0)));
  }
```

상단 import 에 추가:

```js
import { floorsFor, floorAt, normalizeFloor, decorUnlocked, canPlaceOn, rooftopFreeDecor } from './house-floors.js';
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npm test`
Expected: PASS (전체 스위트 — 기존 테스트도 깨지지 않아야 한다)

- [ ] **Step 6: 커밋**

```bash
git add js/game.js tests/house-floors.test.mjs
git commit -m "feat: 🗄️ 가구 저장에 층(f)을 더하고 옛 세이브를 1층으로 읽는다"
```

---

### Task 4: 층별 방 짓기 + 전환 + 가시성 토글

**Files:**
- Modify: `js/game.js:7266` (`buildInterior`)
- Modify: `js/game.js:518` (`setSpaceVisible`)
- Modify: `js/game.js:9728` (`updateDoorInteract` — 층 프롬프트)
- Modify: `js/game.js:7450` (`decorClampX/Z`), `js/game.js:10309` (이동 클램프)

**Interfaces:**
- Consumes: Task 1 `floorsFor`/`floorAt`, Task 3 `houseFloor`
- Produces: `houseFloor` (현재 층), `goFloor(f)` (층 이동)

> ⚠️ **§8.1 재발 주의** — `decorMeshes` 는 `interiorGroup` 의 자식이 아니라 scene 직속이고
> `setSpaceVisible` 이 `indoor` 하나로 일괄 토글한다. 과거 이 때문에 "맵 끝에 피아노·장롱이
> 떠 보인다"는 제보가 실제로 났다(2026-09-15). 층별 토글은 **`indoor && rec.f === houseFloor`**
> 두 조건을 모두 봐야 한다.

- [ ] **Step 1: 층별 방을 짓는다**

`js/game.js:7266` `buildInterior()` 를 층 루프로 바꾼다. 방 한 채를 만드는 부분을 헬퍼로 뽑는다:

```js
let interiorFloors = {};   // { [f]: THREE.Group } — 층별 방

function buildRoom(def) {                     // def = floorsFor() 항목
  const g = new THREE.Group(); g.position.copy(INT);
  const H = def.half, W = H * 2;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, W), woodMat(7, 7, INT_FLOOR_TINT));
  floor.position.y = 0.1; floor.receiveShadow = true; g.add(floor);
  if (def.outdoor) {                          // ☀️ 루프탑 — 벽 대신 유리 난간, 하늘이 보인다
    const rail = clayMat(0xf4f3ee, false);
    [[0, H], [0, -H], [-H, 0], [H, 0]].forEach(([rx, rz], i) => {
      const w = i < 2 ? W : 0.12, d = i < 2 ? 0.12 : W;
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), rail);
      r.position.set(rx, 0.65, rz); g.add(r);
    });
  } else {
    const wall = () => clayMat(PAL.wall, false);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.24), wall()); back.position.set(0, 1.5, H); back.castShadow = true; g.add(back);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); left.position.set(-H, 1.5, 0); g.add(left);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3, W), wall()); right.position.set(H, 1.5, 0); g.add(right);
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(winMat);
    [-H / 2.8, H / 2.8].forEach(wx => { const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.06), winMat); win.position.set(wx, 1.7, H - 0.1); g.add(win); });
    if (def.f === 0) {                        // 1층에만 나가는 문
      const sideW = H - 1;
      const fL = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fL.position.set(-(1 + sideW / 2), 1.5, -H); g.add(fL);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(sideW, 3, 0.24), wall()); fR.position.set((1 + sideW / 2), 1.5, -H); g.add(fR);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 0.24), wall()); lintel.position.set(0, 2.6, -H); g.add(lintel);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.14), woodMat(1, 2, 0xa9743f)); door.position.set(0, 1.05, -H); g.add(door);
    } else {
      const fw = new THREE.Mesh(new THREE.BoxGeometry(W, 3, 0.24), wall()); fw.position.set(0, 1.5, -H); g.add(fw);
    }
  }
  // 🪜 계단 — 올라가지 않는다. 옆에 서면 프롬프트가 뜨는 표지물(스펙 §4.2)
  const st = new THREE.Group(); st.position.set(H - 1.2, 0.2, H - 1.2);
  [0, 1, 2].forEach(i => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.4), woodMat(1, 1, 0x9c6b40));
    s.position.set(0, 0.11 + i * 0.22, -i * 0.4); st.add(s);
  });
  g.add(st);
  scene.add(g); g.visible = false;
  setFogExempt(g, true);
  return g;
}

function buildInterior() {
  for (const def of floorsFor(6)) interiorFloors[def.f] = buildRoom(def);   // 6단계 기준으로 다 지어 두고 토글
  interiorGroup = interiorFloors[0];
  interiorFloor = interiorGroup.children[0];
  interiorLamp = new THREE.PointLight(0xffd9a0, 0, 26);
  interiorLamp.position.copy(INT).add(new THREE.Vector3(0, 3.4, 0));
  scene.add(interiorLamp);
}
```

> ⚠️ `floorsFor(6)` 은 f=1 로 **2층(half 6)** 을 준다. 4단계 다락(half 4.5)은 같은 f 를 쓰므로
> 방을 따로 짓지 않고, 4단계에서는 2층 방을 그대로 쓰되 클램프만 4.5 로 좁힌다 —
> 벽이 조금 멀어 보이는 대신 증축 시 방을 다시 짓지 않아도 된다.

- [ ] **Step 2: 가시성 토글을 층별로 바꾼다**

`js/game.js:518` `setSpaceVisible()` 의 두 줄을 교체:

```js
  // 🏠 층은 한 번에 하나만 — interiorGroup 하나가 아니라 층별 그룹을 토글한다.
  for (const f in interiorFloors) interiorFloors[f].visible = indoor && +f === houseFloor;
  // 🛋️ 가구 메시는 scene 직속(interiorGroup 자식이 아님) — 방과 같이 따로 꺼야 한다.
  //    방은 월드 (0,0,52)에 실제로 서 있고 마을 이동 한계는 반경 42다. 그래서 북쪽 끝에 서면
  //    벽·바닥이 숨은 자리에 가구만 들판 위에 떠 보였다(제보 2026-09-15 "맵 끝에 피아노·장롱").
  //    ⚠️ 층이 생긴 뒤로는 **다른 층 가구도** 같은 이유로 떠 보인다 — 두 조건을 모두 본다.
  for (const m of decorMeshes) m.visible = indoor && (m.userData.rec?.f || 0) === houseFloor;
```

- [ ] **Step 3: 층 이동 함수와 프롬프트를 더한다**

`js/game.js` 에 추가:

```js
/** 🪜 층 이동 — 계단을 걸어 올라가지 않는다(스펙 §4.2). 같은 자리에 서서 층만 바뀐다. */
function goFloor(f) {
  const def = floorAt(gameState.houseStage, f); if (!def) return;
  houseFloor = f;
  player.position.x = Math.max(INT.x - def.half + 1.5, Math.min(INT.x + def.half - 1.5, player.position.x));
  player.position.z = Math.max(INT.z - def.half + 1.5, Math.min(INT.z + def.half - 1.5, player.position.z));
  setSpaceVisible();
  Sound.blip();
  trackEvent('house_floor', { to: def.id, stage: gameState.houseStage });   // [GA4] 층 사용률
}
```

`updateDoorInteract` 가 쓰는 지역 변수에 `ndFloor` 를 더한다 — `nd`/`prompt` 를 선언하는 줄 옆:

```js
  let ndFloor = 0;    // nd === 'floor' 일 때 갈 층
```

`js/game.js:9728` 실내 분기, `🚪 나가기` 판정 **뒤에** 층 프롬프트를 더한다:

```js
    // 🪜 계단 — 층이 있을 때만. 오른쪽 뒤 모서리(buildRoom 의 계단 위치)
    const fdef = floorAt(gameState.houseStage, houseFloor);
    const opens = floorsFor(gameState.houseStage).filter(o => o.f !== houseFloor);
    if (fdef && opens.length && dist2D({ x: INT.x + fdef.half - 1.2, z: INT.z + fdef.half - 1.2 }, player.position) < 1.6) {
      const up = opens.find(o => o.f > houseFloor) || opens[0];   // 위가 있으면 위로, 없으면 아래로
      nd = 'floor'; ndFloor = up.f; prompt = `🪜 ${up.name}으로`;
    }
```

액션 처리부(`nd` 분기)에 추가:

```js
    if (nd === 'floor') { goFloor(ndFloor); return; }
```

- [ ] **Step 4: 클램프를 층별 half 로 바꾼다**

`js/game.js:7450` 교체:

```js
function curHalf() { return (floorAt(gameState.houseStage, houseFloor) || { half: INT_HALF }).half; }
function decorClampX(x) { const h = curHalf(); return Math.max(INT.x - h + DECOR_WALL_PAD, Math.min(INT.x + h - DECOR_WALL_PAD, x)); }
function decorClampZ(z) { const h = curHalf(); return Math.max(INT.z - h + DECOR_WALL_PAD, Math.min(INT.z + h - DECOR_WALL_PAD, z)); }
```

`js/game.js:10309` 실내 이동 클램프 교체:

```js
    const h = curHalf();
    player.position.x = Math.max(INT.x - h + 0.6, Math.min(INT.x + h - 0.6, player.position.x));
    player.position.z = Math.max(INT.z - h + 0.5, Math.min(INT.z + h - 0.6, player.position.z));
```

- [ ] **Step 5: 미니맵이 현재 층 가구만 찍게 한다**

`js/game.js:10082` 교체 — 다른 층 가구가 미니맵에 겹쳐 찍히면 어디가 비었는지 읽을 수 없다:

```js
    for (const d of gameState.house.decor) {
      if ((d.f || 0) !== houseFloor) continue;                                                  // 🏠 지금 층만
      marks.push({ x: INT.x + d.x, z: INT.z + d.z, c: '#e0b483', r: 2.2 });                     // 배치한 가구
    }
```

`js/game.js:10072` 나가는 문 마크도 1층에서만 찍는다:

```js
    if (houseFloor === 0) marks.push({ x: INT.x, z: INT.z - INT_HALF, c: '#c8905a', kind: 'exit' });
```

- [ ] **Step 6: 집에 들어갈 때 항상 1층에서 시작하게 한다**

집 문으로 들어가는 처리(`indoor = true` 로 바꾸는 곳)에 `houseFloor = 0;` 을 같이 넣는다.

- [ ] **Step 7: 전체 테스트**

Run: `npm test`
Expected: PASS (전부)

- [ ] **Step 8: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🪜 실내 층을 짓고 근접 프롬프트로 오르내린다"
```

---

### Task 5: 상점에 층 해금 반영

**Files:**
- Modify: `js/game.js:1781` (`Input.getDecor`)
- Modify: `js/game.js:7419` (`placeDecor` — 실외 전용 가드)
- Test: `tests/house-floors.test.mjs`

**Interfaces:**
- Consumes: Task 1 `decorUnlocked`/`canPlaceOn`
- Produces: `getDecor()` 항목에 `locked: boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
test('상점 목록은 잠긴 가구에 locked 를 붙인다', () => {
  const list = [{ id: 'sofa' }, { id: 'jacuzzi', stage: 6 }].map(d => ({ ...d, locked: !decorUnlocked(d, 4) }));
  assert.deepEqual(list.map(d => d.locked), [false, true]);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: 이 케이스는 모듈만 쓰므로 통과한다 — `getDecor` 변경은 아래 Step 3에서 소스 문자열로 잠근다.

```js
test('getDecor 가 해금 상태를 실어 보낸다', () => {
  assert.ok(SRC.includes('locked: !decorUnlocked('));
});
```

- [ ] **Step 3: getDecor 가 해금 상태를 붙이게 한다**

`js/game.js:1781` 교체:

```js
  getDecor() {   // 🏠 층별 해금 — 잠긴 것도 목록엔 보이되 locked 로 흐리게(살 목표가 보여야 싱크가 된다)
    const st = gameState.houseStage;
    return DECOR.map(d => ({ ...d, locked: !decorUnlocked(d, st) }));
  },
```

- [ ] **Step 4: 실외 전용 가구 가드를 더한다**

`placeDecor` 의 결제 **앞**에:

```js
  const floorDef = floorAt(gameState.houseStage, curFloor);
  if (!decorUnlocked(def, gameState.houseStage)) { ui.toast?.('집을 더 증축하면 살 수 있어요'); return false; }
  if (!canPlaceOn(def, floorDef)) { ui.toast?.(`${def.ico} ${def.name}은 루프탑에만 놓을 수 있어요`); return false; }
```

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/game.js tests/house-floors.test.mjs
git commit -m "feat: 🔒 상점에 층 해금과 실외 전용 가드를 건다"
```

---

### Task 6: 🏖️ 옥상 파라솔 세트 승계 (§8.2 충돌 해소)

**Files:**
- Modify: `js/game.js` (루프탑 입장 시 addons 반영)
- Test: `tests/house-floors.test.mjs`

**Interfaces:**
- Consumes: `gameState.house.addons` (기존), Task 1 `floorAt`
- Produces: `rooftopFreeDecor(addons) → string[]`

**배경:** 6단계 구성품 `rooftop_set`(900🪙, `js/house/addons.js:216`)이 이미 옥상 파라솔·라운지 체어를 외관에 붙인다. 루프탑을 올라갈 수 있는 층으로 만들면 같은 공간을 두 시스템이 다툰다. 이미 산 사람은 그게 **루프탑에 실제로 놓여 있어야** 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`js/house-floors.js` 에 들어갈 규칙:

```js
test('옥상 파라솔 세트를 샀으면 루프탑에 값 없이 놓인다', () => {
  assert.deepEqual(rooftopFreeDecor(['rooftop_set']), ['parasol_set']);
  assert.deepEqual(rooftopFreeDecor([]), []);
  assert.deepEqual(rooftopFreeDecor(['palms']), []);
});
```

import 에 `rooftopFreeDecor` 추가.

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- tests/house-floors.test.mjs`
Expected: FAIL — `rooftopFreeDecor is not a function`

- [ ] **Step 3: 규칙을 쓴다**

`js/house-floors.js` 끝에 추가:

```js
/**
 * 🏖️ 이미 산 구성품 중 루프탑에 실물로 놓아 줄 것 — 추가 비용 없음.
 * 옥상 파라솔 세트(900🪙)는 외관 장식으로만 붙어 있었다. 루프탑에 올라갈 수 있게 된 뒤로는
 * 같은 공간을 두 시스템이 다투므로, 산 사람에게는 실제로 앉을 수 있는 가구로 돌려준다.
 */
export function rooftopFreeDecor(addons = []) {
  return addons.includes('rooftop_set') ? ['parasol_set'] : [];
}
```

- [ ] **Step 4: 가구 정의와 배치를 더한다**

`DECOR` 에 추가(상점에는 안 뜬다 — `hidden`):

```js
  { id: 'parasol_set', name: '파라솔 세트', ico: '🏖️', cost: 0, pay: 'coins', stage: 6, outdoorOnly: true, hidden: true, foot: [1.8, 1.2] },
```

`getDecor()` 에서 걸러낸다:

```js
    return DECOR.filter(d => !d.hidden).map(d => ({ ...d, locked: !decorUnlocked(d, st) }));
```

루프탑에 처음 올라갈 때 한 번 놓는다 — `goFloor` 안, `houseFloor = f;` 뒤에:

```js
  if (def.outdoor) for (const id of rooftopFreeDecor(gameState.house.addons)) {
    if (!gameState.house.decor.some(r => r.id === id)) placeDecor(id, INT.x, INT.z + def.half - 2, true, 0, true, f);
  }
```

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/game.js js/house-floors.js tests/house-floors.test.mjs
git commit -m "feat: 🏖️ 산 옥상 파라솔 세트를 루프탑에 실물로 놓는다"
```

---

### Task 7: 🪜 실내 마감을 집 단계에 맞춘다 (계단·바닥)

**Files:**
- Modify: `js/game.js` (`buildRoom` 의 바닥·계단, `INT_FLOOR_TINT`, `buildHouseStage`)

**Interfaces:**
- Consumes: Task 1 `floorAt`, Task 4 `buildRoom`/`refreshStairsLandmarks`/`interiorFloors`
- Produces: 단계별 실내 마감(바닥 재질·계단 조형), `rebuildInteriorFinish()`

**배경(사용자 요청):** 계단이 `woodMat(1,1,0x9c6b40)` 박스 3개라 조악하고, 바닥은 전 단계·전 층이
`woodMat(7,7,INT_FLOOR_TINT)` 로 동일하다. 800🪙 를 내고 루프탑 빌라를 지어도 실내 바닥이 코티지와
같으면 증축 체감이 또 밖에서 끝난다 — 이 프로젝트가 고치려는 바로 그 문제다.

**팔레트는 외관 모델에서 그대로 가져온다**(실내·외관이 같은 집으로 읽혀야 한다):

| 단계 | 바닥 | 계단 | 출처 |
|---|---|---|---|
| 3 코티지 | 따뜻한 원목(지금 그대로) | 나무 디딤판 + 나무 난간 | `js/house/cottage.js` |
| 4 브릭 로프트 | 콘크리트 | 검은 철골 | `js/house/loft.js` steel `0x23252a` |
| 5 펜트하우스 | 밝은 폴리시드 스톤 | 원목 디딤판 + 검은 철제 난간 | `js/house/penthouse.js` black `0x1e1f23` |
| 6 루프탑 빌라 | 흰 대리석 | 유리 난간 | `js/house/villa.js` interior `0xf1ece3`, railGlass |
| 루프탑(실외) | 나무 데크 | — | `js/house/villa.js` wood `0xc19a66` (수영장 데크와 같은 색) |

**계단 조형**: 박스 3개 → 디딤판 5단 + 측면 스트링어 + 난간(기둥·손잡이).
여전히 **올라가지 않는다** — 스펙 §4.2 의 표지물 성격과 위/아래 두 랜드마크 구조는 그대로 둔다.

> 드로우콜(스펙 §8.3): 계단 메시가 3 → 10 안팎으로 는다. 층당 계단이 최대 2개이므로
> 재질을 **단계당 2종(디딤판·난간)** 으로 묶어 증가를 재질 수만큼으로 제한한다.
> 재질은 `buildStairs` 안이 아니라 밖에서 한 번 만들어 그 방의 계단 둘이 나눠 쓴다.

- [ ] **Step 1: 단계별 마감 팔레트를 한 곳에 정의한다**

`buildRoom` 위에 단계 → 마감 표를 만든다. 재질 인스턴스가 아니라 **색·파라미터**만 담는다
(재질은 방을 지을 때 만들어야 `setFogExempt` 가 방별로 걸린다):

```js
// 🎨 단계별 실내 마감 — 팔레트는 외관 모델(js/house/*.js)에서 가져와 안팎이 같은 집으로 읽히게 한다.
//    색만 담고 재질은 buildRoom 에서 만든다(방마다 fog 예외를 따로 걸어야 하므로).
const INT_FINISH = {
  3: { floor: { kind: 'wood',  c: 0xbfb0a0, rep: 7 }, tread: 0x9c6b40, rail: 0x8a5a36 },
  4: { floor: { kind: 'stone', c: 0xb9b3a8, rep: 6 }, tread: 0x3a3d44, rail: 0x23252a },
  5: { floor: { kind: 'stone', c: 0xe2ddd2, rep: 5 }, tread: 0xb98a4e, rail: 0x1e1f23 },
  6: { floor: { kind: 'stone', c: 0xf1ece3, rep: 4 }, tread: 0xf1ece3, rail: 'glass' },
};
const finishFor = (stage) => INT_FINISH[Math.min(6, Math.max(3, stage || 3))];
```

- [ ] **Step 2: 바닥을 단계별로 바꾼다**

`buildRoom` 의 바닥 한 줄을 교체한다. 루프탑(`def.outdoor`)은 실외 데크이므로 표와 무관하게 나무 데크다:

```js
  const fin = finishFor(gameState.houseStage);
  const floorMat = def.outdoor
    ? woodMat(3, 3, 0xc19a66)                                   // 루프탑 — 수영장 데크와 같은 널(villa.js wood)
    : fin.floor.kind === 'wood' ? woodMat(fin.floor.rep, fin.floor.rep, fin.floor.c)
                                : clayMat(fin.floor.c, false);   // 돌·대리석은 평면 음영 없이
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, W), floorMat);
```

- [ ] **Step 3: 계단을 제대로 된 조형으로 바꾼다**

`buildStairs` 를 교체한다. 재질은 함수 **밖에서 한 번** 만들어 두 계단이 나눠 쓴다(드로우콜):

```js
  // 계단 재질은 방에 하나씩 — 위/아래 두 랜드마크가 같은 재질을 쓴다(스펙 §8.3)
  const treadMat = clayMat(fin.tread);
  const railMat = fin.rail === 'glass' ? makeHouseHelpers(THREE).glass(0xa9d8ea) : clayMat(fin.rail);
  if (fin.rail === 'glass') railMat.opacity = 0.22;             // villa.js railGlass 와 같은 값
  const STEPS = 5, RISE = 0.17, RUN = 0.34;
  const slope = Math.atan2(STEPS * RISE, STEPS * RUN);
  const runLen = Math.hypot(STEPS * RUN, STEPS * RISE);
  const buildStairs = (cx) => {
    const st = new THREE.Group(); st.position.set(cx, 0.2, H - 1.2);
    for (let i = 0; i < STEPS; i++) {                           // 디딤판
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, RUN), treadMat);
      s.position.set(0, RISE * (i + 1), -i * RUN); s.castShadow = true; st.add(s);
    }
    [-0.5, 0.5].forEach(sx => {                                 // 측면 스트링어(비스듬한 판)
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, runLen), treadMat);
      side.position.set(sx, RISE * STEPS / 2, -(STEPS - 1) * RUN / 2);
      side.rotation.x = slope; st.add(side);
    });
    if (fin.rail === 'glass') {                                 // 유리 난간 — 판 하나
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, runLen), railMat);
      pane.position.set(0.52, RISE * STEPS / 2 + 0.36, -(STEPS - 1) * RUN / 2);
      pane.rotation.x = slope; st.add(pane);
    } else {                                                    // 기둥 + 손잡이
      for (let i = 0; i < 3; i++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6), railMat);
        post.position.set(0.52, RISE * (i * 2 + 1) + 0.25, -i * 2 * RUN); st.add(post);
      }
      const hand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, runLen, 6), railMat);
      hand.position.set(0.52, RISE * STEPS / 2 + 0.5, -(STEPS - 1) * RUN / 2);
      hand.rotation.set(Math.PI / 2 - slope, 0, 0); st.add(hand);
    }
    g.add(st);
    return st;
  };
```

> 계단 프롬프트 판정 좌표(`updateDoorInteract`)는 `H - 1.2` 를 그대로 쓴다 — 계단 자리는 안 바뀐다.

- [ ] **Step 4: 증축하면 실내 마감이 따라오게 한다**

`buildRoom` 이 `gameState.houseStage` 를 읽으므로 **방을 지을 때의 단계**로 마감이 굳는다.
집 안에서 증축하면 마감이 안 따라온다. 방을 다시 짓는 함수를 만든다:

```js
// 🏠 증축하면 실내 마감(바닥·계단)도 그 단계로 다시 짓는다 — 방 안에서 증축해도 즉시 반영된다.
function rebuildInteriorFinish() {
  for (const id in interiorFloors) {
    const grp = interiorFloors[id];
    unregisterWindows(grp);            // 창 재질이 houseWindows 에 남지 않게(누수 방지)
    scene.remove(grp);
  }
  interiorFloors = {};
  buildInterior();
  setSpaceVisible();
}
```

`buildHouseStage` 안에서 `refreshStairsLandmarks()` 를 부르던 자리를 `rebuildInteriorFinish()` 로 바꾼다.

> ⚠️ `buildInterior` 는 `interiorLamp` 도 만든다. 다시 부를 때 조명이 **두 번** 생기지 않는지 확인하고,
> 생긴다면 램프 생성은 `rebuildInteriorFinish` 경로에서 건너뛴다.

- [ ] **Step 5: 전체 테스트**

Run: `npm test`
Expected: PASS (629+)

- [ ] **Step 6: 커밋**

커밋 메시지: `feat: 🪜 실내 바닥·계단을 집 단계에 맞춰 고급스럽게 한다`
(스테이징 대상: `js/game.js`)

---

### Task 8: i18n 영문 + 시각 검증

**Files:**
- Modify: `js/i18n-en.js`
- Test: 브라우저 실측

- [ ] **Step 1: 영문 키를 더한다**

`js/i18n-en.js` 에 추가:

```js
  '흔들의자': 'Rocking Chair', '망원경': 'Telescope', '여행 트렁크': 'Travel Trunk',
  '욕조': 'Bathtub', '큰 그림': 'Large Painting', '샹들리에': 'Chandelier',
  '그랜드 피아노': 'Grand Piano', '파이어핏': 'Fire Pit', '큰 화분나무': 'Potted Tree',
  '자쿠지': 'Jacuzzi', '파라솔 세트': 'Parasol Set',
  '1층': 'Ground Floor', '다락': 'Attic', '2층': 'Second Floor', '루프탑': 'Rooftop',
  '집을 더 증축하면 살 수 있어요': 'Expand your house to unlock this',
```

프롬프트 `🪜 {0}으로` 와 토스트 `{0}은 루프탑에만 놓을 수 있어요` 는 조합 문자열이므로
**기존 조합 프롬프트 규칙**(i18n 글루 함정)에 맞춰 키를 등록한다.

- [ ] **Step 2: 전체 테스트**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: 시각 검증 — 층별 캡처**

각 단계에서 각 층을 낮·밤으로 캡처한다. 로컬 서버를 띄우고 `?house=4|5|6` 으로 단계를 만든 뒤,
층 이동은 프롬프트를 찾아 걸어가지 말고 브라우저에서 직접 구동한다(indoor-decor-v2 때와 같은 방법):

```js
// 브라우저 콘솔 / playwright evaluate
__enterHouse?.();            // 없으면 문 앞으로 이동 후 액션
window.__goFloor = 1;        // 또는 프롬프트 액션으로 층 이동
getGameState().houseStage;   // 단계 확인
```

> `goFloor` 는 모듈 지역 함수다. 검증용으로 부르려면 `buildInterior` 근처에서
> `if (DEV) window.__goFloor = goFloor;` 같은 기존 dev 훅 규칙을 따라 노출한다
> (`__nightTest`/`__mistTest` 와 같은 자리).

확인 항목:
- 4단계 다락 · 5단계 2층 · 6단계 루프탑이 뜨는가
- 루프탑에서 하늘이 보이고 난간이 서 있는가
- 💠샹들리에 · 🔥파이어핏이 밤에 켜지는가

- [ ] **Step 4: 드로우콜 측정 (스펙 §8.3)**

구조상 층은 한 번에 하나만 그리므로 순증이 없어야 한다. 하지만 새 고급 가구는 부품이 8개 안팎으로
기존 가구(2~4개)보다 무겁다 — **추측하지 말고 잰다.** 측정 훅은 이미 있다:

```js
window.__perf()   // { calls, tris, geoms, tex, objs: [전체 메시, 보이는 메시] } — js/game.js:2218
```

**기준선부터 잡는다.** `main` 브랜치(이 작업 전)에서 같은 지점을 먼저 재고, 이 브랜치와 비교한다.
같은 세이브·같은 날씨·같은 시각(`?weather=clear`)에서 재야 비교가 성립한다.

| 재는 지점 | 기준선(main) | 이 브랜치 | 판정 |
|---|---|---|---|
| 마을 한가운데(실외) | | | 같아야 한다 — 실외는 이 작업과 무관 |
| 집 1층, 가구 없음 | | | 같아야 한다 |
| 집 1층, 가구 10개 | | | 같아야 한다(가구 종류가 같다면) |
| 5단계 2층, 고급 가구 5개 | — | | 1층 동급 대비 증가분을 기록 |
| 6단계 루프탑, 고급 가구 5개 | — | | 실외 층이라 하늘·난간이 더 든다 |

**판정 기준**: 실외와 1층 수치가 기준선과 같으면 층 구조는 무해하다. 위층 수치가 1층보다 크게 높으면
원인은 층이 아니라 **가구 부품 수**이므로, 가장 무거운 가구부터 재질별 병합을 검토한다
(카페 32→24 패턴). `objs` 의 [전체, 보이는] 격차가 벌어지는 건 정상 — 숨긴 층의 메시다.

결과를 `.superpowers/sdd/2026-09-17-house-floors/drawcalls.md` 에 표로 남긴다.

- [ ] **Step 5: 회귀 검증 — §8.1 재발 확인**

**가장 중요한 항목.** 가구를 여러 층에 놓은 뒤 집을 나가서:
- 마을 **북쪽 끝(반경 42 경계)** 까지 걸어간다
- 들판 위에 가구가 떠 보이지 않는지 확인한다
- 1층에서 2층 가구가 보이지 않는지, 그 반대도 확인한다

- [ ] **Step 6: 세이브 회귀**

기존 세이브(가구가 있는 것)를 불러 **전부 1층에 그대로** 있는지 확인한다.

- [ ] **Step 7: 모바일 실측**

브라우저 페인 mobile 프리셋으로 🪜 프롬프트가 프롬프트 줄에 제대로 뜨는지 본다.

- [ ] **Step 7: 커밋**

```bash
git add js/i18n-en.js
git commit -m "feat: 🌐 층·고급 가구 영문 문구를 더한다"
```
