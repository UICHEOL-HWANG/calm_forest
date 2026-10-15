# 설산 1단계(산 공간·등산·썰매·기록판) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이틀째 접속부터 열리는 설산 공간에서 "오르며 도토리 줍기 → S자 썰매 활강 → 기록·보상·기록판" 한 판을 플레이할 수 있게 한다.

**Architecture:** 판정·물리·정산은 three 를 import 하지 않는 순수 모듈(`js/mountain/*.js`)로 두고 `node --test` 로 검증한다. 3D 는 THREE 를 인자로 받는 빌더로 분리하고, game.js 에는 공간 플래그·카메라 훅·디스패치 몇 줄만 더한다. 기록은 천문대 `star_runs` 와 같은 "판 1회 = Supabase 1행 + 같은 run_id GA4" 구조.

**Tech Stack:** Three.js 0.160(ES 모듈, 번들러 없음), node:test, Supabase(Postgres, RLS), Cloudflare Worker(`functions/api/leaderboard.js`), GA4.

**Spec:** `docs/superpowers/specs/2026-10-15-mountain-sled-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 **주석을 넣지 않는다**(사용자 규칙). 설명은 커밋 메시지와 dev docs 에.
- 새 코드는 game.js 에 몰지 않는다. game.js 에는 플래그·훅·디스패치만.
- 불변 갱신: 상태 객체는 새 객체로 돌려준다(물리 스텝 포함).
- 원경 2콜, 입구 랜드마크 3콜 이하, 산 공간 안 60콜 이하.
- GA4 이벤트당 실제 전송 파라미터 25개 이하(`trackEvent` 가 `ts`, `platform`, 획득 이벤트엔 `exp_arm` 을 더한다). 배열은 GA4 에 넣지 않는다.
- 새 한국어 UI 문구는 `js/i18n-en.js` 의 `EN` 에 같은 문자열 키로 영어를 넣고, i18n 테스트로 확인한다. 문구 후보는 만들기 전에 사용자 검수를 받는다.
- 월드 말풍선은 이모지만. 글자 안내는 HUD 자리에만.
- dev 세션(`IS_DEV_SESSION`)은 GA4·Supabase 전송을 하지 않는다(기존 함수가 처리).
- 플랫폼 값: `web`, `toss`, `itch`, `android`, `ios`.
- 날짜: 세이브 날짜는 로컬 `todayStr()`(YYYY-MM-DD), Supabase `run_date` 는 KST `kstDate()`.
- 배포: 새 세이브 키(`firstDay`, `mountain`)가 생기므로 **웹·토스·Play·iOS 4곳 동시 배포**. Supabase DDL 은 풀러로 직접 실행(사용자에게 붙여넣기 시키지 않음).

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `js/mountain/unlock.js` | 새로 | 첫 접속일 결정·해금 판정(순수) |
| `js/mountain/course.js` | 새로 | 코스 데이터·중심선·이론 최단 기록(순수, `COURSE_V`) |
| `js/mountain/sled.js` | 새로 | 활강 물리 스텝·부스터·깃발·충돌(순수, `PHYS_V`) |
| `js/mountain/climb.js` | 새로 | 등산로 폴리라인·도토리 수집 판정(순수) |
| `js/mountain/sled-run.js` | 새로 | 판 시작·정산·포기, 하루 3판 보상, GA4·Supabase 행(game.js 순환 import, 함수 안에서만 사용) |
| `js/mountain/backdrop.js` | 새로 | 원경 빌더(THREE 인자) |
| `js/mountain/gate-art.js` | 새로 | 입구 아치·설산 모형 빌더(THREE 인자) |
| `js/mountain/terrain.js` | 새로 | 공간 안 지형·등산로·S자 사면·깃발·장애물·도토리 메시 빌더(THREE 인자) |
| `js/mountain/sled-hud.js` | 새로 | 카운트다운·시간·부스터 버튼·결과 패널 DOM |
| `js/mountain/sled-input.js` | 새로 | 화면 좌우 반쪽·←→/A/D·스페이스 입력 상태 |
| `js/mountain/reveal.js` | 새로 | 해금 연출(카메라 리그 3초) |
| `js/spaces/mountain.js` | 새로 | 입구·진입·나가기·클램프·액션·미니맵·프레임 업데이트·런타임 |
| `js/data/places.js` | 수정 | `MOUNTAIN`, `MOUNTAIN_GATE`, `MOUNTAIN_R` |
| `js/tuning.js` | 수정 | `DIFFICULTY.sled` |
| `js/difficulty.js` | 수정 | `ddaOutcome('sled')` |
| `js/config.js` | 수정 | `SLED_TABLE` |
| `js/supabase-client.js` | 수정 | `sendSledRun(row)` |
| `js/game.js` | 수정 | `atMountain` 플래그, `firstDay` 세이브, `setCameraRig`, 디스패치 |
| `js/spaces/doors.js` | 수정 | 입구 프롬프트, 공간 안 나가는 문, `inVillage2` |
| `js/shadow-scope.js` | 수정 | `OUT_OF_REACH_FLAGS` 에 `atMountain` |
| `js/i18n-en.js` | 수정 | 새 문구 |
| `index.html` | 수정 | 미니맵 장소 색·라벨, `LB_BOARDS.sled` |
| `functions/api/leaderboard.js` | 수정 | `BOARDS` 에 `sled` |
| `sql/migrations/migrate_sled_runs.sql` | 새로 | 테이블·RLS·크기 CHECK·최단 기록 트리거 |
| `sql/migrations/migrate_leaderboard_sled.sql` | 새로 | `leaderboard` RPC 에 `sled` 보드 |
| `tools/sim/sled-sim.mjs` | 새로 | 수치 시뮬레이션 |
| `tests/mountain-*.test.mjs` | 새로 | 각 태스크 테스트 |

---

### Task 1: 해금 규칙과 첫 접속일 세이브

**Files:**
- Create: `js/mountain/unlock.js`
- Modify: `js/game.js` (gameState 기본값 `:1003` 근처, 세이브 복원 `:2628` 근처)
- Test: `tests/mountain-unlock.test.mjs`

**Interfaces:**
- Produces: `LEGACY_FIRST_DAY: '2000-01-01'`, `resolveFirstDay(saved: unknown): string`, `ensureFirstDay(current: string|null, today: string): string`, `isMountainOpen(firstDay: string|null, today: string): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_FIRST_DAY, resolveFirstDay, ensureFirstDay, isMountainOpen } from '../js/mountain/unlock.js';
import { gameSource } from './helpers/game-source.mjs';

test('existing save without firstDay is treated as legacy and opens immediately', () => {
  assert.equal(resolveFirstDay(undefined), LEGACY_FIRST_DAY);
  assert.equal(isMountainOpen(LEGACY_FIRST_DAY, '2026-10-20'), true);
});

test('valid saved firstDay is kept, garbage becomes legacy', () => {
  assert.equal(resolveFirstDay('2026-10-19'), '2026-10-19');
  assert.equal(resolveFirstDay('2026-1-9'), LEGACY_FIRST_DAY);
  assert.equal(resolveFirstDay(20261019), LEGACY_FIRST_DAY);
});

test('new player gets today and the mountain opens the next day', () => {
  const first = ensureFirstDay(null, '2026-10-20');
  assert.equal(first, '2026-10-20');
  assert.equal(isMountainOpen(first, '2026-10-20'), false);
  assert.equal(isMountainOpen(first, '2026-10-21'), true);
});

test('ensureFirstDay never overwrites an existing value', () => {
  assert.equal(ensureFirstDay('2026-10-01', '2026-10-20'), '2026-10-01');
});

test('null firstDay is closed', () => {
  assert.equal(isMountainOpen(null, '2026-10-20'), false);
});

