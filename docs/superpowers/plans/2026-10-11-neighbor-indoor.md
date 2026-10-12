# 🏠 이웃 마을 2단계(집 안 구경) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이웃 앞마당에서 집 문으로 들어가 이웃 집 실내 전 층(가구 포함)을 걸어 다니며 구경하고, 가구 가까이 가면 이름표가 뜨게 한다.

**Architecture:** 서버 `neighbor_showcase` 가 허용 목록 헬퍼 `_nb_room` 으로 `house.decor` 를 `room` 키로 내려 준다 → 클라 `sanitizeShowcase` 가 현재 클라의 가구 id·범위로 다시 거른다 → 순수 규칙(`js/neighbors/indoor-rules.js`)이 배치·이름표·문 자리를 계산 → `js/neighbors/indoor-scene.js` 가 `buildRoomWith`(내 집 방 짓기를 인자화한 것)·`decorMesh` 로 `NEIGHBOR_INT(0,0,780)` 에 짓는다 → `js/spaces/neighbor.js` 가 출입·층 이동·HUD·트래킹을 묶는다. 내 세이브·전역 `indoor`/`houseFloor` 는 건드리지 않는다(이웃 공간 플래그는 `atNeighbor` 하나 유지, 실내 여부는 모듈 안 `visit.indoor`).

**Tech Stack:** Vanilla JS + Three.js · Supabase Postgres(plpgsql) · Cloudflare Worker(변경 없음) · Node `node --test`(소스 텍스트 + 순수 모듈 테스트 — Node 엔 three 가 없다) · GA4

**Spec:** `docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md`

## Global Constraints

- 범위: 이웃 집 실내 **전 층**(`floorsFor(houseStage)` 가 주는 만큼) 구경 · 계단 층 이동 · 가구 이름표 · 트래킹. 실내 반응·신고 버튼 없음.
- 공개 범위 = 마을 공개(별도 토글 없음). 비공개·관리자 숨김·익명이면 showcase 가 통째로 null.
- 서버 상한: `ROOM_MAX = 120`, `ROOM_MAX_XY = 7.5`, `id` ≤ 40자, `rot` 0~3(아니면 0), `f` 0~3(아니면 0). SQL·JS 값은 `tests/neighbors-sync.test.mjs` 로 고정.
- 위치 `NEIGHBOR_INT = new THREE.Vector3(0, 0, 780)`.
- 이름표 거리 `TAG_R = 1.6`, 집주인 옆 비킴 `HOST_SIDE = 1.5`, 마당 문 프롬프트 반경 `DOOR_R = 1.8`.
- 집 단계 1·2 이거나 `view.room === null` 이면 문 프롬프트를 띄우지 않는다.
- 문구(한국어 원문 = i18n 키): `🚪 들어가 보기` · `🚪 마당으로` · `🏡 {0} 의 집` · `🏠 집 안을 불러오지 못했어요`. 영어: `🚪 Go inside` · `🚪 Back to the yard` · `🏡 {0}'s house` · `🏠 Couldn't load the house`.
- GA4: `neighbor_indoor_enter{host,house_stage,decor_n}` · `neighbor_indoor_exit{host,sec,floors_seen,tags_seen}` · 실패는 기존 `neighbor_load_fail{stage:'indoor',code}`. 새 파라미터 키는 `house_stage`·`decor_n`·`floors_seen`·`tags_seen` 4개뿐.
- `js/neighbors/scene.js`·`js/neighbors/indoor-scene.js` 에 `gameState` 라는 글자가 없어야 한다. `js/spaces/neighbor.js` 의 gameState 쓰기는 `neighbors`·`hintsSeen.neighborPublic` 뿐(기존 잠금 테스트 유지).
- 새 코드는 game.js 에 몰지 않는다 — game.js 는 배선 몇 줄만.
- 모바일 HUD 규칙: 안내는 프롬프트 줄(또는 컨텍스트 슬롯)에만. 새 오버레이 금지.
- 4곳 동시 배포 불필요(옛 클라는 `room` 무시). 배포·운영 DB 적용은 사용자 확인 후.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## File Structure

| 파일 | 역할 |
|---|---|
| `sql/migrations/migrate_neighbors.sql` (수정) | 신규 설치용 최종 상태 — `_nb_room` 추가, `neighbor_showcase` 에 `'room'` |
| `sql/migrations/migrate_neighbors_room.sql` (신규) | 운영 적용분 — `_nb_room` + `neighbor_showcase`(최종 본문) |
| `sql/tests/neighbors_selftest.sql` (수정) | room 케이스 |
| `js/neighbors/sanitize.js` (수정) | `ROOM_MAX`·`ROOM_MAX_XY`·`view.room` |
| `js/neighbors/indoor-rules.js` (신규, 순수) | 입장 가능 판정·문/집주인 자리·가구 배치 계산·이름표 최근접 |
| `js/neighbors/track.js` (수정) | `evIndoorEnter`·`evIndoorExit` |
| `js/spaces/indoor.js` (수정) | `buildRoomWith(def, ctx)` 인자화, `buildRoom` 어댑터 |
| `js/data/places.js` (수정) | `NEIGHBOR_INT` |
| `js/neighbors/indoor-scene.js` (신규) | 이웃 실내 짓기·층 보이기·조명·치우기 |
| `js/neighbors/scene.js` (수정) | 집주인·펫 x+1.5 비킴 · `doorSpot` · 마당 보이기 토글 |
| `js/spaces/neighbor.js` (수정) | 출입·층 이동·프롬프트·이름표·클램프·카메라/미니맵 질의·트래킹 |
| `js/spaces/doors.js` (수정) | atNeighbor 분기를 `neighborPrompt()` 로 |
| `js/game.js` (수정, 배선만) | 카메라 실내 오프셋·미니맵 중심/반경·안개 분기 |
| `js/neighbors/ui.js` (수정) | `setNeighborHudTitle` |
| `js/i18n-en.js` (수정) | 문구 4개 |
| `tests/neighbors-indoor-rules.test.mjs`·`tests/neighbor-indoor-wiring.test.mjs` (신규) · `neighbors-sanitize`·`neighbors-sync`·`neighbors-track`·`neighbor-space` (수정) | 테스트 |

---

### Task 1: SQL `_nb_room` + showcase `room` + 동기화 테스트

**Files:**
- Modify: `sql/migrations/migrate_neighbors.sql` (`_nb_yard` 정의 바로 아래에 `_nb_room`; `neighbor_showcase` 의 `'outdoor', _nb_yard(s),` 다음 줄)
- Create: `sql/migrations/migrate_neighbors_room.sql`
- Modify: `sql/tests/neighbors_selftest.sql`
- Modify: `js/neighbors/sanitize.js` (상수만)
- Test: `tests/neighbors-sync.test.mjs`

**Interfaces:**
- Produces: `export const ROOM_MAX = 120; export const ROOM_MAX_XY = 7.5;` (`js/neighbors/sanitize.js`) · SQL `public._nb_room(p_state jsonb) returns jsonb` · showcase 응답 키 `room: [{id,x,z,rot,f}]`.

- [ ] **Step 1: 실패하는 동기화 테스트** — `tests/neighbors-sync.test.mjs` 의 sanitize import 를 `import { YARD_R, DECOR_MAX, ROOM_MAX, ROOM_MAX_XY } from '../js/neighbors/sanitize.js';` 로 바꾸고 맨 아래에:

```js
test('🏠 실내 상한 — SQL _nb_room 과 sanitize 가 같다 · 운영 파일이 최종본과 같다', () => {
  const room = (s) => s.match(/create or replace function public\._nb_room[\s\S]*?\n\$\$;/)[0];
  const show = (s) => s.match(/create or replace function public\.neighbor_showcase[\s\S]*?\nend \$\$;/)[0];
  const ROOM_SQL = read('sql/migrations/migrate_neighbors_room.sql');
  assert.equal(room(ROOM_SQL), room(SQL));
  assert.equal(show(ROOM_SQL), show(SQL));
  assert.match(room(SQL), new RegExp(`abs\\(\\(e\\.o->>'x'\\)::float8\\) <= ${ROOM_MAX_XY}`));
  assert.match(room(SQL), new RegExp(`abs\\(\\(e\\.o->>'z'\\)::float8\\) <= ${ROOM_MAX_XY}`));
  assert.match(room(SQL), new RegExp(`limit ${ROOM_MAX}\\n`));
  assert.match(show(SQL), /'outdoor',\s+_nb_yard\(s\),\n\s+'room',\s+_nb_room\(s\),/);
  assert.match(ROOM_SQL, /⚠️ 적용 순서/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbors-sync.test.mjs` · Expected: FAIL (import 없음 / 파일 없음)

