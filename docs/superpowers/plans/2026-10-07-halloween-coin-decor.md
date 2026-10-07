# 할로윈 코인 장식 + 탁상 올려놓기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 탁상 올려놓기를 main 에 이식·개선하고(1부), 그 위에 할로윈 한정 코인 장식 6종과 기간 규칙을 얹는다(2부).

**Architecture:** 1부는 순수 모듈 `js/house/surface.js`(높이를 저장하지 않고 좌표에서 파생)를 만들고 `js/spaces/indoor.js` 가 후보 목록만 넘기는 얇은 어댑터를 둔다. 2부는 `SALE_WINDOWS.halloween` 을 재사용하는 `catalogVisible()` 로 기간 밖 항목을 목록에서 숨기고(보관분은 표시), 신규 구매 경로에 가드를 둔다. 6종 조형은 THREE 를 인자로 받는 순수 모듈 `js/spaces/halloween-art.js` 하나에 두어 시안 HTML 과 게임이 같은 코드를 쓴다.

**Tech Stack:** Vanilla JS(ESM) · Three.js(`vendor/three`) · `node --test`(`npm test`)

**Spec:** `docs/superpowers/specs/2026-10-07-halloween-coin-decor-design.md` (커밋 5b8f7ae)

## Global Constraints

- 한국어 UI 문구(상품 이름·설명·토스트·배너)는 **코드에 넣기 전에 후보를 보여 주고 사용자 검수를 받는다**(Task 0). 검수 결과가 이 계획의 후보 문구를 이긴다.
- 시안은 상품마다 **2~3안을 PC·모바일로 나란히** 보여 주고 **사용자 승인 뒤** 구현한다(Task 8).
- 가격(B안 확정): 유령 촛불 150 · 미니 묘비 200 · 마녀 솥 450 · 유령 정원등 200 · 묘비 울타리 280 · 거미줄 아치 500. 코인 전용, 집 단계 제한 없음(`stage` 미지정).
- 판매 기간은 `js/shop/sale-window.js` 의 `SALE_WINDOWS.halloween` 한 곳만 쓴다(날짜 복제 금지). 기간 밖 = 안 산 사람에겐 목록에서 숨김, 보관분은 계속 표시.
- 호박 계열(🎃 호박 더미·호박 등불·수확제 허수아비) 금지. 도구 스윙 모션·캐릭터 얼굴 변경 금지.
- 저폴리: 모델당 메시 ≤3(재질별 병합), 블룸 임계 0.85, 면 겹침 줄무늬·작은 소품 그림자 지글거림 주의, 기존 팔레트에 맞춘다. 천장 규칙 `0.2 + (top.y + h) × 1.5 < 3`.
- `js/data/catalog.js` 는 Node 에서 import 못 한다(`three` 의존). 테스트는 `tests/helpers/game-source.mjs` 의 `gameSource()` 텍스트 파싱으로 읽는다(`export ` 는 벗겨져 `function placeDecor(` 로 보인다).
- 새 코드를 `game.js` 에 몰지 않는다. `game.js`/`indoor.js` 는 한 줄 단위 연결만.
- 이 워크트리 세션의 git 은 **명령 하나씩**(`&&` 연결 금지). `git commit` 과 `grep -n` 을 한 명령에 섞지 않는다. 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- 푸시·병합·배포는 사용자 지시 전엔 하지 않는다. 푸시 전 비밀 스캔(공개 저장소).
- 워크트리: `/Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-coin-decor` · 기준선 `npm test` 1889/1889 통과.

## File Structure

| 파일 | 역할 | 부 |
|---|---|---|
| `js/house/surface.js` (신규) | 순수: `decorHalf`·`surfaceAt`·`ceilingOk` | 1 |
| `tests/house-surface.test.mjs` (신규) | surface 단위 테스트 | 1 |
| `tests/decor-ceiling.test.mjs` (신규) | 모든 상판×소품 천장 규칙(데이터 주도) | 1 |
| `tests/surface-wiring.test.mjs` (신규) | indoor/doors 연결 확인(텍스트) | 1 |
| `js/data/catalog.js` | `top`·`sm`·`h`·`deskLamp`, 6종 항목 | 1·2 |
| `js/spaces/indoor.js` | `surfaceFor`·`reseatDecor` + placeDecor·ghost·hit·nearest·pick 연결, `decorMesh` 분기, 구매 가드 | 1·2 |
| `js/spaces/doors.js` | 올려둔 소품 힌트 배너 1줄 | 1 |
| `js/game.js` | dev 훅, `getDecor/getOutdoor` 필터, `outdoorMesh` 분기, 구매 가드·로그 | 1·2 |
| `js/i18n-en.js` | 영어 이름·설명 | 1·2 |
| `js/shop/sale-window.js` | `catalogVisible()` 추가 | 2 |
| `tests/sale-visibility.test.mjs` (신규) | 기간 규칙 | 2 |
| `js/spaces/halloween-art.js` (신규) | 6종 조형(THREE 인자) | 2 |
| `tests/halloween-art.test.mjs` (신규) | 메시 수·크기 제약 | 2 |
| `tests/halloween-coin-catalog.test.mjs` (신규) | 카탈로그 6종 불변식 | 2 |
| `tests/halloween-coin-wiring.test.mjs` (신규) | 필터·가드·로그·모델 연결 | 2 |
| `tools/halloween/build-mockup.mjs` (신규) | 시안 HTML 단독 파일 생성 | 2 |
| `index.html` | 행 태그 표시 + CSS | 2 |

---

## Task 0: 한국어 문구 후보 검수 (사용자 게이트, 코드 없음)

Task 2 이전에 **Part 1 문구**, Task 9 이전에 **Part 2 문구**가 확정돼야 한다. Task 1 은 문구가 없어 먼저 진행 가능.

**Files:** Create: `dev/active/halloween-coin-decor/copy-candidates.md`

- [ ] **Step 1: 후보 문서를 쓰고 사용자에게 보여 준다** — 아래 표를 그대로 파일에 쓰고 요약을 채팅에 붙인다. 사용자가 고른 안과 수정 문구를 같은 파일 하단 "확정" 절에 기록한다.

| 위치 | 대상 | 후보 1(기본) | 후보 2 |
|---|---|---|---|
| 가구 이름(탁상) | 🪔 | 탁상 등불 | 작은 탁자 등불 |
| 올려둔 소품 힌트 제목 | 배너 제목 | 올려둔 소품 | 탁자 위 소품 |
| 올려둔 소품 힌트 본문 | 배너 본문 | 받치고 있는 가구는 직접 탭하면 옮겨요 | 아래 가구는 직접 탭해야 옮겨져요 |
| 실내 이름 | 👻 | 유령 촛불 | 속삭이는 촛불 |
| 실내 이름 | 🪦 | 미니 묘비 | 작은 묘비 |
| 실내 이름 | 🧙 | 마녀 솥 | 마녀의 솥 |
| 야외 이름 | 👻 | 유령 정원등 | 유령 등불 |
| 야외 설명 | 유령 정원등 | 밤이 되면 으스스하게 빛나는 유령 등 | 밤마다 하얗게 깜빡이는 유령 등 |
| 야외 이름 | 🪦 | 묘비 울타리 | 묘비 담장 |
| 야외 설명 | 묘비 울타리 | 묘비 모양 울타리 · 밤손님은 못 막아요 | 묘비가 늘어선 마당 장식 · 장식용이에요 |
| 야외 이름 | 🕸️ | 거미줄 아치 | 거미줄 문 |
| 야외 설명 | 거미줄 아치 | 마당 입구에 세우는 커다란 거미줄 아치 | 마당에 세우는 거미줄 걸린 아치 |
| 판매 종료 토스트 | | 🎃 할로윈 장식 판매가 끝났어요 | 🎃 할로윈 장식은 판매 기간이 지났어요 |

기존에 검수된 라벨 `🎃 할로윈 한정`(`saleTagOf`)은 그대로 쓴다.

- [ ] **Step 2: 확정 문구를 `copy-candidates.md` 에 기록한다.** 이후 Task 의 코드 속 문구는 후보 1 기준이므로, 사용자가 다른 안을 골랐으면 그 값으로 바꿔 쓴다(바꿀 곳: catalog.js·i18n-en.js·테스트의 이름 목록).

---

# 1부 — 탁상 올려놓기

## Task 1: `js/house/surface.js` 순수 모듈 (TDD)

**Files:**
- Create: `js/house/surface.js`
- Test: `tests/house-surface.test.mjs`

**Interfaces:**
- Produces: `WALL_H = 3`, `FLOOR_LIFT = 0.2`, `decorHalf(foot, rot, scale) → [hw, hd]`, `surfaceAt({ x, z, f, def, rot, hosts, scale }) → { y, hostIndex } | null`(`y` 는 상판 윗면 높이×scale, FLOOR_LIFT·층 높이 제외), `ceilingOk(topY, h, scale, wallH = WALL_H) → boolean`.
- `hosts` 항목 모양: `{ id, x, z, rot, f, top: { y, pad: [가로, 세로] } }`(x,z 는 월드 좌표).

- [ ] **Step 1: Write the failing test**