test('game.js saves and restores firstDay through resolveFirstDay', () => {
  const src = gameSource();
  assert.match(src, /firstDay:\s*null/);
  assert.match(src, /gameState\.firstDay\s*=\s*resolveFirstDay\(saved\.firstDay\)/);
  assert.match(src, /gameState\.firstDay\s*=\s*ensureFirstDay\(gameState\.firstDay,\s*todayStr\(\)\)/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-unlock.test.mjs`
Expected: FAIL — `Cannot find module '../js/mountain/unlock.js'`

- [ ] **Step 3: 구현**

`js/mountain/unlock.js`:

```js
export const LEGACY_FIRST_DAY = '2000-01-01';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveFirstDay(saved) {
  return typeof saved === 'string' && DAY_RE.test(saved) ? saved : LEGACY_FIRST_DAY;
}

export function ensureFirstDay(current, today) {
  return typeof current === 'string' && DAY_RE.test(current) ? current : today;
}

export function isMountainOpen(firstDay, today) {
  return typeof firstDay === 'string' && DAY_RE.test(firstDay) && today > firstDay;
}
```

`js/game.js`:
- 상단 import 묶음에 `import { resolveFirstDay, ensureFirstDay } from './mountain/unlock.js';`
- `gameState` 기본값의 `starDay: null,` 줄 바로 위에 `firstDay: null,`
- 복원부 `if (typeof saved.starDay === 'string') gameState.starDay = saved.starDay;` 바로 아래에 `gameState.firstDay = resolveFirstDay(saved.firstDay);`
- 부팅 후 `checkDailyBonus()` 를 부르는 자리(신규·복원 공통 경로) 바로 앞에 `gameState.firstDay = ensureFirstDay(gameState.firstDay, todayStr());`
- 세이브 직렬화가 `gameState` 전체를 쓰는지 확인한다. 키 화이트리스트로 직렬화한다면 `firstDay`, `mountain` 을 목록에 추가한다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-unlock.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/mountain/unlock.js js/game.js tests/mountain-unlock.test.mjs
git commit -m "feat(mountain): first-day save field and day-2 unlock rule"
```

---

### Task 2: 코스 데이터와 활강 물리

**Files:**
- Create: `js/mountain/course.js`, `js/mountain/sled.js`
- Test: `tests/mountain-sled-physics.test.mjs`

**Interfaces:**
- Produces (course.js): `COURSE_V: 1`, `COURSE: { length:number, width:number, flags:{z,x,half}[], obstacles:{z,x,r,kind}[] }`, `centerX(z:number):number`, `minTimeMs(course?):number`
- Produces (sled.js): `PHYS_V: 1`, `PHYS` 상수 객체, `createSled(acorns:number) → SledState`, `stepSled(s, dtMs, steer:-1|0|1, course?) → SledState`, `tryBoost(s) → SledState`, `finalTimeMs(s, course?) → number`
- `SledState = { x, z, speed, t, acorns, boostLeftMs, slowLeftMs, flagIdx, flagsPassed, splits:[boolean,number][], hits:[number,string][], hitIds:number[], boostsAt:number[], steerLeftMs, steerRightMs, finished }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE, COURSE_V, centerX, minTimeMs } from '../js/mountain/course.js';
import { PHYS, PHYS_V, createSled, stepSled, tryBoost, finalTimeMs } from '../js/mountain/sled.js';

const runToEnd = (s, steerFn = st => Math.sign(centerX(st.z + 6) - st.x), boostAtZ = []) => {
  let cur = s;
  const pending = [...boostAtZ];
  while (!cur.finished && cur.t < 120000) {
    if (pending.length && cur.z >= pending[0]) { cur = tryBoost(cur); pending.shift(); }
    cur = stepSled(cur, 16, steerFn(cur));
  }
  return cur;
};

test('course has 12 flags in order along the S curve', () => {
  assert.equal(COURSE_V, 1);
  assert.equal(COURSE.flags.length, 12);
  COURSE.flags.forEach((f, i) => {
    if (i) assert.ok(f.z > COURSE.flags[i - 1].z);
    assert.ok(Math.abs(f.x - centerX(f.z)) < 1e-9);
  });
  assert.ok(COURSE.flags.at(-1).z < COURSE.length);
});

test('stepSled returns a new object and never mutates input', () => {
  const s = createSled(0);
  const frozen = JSON.stringify(s);
  const n = stepSled(s, 16, 1);
  assert.notEqual(n, s);
  assert.equal(JSON.stringify(s), frozen);
});

test('a centred run without boost finishes in 35-45 s with all flags', () => {
  const end = runToEnd(createSled(0));
  assert.equal(end.finished, true);
  assert.equal(end.flagsPassed, 12);
  assert.ok(end.t >= 35000 && end.t <= 45000, `t=${end.t}`);
  assert.equal(end.splits.length, 12);
});

test('boost consumes one acorn, records time and makes the run faster', () => {
  const plain = runToEnd(createSled(3));
  const boosted = runToEnd(createSled(3), undefined, [40, 120, 200]);
  assert.equal(boosted.acorns, 0);
  assert.equal(boosted.boostsAt.length, 3);
  assert.ok(boosted.t < plain.t - 2000);
});

test('boost with zero acorns does nothing', () => {
  const s = createSled(0);
  assert.deepEqual(tryBoost(s), s);
});

test('missing a flag adds the penalty to the final time', () => {
  const end = runToEnd(createSled(0), () => 1);
  assert.ok(end.flagsPassed < 12);
  assert.equal(finalTimeMs(end), end.t + (12 - end.flagsPassed) * PHYS.flagPenaltyMs);
});

test('hitting an obstacle slows down once per obstacle and is recorded', () => {
  const o = COURSE.obstacles[0];
  let s = { ...createSled(0), x: o.x, z: o.z - 1, speed: PHYS.baseSpeed };
  s = stepSled(s, 120, 0);
  assert.equal(s.hits.length, 1);
  assert.ok(s.slowLeftMs > 0);
  const again = stepSled({ ...s, x: o.x, z: o.z - 0.5 }, 16, 0);
  assert.equal(again.hits.length, 1);
});

test('x is clamped to the course width', () => {
  let s = createSled(0);
  for (let i = 0; i < 400; i++) s = stepSled(s, 16, 1);
  assert.ok(s.x <= centerX(s.z) + COURSE.width / 2 + 1e-9);
});

test('steer time is accumulated per side', () => {
  let s = createSled(0);
  s = stepSled(s, 100, -1);
  s = stepSled(s, 50, 1);
  assert.equal(s.steerLeftMs, 100);
  assert.equal(s.steerRightMs, 50);
});

test('theoretical minimum time is below any reachable time', () => {
  const best = runToEnd(createSled(6), undefined, [10, 60, 110, 160, 210, 260]);
  assert.ok(minTimeMs() < best.t);
  assert.equal(PHYS_V, 1);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-sled-physics.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`js/mountain/course.js`:

```js
export const COURSE_V = 1;

const LENGTH = 330;
const AMP = 9;
const WAVES = 3;

export function centerX(z) {
  return Math.sin((z / LENGTH) * Math.PI * WAVES) * AMP;
}

const flags = Array.from({ length: 12 }, (_, i) => {
  const z = 25 + i * 25;
  return { z, x: centerX(z), half: 3 };
});

const OBSTACLE_SPEC = [
  [38, 3.2, 'snowball'], [63, -3.4, 'rock'], [88, 2.8, 'snowball'], [113, -3.0, 'rock'],
  [138, 3.6, 'snowball'], [163, -2.6, 'rock'], [188, 3.0, 'snowball'], [213, -3.4, 'rock'],
  [238, 2.6, 'snowball'], [263, -3.2, 'rock'], [288, 3.4, 'snowball'],
];

const obstacles = OBSTACLE_SPEC.map(([z, off, kind]) => ({ z, x: centerX(z) + off, r: 1.1, kind }));

export const COURSE = Object.freeze({ length: LENGTH, width: 14, flags, obstacles });

export function minTimeMs(course = COURSE, maxSpeed = 16 * 1.5) {
  return Math.floor((course.length / maxSpeed) * 1000);
}
```

`js/mountain/sled.js`:

```js
import { COURSE, centerX } from './course.js';

export const PHYS_V = 1;

export const PHYS = Object.freeze({
  baseSpeed: 8.6,
  maxSpeed: 16,
  accel: 6.0,
  steerRate: 6.5,
  boostMult: 1.5,
  boostMs: 2000,
  hitSlowMult: 0.55,
  hitRecoverMs: 900,
  flagPenaltyMs: 1000,
});

export function createSled(acorns) {
  return {
    x: centerX(0), z: 0, speed: PHYS.baseSpeed * 0.5, t: 0, acorns,
    boostLeftMs: 0, slowLeftMs: 0, flagIdx: 0, flagsPassed: 0,
    splits: [], hits: [], hitIds: [], boostsAt: [],
    steerLeftMs: 0, steerRightMs: 0, finished: false,
  };
}

export function tryBoost(s) {
  if (s.finished || s.acorns <= 0) return s;
  return { ...s, acorns: s.acorns - 1, boostLeftMs: PHYS.boostMs, boostsAt: [...s.boostsAt, s.t] };
}

function targetSpeed(s) {
  const boost = s.boostLeftMs > 0 ? PHYS.boostMult : 1;
  const slow = s.slowLeftMs > 0 ? PHYS.hitSlowMult : 1;
  return Math.min(PHYS.maxSpeed * PHYS.boostMult, PHYS.baseSpeed * boost * slow);
}

function crossFlags(s, x, t, course) {
  let { flagIdx, flagsPassed, splits } = s;
  while (flagIdx < course.flags.length && course.flags[flagIdx].z <= s.z) {
    const f = course.flags[flagIdx];
    const ok = Math.abs(x - f.x) <= f.half;
    splits = [...splits, [ok, t]];
    flagsPassed += ok ? 1 : 0;
    flagIdx += 1;
  }
  return { flagIdx, flagsPassed, splits };
}

function collide(s, course) {
  const idx = course.obstacles.findIndex((o, i) =>
    !s.hitIds.includes(i) && Math.abs(s.z - o.z) < o.r && Math.abs(s.x - o.x) < o.r);
  if (idx < 0) return s;
  return {
    ...s,
    hitIds: [...s.hitIds, idx],
    hits: [...s.hits, [s.t, course.obstacles[idx].kind]],
    slowLeftMs: PHYS.hitRecoverMs,
  };
}

export function stepSled(s, dtMs, steer, course = COURSE) {
  if (s.finished) return s;
  const dt = dtMs / 1000;
  const goal = targetSpeed(s);
  const rate = PHYS.accel * dt * (goal < s.speed ? 4 : 1);
  const speed = s.speed + Math.sign(goal - s.speed) * Math.min(Math.abs(goal - s.speed), rate);
  const z = Math.min(course.length, s.z + speed * dt);
  const half = course.width / 2;
  const cx = centerX(z);
  const x = Math.max(cx - half, Math.min(cx + half, s.x + steer * PHYS.steerRate * dt));
  const t = s.t + dtMs;
  const moved = {
    ...s, x, z, speed, t,
    boostLeftMs: Math.max(0, s.boostLeftMs - dtMs),
    slowLeftMs: Math.max(0, s.slowLeftMs - dtMs),
    steerLeftMs: s.steerLeftMs + (steer < 0 ? dtMs : 0),
    steerRightMs: s.steerRightMs + (steer > 0 ? dtMs : 0),
  };
  const flagged = { ...moved, ...crossFlags(moved, x, t, course) };
  const hit = collide(flagged, course);
  return { ...hit, finished: z >= course.length };
}

export function finalTimeMs(s, course = COURSE) {
  return s.t + (course.flags.length - s.flagsPassed) * PHYS.flagPenaltyMs;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-sled-physics.test.mjs`
Expected: PASS (10 tests). 35~45초 테스트가 실패하면 `PHYS.baseSpeed` 만 조정한다(코스 길이 330 고정). 최종 값은 Task 3 시뮬레이션에서 확정한다.

- [ ] **Step 5: 커밋**

```bash
git add js/mountain/course.js js/mountain/sled.js tests/mountain-sled-physics.test.mjs
git commit -m "feat(mountain): sled course data and immutable physics step"
```

---

### Task 3: 수치 시뮬레이션(도토리·부스터·보상)

**Files:**
- Create: `tools/sim/sled-sim.mjs`, `dev/active/mountain-sled/sim-report.md`
- Test: `tests/mountain-sled-sim.test.mjs`

**Interfaces:**
- Consumes: `createSled`, `stepSled`, `tryBoost`, `finalTimeMs`, `centerX` (Task 2)
- Produces: `simulate({ skill:number, acorns:number, seed:number }) → { timeMs, flags, hits, boosts }`, `profile(skill, acorns, n) → { p10, p50, p90, meanFlags }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, profile } from '../tools/sim/sled-sim.mjs';

test('simulation is deterministic per seed', () => {
  assert.deepEqual(simulate({ skill: 0.6, acorns: 3, seed: 7 }), simulate({ skill: 0.6, acorns: 3, seed: 7 }));
});

test('higher skill means more flags and a faster median', () => {
  const lo = profile(0.3, 3, 200);
  const hi = profile(0.9, 3, 200);
  assert.ok(hi.meanFlags > lo.meanFlags);
  assert.ok(hi.p50 < lo.p50);
});

test('six acorns are worth a visible but not dominant gain', () => {
  const none = profile(0.7, 0, 200).p50;
  const six = profile(0.7, 6, 200).p50;
  const gain = none - six;
  assert.ok(gain >= 3000 && gain <= 9000, `gain=${gain}`);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-sled-sim.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: 구현**

`tools/sim/sled-sim.mjs`:

```js
import { centerX } from '../../js/mountain/course.js';
import { createSled, stepSled, tryBoost, finalTimeMs } from '../../js/mountain/sled.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function simulate({ skill, acorns, seed }) {
  const r = rng(seed);
  const reaction = 1 + Math.round((1 - skill) * 14);
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns);
  let steer = 0;
  let frame = 0;
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    if (frame % reaction === 0) {
      const aim = centerX(s.z + 5) + (r() - 0.5) * (1 - skill) * 10;
      steer = Math.abs(aim - s.x) < 0.4 ? 0 : Math.sign(aim - s.x);
    }
    s = stepSled(s, 16, steer);
    frame += 1;
  }
  return { timeMs: finalTimeMs(s), flags: s.flagsPassed, hits: s.hits.length, boosts: s.boostsAt.length };
}

export function profile(skill, acorns, n) {
  const runs = Array.from({ length: n }, (_, i) => simulate({ skill, acorns, seed: i + 1 }));
  const times = runs.map(x => x.timeMs).sort((a, b) => a - b);
  const q = p => times[Math.min(times.length - 1, Math.floor(p * times.length))];
  return { p10: q(0.1), p50: q(0.5), p90: q(0.9), meanFlags: runs.reduce((a, x) => a + x.flags, 0) / n };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const skill of [0.3, 0.6, 0.9]) {
    for (const acorns of [0, 3, 6]) {
      console.log(JSON.stringify({ skill, acorns, ...profile(skill, acorns, 500) }));
    }
  }
}
```

- [ ] **Step 4: 통과 확인 후 표 기록**

Run: `node --test tests/mountain-sled-sim.test.mjs` → PASS
Run: `node tools/sim/sled-sim.mjs > dev/active/mountain-sled/sim-raw.jsonl`

`dev/active/mountain-sled/sim-report.md` 에 skill×acorns 9칸 표(p10/p50/p90/meanFlags)와 결론을 적는다. 기준:
- 숙련(0.9)·도토리 6의 p50 이 30초 이상
- 초보(0.3)·도토리 0의 p90 이 60초 이하
- 도토리 6개의 이득이 3~9초

기준을 못 맞추면 `PHYS` 값만 조정하고 Task 2 테스트를 다시 돌린다. **수치를 바꾸면 이 표와 `PHYS` 를 같이 커밋한다.**

- [ ] **Step 5: 커밋**

```bash
git add tools/sim/sled-sim.mjs tests/mountain-sled-sim.test.mjs dev/active/mountain-sled/sim-report.md dev/active/mountain-sled/sim-raw.jsonl js/mountain/sled.js
git commit -m "feat(mountain): sled tuning simulation and report"
```

---

### Task 4: 난이도 등록(`sled`)

**Files:**
- Modify: `js/tuning.js` (`DIFFICULTY`, `star:` 줄 다음), `js/difficulty.js` (`ddaOutcome`, `star` 분기 다음)
- Test: `tests/mountain-difficulty.test.mjs`

**Interfaces:**
- Produces: `DIFFICULTY.sled = { arms:[0.85,1.0,1.15], target:0.8, ddaOn:false }`, `ddaOutcome('sled', { flagsPassed, abandoned }) → number|null`
- 썰매의 `ease` 적용: Task 10 에서 장애물 판정 반경에 `r * (2 - ease)` 로만 쓴다(ease 0.85 → 반경 1.15배로 어려움, 1.15 → 0.85배로 쉬움). 속도는 건드리지 않아 기록판 공정성을 지킨다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY } from '../js/tuning.js';
import { ddaOutcome, defaultDifficulty, easeFor } from '../js/difficulty.js';

test('sled is registered with probe only for the first week', () => {
  assert.deepEqual(DIFFICULTY.sled, { arms: [0.85, 1.0, 1.15], target: 0.8, ddaOn: false });
  assert.ok('sled' in defaultDifficulty());
});

test('sled outcome is the share of flags passed, abandon is null', () => {
  assert.equal(ddaOutcome('sled', { flagsPassed: 9 }), 0.75);
  assert.equal(ddaOutcome('sled', { flagsPassed: 20 }), 1);
  assert.equal(ddaOutcome('sled', { abandoned: true }), null);
});

test('easeFor returns one of the sled arms', () => {
  const r = easeFor('sled', 'user-a', 0, 1);
  assert.ok(DIFFICULTY.sled.arms.includes(r.ease) || r.ease === 1);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-difficulty.test.mjs` → FAIL (`DIFFICULTY.sled` undefined)

- [ ] **Step 3: 구현**

`js/tuning.js` 의 `DIFFICULTY` 안 `star:` 줄 다음:

```js
  sled:  { arms: [0.85, 1.0, 1.15], target: 0.8, ddaOn: false },
```

`js/difficulty.js` 의 `ddaOutcome` 안 `if (game === 'star') {…}` 블록 다음:

```js
  if (game === 'sled') return res.abandoned ? null : Math.max(0, Math.min(12, res.flagsPassed || 0)) / 12;
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-difficulty.test.mjs tests/difficulty.test.mjs` → PASS
`tests/difficulty.test.mjs` 가 게임 목록을 열거해 실패하면 그 목록에 `sled` 를 추가한다.

- [ ] **Step 5: 커밋**

```bash
git add js/tuning.js js/difficulty.js tests/mountain-difficulty.test.mjs tests/difficulty.test.mjs
git commit -m "feat(mountain): register sled in difficulty probe"
```

---

### Task 5: 판 정산(`sled-run.js`)과 GA4 한도 테스트

**Files:**
- Create: `js/mountain/sled-run.js`
- Test: `tests/mountain-sled-run.test.mjs`

**Interfaces:**
- Consumes: `finalTimeMs`, `PHYS`, `PHYS_V` (Task 2), `COURSE_V` (Task 2), `ddaOutcome` (Task 4); game.js 순환 import `diffParams, gameState, giveReward, requestSave, settleDifficulty, todayStr, trackDiffAbandon`; `trackEvent`(analytics); `sendSledRun`(Task 6)
- Produces:
  - `DAILY_REWARD_RUNS = 3`
  - `SLED_COINS = { base: 15, perFlag: 2, newBest: 10 }`
  - `sledState() → { best:number|null, plays:number, daily:{date:string|null, rewarded:number} }`
  - `sledBegin(ctx) → { attemptN }`, `ctx = { runId, diff, acornsAvailable, acornsCollected, climbMs, daysSinceUnlock, input, orientation }`
  - `sledSettle(sled, ctx, env) → { timeMs, coins, rewarded, newBest, leftToday }`, `env = { fpsAvg }`
  - `sledAbandon(stage: 'climb'|'sled', ctx, sled|null) → void`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ddaOutcome } from '../js/difficulty.js';
import { PHYS, PHYS_V, finalTimeMs } from '../js/mountain/sled.js';
import { COURSE_V } from '../js/mountain/course.js';

function run(day = '2026-10-20', mountain = undefined) {
  const paid = [], saves = [], events = [], settled = [], rows = [], abandons = [];
  const ctx = {
    gameState: { ...(mountain ? { mountain } : {}), firstDay: '2026-10-18' },
    today: day,
    giveReward: (r, source, item) => paid.push([r, source, item]),
    requestSave: () => saves.push(1),
    trackEvent: (name, params) => events.push([name, { ...params, ts: 1, platform: 'web', exp_arm: 'a' }]),
    settleDifficulty: (g, o) => settled.push([g, o]),
    sendSledRun: row => rows.push(row),
    trackDiffAbandon: (...a) => abandons.push(a),
    diffParams: r => ({ ease: r.ease, dda: r.dda, arm: r.arm, probe_v: 2 }),
    ddaOutcome, finalTimeMs, PHYS, PHYS_V, COURSE_V,
  };
  const c = vm.createContext({ ...ctx, todayStr: () => c.today });
  vm.runInContext(readFileSync(new URL('../js/mountain/sled-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return { c, paid, saves, events, settled, rows, abandons };
}

const plain = v => JSON.parse(JSON.stringify(v));
const CTX = { runId: 'r1', diff: { ease: 1, dda: 1, arm: 1 }, acornsAvailable: 6, acornsCollected: 4, climbMs: 41000, daysSinceUnlock: 1, input: 'touch', orientation: 'portrait' };
const SLED = (t, flags) => ({ t, flagsPassed: flags, splits: Array.from({ length: 12 }, (_, i) => [i < flags, i * 3000]), hits: [[5000, 'rock']], boostsAt: [1000, 9000], steerLeftMs: 4000, steerRightMs: 3500, acorns: 2 });

test('first three finishes of the day pay, the fourth does not', () => {
  const { c, paid } = run();
  c.sledBegin(CTX);
  const results = [0, 1, 2, 3].map(() => c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 }));
  assert.deepEqual(results.map(r => r.rewarded), [true, true, true, false]);
  assert.equal(paid.filter(p => p[1] === 'sled_run').length, 3);
  assert.equal(results[3].leftToday, 0);
});

test('coins are base + perFlag×flags, new best adds bonus', () => {
  const { c, paid } = run();
  const r = c.sledSettle(SLED(40000, 10), CTX, { fpsAvg: 58 });
  assert.equal(r.timeMs, 40000 + 2 * PHYS.flagPenaltyMs);
  assert.equal(r.newBest, true);
  assert.deepEqual(plain(paid[0]), [{ coins: 15 + 2 * 10 }, 'sled_run', 'v1']);
  assert.deepEqual(plain(paid[1]), [{ coins: 10 }, 'sled_best', 'v1']);
});

test('a new day resets the reward counter', () => {
  const { c } = run('2026-10-21', { sled: { best: 39000, plays: 9, daily: { date: '2026-10-20', rewarded: 3 } } });
  assert.equal(c.sledSettle(SLED(42000, 12), CTX, { fpsAvg: 60 }).rewarded, true);
});

test('settle saves, settles difficulty with flag share and sends one full row', () => {
  const { c, saves, settled, rows } = run();
  c.sledBegin(CTX);
  c.sledSettle(SLED(40000, 9), CTX, { fpsAvg: 57.4 });
  assert.ok(saves.length >= 1);
  assert.deepEqual(plain(settled), [['sled', 0.75]]);
  const row = rows[0];
  for (const k of ['run_id', 'outcome', 'time_ms', 'flags_passed', 'penalty_ms', 'rewarded', 'splits', 'boosts_at', 'hits', 'steer_left_ms', 'steer_right_ms', 'attempt_n', 'days_since_unlock', 'best_before_ms', 'acorns_available', 'acorns_collected', 'climb_ms', 'input', 'orientation', 'fps_avg', 'course_v', 'phys_v', 'ease', 'arm', 'dda', 'probe_v', 'coins']) {
    assert.ok(k in row, `missing ${k}`);
  }
  assert.equal(row.outcome, 'finish');
  assert.equal(row.course_v, 1);
});

test('abandon sends an abandon row, pays nothing and does not move DDA', () => {
  const { c, paid, settled, rows, abandons } = run();
  c.sledAbandon('climb', CTX, null);
  assert.equal(paid.length, 0);
  assert.equal(settled.length, 0);
  assert.equal(rows[0].outcome, 'abandon');
  assert.equal(rows[0].abandon_stage, 'climb');
  assert.equal(abandons[0][0], 'sled');
});

test('every GA4 payload stays within 25 params and carries no arrays', () => {
  const { c, events } = run();
  c.sledBegin(CTX);
  c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 });
  for (const [name, p] of events) {
    const sent = Object.values(p).filter(v => v !== null && v !== undefined);
    assert.ok(sent.length <= 25, `${name} has ${sent.length}`);
    assert.ok(!sent.some(Array.isArray), `${name} has an array`);
  }
  assert.deepEqual(events.map(e => e[0]), ['sled_start', 'sled_result']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-sled-run.test.mjs` → FAIL (ENOENT)

- [ ] **Step 3: 구현**

`js/mountain/sled-run.js`:

```js
import { diffParams, gameState, giveReward, requestSave, settleDifficulty, todayStr, trackDiffAbandon } from '../game.js';
import { trackEvent } from '../analytics.js';
import { sendSledRun } from '../supabase-client.js';
import { ddaOutcome } from '../difficulty.js';
import { finalTimeMs, PHYS, PHYS_V } from './sled.js';
import { COURSE_V } from './course.js';

export const DAILY_REWARD_RUNS = 3;
export const SLED_COINS = { base: 15, perFlag: 2, newBest: 10 };

export function sledState() {
  const s = gameState.mountain?.sled || {};
  const daily = s.daily && typeof s.daily === 'object' ? s.daily : {};
  return {
    best: Number.isFinite(s.best) ? s.best : null,
    plays: Number.isFinite(s.plays) ? s.plays : 0,
    daily: {
      date: typeof daily.date === 'string' ? daily.date : null,
      rewarded: Number.isFinite(daily.rewarded) ? daily.rewarded : 0,
    },
  };
}

function writeSled(next) {
  gameState.mountain = { ...(gameState.mountain || {}), sled: next };
}

function rewardedToday(st, today) {
  return st.daily.date === today ? st.daily.rewarded : 0;
}

export function sledBegin(ctx) {
  const st = sledState();
  const attemptN = st.plays + 1;
  writeSled({ ...st, plays: attemptN });
  requestSave();
  trackEvent('sled_start', {
    run_id: ctx.runId, attempt_n: attemptN, course_v: COURSE_V, acorns: ctx.acornsCollected,
    ...(ctx.diff ? diffParams(ctx.diff) : {}),
  });
  return { attemptN };
}

function sledRow(ctx, outcome, stage, sled, timeMs, pay, bestBefore) {
  const dp = ctx.diff ? diffParams(ctx.diff) : {};
  return {
    run_id: ctx.runId,
    outcome,
    abandon_stage: stage,
    time_ms: timeMs,
    flags_passed: sled ? sled.flagsPassed : null,
    penalty_ms: sled ? (12 - sled.flagsPassed) * PHYS.flagPenaltyMs : null,
    rewarded: !!pay.rewarded,
    coins: pay.coins || 0,
    splits: sled ? sled.splits : null,
    boosts_at: sled ? sled.boostsAt : null,
    hits: sled ? sled.hits : null,
    steer_left_ms: sled ? Math.round(sled.steerLeftMs) : null,
    steer_right_ms: sled ? Math.round(sled.steerRightMs) : null,
    attempt_n: sledState().plays,
    days_since_unlock: ctx.daysSinceUnlock,
    best_before_ms: bestBefore,
    acorns_available: ctx.acornsAvailable,
    acorns_collected: ctx.acornsCollected,
    climb_ms: ctx.climbMs,
    input: ctx.input,
    orientation: ctx.orientation,
    fps_avg: pay.fpsAvg ?? null,
    course_v: COURSE_V,
    phys_v: PHYS_V,
    ease: dp.ease ?? null,
    arm: dp.arm ?? null,
    dda: dp.dda ?? null,
    probe_v: dp.probe_v ?? null,
  };
}

export function sledSettle(sled, ctx, env = {}) {
  const today = todayStr();
  const st = sledState();
  const timeMs = finalTimeMs(sled);
  const done = rewardedToday(st, today);
  const rewarded = done < DAILY_REWARD_RUNS;
  const newBest = st.best === null || timeMs < st.best;
  let coins = 0;
  if (rewarded) {
    coins = SLED_COINS.base + SLED_COINS.perFlag * sled.flagsPassed;
    giveReward({ coins }, 'sled_run', `v${COURSE_V}`);
    if (newBest) {
      giveReward({ coins: SLED_COINS.newBest }, 'sled_best', `v${COURSE_V}`);
      coins += SLED_COINS.newBest;
    }
  }
  const doneAfter = rewarded ? done + 1 : done;
  writeSled({ ...st, best: newBest ? timeMs : st.best, daily: { date: today, rewarded: doneAfter } });
  requestSave();
  if (ctx.diff) settleDifficulty('sled', ddaOutcome('sled', { flagsPassed: sled.flagsPassed }));
  trackEvent('sled_result', {
    run_id: ctx.runId, time_ms: timeMs, flags: sled.flagsPassed, boosts: sled.boostsAt.length,
    acorns: ctx.acornsCollected, hits: sled.hits.length, new_best: newBest ? 1 : 0, rewarded: rewarded ? 1 : 0,
    ...(ctx.diff ? diffParams(ctx.diff) : {}),
  });
  sendSledRun(sledRow(ctx, 'finish', null, sled, timeMs, { rewarded, coins, fpsAvg: env.fpsAvg }, st.best));
  return { timeMs, coins, rewarded, newBest, leftToday: Math.max(0, DAILY_REWARD_RUNS - doneAfter) };
}

export function sledAbandon(stage, ctx, sled) {
  trackDiffAbandon('sled', ctx.diff, stage, { run_id: ctx.runId });
  sendSledRun(sledRow(ctx, 'abandon', stage, sled, null, { rewarded: false, coins: 0 }, sledState().best));
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-sled-run.test.mjs` → PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/mountain/sled-run.js tests/mountain-sled-run.test.mjs
git commit -m "feat(mountain): sled run settlement with daily cap and GA4 limit test"
```

---

### Task 6: `sled_runs` 테이블과 전송 함수

**Files:**
- Create: `sql/migrations/migrate_sled_runs.sql`
- Modify: `js/config.js` (`STAR_TABLE` 줄 다음), `js/supabase-client.js` (`sendStarRun` 함수 다음)
- Test: `tests/mountain-sled-db.test.mjs`

**Interfaces:**
- Produces: `CONFIG.SLED_TABLE = 'sled_runs'`, `sendSledRun(row): Promise<void>`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_sled_runs.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');

test('table has every column sled-run.js sends', () => {
  for (const col of ['run_id', 'outcome', 'abandon_stage', 'time_ms', 'flags_passed', 'penalty_ms', 'rewarded', 'coins', 'splits', 'boosts_at', 'hits', 'steer_left_ms', 'steer_right_ms', 'attempt_n', 'days_since_unlock', 'best_before_ms', 'acorns_available', 'acorns_collected', 'climb_ms', 'input', 'orientation', 'fps_avg', 'course_v', 'phys_v', 'ease', 'arm', 'dda', 'probe_v', 'user_id', 'session_id', 'client_id', 'is_guest', 'variant', 'platform', 'run_date']) {
    assert.match(sql, new RegExp(`\\b${col}\\b`), col);
  }
});

test('RLS uses the select auth.uid() rule for select and insert', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/);
});

test('json size cap, minimum-time trigger and platform check exist', () => {
  assert.match(sql, /sled_runs_json_size/);
  assert.match(sql, /sled_runs_min_time/);
  assert.match(sql, /platform in \('web', 'toss', 'itch', 'android', 'ios'\)/);
});

test('client sends through SLED_TABLE and skips dev sessions', () => {
  assert.match(config, /SLED_TABLE:\s*'sled_runs'/);
  assert.match(client, /export async function sendSledRun\(row\)\s*\{\s*if \(IS_DEV_SESSION\) return;/);
  assert.match(client, /from\(CONFIG\.SLED_TABLE\)\.insert/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-sled-db.test.mjs` → FAIL (ENOENT)

- [ ] **Step 3: 구현**

`sql/migrations/migrate_sled_runs.sql`:

```sql
create table if not exists public.sled_runs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  session_id text,
  client_id text,
  is_guest boolean,
  variant text,
  platform text,
  run_date date,
  run_id uuid not null,
  outcome text not null,
  abandon_stage text,
  time_ms integer,
  flags_passed smallint,
  penalty_ms integer,
  rewarded boolean,
  coins integer,
  splits jsonb,
  boosts_at jsonb,
  hits jsonb,
  steer_left_ms integer,
  steer_right_ms integer,
  attempt_n integer,
  days_since_unlock integer,
  best_before_ms integer,
  acorns_available smallint,
  acorns_collected smallint,
  climb_ms integer,
  input text,
  orientation text,
  fps_avg real,
  course_v smallint not null,
  phys_v smallint not null,
  ease real,
  arm smallint,
  dda real,
  probe_v smallint,
  created_at timestamptz not null default now(),
  constraint sled_runs_run_id_key unique (run_id),
  constraint sled_runs_outcome check (outcome in ('finish', 'abandon')),
  constraint sled_runs_platform check (platform is null or platform in ('web', 'toss', 'itch', 'android', 'ios')),
  constraint sled_runs_json_size check (
    coalesce(pg_column_size(splits), 0) + coalesce(pg_column_size(boosts_at), 0) + coalesce(pg_column_size(hits), 0) < 8192
  )
);

create index if not exists sled_runs_user_idx on public.sled_runs (user_id);
create index if not exists sled_runs_date_idx on public.sled_runs (run_date);
create index if not exists sled_runs_board_idx on public.sled_runs (run_date, outcome, time_ms);
create index if not exists sled_runs_created_idx on public.sled_runs (created_at);

create or replace function public.sled_runs_min_time() returns trigger
language plpgsql as $$
begin
  if new.outcome = 'finish' and new.course_v = 1 and (new.time_ms is null or new.time_ms < 13750) then
    raise exception 'sled time below theoretical minimum';
  end if;
  return new;
end $$;

drop trigger if exists sled_runs_min_time on public.sled_runs;
create trigger sled_runs_min_time before insert on public.sled_runs
  for each row execute function public.sled_runs_min_time();

alter table public.sled_runs enable row level security;
drop policy if exists sled_runs_select_own on public.sled_runs;
create policy sled_runs_select_own on public.sled_runs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists sled_runs_insert_own on public.sled_runs;
create policy sled_runs_insert_own on public.sled_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
```

`13750` 은 `minTimeMs()` = `floor(330 / 24 * 1000)` 이다. Task 3 에서 코스나 `PHYS` 를 바꿨다면 `node -e "import('./js/mountain/course.js').then(m=>console.log(m.minTimeMs()))"` 출력으로 이 숫자를 맞춘다.

`js/config.js` — `STAR_TABLE` 줄 다음:

```js
  SLED_TABLE: 'sled_runs',
```

`js/supabase-client.js` — `sendStarRun` 함수 다음(같은 구조):

```js
export async function sendSledRun(row) {
  if (IS_DEV_SESSION) return;
  const full = { user_id: state.userId, session_id: state.sessionId, client_id: state.clientId,
    is_guest: state.isGuest, variant: state.variant, platform: PLATFORM, run_date: kstDate(), ...row };
  if (!state.online || !supabase) { devLog('[Supabase 폴백] 썰매 기록(오프라인):', full); return; }
  try { const { error } = await supabase.from(CONFIG.SLED_TABLE).insert(full); if (error) throw error; }
  catch (err) { console.warn('[Supabase 폴백] 썰매 기록 전송 실패:', err?.message || err); }
}
```

- [ ] **Step 4: 통과 확인 후 운영 DB 적용**

Run: `node --test tests/mountain-sled-db.test.mjs` → PASS

운영 DB 적용은 기존 절차(pg8000 풀러, DO 블록 하나)로 직접 실행한다. 적용 후 확인:

```sql
select count(*) from information_schema.columns where table_name = 'sled_runs';
select policyname from pg_policies where tablename = 'sled_runs' order by 1;
```

Expected: 컬럼 38개, 정책 `sled_runs_insert_own`, `sled_runs_select_own`.

- [ ] **Step 5: 커밋**

```bash
git add sql/migrations/migrate_sled_runs.sql js/config.js js/supabase-client.js tests/mountain-sled-db.test.mjs
git commit -m "feat(mountain): sled_runs table with RLS, size cap, min-time guard"
```

---

### Task 7: 카메라 리그 훅과 장소 상수

**Files:**
- Modify: `js/game.js` (`updateCamera` `:6243`, export 목록), `js/data/places.js` (`MIRROR_STOP` 다음)
- Test: `tests/mountain-place.test.mjs`

**Interfaces:**
- Produces: `setCameraRig(fn: ((camera, dt) => void) | null): void`, `MOUNTAIN = Vector3(0,0,-1000)`, `MOUNTAIN_R = 60`, `MOUNTAIN_GATE = Vector3(-9,0,-29)`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const vec = name => {
  const m = src.match(new RegExp(`const ${name} = new THREE\\.Vector3\\(([-\\d.]+),\\s*([-\\d.]+),\\s*([-\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: +m[1], z: +m[3] };
};
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('mountain space is far from every other instanced space', () => {
  const m = vec('MOUNTAIN');
  for (const n of ['MIRROR', 'DREAM', 'RIVER', 'MIST', 'NEIGHBOR', 'NEIGHBOR_INT', 'OBSERVATORY']) {
    assert.ok(d(m, vec(n)) > 150, `${n} too close`);
  }
});

test('mountain gate sits inside the village and clears north landmarks', () => {
  const g = vec('MOUNTAIN_GATE');
  assert.ok(Math.hypot(g.x, g.z) < 42 - 6);
  for (const n of ['DOCK_GATE', 'DOCK_POND', 'MIST_GATE', 'SEA_GATE']) assert.ok(d(g, vec(n)) > 9, n);
  assert.ok(d(g, vec('HOUSE_POS')) > 12);
});

test('game.js exposes a camera rig hook used at the top of updateCamera', () => {
  assert.match(src, /let cameraRig = null;/);
  assert.match(src, /function setCameraRig\(fn\)\s*\{\s*cameraRig = fn \|\| null;\s*\}/);
  assert.match(src, /function updateCamera\(dt\)\s*\{\s*if \(cameraRig\) \{ cameraRig\(camera, dt\); return; \}/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-place.test.mjs` → FAIL (`MOUNTAIN not found`)

- [ ] **Step 3: 구현**

`js/data/places.js` — `MIRROR_STOP` 줄 다음:

```js
export const MOUNTAIN = new THREE.Vector3(0, 0, -1000);
export const MOUNTAIN_R = 60;
export const MOUNTAIN_GATE = new THREE.Vector3(-9, 0, -29);
```

`js/game.js`:
- `function updateCamera(dt) {` 바로 위:

```js
let cameraRig = null;
function setCameraRig(fn) { cameraRig = fn || null; }
```

- `function updateCamera(dt) {` 다음 첫 줄:

```js
  if (cameraRig) { cameraRig(camera, dt); return; }
```

- export 목록에 `setCameraRig` 를 추가하고, `scene`, `camera`, `snapCamera` 가 없으면 같이 추가한다.
- `MOUNTAIN_GATE (-9,-29)` 가 테스트를 통과하지 못하면 `(-10,-30)`, `(-8,-31)` 순으로 바꿔 통과하는 첫 좌표를 쓴다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-place.test.mjs` → PASS

- [ ] **Step 5: 커밋**

```bash
git add js/data/places.js js/game.js tests/mountain-place.test.mjs
git commit -m "feat(mountain): place constants and camera rig hook"
```

---

### Task 8: 원경 빌더·입구 랜드마크·해금 연출

**Files:**
- Create: `js/mountain/backdrop.js`, `js/mountain/gate-art.js`, `js/mountain/reveal.js`
- Test: `tests/mountain-art.test.mjs`

**Interfaces:**
- Consumes: `setCameraRig` (Task 7, 인자로 받음)
- Produces:
  - `mountainMesh(THREE, R, H) → THREE.Mesh` (재사용용, `fog:false`)
  - `buildBackdrop(THREE, { radius, height, frontGap }) → THREE.Group` (Mesh 정확히 2개: 산, 구름 InstancedMesh)
  - `buildGateArt(THREE) → THREE.Group` (Mesh 3개 이하)
  - `createReveal({ THREE, scene, camera, setCameraRig, from: Vector3, at: Vector3, durationMs }) → { start(): void, update(dt:number): boolean }` (끝나면 `false`)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildBackdrop } from '../js/mountain/backdrop.js';
import { buildGateArt } from '../js/mountain/gate-art.js';
import { createReveal } from '../js/mountain/reveal.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('art modules do not import three directly', () => {
  for (const f of ['backdrop', 'gate-art', 'reveal']) {
    const src = readFileSync(new URL(`../js/mountain/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from 'three'/, f);
  }
});

test('backdrop is two draw calls and ignores fog', () => {
  const ms = meshes(buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 }));
  assert.equal(ms.length, 2);
  assert.ok(ms.every(m => m.material.fog === false));
  assert.ok(ms.some(m => m.isInstancedMesh));
});

test('backdrop cloud band leaves the front gap empty', () => {
  const clouds = meshes(buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 })).find(m => m.isInstancedMesh);
  const mtx = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < clouds.count; i++) {
    clouds.getMatrixAt(i, mtx); p.setFromMatrixPosition(mtx);
    assert.ok(Math.abs(Math.atan2(p.z, p.x) - Math.PI / 2) >= 0.18, `cloud ${i} in gap`);
  }
});

