# 🧰 나룻배 보물상자 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 나룻배 코스(강) 후반에 하루 한 번 보물상자가 떠내려오고, 건지면 런 결과에서 코인 없는 보상(묘목·미끼·비료·별조각 등)을 받는다.

**Architecture:** 보상 규칙은 순수 모듈 `js/boat-chest.js`(시드 → 상자 위치·내용물). `river.js` 의 `buildCourse` 에 `kind:'chest'` 한 개를 끼우고,
기존 `pick` 줍기 판정·`endBoatRun` 정산·결과 카드를 확장한다. 오늘 건졌는지는 `gameState.boat.chestDate` 하나로 판정한다.

**Tech Stack:** Vanilla JS · Three.js(절차 생성 메시) · node:test · Supabase(`boat_runs`)

**Spec:** 2026-09-29 대화 합의 — 보물상자 → 요리 심사 → 사공 퀴즈 순서. **디자인은 사용자 검토 필수**, **트래킹은 체크리스트 전 항목 적용**.

## Global Constraints

- **⏸️ 디자인 게이트: 상자 외형·건지는 연출·결과 카드·보상표는 사용자 승인 전에 게임 코드에 넣지 않는다.** 시안은 3개 이상 나란히, PC+모바일 둘 다 캡처.
- 나룻배는 **코인을 주지 않는다**(인플레 방지). 상자도 코인 금지.
- 하루 1개: 건질 때까지 그날 런마다 나오고, 건지면 그날은 안 나온다.
- 코스는 날짜 시드 → 상자 위치·내용물도 같은 시드에서 파생. **상자가 없는 날의 코스는 지금과 한 칸도 달라지지 않는다**(난수 소비 순서 보존).
- 줍기 텍스트는 배 앞 10 유닛(폰 세로 잘림 방지 — 기존 pick 규칙).
- **`boat_runs` 는 고정 컬럼 insert** → 새 필드를 보내기 전에 **마이그레이션을 먼저 적용**한다(안 하면 런 기록 insert 가 통째로 실패해 리더보드가 빈다).
- 헤드리스 캡처는 한글 폰트 폭 착시·고정 스텝 시계 주의.

## 📊 Tracking Spec (체크리스트 적용)

**식별자:** 상자 내용물 id = `CHEST_LOOT[].id`(`sap_apple`·`bait`·…) — GA4·`boat_runs` 모두 같은 문자열. (`econ_logs` 는 **코인 전용**(`logEcon` 은 `r.coins` 일 때만)이라 코인 없는 상자는 거기 안 남는다 — 지급 원장은 `boat_runs.chest_loot`+`chest_paid` 다.) 런은 `run_no`+`seed` 로 묶는다.

**생명주기 (한 런 안에서 같은 `run_no`):**

| 단계 | 이벤트 / 필드 | 파라미터 |
|---|---|---|
| 노출 예정 | `boat_start` 에 추가 | `has_chest`(0/1) |
| 화면에 등장 | `boat_chest_seen` (최초 메시 획득 1회) | `run_no, seg, chest_d, chest_x, speed` |
| 건짐 | `boat_chest_take` | `run_no, loot, seg, dist_m, dx`(배와 상자 x 거리), `speed, lamps_left, night, weather` |
| 놓침 | `boat_chest_miss` (상자를 지나친 순간 1회) | `run_no, seg, dx_min`(가장 가까웠던 거리), `speed, lamps_left` |
| 정산 | `boat_end` 에 추가 | `chest`(0=없음·1=놓침·2=건짐), `chest_loot`, `chest_paid`(규칙에 따라 실제 지급 0/1) |
| 원장 | `giveReward(give, 'boat_chest', loot)` 로 **따로** 지급(출처 구분, 향후 코인 섞일 때 대비) | 실제 원장 = `boat_runs.chest_loot`·`chest_paid` |
| DB | `boat_runs` 컬럼 4개 추가 | `chest smallint, chest_loot text, chest_paid smallint, chest_d real` |