```js
// tests/house-surface.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL_H, FLOOR_LIFT, decorHalf, surfaceAt, ceilingOk } from '../js/house/surface.js';

const S = 1.5;
const table = { id: 'table', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.66, pad: [1.1, 0.7] } };
const bigtable = { id: 'bigtable', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.69, pad: [1.8, 1.0] } };
const vase = { sm: true, foot: [0.3, 0.3] };
const at = (o) => surfaceAt({ x: 10, z: 20, f: 0, def: vase, rot: 0, hosts: [table], scale: S, ...o });

test('상수', () => { assert.equal(WALL_H, 3); assert.equal(FLOOR_LIFT, 0.2); });

test('decorHalf: 90° 에서 가로·세로가 바뀐다', () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);   // 0.55*1.5 = 0.8250000000000001 — 부동소수점
  assert.ok(near(decorHalf([1.1, 0.7], 0, S), [0.825, 0.525]));
  assert.ok(near(decorHalf([1.1, 0.7], 1, S), [0.525, 0.825]));
});

test('sm 이 아닌 가구는 올라가지 않는다', () => {
  assert.equal(at({ def: { foot: [0.3, 0.3] } }), null);
});

test('상판 중심 위에 놓으면 상판 높이(배율 곱)로 올라간다', () => {
  const r = at({});
  assert.equal(r.hostIndex, 0);
  assert.ok(Math.abs(r.y - 0.66 * S) < 1e-9);
});

test('가장자리에 걸치는 건 허용, 중심이 밖이면 바닥', () => {
  assert.notEqual(at({ x: 10 + 0.825 }), null);
  assert.equal(at({ x: 10 + 0.83 }), null);
});

test('상판보다 큰 소품은 거부한다(스툴 위 어항)', () => {
  const stool = { id: 'stool', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.42, pad: [0.44, 0.44] } };
  const aquarium = { sm: true, foot: [0.66, 0.42] };
  assert.equal(at({ def: aquarium, hosts: [stool] }), null);
});

test('폭이 같은 조합은 허용(협탁 위 라디오)', () => {
  const ns = { id: 'nightstand', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.55, pad: [0.5, 0.45] } };
  const radio = { sm: true, foot: [0.5, 0.25] };
  assert.notEqual(at({ def: radio, hosts: [ns] }), null);
});

test('상판이 겹치면 가장 높은 것을 고른다', () => {
  const r = at({ hosts: [table, bigtable] });
  assert.equal(r.hostIndex, 1);
  assert.ok(Math.abs(r.y - 0.69 * S) < 1e-9);
});

test('다른 층 상판은 무시한다', () => {
  const upper = { ...table, f: 1 };
  assert.equal(at({ f: 0, hosts: [upper] }), null);
  assert.notEqual(at({ f: 1, hosts: [upper] }), null);
});

test('f 가 없는 옛 레코드는 1층(0)으로 본다', () => {
  const old = { ...table }; delete old.f;
  assert.notEqual(at({ f: 0, hosts: [old] }), null);
});

test('상판을 돌리면(90°) pad 가로·세로가 바뀐다', () => {
  const turned = { ...table, rot: 1 };
  assert.equal(at({ x: 10 + 0.7, hosts: [turned] }), null);   // rot 1 은 가로 반폭 0.525
  assert.notEqual(at({ z: 20 + 0.7, hosts: [turned] }), null); // 세로 반폭 0.825
});

test('top 이 없는 가구는 받침이 아니다', () => {
  assert.equal(at({ hosts: [{ id: 'sofa', x: 10, z: 20, rot: 0, f: 0 }] }), null);
});

test('ceilingOk: 탁상 등불은 되고 스탠드 램프(1.6)는 안 된다', () => {
  assert.equal(ceilingOk(0.66, 0.42, S), true);
  assert.equal(ceilingOk(0.66, 1.6, S), false);   // 0.2+(0.66+1.6)*1.5 = 3.59
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/house-surface.test.mjs`
Expected: FAIL — `Cannot find module '../js/house/surface.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// js/house/surface.js
// =============================================================
//  calm forest · 🪔 상판 올려놓기 규칙 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 높이를 세이브에 넣지 않는다. "소품의 y = 그 자리를 덮는 같은 층 상판 중 가장 높은 것" 을 매번 계산한다.
//    저장 포맷이 그대로고(옛 세이브 호환), 받침을 치우면 소품이 저절로 바닥으로 내려온다.
//  ▶ 판정은 조준과 같은 규칙 — 소품 **중심이 상판 안**이면 올라간다(가장자리 걸침 허용).
//    소품이 상판보다 크면 거부한다(스툴 위 어항처럼 떠 보이는 조합 차단).
//  ▶ 원본: 커밋 e93a8a1(feat/capacitor, 미병합). 다층(f)·순수 분리·천장 규칙 테스트를 더해 이식.
//  ▶ 테스트: tests/house-surface.test.mjs · tests/decor-ceiling.test.mjs
// =============================================================

export const WALL_H = 3;        // 실내 벽 높이(js/spaces/indoor.js 방 모델의 벽 BoxGeometry 높이)
export const FLOOR_LIFT = 0.2;  // 가구 원점이 바닥 면에서 띄워진 높이(placeDecor 의 0.2)

/** 발자국·상판 크기(배율 전, [가로, 세로])의 반폭 — 90°·270° 면 가로·세로 교환 */
export function decorHalf(foot, rot, scale) {
  return [foot[rot % 2 ? 1 : 0] / 2 * scale, foot[rot % 2 ? 0 : 1] / 2 * scale];
}

/**
 * 이 자리가 상판 위인가.
 * @param {{x:number,z:number,f?:number,def:object,rot:number,hosts:object[],scale:number}} a
 *   hosts[i] = { id, x, z, rot, f, top: { y, pad } } (x,z 는 월드 좌표)
 * @returns {{y:number,hostIndex:number}|null}  y = 상판 윗면 높이 × scale (FLOOR_LIFT·층 높이 제외)
 */
export function surfaceAt({ x, z, f = 0, def, rot, hosts, scale }) {
  if (!def?.sm) return null;                                   // 올릴 수 있는 소품만
  const [mw, md] = def.foot ? decorHalf(def.foot, rot, scale) : [0, 0];
  let best = null;
  hosts.forEach((h, i) => {
    if (!h.top || (h.f || 0) !== f) return;                    // 상판이 있고 같은 층이어야 한다
    const [hw, hd] = decorHalf(h.top.pad, h.rot, scale);
    if (mw > hw || md > hd) return;                            // 상판보다 큰 소품은 못 올린다
    if (Math.abs(x - h.x) > hw || Math.abs(z - h.z) > hd) return;
    const y = h.top.y * scale;
    if (!best || y > best.y) best = { y, hostIndex: i };
  });
  return best;
}

/** 상판(topY) 위 소품(높이 h, 둘 다 배율 전)이 천장 아래에 드는가 — 루프탑(천장 없음)엔 쓰지 않는다 */
export function ceilingOk(topY, h, scale, wallH = WALL_H) {
  return FLOOR_LIFT + (topY + h) * scale < wallH;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/house-surface.test.mjs`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add js/house/surface.js tests/house-surface.test.mjs
git commit -m "feat: surface.js — 상판 올려놓기 순수 규칙(다층 대응)"
```

---

## Task 2: 탁상 데이터(`top`·`sm`·`h`·`deskLamp`) + 천장 테스트

선행: Task 0 의 Part 1 문구 확정(탁상 등불 이름).

**Files:**
- Modify: `js/data/catalog.js:17-57` (DECOR)
- Modify: `js/spaces/indoor.js` (`decorMesh` 에 `deskLamp` 분기, `nightstand` 분기 앞)
- Modify: `js/i18n-en.js` (`'램프': 'Lamp',` 다음)
- Modify: `tests/house-floors.test.mjs` ("기존 21종" 단언)
- Test: `tests/decor-ceiling.test.mjs`

**Interfaces:**
- Consumes: `ceilingOk(topY, h, scale)` from Task 1.
- Produces: DECOR 항목에 `top: { y, pad }`(상판), `sm: true`+`h`(올릴 수 있는 소품, 배율 전 높이). `deskLamp` 항목.

- [ ] **Step 1: Write the failing test**

```js
// tests/decor-ceiling.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
import { ceilingOk } from '../js/house/surface.js';

const SRC = gameSource();
const start = SRC.indexOf('const DECOR = [');
const LINES = SRC.slice(start, SRC.indexOf('\n];', start)).split('\n');
const idOf = (l) => (l.match(/id: '(\w+)'/) || [])[1];
const numOf = (l, re) => { const m = l.match(re); return m ? Number(m[1]) : null; };