test('gate art stays within 3 draw calls', () => {
  assert.ok(meshes(buildGateArt(THREE)).length <= 3);
});

test('reveal installs a rig, adds and removes the backdrop, then releases the camera', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const rigs = [];
  const r = createReveal({ THREE, scene, camera, setCameraRig: fn => rigs.push(fn), from: new THREE.Vector3(0, 1.2, 0), at: new THREE.Vector3(0, 30, -150), durationMs: 3000 });
  r.start();
  assert.equal(typeof rigs[0], 'function');
  assert.equal(scene.children.length, 1);
  rigs[0](camera, 0.016);
  let alive = true, t = 0;
  while (alive && t < 5) { alive = r.update(0.1); t += 0.1; }
  assert.equal(alive, false);
  assert.equal(rigs.at(-1), null);
  assert.equal(scene.children.length, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-art.test.mjs` → FAIL (module not found)

- [ ] **Step 3: 구현**

`js/mountain/backdrop.js` (시안 `dev/active/mountain-sled/mockup.html` 의 산·구름 띠를 크기 인자화, `fog: false`):

```js
const SNOW = 0xf6f8fb, SNOW_SHADE = 0xdfe6ef, ROCK = 0x4a4440, ROCK_LIGHT = 0x6b625a;
const FOREST = 0x3f6b34, FOREST_DARK = 0x2f5329, MEADOW = 0xa7924f;

function ridge(a) {
  return Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + 1.3) * 0.3 + Math.sin(a * 23 + 0.4) * 0.2;
}

function heightAt(r, a, R, H) {
  const t = Math.min(r / R, 1);
  if (t < 0.045) return H * Math.pow(1 - 0.045, 1.55) - H * 0.011;
  const gully = ridge(a) * H * 0.025 * Math.sin(Math.PI * Math.min(t * 1.4, 1));
  return Math.max(0, H * Math.pow(1 - t, 1.55) + gully);
}

function colorAt(h, a, H) {
  const k = h / H;
  const gully = Math.max(0, Math.sin(a * 31 + 0.7)) * 0.14 + Math.max(0, Math.sin(a * 19 + 2.1)) * 0.08;
  const snowLine = 0.5 + ridge(a * 1.3 + 2) * 0.06 - gully;
  if (k > snowLine) return Math.sin(a * 17) > 0.35 ? SNOW_SHADE : SNOW;
  if (k > 0.22) return Math.sin(a * 23 + k * 9) > 0 ? ROCK : ROCK_LIGHT;
  const patch = Math.sin(a * 5 + k * 31) * Math.sin(a * 11 - k * 17);
  if (patch > 0.55) return MEADOW;
  return patch < -0.2 ? FOREST_DARK : FOREST;
}

export function mountainMesh(THREE, R, H) {
  const SEG = 96, RINGS = 28, pos = [], col = [], c = new THREE.Color();
  const pt = (i, j) => {
    const r = R * Math.pow(i / RINGS, 1.15), a = (j / SEG) * Math.PI * 2;
    return [Math.cos(a) * r, heightAt(r, a, R, H), Math.sin(a) * r, a];
  };
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const p00 = pt(i, j), p01 = pt(i, j + 1), p10 = pt(i + 1, j), p11 = pt(i + 1, j + 1);
    for (const tri of [[p00, p11, p10], [p00, p01, p11]]) {
      c.setHex(colorAt((tri[0][1] + tri[1][1] + tri[2][1]) / 3, (tri[0][3] + tri[1][3] + tri[2][3]) / 3, H));
      for (const p of tri) { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false }));
}