**제어 파라미터(8번):** 상자 위치 `chest_d`·`chest_x` 는 날마다 시드로 **자연히 흔들린다** → 위치·속도·구간별 건짐률을 배울 수 있다. 그래서 `seen`/`take`/`miss` 모두에 싣는다.
**DB 결정:** `boat_runs` 에 4컬럼(마이그레이션) — 코인 없는 보상의 유일한 서버 원장이다. 별도 테이블은 불필요.
**검증:** 배포 당일 `boat_runs` 에서 `chest` 분포 확인, **다음 날 BQ** 에서 `boat_chest_*` 3종과 `boat_end.chest` 가 같은 `run_no` 로 조인되는지 확인.
**GA4 예약어** 금지(source·medium·campaign·term·content). `ACTION_EVENTS`(`js/retention-guidance.js:25`)는 `boat_` 접두사 규칙으로 자동 포함 — 확인만.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/boat-chest.js` (신규) | `CHEST_LOOT`, `CHEST_ZONE`, `chestToday`, `placeChest`, `rollChest`, `chestOutcome` — 순수 |
| `js/spaces/river.js` (수정) | `startBoatRun`·`buildCourse`·`makeRiverMesh`·`updateRiverObjects`·`endBoatRun` |
| `js/game.js` (수정) | 런 상태 `boat.chest*`, 세이브 기본값 `boat.chestDate` |
| `index.html` (수정) | `showBoatResult` 상자 줄 |
| `js/i18n-en.js` (수정) | 새 문구 |
| `sql/migrations/migrate_boat_runs_chest.sql` (신규) | `boat_runs` 3컬럼 |
| `sims/boat-chest/chest-options.html` (신규) | 디자인 시안(3안) |
| `tests/boat-chest.test.mjs` (신규) | 규칙·배선·트래킹 |

---

### Task 1: ⏸️ 디자인 시안과 검토 (코드 전에)

**Files:** Create `sims/boat-chest/chest-options.html` (three.js CDN, self-contained — 워크트리 preview 함정 회피)

- [ ] **Step 1: 상자 외형 3안 렌더** — 같은 강물·조명(낮/밤)에서, 게임 카메라 거리(배 뒤 3인칭)로.
  - A안 **나무 궤짝 + 금테**: 박스 몸통 + 반원통 뚜껑 + 금색 띠 2줄 + 자물쇠.
  - B안 **부표 달린 작은 궤짝**: A 보다 작게, 빨강·흰 부표와 밧줄 — 떠내려온 이유가 보인다.
  - C안 **바구니 + 병 속 쪽지**: 등나무 바구니에 유리병·천 덮개. 금속 없음, 동화 톤.
  - 공통: 드로우콜 3 이하(재질별 병합), bob 흔들림, 반짝임 1개, 밤 발광은 블룸 임계 0.85 이하.
- [ ] **Step 2: 건지는 연출 2~3안** — ① pick 처럼 글자+반짝임 ② 배 위로 포물선+뚜껑 열림 1초 ③ ②+효과음 강조. 고정 스텝 시계로 프레임 캡처.
- [ ] **Step 3: 결과 카드 2~3안** — 기존 결과 카드 캡처 위에 상자 줄 모형. PC(1280)+모바일(375).
- [ ] **Step 4: 보상표·규칙 검토**

| 내용물 id | 보상 | 확률 초안 |
|---|---|---|
| `sap_apple` | 🍎 사과 묘목 1 | 10% |
| `sap_pear` | 🍐 배 묘목 1 | 5% |
| `bait` | 🪱 미끼 3 | 25% |
| `fert` | 🌱 비료 2 | 20% |
| `star` | ⭐ 별조각 8 | 25% |
| `color` | 🎨 집 색 1종(`tryUnlockDrop(1)`, 다 열렸으면 ⭐8) | 15% |

  결정: **(a) 완주해야 받는다 / (b) 난파해도 받는다(기존 수집물과 같음)** · 위치 **3구간 70~85%** vs **2구간**.
- [ ] **Step 5: 승인 기록** — 고른 안·수치를 `boat-chest-context.md` 에. 승인 없으면 Task 2 이후 금지.

---

### Task 2: 규칙 모듈 `js/boat-chest.js`

**Files:** Create `js/boat-chest.js`, Test `tests/boat-chest.test.mjs`

**Interfaces — Produces:** `CHEST_LOOT`, `CHEST_ZONE`, `chestToday(st, today) → bool`, `placeChest(rnd, {len,width}) → {d,x}`, `rollChest(seed) → loot`, `chestOutcome({ offered, taken }) → 0|1|2`, `chestPaid(result, rule) → bool`

- [ ] **Step 1: 실패 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHEST_LOOT, CHEST_ZONE, chestToday, placeChest, rollChest, chestOutcome, chestPaid } from '../js/boat-chest.js';

const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

test('CHEST_LOOT: 가중치 합 100, 코인 없음, id 가 고유', () => {
  assert.equal(CHEST_LOOT.reduce((a, l) => a + l.w, 0), 100);
  assert.equal(new Set(CHEST_LOOT.map(l => l.id)).size, CHEST_LOOT.length);
  for (const l of CHEST_LOOT) assert.ok(!('coins' in (l.give || {})), `${l.id}: 나룻배는 코인을 주지 않는다`);
});

test('chestToday: 오늘 건졌으면 false, 날이 바뀌면 다시 true', () => {
  assert.equal(chestToday({ chestDate: null }, '2026-10-01'), true);
  assert.equal(chestToday({ chestDate: '2026-10-01' }, '2026-10-01'), false);
  assert.equal(chestToday({ chestDate: '2026-09-30' }, '2026-10-01'), true);
});

test('placeChest: 승인 구간 안, 강폭 안쪽', () => {
  for (let s = 1; s < 200; s++) {
    const { d, x } = placeChest(mulberry(s), { len: 620, width: 6.4 });
    assert.ok(d >= 620 * CHEST_ZONE[0] && d <= 620 * CHEST_ZONE[1], `d=${d}`);
    assert.ok(Math.abs(x) <= 6.4 - 1.3, `x=${x}`);
  }
});

test('rollChest: 같은 시드 같은 결과, 분포가 가중치를 따른다', () => {
  assert.deepEqual(rollChest(42), rollChest(42));
  const n = {}; for (let s = 0; s < 20000; s++) { const r = rollChest(s * 7919); n[r.id] = (n[r.id] || 0) + 1; }
  for (const l of CHEST_LOOT) assert.ok(Math.abs(n[l.id] / 20000 - l.w / 100) < 0.02, l.id);
});

test('chestOutcome·chestPaid: 트래킹 코드와 지급 규칙', () => {
  assert.equal(chestOutcome({ offered: false, taken: false }), 0);
  assert.equal(chestOutcome({ offered: true, taken: false }), 1);
  assert.equal(chestOutcome({ offered: true, taken: true }), 2);
  assert.equal(chestPaid('wreck', 'clear_only'), false);
  assert.equal(chestPaid('clear', 'clear_only'), true);
  assert.equal(chestPaid('wreck', 'always'), true);
  assert.equal(chestPaid('quit', 'always'), true);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/boat-chest.test.mjs` → FAIL(모듈 없음)
