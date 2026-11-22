# 반딧불이 계곡 디벨롭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 반딧불이 계곡에 날짜별로 달라지는 밤 3종, 누적 포획으로 켜지는 병등 줄, 큰 반디가 이끄는 무리 잡기를 넣는다.

**Architecture:** 규칙은 `js/glade/` 의 순수 모듈 네 개(밤, 줄등 진행, 줄등 자리, 무리)에 두고 Node 테스트로 잠근다. 조형은 `js/glade/string-art.js`, `js/glade/swarm-art.js` 에, 연결은 기존 `js/spaces/glade.js` 에만 둔다. 저장은 기존 `gameState.hintsSeen` 안의 문자열·정수 키만 쓴다.

**Tech Stack:** 순수 ES 모듈, three.js(기존), `node --test tests/*.test.mjs`, 헤드리스 크롬 캡처(`dev/active/glade-develop/verify/`).

**Spec:** `docs/superpowers/specs/2026-11-22-glade-develop-design.md`

## Global Constraints

- 작업 위치: 워크트리 `/Users/uicheol_hwang/calm_forest/.claude/worktrees/glade-develop`, 브랜치 `feat/glade-develop`. 루트 체크아웃에서 작업하지 않는다.
- 커밋은 이 브랜치에 로컬로만. 푸시·병합·배포는 사용자 승인 뒤.
- 새 코드(JS·CSS·테스트)에 주석을 쓰지 않는다.
- 새 유저 노출 문구에 엠대시(—)와 "놀다"를 쓰지 않는다. 해요체. 한국어 문구마다 `js/i18n-en.js` 에 영어를 같이 넣는다.
- 월드 머리 위에는 글자를 두지 않는다. 글자는 배너와 잡을 때 뜨는 글자로만.
- `js/game.js` 에 새 로직을 넣지 않는다. 배지 한 줄(`js/data/dex.js`)과 기존 export 사용만 허용.
- 새 저장 키는 `hintsSeen` 안: `gladeCaught`(정수), `gladeSeg`(문자열), `gladeString`(문자열), `gladeNightSeen`(날짜 문자열), `gladeSwarmSeen`(true). 새 최상위 저장 필드, 새 가구·꾸미기 id, 서버·SQL 변경 금지.
- 새 이벤트 파라미터는 5개 이하. `firefly_catch` 에는 `mode` 하나만 더한다.
- 로그인 화면·이름 화면·첫 안내는 건드리지 않는다.
- 숫자 기본값: 밤 비율 평범 40% · 나머지 각 20%, 문턱 `3·8·15·25·40·60·85·115·150·190·240`, 병등 칸당 4개, 무리 꼬마 4마리 · 수명 45초 · 첫 등장 40~70초 · 다음 90~150초, 큰 반디 반디 2 · 완주 덤 2.
- 브라우저로 게임을 열어 확인할 때는 소리를 끈다(하네스는 `--mute-audio` 로 띄운다).

## File Structure

| 파일 | 책임 |
|---|---|
| `js/glade/night.js` (신규) | 날짜 → 밤 종류, 한 빛깔 대상, 밤별 조정값, 한 줄기 길 |
| `js/glade/string.js` (신규) | 문턱, 켜진 칸 수, 포획 반영, 병등 색 나누기, 문자열 인코딩 |
| `js/glade/string-layout.js` (신규) | 나무 자리 → 걸 곳 11개(빈 각도에 기둥) |
| `js/glade/swarm.js` (신규) | 무리 상태와 휘두른 결과 |
| `js/glade/copy.js` (신규) | 새 한국어 문구 |
| `js/glade/string-art.js` (신규) | 병등 줄 조형(three) |
| `js/glade/swarm-art.js` (신규) | 큰 반디 조형(three) |
| `js/spaces/glade.js` (수정) | 위 모듈을 기존 생성·이동·포획 흐름에 연결 |
| `js/data/dex.js` (수정) | 배지 `glade_ring` 한 줄 |
| `js/i18n-en.js` (수정) | 영어 문구 |
| `tests/glade-night.test.mjs` · `glade-string.test.mjs` · `glade-string-layout.test.mjs` · `glade-swarm.test.mjs` · `glade-copy.test.mjs` (신규) | 순수 모듈 테스트 |
| `dev/active/glade-develop/verify/impl-shots.mjs` (신규) | 구현 화면 캡처 |

---

### Task 0: 준비

**Files:**
- Create: 없음

- [ ] **Step 1: 의존성 연결과 기준 테스트**

```bash
cd /Users/uicheol_hwang/calm_forest/.claude/worktrees/glade-develop
[ -e node_modules ] || ln -s /Users/uicheol_hwang/calm_forest/node_modules node_modules
npm test 2>&1 | tail -6
```
Expected: `# fail 0`. 실패가 있으면 멈추고 사용자에게 알린다.

- [ ] **Step 2: 지금까지의 문서·시안 커밋**

```bash
git add docs/superpowers/specs/2026-11-22-glade-develop-design.md docs/superpowers/plans/2026-11-22-glade-develop.md dev/active/glade-develop sims/glade-develop-directions.html sims/glade-develop
git status --short | head -30
git commit -m "docs(glade): design, plan and direction mockups for the glade develop

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```
`node_modules` 링크가 스테이징되지 않았는지 `git status` 로 확인한다(`.gitignore` 에 있다).

---

### Task 1: 밤 종류 규칙

**Files:**
- Create: `js/glade/night.js`
- Test: `tests/glade-night.test.mjs`

**Interfaces:**
- Produces: `NIGHT_KINDS: readonly string[]`, `nightKind(dateKey: string): 'plain'|'stream'|'mono'|'low'`, `monoKind(dateKey: string, openIds: string[]): string|null`, `pickKindId(kind: string, monoId: string|null, rnd: () => number, fallback: () => string): string`, `MONO_SHARE: number`, `TUNE: Record<kind, { respawn, speed, yMin, yMax, fleeDist, dimChance }>`, `streamPoint(u: number, R: number): { x, z }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/glade-night.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONO_SHARE, NIGHT_KINDS, TUNE, monoKind, nightKind, pickKindId, streamPoint } from '../js/glade/night.js';

const days = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 10, 22 + i)).toISOString().slice(0, 10));

test('nightKind returns a known kind and is stable for a date', () => {
  for (const d of days) {
    assert.ok(NIGHT_KINDS.includes(nightKind(d)));
    assert.equal(nightKind(d), nightKind(d));
  }
});

test('nightKind shares over a year stay near 40/20/20/20', () => {
  const count = {};
  for (const d of days) count[nightKind(d)] = (count[nightKind(d)] || 0) + 1;
  assert.ok(count.plain / 365 > 0.3 && count.plain / 365 < 0.5);
  for (const k of ['stream', 'mono', 'low']) assert.ok(count[k] / 365 > 0.12 && count[k] / 365 < 0.28, k);
});

test('nightKind does not repeat the same kind for more than a week', () => {
  let run = 1, longest = 1;
  for (let i = 1; i < days.length; i++) {
    run = nightKind(days[i]) === nightKind(days[i - 1]) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  assert.ok(longest <= 7);
});

test('monoKind never picks rainbow and is stable for a date', () => {
  const open = ['rainbow', 'frost', 'green', 'blue', 'yellow'];
  for (const d of days) {
    const id = monoKind(d, open);
    assert.notEqual(id, 'rainbow');
    assert.ok(open.includes(id));
    assert.equal(id, monoKind(d, open));
  }
  assert.equal(monoKind('2026-11-22', ['rainbow']), null);
  assert.equal(monoKind('2026-11-22', []), null);
});

test('pickKindId uses the mono kind only on mono nights and only within its share', () => {
  assert.equal(pickKindId('mono', 'green', () => MONO_SHARE - 0.01, () => 'yellow'), 'green');
  assert.equal(pickKindId('mono', 'green', () => MONO_SHARE + 0.01, () => 'yellow'), 'yellow');
  assert.equal(pickKindId('plain', 'green', () => 0, () => 'yellow'), 'yellow');
  assert.equal(pickKindId('mono', null, () => 0, () => 'yellow'), 'yellow');
});

test('TUNE covers every kind and only the low night eases catching', () => {
  for (const k of NIGHT_KINDS) for (const f of ['respawn', 'speed', 'yMin', 'yMax', 'fleeDist', 'dimChance']) assert.equal(typeof TUNE[k][f], 'number');
  assert.equal(TUNE.plain.dimChance, 0.35);
  assert.equal(TUNE.low.dimChance, 0.6);
  assert.equal(TUNE.stream.respawn, 0.5);
  assert.ok(TUNE.low.yMax < TUNE.plain.yMin + 0.3);
});

test('streamPoint stays inside the radius', () => {
  for (let u = 0; u < 7; u += 0.1) {
    const p = streamPoint(u, 6);
    assert.ok(Math.hypot(p.x, p.z) <= 6);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-night.test.mjs`
Expected: FAIL, `Cannot find module '../js/glade/night.js'`

- [ ] **Step 3: 구현**