function cloudBand(THREE, R, H, frontGap) {
  let seed = 11;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const y = H * 0.38, ring = R * (1 - Math.pow(0.38, 1 / 1.55)) + R * 0.03, puffs = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.15;
    if (Math.abs(a - Math.PI / 2) < frontGap) continue;
    const size = R * (0.037 + rnd() * 0.02);
    for (let k = 0; k < 4; k++) {
      const s = size * (0.55 + rnd() * 0.6);
      puffs.push([Math.cos(a) * ring + (rnd() - 0.5) * size * 2.4, y + (rnd() - 0.3) * size * 0.5, Math.sin(a) * ring + (rnd() - 0.5) * size * 1.2, s]);
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0xd4dce6, emissiveIntensity: 0.55, fog: false }), puffs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  puffs.forEach(([x, py, z, s], i) => { m.compose(v.set(x, py, z), q, sc.set(s * 1.3, s * 0.7, s)); mesh.setMatrixAt(i, m); });
  return mesh;
}

export function buildBackdrop(THREE, { radius, height, frontGap }) {
  const group = new THREE.Group();
  group.add(mountainMesh(THREE, radius, height), cloudBand(THREE, radius, height, frontGap));
  return group;
}
```

`js/mountain/gate-art.js`:

```js
function merge(THREE, parts) {
  const geos = parts.map(([geo, x, y, z, sx, sy, sz]) => {
    const g = geo.clone().toNonIndexed();
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz)));
    return g;
  });
  const count = geos.reduce((n, g) => n + g.attributes.position.array.length, 0);
  const pos = new Float32Array(count);
  let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