- [ ] **Step 3: 구현** (수치·`CHEST_RULE` 는 Task 1 승인값)

```js
// =============================================================
//  🧰 나룻배 보물상자 — 하루 한 번, 코스 후반에 떠내려온다
//  ▶ 나룻배는 코인을 주지 않는다(인플레 방지) → 상자도 재료·묘목·별조각만.
//  ▶ 코스가 날짜 시드라 상자 위치·내용물도 시드에서 파생 — 그날은 모두 같다.
//  ▶ id 는 GA4(loot·chest_loot)·econ_logs.item·boat_runs.chest_loot 에 같은 문자열로 쓴다.
//  ▶ 순수 모듈(Three·game.js 의존 없음).
// =============================================================
export const CHEST_LOOT = [
  { id: 'sap_apple', ico: '🍎', name: '사과 묘목', w: 10, give: { sap_apple: 1 } },
  { id: 'sap_pear',  ico: '🍐', name: '배 묘목',   w: 5,  give: { sap_pear: 1 } },
  { id: 'bait',      ico: '🪱', name: '미끼 3개',  w: 25, give: { bait: 3 } },
  { id: 'fert',      ico: '🌱', name: '비료 2개',  w: 20, give: { fert: 2 } },
  { id: 'star',      ico: '⭐', name: '별조각 8',  w: 25, give: { star: 8 } },
  { id: 'color',     ico: '🎨', name: '집 색 하나', w: 15, give: null },   // tryUnlockDrop(1) — 다 열렸으면 star 8
];
export const CHEST_ZONE = [0.70, 0.85];     // 코스 진행도 — 3구간 안
export const CHEST_RULE = 'always';          // 'always' | 'clear_only' — Task 1 승인값

export const chestToday = (st, today) => st?.chestDate !== today;

export function placeChest(rnd, { len, width }) {
  const d = len * (CHEST_ZONE[0] + rnd() * (CHEST_ZONE[1] - CHEST_ZONE[0]));
  const x = (rnd() * 2 - 1) * (width - 1.3);
  return { d, x };
}

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function rollChest(seed) {
  let r = mulberry32(seed ^ 0xC4E57)() * 100;
  for (const l of CHEST_LOOT) { if ((r -= l.w) < 0) return l; }
  return CHEST_LOOT[CHEST_LOOT.length - 1];
}

// boat_end.chest / boat_runs.chest — 0 없음 · 1 놓침 · 2 건짐
export const chestOutcome = ({ offered, taken }) => (!offered ? 0 : taken ? 2 : 1);
export const chestPaid = (result, rule = CHEST_RULE) => rule === 'always' || result === 'clear';
```