`js/glade/night.js`:
```js
export const NIGHT_KINDS = Object.freeze(['plain', 'stream', 'mono', 'low']);
export const MONO_SHARE = 0.7;

const hash = (s) => {
  let h = [...s].reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b);
  h ^= h >>> 16;
  return h >>> 0;
};

export function nightKind(dateKey) {
  const r = hash('glade:' + dateKey) % 10;
  return r < 4 ? 'plain' : r < 6 ? 'stream' : r < 8 ? 'mono' : 'low';
}

export function monoKind(dateKey, openIds) {
  const pool = openIds.filter(id => id !== 'rainbow');
  return pool.length ? pool[hash('mono:' + dateKey) % pool.length] : null;
}

export function pickKindId(kind, monoId, rnd, fallback) {
  return kind === 'mono' && monoId && rnd() < MONO_SHARE ? monoId : fallback();
}

const BASE = Object.freeze({ respawn: 1, speed: 0.55, yMin: 0.9, yMax: 2.8, fleeDist: 1.5, dimChance: 0.35 });

export const TUNE = Object.freeze({
  plain: BASE,
  mono: BASE,
  stream: Object.freeze({ ...BASE, respawn: 0.5 }),
  low: Object.freeze({ ...BASE, speed: 0.3, yMin: 0.5, yMax: 1.1, fleeDist: 1.0, dimChance: 0.6 }),
});

export const streamPoint = (u, R) => ({ x: R * 0.68 * Math.sin(u), z: R * 0.4 * Math.sin(2 * u) });
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/glade-night.test.mjs`
Expected: PASS, 7 tests

- [ ] **Step 5: 커밋**

```bash
git add js/glade/night.js tests/glade-night.test.mjs
git commit -m "feat(glade): night kinds picked by local date

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 2: 줄등 진행 규칙

**Files:**
- Create: `js/glade/string.js`
- Test: `tests/glade-string.test.mjs`

**Interfaces:**
- Produces: `THRESHOLDS: readonly number[]`(길이 11), `JARS_PER_SEG = 4`, `SEG_COINS: readonly number[]`(길이 11), `KIND_CODE: Record<kindId, letter>`, `segmentsLit(caught: number): number`, `nextThreshold(caught: number): number|null`, `splitColors(counts: Record<letter, number>, n?: number): string`, `addCatch(state: { caught, seg, string }, kindId: string): { caught: number, seg: string, string: string, lit: number|null }`, `stringColors(str: string): string[][]`(칸마다 종류 id 4개)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/glade-string.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JARS_PER_SEG, KIND_CODE, SEG_COINS, THRESHOLDS, addCatch, nextThreshold, segmentsLit, splitColors, stringColors } from '../js/glade/string.js';

test('thresholds are eleven ascending steps ending at 240', () => {
  assert.equal(THRESHOLDS.length, 11);
  assert.deepEqual([...THRESHOLDS], [3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 240]);
  assert.equal(SEG_COINS.length, 11);
});

test('segmentsLit and nextThreshold follow the table', () => {
  assert.equal(segmentsLit(0), 0);
  assert.equal(segmentsLit(2), 0);
  assert.equal(segmentsLit(3), 1);
  assert.equal(segmentsLit(239), 10);
  assert.equal(segmentsLit(240), 11);
  assert.equal(segmentsLit(9999), 11);
  assert.equal(nextThreshold(0), 3);
  assert.equal(nextThreshold(3), 8);
  assert.equal(nextThreshold(240), null);
});

test('splitColors shares four jars by the catch ratio', () => {
  assert.equal(splitColors({ y: 4 }), 'yyyy');
  assert.equal(splitColors({ y: 3, b: 1 }), 'yyyb');
  assert.equal(splitColors({ y: 2, b: 2 }).split('').sort().join(''), 'bbyy');
  assert.equal(splitColors({ y: 5, b: 1, g: 1 }).length, JARS_PER_SEG);
  assert.equal(splitColors({}), 'yyyy');
  assert.equal(splitColors({ y: 9, r: 1 }), 'yyyy');
  assert.equal(splitColors({ y: 2, r: 1 }), 'yyyr');
});

test('addCatch counts up, tracks kinds and lights a segment at each threshold', () => {
  let s = { caught: 0, seg: '', string: '' };
  s = addCatch(s, 'yellow');
  assert.deepEqual(s, { caught: 1, seg: 'y1', string: '', lit: null });
  s = addCatch(s, 'blue');
  assert.equal(s.seg, 'y1b1');
  s = addCatch(s, 'yellow');
  assert.equal(s.caught, 3);
  assert.equal(s.lit, 1);
  assert.equal(s.seg, '');
  assert.equal(s.string.length, JARS_PER_SEG);
  assert.equal(s.string.split('').sort().join(''), 'byyy');
});

test('addCatch reaches eleven segments at 240 and stays there', () => {
  let s = { caught: 0, seg: '', string: '' };
  const lit = [];
  for (let i = 0; i < 260; i++) { s = addCatch(s, i % 3 ? 'yellow' : 'green'); if (s.lit) lit.push(s.lit); }
  assert.deepEqual(lit, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(s.string.length, 11 * JARS_PER_SEG);
  assert.equal(s.caught, 260);
});

test('addCatch survives missing or broken saved values', () => {
  const s = addCatch({ caught: undefined, seg: undefined, string: undefined }, 'frost');
  assert.deepEqual(s, { caught: 1, seg: 'f1', string: '', lit: null });
  const t = addCatch({ caught: 2, seg: 'zz9??y1', string: 'yy!!bbXX' }, 'nope');
  assert.equal(t.caught, 3);
  assert.equal(t.lit, 1);
  assert.match(t.string, /^[a-z]+$/);
});

test('stringColors turns the saved string into kind ids per segment', () => {
  assert.deepEqual(stringColors('yybgrrrr'), [['yellow', 'yellow', 'blue', 'green'], ['rainbow', 'rainbow', 'rainbow', 'rainbow']]);
  assert.deepEqual(stringColors(''), []);
  assert.deepEqual(stringColors('yyb'), []);
  assert.equal(Object.keys(KIND_CODE).length, 8);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-string.test.mjs`
Expected: FAIL, `Cannot find module '../js/glade/string.js'`

- [ ] **Step 3: 구현**

`js/glade/string.js`:
```js
export const THRESHOLDS = Object.freeze([3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 240]);
export const JARS_PER_SEG = 4;
export const SEG_COINS = Object.freeze([10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 0]);
export const KIND_CODE = Object.freeze({ yellow: 'y', blue: 'b', green: 'g', rainbow: 'r', petal: 'p', ember: 'e', amber: 'a', frost: 'f' });
const CODE_KIND = Object.freeze(Object.fromEntries(Object.entries(KIND_CODE).map(([k, c]) => [c, k])));

export const segmentsLit = (caught) => THRESHOLDS.filter(t => caught >= t).length;
export const nextThreshold = (caught) => THRESHOLDS.find(t => caught < t) ?? null;

function parseSeg(str) {
  const out = {};
  for (const m of String(str || '').matchAll(/([a-z])(\d+)/g)) if (CODE_KIND[m[1]]) out[m[1]] = (out[m[1]] || 0) + Number(m[2]);
  return out;
}

const encodeSeg = (counts) => Object.entries(counts).filter(([, n]) => n > 0).map(([c, n]) => c + n).join('');

const cleanString = (str) => [...String(str || '')].filter(c => CODE_KIND[c]).join('').slice(0, THRESHOLDS.length * JARS_PER_SEG);

export function splitColors(counts, n = JARS_PER_SEG) {
  const entries = Object.entries(counts).filter(([c, v]) => CODE_KIND[c] && v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return 'y'.repeat(n);
  const parts = entries.map(([c, v]) => ({ c, v, whole: Math.floor((v * n) / total), rest: ((v * n) / total) % 1 }));
  let left = n - parts.reduce((s, p) => s + p.whole, 0);
  for (const p of [...parts].sort((a, b) => b.rest - a.rest || b.v - a.v)) {
    if (left <= 0) break;
    p.whole += 1; left -= 1;
  }
  return parts.sort((a, b) => b.whole - a.whole || b.v - a.v).map(p => p.c.repeat(p.whole)).join('');
}

export function addCatch(state, kindId) {
  const caught = (state.caught | 0) + 1;
  const counts = parseSeg(state.seg);
  const code = KIND_CODE[kindId] || 'y';
  counts[code] = (counts[code] || 0) + 1;
  const string = cleanString(state.string);
  const after = segmentsLit(caught);
  if (after === segmentsLit(caught - 1)) return { caught, seg: encodeSeg(counts), string, lit: null };
  return { caught, seg: '', string: (string + splitColors(counts)).slice(0, THRESHOLDS.length * JARS_PER_SEG), lit: after };
}

export function stringColors(str) {
  const s = cleanString(str), out = [];
  for (let i = 0; i + JARS_PER_SEG <= s.length; i += JARS_PER_SEG) out.push([...s.slice(i, i + JARS_PER_SEG)].map(c => CODE_KIND[c]));
  return out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/glade-string.test.mjs`
Expected: PASS, 7 tests

- [ ] **Step 5: 커밋**