- [ ] **Step 3: 상수** — `js/neighbors/sanitize.js` 의 `export const DECOR_MAX = 40;` 아래:

```js
export const ROOM_MAX = 120;      // 🏠 실내 가구 상한 — sql _nb_room 의 limit
export const ROOM_MAX_XY = 7.5;   // 🏠 방 반폭(7)+여유 — sql _nb_room 의 abs(x|z) 상한
```

- [ ] **Step 4: `_nb_room`** — `migrate_neighbors.sql` 의 `_nb_yard` 정의(`$$;` 로 끝) 바로 아래:

```sql
-- 🏠 실내 가구만 — house.decor 의 {id,x,z,rot,f}. 좌표는 INT 기준 상대값(방 반폭 7 + 여유 = 7.5), 최대 120.
--    js/neighbors/sanitize.js ROOM_MAX·ROOM_MAX_XY 와 같아야 한다(tests/neighbors-sync)
create or replace function public._nb_room(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', y.o->'id', 'x', y.o->'x', 'z', y.o->'z',
           'rot', case when jsonb_typeof(y.o->'rot') = 'number' and (y.o->>'rot')::float8 in (0, 1, 2, 3) then y.o->'rot' else '0'::jsonb end,
           'f',   case when jsonb_typeof(y.o->'f') = 'number' and (y.o->>'f')::float8 in (0, 1, 2, 3) then y.o->'f' else '0'::jsonb end) order by y.ord), '[]'::jsonb)
  from (
    select e.o, e.ord
    from jsonb_array_elements(case when jsonb_typeof(p_state #> '{house,decor}') = 'array' then p_state #> '{house,decor}' else '[]'::jsonb end)
         with ordinality as e(o, ord)
    where jsonb_typeof(e.o) = 'object' and jsonb_typeof(e.o->'id') = 'string' and length(e.o->>'id') <= 40
      and jsonb_typeof(e.o->'x') = 'number' and jsonb_typeof(e.o->'z') = 'number'
      and abs((e.o->>'x')::float8) <= 7.5 and abs((e.o->>'z')::float8) <= 7.5
    order by e.ord
    limit 120
  ) y;
$$;
```
그리고 `neighbor_showcase` 의 `    'outdoor',    _nb_yard(s),` 다음 줄에 `    'room',       _nb_room(s),`. `grep -n "_nb_yard" sql/migrations/migrate_neighbors.sql` 로 `_nb_yard` 에 걸린 `revoke`/`grant` 줄이 있으면 `_nb_room(jsonb)` 에도 같은 줄을 더한다.

- [ ] **Step 5: 운영 적용 파일** — `sql/migrations/migrate_neighbors_room.sql`:

```sql
-- =============================================================
--  🏠 이웃 마을 2단계 — 실내 가구(house.decor)를 showcase 에 'room' 으로 (2026-10-11)
--  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §4.1
--  ⚠️ 적용 순서: migrate_neighbors.sql → _sim_split → _moderation → _ledger → _report_block(_2) → **이 파일**.
--     _moderation.sql 을 다시 돌리면 neighbor_showcase 가 room 없는 본문으로 돌아간다 → 그 뒤 이 파일을 다시.
--  본문은 migrate_neighbors.sql(최종본)과 같아야 한다(tests/neighbors-sync).
-- =============================================================
```
그 아래에 Step 4 의 `_nb_room` 정의 전체(권한 줄 포함)와 `migrate_neighbors.sql` 의 `neighbor_showcase` 정의 전체(`create or replace function public.neighbor_showcase` 부터 `end $$;` 까지)를 그대로 복사.

- [ ] **Step 6: 셀프테스트** — `sed -n 30,110p sql/tests/neighbors_selftest.sql` 로 가짜 세이브 구조와 showcase 검사 위치를 확인한 뒤:
  - 공개 이웃(`sc` 로 showcase 를 받는 그 계정)의 세이브에 `house.decor` 를 넣는다(이미 `house` 객체가 있으면 그 안에): `jsonb_build_array(jsonb_build_object('id','bed','x',1,'z',2,'rot',1,'f',0), jsonb_build_object('id','lamp','x',9,'z',0,'rot',0,'f',0), jsonb_build_object('id','rug','x',0,'z',0,'rot',7,'f',9))`
  - keys 비교 배열에 `'room'` 을 정렬 자리(`'pet','room','style'`)에.
  - 앞마당 필터 검사 다음에:

```sql
  if jsonb_array_length(sc->'room') <> 2 or sc->'room'->0->>'id' <> 'bed' or (sc->'room'->0->>'rot')::int <> 1
     or (sc->'room'->1->>'rot')::int <> 0 or (sc->'room'->1->>'f')::int <> 0 then
    raise exception 'FAIL: 실내 room 필터(범위 7.5·rot/f 정규화): %', sc->'room'; end if;
```

- [ ] **Step 7: 통과 확인** — Run: `node --test tests/neighbors-sync.test.mjs tests/neighbors-moderation.test.mjs` · Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add sql/migrations/migrate_neighbors.sql sql/migrations/migrate_neighbors_room.sql sql/tests/neighbors_selftest.sql js/neighbors/sanitize.js tests/neighbors-sync.test.mjs
git commit -m "feat(neighbors): expose house interior decor as showcase room (allowlist)"
```

---

### Task 2: 클라 정제 `view.room`

**Files:**
- Modify: `js/neighbors/sanitize.js`
- Test: `tests/neighbors-sanitize.test.mjs`

**Interfaces:**
- Consumes: `ROOM_MAX`, `ROOM_MAX_XY` (Task 1) · `normalizeFloor(f, stage)` (`js/house-floors.js` — 숫자 아니거나 안 열린 층이면 0)
- Produces: `sanitizeShowcase(raw, ctx).room: Array<{id,x,z,rot,f}> | null`. `ctx.decorIds: Set<string>` (없으면 room=null).

- [ ] **Step 1: 실패 테스트** — `sed -n 1,30p tests/neighbors-sanitize.test.mjs` 로 기존 ctx·기본 응답 픽스처 이름 확인(아래는 `CTX`/`BASE` 로 적었다 — 실제 이름으로 바꿔 쓴다). import 에 `ROOM_MAX` 추가 후:

```js
test('🏠 room — 모르는 id·범위 밖·깨진 좌표는 버리고 rot·f 를 정규화', () => {
  const c = { ...CTX, decorIds: new Set(['bed', 'lamp', 'rocker']) };
  const v = sanitizeShowcase({ ...BASE, houseStage: 4, room: [
    { id: 'bed', x: 1, z: 2, rot: 1, f: 0 },
    { id: 'ghostCandle', x: 0, z: 0, rot: 0, f: 0 },     // 이 클라가 모르는 가구
    { id: 'lamp', x: 8, z: 0, rot: 0, f: 0 },            // 범위 밖
    { id: 'lamp', x: 'a', z: 0 },                        // 깨진 좌표
    { id: 'rocker', x: -3, z: 3, rot: 6, f: 2 },         // rot 6 → 2 · 4단계엔 루프탑 없음 → 1층
  ] }, c);
  assert.deepEqual(v.room, [
    { id: 'bed', x: 1, z: 2, rot: 1, f: 0 },
    { id: 'rocker', x: -3, z: 3, rot: 2, f: 0 },
  ]);
});

test('🏠 room — 키가 없거나 배열이 아니면 null(문을 숨긴다)', () => {
  const c = { ...CTX, decorIds: new Set(['bed']) };
  assert.equal(sanitizeShowcase({ ...BASE, houseStage: 4 }, c).room, null);
  assert.equal(sanitizeShowcase({ ...BASE, houseStage: 4, room: {} }, c).room, null);
  assert.deepEqual(sanitizeShowcase({ ...BASE, houseStage: 4, room: [] }, c).room, []);
});