export function buildGateArt(THREE) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  const wood = merge(THREE, [[box, -1.6, 1.4, 0, 0.35, 2.8, 0.35], [box, 1.6, 1.4, 0, 0.35, 2.8, 0.35], [box, 0, 2.9, 0, 3.8, 0.35, 0.45]]);
  const snow = merge(THREE, [[box, 0, 3.15, 0, 4.0, 0.18, 0.6], [cone, 0, 2.15, -2.6, 1.0, 0.9, 1.0]]);
  const rock = merge(THREE, [[cone, 0, 1.0, -2.6, 1.9, 2.0, 1.9], [cone, -1.3, 0.6, -2.3, 1.0, 1.2, 1.0]]);
  const mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(wood, mat(0x7a5534)), new THREE.Mesh(snow, mat(0xf6f8fb)), new THREE.Mesh(rock, mat(0x5b6a4c)));
  return group;
}
```

`js/mountain/reveal.js`:

```js
import { buildBackdrop } from './backdrop.js';

const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createReveal({ THREE, scene, camera, setCameraRig, from, at, durationMs }) {
  const backdrop = buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 });
  backdrop.position.set(at.x, 0, at.z);
  const startPos = new THREE.Vector3(), startLook = new THREE.Vector3(), look = new THREE.Vector3();
  const peak = new THREE.Vector3(at.x, at.y, at.z);
  let elapsed = 0, running = false;
  const rig = cam => {
    const k = Math.min(1, elapsed / (durationMs / 1000));
    const up = k < 0.35 ? ease(k / 0.35) : k > 0.75 ? ease((1 - k) / 0.25) : 1;
    cam.position.copy(startPos);
    look.copy(startLook).lerp(peak, up);
    cam.lookAt(look);
  };
  return {
    start() {
      startPos.copy(camera.position);
      startLook.copy(from);
      scene.add(backdrop);
      elapsed = 0;
      running = true;
      setCameraRig(rig);
    },
    update(dt) {
      if (!running) return false;
      elapsed += dt;
      if (elapsed < durationMs / 1000) return true;
      running = false;
      scene.remove(backdrop);
      setCameraRig(null);
      return false;
    },
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/mountain-art.test.mjs` → PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/mountain/backdrop.js js/mountain/gate-art.js js/mountain/reveal.js tests/mountain-art.test.mjs
git commit -m "feat(mountain): backdrop, gate landmark and unlock reveal builders"
```

---

### Task 9: 공간 뼈대 — 입구·해금 연출·진입·나가기·클램프·그림자·미니맵

**Files:**
- Create: `js/spaces/mountain.js`, `js/mountain/climb.js`, `js/mountain/terrain.js`
- Modify: `js/game.js`(아래 목록), `js/spaces/doors.js`, `js/shadow-scope.js:48`, `index.html:3945,3961`, `js/i18n-en.js`
- Test: `tests/mountain-climb.test.mjs`, `tests/mountain-wiring.test.mjs`

**Interfaces:**
- Consumes: `MOUNTAIN`, `MOUNTAIN_R`, `MOUNTAIN_GATE`, `setCameraRig` (Task 7), `buildGateArt`, `createReveal`, `mountainMesh` (Task 8), `isMountainOpen` (Task 1), `COURSE`, `centerX` (Task 2)
- Produces (climb.js, 순수): `CLIMB_PATH: {x,z}[]`, `CLIMB_START: {x,z}`, `ACORNS: {x,z,offPath}[]`(6개), `nearestOnPath(p) → {x,z,seg,dist}`, `collectAcorns(p, taken:boolean[], r=1.2) → boolean[]`(새 배열), `atSummit(p) → boolean`
- Produces (terrain.js): `SUMMIT_Y`, `slopePoint(z, x) → {x,y,z}`(공간 로컬), `pathY(i)`, `acornY(i)`, `buildMountainSpace(THREE) → Group`(`userData.acorns` = 도토리 InstancedMesh)
- Produces (spaces/mountain.js): `mountainOpen()`, `spawnMountainGate()`, `enterMountain()`, `exitMountain()`, `mountainAction(nearDoor)`, `mountainMinimapMarks(marks)`, `clampToMountain(p)`, `updateMountain(dt)`, `maybeRevealMountain()`, `MOUNTAIN_EXIT_LOCAL`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/mountain-climb.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIMB_PATH, CLIMB_START, ACORNS, nearestOnPath, collectAcorns, atSummit } from '../js/mountain/climb.js';

test('six acorns, some off the path but reachable', () => {
  assert.equal(ACORNS.length, 6);
  assert.ok(ACORNS.some(a => a.offPath));
  for (const a of ACORNS) assert.ok(nearestOnPath(a).dist <= (a.offPath ? 3.2 : 0.8));
});

test('collectAcorns is immutable and picks only within radius', () => {
  const taken = Array(6).fill(false);
  const next = collectAcorns(ACORNS[0], taken);
  assert.notEqual(next, taken);
  assert.deepEqual(taken, Array(6).fill(false));
  assert.equal(next[0], true);
  assert.equal(next.filter(Boolean).length, 1);
});

test('summit is the last path point and the start is not', () => {
  assert.equal(atSummit(CLIMB_PATH.at(-1)), true);
  assert.equal(atSummit(CLIMB_START), false);
  assert.deepEqual(CLIMB_START, CLIMB_PATH[0]);
});
```

`tests/mountain-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { EN } from '../js/i18n-en.js';

const src = gameSource();
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('atMountain flag is declared, exposed and part of space flags', () => {
  assert.match(src, /let atMountain = false, mountainGroup = null;/);
  assert.match(src, /get atMountain\(\)/);
  assert.match(src, /set atMountain\(v\)/);
  assert.match(src, /if \(mountainGroup\) mountainGroup\.visible = atMountain;/);
});

test('shadow scope freezes village shadows inside the mountain', () => {
  assert.match(read('js/shadow-scope.js'), /'atMountain'/);
});

test('dispatch: action, clamp, minimap, per-frame update, gate spawn, reveal', () => {
  assert.match(src, /if \(atMountain \|\| nearDoor === 'mountain'\) return mountainAction\(nearDoor\);/);
  assert.match(src, /else if \(atMountain\) \{ clampToMountain\(player\.position\);/);
  assert.match(src, /place === 'mountain'\) \{ mountainMinimapMarks\(marks\);/);
  assert.match(src, /updateMountain\(dt\);/);
  assert.match(src, /spawnMountainGate\(\);/);
  assert.match(src, /maybeRevealMountain\(\);/);
});

test('doors know the gate and the inside exit, and inVillage2 excludes the mountain', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /nd = 'mountain'/);
  assert.match(doors, /nd = 'mountainexit'/);
  assert.match(doors, /!atMountain/);
});

test('new visible strings have English', () => {
  for (const ko of ['🏔️ 설산', '🏔️ 설산 오르기', '🏔️ 내일 열려요', '🏔️ 설산이 열렸어요!', '🏔️ 뒤 능선길로 올라 정상에서 썰매를 타요. 나갈 땐 남쪽 문', '🏔️ 썰매 타러 가는 길', '🚪 마을로 돌아가기']) {
    assert.ok(EN[ko], ko);
  }
});