```bash
git add js/glade/string.js tests/glade-string.test.mjs
git commit -m "feat(glade): string light progress rules from lifetime catches

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 3: 줄등 걸 곳 배치

**Files:**
- Create: `js/glade/string-layout.js`
- Test: `tests/glade-string-layout.test.mjs`

**Interfaces:**
- Produces: `layoutAnchors(trees: { x: number, z: number }[], R: number, count?: number): { a: number, x: number, z: number, post: boolean }[]`. 좌표는 계곡 중심 기준. 각도 오름차순, 길이는 항상 `count`(기본 11).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/glade-string-layout.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutAnchors } from '../js/glade/string-layout.js';

const R = 7;
const at = (a, d = R + 1.9) => ({ x: Math.cos(a) * d, z: Math.sin(a) * d });
const real = [-0.89, -0.32, 0.25, 0.82, 1.39, 1.96, 2.53].map(a => at(a));
const TAU = Math.PI * 2;
const gaps = (list) => list.map((p, i) => ((list[(i + 1) % list.length].a - p.a) + TAU) % TAU || TAU);

test('seven real trees get four posts in the empty arc and form eleven anchors', () => {
  const list = layoutAnchors(real, R);
  assert.equal(list.length, 11);
  assert.equal(list.filter(p => p.post).length, 4);
  assert.ok(Math.max(...gaps(list)) < 0.75);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].a > list[i - 1].a);
});

test('tree anchors sit a little inside the trunk, posts sit just outside the floor', () => {
  const list = layoutAnchors(real, R);
  for (const p of list) {
    const d = Math.hypot(p.x, p.z);
    if (p.post) assert.ok(Math.abs(d - (R + 1.5)) < 1e-6);
    else assert.ok(Math.abs(d - (R + 1.9 - 0.7)) < 1e-6);
  }
});

test('trees outside the ring band are ignored', () => {
  const list = layoutAnchors([...real, at(3.5, R + 9), at(-2, 2)], R);
  assert.equal(list.filter(p => !p.post).length, 7);
});

test('no trees gives eleven evenly spaced posts', () => {
  const list = layoutAnchors([], R);
  assert.equal(list.length, 11);
  assert.ok(list.every(p => p.post));
  assert.ok(Math.max(...gaps(list)) - Math.min(...gaps(list)) < 1e-6);
});

test('a full ring of eleven trees needs no posts and extra trees are dropped', () => {
  const full = Array.from({ length: 11 }, (_, i) => at((i / 11) * TAU - Math.PI + 0.01));
  assert.equal(layoutAnchors(full, R).filter(p => p.post).length, 0);
  const crowded = Array.from({ length: 14 }, (_, i) => at((i / 14) * TAU - Math.PI + 0.01));
  const list = layoutAnchors(crowded, R);
  assert.equal(list.length, 11);
  assert.equal(list.filter(p => p.post).length, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-string-layout.test.mjs`
Expected: FAIL, `Cannot find module '../js/glade/string-layout.js'`

- [ ] **Step 3: 구현**

`js/glade/string-layout.js`:
```js
const TAU = Math.PI * 2;
const INSET = 0.7, POST_OUT = 1.5, BAND_IN = 0.9, BAND_OUT = 3.2;

const spanTo = (a, b) => ((b - a) + TAU) % TAU || TAU;

export function layoutAnchors(trees, R, count = 11) {
  let ring = trees
    .map(p => ({ x: p.x, z: p.z, d: Math.hypot(p.x, p.z), a: Math.atan2(p.z, p.x) }))
    .filter(p => p.d > R + BAND_IN && p.d < R + BAND_OUT)
    .sort((p, q) => p.a - q.a);
  while (ring.length > count) {
    let drop = 0, tight = Infinity;
    ring.forEach((p, i) => { const s = spanTo(p.a, ring[(i + 1) % ring.length].a); if (s < tight) { tight = s; drop = i; } });
    ring = ring.filter((_, i) => i !== drop);
  }
  if (!ring.length) {
    return Array.from({ length: count }, (_, i) => {
      const a = -Math.PI + (i / count) * TAU;
      return { a, x: Math.cos(a) * (R + POST_OUT), z: Math.sin(a) * (R + POST_OUT), post: true };
    });
  }
  const gaps = ring.map((p, i) => ({ span: spanTo(p.a, ring[(i + 1) % ring.length].a), posts: 0 }));
  for (let need = count - ring.length; need > 0; need--) {
    const widest = gaps.reduce((m, g) => (g.span / (g.posts + 1) > m.span / (m.posts + 1) ? g : m));
    widest.posts += 1;
  }
  const out = [];
  ring.forEach((p, i) => {
    out.push({ a: p.a, x: p.x * (1 - INSET / p.d), z: p.z * (1 - INSET / p.d), post: false });
    for (let k = 1; k <= gaps[i].posts; k++) {
      const a = p.a + (gaps[i].span * k) / (gaps[i].posts + 1);
      out.push({ a, x: Math.cos(a) * (R + POST_OUT), z: Math.sin(a) * (R + POST_OUT), post: true });
    }
  });
  return out;
}
```

기둥 각도는 마지막 나무 뒤로 이어지므로 `a` 가 π 를 넘을 수 있다. 테스트의 "각도 오름차순"은 이 값 그대로 비교한다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/glade-string-layout.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: 커밋**

```bash
git add js/glade/string-layout.js tests/glade-string-layout.test.mjs
git commit -m "feat(glade): string light anchors from ring trees with posts in the gaps

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 4: 무리 규칙

**Files:**
- Create: `js/glade/swarm.js`
- Test: `tests/glade-swarm.test.mjs`

**Interfaces:**
- Produces: 상수 `KIDS = 4`, `LIFE_SEC = 45`, `LIT = 0.6`, `LEADER_BUGS = 2`, `PERFECT_BONUS = 2`, `FIRST_DELAY = [40, 70]`, `NEXT_DELAY = [90, 150]`
- `delay(range: [number, number], rnd: () => number): number`
- `createSwarm(kindId: string, now: number): Swarm` (`{ kindId, born, kids: boolean[4], combo, broken, caught, done }`, 얼린 객체)
- `nextKid(sw): number`(남은 꼬마 중 맨 뒤 인덱스, 없으면 -1), `kidsLeft(sw): number`, `expired(sw, now): boolean`, `kidBright(i: number, t: number): number`(0~1)
- `swingKid(sw, i, { bright, chanceLit, chanceDim, rnd }): { sw, hit: boolean, inTurn?: boolean, reason?: 'gone'|'miss' }`
- `swingLeader(sw, { bright, chanceLit, chanceDim, rnd }): { sw, hit: boolean, perfect?: boolean, reason?: 'guarded'|'miss' }`
- 꼬마 인덱스 0 이 큰 반디 바로 뒤, 3 이 맨 뒤(꼬리)다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/glade-swarm.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_DELAY, KIDS, LIFE_SEC, NEXT_DELAY, createSwarm, delay, expired, kidBright, kidsLeft, nextKid, swingKid, swingLeader } from '../js/glade/swarm.js';

const sure = { bright: 1, chanceLit: 1, chanceDim: 1, rnd: () => 0 };
const never = { bright: 1, chanceLit: 0, chanceDim: 0, rnd: () => 0.5 };

test('a new swarm has four kids and the tail goes first', () => {
  const sw = createSwarm('yellow', 10);
  assert.equal(kidsLeft(sw), KIDS);
  assert.equal(nextKid(sw), 3);
  assert.equal(sw.combo, 0);
  assert.ok(Object.isFrozen(sw));
});

test('catching kids from the tail builds the combo and a perfect finish', () => {
  let sw = createSwarm('yellow', 0);
  for (const i of [3, 2, 1, 0]) {
    const r = swingKid(sw, i, sure);
    assert.ok(r.hit && r.inTurn);
    sw = r.sw;
  }
  assert.equal(sw.combo, 4);
  assert.equal(kidsLeft(sw), 0);
  assert.equal(nextKid(sw), -1);
  const end = swingLeader(sw, sure);
  assert.ok(end.hit && end.perfect);
  assert.ok(end.sw.done);
  assert.equal(end.sw.caught, 5);
});

test('a kid out of turn is still caught but resets the combo and spoils the perfect', () => {
  let sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  const r = swingKid(sw, 0, sure);
  assert.ok(r.hit);
  assert.equal(r.inTurn, false);
  assert.equal(r.sw.combo, 0);
  sw = r.sw;
  for (const i of [2, 1]) sw = swingKid(sw, i, sure).sw;
  assert.equal(sw.combo, 2);
  const end = swingLeader(sw, sure);
  assert.ok(end.hit);
  assert.equal(end.perfect, false);
});

test('a miss keeps the swarm and the combo', () => {
  const sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  const r = swingKid(sw, 2, never);
  assert.equal(r.hit, false);
  assert.equal(r.reason, 'miss');
  assert.equal(r.sw, sw);
});

test('a kid already caught cannot be caught again', () => {
  const sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  assert.equal(swingKid(sw, 3, sure).reason, 'gone');
});

test('the leader is guarded while any kid is left', () => {
  const sw = createSwarm('yellow', 0);
  const r = swingLeader(sw, sure);
  assert.equal(r.hit, false);
  assert.equal(r.reason, 'guarded');
  assert.equal(r.sw, sw);
});

test('dim swings use the dim chance, lit swings use the lit chance', () => {
  const sw = createSwarm('yellow', 0);
  assert.equal(swingKid(sw, 3, { bright: 0.2, chanceLit: 1, chanceDim: 0, rnd: () => 0.5 }).hit, false);
  assert.equal(swingKid(sw, 3, { bright: 0.9, chanceLit: 1, chanceDim: 0, rnd: () => 0.5 }).hit, true);
});

test('a swarm expires after its life and delays stay in range', () => {
  const sw = createSwarm('yellow', 100);
  assert.equal(expired(sw, 100 + LIFE_SEC - 0.1), false);
  assert.equal(expired(sw, 100 + LIFE_SEC), true);
  assert.equal(delay(FIRST_DELAY, () => 0), 40);
  assert.equal(delay(FIRST_DELAY, () => 1), 70);
  assert.equal(delay(NEXT_DELAY, () => 0.5), 120);
});

test('kid brightness is between 0 and 1 and the tail peaks before the head', () => {
  let tail = -1, head = -1;
  for (let t = 0; t < 3; t += 0.01) {
    for (let i = 0; i < KIDS; i++) { const b = kidBright(i, t); assert.ok(b >= 0 && b <= 1); }
    if (tail < 0 && kidBright(3, t) > 0.95) tail = t;
    if (tail >= 0 && head < 0 && t > tail && kidBright(2, t) > 0.95) head = t;
  }
  assert.ok(tail >= 0 && head > tail);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-swarm.test.mjs`