- [ ] **Step 4: 통과 확인** → PASS
- [ ] **Step 5: Commit** — `git add js/boat-chest.js tests/boat-chest.test.mjs && git commit -m "feat: 🧰 나룻배 보물상자 규칙(하루 1개·코인 없는 보상표)"`

---

### Task 3: DB 마이그레이션 (클라이언트보다 먼저)

**Files:** Create `sql/migrations/migrate_boat_runs_chest.sql`

- [ ] **Step 1:** 현재 컬럼 확인 — `select column_name, data_type from information_schema.columns where table_name = 'boat_runs' order by ordinal_position;`
- [ ] **Step 2:** 마이그레이션 작성

```sql
-- 🧰 나룻배 보물상자 — 런 단위 기록(리더보드 원천 boat_runs 에 4컬럼). econ_logs 는 코인 전용이라 여기가 지급 원장
--   chest: 0 없음 · 1 놓침 · 2 건짐 (js/boat-chest.js chestOutcome)
--   ⚠️ 클라이언트 배포 전에 적용 — boat_runs 는 고정 컬럼 insert 라 모르는 필드가 오면 행 전체가 실패한다.
alter table public.boat_runs
  add column if not exists chest smallint not null default 0 check (chest between 0 and 2),
  add column if not exists chest_loot text,
  add column if not exists chest_paid smallint check (chest_paid in (0, 1)),
  add column if not exists chest_d real;
```

- [ ] **Step 3:** ⏸️ 사용자 확인 후 적용(Supabase MCP 는 읽기 전용 — 사용자가 SQL 에디터에서 실행하거나 승인받아 적용). 적용 뒤 Step 1 쿼리로 확인.
- [ ] **Step 4: Commit** — `git add sql/migrations/migrate_boat_runs_chest.sql && git commit -m "chore: 🧰 boat_runs 에 보물상자 컬럼"`

---

### Task 4: 코스·줍기·정산·트래킹 배선

**Files:** Modify `js/spaces/river.js`(`startBoatRun` 332, `buildCourse` 249, `makeRiverMesh` 283, `updateRiverObjects` 585·줍기 612, `endBoatRun` 407), `js/game.js`(런 상태 450, 세이브 기본값 970), Test `tests/boat-chest.test.mjs`

**Interfaces:** Consumes Task 2. Produces `buildCourse(seed, night, { chest })`, 런 상태 `boat.chestOffered, boat.chestTaken, boat.chest, boat.chestSeen, boat.chestDxMin, boat.chestPos`.

- [ ] **Step 1: 배선·트래킹 실패 테스트**