test('minimap label in index.html', () => {
  assert.match(read('index.html'), /'🏔️ 설산'/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-climb.test.mjs tests/mountain-wiring.test.mjs` → FAIL

- [ ] **Step 3: 구현 — `climb.js`**

```js
export const CLIMB_PATH = [
  { x: 6, z: 22 }, { x: 18, z: 12 }, { x: 26, z: -2 }, { x: 24, z: -18 },
  { x: 12, z: -30 }, { x: -2, z: -34 }, { x: -12, z: -26 }, { x: -6, z: -14 }, { x: 0, z: -4 },
];

export const CLIMB_START = CLIMB_PATH[0];

export const ACORNS = [
  { x: 18, z: 12, offPath: false },
  { x: 28.4, z: -1, offPath: true },
  { x: 24, z: -18, offPath: false },
  { x: 11, z: -32.6, offPath: true },
  { x: -12, z: -26, offPath: false },
  { x: -8.6, z: -12.6, offPath: true },
];

function closestOnSeg(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return { x: a.x + dx * t, z: a.z + dz * t };
}

export function nearestOnPath(p) {
  let best = { x: 0, z: 0, seg: 0, dist: Infinity };
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const c = closestOnSeg(p, CLIMB_PATH[i], CLIMB_PATH[i + 1]);
    const dist = Math.hypot(p.x - c.x, p.z - c.z);
    if (dist < best.dist) best = { ...c, seg: i, dist };
  }
  return best;
}

export function collectAcorns(p, taken, r = 1.2) {
  return taken.map((t, i) => t || Math.hypot(p.x - ACORNS[i].x, p.z - ACORNS[i].z) <= r);
}

export function atSummit(p) {
  const s = CLIMB_PATH.at(-1);
  return Math.hypot(p.x - s.x, p.z - s.z) <= 2.5;
}
```

- [ ] **Step 4: 구현 — `terrain.js`**

```js
import { COURSE, centerX } from './course.js';
import { ACORNS, CLIMB_PATH, nearestOnPath } from './climb.js';
import { mountainMesh } from './backdrop.js';

export const SUMMIT_Y = 30;
const SLOPE_DROP = 30;

export function slopePoint(z, x) {
  const k = z / COURSE.length;
  return { x, y: SUMMIT_Y - SLOPE_DROP * k, z: -4 + k * 70 };
}

export function pathY(i) {
  return (i / (CLIMB_PATH.length - 1)) * SUMMIT_Y;
}

export function acornY(i) {
  const n = nearestOnPath(ACORNS[i]);
  return pathY(n.seg) + 0.5;
}

function strip(THREE, pts, width, color) {
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * width / 2, nz = (dx / len) * width / 2;
    const q = [[a.x - nx, a.y, a.z - nz], [a.x + nx, a.y, a.z + nz], [b.x + nx, b.y, b.z + nz], [b.x - nx, b.y, b.z - nz]];
    pos.push(...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
}

function instanced(THREE, geo, color, items) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach(([x, y, z, sc], i) => { m.compose(v.set(x, y, z), q, s.setScalar(sc)); mesh.setMatrixAt(i, m); });
  return mesh;
}

export function buildMountainSpace(THREE) {
  const group = new THREE.Group();
  const body = mountainMesh(THREE, 70, SUMMIT_Y + 4);
  body.material.fog = true;
  body.position.set(0, -2, -10);
  const climbPts = CLIMB_PATH.map((p, i) => ({ x: p.x, y: pathY(i) + 0.05, z: p.z }));
  const slopePts = Array.from({ length: 67 }, (_, i) => {
    const z = i * (COURSE.length / 66);
    const p = slopePoint(z, centerX(z));
    return { ...p, y: p.y + 0.05 };
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9, 20), new THREE.MeshLambertMaterial({ color: 0xe9eef3 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(4, 0.02, 28);
  const flags = instanced(THREE, new THREE.ConeGeometry(0.35, 1.6, 4), 0xe8743c,
    COURSE.flags.flatMap(f => [-1, 1].map(side => { const p = slopePoint(f.z, f.x + side * f.half); return [p.x, p.y + 0.8, p.z, 1]; })));
  const snowballs = instanced(THREE, new THREE.IcosahedronGeometry(1, 0), 0xf6f8fb,
    COURSE.obstacles.filter(o => o.kind === 'snowball').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.6, p.z, o.r * 0.8]; }));
  const rocks = instanced(THREE, new THREE.DodecahedronGeometry(1, 0), 0x6b625a,
    COURSE.obstacles.filter(o => o.kind === 'rock').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.5, p.z, o.r * 0.8]; }));
  const acorns = instanced(THREE, new THREE.IcosahedronGeometry(0.35, 0), 0x9a6a2f,
    ACORNS.map((a, i) => [a.x, acornY(i), a.z, 1]));
  group.add(body, plaza, strip(THREE, climbPts, 3, 0xcfc6b4), strip(THREE, slopePts, COURSE.width, 0xf6f8fb), flags, snowballs, rocks, acorns);
  group.userData = { acorns };
  return group;
}
```

플레이어 높이: 등산로 위에서 `player.position.y` 를 `pathY` 보간값으로 맞춘다(Step 5 `clampToMountain` 에서 같이 처리).

- [ ] **Step 5: 구현 — `spaces/mountain.js` 뼈대**

game.js 에서 import 하는 이름은 천문대 모듈(`js/spaces/observatory.js` 상단 import)과 같은 이름을 쓴다. 이름이 export 목록에 없으면 game.js export 목록에 추가한다.

```js
import * as THREE from 'three';
import { $w, player, scene, camera, ui, snapCamera, setSpaceVisible, setFogExempt, firstHint, setBGMTheme, todayStr, gameState, obstacles, solidCircle, setCameraRig, requestSave } from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { MOUNTAIN, MOUNTAIN_GATE } from '../data/places.js';
import { isMountainOpen } from '../mountain/unlock.js';
import { buildGateArt } from '../mountain/gate-art.js';
import { createReveal } from '../mountain/reveal.js';
import { buildMountainSpace, pathY } from '../mountain/terrain.js';
import { CLIMB_PATH, nearestOnPath } from '../mountain/climb.js';

const PLAZA = { x: 4, z: 28, r: 9 };
export const MOUNTAIN_EXIT_LOCAL = { x: 4, z: 36 };
let reveal = null;

export function mountainOpen() {
  return isMountainOpen(gameState.firstDay, todayStr());
}

export function spawnMountainGate() {
  const art = buildGateArt(THREE);
  art.position.copy(MOUNTAIN_GATE);
  scene.add(art);
  solidCircle(MOUNTAIN_GATE.x - 1.6, MOUNTAIN_GATE.z, 0.4);
  solidCircle(MOUNTAIN_GATE.x + 1.6, MOUNTAIN_GATE.z, 0.4);
  obstacles.push({ x: MOUNTAIN_GATE.x, z: MOUNTAIN_GATE.z - 2.6, r: 2.0 });
}

function ensureMountainSpace() {
  if (!$w.mountainGroup) {
    const g = buildMountainSpace(THREE);
    g.position.copy(MOUNTAIN);
    g.visible = false;
    scene.add(g);
    $w.mountainGroup = g;
  }
  return $w.mountainGroup;
}

export function enterMountain() {
  if (!mountainOpen()) { ui.toast?.('🏔️ 내일 열려요', 2200); return; }
  $w.atMountain = true;
  setFogExempt(player, true);
  ensureMountainSpace().visible = true;
  player.position.set(MOUNTAIN.x + PLAZA.x, 0, MOUNTAIN.z + PLAZA.z);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('mountain', '🏔️', '🏔️ 설산', '🏔️ 뒤 능선길로 올라 정상에서 썰매를 타요. 나갈 땐 남쪽 문');
  setBGMTheme('main'); Sound.blip();
  const first = !gameState.hintsSeen?.mountainVisited;
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), mountainVisited: true };
  requestSave();
  trackEvent('mountain_enter', { first: first ? 1 : 0 });
}

export function exitMountain() {
  $w.atMountain = false;
  setFogExempt(player, false);
  if ($w.mountainGroup) $w.mountainGroup.visible = false;
  setCameraRig(null);
  player.position.set(MOUNTAIN_GATE.x, 0, MOUNTAIN_GATE.z + 4);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible(); setBGMTheme('main');
  trackEvent('mountain_exit');
}

export function clampToMountain(p) {
  const lx = p.x - MOUNTAIN.x, lz = p.z - MOUNTAIN.z;
  if (Math.hypot(lx - PLAZA.x, lz - PLAZA.z) <= PLAZA.r) { p.y = 0; return; }
  const n = nearestOnPath({ x: lx, z: lz });
  const a = CLIMB_PATH[n.seg], b = CLIMB_PATH[n.seg + 1];
  const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const k = Math.hypot(n.x - a.x, n.z - a.z) / segLen;
  p.y = pathY(n.seg) + (pathY(n.seg + 1) - pathY(n.seg)) * k;
  if (n.dist <= 1.5) return;
  const s = 1.5 / n.dist;
  p.x = MOUNTAIN.x + n.x + (lx - n.x) * s;
  p.z = MOUNTAIN.z + n.z + (lz - n.z) * s;
}

export function mountainAction(nearDoor) {
  if (nearDoor === 'mountain') return enterMountain();
  if (nearDoor === 'mountainexit') return exitMountain();
}

export function mountainMinimapMarks(marks) {
  marks.push({ x: MOUNTAIN.x + MOUNTAIN_EXIT_LOCAL.x, z: MOUNTAIN.z + MOUNTAIN_EXIT_LOCAL.z, c: '#c8905a', kind: 'exit' });
  const top = CLIMB_PATH.at(-1);
  marks.push({ x: MOUNTAIN.x + top.x, z: MOUNTAIN.z + top.z, c: '#f6f8fb', kind: 'summit' });
}

export function maybeRevealMountain() {
  if (!mountainOpen() || gameState.hintsSeen?.mountainReveal || $w.atMountain) return;
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), mountainReveal: true };
  requestSave();
  reveal = createReveal({
    THREE, scene, camera, setCameraRig,
    from: new THREE.Vector3(player.position.x, 1.2, player.position.z),
    at: new THREE.Vector3(player.position.x, 30, player.position.z - 150),
    durationMs: 3000,
  });
  reveal.start();
  ui.toast?.('🏔️ 설산이 열렸어요!', 2600);
  trackEvent('mountain_reveal');
}