Expected: FAIL, `Cannot find module '../js/glade/swarm.js'`

- [ ] **Step 3: 구현**

`js/glade/swarm.js`:
```js
export const KIDS = 4;
export const LIFE_SEC = 45;
export const LIT = 0.6;
export const LEADER_BUGS = 2;
export const PERFECT_BONUS = 2;
export const FIRST_DELAY = Object.freeze([40, 70]);
export const NEXT_DELAY = Object.freeze([90, 150]);
const BLINK_SPEED = 2.4, BLINK_GAP = 1.0;

export const delay = ([a, b], rnd) => a + (b - a) * rnd();

export function createSwarm(kindId, now) {
  return Object.freeze({ kindId, born: now, kids: Object.freeze(Array(KIDS).fill(true)), combo: 0, broken: false, caught: 0, done: false });
}

export const nextKid = (sw) => sw.kids.lastIndexOf(true);
export const kidsLeft = (sw) => sw.kids.filter(Boolean).length;
export const expired = (sw, now) => now - sw.born >= LIFE_SEC;
export const kidBright = (i, t) => Math.max(0, Math.sin(t * BLINK_SPEED - (KIDS - 1 - i) * BLINK_GAP)) ** 2;

const lands = ({ bright, chanceLit, chanceDim, rnd }) => rnd() < (bright > LIT ? chanceLit : chanceDim);

export function swingKid(sw, i, odds) {
  if (!sw.kids[i]) return { sw, hit: false, reason: 'gone' };
  if (!lands(odds)) return { sw, hit: false, reason: 'miss' };
  const inTurn = i === nextKid(sw);
  return {
    sw: Object.freeze({ ...sw, kids: Object.freeze(sw.kids.map((k, j) => (j === i ? false : k))), combo: inTurn ? sw.combo + 1 : 0, broken: sw.broken || !inTurn, caught: sw.caught + 1 }),
    hit: true,
    inTurn,
  };
}

export function swingLeader(sw, odds) {
  if (kidsLeft(sw) > 0) return { sw, hit: false, reason: 'guarded' };
  if (!lands(odds)) return { sw, hit: false, reason: 'miss' };
  return { sw: Object.freeze({ ...sw, done: true, caught: sw.caught + 1 }), hit: true, perfect: !sw.broken && sw.combo === KIDS };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/glade-swarm.test.mjs`
Expected: PASS, 9 tests

- [ ] **Step 5: 커밋**

```bash
git add js/glade/swarm.js tests/glade-swarm.test.mjs
git commit -m "feat(glade): leader-and-kids swarm rules with in-turn combo

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 5: 문구와 영어

**Files:**
- Create: `js/glade/copy.js`
- Modify: `js/i18n-en.js` (사전 객체 `EN` 안, `'밤의 수집가': 'Night Collector',` 줄 바로 아래에 추가)
- Modify: `js/data/dex.js` (`BADGES` 의 `night_owl` 줄 바로 아래)
- Test: `tests/glade-copy.test.mjs`

**Interfaces:**
- Produces: `NIGHT_BANNER: { stream, low }`, `MONO_BANNER: Record<kindId, { title, line }>`(무지개 제외 7종), `stringBanner(step, total, next): { title, line }`, `SWARM_BANNER: { title, line }`, `catchText(ico, name, bugs): string`, `comboText(ico, name, n, max): string`, `perfectText(ico, name, bugs): string`
- 배지 id `glade_ring`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/glade-copy.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MONO_BANNER, NIGHT_BANNER, SWARM_BANNER, catchText, comboText, perfectText, stringBanner } from '../js/glade/copy.js';

const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
const dex = readFileSync(new URL('../js/data/dex.js', import.meta.url), 'utf8');
const all = [
  ...Object.values(NIGHT_BANNER), ...Object.values(MONO_BANNER), SWARM_BANNER,
].flatMap(c => [c.title, c.line]);

test('mono banners cover every kind except rainbow', () => {
  assert.deepEqual(Object.keys(MONO_BANNER).sort(), ['amber', 'blue', 'ember', 'frost', 'green', 'petal', 'yellow']);
});

test('new copy avoids the em dash and the banned verb', () => {
  const made = [stringBanner(3, 15, 25), stringBanner(11, 240, null)].flatMap(c => [c.title, c.line]);
  for (const s of [...all, ...made, catchText('🟡', '노랑반디', 2), comboText('🟡', '노랑반디', 2, 4), perfectText('🟡', '노랑반디', 4)]) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀아|놀다|놀러/.test(s), s);
  }
});

test('every fixed line has an English entry', () => {
  for (const s of all) assert.ok(en.includes(`'${s}'`), s);
});

test('composed lines have English patterns', () => {
  for (const key of ['줄등 {0}번째 칸이 켜졌어요', '지금까지 {0}마리, 다음 칸은 {1}마리', '줄등이 계곡을 한 바퀴 둘렀어요', '+{0} {1} {2} · 연속 {3}/{4}', '+{0} {1} {2} · 차례를 다 지켰어요', '계곡을 밝힌 이', '줄등을 한 바퀴 다 잇기']) {
    assert.ok(en.includes(`'${key}'`), key);
  }
});

test('string banner shows the next goal or the finish line', () => {
  assert.deepEqual(stringBanner(3, 15, 25), { title: '줄등 3번째 칸이 켜졌어요', line: '지금까지 15마리, 다음 칸은 25마리' });
  assert.equal(stringBanner(11, 240, null).line, '줄등이 계곡을 한 바퀴 둘렀어요');
});

test('catch texts keep the existing +n icon name shape', () => {
  assert.equal(catchText('🟡', '노랑반디', 1), '+1 🟡 노랑반디');
  assert.equal(comboText('🟡', '노랑반디', 2, 4), '+1 🟡 노랑반디 · 연속 2/4');
  assert.equal(perfectText('🟡', '노랑반디', 4), '+4 🟡 노랑반디 · 차례를 다 지켰어요');
});

test('the ring badge exists', () => {
  assert.match(dex, /id: 'glade_ring'/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-copy.test.mjs`
Expected: FAIL, `Cannot find module '../js/glade/copy.js'`

- [ ] **Step 3: 구현**

`js/glade/copy.js`:
```js
export const NIGHT_BANNER = Object.freeze({
  stream: { title: '무리 지어 도는 밤', line: '반디들이 한 줄기로 돌아요. 길목에서 기다려 보세요' },
  low: { title: '낮게 내려앉은 밤', line: '반디가 낮고 느리게 날아요. 잡기 쉬운 밤이에요' },
});

export const MONO_BANNER = Object.freeze({
  yellow: { title: '노랑빛 밤', line: '오늘 밤은 노랑반디가 가득해요' },
  blue: { title: '푸른빛 밤', line: '오늘 밤은 푸른반디가 가득해요' },
  green: { title: '초록빛 밤', line: '오늘 밤은 초록반디가 가득해요' },
  petal: { title: '꽃잎빛 밤', line: '오늘 밤은 꽃잎반디가 가득해요' },
  ember: { title: '불씨빛 밤', line: '오늘 밤은 불씨반디가 가득해요' },
  amber: { title: '단풍빛 밤', line: '오늘 밤은 단풍반디가 가득해요' },
  frost: { title: '눈꽃빛 밤', line: '오늘 밤은 눈꽃반디가 가득해요' },
});

export const SWARM_BANNER = Object.freeze({ title: '큰 반디가 꼬마들을 데리고 왔어요', line: '맨 뒤 꼬마부터 밝아질 때 차례로 잡아 보세요' });

export const stringBanner = (step, total, next) => ({
  title: `줄등 ${step}번째 칸이 켜졌어요`,
  line: next ? `지금까지 ${total}마리, 다음 칸은 ${next}마리` : '줄등이 계곡을 한 바퀴 둘렀어요',
});

export const catchText = (ico, name, bugs) => `+${bugs} ${ico} ${name}`;
export const comboText = (ico, name, n, max) => `+1 ${ico} ${name} · 연속 ${n}/${max}`;
export const perfectText = (ico, name, bugs) => `+${bugs} ${ico} ${name} · 차례를 다 지켰어요`;
```

`js/data/dex.js`, `night_owl` 줄 아래에 한 줄:
```js
  { id: 'glade_ring',  name: '계곡을 밝힌 이',  ico: '🏮', desc: '줄등을 한 바퀴 다 잇기',   reward: { coins: 60 } },
```