```js
import { gameSource } from './helpers/game-source.mjs';
const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };

test('buildCourse: 오늘 상자가 남았을 때만, 루프 뒤에 한 개(상자 없는 날 코스 불변)', () => {
  const b = fn('buildCourse');
  assert.match(b, /opts\.chest[\s\S]{0,200}placeChest\(rnd/);
  assert.ok(b.indexOf('placeChest') > b.indexOf('d += gap'), '루프가 끝난 뒤에만 난수를 더 쓴다');
  assert.match(fn('startBoatRun'), /chest: chestToday\(gameState\.boat, todayStr\(\)\)/);
});
test('boat_start 에 has_chest', () => {
  assert.match(fn('startBoatRun'), /trackEvent\('boat_start',[\s\S]{0,300}has_chest:/);
});
test('생명주기 이벤트 3종이 run_no 와 위치·속도를 싣는다', () => {
  const u = fn('updateRiverObjects');
  for (const ev of ['boat_chest_seen', 'boat_chest_take', 'boat_chest_miss']) {
    const i = u.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, ev);
    const call = u.slice(i, u.indexOf('});', i));
    for (const p of ['run_no', 'seg', 'speed']) assert.match(call, new RegExp(`${p}:`), `${ev}.${p}`);
  }
  assert.match(u, /trackEvent\('boat_chest_take'[\s\S]{0,300}loot:[\s\S]{0,300}dx:/);
  assert.match(u, /trackEvent\('boat_chest_miss'[\s\S]{0,300}dx_min:/);
  assert.match(u, /gameState\.boat\.chestDate = todayStr\(\)/);
});
test('정산: 원장은 boat_chest 로 따로, boat_end·boat_runs 에 chest 3종, 코인 없음', () => {
  const e = fn('endBoatRun');
  assert.match(e, /giveReward\([^)]*'boat_chest', boat\.chest\.id\)/);
  assert.match(e, /trackEvent\('boat_end',[\s\S]{0,600}chest: chestCode,[\s\S]{0,100}chest_loot:[\s\S]{0,100}chest_paid:/);
  assert.match(e, /chest: chestCode, chest_loot:[^\n]*chest_paid:[^\n]*chest_d:/);   // sendBoatRun payload
  assert.doesNotMatch(e.slice(e.indexOf('boat.chest')), /coins/);
});
test('세이브 기본값에 chestDate', () => {
  assert.match(src, /boat: \{ date: null, count: 0,[^\n]*chestDate: null/);
});
```

- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현**
  - `startBoatRun`: `const offered = chestToday(gameState.boat, todayStr());` → `buildCourse(boat.seed, boat.night, { chest: offered })`, 런 상태 초기화 `boat.chestOffered = offered; boat.chestTaken = false; boat.chest = null; boat.chestSeen = false; boat.chestDxMin = Infinity; boat.chestPos = null;`. 기존 `trackEvent('boat_start', {...})` 에 `has_chest: offered ? 1 : 0`.
  - `buildCourse(seed, night, opts = {})`: 루프 뒤, 정렬 전에
    ```js
    if (opts.chest) {                               // 🧰 루프가 끝난 뒤에만 난수를 더 쓴다 → 상자 없는 날 코스는 그대로
      const c = placeChest(rnd, { len: RIVER_LEN, width: RIVER_W });
      riverCourse.push({ d: c.d, kind: 'chest', x: c.x });
    }
    ```
  - `makeRiverMesh('chest')`: Task 1 승인 안(재질별 `mergeGeos`).
  - `updateRiverObjects`:
    ```js
    // 🧰 처음 화면에 들어온 순간 1회
    if (it.kind === 'chest' && !boat.chestSeen) {
      boat.chestSeen = true; boat.chestPos = { d: it.d, x: it.x };
      trackEvent('boat_chest_seen', { run_no: boat.runNo, seg, chest_d: Math.round(it.d), chest_x: Math.round(it.x * 10) / 10, speed: Math.round(boat.speed * 10) / 10 });
    }
    // 가까워지는 동안 최소 거리 기록 → 놓쳤을 때 "얼마나 아깝게"
    if (it.kind === 'chest' && !a.taken) boat.chestDxMin = Math.min(boat.chestDxMin, dx);
    ```
    줍기(기존 pick 판정과 같은 반경):
    ```js
    boat.chestTaken = true; boat.chest = rollChest(boat.seed);
    gameState.boat.chestDate = todayStr();
    spawnFloatText(player.position.x, 1.9, player.position.z - 10, `🧰 ${boat.chest.ico} ${boat.chest.name}`, '#c98a1e', 0.9);
    trackEvent('boat_chest_take', { run_no: boat.runNo, loot: boat.chest.id, seg, dist_m: Math.round(boat.dist),
      dx: Math.round(dx * 100) / 100, speed: Math.round(boat.speed * 10) / 10, lamps_left: boat.lamps, night: boat.night, weather: WEATHER });
    ```
    지나침(`passed && !a.taken` 이 처음 참이 되는 순간 1회):
    ```js
    trackEvent('boat_chest_miss', { run_no: boat.runNo, seg, dx_min: Math.round(boat.chestDxMin * 100) / 100,
      speed: Math.round(boat.speed * 10) / 10, lamps_left: boat.lamps });
    ```
  - `endBoatRun`:
    ```js
    const chestCode = chestOutcome({ offered: boat.chestOffered, taken: boat.chestTaken });
    const paid = boat.chest && chestPaid(result);
    if (paid) {
      const g = boat.chest.give || (tryUnlockDrop(1) ? {} : { star: 8 });   // 🎨 다 열렸으면 별조각
      if (Object.keys(g).length) giveReward(g, 'boat_chest', boat.chest.id);   // 지급 원장은 boat_runs.chest_loot·chest_paid(econ_logs 는 코인 전용)
    }
    ```
    `boat_end` 에 `chest: chestCode, chest_loot: boat.chest?.id || null, chest_paid: paid ? 1 : 0`.
    `payload`(sendBoatRun) 에 `chest: chestCode, chest_loot: boat.chest?.id || null, chest_paid: paid ? 1 : 0, chest_d: boat.chestPos ? Math.round(boat.chestPos.d) : null`.
    `showBoatResult` 에 `chest: paid ? { ico: boat.chest.ico, name: boat.chest.name } : (boat.chestTaken ? { lost: true } : null)`.
  - game.js: 세이브 기본값 `boat: { …, chestDate: null }`.