const tops = LINES.filter(l => /\btop: \{/.test(l)).map(l => ({ id: idOf(l), y: numOf(l, /top: \{ y: ([\d.]+)/) }));
const smalls = LINES.filter(l => /\bsm: true/.test(l)).map(l => ({ id: idOf(l), h: numOf(l, /\bh: ([\d.]+)/) }));
const DECOR_SCALE = Number(SRC.match(/const DECOR_SCALE = ([\d.]+)/)[1]);

test('상판 가구는 낮은 4종만이다(책장·옷장·벽난로 제외)', () => {
  assert.deepEqual(tops.map(t => t.id).sort(), ['bigtable', 'nightstand', 'stool', 'table']);
  tops.forEach(t => assert.ok(Number.isFinite(t.y), `${t.id} top.y`));
});

test('올릴 수 있는 소품(sm)은 전부 높이 h 를 가진다', () => {
  assert.ok(smalls.length >= 5);   // 화분·탁상 등불·어항·꽃병·라디오 (+ 2부의 유령 촛불)
  smalls.forEach(s => assert.ok(Number.isFinite(s.h) && s.h > 0, `${s.id} 에 h 가 없다`));
});

test('모든 상판 × 소품 조합이 천장 아래에 든다', () => {
  for (const t of tops) for (const s of smalls) {
    assert.equal(ceilingOk(t.y, s.h, DECOR_SCALE), true, `${s.id} 를 ${t.id} 위에 올리면 천장을 뚫는다`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/decor-ceiling.test.mjs`
Expected: FAIL — 상판 가구가 `[]` 라서 `deepEqual` 실패

- [ ] **Step 3: Implement — DECOR 에 `top`·`sm`·`h` 와 `deskLamp`**

`js/data/catalog.js` 의 DECOR 위 주석(`//   foot: ...` 두 줄 아래)에 추가:
```js
//   🪔 top: { y, pad } — 소품을 올려놓을 수 있는 상판(y 는 배율 전 윗면 높이, pad 는 [가로, 세로]).
//      sm: true + h — 상판에 올릴 수 있는 작은 소품(h 는 배율 전 높이). 높이를 저장하지 않고 좌표에서 파생시킨다(js/house/surface.js).
//      벽 높이가 3 이라 상판은 낮은 가구만 — 새 상판/소품은 tests/decor-ceiling.test.mjs 가 천장 규칙을 검사한다.
```
해당 줄을 아래처럼 바꾼다(나머지 줄은 그대로):
```js
  { id: 'plant',    name: '화분',   ico: '🪴', cost: 2, pay: 'crop', foot: [0.45, 0.45], sm: true, h: 0.8 },
  { id: 'table',    name: '테이블', ico: '🟫', cost: 3, pay: 'crop', foot: [1.1, 0.7], top: { y: 0.66, pad: [1.1, 0.7] } },
  { id: 'deskLamp', name: '탁상 등불', ico: '🪔', cost: 3, pay: 'crop', foot: [0.28, 0.28], sm: true, h: 0.42 },   // 스탠드 램프는 탁상에 올리면 천장을 뚫는다 → 짧은 등불을 따로 둔다
  { id: 'aquarium', name: '어항',   ico: '🐟', cost: 2, pay: 'fish', foot: [0.66, 0.42], sm: true, h: 0.66 }, // 물고기로 구매
  { id: 'bigtable',  name: '큰 식탁', ico: '🍽️', cost: 8,  pay: 'crop', big: true, foot: [1.8, 1.0], top: { y: 0.69, pad: [1.8, 1.0] } },
  { id: 'stool',       name: '스툴',     ico: '🟤', cost: 2,  pay: 'crop', foot: [0.45, 0.45], top: { y: 0.42, pad: [0.44, 0.44] } },
  { id: 'vase',        name: '꽃병',     ico: '🌷', cost: 2,  pay: 'crop', foot: [0.3, 0.3], sm: true, h: 0.72 },
  { id: 'nightstand',  name: '협탁',     ico: '🗄️', cost: 3,  pay: 'crop', foot: [0.5, 0.45], top: { y: 0.55, pad: [0.5, 0.45] } },
  { id: 'radio',       name: '라디오',   ico: '📻', cost: 4,  pay: 'crop', foot: [0.5, 0.25], sm: true, h: 0.6 },
```
(`deskLamp` 는 `lamp` 줄 바로 아래. `h` 는 메시 윗끝으로 쟀다: 화분 잎 0.5+0.28, 어항 유리 0.42+0.22, 꽃병 꽃 0.62+0.1, 라디오 안테나 0.42+0.16, 탁상 등불 갓 0.32+0.095.)

- [ ] **Step 4: Implement — deskLamp 조형 + 영어 이름**

`js/spaces/indoor.js` 의 `decorMesh` 두 번째 체인, `} else if (id === 'nightstand') {` 줄 **바로 앞**에 삽입:
```js
  } else if (id === 'deskLamp') {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.05, 10), clayMat(0x5a5148)); base.position.y = 0.025; g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.18, 6), clayMat(0x5a5148)); pole.position.y = 0.14; g.add(pole);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.19, 10), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffca70, emissiveIntensity: 0.85, roughness: 0.6 })); shade.position.y = 0.32; g.add(shade);
```
`js/i18n-en.js` 의 `'램프': 'Lamp',` 다음 줄: `  '탁상 등불': 'Table Lamp',`

- [ ] **Step 5: 기존 테스트 기대치 갱신**

`tests/house-floors.test.mjs` 의 "기존 21종은 작물·생선 그대로다" 테스트 — 탁상 등불(작물)이 한 종 늘었다:
```js
test('기존 22종은 작물·생선 그대로다', () => {
  // ⚠️ 21종 + 🪔 탁상 등불(2026-10-07, 작물 3) = 22. 코인 전용·sale 항목은 pay 가 coins 라 세지 않는다.
  const old = DECOR_SRC.split('\n').filter(l => /pay: '(crop|fish)'/.test(l));
  assert.equal(old.length, 22);
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS — 실패 0. i18n 커버리지 테스트가 새 이름을 요구하면 Step 4 의 EN 항목으로 맞춘다.

- [ ] **Step 7: Commit**

```bash
git add js/data/catalog.js js/spaces/indoor.js js/i18n-en.js tests/house-floors.test.mjs tests/decor-ceiling.test.mjs
git commit -m "feat: 상판·소품 데이터와 탁상 등불, 천장 규칙 테스트"
```

---

## Task 3: indoor.js 연결 — 배치·미리보기·조준·거리·들기·dev 훅

**Files:**
- Modify: `js/spaces/indoor.js` (import · `surfaceFor`/`reseatDecor` 신설 · `placeDecor` · `updateDecorGhost` · `floorHitFromEvent` · `nearestDecor` · `pickDecor`)
- Modify: `js/spaces/doors.js` (힌트 배너)
- Modify: `js/game.js:2338` (dev 훅)
- Modify: `js/i18n-en.js` (배너 영어)
- Test: `tests/surface-wiring.test.mjs`

**Interfaces:**
- Consumes: `surfaceAt`, `decorHalf`, `FLOOR_LIFT` from `js/house/surface.js`.
- Produces: `surfaceFor(x, z, def, rot, f) → { y, root } | null`, `reseatDecor()`(둘 다 export). 소품 루트에 `userData.onSurface: boolean`.

- [ ] **Step 1: Write the failing test**

```js
// tests/surface-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const fn = (name) => {   // 함수 본문 텍스트(다음 최상위 function / 대문자 const 까지)
  const s = SRC.indexOf(`function ${name}(`); assert.ok(s >= 0, `${name} 없음`);
  const rest = SRC.slice(s + 10); const m = rest.search(/\n(?:export )?function \w+\(|\nconst [A-Z_]+ = /);
  return SRC.slice(s, s + 10 + (m < 0 ? rest.length : m));
};

test('placeDecor 는 상판 높이로 앉히고 상판 위 소품엔 충돌체를 걸지 않고 reseat 한다', () => {
  const b = fn('placeDecor');
  assert.match(b, /surfaceFor\(/);
  assert.match(b, /if \(def\.foot && !on\)/);
  assert.match(b, /reseatDecor\(\)/);
});
test('고스트·조준·가까운 가구·들기가 같은 규칙을 쓴다', () => {
  assert.match(fn('updateDecorGhost'), /surfaceFor\(/);
  assert.match(fn('floorHitFromEvent'), /intersectObjects\(targets/);
  assert.match(fn('nearestDecor'), /surfaceFor\(/);
  assert.match(fn('pickDecor'), /reseatDecor\(\)/);
});
test('reseatDecor 는 층을 따라 높이를 앉힌다', () => {
  const b = fn('reseatDecor');
  assert.match(b, /floorBaseY\(f\)/);
  assert.match(b, /removeSolid/);
  assert.match(b, /solidBox/);
});
test('힌트 배너는 상판 위 소품에서만 뜬다', () => {
  assert.match(SRC, /userData\.onSurface\) firstHintBanner\('decorStack'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/surface-wiring.test.mjs`
Expected: FAIL — `reseatDecor 없음` 등

- [ ] **Step 3: indoor.js — import 와 어댑터**

import 블록(`import { MAX_HOUSE_STAGE } ...` 근처)에 추가:
```js
import { FLOOR_LIFT, decorHalf, surfaceAt } from '../house/surface.js';   // 🪔 상판 올려놓기 규칙(순수)
```
`placeDecor` 정의 **앞**(주석 "// 가구 배치(작물로 구매)" 위)에 삽입:
```js
// ── 🪔 상판에 올려놓기 — 순수 규칙은 js/house/surface.js, 여기는 후보 목록을 만들어 넘기는 어댑터 ──
function surfaceHosts() {
  const out = [];
  for (const root of decorMeshes) {
    const rec = root.userData.rec; if (!rec) continue;
    const top = DECOR.find(d => d.id === rec.id)?.top; if (!top) continue;
    out.push({ id: rec.id, x: root.position.x, z: root.position.z, rot: rec.rot, f: rec.f || 0, top, root });
  }
  return out;
}

export function surfaceFor(x, z, def, rot, f) {
  const hosts = surfaceHosts();
  const hit = surfaceAt({ x, z, f, def, rot, hosts, scale: DECOR_SCALE });
  return hit ? { y: hit.y, root: hosts[hit.hostIndex].root } : null;
}

// 받침 가구가 생기거나 사라질 때마다 소품을 다시 앉힌다 — 파생값이라 재계산이 곧 정답(복원 순서도 상관없다)
export function reseatDecor() {
  for (const root of decorMeshes) {
    const rec = root.userData.rec; if (!rec) continue;
    const def = DECOR.find(d => d.id === rec.id); if (!def?.sm) continue;
    const f = rec.f || 0;
    const on = surfaceFor(root.position.x, root.position.z, def, rec.rot, f);
    root.position.y = floorBaseY(f) + FLOOR_LIFT + (on ? on.y : 0);
    root.userData.onSurface = !!on;
    if (!def.foot) continue;
    if (on && root.userData.collider) { removeSolid(root.userData.collider); root.userData.collider = null; }   // 상판 위로 올라갔으니 통행 차단 해제
    else if (!on && !root.userData.collider) {                                                                  // 바닥으로 내려왔으니 다시 막는다
      const [hw, hd] = decorHalf(def.foot, rec.rot, DECOR_SCALE);
      root.userData.collider = solidBox(root.position.x - hw, root.position.z - hd, root.position.x + hw, root.position.z + hd);
      root.userData.collider.off = !root.visible;   // 안 보이는 층의 발자국은 막지 않는다(§8.1)
    }
  }
}
```

- [ ] **Step 4: indoor.js — placeDecor**

`const fy = floorBaseY(curFloor);` 다음 줄 `m.position.set(lx, fy + 0.2, lz);` 를 교체:
```js
  const on = surfaceFor(lx, lz, def, ry, curFloor);   // 🪔 같은 층 상판 위에 놓이는 자리면 그만큼 올린다
  m.position.set(lx, fy + FLOOR_LIFT + (on ? on.y : 0), lz);
  m.userData.onSurface = !!on;
```
`if (def.foot) {`(🚧 발자국 블록)을 `if (def.foot && !on) {` 로 바꾸고, 블록 안 `const hw = ..., hd = ...;` 한 줄을 교체:
```js
    const [hw, hd] = decorHalf(def.foot, ry, DECOR_SCALE);
```
`gameState.house.decor.push(rec);` 바로 다음 줄에:
```js
  reseatDecor();                                            // 받침이 늘었으니 소품 높이를 다시 앉힌다
```

- [ ] **Step 5: indoor.js — 고스트·조준·가까운 가구·들기**

`updateDecorGhost` 마지막의 `decorGhost.position.set(decorTarget.x, floorBaseY(houseFloor) + 0.2 + Math.sin(...)...` 한 줄을 교체:
```js
  const gdef = DECOR.find(d => d.id === placingDecor);
  const on = surfaceFor(decorTarget.x, decorTarget.z, gdef, decorRot, houseFloor);   // 🪔 상판 위 자리면 미리보기도 상판 높이로
  decorGhost.position.set(decorTarget.x, floorBaseY(houseFloor) + FLOOR_LIFT + (on ? on.y : 0) + Math.sin(clock.elapsedTime * 3) * 0.03, decorTarget.z);   // ☀️ 루프탑이면 덱 높이에서 미리보기
```
`floorHitFromEvent` 의 `const hit = raycaster.intersectObject(interiorFloor, true)[0];` 줄을 교체:
```js
  // 🪔 소품을 들고 있을 땐 같은 층 상판도 조준 대상 — 바닥만 맞히면 테이블을 뚫고 지나가 "위에 올려놓기"를 가리킬 수 없다
  const targets = [interiorFloor];
  if (DECOR.find(d => d.id === placingDecor)?.sm)
    for (const root of decorMeshes) { const rec = root.userData.rec; if (rec && (rec.f || 0) === houseFloor && DECOR.find(d => d.id === rec.id)?.top) targets.push(root); }
  const hit = raycaster.intersectObjects(targets, true)[0];   // 🌀 floorGroup 은 재귀 탐색(조각 수가 달라도 안전)
```
`nearestDecor` 본문 전체를 교체:
```js
export function nearestDecor(reach) {
  let best = null;
  for (const root of decorMeshes) {
    const rec = root.userData.rec; if (!rec || (rec.f || 0) !== houseFloor) continue;
    const def = DECOR.find(d => d.id === rec.id);
    // 🪔 상판 위 소품은 받침 가구의 발자국을 빌려 잰다 — 큰 식탁 한가운데 소품은 중심 거리로 재면 0.9 안에 설 방법이 없다
    const host = def?.sm ? surfaceFor(root.position.x, root.position.z, def, rec.rot, rec.f || 0)?.root : null;
    const ref = host || root;
    const rdef = host ? DECOR.find(d => d.id === host.userData.rec.id) : def;
    const rrot = host ? host.userData.rec.rot : rec.rot;
    const dx = player.position.x - ref.position.x, dz = player.position.z - ref.position.z;
    let d;
    if (rdef?.foot) {
      const [hw, hd] = decorHalf(rdef.foot, rrot, DECOR_SCALE);
      d = Math.hypot(Math.max(0, Math.abs(dx) - hw), Math.max(0, Math.abs(dz) - hd));
    } else d = Math.hypot(dx, dz);
    const key = host ? d - 0.01 : d;   // 받침과 거리가 같아지므로 그 위 소품을 먼저 집는다(받침은 직접 탭)
    if (d < reach && (!best || key < best.key)) best = { root, d, key };
  }
  return best;
}
```
`pickDecor` 에서 `const i = gameState.house.decor.indexOf(rec); ...splice(i, 1);` 줄 **다음**에:
```js
  reseatDecor();   // 🪔 받치던 가구를 들었다면 위에 있던 소품이 바닥으로 내려온다
```

- [ ] **Step 6: doors.js 힌트 + game.js dev 훅 + 영어**

`js/spaces/doors.js` 의 `if (def.id === 'bed') firstHintBanner('bedSleep', ...)` 줄 **다음 줄**(같은 else 블록 안)에(문구는 Task 0 확정값):
```js
            // 🪔 위에 소품이 올라가 있으면 액션은 소품을 집는다 — 받침을 통째로 옮기는 길(탭)을 한 번 알려 준다
            if (def.sm && near.root.userData.onSurface) firstHintBanner('decorStack', '🪔', '올려둔 소품', '받치고 있는 가구는 직접 탭하면 옮겨요');
```
(근접 링은 이미 `near.root.position.y + 0.02` 를 따르므로 손대지 않는다.) `js/i18n-en.js` 에: `'올려둔 소품': 'Item on top',` · `'받치고 있는 가구는 직접 탭하면 옮겨요': 'Tap the furniture underneath to move it',`

`js/game.js` 의 `window.__decor = ...` 줄(2338)을 교체하고 아래 훅을 이어서 둔다(같은 로컬 전용 블록):
```js
    window.__decor = (id, x, z, rot = 0, f = null) => placeDecor(id, INT.x + x, INT.z + z, true, rot, true, f);   // 가구 무료 배치(검수용) — f 는 층
    window.__decorY = () => decorMeshes.map(m => [m.userData.rec?.id, +m.position.y.toFixed(2), !!m.userData.collider, !!m.userData.onSurface]);   // 🪔 높이·충돌체 검수용
    window.__decorPick = (i) => pickDecor(decorMeshes[i]);   // 🪔 i 번째를 들어 올린다(받침 제거 검수)
    window.__decorBack = () => stopDecorPlacing(true);       // 🪔 들었던 걸 제자리로
```
(`stopDecorPlacing` 이 game.js 에서 보이지 않으면 `js/game.js:172` 의 indoor 가져오기 목록에 `stopDecorPlacing` 을 더한다.)

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS, 실패 0

- [ ] **Step 8: Commit**

```bash
git add js/spaces/indoor.js js/spaces/doors.js js/game.js js/i18n-en.js tests/surface-wiring.test.mjs
git commit -m "feat: 탁상 올려놓기 이식 — 배치·조준·거리·들기를 상판에 연결"
```

---

## Task 4: 1부 실측 검증 + 코드 리뷰 (게임 안)

**Files:** 없음(검증) · 산출물: `dev/active/halloween-coin-decor/look/part1-*.png`, `part1-report.md`

- [ ] **Step 1: 서버** — 워크트리에서 `python3 scripts/serve.py 8123` 를 백그라운드로 띄운다(⚠️ `preview_start` 는 루트를 띄우므로 쓰지 않는다). 브라우저 `navigate` 로 `http://localhost:8123/?give=crop:99,fish:20,coins:2000` 을 연다. 게스트 로그인 → 캐릭터 선택 → `#intro-skip` → `#tut-skip` 을 먼저 통과한다.
- [ ] **Step 2: 시나리오(콘솔 `javascript_tool`)** — 아래를 순서대로 실행하고 각 기대값을 `part1-report.md` 표로 적는다. `__decorY()` 항목 = `[id, y, 충돌체?, 상판 위?]`.

```js
__house.enter();
__decor('table', 0, 0, 0); __decor('deskLamp', 0, 0, 0); __decor('plant', 3, 3, 0);
__decorY();
// 기대: table [.., 0.2, true, false] · deskLamp [.., 1.19, false, true] · plant [.., 0.2, true, false]
__decorPick(0); __decorY();
// 기대: table 이 목록에서 빠지고 deskLamp 는 [.., 0.2, true, false] (받침이 사라져 바닥으로 내려왔다)
__decorBack(); __decorY();
// 기대: table 이 돌아오고 deskLamp 가 다시 [.., 1.19, false, true]
__decor('bigtable', 0, 0, 0); __decorY();
// 기대: deskLamp 는 가장 높은 상판 위 → y 1.235
```
- [ ] **Step 3: 화면 확인** — 탁자 위 등불을 PC 와 모바일(`resize_window` mobile)에서 캡처. 소품을 든 채 탁자 위로 조준하면 고스트가 상판 높이로 뜨는지, 가까이 서면 프롬프트 링이 상판에 그려지는지, 힌트 배너가 1회만 뜨는지 본다. 어항(`aquarium`)을 스툴(`stool`) 위에 올리려 하면 바닥에 놓이는지(상판보다 큼) 확인.
- [ ] **Step 4: 다층** — 집 단계가 4 이상인 세이브를 만들 수 없으면 이 항목은 `tests/house-surface.test.mjs` 의 "다른 층 상판은 무시한다" 로 갈음하고 보고서에 **실측하지 못했다고 명시**한다.
- [ ] **Step 5: 세이브 왕복** — 탁자+등불을 놓고 저장 후 새로고침해 등불이 상판 위에 복원되는지(복원 순서 무관) 확인.
- [ ] **Step 6: 코드 리뷰** — `everything-claude-code:code-reviewer` 에 1부 diff(`git diff main...HEAD -- js tests`)를 주고 CRITICAL/HIGH 를 고친다. 고친 내용은 같은 Task 의 추가 커밋으로.
- [ ] **Step 7: 보고서 커밋**

```bash
git add dev/active/halloween-coin-decor
git commit -m "docs: 탁상 올려놓기 실측 보고"
```
**1부 완료 게이트:** `npm test` 통과 + 위 기대값 일치. 여기서 1부는 단독 배포 가능 상태다(배포는 사용자 지시 시).

---

# 2부 — 할로윈 코인 장식 6종

## Task 5: `catalogVisible()` (TDD)

**Files:**
- Modify: `js/shop/sale-window.js` (끝에 추가)
- Test: `tests/sale-visibility.test.mjs`

**Interfaces:**
- Consumes: `saleOpen(item, now)` (같은 파일).
- Produces: `catalogVisible(item, { stored = 0, now = Date.now() } = {}) → boolean`.

- [ ] **Step 1: Write the failing test**

```js
// tests/sale-visibility.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogVisible, SALE_WINDOWS } from '../js/shop/sale-window.js';

const item = { id: 'x', sale: 'halloween' };
const KST = (y, m, d, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s) - 9 * 3600 * 1000;
const IN = KST(2026, 10, 25, 12), BEFORE = KST(2026, 10, 23, 23, 59, 59), AFTER = KST(2026, 11, 3, 0, 0, 0);

test('sale 키가 없으면 늘 보인다', () => {
  assert.equal(catalogVisible({ id: 'sofa' }, { now: AFTER }), true);
});
test('기간 안이면 보인다', () => {
  assert.equal(catalogVisible(item, { now: IN }), true);
});
test('기간 밖 + 보관분 0 이면 숨는다(전·후 모두)', () => {
  assert.equal(catalogVisible(item, { stored: 0, now: BEFORE }), false);
  assert.equal(catalogVisible(item, { stored: 0, now: AFTER }), false);
});
test('기간 밖이어도 보관분이 있으면 보인다', () => {
  assert.equal(catalogVisible(item, { stored: 1, now: AFTER }), true);
});
test('끝나는 날 23:59:59 까지는 열려 있다', () => {
  assert.equal(catalogVisible(item, { now: KST(2026, 11, 2, 23, 59, 59) }), true);
});
test('모르는 sale 키는 닫히지만 보관분은 보인다', () => {
  assert.equal(catalogVisible({ sale: 'nope' }, { now: IN }), false);
  assert.equal(catalogVisible({ sale: 'nope' }, { stored: 2, now: IN }), true);
});
test('창은 SALE_WINDOWS 한 곳이다', () => {
  assert.ok(SALE_WINDOWS.halloween.from && SALE_WINDOWS.halloween.to);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sale-visibility.test.mjs`
Expected: FAIL — `catalogVisible` is not exported

- [ ] **Step 3: Implement**

`js/shop/sale-window.js` 끝에:
```js
/** 상점 목록에 보일까 — sale 이 없거나 기간 안이거나 이미 보관분이 있으면 보인다.
 *  기간 밖에서 안 산 사람에겐 숨긴다(유료 꾸미기 premiumRowMode 'owned' 와 같은 원칙). 판정은 표시용이다 */
export function catalogVisible(item, { stored = 0, now = Date.now() } = {}) {
  return !item?.sale || saleOpen(item, now) || stored > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sale-visibility.test.mjs`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add js/shop/sale-window.js tests/sale-visibility.test.mjs
git commit -m "feat: catalogVisible — 기간 밖 항목은 목록에서 숨김(보관분 예외)"
```

---

## Task 6: 목록 필터 + 행 태그 (getDecor / getOutdoor / index.html)

**Files:**
- Modify: `js/game.js` (import · `getDecor` · `getOutdoor`)
- Modify: `index.html` (`renderDecorItems` · `renderOutdoor` · CSS)
- Test: `tests/halloween-coin-wiring.test.mjs` (이 Task 에서 생성, Task 7·10 이 이어서 채운다)

**Interfaces:**
- Consumes: `catalogVisible`, `saleTagOf` from `js/shop/sale-window.js`.
- Produces: `Input.getDecor()` 행에 `tag: { label, until } | null`, `Input.getOutdoor()` 가 기간 밖·보관분 0 항목을 제외하고 `tag` 를 붙인다.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-coin-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('getDecor 는 hidden 을 빼고 기간 밖 항목을 거르며 태그를 싣는다', () => {
  assert.ok(SRC.includes('DECOR.filter(d => !d.hidden)'));   // 기존 단언(house-floors.test)과 같은 부분 문자열 유지
  const s = SRC.indexOf('getDecor() {');
  const body = SRC.slice(s, SRC.indexOf('getKitchen()', s));
  assert.match(body, /catalogVisible\(d, \{ stored:/);
  assert.match(body, /tag: saleTagOf\(d\)/);
});
test('getOutdoor 는 기간 밖·보관분 0 항목을 거른다', () => {
  const s = SRC.indexOf('getOutdoor() {');
  const body = SRC.slice(s, s + 400);
  assert.match(body, /catalogVisible\(o, \{ stored: gameState\.outdoorStored/);
  assert.match(body, /tag: saleTagOf\(o\)/);
});
test('행 렌더가 태그를 그린다(라벨과 날짜는 별개 노드)', () => {
  assert.match(HTML, /class="di-tag">\$\{d\.tag\.label\}<\/span><span class="di-tag">\$\{d\.tag\.until\}/);
  assert.match(HTML, /class="ck-tag">\$\{o\.tag\.label\}<\/span><span class="ck-tag">\$\{o\.tag\.until\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-coin-wiring.test.mjs`
Expected: FAIL — `catalogVisible(d, { stored:` 없음

- [ ] **Step 3: game.js**

import 구역(`import { takeStored, ... } from './outdoor-move.js';` 근처)에 추가:
```js
import { catalogVisible, saleTagOf } from './shop/sale-window.js';   // 🎃 기간 한정 항목 — 목록 필터·행 태그
```
`getDecor()` 를 교체:
```js
  getDecor() {   // 🏠 층별 해금 — 잠긴 것도 목록엔 보이되 locked 로 흐리게(살 목표가 보여야 싱크가 된다)
    const st = gameState.houseStage, kept = gameState.house.stored || {};
    return DECOR.filter(d => !d.hidden)
      .filter(d => catalogVisible(d, { stored: kept[d.id] || 0 }))   // 🎃 기간 밖 한정품은 안 산 사람에겐 숨긴다(보관분은 계속 보인다)
      .map(d => ({ ...d, locked: !decorUnlocked(d, st), tag: saleTagOf(d) }));
  },
```
(`locked: !decorUnlocked(` 부분 문자열은 기존 `house-floors.test` 가 찾으므로 유지된다.) `getOutdoor()` 를 교체:
```js
  getOutdoor() { return OUTDOOR.filter(o => catalogVisible(o, { stored: gameState.outdoorStored?.[o.id] || 0 })).map(o => ({ ...o, tag: saleTagOf(o) })); },   // 야외 장식 목록(+🏗️ 밭 시설 farm:true) · 🎃 기간 밖 한정품 숨김
```

- [ ] **Step 4: index.html**

`renderDecorItems` 의 `el.innerHTML = ...` 를 교체(끝에 태그 두 노드 — 라벨만 i18n 대상이고 `~11/2` 는 번역하지 않는다):
```js
        el.innerHTML = `<span class="di-ico">${d.ico}</span><span class="di-name">${d.name}</span><span class="di-cost">${d.locked ? '🔒' : (stored > 0 ? `보유 ${stored}` : payIco + d.cost)}</span>${d.tag ? `<span class="di-tag">${d.tag.label}</span><span class="di-tag">${d.tag.until}</span>` : ''}`;
```
`renderOutdoor` 의 `el.innerHTML = ...` 를 교체:
```js
        el.innerHTML = `<span class="ck-ico">${o.ico}</span><span class="ck-name">${o.name}</span><span class="ck-buff">${o.desc}</span><span class="ck-cost">${stored > 0 ? `보유 ${stored}` : costStr}</span>${o.tag ? `<span class="ck-tag">${o.tag.label}</span><span class="ck-tag">${o.tag.until}</span>` : ''}`;
```
CSS(`.dm-item .di-cost` 줄 아래, `.ck-item .ck-cost` 줄 아래 각각):
```css
  .dm-item .di-tag { font-size: 9px; line-height: 1.1; color: #c4631b; }
  .ck-item .ck-tag { font-size: 9.5px; line-height: 1.15; color: #c4631b; }
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS, 실패 0

- [ ] **Step 6: Commit**

```bash
git add js/game.js index.html tests/halloween-coin-wiring.test.mjs
git commit -m "feat: 가구·야외 목록에 판매 기간 필터와 한정 태그"
```

---

## Task 7: 구매 가드 + 야외 코인 로그

**Files:**
- Modify: `js/spaces/indoor.js` (`placeDecor`, import)
- Modify: `js/game.js` (`placeOutdoor`, import)
- Modify: `js/i18n-en.js` (토스트)
- Test: `tests/halloween-coin-wiring.test.mjs` (추가)

**Interfaces:**
- Consumes: `saleOpen` from `js/shop/sale-window.js`.
- Produces: 기간 밖 신규 구매 → `false` + 토스트. 보관분 꺼내기·옮기기·복원(silent)은 통과. 한정 코인 야외 장식 구매 시 `logEcon('outdoor_buy', …)` + `trackEvent('outdoor_buy_coins', …)` (`econ_logs.source` 에 CHECK 제약이 없어 SQL 불필요 — 2026-10-07 확인).

- [ ] **Step 1: Write the failing test (append)**

```js
test('placeDecor 는 신규 구매에서만 기간을 막는다', () => {
  const s = SRC.indexOf('function placeDecor(');
  const body = SRC.slice(s, SRC.indexOf('\nconst DECOR_WALL_PAD', s));
  assert.match(body, /!silent && !free && !fromStore && def\.sale && !saleOpen\(def\)/);
});
test('placeOutdoor 는 신규 구매에서만 기간을 막고 한정 코인 구매를 기록한다', () => {
  const s = SRC.indexOf('function placeOutdoor(');
  const body = SRC.slice(s, s + 5000);
  assert.match(body, /!silent && !moved && !taken && def\.sale && !saleOpen\(def\)/);
  assert.match(body, /logEcon\('outdoor_buy', id, -def\.cost\.coins/);
  assert.match(body, /trackEvent\('outdoor_buy_coins'/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-coin-wiring.test.mjs`
Expected: FAIL — 두 테스트

- [ ] **Step 3: placeDecor 가드**

`js/spaces/indoor.js` import 에 `import { saleOpen } from '../shop/sale-window.js';` 추가. `placeDecor` 의 `if (fromStore) { stored[id]--; ... }` 줄 **바로 다음**, 결제 `if (!silent && !free && !fromStore) {` **앞**에:
```js
  if (!silent && !free && !fromStore && def.sale && !saleOpen(def)) {   // 🎃 목록을 열어 둔 채 기간이 끝난 경우 — 새로 못 산다(보관분·옮기기·복원은 위 조건에서 통과)
    ui.toast?.('🎃 할로윈 장식 판매가 끝났어요'); return false;
  }
```

- [ ] **Step 4: placeOutdoor 가드·로그**

`js/game.js` 의 shop import 줄을 `import { catalogVisible, saleOpen, saleTagOf } from './shop/sale-window.js';` 로 확장. `placeOutdoor` 에서 `if (taken) gameState.outdoorStored = taken;` **다음 줄**에:
```js
  if (!silent && !moved && !taken && def.sale && !saleOpen(def)) { ui.toast?.('🎃 할로윈 장식 판매가 끝났어요'); return false; }   // 🎃 기간 한정 — 신규 구매만 막는다
```
같은 함수의 결제 블록, `refreshInventoryUI();` 다음 줄에:
```js
    if (def.sale && def.cost.coins) {   // [원장][GA4] 한정 코인 장식 구매 — 실내 decor_buy 와 같은 축
      logEcon('outdoor_buy', id, -def.cost.coins, gameState.inventory.coins);
      trackEvent('outdoor_buy_coins', { item: id, coins: def.cost.coins, sale: def.sale });
    }
```

- [ ] **Step 5: 영어 토스트**

`js/i18n-en.js`: `'🎃 할로윈 장식 판매가 끝났어요': 'Halloween decor is no longer on sale',`

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS, 실패 0

- [ ] **Step 7: Commit**

```bash
git add js/spaces/indoor.js js/game.js js/i18n-en.js tests/halloween-coin-wiring.test.mjs
git commit -m "feat: 기간 한정 항목 신규 구매 가드와 야외 코인 구매 기록"
```

---

## Task 8: 조형 모듈 + 시안 HTML (사용자 승인 게이트)

**Files:**
- Create: `js/spaces/halloween-art.js`
- Create: `tools/halloween/build-mockup.mjs`
- Create: `dev/active/halloween-coin-decor/look/mockups.html` (생성물)
- Test: `tests/halloween-art.test.mjs`

**Interfaces:**
- Produces: `HALLOWEEN_INDOOR_IDS`, `HALLOWEEN_OUTDOOR_IDS`, `HALLOWEEN_STYLES: { [id]: string[] }`, `HALLOWEEN_STYLE: { [id]: string }`(승인된 기본안), `makeCtx(T, onNight?) → { vtxMat(), glowMat(color, emissive, intensity, night?) }`, `buildHalloween(T, id, style, ctx) → Group`(메시 ≤3, 원점 = 바닥 중심, 단위 = 배율 전).

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-art.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { HALLOWEEN_INDOOR_IDS, HALLOWEEN_OUTDOOR_IDS, HALLOWEEN_STYLES, HALLOWEEN_STYLE, makeCtx, buildHalloween } from '../js/spaces/halloween-art.js';

const ids = [...HALLOWEEN_INDOOR_IDS, ...HALLOWEEN_OUTDOOR_IDS];
// 배율 전 최대 폭·깊이·높이 — 카탈로그의 foot/h 와 같은 규격(야외 울타리는 기존 울타리 한 마디 1.2 폭 기준)
const LIMIT = {
  ghostCandle: { w: 0.3, d: 0.3, h: 0.5 }, miniGrave: { w: 0.5, d: 0.3, h: 0.6 }, witchCauldron: { w: 1.0, d: 1.0, h: 1.2 },
  ghostlamp: { w: 0.7, d: 0.7, h: 2.0 }, gravefence: { w: 1.25, d: 0.3, h: 0.75 }, webarch: { w: 2.6, d: 0.5, h: 2.6 },
};

test('6종이 모두 있고 승인 기본안이 목록 안에 있다', () => {
  assert.equal(ids.length, 6);
  ids.forEach(id => assert.ok(HALLOWEEN_STYLES[id].includes(HALLOWEEN_STYLE[id]), id));
});

for (const id of ids) for (const style of HALLOWEEN_STYLES[id]) {
  test(`${id}/${style}: 메시 ≤3 · 크기 제약`, () => {
    const g = buildHalloween(THREE, id, style, makeCtx(THREE));
    const meshes = []; g.traverse(o => o.isMesh && meshes.push(o));
    assert.ok(meshes.length >= 1 && meshes.length <= 3, `메시 ${meshes.length}개`);
    const box = new THREE.Box3().setFromObject(g), L = LIMIT[id];
    assert.ok(box.min.y > -0.02, '바닥 아래로 파고들지 않는다');
    const EPS = 1e-3;   // Float32 정점이라 경계값이 1.2500001 처럼 나온다
    assert.ok(box.max.y <= L.h + EPS, `높이 ${box.max.y.toFixed(3)} > ${L.h}`);
    assert.ok(box.max.x - box.min.x <= L.w + EPS, `가로 ${(box.max.x - box.min.x).toFixed(3)} > ${L.w}`);
    assert.ok(box.max.z - box.min.z <= L.d + EPS, `세로 ${(box.max.z - box.min.z).toFixed(3)} > ${L.d}`);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-art.test.mjs`
Expected: FAIL — `Cannot find module '../js/spaces/halloween-art.js'`

- [ ] **Step 3: Write the module**

```js
// js/spaces/halloween-art.js
// =============================================================
//  calm forest · 🎃 할로윈 한정 코인 장식 6종 조형 — THREE 를 인자로 받는 순수 모듈
//  ------------------------------------------------------------
//  ▶ 시안 HTML(tools/halloween/build-mockup.mjs)과 게임(indoor.js decorMesh · game.js outdoorMesh)이 같은 코드를 쓴다.
//  ▶ 메시 ≤3: 불투명 몸체는 정점색 한 덩이(mergeGeos), 발광은 재질별로 따로(같은 재질 조각은 합친다).
//  ▶ 원점 = 바닥 중심, 단위 = 배율 전(실내는 decorMesh 가 DECOR_SCALE 을 곱한다).
//  ▶ 승인 전에는 STYLES 의 세 안을 다 둔다. 승인되면 HALLOWEEN_STYLE 만 바꾸고 안 쓰는 안은 지운다.
//  ▶ 테스트: tests/halloween-art.test.mjs
// =============================================================

export const HALLOWEEN_INDOOR_IDS = ['ghostCandle', 'miniGrave', 'witchCauldron'];
export const HALLOWEEN_OUTDOOR_IDS = ['ghostlamp', 'gravefence', 'webarch'];
export const HALLOWEEN_STYLES = {
  ghostCandle: ['ghost', 'holder', 'jar'],
  miniGrave: ['cross', 'gable', 'slab'],
  witchCauldron: ['classic', 'fire', 'bubble'],
  ghostlamp: ['sheet', 'lantern', 'orb'],
  gravefence: ['slabs', 'picket', 'iron'],
  webarch: ['frame', 'tree', 'iron'],
};
export const HALLOWEEN_STYLE = { ghostCandle: 'ghost', miniGrave: 'cross', witchCauldron: 'classic', ghostlamp: 'sheet', gravefence: 'slabs', webarch: 'frame' };   // ⚠️ 시안 승인 결과로 바꾼다

/** 재질 공장 — 몸체는 정점색 재질, 발광은 MeshStandardMaterial. night=true 면 0 으로 시작해 밤에 houseWindows 가 켠다 */
export function makeCtx(T, onNight = null) {
  return {
    vtxMat: () => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }),
    glowMat: (color, emissive, intensity, night = false) => {
      const m = new T.MeshStandardMaterial({ color, emissive, emissiveIntensity: night ? 0 : intensity, roughness: 0.5 });
      if (night && onNight) onNight(m);
      return m;
    },
  };
}

function kit(T) {
  const paint = (geo, hex) => {
    const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(arr, 3));
    return geo;
  };
  const merge = (geos) => {
    const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
    const out = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      const size = flat[0].attributes[name].itemSize;
      let total = 0; for (const g of flat) total += g.attributes[name].count;
      const arr = new Float32Array(total * size); let off = 0;
      for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
      out.setAttribute(name, new T.BufferAttribute(arr, size));
    }
    return out;
  };
  return {
    merge,
    box: (w, h, d, x, y, z, c) => paint(new T.BoxGeometry(w, h, d).translate(x, y, z), c),
    tilt: (w, h, d, x, y, z, c, rz) => paint(new T.BoxGeometry(w, h, d).rotateZ(rz).translate(x, y, z), c),
    cyl: (rt, rb, h, x, y, z, c, seg = 8) => paint(new T.CylinderGeometry(rt, rb, h, seg).translate(x, y, z), c),
    cone: (r, h, x, y, z, c, seg = 8) => paint(new T.ConeGeometry(r, h, seg).translate(x, y, z), c),
    ball: (r, x, y, z, c) => paint(new T.IcosahedronGeometry(r, 0).translate(x, y, z), c),
    // flat=true 면 바닥에 눕힌 고리, arc 로 반원(아치) 가능 — 기본은 세운 전체 고리
    ring: (R, r, x, y, z, c, flat = false, arc = Math.PI * 2) => {
      const geo = new T.TorusGeometry(R, r, 5, 14, arc);
      return paint((flat ? geo.rotateX(Math.PI / 2) : geo).translate(x, y, z), c);
    },
  };
}

const STONE = 0x9a9a92, DARK = 0x2a2a33, IRON = 0x3b3a44, WOOD = 0x5a5148, BONE = 0xf4f1ff, INK = 0x2b2540, WEB = 0xe9e6f5;
// 발광 항목: [geo | geo[], color, emissive, intensity, night]
const GHOST_GLOW = [0xe9fff7, 0x9fe8d8], BREW = [0x7dff8a, 0x33d05a], FIRE = [0xffb04a, 0xff6a1a];

const BUILDERS = {
  ghostCandle(k, s, parts, glows) {   // 높이 ≤0.5 · 폭 ≤0.3 — 탁상 소품(sm)
    if (s === 'ghost') {   // 유령 모양 초 — 치마 퍼진 몸통 + 둥근 머리 + 눈 + 유령빛 불꽃
      parts.push(k.cyl(0.1, 0.14, 0.22, 0, 0.11, 0, BONE, 10), k.ball(0.11, 0, 0.27, 0, BONE), k.ball(0.016, -0.04, 0.29, 0.1, INK), k.ball(0.016, 0.04, 0.29, 0.1, INK));
      glows.push([k.ball(0.05, 0, 0.42, 0, 0xffffff), ...GHOST_GLOW, 0.85, false]);
    } else if (s === 'holder') {   // 낡은 황동 촛대 + 초
      parts.push(k.cyl(0.12, 0.14, 0.04, 0, 0.02, 0, 0xb08a4a, 10), k.cyl(0.03, 0.04, 0.12, 0, 0.1, 0, 0xb08a4a), k.cyl(0.1, 0.06, 0.03, 0, 0.175, 0, 0xb08a4a, 10), k.cyl(0.05, 0.05, 0.18, 0, 0.28, 0, 0xf1ead8, 10));
      glows.push([k.ball(0.04, 0, 0.42, 0, 0xffffff), ...GHOST_GLOW, 0.85, false]);
    } else {   // jar — 보랏빛 항아리 초 + 유령 얼굴
      parts.push(k.cyl(0.13, 0.13, 0.2, 0, 0.1, 0, 0x4b3f66, 10), k.cyl(0.09, 0.09, 0.05, 0, 0.22, 0, 0xf1ead8, 10), k.ball(0.014, -0.04, 0.12, 0.125, BONE), k.ball(0.014, 0.04, 0.12, 0.125, BONE));
      glows.push([k.ball(0.05, 0, 0.3, 0, 0xffffff), ...GHOST_GLOW, 0.85, false]);
    }
  },
  miniGrave(k, s, parts) {   // 폭 ≤0.5 · 깊이 ≤0.3 · 높이 ≤0.6 — 바닥 소품
    parts.push(k.box(0.46, 0.05, 0.28, 0, 0.025, 0, 0x6e6a62));
    if (s === 'cross') parts.push(k.box(0.08, 0.4, 0.05, 0, 0.25, 0, STONE), k.box(0.26, 0.07, 0.05, 0, 0.33, 0, STONE), k.ball(0.05, 0.12, 0.05, 0.03, 0x6f9a5c));
    else if (s === 'gable') parts.push(k.box(0.3, 0.3, 0.07, 0, 0.2, 0, STONE), k.tilt(0.21, 0.21, 0.07, 0, 0.4, 0, STONE, Math.PI / 4));
    else parts.push(k.tilt(0.34, 0.36, 0.07, 0, 0.23, 0, STONE, 0.12), k.ball(0.05, -0.12, 0.06, 0.06, 0x6f9a5c));   // slab — 기울어진 비석
  },
  witchCauldron(k, s, parts, glows) {   // 지름 ≤1.0 · 높이 ≤1.2 — 큰 가구
    parts.push(k.cyl(0.42, 0.34, 0.4, 0, 0.4, 0, DARK, 12), k.ring(0.42, 0.05, 0, 0.6, 0, 0x3a3a46, true));
    if (s !== 'fire') for (const a of [0, 2.1, 4.2]) parts.push(k.cyl(0.05, 0.04, 0.2, Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26, DARK, 6));
    glows.push([k.cyl(0.38, 0.38, 0.03, 0, 0.58, 0, 0xffffff, 12), ...BREW, 0.9, false]);
    if (s === 'fire') glows.push([[k.cone(0.14, 0.3, -0.12, 0.15, 0, 0xffffff, 6), k.cone(0.12, 0.26, 0.12, 0.13, 0.05, 0xffffff, 6), k.cone(0.1, 0.22, 0, 0.11, -0.12, 0xffffff, 6)], ...FIRE, 0.9, false]);
    if (s === 'bubble') glows.push([[k.ball(0.07, -0.1, 0.72, 0.05, 0xffffff), k.ball(0.05, 0.12, 0.82, -0.04, 0xffffff), k.ball(0.04, 0, 0.94, 0.1, 0xffffff)], ...BREW, 0.9, false]);
  },
  ghostlamp(k, s, parts, glows) {   // 야외 — 높이 ≤2.0 · 폭 ≤0.7. 머리/등불이 밤에 켜진다(night)
    if (s === 'sheet') {   // 기둥 위에 홑이불 유령 — 머리가 등
      parts.push(k.cyl(0.05, 0.07, 1.1, 0, 0.55, 0, WOOD, 6), k.cone(0.3, 0.55, 0, 1.15, 0, BONE, 10), k.ball(0.03, -0.06, 1.58, 0.15, INK), k.ball(0.03, 0.06, 1.58, 0.15, INK));
      glows.push([k.ball(0.17, 0, 1.55, 0, 0xffffff), ...GHOST_GLOW, 1.0, true]);
    } else if (s === 'lantern') {   // 철제 등롱
      parts.push(k.cyl(0.05, 0.07, 1.3, 0, 0.65, 0, WOOD, 6), k.box(0.34, 0.04, 0.34, 0, 1.3, 0, IRON), k.cone(0.26, 0.2, 0, 1.78, 0, IRON, 4));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(k.cyl(0.02, 0.02, 0.44, sx * 0.15, 1.54, sz * 0.15, IRON, 5));
      glows.push([k.ball(0.12, 0, 1.54, 0, 0xffffff), ...GHOST_GLOW, 1.0, true]);
    } else {   // orb — 낮은 기둥 위에 떠 있는 유령 구슬
      parts.push(k.cyl(0.04, 0.06, 0.9, 0, 0.45, 0, WOOD, 6), k.ring(0.28, 0.025, 0, 1.3, 0, IRON, false));
      glows.push([k.ball(0.2, 0, 1.3, 0, 0xffffff), ...GHOST_GLOW, 1.0, true]);
    }
  },
  gravefence(k, s, parts) {   // 야외 — 울타리와 같은 1.2 폭 한 마디 · 높이 ≤0.75
    if (s === 'slabs') {   // 묘비 세 개를 가로대로 이은 형태(가운데가 조금 높다)
      parts.push(k.box(1.1, 0.08, 0.1, 0, 0.2, 0, WOOD));
      [-0.42, 0, 0.42].forEach((x, i) => { const up = i === 1 ? 0.06 : 0; parts.push(k.box(0.28, 0.46 + up, 0.08, x, 0.23 + up / 2, 0, STONE), k.tilt(0.2, 0.2, 0.08, x, 0.46 + up, 0, STONE, Math.PI / 4)); });
    } else if (s === 'picket') {   // 흰 말뚝, 끝이 유령 머리처럼 둥글다
      parts.push(k.box(1.2, 0.07, 0.07, 0, 0.18, 0, WOOD), k.box(1.2, 0.07, 0.07, 0, 0.4, 0, WOOD));
      [-0.5, -0.25, 0, 0.25, 0.5].forEach(x => parts.push(k.box(0.12, 0.5, 0.06, x, 0.25, 0, BONE), k.ball(0.07, x, 0.52, 0, BONE)));
    } else {   // iron — 철창 + 양끝 묘비
      parts.push(k.box(1.1, 0.05, 0.05, 0, 0.45, 0, IRON), k.box(1.1, 0.05, 0.05, 0, 0.15, 0, IRON));
      [-0.3, -0.1, 0.1, 0.3].forEach(x => parts.push(k.cyl(0.015, 0.015, 0.5, x, 0.3, 0, IRON, 5), k.cone(0.03, 0.08, x, 0.58, 0, IRON, 5)));
      [-0.52, 0.52].forEach(x => parts.push(k.box(0.12, 0.6, 0.12, x, 0.3, 0, STONE), k.ball(0.08, x, 0.64, 0, STONE)));
    }
  },
  webarch(k, s, parts) {   // 야외 — 폭 ≤2.6 · 높이 ≤2.6 · 걸어서 통과(충돌체 없음). 거미줄은 얇은 고리+살로 한 덩이에 합친다
    const web = (cx, cy, R, n = 3) => {   // 동심 고리 n 개 + 살(지름 막대 6 개 = 12 가닥)
      for (let i = 1; i <= n; i++) parts.push(k.ring(R * i / n, 0.012, cx, cy, 0, WEB, false));
      for (let a = 0; a < 6; a++) parts.push(k.tilt(R * 2, 0.012, 0.012, cx, cy, 0, WEB, a * Math.PI / 6));
    };
    if (s === 'frame') {   // 나무 기둥 둘 + 윗가로대, 위쪽 모서리마다 거미줄
      parts.push(k.box(0.14, 2.2, 0.14, -1.1, 1.1, 0, WOOD), k.box(0.14, 2.2, 0.14, 1.1, 1.1, 0, WOOD), k.box(2.5, 0.14, 0.14, 0, 2.27, 0, WOOD));
      web(-0.75, 1.9, 0.38); web(0.75, 1.9, 0.38);
    } else if (s === 'tree') {   // 휜 죽은 나무 둘이 맞닿은 아치
      parts.push(k.tilt(0.14, 2.3, 0.14, -1.0, 1.15, 0, 0x4a3b30, -0.18), k.tilt(0.14, 2.3, 0.14, 1.0, 1.15, 0, 0x4a3b30, 0.18), k.tilt(0.1, 1.2, 0.1, -0.35, 2.15, 0, 0x4a3b30, -1.15), k.tilt(0.1, 1.2, 0.1, 0.35, 2.15, 0, 0x4a3b30, 1.15));
      web(0, 1.85, 0.5);
    } else {   // iron — 철 기둥 둘 + 반원 아치 + 안쪽 큰 거미줄 하나
      parts.push(k.box(0.1, 1.45, 0.1, -1.05, 0.725, 0, IRON), k.box(0.1, 1.45, 0.1, 1.05, 0.725, 0, IRON), k.ring(1.05, 0.05, 0, 1.45, 0, IRON, false, Math.PI));
      web(0, 1.55, 0.6);
    }
  },
};

/** 한 점의 모델을 만든다. 같은 재질의 발광 조각(배열)은 하나로 합친다 */
export function buildHalloween(T, id, style, ctx) {
  const k = kit(T), parts = [], glows = [], g = new T.Group();
  BUILDERS[id](k, style, parts, glows);
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  for (const [geo, color, emissive, intensity, night] of glows) g.add(new T.Mesh(Array.isArray(geo) ? k.merge(geo) : geo, ctx.glowMat(color, emissive, intensity, night)));
  return g;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/halloween-art.test.mjs`
Expected: PASS (19 tests). 크기 제약에 걸리면 해당 조각 좌표를 줄여 맞춘다(테스트가 곧 규격이다 — 테스트를 풀지 않는다).

- [ ] **Step 5: 시안 HTML 생성기**

```js
// tools/halloween/build-mockup.mjs — 단독 HTML 하나로 만든다. 워크트리 preview 가 루트를 띄우는 함정 때문에
// three·조형 모듈을 data URL 로 인라인해 외부 경로가 없게 한다. WebGL 컨텍스트는 하나만 쓰고 <img> 로 굳힌다(컨텍스트 수 제한 회피).
// 사용: node tools/halloween/build-mockup.mjs  →  dev/active/halloween-coin-decor/look/mockups.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const b64 = (p) => 'data:text/javascript;base64,' + Buffer.from(readFileSync(new URL(p, root))).toString('base64');
const importmap = { imports: { three: b64('vendor/three/three.module.js'), art: b64('js/spaces/halloween-art.js') } };
const names = { ghostCandle: '👻 유령 촛불 150', miniGrave: '🪦 미니 묘비 200', witchCauldron: '🧙 마녀 솥 450', ghostlamp: '👻 유령 정원등 200', gravefence: '🪦 묘비 울타리 280', webarch: '🕸️ 거미줄 아치 500' };
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>할로윈 코인 장식 시안</title>
<style>body{margin:0;font:14px system-ui;background:#f4efe6;color:#3b3328}h2{margin:18px 12px 6px}.row{display:flex;gap:12px;padding:0 12px;flex-wrap:wrap}
.card{background:#fff;border-radius:12px;padding:8px;box-shadow:0 2px 8px #0002}.card b{display:block;margin-bottom:4px}.card small{opacity:.6}img{display:block;border-radius:8px}
.bar{position:sticky;top:0;background:#f4efe6;padding:8px 12px;z-index:2}button{font:inherit;padding:6px 12px;border-radius:8px;border:0;background:#3b3328;color:#fff}</style>
<div class="bar"><button id="tgl">낮/밤 전환</button> <small>각 안: 왼쪽 PC 근접 · 오른쪽 모바일 거리(게임 시점 축소)</small></div><div id="root"></div>
<script type="importmap">${JSON.stringify(importmap)}</script>
<script type="module">
import * as THREE from 'three';
import { HALLOWEEN_STYLES, HALLOWEEN_INDOOR_IDS, makeCtx, buildHalloween } from 'art';
const NAMES = ${JSON.stringify(names)}; let night = false; const nightMats = [], views = [];
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
function addView(id, style, w, h, dist) {
  const img = new Image(); img.width = w; img.height = h;
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 0.9)); const sun = new THREE.DirectionalLight(0xfff0d0, 1.1); sun.position.set(3, 5, 4); sc.add(sun);
  sc.add(new THREE.Mesh(new THREE.CircleGeometry(3, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9bbf7a })));
  const indoor = HALLOWEEN_INDOOR_IDS.includes(id);
  const m = buildHalloween(THREE, id, style, makeCtx(THREE, mat => nightMats.push(mat))); if (indoor) m.scale.setScalar(1.5); sc.add(m);
  cam.position.set(dist * 0.6, dist * 0.5, dist); cam.lookAt(0, indoor ? 0.5 : 0.8, 0);
  views.push({ img, w, h, sc, cam, sun }); return img;
}
function draw() {
  nightMats.forEach(mm => { mm.emissiveIntensity = night ? 1 : 0; });
  for (const v of views) { renderer.setPixelRatio(2); renderer.setSize(v.w, v.h); v.sc.background = new THREE.Color(night ? 0x141a2e : 0xcfe6f5); v.sun.intensity = night ? 0.15 : 1.1; renderer.render(v.sc, v.cam); v.img.src = renderer.domElement.toDataURL('image/png'); }
}
const rootEl = document.getElementById('root');
for (const [id, styles] of Object.entries(HALLOWEEN_STYLES)) {
  const indoor = HALLOWEEN_INDOOR_IDS.includes(id), dist = id === 'webarch' ? 8 : indoor ? 2.2 : 5;
  rootEl.insertAdjacentHTML('beforeend', '<h2>' + NAMES[id] + '</h2><div class="row" id="r-' + id + '"></div>');
  const row = document.getElementById('r-' + id);
  styles.forEach((s, i) => { const c = document.createElement('div'); c.className = 'card'; c.innerHTML = '<b>' + 'ABC'[i] + '안 <small>' + s + '</small></b>';
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:8px;align-items:flex-end';
    wrap.append(addView(id, s, 240, 240, dist), addView(id, s, 110, 110, dist * 2.2)); c.append(wrap); row.append(c); });
}
document.getElementById('tgl').onclick = () => { night = !night; draw(); }; draw();
</script>`;
mkdirSync(new URL('dev/active/halloween-coin-decor/look/', root), { recursive: true });
writeFileSync(new URL('dev/active/halloween-coin-decor/look/mockups.html', root), html);
console.log('wrote mockups.html');
```

- [ ] **Step 6: 생성·캡처·반복**

Run: `node tools/halloween/build-mockup.mjs`
`navigate` 로 생성된 HTML(`file://…/dev/active/halloween-coin-decor/look/mockups.html`, 막히면 `serve.py` 로 서빙)을 열고 낮/밤을 PC·모바일 폭(`resize_window`)으로 캡처한다. 읽히지 않는 안(모바일 110px 에서 실루엣이 뭉개짐, 밤에 번짐, 유령이 호박처럼 읽힘)은 `halloween-art.js` 의 수치를 고쳐 다시 생성한다. 최소 한 번은 **전부 눈으로 보고** 고친 뒤 사용자에게 보인다.

- [ ] **Step 7: 사용자 승인 게이트** — 상품별 A/B/C 를 PC·모바일로 나란히 보여 주고(캡처 + 파일 경로) 채택안을 받는다. 승인되면 `HALLOWEEN_STYLE` 값을 채택안으로 바꾸고, **채택되지 않은 안의 분기를 코드·`HALLOWEEN_STYLES` 에서 지운다**(죽은 코드를 남기지 않는다). `tests/halloween-art.test.mjs` 는 남은 목록으로 그대로 돈다.

- [ ] **Step 8: Run tests & Commit**

Run: `npm test` → Expected: PASS
```bash
git add js/spaces/halloween-art.js tools/halloween tests/halloween-art.test.mjs dev/active/halloween-coin-decor/look
git commit -m "feat: 할로윈 코인 장식 6종 조형 모듈과 시안(승인안 반영)"
```

---

## Task 9: 카탈로그 6종 + 영어 + 불변식 테스트

선행: Task 0 의 Part 2 문구 확정, Task 8 의 시안 승인.

**Files:**
- Modify: `js/data/catalog.js` (DECOR 3줄 · OUTDOOR 3줄)
- Modify: `js/i18n-en.js`
- Modify: `tests/house-floors.test.mjs` (코인 가구 단언의 필터)
- Test: `tests/halloween-coin-catalog.test.mjs`

**Interfaces:**
- Consumes: `SALE_WINDOWS` (`js/shop/sale-window.js`), Task 2 의 `sm`·`h` 규칙.
- Produces: DECOR `ghostCandle`·`miniGrave`·`witchCauldron`, OUTDOOR `ghostlamp`·`gravefence`·`webarch` (모두 `sale: 'halloween'`).

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-coin-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { SALE_WINDOWS } from '../js/shop/sale-window.js';

const SRC = gameSource();
const block = (open) => SRC.slice(SRC.indexOf(open), SRC.indexOf('\n];', SRC.indexOf(open)));
const sale = (b) => b.split('\n').filter(l => l.includes("sale: 'halloween'"));
const idOf = (l) => l.match(/id: '(\w+)'/)[1];
const IN = sale(block('const DECOR = ['));
const OUT = sale(block('const OUTDOOR = ['));
const PRICE = { ghostCandle: 150, miniGrave: 200, witchCauldron: 450, ghostlamp: 200, gravefence: 280, webarch: 500 };

test('6종이 정확히 들어 있다(실내 3 + 야외 3)', () => {
  assert.deepEqual(IN.map(idOf).sort(), ['ghostCandle', 'miniGrave', 'witchCauldron']);
  assert.deepEqual(OUT.map(idOf).sort(), ['ghostlamp', 'gravefence', 'webarch']);
});
test('B안 가격이다(코인 전용)', () => {
  for (const l of IN) { assert.match(l, /pay: 'coins'/); assert.equal(+l.match(/cost: (\d+)/)[1], PRICE[idOf(l)]); }
  for (const l of OUT) assert.equal(+l.match(/cost: \{ coins: (\d+) \}/)[1], PRICE[idOf(l)]);
});
test('집 단계 제한이 없다(stage·outdoorOnly·hidden 없음)', () => {
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /stage:|outdoorOnly|hidden/);
});
test('sale 키가 SALE_WINDOWS 에 있다 — 항목에 날짜를 복제하지 않는다', () => {
  assert.ok(SALE_WINDOWS.halloween);
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /20\d\d-\d\d-\d\d/);
});
test('호박 계열이 아니다', () => {
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /pumpkin|harvest|호박|허수아비/);
});
test('유령 촛불은 탁상 소품(sm + h)이다', () => {
  const l = IN.find(x => idOf(x) === 'ghostCandle');
  assert.match(l, /sm: true/); assert.match(l, /\bh: 0\.5\b/);
});
test('묘비 울타리는 밤손님 방어 울타리로 세지 않는다', () => {
  const nv = readFileSync(new URL('../js/spaces/night-visit.js', import.meta.url), 'utf8');
  assert.doesNotMatch(nv, /gravefence/);
});
test('영어 이름이 있다', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const n of ['유령 촛불', '미니 묘비', '마녀 솥', '유령 정원등', '묘비 울타리', '거미줄 아치']) assert.ok(en.includes(`'${n}'`), n);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-coin-catalog.test.mjs`
Expected: FAIL — 6종이 없다

- [ ] **Step 3: catalog.js**

DECOR 의 `parasol_set` 줄 **다음**에 (이름은 Task 0 확정값):
```js
  // 🎃 할로윈 한정 코인 장식(SALE_WINDOWS.halloween) — 사면 영구, 기간 밖엔 안 산 사람에겐 목록에서 숨는다(보관분은 계속 보임). 집 단계 제한 없음 — 가격만 문턱
  { id: 'ghostCandle',   name: '유령 촛불', ico: '👻', cost: 150, pay: 'coins', sale: 'halloween', foot: [0.3, 0.3], sm: true, h: 0.5 },
  { id: 'miniGrave',     name: '미니 묘비', ico: '🪦', cost: 200, pay: 'coins', sale: 'halloween', foot: [0.5, 0.3] },
  { id: 'witchCauldron', name: '마녀 솥',   ico: '🧙', cost: 450, pay: 'coins', sale: 'halloween', big: true, foot: [1.0, 1.0] },
```
OUTDOOR 의 `harvestscarecrow` 줄 **다음**, `...FARM_BUILDINGS,` **앞**에:
```js
  // 🎃 할로윈 한정 코인 장식 — 직접 구매(작업대 목록, 기간 한정). hidden 과 다르다: hidden 은 영구 비판매, sale 은 기간 판매
  { id: 'ghostlamp',  name: '유령 정원등', ico: '👻', cost: { coins: 200 }, sale: 'halloween', desc: '밤이 되면 으스스하게 빛나는 유령 등' },
  { id: 'gravefence', name: '묘비 울타리', ico: '🪦', cost: { coins: 280 }, sale: 'halloween', desc: '묘비 모양 울타리 · 밤손님은 못 막아요' },
  { id: 'webarch',    name: '거미줄 아치', ico: '🕸️', cost: { coins: 500 }, sale: 'halloween', desc: '마당 입구에 세우는 커다란 거미줄 아치' },
```
(`gravefence` 는 `fence` 가 아니라서 `js/spaces/night-visit.js:184` 의 `o.id === 'fence'` 판정에 잡히지 않는다 — 방어 밸런스 불변.)

- [ ] **Step 4: i18n-en.js**

기존 항목 형식·정렬을 따라 추가:
```js
  '유령 촛불': 'Ghost Candle', '미니 묘비': 'Mini Gravestone', '마녀 솥': 'Witch Cauldron',
  '유령 정원등': 'Ghost Garden Lamp', '묘비 울타리': 'Gravestone Fence', '거미줄 아치': 'Cobweb Arch',
  '밤이 되면 으스스하게 빛나는 유령 등': 'A spooky ghost lamp that glows at night',
  '묘비 모양 울타리 · 밤손님은 못 막아요': 'Gravestone-shaped fence · does not keep night visitors out',
  '마당 입구에 세우는 커다란 거미줄 아치': 'A big cobweb arch for the yard entrance',
```

- [ ] **Step 5: 기존 단언 필터 갱신**

`tests/house-floors.test.mjs` 의 `SHOP_DECOR_SRC` 정의 한 줄을 교체 — 기간 한정(sale) 항목은 "층 해금 고급 가구 10종" 정의 밖이다:
```js
const SHOP_DECOR_SRC = DECOR_SRC.split('\n').filter(l => !l.includes('hidden: true') && !l.includes('sale:')).join('\n');   // 🎃 기간 한정 코인 장식(sale)도 뺀다 — 따로 센다(tests/halloween-coin-catalog.test.mjs)
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS, 실패 0

- [ ] **Step 7: Commit**

```bash
git add js/data/catalog.js js/i18n-en.js tests/house-floors.test.mjs tests/halloween-coin-catalog.test.mjs
git commit -m "feat: 할로윈 코인 장식 6종 카탈로그(B안 가격)"
```

---

## Task 10: 모델을 게임에 연결 (decorMesh · outdoorMesh · 충돌)

**Files:**
- Modify: `js/spaces/indoor.js` (`decorMesh`)
- Modify: `js/game.js` (`outdoorMesh` · `placeOutdoor` 의 solid 목록)
- Test: `tests/halloween-coin-wiring.test.mjs` (추가)

**Interfaces:**
- Consumes: `HALLOWEEN_INDOOR_IDS`, `HALLOWEEN_OUTDOOR_IDS`, `HALLOWEEN_STYLE`, `makeCtx`, `buildHalloween` (Task 8).

- [ ] **Step 1: Write the failing test (append)**

```js
test('decorMesh·outdoorMesh 가 조형 모듈로 6종을 만든다', () => {
  assert.match(SRC, /HALLOWEEN_INDOOR_IDS\.includes\(id\)[\s\S]{0,200}buildHalloween\(THREE, id, HALLOWEEN_STYLE\[id\]/);
  assert.match(SRC, /HALLOWEEN_OUTDOOR_IDS\.includes\(id\)[\s\S]{0,260}buildHalloween\(THREE, id, HALLOWEEN_STYLE\[id\]/);
});
test('유령 정원등·묘비 울타리는 막고 거미줄 아치는 걸어 통과한다', () => {
  assert.match(SRC, /'fence', 'stonewall', 'postlamp', 'brazier', 'scarecrow', 'spiritlamp', 'ghostlamp', 'gravefence'/);
  assert.doesNotMatch(SRC, /\['fence'[^\]]*'webarch'/);   // webarch 는 솔리드 목록에 없다
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-coin-wiring.test.mjs`
Expected: FAIL — 두 테스트

- [ ] **Step 3: indoor.js — decorMesh 분기 + import**

import 에 `import { HALLOWEEN_INDOOR_IDS, HALLOWEEN_STYLE, buildHalloween, makeCtx } from './halloween-art.js';` 추가. `decorMesh` 두 번째 체인의 `deskLamp` 분기 **다음**(nightstand 앞)에:
```js
  } else if (HALLOWEEN_INDOOR_IDS.includes(id)) {   // 🎃 할로윈 코인 장식 3종 — 조형은 halloween-art.js (시안 HTML 과 같은 코드)
    g.add(buildHalloween(THREE, id, HALLOWEEN_STYLE[id], makeCtx(THREE)));
```

- [ ] **Step 4: game.js — outdoorMesh 분기 + solid 목록**

import 에 `import { HALLOWEEN_OUTDOOR_IDS, HALLOWEEN_STYLE, buildHalloween, makeCtx } from './spaces/halloween-art.js';`. `outdoorMesh` 의 `} else if (id === 'kiln') {` **앞**에:
```js
  } else if (HALLOWEEN_OUTDOOR_IDS.includes(id)) {   // 🎃 할로윈 코인 장식 3종 — 밤에 켜지는 재질은 houseWindows 에 올린다(postlamp 와 같은 규칙)
    g.add(buildHalloween(THREE, id, HALLOWEEN_STYLE[id], makeCtx(THREE, (m) => houseWindows.push(m))));
```
`placeOutdoor` 의 solid 줄을 교체:
```js
    } else solid = ['fence', 'stonewall', 'postlamp', 'brazier', 'scarecrow', 'spiritlamp', 'ghostlamp', 'gravefence'].includes(id) ? solidCircle(wx, wz, ['postlamp', 'scarecrow', 'spiritlamp', 'ghostlamp'].includes(id) ? 0.22 : 0.5) : null;   // 🎃 거미줄 아치(webarch)는 걸어서 통과한다
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: PASS, 실패 0

- [ ] **Step 6: Commit**

```bash
git add js/spaces/indoor.js js/game.js tests/halloween-coin-wiring.test.mjs
git commit -m "feat: 할로윈 코인 장식 6종 모델을 실내·야외에 연결"
```

---

## Task 11: 2부 실측 검증 (게임 안)

**Files:** 산출물 `dev/active/halloween-coin-decor/look/part2-*.png`, `part2-report.md`

- [ ] **Step 1: 기간 안 확인** — `SALE_WINDOWS.halloween` 날짜를 **건드리지 않고** 콘솔에서 시계를 임시로 옮긴다: `Date.now = () => Date.UTC(2026, 9, 25, 3)`(10/25 정오 KST) 후 가구 메뉴·작업대를 연다. 6종 행과 `🎃 할로윈 한정 ~11/2` 태그가 보이는지, 가격이 150/200/450·200/280/500 인지 확인. 시계는 새로고침으로 되돌린다.
- [ ] **Step 2: 기간 밖 확인** — 시계를 `Date.UTC(2026, 10, 3, 3)` 로: 6종이 목록에서 사라지는지. 코인을 `?give=coins:2000` 으로 준 뒤 기간 안에 하나(유령 촛불)를 사서 들어 올려 🧺 보관함에 넣고 기간 밖으로 옮기면 **보관분이 계속 보이는지**(`보유 1`), 꺼내 놓을 때 값이 들지 않는지.
- [ ] **Step 3: 가드** — 기간 안에 작업대에서 유령 정원등을 골라 배치 모드로 둔 채 시계를 기간 밖으로 옮기고 설치 → 토스트 `🎃 할로윈 장식 판매가 끝났어요`, 설치 안 됨, 코인 불변.
- [ ] **Step 4: 장면** — 실내(탁자 위 유령 촛불, 바닥 미니 묘비, 마녀 솥)와 야외(정원등·울타리·아치)를 **낮·밤(`?time=` 으로 밤 값)** 으로 PC·모바일 캡처. 확인: 유령 촛불·정원등 발광이 번지지 않는지(블룸), 면 겹침 줄무늬, **작은 소품 그림자 지글거림**(카메라를 움직여 본다). 지글거리면 `decorMesh` 끝의 `root.traverse(o => { if (o.isMesh) o.castShadow = true; });` 를 `NO_SHADOW_DECOR`(`const NO_SHADOW_DECOR = ['ghostCandle'];`)에 든 id 는 `false` 가 되게 고치고 재확인.
- [ ] **Step 5: 드로우콜** — 콘솔 `__perf().calls` 를 (a) 6종이 없는 장면 (b) 6종을 모두 놓은 장면에서 읽어 증가분을 기록. 모델당 ≤3 이 실제로 지켜지는지 확인.
- [ ] **Step 6: 묘비 울타리 방어 불변** — 밭 근처에 `gravefence` 4개를 놓아도 밤손님 방어 판정이 켜지지 않는지(`gameState.outdoor.filter(o => o.id === 'fence').length` 가 그대로) 확인.
- [ ] **Step 7: 세이브 왕복** — 6종을 놓고 새로고침 → 전부 복원, 상판 위 유령 촛불이 높이를 유지.
- [ ] **Step 8: 모바일 메뉴 실측** — `resize_window` mobile 로 가구 메뉴(`.dm-item` 62px 폭에 태그 두 줄)와 작업대(`.ck-item`)가 넘치지 않는지, 목록이 길어져도 스크롤이 되는지 캡처로 확인. 넘치면 CSS 를 조정(`.di-tag` 폰트 8.5px 등).
- [ ] **Step 9: 보고서 커밋**

```bash
git add dev/active/halloween-coin-decor index.html js
git commit -m "docs: 할로윈 코인 장식 실측 보고(및 실측 중 조정)"
```

---

## Task 12: 마무리 — 전체 검증·리뷰·비밀 스캔·문서

**Files:** `dev/active/halloween-coin-decor/*`

- [ ] **Step 1: 전체 테스트** — `npm test` → 실패 0, 새 테스트 수 기록.
- [ ] **Step 2: 코드 리뷰** — `everything-claude-code:code-reviewer` 에 전체 diff(`git diff main...HEAD`), 구매 가드·세이브 경로는 `everything-claude-code:security-reviewer` 에도. CRITICAL/HIGH 는 고치고 MEDIUM 은 가능한 한 고친다. 결과를 `dev/active/halloween-coin-decor/review.md` 로.
- [ ] **Step 3: 비밀 스캔(공개 저장소)** — 아래 한 명령이 0건이어야 한다(커밋 명령과 섞지 않는다).

```bash
git grep -nE "AIza|GOCSPX-|sk-[A-Za-z0-9]{20,}|BEGIN (RSA|PRIVATE)" -- . ':!docs' ':!dev'
```
- [ ] **Step 4: 안 만든 것 확인** — 호박 계열 id 가 새로 생기지 않았는지, 도구 스윙·캐릭터 얼굴 파일이 diff 에 없는지 `git diff --stat main...HEAD` 로 확인.
- [ ] **Step 5: dev docs 갱신** — `halloween-coin-decor-tasks.md` 체크, `context.md` 의 Last Updated·결과(테스트 수·드로우콜 증가분·발견한 함정)·남은 일을 기록. **배포 주의**: 4곳 동시 배포 필수 — 옛 클라이언트는 `placeDecor` 가 모르는 id 를 `false` 로 돌려 세이브에서 새 가구가 지워진다(`js/spaces/indoor.js` 의 `if (!def) return false`).
- [ ] **Step 6: 메모리 기록** — 프로젝트 메모리에 `halloween-coin-decor.md` 를 쓰고 `MEMORY.md` 에 한 줄 추가(함정: `catalog.js` Node 불가·`sm` 은 `h` 필수·`sale` ≠ `hidden`·시안은 단독 HTML·탁상 규칙이 main 에 들어온 날짜).
- [ ] **Step 7: 커밋**(푸시·병합·배포는 사용자 지시 전엔 하지 않는다)

```bash
git add dev/active/halloween-coin-decor
git commit -m "docs: 할로윈 코인 장식 완료 기록"
```

---

## Self-Review

**1. Spec coverage**
- §1-2 원본 설계(surfaceAt·top/sm·solidBox 생략·reseat·nearestDecor·고스트/링/조준·deskLamp·i18n) → Task 1·2·3.
- §1-3 개선 ① 다층 → Task 1(`f` 필터 테스트)·3(`rec.f`·`floorBaseY(f)`), ② 순수 모듈 → Task 1, ③ 천장 테스트 → Task 2.
- §1-4 테스트 → Task 1·2·3.
- §2-1 6종·가격 B → Task 9. §2-2 catalogVisible·목록 2곳·구매 가드·보관분 → Task 5·6·7. §2-3 데이터·외형·로그·i18n·울타리 불변 → Task 8·9·10·7. §2-4 조형 제약 → Task 8 테스트(메시 ≤3·크기)·Task 11(블룸·그림자·드로우콜). §2-5 테스트 → Task 5·7·9·10.
- §3 게이트(문구 선검수·시안 승인·비밀 스캔·배포 별도) → Task 0·8·12.
- §4 위험: 다층 → Task 1/4, 구매 가드 → Task 7, 옛 클라 id 삭제 → Task 12 Step 5, 모바일 → Task 11, econ source → 확인 완료(CHECK 제약 없음, SQL 불필요).

**2. Placeholder scan** — "TBD/나중에" 없음. 의도된 사용자 게이트 두 곳: ① 문구는 Task 0 이 확정하고 코드 속 문구는 후보 1 기준, ② Task 8 의 세 안 중 채택되지 않은 분기는 승인 후 지운다.

**3. Type consistency** — `surfaceAt({ x, z, f, def, rot, hosts, scale }) → { y, hostIndex }`(Task 1) ↔ `surfaceFor(x, z, def, rot, f) → { y, root }`(Task 3, `hosts[hit.hostIndex].root`). `decorHalf(foot, rot, scale)` 호출 전부 3인자. `catalogVisible(item, { stored, now })`(Task 5) ↔ Task 6 호출 `{ stored: … }`. `makeCtx(T, onNight)`·`buildHalloween(T, id, style, ctx)`(Task 8) ↔ Task 10 호출 동일. `HALLOWEEN_STYLE[id]` 키 = 카탈로그 id(`ghostCandle`…`webarch`) 일치. 크기 규격(Task 8 `LIMIT`)은 카탈로그 `foot`/`h`(Task 9)와 같은 값(유령 촛불 0.3·0.5, 미니 묘비 0.5×0.3, 마녀 솥 1.0).