`js/i18n-en.js`, `'밤의 수집가': 'Night Collector',` 줄 아래에:
```js
  '계곡을 밝힌 이': 'Glade Lamplighter',
  '줄등을 한 바퀴 다 잇기': 'Link the string lights all the way around',
  '무리 지어 도는 밤': 'A night of drifting swarms',
  '반디들이 한 줄기로 돌아요. 길목에서 기다려 보세요': 'The fireflies circle in one stream. Wait along their path',
  '낮게 내려앉은 밤': 'A low, quiet night',
  '반디가 낮고 느리게 날아요. 잡기 쉬운 밤이에요': 'The fireflies fly low and slow. An easy night for catching',
  '노랑빛 밤': 'A yellow night', '오늘 밤은 노랑반디가 가득해요': 'Yellow fireflies fill the glade tonight',
  '푸른빛 밤': 'A blue night', '오늘 밤은 푸른반디가 가득해요': 'Blue fireflies fill the glade tonight',
  '초록빛 밤': 'A green night', '오늘 밤은 초록반디가 가득해요': 'Green fireflies fill the glade tonight',
  '꽃잎빛 밤': 'A petal night', '오늘 밤은 꽃잎반디가 가득해요': 'Petal fireflies fill the glade tonight',
  '불씨빛 밤': 'An ember night', '오늘 밤은 불씨반디가 가득해요': 'Ember fireflies fill the glade tonight',
  '단풍빛 밤': 'A maple night', '오늘 밤은 단풍반디가 가득해요': 'Maple fireflies fill the glade tonight',
  '눈꽃빛 밤': 'A snowflake night', '오늘 밤은 눈꽃반디가 가득해요': 'Snowflake fireflies fill the glade tonight',
  '큰 반디가 꼬마들을 데리고 왔어요': 'A big firefly arrived with its little ones',
  '맨 뒤 꼬마부터 밝아질 때 차례로 잡아 보세요': 'Catch the little ones in order from the tail as each one lights up',
  '줄등 {0}번째 칸이 켜졌어요': 'String light section {0} is lit',
  '지금까지 {0}마리, 다음 칸은 {1}마리': '{0} caught so far, next section at {1}',
  '줄등이 계곡을 한 바퀴 둘렀어요': 'The string lights now circle the whole glade',
  '+{0} {1} {2} · 연속 {3}/{4}': '+{0} {1} {2} · streak {3}/{4}',
  '+{0} {1} {2} · 차례를 다 지켰어요': '+{0} {1} {2} · perfect order',
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/glade-copy.test.mjs && node scripts/i18n_check.mjs 2>&1 | tail -5 && npm test 2>&1 | tail -6`
Expected: glade-copy PASS 7 tests, 전체 `# fail 0`. 배지 수를 세는 기존 테스트가 실패하면 그 테스트의 기대 수를 1 올리고, 올린 사실을 커밋 메시지에 적는다.

- [ ] **Step 5: 커밋**

```bash
git add js/glade/copy.js js/i18n-en.js js/data/dex.js tests/glade-copy.test.mjs
git commit -m "feat(glade): copy, English entries and the string ring badge

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 6: 오늘 밤의 빛 연결

**Files:**
- Modify: `js/spaces/glade.js`
- Create: `tests/glade-wiring.test.mjs`
- Create: `dev/active/glade-develop/verify/impl-shots.mjs`

**Interfaces:**
- Consumes: Task 1 의 `NIGHT_KINDS`, `TUNE`, `monoKind`, `nightKind`, `pickKindId`, `streamPoint`. Task 5 의 `NIGHT_BANNER`, `MONO_BANNER`.
- Produces: `nightNow(): { key: string, kind: string, monoId: string|null, tune: object }`(glade.js export), 개발 주소 인자 `?gnight=plain|stream|mono|low`(localhost 에서만).

- [ ] **Step 1: 실패하는 연결 테스트 작성**

`tests/glade-wiring.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/spaces/glade.js', import.meta.url), 'utf8');

test('glade reads the night rules and reports the night kind on catches', () => {
  assert.match(src, /from '\.\.\/glade\/night\.js'/);
  assert.match(src, /nightNow\(\)\.tune\.dimChance/);
  assert.match(src, /mode: nightNow\(\)\.kind/);
  assert.match(src, /gladeNightSeen/);
});

test('dev overrides only work on a local host', () => {
  assert.match(src, /localhost\|127\\\.0\\\.0\\\.1/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-wiring.test.mjs`
Expected: FAIL, 첫 테스트의 `from '../glade/night.js'` 불일치

- [ ] **Step 3: `js/spaces/glade.js` 수정**

(a) `'../game.js'` import 목록에 `SEASON`, `requestSave`, `todayStr` 를 알파벳 순서 자리에 더한다.

(b) `import { rollKind } from '../dex-gates.js';` 줄을 아래로 바꾸고 두 줄을 더한다.
```js
import { gateOf, gateOpen, rollKind } from '../dex-gates.js';
import { NIGHT_KINDS, TUNE, monoKind, nightKind, pickKindId, streamPoint } from '../glade/night.js';
import { MONO_BANNER, NIGHT_BANNER } from '../glade/copy.js';
```

(c) import 블록 바로 아래에 추가.
```js
const devQuery = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) ? new URLSearchParams(location.search) : new URLSearchParams();
let gladeNight = null;
let nightBannerDay = '';

export function nightNow() {
  if (gladeNight) return gladeNight;
  const key = todayStr();
  const forced = devQuery.get('gnight');
  const kind = NIGHT_KINDS.includes(forced) ? forced : nightKind(key);
  const open = BUG_KINDS.map(k => k.id).filter(id => gateOpen(gateOf('bug', id), { weather: 'clear', season: SEASON, night: true }));
  gladeNight = { key, kind, monoId: kind === 'mono' ? monoKind(key, open) : null, tune: TUNE[kind] };
  return gladeNight;
}

function announceNight(now) {
  if (now.kind === 'plain' || nightBannerDay === now.key) return;
  if (gameState.hintsSeen?.gladeNightSeen === now.key) { nightBannerDay = now.key; return; }
  if (dist2D(GLADE, player.position) > GLADE_R + 0.5 || ui.coachActive?.()) return;
  const copy = now.kind === 'mono' ? MONO_BANNER[now.monoId] : NIGHT_BANNER[now.kind];
  nightBannerDay = now.key;
  if (!copy) return;
  ui.showHintBanner?.({
    ico: '🌙', title: copy.title, line: copy.line, kind: 'place', key: 'glade-night',
    near: () => dist2D(GLADE, player.position) < GLADE_R + 3,
    burn: () => { gameState.hintsSeen = { ...gameState.hintsSeen, gladeNightSeen: now.key }; requestSave(); },
  });
}
```

(d) `rollBugKind` 전체를 교체.
```js
export function rollBugKind() {
  const rnd = (WEATHER === 'rain' || WEATHER === 'fog')
    ? () => Math.min(Math.random(), Math.random())
    : Math.random;
  const night = nightNow();
  const id = pickKindId(night.kind, night.monoId, Math.random, () => rollKind(BUG_KINDS, 'bug', situation(), rnd).id);
  return BUG_KINDS.find(k => k.id === id);
}
```

(e) `makeFirefly` 의 `g.userData = { … }` 안 `flee: 0,` 줄 아래에 `su: Math.random() * Math.PI * 2,` 한 줄을 더한다.

(f) `retargetFirefly` 전체를 교체.
```js
export function retargetFirefly(bug) {
  const u = bug.userData, tune = nightNow().tune;
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 0.8);
  u.tx = Math.cos(a) * r; u.tz = Math.sin(a) * r; u.ty = tune.yMin + Math.random() * (tune.yMax - tune.yMin);
}
```

(g) `spawnFirefly` 의 `bug.position.set(...)` 줄을 교체.
```js
  const tune = nightNow().tune;
  bug.position.set(Math.cos(a) * r, tune.yMin + Math.random() * (tune.yMax - tune.yMin), Math.sin(a) * r);
```

(h) `updateFireflyBugs` 에서 세 곳을 고친다.

낮 분기(`if (!night || !isOpen('glade')) {`) 안, `return;` 바로 위에 `gladeNight = null;` 을 더한다.

보충 블록을 교체.
```js
  const now = nightNow(), tune = now.tune, stream = now.kind === 'stream';
  announceNight(now);
  if (t >= bugRespawnAt && gladeBugs.length < GLADE_MAX) {
    spawnFirefly();
    $w.bugRespawnAt = t + (1.2 + Math.random() * 2.4) * tune.respawn;
  }
```

개체 루프 안의 도망·이동 부분(`if (pd < 1.5 && u.flee <= 0) { u.flee = 0.9; }` 부터 `if (td < 0.25 && u.flee <= 0) retargetFirefly(bug);` 까지)을 교체.
```js
    if (pd < tune.fleeDist && u.flee <= 0) { u.flee = 0.9; }
    let sp = tune.speed;
    if (stream) {
      u.su += dt * (u.flee > 0 ? 1.1 : 0.35);
      const p = streamPoint(u.su, GLADE_R - 0.8);
      u.tx = p.x; u.tz = p.z; sp = u.flee > 0 ? 2.6 : 1.4;
      if (u.flee > 0) u.flee -= dt;
    } else if (u.flee > 0) {
      u.flee -= dt; sp = 2.3;
      const k = pd || 0.001;
      u.tx = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plx + (dx / k) * 3.4));
      u.tz = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plz + (dz / k) * 3.4));
    }
    const tdx = u.tx - bug.position.x, tdz = u.tz - bug.position.z, tdy = u.ty - bug.position.y;
    const td = Math.hypot(tdx, tdz);
    if (td < 0.25 && u.flee <= 0 && !stream) retargetFirefly(bug);
```
그 아래 `else { bug.position.x += … }` 블록과 높이 줄은 그대로 둔다.

(i) `tryNet` 에서 두 곳.
```js
  const base = bright > 0.6 ? 0.9 : nightNow().tune.dimChance;
```
```js
  trackEvent('firefly_catch', { kind: kind.id, weather: WEATHER, night: Math.round(nightLevel * 100), mode: nightNow().kind });