test('🏠 room — 상한 ROOM_MAX', () => {
  const c = { ...CTX, decorIds: new Set(['bed']) };
  const room = Array.from({ length: ROOM_MAX + 5 }, () => ({ id: 'bed', x: 0, z: 0, rot: 0, f: 0 }));
  assert.equal(sanitizeShowcase({ ...BASE, houseStage: 4, room }, c).room.length, ROOM_MAX);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbors-sanitize.test.mjs` · Expected: FAIL (`room` undefined)

- [ ] **Step 3: 구현** — import 에 `import { normalizeFloor } from '../house-floors.js';`, 머리말 ctx 주석에 `decorIds:Set` 추가. `return` 직전:

```js
  const room = Array.isArray(raw.room) && ctx.decorIds ? sanitizeRoom(raw.room, ctx.decorIds, stage) : null;
```
`return` 객체 끝에 `room,`. 파일 아래:

```js
/** 🏠 실내 가구 — 서버 _nb_room 과 같은 조건 + 이 클라가 아는 가구만 · 층은 그 집 단계로 보정 */
function sanitizeRoom(list, decorIds, stage) {
  const out = [];
  for (const d of list) {
    if (out.length >= ROOM_MAX) break;
    if (!d || typeof d !== 'object' || typeof d.id !== 'string' || !decorIds.has(d.id)) continue;
    const x = num(d.x), z = num(d.z);
    if (x == null || z == null || Math.abs(x) > ROOM_MAX_XY || Math.abs(z) > ROOM_MAX_XY) continue;
    const r = num(d.rot), f = num(d.f);
    out.push({ id: d.id, x, z, rot: r != null && Number.isInteger(r) ? ((r % 4) + 4) % 4 : 0,
               f: normalizeFloor(f != null && Number.isInteger(f) ? f : 0, stage) });
  }
  return out;
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/neighbors-sanitize.test.mjs` · Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/neighbors/sanitize.js tests/neighbors-sanitize.test.mjs
git commit -m "feat(neighbors): sanitize showcase room against known decor ids and floors"
```

---

### Task 3: 순수 실내 규칙 + 트래킹 빌더

**Files:**
- Create: `js/neighbors/indoor-rules.js`
- Modify: `js/neighbors/track.js`
- Test: `tests/neighbors-indoor-rules.test.mjs` (신규), `tests/neighbors-track.test.mjs`

**Interfaces:**
- Consumes: `hostSpot(stage, style, origin)` (`js/neighbors/rules.js`) · `planSeats`, `decorHalf`, `FLOOR_LIFT` (`js/house/surface.js`)
- Produces:
  - `TAG_R = 1.6`, `HOST_SIDE = 1.5`, `DOOR_R = 1.8`
  - `canEnterIndoor(view) → boolean`
  - `doorSpot(view, origin) → {x,z}` (= `hostSpot(...)`)
  - `hostStand(spot) → {x,z}` (= `{x: spot.x + HOST_SIDE, z: spot.z}`)
  - `layoutRoom(room, { origin:{x,z}, defOf:(id)=>def|undefined, scale, roofY, elevated:(f)=>boolean }) → Array<{id,f,x,y,z,ry,box:[x0,z0,x1,z1]|null}>` (월드 좌표)
  - `nearestTag(items, f, px, pz, r = TAG_R) → item|null`
  - `evIndoorEnter(publicId, stage, decorN)`, `evIndoorExit(publicId, sec, floorsSeen, tagsSeen)` (`track.js`)

- [ ] **Step 1: 실패 테스트** — `tests/neighbors-indoor-rules.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAG_R, HOST_SIDE, canEnterIndoor, doorSpot, hostStand, layoutRoom, nearestTag } from '../js/neighbors/indoor-rules.js';
import { hostSpot } from '../js/neighbors/rules.js';

const O = { x: 0, z: 780 };
const DEFS = {
  table: { id: 'table', foot: [1, 1], top: { y: 0.5, pad: [1, 1] } },
  vase: { id: 'vase', foot: [0.3, 0.3], sm: true, h: 0.72 },
  rug: { id: 'rug' },
};
const opts = { origin: O, defOf: (id) => DEFS[id], scale: 1.5, roofY: 3.4, elevated: (f) => f === 2 };

test('입장 가능 — 3단계 이상 + room 배열', () => {
  assert.equal(canEnterIndoor({ houseStage: 2, room: [] }), false);
  assert.equal(canEnterIndoor({ houseStage: 3, room: null }), false);
  assert.equal(canEnterIndoor({ houseStage: 3, room: [] }), true);
  assert.equal(canEnterIndoor(null), false);
});

test('문 자리 = hostSpot · 집주인은 x+HOST_SIDE 로 비킨다', () => {
  const v = { houseStage: 5, style: null };
  assert.deepEqual(doorSpot(v, { x: 0, z: 700 }), hostSpot(5, null, { x: 0, z: 700 }));
  assert.deepEqual(hostStand({ x: 1, z: 2 }), { x: 1 + HOST_SIDE, z: 2 });
});

test('배치 — 월드 좌표·상판 위 소품은 올라가고 충돌 없음·루프탑 높이·러그는 충돌 없음', () => {
  const items = layoutRoom([
    { id: 'table', x: 1, z: 1, rot: 0, f: 0 },
    { id: 'vase', x: 1, z: 1, rot: 0, f: 0 },
    { id: 'rug', x: -2, z: 0, rot: 1, f: 2 },
  ], opts);
  assert.equal(items[0].x, 1); assert.equal(items[0].z, 781);
  assert.equal(items[0].y, 0.2);
  assert.deepEqual(items[0].box, [0.25, 780.25, 1.75, 781.75]);
  assert.equal(items[1].y, 0.2 + 0.75);   // 상판 0.5 × 1.5
  assert.equal(items[1].box, null);
  assert.ok(Math.abs(items[2].y - 3.6) < 1e-9);   // 루프탑 3.4 + 0.2
  assert.equal(items[2].ry, Math.PI / 2);
  assert.equal(items[2].box, null);
});

test('배치 — 모르는 id 는 건너뛴다', () => {
  assert.equal(layoutRoom([{ id: 'nope', x: 0, z: 0, rot: 0, f: 0 }], opts).length, 0);
});

test('이름표 — 같은 층에서 가장 가까운 것, TAG_R 밖이면 null', () => {
  const items = [{ id: 'a', f: 0, x: 0, z: 780 }, { id: 'b', f: 0, x: 1, z: 780 }, { id: 'c', f: 1, x: 0.2, z: 780 }];
  assert.equal(nearestTag(items, 0, 0.9, 780).id, 'b');
  assert.equal(nearestTag(items, 1, 0.1, 780).id, 'c');
  assert.equal(nearestTag(items, 0, 0, 780 + TAG_R + 0.01), null);
});
```
`tests/neighbors-track.test.mjs` 에(import 에 `evIndoorEnter, evIndoorExit` 추가):

```js
test('🏠 실내 입장·퇴장 이벤트', () => {
  assert.deepEqual(evIndoorEnter('h1', 5, 12), ['neighbor_indoor_enter', { host: 'h1', house_stage: 5, decor_n: 12 }]);
  assert.deepEqual(evIndoorExit('h1', 31.6, 2, 4), ['neighbor_indoor_exit', { host: 'h1', sec: 32, floors_seen: 2, tags_seen: 4 }]);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbors-indoor-rules.test.mjs tests/neighbors-track.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현** — `js/neighbors/indoor-rules.js`:

```js
// =============================================================
//  🏠 이웃 집 실내 규칙 — 순수(three·game.js 없음, Node 테스트)
//  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §3·§5
//  가구 정의(DECOR)는 catalog.js 가 three 를 끌어와 여기서 import 할 수 없다 → defOf 로 주입.
// =============================================================
import { hostSpot } from './rules.js';
import { FLOOR_LIFT, decorHalf, planSeats } from '../house/surface.js';

export const TAG_R = 1.6;       // 가구 이름표가 뜨는 거리
export const HOST_SIDE = 1.5;   // 집주인이 문 앞에서 비켜 서는 거리(문 프롬프트·말풍선 겹침 방지)
export const DOOR_R = 1.8;      // 마당 집 문 프롬프트 반경

export const canEnterIndoor = (view) => !!view && view.houseStage >= 3 && Array.isArray(view.room);
export const doorSpot = (view, origin) => hostSpot(view.houseStage, view.style, origin);
export const hostStand = (spot) => ({ x: spot.x + HOST_SIDE, z: spot.z });

/** room(INT 상대좌표) → 월드 배치. 높이는 내 집 placeDecor·reseatDecor 와 같은 규칙(층 높이 + FLOOR_LIFT + 상판) */
export function layoutRoom(room, { origin, defOf, scale, roofY, elevated }) {
  const items = [];
  for (const r of room) {
    const def = defOf(r.id); if (!def) continue;
    items.push({ id: r.id, f: r.f || 0, rot: r.rot || 0, x: origin.x + r.x, z: origin.z + r.z, def });
  }
  const plan = planSeats({ items, scale });
  return items.map((it, i) => {
    let box = null;
    if (it.def.foot && !plan[i].onSurface) {
      const [hw, hd] = decorHalf(it.def.foot, it.rot, scale);
      box = [it.x - hw, it.z - hd, it.x + hw, it.z + hd];
    }
    return { id: it.id, f: it.f, x: it.x, z: it.z, y: (elevated(it.f) ? roofY : 0) + FLOOR_LIFT + plan[i].y, ry: it.rot * Math.PI / 2, box };
  });
}

/** 같은 층에서 r 안의 가장 가까운 가구 */
export function nearestTag(items, f, px, pz, r = TAG_R) {
  let best = null, bd = r;
  for (const it of items) {
    if (it.f !== f) continue;
    const d = Math.hypot(it.x - px, it.z - pz);
    if (d <= bd) { bd = d; best = it; }
  }
  return best;
}
```
`js/neighbors/track.js` 맨 아래:

```js
// 🏠 실내 — 들어갈 때(집 단계·보이는 가구 수) · 나올 때(머문 초·둘러본 층 수·이름표 본 가구 수)
export const evIndoorEnter = (publicId, stage, decorN) =>
  ['neighbor_indoor_enter', { host: publicId, house_stage: stage, decor_n: decorN }];
export const evIndoorExit = (publicId, sec, floorsSeen, tagsSeen) =>
  ['neighbor_indoor_exit', { host: publicId, sec: Math.max(0, Math.round(sec)), floors_seen: floorsSeen, tags_seen: tagsSeen }];
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/neighbors-indoor-rules.test.mjs tests/neighbors-track.test.mjs` · Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/neighbors/indoor-rules.js js/neighbors/track.js tests/neighbors-indoor-rules.test.mjs tests/neighbors-track.test.mjs
git commit -m "feat(neighbors): pure indoor rules (layout, tags, door spot) and indoor GA4 builders"
```

---

### Task 4: `buildRoomWith` 인자화 (내 집 동작 불변)

**Files:**
- Modify: `js/spaces/indoor.js` (`buildRoom`, 102~286행)
- Modify: `/Users/uicheol_hwang/calm_forest/.claude/launch.json` (루트 — 워크트리 서버 항목)
- Test: `tests/neighbor-indoor-wiring.test.mjs` (신규)

**Interfaces:**
- Produces: `export function buildRoomWith(def, ctx)` — `ctx = { stage, style, origin:{x,y,z}, windows:Material[], solidCircle:(x,z,r)=>collider }` → `THREE.Group`(씬에 안 붙임, `visible=false`, fog 예외, `userData.floorIdx/floorGroup/st` 기존과 같음). `buildRoom(def)` 는 그대로 export.

- [ ] **Step 1: 리팩터링 전 기준 스냅숏(브라우저)** — 루트 `/Users/uicheol_hwang/calm_forest/.claude/launch.json` 의 `configurations` 에 추가(워크트리 serve.py 절대경로 — 상대경로면 루트를 서빙한다):

```json
{ "name": "neighbor-indoor", "runtimeExecutable": "python3",
  "runtimeArgs": ["/Users/uicheol_hwang/calm_forest/.claude/worktrees/neighbor-indoor/scripts/serve.py", "8061"], "port": 8061 }
```
`preview_start {name:"neighbor-indoor"}` → 게임 진입 → `javascript_tool`:

```js
(async () => { const g = await import('/js/game.js'); const S = [];
  for (const id in g.interiorFloors) { const r = g.interiorFloors[id]; let meshes = 0, verts = 0;
    r.traverse(o => { if (o.isMesh) { meshes++; verts += o.geometry.attributes.position.count; } });
    const c = r.userData.st?.userData.collider;
    S.push({ id, meshes, verts, pos: r.position.toArray(), col: c ? [c.x, c.z, c.r] : null }); }
  return JSON.stringify({ stage: g.gameState.houseStage, S, windows: g.houseWindows.length }); })()
```
결과를 `dev/active/neighbor-indoor/room-baseline.json` 에 저장. (현재 세이브의 집 단계 하나 기준 — 다른 단계 검증은 Task 7 이웃 실내 실측이 겸한다.)

- [ ] **Step 2: 실패하는 소스 테스트** — `tests/neighbor-indoor-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const INDOOR = read('js/spaces/indoor.js');
const fnBody = (src, name) => {
  const i = src.indexOf(`export function ${name}(`); assert.ok(i >= 0, `${name} 없음`);
  const j = src.indexOf('\n}\n', i); return src.slice(i, j + 2);
};

test('🏠 buildRoomWith — 내 집 전역을 직접 읽지 않는다(이웃 집도 같은 함수로 짓는다)', () => {
  const b = fnBody(INDOOR, 'buildRoomWith');
  assert.doesNotMatch(b, /gameState|houseWindows|scene\.add|\bINT\b/);
  assert.match(b, /ctx\.windows\.push/);
  assert.match(b, /ctx\.solidCircle\(/);
});

test('🏠 buildRoom 은 내 집 ctx 로 buildRoomWith 를 부르는 어댑터', () => {
  const b = fnBody(INDOOR, 'buildRoom');
  assert.match(b, /buildRoomWith\(def, \{ stage: gameState\.houseStage, style: gameState\.house\.style, origin: INT, windows: houseWindows, solidCircle \}\)/);
  assert.match(b, /scene\.add\(g\)/);
});
```

- [ ] **Step 3: 실패 확인** — Run: `node --test tests/neighbor-indoor-wiring.test.mjs` · Expected: FAIL (`buildRoomWith 없음`)

- [ ] **Step 4: 리팩터링** — `js/spaces/indoor.js`:
  - `export function buildRoom(def) {` → `export function buildRoomWith(def, ctx) {`, 본문에서 정확히 다음만 치환:
    - `g.position.set(INT.x, def.elevated ? ROOF_Y : INT.y, INT.z)` → `g.position.set(ctx.origin.x, def.elevated ? ROOF_Y : ctx.origin.y, ctx.origin.z)`
    - `finishFor(gameState.houseStage, gameState.house.style)` → `finishFor(ctx.stage, ctx.style)`
    - `def.id === 'ground' && gameState.houseStage >= 7` → `def.id === 'ground' && ctx.stage >= 7`
    - `houseWindows.push(` (3곳) → `ctx.windows.push(`
    - `st.userData.collider = solidCircle(` → `st.userData.collider = ctx.solidCircle(`
    - 끝의 `scene.add(g); g.visible = false;` → `g.visible = false;`
  - 기존 `// 방 한 채를 짓는다 …` 주석을 `buildRoomWith` 위에서 `// 🏠 방 짓기 본체 — ctx = { stage, style, origin, windows, solidCircle }. 전역을 직접 읽지 않는다(이웃 집 실내가 같은 함수를 쓴다, 2026-10-11)` 로 바꾸고, 그 위에 어댑터:

```js
// 방 한 채를 짓는다 — def = floorAt() 이 주는 층 정의(반경·실외 여부·id). 내 집 전용 어댑터(이웃 집은 js/neighbors/indoor-scene.js)
export function buildRoom(def) {
  const g = buildRoomWith(def, { stage: gameState.houseStage, style: gameState.house.style, origin: INT, windows: houseWindows, solidCircle });
  scene.add(g);
  return g;
}
```
  - 메모: 원래 `scene.add(g)` 가 `setFogExempt(g, true)` 보다 앞이었다 — fog 예외는 재질 플래그라 순서 무관.

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/neighbor-indoor-wiring.test.mjs && npm test 2>&1 | tail -5` · Expected: PASS · 전체 fail 0

- [ ] **Step 6: 동치 확인(브라우저)** — 리로드 후 Step 1 스크립트 재실행 → `room-baseline.json` 과 문자 그대로 같은지 비교. 내 집 들어가 1층·계단 스크린샷 1장. 다르면 Step 4 치환을 다시 본다.

- [ ] **Step 7: Commit**

```bash
git add js/spaces/indoor.js tests/neighbor-indoor-wiring.test.mjs dev/active/neighbor-indoor/room-baseline.json
git commit -m "refactor(indoor): parameterize room builder as buildRoomWith for neighbor interiors"
```

---

### Task 5: 이웃 실내 짓기 `indoor-scene.js` + `NEIGHBOR_INT`

**Files:**
- Modify: `js/data/places.js` (`NEIGHBOR` 아래)
- Create: `js/neighbors/indoor-scene.js`
- Test: `tests/neighbor-indoor-wiring.test.mjs`

**Interfaces:**
- Consumes: `buildRoomWith` (Task 4) · `layoutRoom`, `nearestTag` (Task 3) · `decorMesh(id)` (`js/spaces/indoor.js`) · `floorsFor`, `floorAt` (`js/house-floors.js`) · `DECOR`, `DECOR_SCALE` (`js/data/catalog.js`) · `ROOF_Y`, `NEIGHBOR_INT` (`js/data/places.js`) · `scene`, `solidBox`, `solidCircle`, `removeSolid`, `disposeTree`, `setFogExempt` (`js/game.js`) · `unregisterWindows` (`js/spaces/house.js`)
- Produces: `buildNeighborIndoor(view) → { items, floorDef(f), show(f), setGroupVisible(on), tagAt(f,x,z), setLamp(night,f), dispose() }` — `items[i]` = `layoutRoom` 원소 + `def`.

- [ ] **Step 1: 실패 테스트** — `tests/neighbor-indoor-wiring.test.mjs` 에 추가:

```js
test('📍 NEIGHBOR_INT — 마을 밖 다른 인스턴스 공간과 60 이상 떨어져 있다', () => {
  const p = read('js/data/places.js');
  assert.match(p, /export const NEIGHBOR_INT = new THREE\.Vector3\(0, 0, 780\);/);
  const pts = [...p.matchAll(/export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g)]
    .map(m => ({ n: m[1], x: +m[2], z: +m[3] })).filter(q => Math.hypot(q.x, q.z) > 100);
  const me = pts.find(q => q.n === 'NEIGHBOR_INT');
  for (const q of pts) if (q !== me) assert.ok(Math.hypot(q.x - me.x, q.z - me.z) >= 60, `${q.n} 와 너무 가깝다`);
});

test('🔒 indoor-scene.js 는 내 세이브를 모른다 · buildRoomWith 로만 방을 짓고 치울 때 전역 등록을 되돌린다', () => {
  const s = read('js/neighbors/indoor-scene.js');
  assert.doesNotMatch(s, /gameState|\bbuildRoom\(/);
  assert.match(s, /buildRoomWith\(/);
  assert.match(s, /unregisterWindows\(group\)/);
  assert.match(s, /removeSolid\(/);
  assert.match(s, /scene\.remove\(lamp\)/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbor-indoor-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: 좌표** — `js/data/places.js` 의 `export const NEIGHBOR = …` 바로 아래:

```js
export const NEIGHBOR_INT = new THREE.Vector3(0, 0, 780);   // 🏠 이웃 집 실내 — 이웃 마당(700) 남쪽 80. 마당 언덕 끝(734)과 겹치지 않게
```

- [ ] **Step 4: 밤 창문 점등 규칙 확인** — `grep -n "houseWindows" js/game.js | head` 로 내 집 창 재질을 밤에 어떻게 켜는지(어느 속성에 어떤 값) 확인. 아래 `setLamp` 의 창문 줄을 그 규칙과 같은 식으로 쓴다(값을 지어내지 않는다).

- [ ] **Step 5: 구현** — `js/neighbors/indoor-scene.js`:

```js
// =============================================================
//  🏠 이웃 집 실내 짓기·치우기 — NEIGHBOR_INT(0,0,780)
//  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §5.2
//  ⚠️ 넘겨받은 뷰로만 그린다 — 내 세이브·전역 층 상태는 읽지도 쓰지도 않는다(tests/neighbor-indoor-wiring 잠금).
//  ⚠️ 방은 층마다 같은 x,z 에 겹쳐 짓고 보이는 층만 켠다(내 집과 같은 구조) — 안 보이는 층의 충돌체는 off.
//  ⚠️ 창 재질은 전역 houseWindows 가 아니라 여기 windows 에 모은다(밤 점등은 setLamp 가) — 내 집 목록을 오염시키지 않는다.
// =============================================================
import * as THREE from 'three';
import { disposeTree, removeSolid, scene, setFogExempt, solidBox, solidCircle } from '../game.js';
import { buildRoomWith, decorMesh } from '../spaces/indoor.js';
import { unregisterWindows } from '../spaces/house.js';
import { floorAt, floorsFor } from '../house-floors.js';
import { DECOR, DECOR_SCALE } from '../data/catalog.js';
import { NEIGHBOR_INT, ROOF_Y } from '../data/places.js';
import { layoutRoom, nearestTag } from './indoor-rules.js';

const DEF_BY_ID = new Map(DECOR.map(d => [d.id, d]));

export function buildNeighborIndoor(view) {
  const group = new THREE.Group(); group.name = 'neighbor-indoor';
  const windows = [];
  const solids = [];                  // { c, f } — 층 전환 때 off 토글
  const rooms = [];                   // { f, g }
  const decor = [];                   // { f, m }
  let items = [], lamp = null;
  const roomSolid = (f) => (x, z, r) => { const c = solidCircle(x, z, r); solids.push({ c, f }); return c; };
  const floorDef = (f) => floorAt(view.houseStage, f);

  const built = {
    get items() { return items; },
    floorDef,
    show(f) {
      for (const r of rooms) r.g.visible = r.f === f;
      for (const d of decor) d.m.visible = d.f === f;
      for (const s of solids) s.c.off = !group.visible || s.f !== f;
      if (lamp) lamp.position.set(NEIGHBOR_INT.x, (floorDef(f)?.elevated ? ROOF_Y : 0) + 3.4, NEIGHBOR_INT.z);
    },
    setGroupVisible(on) {
      group.visible = on;
      if (lamp) lamp.visible = on;
      if (!on) for (const s of solids) s.c.off = true;   // 마당에 있을 땐 z≈780 충돌체가 아무것도 막지 않게
    },
    tagAt: (f, x, z) => nearestTag(items, f, x, z),
    setLamp(night, f) {   // 내 집 공식(js/game.js interiorLamp) — 루프탑·정원(outdoor)에선 끈다
      if (lamp) lamp.intensity = floorDef(f)?.outdoor ? 0 : 1.8 + night * 2.6;
      // 창 점등: Step 4 에서 확인한 내 집 규칙과 같은 식으로 windows 를 갱신
    },
    dispose() {
      for (const s of solids) removeSolid(s.c);
      unregisterWindows(group);
      if (lamp) scene.remove(lamp);
      scene.remove(group);
      disposeTree(group);
    },
  };

  try {
    const floors = floorsFor(view.houseStage);
    for (const def of floors) {
      const g = buildRoomWith(def, { stage: view.houseStage, style: view.style, origin: NEIGHBOR_INT, windows, solidCircle: roomSolid(def.f) });
      // 계단 — 내 집 refreshStairsLandmarks 와 같은 규칙(위·아래 어느 한쪽이라도 갈 수 있을 때만)
      if (g.userData.st) g.userData.st.visible = !!(floorDef(def.f + 1) && floorDef(def.f + 1).id !== 'garden') || (def.f > 0 && def.f !== 3 && !!floorDef(def.f - 1));
      rooms.push({ f: def.f, g });
      group.add(g);
    }
    items = layoutRoom(view.room || [], {
      origin: NEIGHBOR_INT, defOf: (id) => DEF_BY_ID.get(id), scale: DECOR_SCALE, roofY: ROOF_Y,
      elevated: (f) => !!floorDef(f)?.elevated,
    }).map((it) => ({ ...it, def: DEF_BY_ID.get(it.id) }));
    for (const it of items) {
      const m = decorMesh(it.id);
      m.position.set(it.x, it.y, it.z); m.rotation.y = it.ry;
      group.add(m); decor.push({ f: it.f, m });
      if (it.box) solids.push({ c: solidBox(...it.box), f: it.f });
    }
    lamp = new THREE.PointLight(0xffd9a0, 0, 26);
    scene.add(lamp);
    setFogExempt(group, true);
    scene.add(group);
    built.setGroupVisible(false);   // 들어갈 때 neighbor.js 가 켠다
    built.show(0);
  } catch (e) { built.dispose(); throw e; }
  return built;
}
```
  (`setLamp` 의 창 점등 주석 줄은 Step 4 결과로 실제 코드로 바꾼다 — 예: 내 집이 `m.emissiveIntensity = k` 라면 `for (const w of windows) w.emissiveIntensity = <같은 식>`. 내 집 계단 규칙은 `refreshStairsLandmarks`(indoor.js 263~): `upOk = f < 2 && floorAt(stage, f+1)`, `downOk = f > 0 && floorAt(stage, f-1)` — 위 식이 이와 다르면 그 식을 그대로 옮긴다.)

- [ ] **Step 6: 통과 확인** — Run: `node --test tests/neighbor-indoor-wiring.test.mjs tests/neighbor-space.test.mjs` · Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add js/data/places.js js/neighbors/indoor-scene.js tests/neighbor-indoor-wiring.test.mjs
git commit -m "feat(neighbors): build neighbor house interior at NEIGHBOR_INT from sanitized room"
```

---

### Task 6: 배선 — 출입·층 이동·이름표·HUD·카메라·트래킹

**Files:**
- Modify: `js/neighbors/scene.js`, `js/neighbors/ui.js`, `js/spaces/neighbor.js`, `js/spaces/doors.js`, `js/game.js`, `js/i18n-en.js`
- Test: `tests/neighbor-indoor-wiring.test.mjs`, 기존 `tests/neighbor-space.test.mjs`·`tests/neighbors-i18n.test.mjs` 통과 유지

**Interfaces:**
- Consumes: Task 2~5.
- Produces (`js/spaces/neighbor.js`): `neighborPrompt(p) → { nd:string|null, prompt:string|null, choice?:Array<{label,onSelect}> }` · `neighborIndoorFrame() → {c,half}|null` · `neighborIndoorElevated() → boolean` · `neighborAction` 가 `'nbenter'|'nbexitin'|'nbfloor'` 처리. (`neighborDoor` 는 삭제 — doors.js 만 썼다.)
- `scene.js` built: `doorSpot`, `setVisible(on)`. `ui.js`: `setNeighborHudTitle(text)`.

- [ ] **Step 1: 실패 테스트** — `tests/neighbor-indoor-wiring.test.mjs` 맨 위 import 에 `import { gameSource } from './helpers/game-source.mjs';` 를 추가하고 아래를 붙인다:

```js
const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');
const SCENE = read('js/neighbors/scene.js');
const I18N = read('js/i18n-en.js');
const GAME = gameSource();

test('🚪 문구 4개 + 영어', () => {
  for (const k of ['🚪 들어가 보기', '🚪 마당으로', '🏡 {0} 의 집', '🏠 집 안을 불러오지 못했어요']) assert.ok(I18N.includes(`'${k}'`), `i18n 없음: ${k}`);
  assert.ok(SPACE.includes("'🚪 들어가 보기'") && SPACE.includes("'🚪 마당으로'"));
});

test('🏡 doors.js 이웃 분기는 neighborPrompt 하나로 · updateToolPageAuto 유지', () => {
  const i = DOORS.indexOf('if (atNeighbor) {'); const b = DOORS.slice(i, DOORS.indexOf('\n    return;\n', i));
  assert.match(b, /neighborPrompt\(player\.position\)/);
  assert.match(b, /updateToolPageAuto\(\)/);
  assert.doesNotMatch(DOORS, /neighborDoor/);
});

test('🙋 집주인은 문 앞에서 비켜 선다(hostStand)', () => { assert.match(SCENE, /hostStand\(spot\)/); });

test('📷 game.js — 이웃 실내면 실내/루프탑 카메라·미니맵 중심/반경', () => {
  assert.match(GAME, /neighborIndoorElevated\(\)/);
  assert.match(GAME, /neighborIndoorFrame\(\)/);
});

test('📊 실내 입장·퇴장 트래킹 · 실패는 stage indoor', () => {
  assert.match(SPACE, /trackEvent\(\.\.\.evIndoorEnter\(/);
  assert.match(SPACE, /trackEvent\(\.\.\.evIndoorExit\(/);
  assert.match(SPACE, /evFail\('indoor'/);
});

test('🧹 방문 종료 때 실내도 치운다', () => {
  const i = SPACE.indexOf('export function exitNeighbor('); const b = SPACE.slice(i, SPACE.indexOf('\n}\n', i));
  assert.match(b, /leaveIndoor\(false\)/);
  assert.match(b, /indoorBuilt\?\.dispose\(\)/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbor-indoor-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: scene.js** — import 에 `import { hostStand } from './indoor-rules.js';`. `built` 객체에 `doorSpot: null,` 와 `setVisible(on) { group.visible = on; for (const c of solids) c.off = !on; },` 추가. 집주인 블록(`const spot = hostSpot(...)` ~ 펫)을:

```js
    const spot = hostSpot(view.houseStage, view.style, NEIGHBOR);
    built.doorSpot = spot;                         // 🚪 실내 문 프롬프트 자리
    const stand = hostStand(spot);                 // 🙋 문 앞에서 비켜 선다(문 프롬프트·말풍선 겹침 방지)
    built.hostSpot = stand;
    host = buildCharacterMesh(view.character, { owned: [], equipped: view.equipped });
    host.position.set(stand.x, 0, stand.z);   // rotation 0 = +z(카메라) 를 본다
    group.add(host);
    solids.push(solidCircle(stand.x, stand.z, 0.45));
    if (view.pet) {
      pet = spawnPet(THREE, view.pet.kind, view.pet.stage);
      if (pet) { pet.position.set(stand.x + 1.1, 0, stand.z + 0.3); group.add(pet); }
    }
```
  (7단계 마루 위 x+1.5 가 기둥·마루 밖이면 Task 7 실측에서 확인 — 문제면 `HOST_SIDE` 를 −1.5 로 바꾸고 테스트 값도 갱신.)

- [ ] **Step 4: ui.js** — `showNeighborHud` 아래:

```js
export function setNeighborHudTitle(text) {
  const el2 = document.querySelector('#nb-hud-top .nb-title'); if (el2) el2.textContent = text;
}
```

- [ ] **Step 5: neighbor.js — import·ctx** — 기존 import 줄에 합친다:
  - game.js 줄: `nightLevel, setFogExempt` 추가(둘 다 game.js export 목록에 있음 — `grep -n "nightLevel,\|setFogExempt," js/game.js` 확인)
  - catalog 줄: `import { DECOR, OUTDOOR } from '../data/catalog.js';`
  - places 줄: `NEIGHBOR_INT, ROOF_Y` 추가
  - track 줄: `evIndoorEnter, evIndoorExit` 추가
  - ui 줄: `setNeighborHudTitle` 추가
  - 새 줄: `import { canEnterIndoor, DOOR_R } from '../neighbors/indoor-rules.js';` · `import { buildNeighborIndoor } from '../neighbors/indoor-scene.js';` · `import { STAIR_PROMPT_R, stairLayout } from './indoor.js';` · `import { gardenDoorLocal } from '../house-floors.js';`
  - `showcaseCtx` 객체에 `decorIds: new Set(DECOR.map(d => d.id)),`
  - `let visit` 주석에 `indoor:null|{f,t0,floors:Set,tags:Set}, indoorBuilt` 추가.

- [ ] **Step 6: neighbor.js — 출입·층 이동** — `exitNeighbor` 아래에:

```js
// ── 🏠 이웃 집 실내(2026-10-11) — 전역 indoor/houseFloor 는 건드리지 않는다(내 집 저장·조명 분기 오염 방지) ──
function enterIndoor() {
  const v = visit; if (!v || v.indoor || !canEnterIndoor(v.view)) return;
  try {
    if (!v.indoorBuilt) v.indoorBuilt = buildNeighborIndoor(v.view);   // 처음 들어갈 때 한 번 짓고 방문 동안 유지
  } catch (e) {
    console.error('[neighbor] indoor build failed', e);
    trackEvent(...evFail('indoor', 'build'));
    ui.toast?.('🏠 집 안을 불러오지 못했어요', 2600);
    return;
  }
  v.indoor = { f: 0, t0: performance.now(), floors: new Set([0]), tags: new Set() };
  v.built.setVisible(false);
  v.indoorBuilt.setGroupVisible(true);
  v.indoorBuilt.show(0);
  setHostBubble(null); v.near = false;
  player.position.set(NEIGHBOR_INT.x, 0, NEIGHBOR_INT.z - 4); player.rotation.y = 0;   // 문(z−7) 프롬프트 반경 밖
  setFogExempt(player, true);
  setNeighborHudTitle(`🏡 ${v.view.nickname} 의 집`);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  snapCamera(); Sound.blip();
  trackEvent(...evIndoorEnter(v.publicId, v.view.houseStage, v.indoorBuilt.items.length));   // [GA4] 집 단계·가구 수
}

function leaveIndoor(toYard) {
  const v = visit; if (!v?.indoor) return;
  const s = v.indoor; v.indoor = null;
  trackEvent(...evIndoorExit(v.publicId, (performance.now() - s.t0) / 1000, s.floors.size, s.tags.size));   // [GA4] 머문 시간·층·이름표
  v.indoorBuilt.setGroupVisible(false);
  setFogExempt(player, false);
  player.position.y = 0;
  $w.lastFloorChoiceKey = null; ui.setFloorChoice?.(null);
  if (!toYard) return;
  v.built.setVisible(true);
  const d = v.built.doorSpot;
  player.position.set(d.x, 0, d.z + DOOR_R + 0.4); player.rotation.y = Math.PI;   // 문 앞 마당, 문 프롬프트 반경 밖
  setNeighborHudTitle(`🏡 ${v.view.nickname} 의 마을`);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  snapCamera(); Sound.blip();
}

function goIndoorFloor(f) {
  const v = visit; if (!v?.indoor) return;
  const def = v.indoorBuilt.floorDef(f); if (!def) return;
  const prev = v.indoor.f;
  v.indoor.f = f; v.indoor.floors.add(f);
  v.indoorBuilt.show(f);
  player.position.y = def.elevated ? ROOF_Y : 0;
  const h = def.half;
  player.position.x = Math.max(NEIGHBOR_INT.x - h + 1.5, Math.min(NEIGHBOR_INT.x + h - 1.5, player.position.x));
  player.position.z = Math.max(NEIGHBOR_INT.z - h + 1.5, Math.min(NEIGHBOR_INT.z + h - 1.5, player.position.z));
  if (f === 3 || (f === 0 && prev === 3)) {   // 🌿 정원 문 — 내 집 goFloor 와 같은 규칙(문 앞에 선다)
    const gd = gardenDoorLocal(h);
    player.position.set(NEIGHBOR_INT.x + gd.x - 0.6, player.position.y, NEIGHBOR_INT.z + gd.z);
    player.rotation.y = -Math.PI / 2;
  }
  $w.nearDoor = null; ui.setDoorPrompt?.(null); $w.lastDoorPrompt = null;
  $w.lastFloorChoiceKey = null; ui.setFloorChoice?.(null);
  Sound.blip();
  ui.toast?.(def.id === 'garden' ? `🌿 ${def.name}` : def.outdoor ? `☀️ ${def.name}` : `🏠 ${def.name}`, 1200);
}
```
  `exitNeighbor()` 수정: 첫 줄 `if (!visit) return;` 다음에 `leaveIndoor(false);`, `v.built.dispose();` 다음에 `v.indoorBuilt?.dispose();`.

- [ ] **Step 7: neighbor.js — 프롬프트·액션·질의** — 기존 `neighborDoor` 를 지우고(`grep -rn "neighborDoor" js/` 로 doors.js 외 사용처 없음 확인) 다음으로 교체:

```js
/** 🏡 이웃 공간 프롬프트 — 마당: 나가는 길·집 문 / 🏠 실내: 마당으로·계단·정원 문·가구 이름표(안내뿐, nd=null) */
export function neighborPrompt(p) {
  const v = visit;
  if (v?.indoor) {
    const f = v.indoor.f, h = v.indoorBuilt.floorDef(f).half;
    const gd = gardenDoorLocal(h);
    const nearGarden = Math.hypot(p.x - (NEIGHBOR_INT.x + gd.x), p.z - (NEIGHBOR_INT.z + gd.z)) < 1.7;
    if (v.view.houseStage >= 7 && f === 0 && nearGarden) { $w.nearDoorFloor = 3; return { nd: 'nbfloor', prompt: '🌿 정원으로' }; }
    if (f === 3 && nearGarden) { $w.nearDoorFloor = 0; return { nd: 'nbfloor', prompt: '🏠 집 안으로' }; }
    if (f === 0 && Math.hypot(p.x - NEIGHBOR_INT.x, p.z - (NEIGHBOR_INT.z - h)) < 1.7) return { nd: 'nbexitin', prompt: '🚪 마당으로' };
    if (f !== 3) {
      const lay = stairLayout(h);
      if (Math.hypot(p.x - (NEIGHBOR_INT.x + lay.cx), p.z - (NEIGHBOR_INT.z + lay.cz)) < STAIR_PROMPT_R) {
        let up = v.indoorBuilt.floorDef(f + 1); if (up?.id === 'garden') up = null;
        const down = f > 0 ? v.indoorBuilt.floorDef(f - 1) : null;
        const opts = [];
        if (up) opts.push({ f: f + 1, label: `🪜 ${up.name}으로` });
        if (down) opts.push({ f: f - 1, label: `🪜 ${down.name}으로` });
        if (opts.length === 2) return { nd: 'nbfloorchoice', prompt: null, choice: opts.map(o => ({ key: o.f, label: o.label, onSelect: () => goIndoorFloor(o.f) })) };   // 내 집 6단계 2층과 같은 두 버튼
        if (opts.length === 1) { $w.nearDoorFloor = opts[0].f; return { nd: 'nbfloor', prompt: opts[0].label }; }
      }
    }
    const tag = v.indoorBuilt.tagAt(f, p.x, p.z);
    if (tag) { v.indoor.tags.add(tag.id); return { nd: null, prompt: `${tag.def.ico} ${t(tag.def.name)}` }; }
    return { nd: null, prompt: null };
  }
  if (Math.hypot(p.x - NEIGHBOR.x, p.z - (NEIGHBOR.z + NEIGHBOR_R)) < 2.2) return { nd: 'neighborexit', prompt: '🚪 내 마을로' };
  const d = v?.built.doorSpot;
  if (d && canEnterIndoor(v.view) && Math.hypot(p.x - d.x, p.z - d.z) < DOOR_R) return { nd: 'nbenter', prompt: '🚪 들어가 보기' };
  return { nd: null, prompt: null };
}
```
  (계단 라벨 `🪜 ${name}으로` 는 내 집 doors.js 와 같은 문자열 패턴 — i18n 글루도 그쪽 규칙을 그대로 탄다.)

  `neighborAction`:

```js
export function neighborAction(nearDoor) {
  if (nearDoor === 'neighbor') return openNeighborPicker('sign');
  if (nearDoor === 'neighborexit') return exitNeighbor();
  if (nearDoor === 'nbenter') return enterIndoor();
  if (nearDoor === 'nbexitin') return leaveIndoor(true);
  if (nearDoor === 'nbfloor') return goIndoorFloor($w.nearDoorFloor);
}
```
  질의:

```js
/** 📷 이웃 실내 루프탑이면 true(루프탑 카메라) — game.js updateCamera */
export const neighborIndoorElevated = () => !!(visit?.indoor && visit.indoorBuilt.floorDef(visit.indoor.f)?.elevated);
/** 🗺️📷 이웃 실내면 중심·반경 — 아니면 null(game.js 카메라·미니맵·안개) */
export function neighborIndoorFrame() {
  if (!visit?.indoor) return null;
  return { c: NEIGHBOR_INT, half: visit.indoorBuilt.floorDef(visit.indoor.f).half };
}
```
  `clampToNeighbor(p)` 맨 앞:

```js
  if (visit?.indoor) {   // 🏠 실내 — 방 반폭 안쪽(벽 충돌체가 막지만 모서리 빠짐 방지)
    const h = visit.indoorBuilt.floorDef(visit.indoor.f).half - 0.5;
    p.x = Math.max(NEIGHBOR_INT.x - h, Math.min(NEIGHBOR_INT.x + h, p.x));
    p.z = Math.max(NEIGHBOR_INT.z - h, Math.min(NEIGHBOR_INT.z + h, p.z));
    return;
  }
```
  `updateNeighbor(dt)` 의 `visit.built.update(dt);` 다음 줄: `if (visit.indoor) { visit.indoorBuilt.setLamp(nightLevel, visit.indoor.f); return; }   // 실내엔 집주인 말풍선 없음`
  `neighborMinimapMarks(marks)` 첫 줄: `if (visit?.indoor) return;   // 🏠 실내 미니맵엔 마당 표시 없음`

- [ ] **Step 8: doors.js** — import 의 `neighborDoor` → `neighborPrompt`. `if (atNeighbor) { … }` 블록을:

```js
  if (atNeighbor) {    // 🏡 이웃 마을: 마당(나가는 길·집 문) / 🏠 이웃 집 실내(마당으로·계단·정원 문·가구 이름표) — js/spaces/neighbor.js
    const np = neighborPrompt(player.position);
    nd = np.nd; prompt = np.prompt;
    $w.nearDoor = nd;
    const key = prompt && !nd ? `i|${prompt}` : prompt;   // 이름표(안내뿐)와 누를 수 있는 프롬프트를 구분해 다시 그린다(거울 마을과 같은 문법)
    if (key !== lastDoorPrompt) { $w.lastDoorPrompt = key; ui.setDoorPrompt?.(prompt, prompt && !nd ? { info: true } : undefined); }
    const fcKey = np.choice ? np.choice.map(o => o.key).join(',') : null;   // 🪜 두 방향 계단 — 내 집과 같은 선택 버튼
    if (fcKey !== lastFloorChoiceKey) { $w.lastFloorChoiceKey = fcKey; ui.setFloorChoice?.(np.choice ? np.choice.map(o => ({ label: o.label, onSelect: o.onSelect })) : null); }
    if (lastZoneHint !== null) { $w.lastZoneHint = null; ui.setZoneHint?.(null); }
    updateToolPageAuto();   // 🎒 맨 끝까지 안 가고 돌아가니 여기서 — ZONE_PAGE.neighbor 'none'(맨손)
    return;
  }
```
  (`lastFloorChoiceKey` 가 doors.js 상단 game.js import 목록에 있는지 확인 — 내 집 분기가 같은 이름을 쓰므로 있을 것. 없으면 import 에 추가.)

- [ ] **Step 9: game.js 배선** — 173행 import 에 `neighborIndoorElevated, neighborIndoorFrame` 추가.
  - 6309행: `_camOff.copy((indoor && curFloorDef().elevated) || neighborIndoorElevated() ? camOffsetRoof : (indoor || neighborIndoorFrame()) ? camOffsetIndoor : camOffset).multiplyScalar(zoom);`
  - 5667행 미니맵 중심: `place === 'neighbor' ? (neighborIndoorFrame()?.c ?? NEIGHBOR)`
  - 5669행 미니맵 반경: `place === 'neighbor' ? (neighborIndoorFrame()?.half ?? NEIGHBOR_R)`
  - 6426행 안개: `if (atNeighbor && !neighborIndoorFrame()) { … }` (실내는 fog 예외라 마당 값 덮어쓰기를 건너뛴다).

- [ ] **Step 10: i18n** — `js/i18n-en.js` 의 `'🚪 내 마을로'` 줄 아래:

```js
  '🚪 들어가 보기': '🚪 Go inside',
  '🚪 마당으로': '🚪 Back to the yard',
  '🏡 {0} 의 집': "🏡 {0}'s house",
  '🏠 집 안을 불러오지 못했어요': "🏠 Couldn't load the house",
```

- [ ] **Step 11: 통과 확인** — Run: `npm test 2>&1 | tail -8` · Expected: fail 0. `tests/neighbor-space.test.mjs` 가 `neighborDoor`·doors.js 이웃 분기 문자열을 잠그고 있으면 새 형태로 갱신(의도된 변경 — 무엇을 왜 바꿨는지 커밋 본문에).

- [ ] **Step 12: Commit**

```bash
git add js/spaces/neighbor.js js/neighbors/scene.js js/neighbors/ui.js js/spaces/doors.js js/game.js js/i18n-en.js tests/
git commit -m "feat(neighbors): walk into a neighbor's house — floors, furniture tags, tracking"
```

---

### Task 7: 실측 검증 (브라우저)

**Files:** 없음(버그는 수정 커밋). 캡처는 `dev/active/neighbor-indoor/shots/`.

- [ ] **Step 1: 로컬 이웃 데이터** — 운영 DB 엔 아직 `room` 이 없다(Task 8 전). `grep -n "serve_neighbor" -A25 scripts/serve.py` 로 미러 동작 확인. 응답 주입: `javascript_tool` 로 `(await import('/js/neighbors/net.js')).neighborApi.showcase` 를 감싸 응답 `data` 에 `room` 과 `houseStage`/`style` 을 덮어쓴다. 시나리오별 데이터: (a) 5단계 — 1층 `bed`·테이블류+`vase`(같은 좌표)·`rug`, 2층 `piano` (b) 4단계 다락 `rocker` (c) 6단계 루프탑 가구 (d) 7단계 모던·한옥 + 정원 (e) 2단계. 가구 id 는 `DECOR` 에 실제 있는 것으로(`grep -n "id: '" js/data/catalog.js | head -40`).
- [ ] **Step 2: 시나리오** — pane 을 앞으로(`tabs_select` — 숨으면 rAF 정지). 방문 → `🚪 들어가 보기` → 1층 가구·이름표(꽃병이 상판 위) → 계단 위/아래(6단계 2층 두 버튼) → 루프탑 카메라 → 7단계 정원 문 왕복 → `🚪 마당으로` → 문 앞 복귀·집주인 비켜 섬 → 다시 들어가서 상단 `🚪 내 마을로` → 마을 복귀. 콘솔 에러 0(`read_console_messages onlyErrors`).
- [ ] **Step 3: 2단계 집·room=null** — 문 프롬프트가 안 뜬다.
- [ ] **Step 4: 정리 확인** — 방문 종료 후 `javascript_tool`: `scene.getObjectByName('neighbor-indoor')` 없음, PointLight 수 방문 전과 같음, 충돌체 중 z>740 인 것 0.
- [ ] **Step 5: 드로우콜** — `renderer.info.render.calls` 를 마당·실내 1층에서(가구 많은 주입 데이터로). 마을보다 크면 보고.
- [ ] **Step 6: 캡처** — PC(1280×800)·모바일(`resize_window mobile`) 실내 1층·이름표·루프탑. 영어판에서 문 프롬프트·이름표·HUD 제목. 끝나면 `resize_window desktop`.
- [ ] **Step 7: 내 집 회귀** — 내 집 1층·계단·가구 옮기기 정상, 이웃 다녀온 뒤 내 집 밤 창문 점등 정상(houseWindows 오염 없음).
- [ ] **Step 8:** 발견한 버그 수정 → `npm test` → `fix(neighbors): …` 커밋.

---

### Task 8: 리뷰 + SQL 운영 적용

- [ ] **Step 1:** code-reviewer(`git diff main...HEAD` 전체)와 security-reviewer(SQL 허용 목록·`security definer`·anon 노출 범위) 병렬. CRITICAL/HIGH 수정·재테스트·커밋.
- [ ] **Step 2 (사용자 확인 후):** 메모리 sql-run-direct-pooler 절차로 `sql/migrations/migrate_neighbors_room.sql` 실행 → `sql/tests/neighbors_selftest.sql` 실행 → `NEIGHBORS SELFTEST ALL PASS` → `select count(*) from auth.users where email like 'nb-selftest-%'` = 0.
- [ ] **Step 3:** 공개 이웃 하나의 showcase 응답에 `room` 배열 확인(엣지 캐시 10분).
- [ ] **Step 4:** 주입 없이 실데이터로 Task 7 Step 2 한 번.

---

### Task 9: 배포 (사용자 확인 후)

- [ ] **Step 1:** 키 스캔(메모리 push-secret-scan) → main sync·병합 → `npm test`.
- [ ] **Step 2:** 웹 · 토스(`bundle_upload` + memo) · Play(versionCode+1 → build:cap → bundleRelease → upload:play, 출시 노트 해요체) · itch zip — 메모리 deploy-checklist 순서.
- [ ] **Step 3:** main + feat/capacitor-app 푸시.
- [ ] **Step 4:** 토스 출시 후 📮 공지(notices_admin): "마을을 공개해 두면 집 안도 이웃에게 보여요 · ⚙️ 에서 끌 수 있어요".
- [ ] **Step 5:** 다음 날 BQ: `neighbor_indoor_enter`·`neighbor_indoor_exit` 적재·파라미터, `neighbor_load_fail` stage=indoor.
- [ ] **Step 6:** 메모리 `neighbor-village.md` 갱신.