export function updateMountain(dt) {
  if (reveal && !reveal.update(dt)) reveal = null;
}
```

- [ ] **Step 6: 구현 — game.js·doors.js·shadow-scope.js·index.html·i18n 배선**

`js/game.js` (천문대 줄 옆에 같은 꼴):
- import: data/places 에 `MOUNTAIN, MOUNTAIN_GATE, MOUNTAIN_R`, spaces/mountain.js 에서 `clampToMountain, maybeRevealMountain, mountainAction, mountainMinimapMarks, spawnMountainGate, updateMountain`
- `:473` 다음: `let atMountain = false, mountainGroup = null;`
- `$w` getter/setter(`:277`, `:326` 꼴): `atMountain`, `mountainGroup`
- export 목록(`:7583`, `:7597`): `atMountain`, `mountainGroup` (천문대와 같은 방식)
- `setSpaceVisible`(`:558`): `if (mountainGroup) mountainGroup.visible = atMountain;`
- `_spaceFlags`·`spaceFlags()`(`:2765-2769`): `atMountain`
- `toolZoneKey()`(`:1489`): `if (atMountain) return 'mountain';`
- 지표 스냅샷 `place:`(`:2414`), 미니맵 `place`(`:5656`): `atMountain ? 'mountain'`
- 비 소리(`:569`), 발자국(`:3497`, `:3510`), 날씨 `outdoors`(`:3568`), 비/눈 오버레이(`:4403`, `:4409`): `atMountain` 추가
- 나무·바닥 장식 회피(`:2890`, `:4500`): `dist2D(…, MOUNTAIN_GATE) < 5.5` 추가
- `:4513` 다음: `spawnMountainGate();`
- `VILLAGE_PLACES`(`:5526`): `{ ico: '🏔️', name: '설산', x: MOUNTAIN_GATE.x, z: MOUNTAIN_GATE.z, pri: 1 }`
- `minimapMarks`(`:5575`): `} else if (place === 'mountain') { mountainMinimapMarks(marks);`
- 미니맵 중심·반경(`:5677`, `:5679`): `place === 'mountain' ? MOUNTAIN` / `MOUNTAIN_R`
- 프레임 루프(`:5641`): `updateObservatory(dt, t);` 다음에 `updateMountain(dt);`
- 이동 클램프(`:5876`): 천문대 분기 다음, 마을 기본 분기(`:5894`) 앞에 `else if (atMountain) { clampToMountain(player.position); }`
- 액션(`:6688` 다음): `if (atMountain || nearDoor === 'mountain') return mountainAction(nearDoor);`
- 부팅 후 마을 첫 `play` 프레임 처리부(수확제 광장 게이트를 처리하는 자리)에서 `maybeRevealMountain();` 를 한 번 호출

`js/shadow-scope.js`: `OUT_OF_REACH_FLAGS` 끝에 `'atMountain'`, 위 거리 주석 블록에는 손대지 않는다(새 주석 금지).

`js/spaces/doors.js` (import 에 `MOUNTAIN, MOUNTAIN_GATE`, `mountainOpen, MOUNTAIN_EXIT_LOCAL`):
- 공간 안 분기(`:273` 천문대 분기 옆):

```js
    } else if (atMountain) {
      if (dist2D({ x: MOUNTAIN.x + MOUNTAIN_EXIT_LOCAL.x, z: MOUNTAIN.z + MOUNTAIN_EXIT_LOCAL.z }, player.position) < 1.9) { nd = 'mountainexit'; prompt = '🚪 마을로 돌아가기'; }
```

- 마을 분기(`:312` 천문대 분기 옆):

```js
    } else if (dist2D({ x: MOUNTAIN_GATE.x, z: MOUNTAIN_GATE.z + 2.2 }, player.position) < 2.4) {
      nd = 'mountain'; prompt = mountainOpen() ? '🏔️ 설산 오르기' : '🏔️ 내일 열려요';
      firstHintBanner('mountainGate', '🏔️', '🏔️ 설산', '🏔️ 썰매 타러 가는 길');
```

- `inVillage2()`(`:450`): `&& !atMountain`

`index.html`: 미니맵 바닥색(`:3945`) 체인에 `d.place === 'mountain' ? '#e9eef3'`, 라벨(`:3961`) 체인에 `d.place === 'mountain' ? t('🏔️ 설산')`.

`js/i18n-en.js` `EN` (문구는 착수 전 사용자 검수):

```js
  '🏔️ 설산': '🏔️ Snow Mountain',
  '🏔️ 설산 오르기': '🏔️ Climb the mountain',
  '🏔️ 내일 열려요': '🏔️ Opens tomorrow',
  '🏔️ 설산이 열렸어요!': '🏔️ The snow mountain is open!',
  '🏔️ 뒤 능선길로 올라 정상에서 썰매를 타요. 나갈 땐 남쪽 문': '🏔️ Climb the back ridge and sled down from the top. Exit through the south door',
  '🏔️ 썰매 타러 가는 길': '🏔️ The way to the sled run',
  '🚪 마을로 돌아가기': '🚪 Back to the village',
```

- [ ] **Step 7: 통과 확인**

Run: `node --test tests/mountain-climb.test.mjs tests/mountain-wiring.test.mjs` → PASS
Run: `npm test` → 전부 PASS. 기존 테스트가 공간 목록을 열거해 실패하면(예: `observatory-wiring`, shadow-scope 테스트) 그 목록에 `atMountain`/`mountain` 을 추가한다.

- [ ] **Step 8: 브라우저 확인**

`preview_start {name: "calm-forest"}` (워크트리는 launch.json 이 루트를 띄우므로, 워크트리 경로의 `scripts/serve.py` 로 새 설정을 추가해 띄운다), `?dbg` 로 접속해 `gameState.firstDay = '2000-01-01'` 상태에서:
1. 마을 북쪽 입구 아치·설산 모형이 보이고 프롬프트 `🏔️ 설산 오르기` 가 뜬다 — 스크린샷
2. 처음 마을 진입 때 3초 해금 연출에서 설산·구름 띠가 보이고, 끝나면 카메라가 원래대로 — 스크린샷
3. 입장 → 광장, 능선길 밖으로 못 나감, 오르면 높이가 올라감, 남쪽 문으로 마을 복귀
4. `renderer.info.render.calls`: 마을(입구 추가 전후 차이 ≤ 3), 연출 중(+2), 공간 안(≤ 60)
5. 모바일 세로(375×812)·가로(812×375) 같은 확인

- [ ] **Step 9: 커밋**

```bash
git add js/spaces/mountain.js js/mountain/climb.js js/mountain/terrain.js js/game.js js/spaces/doors.js js/shadow-scope.js index.html js/i18n-en.js tests/mountain-climb.test.mjs tests/mountain-wiring.test.mjs
git commit -m "feat(mountain): gate, reveal, instanced space shell with climb path"
```

---

### Task 10: 등산 수집과 썰매 런타임(입력·HUD·카메라·정산 연결)

**Files:**
- Create: `js/mountain/sled-input.js`, `js/mountain/sled-hud.js`
- Modify: `js/spaces/mountain.js`, `js/game.js`(이동 입력 차단), `js/i18n-en.js`
- Test: `tests/mountain-sled-input.test.mjs`, `tests/mountain-runtime-wiring.test.mjs`

**Interfaces:**
- Consumes: `createSled`, `stepSled`, `tryBoost` (Task 2), `COURSE` (Task 2), `sledBegin`, `sledSettle`, `sledAbandon`, `sledState` (Task 5), `rollDifficulty` (game.js), `ACORNS`, `CLIMB_START`, `collectAcorns`, `atSummit` (Task 9), `slopePoint`, `acornY` (Task 9), `setCameraRig` (Task 7)
- Produces (sled-input.js): `steerFrom({left,right}) → -1|0|1`, `pointerSide(clientX, width) → 'left'|'right'`, `bindSledInput(target, onBoost) → { read(), input(), dispose() }`
- Produces (sled-hud.js): `showCountdown(n)`, `showRunHud({ timeMs, acorns })`, `showResult({ timeMs, best, newBest, coins, leftToday, flags }, onClose)`, `hideSledHud()`, `boostButton() → HTMLButtonElement`
- Produces (spaces/mountain.js): `sledActive() → boolean`, `abandonRun()`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/mountain-sled-input.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { steerFrom, pointerSide } from '../js/mountain/sled-input.js';

test('both sides pressed cancel out', () => {
  assert.equal(steerFrom({ left: true, right: true }), 0);
  assert.equal(steerFrom({ left: true, right: false }), -1);
  assert.equal(steerFrom({ left: false, right: true }), 1);
  assert.equal(steerFrom({ left: false, right: false }), 0);
});

test('screen halves map to sides', () => {
  assert.equal(pointerSide(10, 400), 'left');
  assert.equal(pointerSide(390, 400), 'right');
  assert.equal(pointerSide(200, 400), 'right');
});
```

`tests/mountain-runtime-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';
import { gameSource } from './helpers/game-source.mjs';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');

test('runtime starts a run at the summit with a rolled difficulty', () => {
  assert.match(src, /rollDifficulty\('sled'\)/);
  assert.match(src, /sledBegin\(/);
  assert.match(src, /atSummit\(/);
});

test('runtime settles on finish and abandons on exit mid-run', () => {
  assert.match(src, /sledSettle\(/);
  assert.match(src, /sledAbandon\('climb'/);
  assert.match(src, /sledAbandon\('sled'/);
  assert.match(src, /export function exitMountain\(\)\s*\{\s*abandonRun\(\);/);
});

test('acorns are collected during the climb and become boosts', () => {
  assert.match(src, /collectAcorns\(/);
  assert.match(src, /tryBoost\(/);
});

test('player movement is blocked while sledding', () => {
  assert.match(gameSource(), /if \(sledActive\(\)\) return;/);
});

test('sled HUD strings have English', () => {
  for (const ko of ['🛷 출발!', '🌰 부스터', '🏁 완주!', '🏆 새 최고 기록!', '오늘 보상 {0#}판 남음', '오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요', '확인']) {
    assert.ok(EN[ko], ko);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-sled-input.test.mjs tests/mountain-runtime-wiring.test.mjs` → FAIL

- [ ] **Step 3: 구현 — `sled-input.js`**

```js
export function steerFrom({ left, right }) {
  return left === right ? 0 : left ? -1 : 1;
}

export function pointerSide(clientX, width) {
  return clientX < width / 2 ? 'left' : 'right';
}

export function bindSledInput(target, onBoost) {
  const keys = { left: false, right: false };
  const pointers = new Map();
  let used = 'keys';
  const onKey = down => e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = down;
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = down;
    else if (e.code === 'Space' && down && !e.repeat) onBoost();
    else return;
    used = 'keys';
    e.preventDefault();
  };
  const kd = onKey(true), ku = onKey(false);
  const pd = e => {
    if (e.target?.closest?.('[data-sled-boost]')) return;
    pointers.set(e.pointerId, pointerSide(e.clientX, window.innerWidth));
    used = 'touch';
  };
  const pu = e => pointers.delete(e.pointerId);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  target.addEventListener('pointerdown', pd);
  window.addEventListener('pointerup', pu);
  window.addEventListener('pointercancel', pu);
  return {
    read() {
      const sides = [...pointers.values()];
      return { left: keys.left || sides.includes('left'), right: keys.right || sides.includes('right') };
    },
    input() { return used; },
    dispose() {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      target.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
    },
  };
}
```

- [ ] **Step 4: 구현 — `sled-hud.js`**

시간·도토리는 상단 중앙(컨텍스트 슬롯), 부스터 버튼은 오른쪽 아래 액션 버튼 자리, 결과 패널은 가운데.

```js
import { t } from '../i18n.js';

let root = null;

function ensure() {
  if (root) return root;
  root = document.createElement('div');
  root.id = 'sled-hud';
  root.innerHTML = `
    <div class="sled-top"><span class="sled-time"></span><span class="sled-acorns"></span></div>
    <div class="sled-count"></div>
    <button type="button" class="sled-boost" data-sled-boost></button>
    <div class="sled-result" hidden></div>`;
  const style = document.createElement('style');
  style.textContent = `
    #sled-hud{position:fixed;inset:0;pointer-events:none;z-index:40}
    #sled-hud .sled-top{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 12px);transform:translateX(-50%);display:flex;gap:12px;padding:6px 14px;border-radius:999px;background:rgba(20,28,40,.55);color:#fff;font-size:16px}
    #sled-hud .sled-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4)}
    #sled-hud .sled-boost{position:absolute;right:calc(env(safe-area-inset-right) + 18px);bottom:calc(env(safe-area-inset-bottom) + 18px);width:84px;height:84px;border-radius:50%;border:0;background:#9a6a2f;color:#fff;font-size:15px;pointer-events:auto}
    #sled-hud .sled-boost:disabled{opacity:.45}
    #sled-hud .sled-result{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:240px;padding:18px 20px;border-radius:16px;background:#fffdf7;color:#2a2a28;text-align:center;pointer-events:auto;line-height:1.6}
    #sled-hud .sled-result button{margin-top:10px;padding:8px 18px;border:0;border-radius:10px;background:#3f6b34;color:#fff;font-size:15px}`;
  document.head.appendChild(style);
  document.body.appendChild(root);
  return root;
}

const sec = ms => (ms / 1000).toFixed(2);

export function boostButton() {
  const r = ensure();
  r.style.display = '';
  return r.querySelector('.sled-boost');
}

export function showCountdown(n) {
  ensure().querySelector('.sled-count').textContent = n > 0 ? String(n) : t('🛷 출발!');
}

export function showRunHud({ timeMs, acorns }) {
  const r = ensure();
  r.querySelector('.sled-time').textContent = `⏱️ ${sec(timeMs)}`;
  r.querySelector('.sled-acorns').textContent = `🌰 ${acorns}`;
  const b = r.querySelector('.sled-boost');
  b.textContent = `${t('🌰 부스터')} ${acorns}`;
  b.disabled = acorns <= 0;
}

export function showResult({ timeMs, best, newBest, coins, leftToday, flags }, onClose) {
  const r = ensure();
  r.querySelector('.sled-count').textContent = '';
  r.querySelector('.sled-boost').style.display = 'none';
  const lines = [
    `<b>${t('🏁 완주!')}</b>`,
    `⏱️ ${sec(timeMs)} · 🚩 ${flags}/12`,
    newBest ? t('🏆 새 최고 기록!') : `🏆 ${sec(best)}`,
    coins > 0 ? `🪙 +${coins}` : '',
    leftToday > 0 ? t('오늘 보상 {0#}판 남음', leftToday) : t('오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요'),
  ].filter(Boolean);
  const box = r.querySelector('.sled-result');
  box.innerHTML = `${lines.map(l => `<div>${l}</div>`).join('')}<button type="button">${t('확인')}</button>`;
  box.querySelector('button').onclick = onClose;
  box.hidden = false;
}