```

- [ ] **Step 4: 캡처 도구 작성**

`dev/active/glade-develop/verify/impl-shots.mjs`:
```js
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../../sims/glade-develop/impl');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const BASE_Q = '?dbg=1&weather=clear&time=0.9&house=6&unlocks=off&spawn=7.2,29.2';
for (const name of process.argv.slice(3)) {
  const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
  await h.enterGame((name.includes('time=') ? BASE_Q.replace('&time=0.9', '') : BASE_Q) + '&' + name);
  await h.b.sleep(name.includes('gswarm') ? 9000 : 14000);
  await h.dismiss(4);
  const info = await h.ev(`(async () => { const g = await import('/js/game.js'); return JSON.stringify({ calls: g.renderer.info.render.calls, bugs: g.gladeBugs.length, caught: g.gameState.hintsSeen.gladeCaught | 0 }); })()`);
  console.log(name, info);
  await h.b.shot(path.join(OUT, `${dev}-${name.replace(/[^a-z0-9]+/gi, '_')}.png`));
  await h.close();
}
process.exit(0);
```

- [ ] **Step 5: 테스트와 화면 확인**

Run: `npm test 2>&1 | tail -6`
Expected: `# fail 0`

미리보기 서버(`glade-develop`, 포트 8931)가 떠 있는지 먼저 본다: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8931/` 가 200.

```bash
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs pc gnight=plain gnight=stream gnight=mono gnight=low
```
캡처 네 장(`sims/glade-develop/impl/pc-gnight_*.png`)을 직접 열어 본다. 확인할 것: `stream` 은 반디가 8자 줄기로 늘어섬, `mono` 는 한 색이 대부분, `low` 는 반디가 무릎 높이, 특별한 밤 세 장에는 배너가 떠 있음, `plain` 에는 배너 없음. 네 장의 파일 크기가 모두 같으면 화면이 멈춘 것이니 서버와 하네스를 다시 본다.

- [ ] **Step 6: 커밋**

```bash
git add js/spaces/glade.js tests/glade-wiring.test.mjs dev/active/glade-develop/verify/impl-shots.mjs sims/glade-develop/impl
git commit -m "feat(glade): tonight's light changes how fireflies fly by date

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 7: 병등 줄 조형과 연결