- [ ] **Step 4:** `npm test` 전체 PASS, `.mjs` 복사 문법 검사
- [ ] **Step 5: Commit** — `git commit -m "feat: 🧰 나룻배 코스에 보물상자 — 건지기·정산·생명주기 트래킹"`

---

### Task 5: 결과 카드·문구·검증 (⏸️ 최종 확인)

**Files:** Modify `index.html`(`showBoatResult`), `js/i18n-en.js`

- [ ] **Step 1:** Task 1 승인안대로 결과 카드 상자 줄. 한국어 문구는 승인 후보만. `" · "` 조각 잇기 금지.
- [ ] **Step 2: 브라우저 검증** — 런 시작 → 상자 구간 → 건지기 → 결과 카드. 두 번째 런 상자 없음. 날짜 바꾸면 다시. 밤·비. 모바일 375 세로 줍기 글자·결과 카드. 드로우콜 증가 ≤ 3. 콘솔 에러 0.
- [ ] **Step 3: 트래킹 실측** — 개발 세션에서 `window.gtag`/`trackEvent` 호출을 가로채 한 런에 `boat_start(has_chest=1) → boat_chest_seen → boat_chest_take|miss → boat_end(chest=2|1)` 순서와 파라미터를 로그로 확인해 context 에 붙인다. 상자 없는 날은 `has_chest=0`·`chest=0` 만.
- [ ] **Step 4: ⏸️ 실제 게임 캡처(PC·모바일, 낮·밤)를 사용자에게 보내 최종 확인.**
- [ ] **Step 5:** code-reviewer 에이전트 → CRITICAL/HIGH 수정 → `npm test`
- [ ] **Step 6: Commit** — `git commit -m "feat: 🧰 보물상자 결과 카드·문구"`
- [ ] **Step 7 (배포 다음 날):** BQ 에서 `boat_chest_seen/take/miss` 수와 `boat_end.chest` 분포, `run_no` 조인 확인. `boat_runs` 의 `chest`·`chest_loot`·`chest_paid` 가 GA4 `boat_chest_take` 수와 맞는지 대조.
- 배포는 사용자 결정(마이그레이션 먼저 → 웹·토스 메모·itch·Play 4곳, 공지는 토스 출시 후).