export function hideSledHud() {
  if (!root) return;
  root.querySelector('.sled-result').hidden = true;
  root.querySelector('.sled-count').textContent = '';
  root.querySelector('.sled-boost').style.display = '';
  root.style.display = 'none';
}
```

`t(ko, n)` 의 `{0#}` 치환 시그니처는 `js/i18n.js` 를 확인해 맞춘다(인자 방식이 다르면 그 방식으로).

- [ ] **Step 5: 구현 — `spaces/mountain.js` 런타임**

추가 import: `rollDifficulty`(game.js), `createSled, stepSled, tryBoost`(../mountain/sled.js), `COURSE`(../mountain/course.js), `sledBegin, sledSettle, sledAbandon, sledState`(../mountain/sled-run.js), `ACORNS, CLIMB_START, collectAcorns, atSummit`(../mountain/climb.js), `slopePoint, acornY`(../mountain/terrain.js), `bindSledInput, steerFrom`(../mountain/sled-input.js), `showCountdown, showRunHud, showResult, hideSledHud, boostButton`(../mountain/sled-hud.js).

```js
let run = null;

const newRunId = () => crypto.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3) | 8).toString(16); });

export function sledActive() {
  return !!run && (run.phase === 'countdown' || run.phase === 'sled');
}

function daysSinceUnlock() {
  const first = Date.parse(gameState.firstDay);
  const now = Date.parse(todayStr());
  return Number.isFinite(first) && Number.isFinite(now) ? Math.max(0, Math.round((now - first) / 86400000) - 1) : null;
}

function setAcornVisible(i, on) {
  const mesh = $w.mountainGroup?.userData.acorns;
  if (!mesh) return;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(ACORNS[i].x, acornY(i), ACORNS[i].z), new THREE.Quaternion(), new THREE.Vector3().setScalar(on ? 1 : 0));
  mesh.setMatrixAt(i, m);
  mesh.instanceMatrix.needsUpdate = true;
}

function startClimb() {
  ACORNS.forEach((_, i) => setAcornVisible(i, true));
  run = { phase: 'climb', runId: newRunId(), diff: null, taken: Array(ACORNS.length).fill(false), climbStart: performance.now(), frames: 0, frameMs: 0 };
}

function ctxOf() {
  return {
    runId: run.runId, diff: run.diff,
    acornsAvailable: ACORNS.length, acornsCollected: run.taken.filter(Boolean).length,
    climbMs: run.climbMs ?? Math.round(performance.now() - run.climbStart),
    daysSinceUnlock: daysSinceUnlock(),
    input: run.input ? run.input.input() : 'keys',
    orientation: innerWidth < innerHeight ? 'portrait' : 'landscape',
  };
}

function courseFor(diff) {
  const k = 2 - (diff?.ease ?? 1);
  return { ...COURSE, obstacles: COURSE.obstacles.map(o => ({ ...o, r: o.r * k })) };
}

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

function sledCamera(cam, dt) {
  const s = run.sled;
  const p = slopePoint(s.z, s.x);
  const ahead = slopePoint(Math.min(s.z + 18, COURSE.length), s.x);
  const k = 1 - Math.pow(0.02, dt);
  camPos.lerp(_a.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y + 4.2, MOUNTAIN.z + p.z - 7), k);
  camLook.lerp(_b.set(MOUNTAIN.x + ahead.x, ahead.y - 2, MOUNTAIN.z + ahead.z), k);
  cam.position.copy(camPos);
  cam.lookAt(camLook);
}

function boost() {
  if (run?.phase === 'sled') run.sled = tryBoost(run.sled);
}

function startSled() {
  run.climbMs = Math.round(performance.now() - run.climbStart);
  run.diff = rollDifficulty('sled');
  run.course = courseFor(run.diff);
  run.sled = createSled(run.taken.filter(Boolean).length);
  run.phase = 'countdown';
  run.count = 3;
  run.countT = 0;
  run.input = bindSledInput(document.body, boost);
  boostButton().onclick = boost;
  sledBegin(ctxOf());
  const p = slopePoint(0, run.sled.x);
  camPos.set(MOUNTAIN.x + p.x, p.y + 4.2, MOUNTAIN.z + p.z - 7);
  camLook.set(MOUNTAIN.x + p.x, p.y, MOUNTAIN.z + p.z + 10);
  setCameraRig(sledCamera);
  showCountdown(3);
  showRunHud({ timeMs: 0, acorns: run.sled.acorns });
}

function finishSled() {
  const fpsAvg = run.frames ? Math.round(1000 / (run.frameMs / run.frames)) : null;
  const res = sledSettle(run.sled, ctxOf(), { fpsAvg });
  run.input.dispose();
  setCameraRig(null);
  run.phase = 'result';
  player.position.set(MOUNTAIN.x + 4, 0, MOUNTAIN.z + 28);
  snapCamera();
  showResult({ ...res, best: sledState().best ?? res.timeMs, flags: run.sled.flagsPassed }, () => { hideSledHud(); run = null; });
}

export function abandonRun() {
  if (!run) return;
  if (run.phase === 'climb') sledAbandon('climb', ctxOf(), null);
  else if (run.phase === 'countdown' || run.phase === 'sled') {
    sledAbandon('sled', ctxOf(), run.sled);
    run.input?.dispose();
    setCameraRig(null);
  }
  hideSledHud();
  run = null;
}

export function updateMountain(dt) {
  if (reveal && !reveal.update(dt)) reveal = null;
  if (!$w.atMountain) return;
  const local = { x: player.position.x - MOUNTAIN.x, z: player.position.z - MOUNTAIN.z };
  if (!run && Math.hypot(local.x - CLIMB_START.x, local.z - CLIMB_START.z) < 2) startClimb();
  if (!run) return;
  if (run.phase === 'climb') {
    const next = collectAcorns(local, run.taken);
    next.forEach((v, i) => { if (v && !run.taken[i]) { setAcornVisible(i, false); Sound.harvest(); } });
    run.taken = next;
    if (atSummit(local)) startSled();
  } else if (run.phase === 'countdown') {
    run.countT += dt;
    if (run.countT >= 1) { run.count -= 1; run.countT = 0; showCountdown(run.count); }
    if (run.count < 0) { run.phase = 'sled'; ensureCountCleared(); }
  } else if (run.phase === 'sled') {
    run.frames += 1;
    run.frameMs += dt * 1000;
    run.sled = stepSled(run.sled, Math.min(50, dt * 1000), steerFrom(run.input.read()), run.course);
    showRunHud({ timeMs: run.sled.t, acorns: run.sled.acorns });
    if (run.sled.finished) finishSled();
  }
}

function ensureCountCleared() {
  document.querySelector('#sled-hud .sled-count').textContent = '';
}
```

- 기존 `updateMountain` 은 위 함수로 바꾼다(해금 연출 줄 유지).
- `exitMountain()` 첫 줄에 `abandonRun();` 를 넣는다.
- `stepSled` 에 `run.course` 를 넘겨 난이도 팔의 장애물 반경이 반영되게 한다. 기록판 공정성을 위해 속도·깃발은 바꾸지 않는다.
- `js/game.js`: 플레이어 이동 입력을 처리하는 함수(`updatePlayer`) 맨 앞에 `if (sledActive()) return;` 를 넣고 `sledActive` 를 spaces/mountain.js 에서 import 한다. 썰매 중 액션 버튼은 숨긴다: `sledActive()` 일 때 액션 버튼 요소의 `hidden` 을 `true` 로(기존 `ui` 에 숨김 함수가 있으면 그것을 쓴다).

`js/i18n-en.js` `EN`:

```js
  '🛷 출발!': '🛷 Go!',
  '🌰 부스터': '🌰 Boost',
  '🏁 완주!': '🏁 Finished!',
  '🏆 새 최고 기록!': '🏆 New best!',
  '오늘 보상 {0#}판 남음': '{0#} rewarded runs left today',
  '오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요': 'All rewards claimed today · You can keep chasing records',
  '확인': 'OK',
```

(`'확인'` 이 이미 있으면 추가하지 않는다.)

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/mountain-sled-input.test.mjs tests/mountain-runtime-wiring.test.mjs` → PASS
Run: `npm test` → 전부 PASS

- [ ] **Step 7: 브라우저 확인(PC·모바일 세로·가로)**

1. 광장에서 등산로 시작점으로 가면 판이 시작되고, 도토리를 주우면 소리와 함께 사라진다
2. 정상에서 3·2·1 → 출발. 활강 카메라에서 아래 사면과 **중턱 구름 띠가 보인다** — 스크린샷(외관의 세 번째 순간)
3. 화면 왼쪽/오른쪽 누르기와 ←→/A/D 로 조향, 부스터 버튼·스페이스로 도토리 1개 소모 가속
4. 완주 결과 패널: 시간, 깃발, 최고 기록, 코인, 남은 보상 판수, 확인 버튼
5. 4번째 판은 보상 없이 기록만
6. 도중에 나가면 포기 행이 남는다(오프라인 폴백 로그 또는 운영 DB 행)
7. 공간 안 `renderer.info.render.calls` ≤ 60, 모바일 평균 fps 기록

- [ ] **Step 8: 커밋**

```bash
git add js/mountain/sled-input.js js/mountain/sled-hud.js js/spaces/mountain.js js/game.js js/i18n-en.js tests/mountain-sled-input.test.mjs tests/mountain-runtime-wiring.test.mjs
git commit -m "feat(mountain): climb collection and sled runtime with HUD and camera"
```

---

### Task 11: 정상 기록판(`sled` 보드)

**Files:**
- Create: `sql/migrations/migrate_leaderboard_sled.sql`
- Modify: `functions/api/leaderboard.js` (`BOARDS`), `index.html:5906-5960` (`LB_BOARDS`), `js/i18n-en.js`
- Test: `tests/mountain-leaderboard.test.mjs`

**Interfaces:**
- Consumes: `sled_runs` (Task 6)
- Produces: `leaderboard('sled', uid)` — 점수 `s = -min(time_ms)`(오늘 KST, 완주만)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('RPC keeps every existing board and adds sled over today finished runs', () => {
  const sql = read('sql/migrations/migrate_leaderboard_sled.sql');
  assert.match(sql, /p_board = 'sled'/);
  assert.match(sql, /-min\(time_ms\)/);
  assert.match(sql, /outcome = 'finish'/);
  assert.match(sql, /run_date = kst_today/);
  for (const b of ['boat', 'sea', 'rich', 'mine', 'cook', 'quest']) assert.match(sql, new RegExp(`'${b}'`), b);
});

test('proxy whitelists sled', () => {
  assert.match(read('functions/api/leaderboard.js'), /'sled'/);
});

test('client board formats the negated score back to seconds', () => {
  const html = read('index.html');
  assert.match(html, /id:\s*'sled'/);
  assert.match(html, /\(-v \/ 1000\)\.toFixed\(2\)/);
  assert.ok(EN['🛷 썰매']);
  assert.ok(EN['오늘 설산 썰매 최고 기록']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/mountain-leaderboard.test.mjs` → FAIL

- [ ] **Step 3: 구현**

`sql/migrations/migrate_leaderboard_sled.sql`: 최신 `sql/migrations/migrate_leaderboard_sea_species_icon.sql` 의 `create or replace function public.leaderboard(...)` 정의 전체를 **그대로 복사**하고, 마지막 보드 `elsif` 분기 다음에 아래 분기만 추가한다. 다른 줄은 바꾸지 않는다. 복사 원본의 `sc` 구성 방식(변수명·`jsonb_agg` 형태)이 아래와 다르면 원본 형태에 맞춰 같은 의미로 쓴다.

```sql
  elsif p_board = 'sled' then
    select coalesce(jsonb_agg(jsonb_build_object('u', user_id, 's', s)), '[]'::jsonb) into sc
      from (
        select user_id, -min(time_ms)::bigint as s
          from public.sled_runs
         where run_date = kst_today and outcome = 'finish' and user_id is not null and time_ms is not null
         group by user_id
      ) t;
```

`functions/api/leaderboard.js`:

```js
const BOARDS = new Set(['boat', 'sea', 'rich', 'quest', 'mine', 'cook', 'sled']);
```

`index.html` `LB_BOARDS` 마지막 항목 다음:

```js
  { id: 'sled', label: '🛷 썰매', unit: '초', desc: '오늘 설산 썰매 최고 기록', fmt: v => (-v / 1000).toFixed(2) },
```

`js/i18n-en.js`:

```js
  '🛷 썰매': '🛷 Sled',
  '오늘 설산 썰매 최고 기록': "Today's best sled time",
```

- [ ] **Step 4: 통과 확인 후 운영 DB 적용**

Run: `node --test tests/mountain-leaderboard.test.mjs` → PASS

풀러로 마이그레이션을 실행한 뒤:

```sql
select public.leaderboard('sled', null);
select public.leaderboard('boat', null) is not null as boat_ok;
```

Expected: `sled` 는 빈 `top`, `boat_ok = true`(기존 보드 무사).

- [ ] **Step 5: 커밋**

```bash
git add sql/migrations/migrate_leaderboard_sled.sql functions/api/leaderboard.js index.html js/i18n-en.js tests/mountain-leaderboard.test.mjs
git commit -m "feat(mountain): sled board on the daily leaderboard"
```

---

### Task 12: 통합 검증·리뷰·배포 점검표

**Files:**
- Modify: `dev/active/mountain-sled/mountain-sled-context.md`, `dev/active/mountain-sled/mountain-sled-tasks.md`

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. 실패는 원인을 고치고 다시 실행한다(관계없는 실패로 넘기지 않는다).

- [ ] **Step 2: 실측 기록**

PC(1280×720), 모바일 세로(375×812), 가로(812×375)에서 스크린샷과 숫자를 남긴다.
- 마을 평소 드로우콜 차이(입구 추가 전후 ≤ 3)
- 해금 연출 중 드로우콜(+2)
- 산 공간 안 드로우콜(≤ 60), 활강 중 평균 fps
- 해금 연출·입구 랜드마크·활강 카메라 구름 띠 장면

- [ ] **Step 3: 코드 리뷰**

`code-reviewer` 에이전트로 `git diff origin/main...HEAD` 를 리뷰한다. CRITICAL·HIGH 는 고치고 Step 1 을 다시 돌린다.

- [ ] **Step 4: 배포 점검표를 dev docs 에 기록**

- 4곳(웹·토스·Play·iOS) 동시 배포: 새 세이브 키 `firstDay`, `mountain`
- 운영 DB: `migrate_sled_runs.sql`, `migrate_leaderboard_sled.sql` 적용 여부
- Worker: `functions/api/leaderboard.js` 배포
- 배포 다음 날 BigQuery: `sled_start`, `sled_result`, `mountain_enter`, `mountain_reveal` 적재, `ga_param_overflow` 0건, `sled_runs` 행 수와 GA4 `sled_result` 수 대조
- 푸시 전 키 스캔(`git grep -n -E "AIza|GOCSPX-"` 등 기존 절차)
- 공지는 토스 출시 후

- [ ] **Step 5: 커밋**

```bash
git add dev/active/mountain-sled
git commit -m "docs(mountain): stage 1 verification notes and deploy checklist"
```

---

## 2·3단계

- 2단계(📸 정상 전망대): 1단계 병합 후 `docs/superpowers/plans/YYYY-MM-DD-mountain-sled-stage2.md` 로 따로 쓴다. 정상 도착(`atSummit` → `startSled` 직전)에 전망대 단계를 끼우고, `sled_runs.photo_taken` 컬럼을 그때 마이그레이션으로 추가한다.
- 3단계(❄️ 얼음 낚시): `js/spaces/fishing.js` 일반화가 핵심이라 별도 계획으로 쓴다. 기존 호수 낚시 테스트 선통과가 첫 태스크다.
- 데이터 파이프라인(스펙 §7): Airflow `sled_features_daily` 마트는 `sled_runs` 에 실제 행이 쌓인 뒤(1단계 출시 후 약 1주) 별도 작업으로 만든다. 1단계는 원본 기록을 빠짐없이 남기는 데까지다.