**Files:**
- Create: `js/glade/string-art.js`
- Modify: `js/spaces/glade.js`
- Modify: `tests/glade-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 2 의 `JARS_PER_SEG`, `SEG_COINS`, `THRESHOLDS`, `addCatch`, `nextThreshold`, `segmentsLit`, `stringColors`. Task 3 의 `layoutAnchors`. Task 5 의 `stringBanner`, 배지 `glade_ring`.
- Produces: `buildString({ group, anchors, clayMat, mergeGeos }): { core, halo, jarPos: THREE.Vector3[], n: number }`, `refreshString(art, colors: (number[]|undefined)[], night: boolean): void`. glade.js 안의 `noteCatch(kind)`(Task 8 이 쓴다), 개발 주소 인자 `?gcaught=N`.

- [ ] **Step 1: 실패하는 연결 테스트 추가**

`tests/glade-wiring.test.mjs` 끝에 추가:
```js
test('glade builds the string lights and counts every catch into them', () => {
  assert.match(src, /from '\.\.\/glade\/string-art\.js'/);
  assert.match(src, /layoutAnchors\(/);
  assert.match(src, /function noteCatch\(/);
  assert.match(src, /awardBadge\('glade_ring'\)/);
  assert.match(src, /trackEvent\('glade_string', \{ step: /);
});

test('string progress is saved only inside hintsSeen', () => {
  assert.match(src, /gladeCaught: r\.caught, gladeSeg: r\.seg, gladeString: r\.string/);
  assert.doesNotMatch(src, /gameState\.glade/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-wiring.test.mjs`
Expected: FAIL, `from '../glade/string-art.js'` 불일치

- [ ] **Step 3: 조형 모듈 작성**

`js/glade/string-art.js`:
```js
import * as THREE from 'three';
import { JARS_PER_SEG } from './string.js';

const ANCHOR_Y = 2.5, SAG = 0.5, JAR_DROP = 0.37, DARK = 0x2a2622;

function segCurve(p, q) {
  const pts = [];
  for (let s = 0; s <= 12; s++) {
    const u = s / 12;
    pts.push(new THREE.Vector3(p.x + (q.x - p.x) * u, ANCHOR_Y - SAG * 4 * u * (1 - u), p.z + (q.z - p.z) * u));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function instanced(geo, mat, places) {
  const mesh = new THREE.InstancedMesh(geo, mat, places.length);
  const m = new THREE.Matrix4();
  places.forEach((p, i) => mesh.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

export function buildString({ group, anchors, clayMat, mergeGeos }) {
  const wood = clayMat(0x8a6a4a);
  const poles = anchors.filter(a => a.post);
  if (poles.length) {
    group.add(instanced(new THREE.CylinderGeometry(0.07, 0.1, ANCHOR_Y + 0.1, 7), wood, poles.map(p => ({ x: p.x, y: (ANCHOR_Y + 0.1) / 2, z: p.z }))));
    group.add(instanced(new THREE.SphereGeometry(0.12, 8, 6), clayMat(0xa5835c), poles.map(p => ({ x: p.x, y: ANCHOR_Y + 0.14, z: p.z }))));
  }
  const ropes = [], jarPos = [];
  anchors.forEach((p, i) => {
    const c = segCurve(p, anchors[(i + 1) % anchors.length]);
    ropes.push(new THREE.TubeGeometry(c, 12, 0.022, 5));
    for (let s = 1; s <= JARS_PER_SEG; s++) jarPos.push(c.getPoint(s / (JARS_PER_SEG + 1)));
  });
  group.add(new THREE.Mesh(mergeGeos(ropes), clayMat(0x6b5236)));
  const at = (dy) => jarPos.map(p => ({ x: p.x, y: p.y - dy, z: p.z }));
  group.add(instanced(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), clayMat(0x5a4632), at(0.1)));
  group.add(instanced(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), wood, at(0.22)));
  group.add(instanced(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0xdff5ff, transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false }), at(JAR_DROP)));
  const core = instanced(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), at(JAR_DROP));
  const halo = instanced(new THREE.SphereGeometry(0.26, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), at(JAR_DROP));
  group.add(core, halo);
  return { core, halo, jarPos, n: jarPos.length };
}

export function refreshString(art, colors, night) {
  const c = new THREE.Color(), m = new THREE.Matrix4();
  for (let i = 0; i < art.n; i++) {
    const hex = colors[Math.floor(i / JARS_PER_SEG)]?.[i % JARS_PER_SEG];
    const on = hex !== undefined && night;
    art.core.setColorAt(i, hex === undefined ? c.set(DARK) : c.set(hex).multiplyScalar(night ? 1 : 0.4));
    art.halo.setColorAt(i, c.set(on ? hex : 0x000000));
    const p = art.jarPos[i], k = on ? 1 : 0.001;
    art.halo.setMatrixAt(i, m.makeScale(k, k, k).setPosition(p.x, p.y - JAR_DROP, p.z));
  }
  art.core.instanceColor.needsUpdate = true;
  art.halo.instanceColor.needsUpdate = true;
  art.halo.instanceMatrix.needsUpdate = true;
}
```

- [ ] **Step 4: `js/spaces/glade.js` 수정**

(a) `'../game.js'` import 목록에 `awardBadge`, `giveReward`, `mergeGeos`, `trees` 를 더한다.

(b) import 를 더한다.
```js
import { JARS_PER_SEG, SEG_COINS, THRESHOLDS, addCatch, nextThreshold, segmentsLit, stringColors } from '../glade/string.js';
import { layoutAnchors } from '../glade/string-layout.js';
import { buildString, refreshString } from '../glade/string-art.js';
```
Task 6 에서 넣은 copy import 를 `import { MONO_BANNER, NIGHT_BANNER, stringBanner } from '../glade/copy.js';` 로 바꾼다.

(c) `let nightBannerDay = '';` 아래에 추가.
```js
let stringArt = null, stringNight = null, stringCaught = -1, devApplied = false;
const FALLBACK_COLOR = 0xfff2a8;

function paintString(night) {
  if (!stringArt) return;
  const caught = gameState.hintsSeen?.gladeCaught | 0;
  const lit = segmentsLit(caught);
  const colors = stringColors(gameState.hintsSeen?.gladeString).map(seg => seg.map(id => BUG_KINDS.find(k => k.id === id)?.color ?? FALLBACK_COLOR));
  while (colors.length < lit) colors.push(Array(JARS_PER_SEG).fill(FALLBACK_COLOR));
  refreshString(stringArt, colors.slice(0, lit), night);
  stringNight = night; stringCaught = caught;
}

function applyDev() {
  if (devApplied) return;
  devApplied = true;
  const n = parseInt(devQuery.get('gcaught'), 10);
  if (!Number.isFinite(n)) return;
  let s = { caught: 0, seg: '', string: '' };
  for (let i = 0; i < n; i++) s = addCatch(s, ['yellow', 'yellow', 'blue', 'green'][i % 4]);
  gameState.hintsSeen = { ...gameState.hintsSeen, gladeCaught: s.caught, gladeSeg: s.seg, gladeString: s.string };
}

function sparkleSegment(seg) {
  if (!stringArt) return;
  for (let j = 0; j < JARS_PER_SEG; j++) {
    const p = stringArt.jarPos[seg * JARS_PER_SEG + j];
    if (p) setTimeout(() => spawnSparkle(GLADE.x + p.x, p.y - 0.37, GLADE.z + p.z, 10), j * 180);
  }
}

function noteCatch(kind) {
  const h = gameState.hintsSeen || {};
  const r = addCatch({ caught: h.gladeCaught, seg: h.gladeSeg, string: h.gladeString }, kind.id);
  gameState.hintsSeen = { ...h, gladeCaught: r.caught, gladeSeg: r.seg, gladeString: r.string };
  if (!r.lit) return;
  const coins = SEG_COINS[r.lit - 1];
  if (coins) giveReward({ coins }, 'glade_string', String(r.lit));
  if (r.lit === THRESHOLDS.length) awardBadge('glade_ring');
  const copy = stringBanner(r.lit, r.caught, nextThreshold(r.caught));
  ui.showHintBanner?.({ ico: '🏮', title: copy.title, line: copy.line, kind: 'misc', key: 'glade-string-' + r.lit });
  trackEvent('glade_string', { step: r.lit, total: r.caught });
  sparkleSegment(r.lit - 1);
  requestSave();
}
```

(d) `buildGlade` 의 마지막 줄(`obstacles.push({ x: GLADE.x, z: GLADE.z, r: GLADE_R });`) 아래에 추가.
```js
  const ringTrees = trees.map(t => ({ x: t.position.x - GLADE.x, z: t.position.z - GLADE.z }));
  stringArt = buildString({ group: gladeGroup, anchors: layoutAnchors(ringTrees, GLADE_R), clayMat, mergeGeos });
```

(e) `updateFireflyBugs` 의 `gladeGroup.visible = …` 줄 바로 아래(낮 분기보다 위)에 추가.
```js
  applyDev();
  if (stringNight !== night || stringCaught !== (gameState.hintsSeen?.gladeCaught | 0)) paintString(night);
```

(f) `tryNet` 의 성공 처리에서 `questEvent('catch');` 줄 바로 아래에 `noteCatch(kind);` 한 줄을 더한다.

- [ ] **Step 5: 테스트와 화면 확인**

Run: `npm test 2>&1 | tail -6`
Expected: `# fail 0`

```bash
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs pc gnight=plain\&gcaught=0 gnight=plain\&gcaught=60 gnight=plain\&gcaught=240
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs phone gnight=plain\&gcaught=240
```
캡처를 직접 열어 본다. 확인할 것: 0 은 줄과 꺼진 병만, 60 은 6칸(병등 24개)이 켜짐, 240 은 한 바퀴 다 켜짐, 기둥 4개가 북·서쪽에 서 있음, 줄이 카페·무대 앞을 가리는 정도. 출력된 `calls`(드로우콜) 세 값을 기록하고, Task 6 의 `gnight=plain` 값과의 차이를 `dev/active/glade-develop/glade-develop-context.md` 에 적는다. 차이가 12 를 넘으면 멈추고 사용자에게 알린다(예상: 기둥 2 + 줄 1 + 병 5 = 8).

낮 화면도 한 장 확인한다. 주소 인자에 `time=` 이 있으면 캡처 도구가 기본 밤 시간(`time=0.9`)을 빼고 그 값을 쓴다.
```bash
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs pc gcaught=240\&time=0.5
```
낮에는 병이 걸려 있고 불빛 번짐이 없어야 한다.

- [ ] **Step 6: 커밋**

```bash
git add js/glade/string-art.js js/spaces/glade.js tests/glade-wiring.test.mjs sims/glade-develop/impl dev/active/glade-develop/glade-develop-context.md
git commit -m "feat(glade): jar string lights that light up with lifetime catches

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 8: 무리 잡기 조형과 연결

**Files:**
- Create: `js/glade/swarm-art.js`
- Modify: `js/spaces/glade.js`
- Modify: `tests/glade-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 4 의 `FIRST_DELAY`, `KIDS`, `LEADER_BUGS`, `NEXT_DELAY`, `PERFECT_BONUS`, `createSwarm`, `delay`, `expired`, `kidBright`, `kidsLeft`, `swingKid`, `swingLeader`. Task 5 의 `SWARM_BANNER`, `catchText`, `comboText`, `perfectText`. Task 7 의 `noteCatch(kind)`.
- Produces: `makeLeader(color: number, clayMat): THREE.Group`, `setLeaderGlow(group, b: number): void`. 개발 주소 인자 `?gswarm=1`(첫 무리 3초 뒤).

- [ ] **Step 1: 실패하는 연결 테스트 추가**

`tests/glade-wiring.test.mjs` 끝에 추가:
```js
test('glade runs the swarm and reports how it ended', () => {
  assert.match(src, /from '\.\.\/glade\/swarm\.js'/);
  assert.match(src, /from '\.\.\/glade\/swarm-art\.js'/);
  assert.match(src, /trackEvent\('firefly_swarm', \{ result, combo: swarm\.combo, caught: swarm\.caught, mode: nightNow\(\)\.kind \}\)/);
  assert.match(src, /gladeSwarmSeen/);
});

test('regular fireflies pause while a swarm is out', () => {
  assert.match(src, /gladeBugs\.length < GLADE_MAX && !swarm/);
});

test('new events stay within five parameters', () => {
  for (const m of src.matchAll(/trackEvent\('(glade_string|firefly_swarm)', \{([^}]*)\}/g)) assert.ok(m[2].split(',').length <= 5, m[1]);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/glade-wiring.test.mjs`
Expected: FAIL, `from '../glade/swarm.js'` 불일치

- [ ] **Step 3: 큰 반디 조형 작성**

`js/glade/swarm-art.js`:
```js
import * as THREE from 'three';

export function makeLeader(color, clayMat) {
  const g = new THREE.Group();
  const dark = clayMat(0x5a4030);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), dark);
  head.position.z = -0.28;
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }));
  tail.position.z = 0.14;
  const wingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), wingMat);
  wingL.scale.set(1, 0.08, 0.6); wingL.position.set(-0.28, 0.2, -0.07); wingL.rotation.z = 0.6;
  const wingR = wingL.clone();
  wingR.position.x = 0.28; wingR.rotation.z = -0.6;
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  g.add(head, tail, wingL, wingR, halo);
  g.userData = { tail, halo };
  return g;
}

export function setLeaderGlow(g, b) {
  g.userData.tail.material.opacity = 0.35 + b * 0.65;
  g.userData.halo.material.opacity = 0.06 + b * 0.3;
  g.userData.halo.scale.setScalar(0.8 + b * 0.5);
}
```

- [ ] **Step 4: `js/spaces/glade.js` 수정**

(a) import 를 더한다. copy import 는 `import { MONO_BANNER, NIGHT_BANNER, SWARM_BANNER, catchText, comboText, perfectText, stringBanner } from '../glade/copy.js';` 로 바꾼다.
```js
import { FIRST_DELAY, KIDS, LEADER_BUGS, NEXT_DELAY, PERFECT_BONUS, createSwarm, delay, expired, kidBright, kidsLeft, swingKid, swingLeader } from '../glade/swarm.js';
import { makeLeader, setLeaderGlow } from '../glade/swarm-art.js';
```

(b) `noteCatch` 아래에 추가.
```js
let swarm = null, swarmObjs = null, swarmAt = 0, swarmBoost = 0;
const swarmPath = (u) => ({ x: 2.6 * Math.sin(u), y: 1.5 + 0.28 * Math.sin(2 * u), z: 1.6 * Math.cos(u) });
const leaderBright = (t) => (kidsLeft(swarm) ? 0 : 0.5 + 0.5 * Math.sin(t * 2.6));

function catchBugs(kind, bugs, wx, wz, text) {
  gameState.inventory.bug = (gameState.inventory.bug || 0) + bugs;
  refreshInventoryUI();
  Sound.harvest();
  spawnFloatText(wx, 1.4, wz, text, '#c98a2a');
  spawnSparkle(wx, 1.2, wz, kind.id === 'yellow' ? 12 : 20);
  for (let i = 0; i < bugs; i++) { questEvent('catch'); noteCatch(kind); }
  dexDiscover('bug', kind.id);
  if (kind.id === 'rainbow') tryUnlockDrop(0.5);
  trackEvent('firefly_catch', { kind: kind.id, weather: WEATHER, night: Math.round(nightLevel * 100), mode: nightNow().kind });
  onPlay('firefly');
}

function endSwarm(t, result) {
  if (!swarm) return;
  trackEvent('firefly_swarm', { result, combo: swarm.combo, caught: swarm.caught, mode: nightNow().kind });
  for (const o of [swarmObjs.leader, ...swarmObjs.kids]) gladeGroup.remove(o);
  swarm = null; swarmObjs = null;
  swarmAt = t + delay(NEXT_DELAY, Math.random);
}

function startSwarm(t) {
  const kind = rollBugKind();
  swarm = createSwarm(kind.id, t);
  const leader = makeLeader(kind.color, clayMat);
  const kids = Array.from({ length: KIDS }, () => makeFirefly(kind));
  for (const o of [leader, ...kids]) gladeGroup.add(o);
  swarmObjs = { leader, kids, kind, su: 0 };
  if (gameState.hintsSeen?.gladeSwarmSeen) return;
  ui.showHintBanner?.({
    ico: '✨', title: SWARM_BANNER.title, line: SWARM_BANNER.line, kind: 'misc', key: 'glade-swarm',
    burn: () => { gameState.hintsSeen = { ...gameState.hintsSeen, gladeSwarmSeen: true }; requestSave(); },
  });
}

function updateSwarm(dt, t) {
  const away = dist2D(GLADE, player.position);
  if (!swarm) {
    if (away > GLADE_R + 0.5) return;
    if (!swarmAt) swarmAt = t + (devQuery.has('gswarm') ? 3 : delay(FIRST_DELAY, Math.random));
    if (t >= swarmAt) startSwarm(t);
    return;
  }
  if (expired(swarm, t)) { endSwarm(t, 'timeout'); return; }
  if (away > GLADE_R + 4) { endSwarm(t, 'left'); return; }
  swarmBoost = Math.max(0, swarmBoost - dt);
  swarmObjs.su += dt * (swarmBoost > 0 ? 1.3 : 0.55);
  const fade = Math.min(1, (nightLevel - NIGHT_MIN) / 0.2);
  const lp = swarmPath(swarmObjs.su), ahead = swarmPath(swarmObjs.su + 0.1);
  swarmObjs.leader.position.set(lp.x, lp.y, lp.z);
  swarmObjs.leader.rotation.y = Math.atan2(ahead.x - lp.x, ahead.z - lp.z) + Math.PI;
  setLeaderGlow(swarmObjs.leader, (kidsLeft(swarm) ? 0.55 : leaderBright(t)) * fade);
  swarmObjs.kids.forEach((kid, i) => {
    if (!swarm.kids[i]) return;
    const p = swarmPath(swarmObjs.su - (i + 1) * 0.34);
    kid.position.set(p.x, p.y, p.z);
    const b = kidBright(i, t);
    kid.userData.bright = b;
    kid.userData.core.material.opacity = (0.25 + b * 0.75) * fade;
    kid.userData.halo.material.opacity = (0.04 + b * 0.34) * fade;
    kid.userData.halo.scale.setScalar(0.8 + b * 0.6);
  });
}

function netSwarm() {
  if (!swarm) return false;
  const t = clock.elapsedTime;
  let best = null, nd = 2.2;
  const near = (obj, idx) => {
    const d = Math.hypot(obj.position.x + GLADE.x - player.position.x, obj.position.z + GLADE.z - player.position.z);
    if (d < nd) { nd = d; best = { obj, idx }; }
  };
  near(swarmObjs.leader, -1);
  swarmObjs.kids.forEach((kid, i) => { if (swarm.kids[i]) near(kid, i); });
  if (!best) return false;
  const wx = best.obj.position.x + GLADE.x, wy = best.obj.position.y, wz = best.obj.position.z + GLADE.z;
  doPlayerAction(wx, wz);
  const bonus = netBonus(gameState), kind = swarmObjs.kind;
  const odds = { chanceLit: Math.min(0.98, 0.9 + bonus), chanceDim: Math.min(0.98, nightNow().tune.dimChance + bonus), rnd: Math.random };
  if (best.idx < 0) {
    const res = swingLeader(swarm, { ...odds, bright: leaderBright(t) });
    if (!res.hit) {
      swarmBoost = 1.2; Sound.blip();
      if (res.reason === 'miss') spawnFloatText(wx, wy + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
      return true;
    }
    swarm = res.sw;
    const bugs = LEADER_BUGS + (res.perfect ? PERFECT_BONUS : 0);
    catchBugs(kind, bugs, wx, wz, res.perfect ? perfectText(kind.ico, kind.name, bugs) : catchText(kind.ico, kind.name, bugs));
    endSwarm(t, 'done');
    return true;
  }
  const res = swingKid(swarm, best.idx, { ...odds, bright: best.obj.userData.bright || 0 });
  if (!res.hit) {
    swarmBoost = 1.2; Sound.blip();
    spawnFloatText(wx, wy + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
    return true;
  }
  swarm = res.sw;
  gladeGroup.remove(best.obj);
  catchBugs(kind, 1, wx, wz, res.inTurn ? comboText(kind.ico, kind.name, swarm.combo, KIDS) : catchText(kind.ico, kind.name, 1));
  return true;
}
```
`'휙— 놓쳤다!'` 는 이미 게임에 있는 문구를 그대로 다시 쓰는 것이라 새 문구 규칙의 대상이 아니다.

(c) `updateFireflyBugs` 에서 세 곳.

낮 분기 안, `gladeNight = null;` 위에 추가.
```js
    if (swarm) endSwarm(t, 'timeout');
    swarmAt = 0;
```
보충 조건을 교체.
```js
  if (t >= bugRespawnAt && gladeBugs.length < GLADE_MAX && !swarm) {
```
함수 맨 끝(개체 루프가 닫힌 뒤)에 추가.
```js
  updateSwarm(dt, t);
```

(d) `tryNet` 에서 두 곳.

`if (!isNight()) { … return; }` 줄 바로 아래에 추가.
```js
  if (netSwarm()) return;
```
성공 처리 블록(`gameState.inventory.bug = …` 부터 `onPlay('firefly');` 까지)을 교체. Task 7 에서 넣은 `noteCatch(kind);` 줄은 `catchBugs` 안으로 들어가므로 여기서는 사라진다.
```js
  removeFirefly(target);
  $w.bugRespawnAt = Math.min(bugRespawnAt, clock.elapsedTime + 2.5);
  catchBugs(kind, 1, wx, wz, catchText(kind.ico, kind.name, 1));
  trackGateBlocked('bug', 'rainbow');
  catchCeremony('bugZoom');
  showCatchItem(bugJarMesh(kind), wx, target.position.y, wz);
```

- [ ] **Step 5: 테스트와 화면 확인**

Run: `npm test 2>&1 | tail -6`
Expected: `# fail 0`. `tests/i18n-floattext.test.mjs` 가 뜨는 글자를 검사하므로 실패하면 메시지에 나온 문자열의 영어 패턴을 `js/i18n-en.js` 에 맞춘다.

```bash
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs pc gnight=plain\&gswarm=1
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs phone gnight=plain\&gswarm=1
```
캡처를 직접 열어 본다. 확인할 것: 큰 반디가 앞장서고 꼬마 넷이 줄지어 있음, 큰 반디가 꼬마보다 뚜렷이 큼, 무리 안내 배너가 떠 있음, 일반 반디가 무리와 같이 보임. 큰 반디가 꼬마와 구별이 안 되면 `swarm-art.js` 의 꼬리(0.27)와 번짐(0.7) 반지름을 1.3배로 키워 다시 찍는다.

잡는 흐름은 캡처로 볼 수 없으니 브라우저 패널에서 직접 한 번 해 본다. `http://localhost:8931/?dbg=1&weather=clear&time=0.9&house=6&unlocks=off&spawn=7.2,29.2&gswarm=1` 을 열고(소리 끔), 포충망(5)으로 꼬리부터 차례로 휘둘러 "연속 n/4" 글자와 마지막 큰 반디 포획을 확인한다. 차례를 틀렸을 때 연속 글자가 안 붙는 것, 꼬마가 남았을 때 큰 반디가 안 잡히는 것도 본다.

- [ ] **Step 6: 커밋**

```bash
git add js/glade/swarm-art.js js/spaces/glade.js tests/glade-wiring.test.mjs sims/glade-develop/impl
git commit -m "feat(glade): a big firefly leads four kids to catch in order

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

---

### Task 9: 전체 확인과 마무리

**Files:**
- Modify: `dev/active/glade-develop/glade-develop-context.md`, `glade-develop-tasks.md`

- [ ] **Step 1: 전체 테스트·번역 점검·웹 빌드**

```bash
npm test 2>&1 | tail -6
node scripts/i18n_check.mjs 2>&1 | grep -iE "glade|반디|줄등" | head
node scripts/build-web.mjs 2>&1 | tail -3
```
Expected: `# fail 0`, 번역 점검에 계곡 문구 누락 없음, 빌드 성공.

- [ ] **Step 2: 영어 화면 한 장**

```bash
PORT=8931 node dev/active/glade-develop/verify/impl-shots.mjs pc gnight=stream\&lang=en
```
배너가 영어로 나오고 한국어가 남지 않았는지 캡처를 열어 본다.

- [ ] **Step 3: 옛 세이브 확인**

`hintsSeen` 에 계곡 키가 하나도 없는 상태(새 게스트)로 들어가 반디 3마리를 잡아 첫 칸이 켜지는지 브라우저 패널에서 확인한다. 새로 고친 뒤에도 켜진 칸이 남아 있어야 한다.

- [ ] **Step 4: 코드 리뷰**

code-reviewer 에이전트에게 `git diff main...HEAD -- js tests` 를 넘겨 검토시킨다. 넘길 맥락: 설계 문서 경로, Global Constraints 전체. CRITICAL·HIGH 는 고치고 `npm test` 를 다시 돌린다.

- [ ] **Step 5: 기록 갱신과 커밋**

`glade-develop-context.md` 에 구현 상태, 드로우콜 실측값, 남은 확인(실기기, 숫자 조정)을 적고 `Last Updated` 를 고친다. `glade-develop-tasks.md` 의 체크를 맞춘다.

```bash
git add dev/active/glade-develop
git commit -m "docs(glade): record verification results

Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>"
```

- [ ] **Step 6: 사용자에게 보고하고 멈춤**

캡처(밤 3종, 줄등 0·60·240, 무리, 모바일)와 테스트 수, 드로우콜 차이, 확인하지 못한 것(실기기, 무리의 실제 박자감)을 보여 준다. 병합·배포는 묻고 나서 한다.

---

## 설계 문서와의 차이

- 설계 5-3 은 "HUD 칩 연속 n / 4"였다. 새 HUD 요소를 넣으면 모바일 배치 규칙을 다시 맞춰야 해서, 잡을 때 뜨는 글자에 "연속 n/4"를 붙이는 것으로 바꿨다. 사용자에게 알리고 설계 문서 5-3 을 같이 고친다.
- 밤 종류 해시는 식당 오늘의 특선과 같은 식을 쓰지 않는다. 그 식은 날짜가 하루씩 바뀔 때 값이 차례로 돌아 같은 밤이 길게 이어진다. 섞임이 좋은 식으로 바꾸고 1년치 비율과 연속 길이를 테스트로 잠갔다.
