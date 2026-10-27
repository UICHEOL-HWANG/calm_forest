# 나룻배 라인업 1차 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 급류 코스, 앞 구간 완화, 별 콤보·아슬아슬 보너스, 강 재료 적립, 배 4척(나룻배·연잎배·뗏목·비단잉어)과 배 고르기 화면을 넣고, 기존 강화 3종을 부품으로 옮긴다.

**Architecture:** 판정·데이터·경제·저장은 `js/boat/` 아래 `three` 없는 순수 모듈로 만들어 Node 테스트로 고정한다. `js/spaces/river.js`의 런 루프는 이 모듈을 불러 분기만 한다. 배 조형은 `sims/boat-models.js`를 `js/boat/models.js`로 옮긴다. DB는 `boat_runs` 컬럼 추가와 리더보드 코스 필터를 클라이언트 배포 전에 운영에 적용한다.

**Tech Stack:** Vanilla JS(ES modules), Three.js(브라우저 importmap, Node 테스트 환경엔 없음), `node --test`, Supabase Postgres(pg8000 풀러로 직접 실행), GA4 `trackEvent`.

**Spec:** `docs/superpowers/specs/2026-10-27-boat-lineup-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 주석을 넣지 않는다. 설명은 커밋 메시지와 dev docs에 쓴다.
- 게임 화면 문구에 엠대시(—)를 쓰지 않는다. 끊을 땐 마침표, 제목 구분은 "·".
- 새 한국어 화면 문구는 `js/i18n-en.js`에 영어를 함께 넣고 i18n 테스트로 고정한다. 문구는 구현 전에 사용자 검수를 받는다(Task 10).
- 새 코드는 `game.js`에 넣지 않는다. `js/boat/*.js`에 둔다. `game.js`는 상태 기본값·세이브 복원·입력 훅 연결만 바꾼다.
- `js/boat/*.js` 중 `models.js`를 뺀 모듈은 `three`를 import하지 않는다(Node 테스트에서 불러야 한다).
- GA4 이벤트당 커스텀 파라미터는 23개 이하. 새 이벤트는 파라미터 5개 이하.
- dev 세션(`IS_DEV_SESSION`)은 `boat_runs`·`econ_logs`에 쓰지 않는다(기존 `sendBoatRun`·`logEcon`이 이미 막는다).
- 해금 조건 값은 설계 문서 9장 표 그대로: 연잎배 ⭐500·🪷10·완주 3번 / 뗏목 ⭐1,200·🪵25·🪙3,000 / 비단잉어 ⭐1,500·🐚20·급류 무피해 완주.
- 급류: 속도 ×1.2, 장애물 간격 ×0.72, 코스 전체 별 수와 수집물 수는 잔잔한 물길 ±10~15%, **정산 때** 강 재료 ×1.5, 첫 완주 후 해금.
- 잔잔한 물길: 첫 장애물 70m, 1구간은 바위만.
- 코스 생성 규칙 버전 `COURSE_V = 2`.
- 커밋만 한다. 푸시·병합·배포는 사용자 지시가 있을 때만.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## 파일 구조

| 파일 | 상태 | 역할 |
|---|---|---|
| `js/boat/consts.js` | 새로 | `RIVER_W`·`RIVER_LEN`·`RIVER_OBS`·`RIVER_PICKS`·`BOAT_BASE_SPEED`·`BOAT_BOOST_CD`·`BOAT_RUNS_PER_DAY` (three 없음) |
| `js/data/places.js` | 수정 | 위 상수를 `consts.js`에서 다시 내보내고 원래 선언 삭제, `BOAT_UPGRADES`·`BOAT_LAMPS` 삭제 |
| `js/boat/boats.js` | 새로 | 배 9척 데이터(1차는 `phase: 1` 4척만 탈 수 있음) |
| `js/boat/save.js` | 새로 | `boatDefaults`·`restoreBoat`·`migrateUpgrades` |
| `js/boat/economy.js` | 새로 | 해금 판정·해금·재료 적립 |
| `js/boat/course.js` | 새로 | `buildCourseData`·`COURSES`·`courseSeedKey`·`COURSE_V` |
| `js/boat/abilities.js` | 새로 | 콤보·아슬아슬·충돌 처리·조향·스퍼트 대기·소용돌이·스킬 |
| `js/boat/models.js` | 새로 | 배 조형(three 사용, 브라우저 전용) |
| `js/boat/dock-ui.js` | 새로 | 배 고르기·코스 고르기 화면 |
| `js/spaces/river.js` | 수정 | 위 모듈 연결 |
| `js/game.js` | 수정 | 기본 상태·`applySave`·`wantSkill`·Input 훅 |
| `index.html` | 수정 | `#boat-shop` → 배 고르기 화면, 스킬 버튼, 리더보드 탭 |
| `js/i18n-en.js` | 수정 | 새 문구 영어 |
| `sql/migrations/migrate_boat_lineup.sql` | 새로 | `boat_runs` 컬럼·CHECK, 리더보드 함수 |
| `tests/boat-*.test.mjs` | 새로 | 태스크별 테스트 |
| `tests/helpers/boat-bot.mjs` | 새로 | 공정성 시뮬레이션 봇 |

---

### Task 0: 작업 환경

**Files:** 없음

- [ ] **Step 1: 워크트리와 의존성 확인**

```bash
cd /Users/uicheol_hwang/calm_forest/.claude/worktrees/boat-lineup
git branch --show-current
ls node_modules >/dev/null 2>&1 || npm ci
```
Expected: `feat/boat-lineup`, `node_modules` 존재.

- [ ] **Step 2: 기준선 테스트**

Run: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# fail 0` (2026-10-27 기준 4,127개 통과).

---

### Task 1: DB 마이그레이션

**Files:**
- Create: `sql/migrations/migrate_boat_lineup.sql`
- Test: `tests/boat-lineup-db.test.mjs`

**Interfaces:**
- Produces: `boat_runs` 컬럼 `course text`, `boat_id text`, `loadout jsonb`, `skill_used smallint`, `combo_max smallint`, `near_miss smallint`, `mats jsonb`, `course_v smallint`. 리더보드 보드 `boat`(잔잔한 물길만), `boat_rapid`(급류만).

`econ_logs.source`에는 CHECK가 없다(`migrate_struct_04_checks.sql` 결정: 열린 집합). 그래서 source 추가 작업은 없다.

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_boat_lineup.sql', import.meta.url), 'utf8');

test('boat_runs 새 컬럼 8개', () => {
  for (const col of ['course', 'boat_id', 'loadout', 'skill_used', 'combo_max', 'near_miss', 'mats', 'course_v']) {
    assert.match(sql, new RegExp(`add column if not exists ${col}\\b`), col);
  }
});

test('course CHECK 와 jsonb 크기 상한', () => {
  assert.match(sql, /course in \('calm', 'rapid'\)/);
  assert.match(sql, /pg_column_size\(loadout\)/);
  assert.match(sql, /pg_column_size\(mats\)/);
});

test('리더보드 boat 는 잔잔한 물길만, boat_rapid 는 급류만', () => {
  const boat = sql.slice(sql.indexOf("p_board = 'boat'"), sql.indexOf("p_board = 'boat_rapid'"));
  assert.match(boat, /coalesce\(course, 'calm'\) = 'calm'/);
  const rapid = sql.slice(sql.indexOf("p_board = 'boat_rapid'"), sql.indexOf("p_board = 'sea'"));
  assert.match(rapid, /course = 'rapid'/);
  assert.match(rapid, /least\(max\(score\), 5000\)/);
});

test('기존 보드(sea·rich·quest·mine·cook·sled)를 그대로 유지한다', () => {
  for (const b of ['sea', 'rich', 'quest', 'mine', 'cook', 'sled']) assert.match(sql, new RegExp(`p_board = '${b}'`), b);
  assert.match(sql, /course_v = 2 and phys_v in \(1, 2, 3, 4, 5\)/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-lineup-db.test.mjs`
Expected: FAIL (`ENOENT ... migrate_boat_lineup.sql`)

- [ ] **Step 3: 운영 리더보드 함수 본문 받아 오기**

리더보드 함수는 파일보다 운영 DB가 최신일 수 있다. 운영 본문을 받아 `sql/migrations/migrate_leaderboard_sled.sql`과 비교한다. 스크래치패드에 `lb_def.py`를 만든다(저장소에 넣지 않음).

```python
import ssl, re, pg8000.native
env = open('/Users/uicheol_hwang/calm_forest/.env').read()
pw = re.search(r'^SUPABASE_DB_PASSWORD=(.*)$', env, re.M).group(1).strip().strip('"').strip("'")
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
con = pg8000.native.Connection(user='postgres.zuyxgjfihxtfdpolljzw', password=pw,
    host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432, database='postgres', ssl_context=ctx)
print(con.run("select pg_get_functiondef('public.leaderboard(text, uuid)'::regprocedure)")[0][0])
```

Run: `python3 <scratchpad>/lb_def.py > <scratchpad>/lb_live.sql && diff -w <(sed -n '/CREATE OR REPLACE FUNCTION/,/\$function\$;/p' sql/migrations/migrate_leaderboard_sled.sql) <scratchpad>/lb_live.sql`
Expected: 차이 없음. 차이가 있으면 **운영 본문을 기준으로** Step 4를 쓴다.

- [ ] **Step 4: 마이그레이션 작성**

`sql/migrations/migrate_boat_lineup.sql`:

```sql
alter table public.boat_runs
  add column if not exists course     text,
  add column if not exists boat_id    text,
  add column if not exists loadout    jsonb,
  add column if not exists skill_used smallint,
  add column if not exists combo_max  smallint,
  add column if not exists near_miss  smallint,
  add column if not exists mats       jsonb,
  add column if not exists course_v   smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'boat_runs_course_chk' and conrelid = 'public.boat_runs'::regclass) then
    alter table public.boat_runs add constraint boat_runs_course_chk check (course is null or course in ('calm', 'rapid'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'boat_runs_lineup_json_size' and conrelid = 'public.boat_runs'::regclass) then
    alter table public.boat_runs add constraint boat_runs_lineup_json_size
      check (coalesce(pg_column_size(loadout), 0) <= 2048 and coalesce(pg_column_size(mats), 0) <= 1024);
  end if;
end $$;
```

그 아래에 Step 3에서 받은 `CREATE OR REPLACE FUNCTION public.leaderboard(...)` 본문 전체를 붙이고, `boat` 분기만 아래로 바꾼다. 다른 분기는 한 글자도 바꾸지 않는다.

```sql
  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where created_at >= day_start and created_at < day_end
            and coalesce(course, 'calm') = 'calm'
            and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'boat_rapid' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where created_at >= day_start and created_at < day_end
            and course = 'rapid'
            and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
```

함수 뒤의 `grant execute` 문도 `migrate_leaderboard_sled.sql`에 있던 그대로 붙인다.

- [ ] **Step 5: 테스트 통과**

Run: `node --test tests/boat-lineup-db.test.mjs`
Expected: PASS 4/4

- [ ] **Step 6: 운영 적용 (사용자 확인 후)**

운영 DB를 바꾸는 단계다. 실행 전에 사용자에게 "운영 DB에 migrate_boat_lineup.sql 적용"을 묻고 승인을 받는다.

스크래치패드 `apply_boat_lineup.py`: Step 3 접속 코드 + `con.run(open('<worktree>/sql/migrations/migrate_boat_lineup.sql').read())` 한 번, 이어서:

```python
print(con.run("select column_name from information_schema.columns where table_name='boat_runs' and column_name in ('course','boat_id','loadout','skill_used','combo_max','near_miss','mats','course_v') order by 1"))
print(con.run("select public.leaderboard('boat') ->> 'error', public.leaderboard('boat_rapid') ->> 'error', public.leaderboard('sled') ->> 'error'"))
```
Expected: 컬럼 8개, `[[None, None, None]]`.

컬럼 추가는 옛 클라이언트와 호환된다(옛 클라이언트는 새 컬럼을 안 보낸다 → null → 리더보드에서 `calm`으로 취급). 그래서 클라이언트 배포보다 **먼저** 적용해도 안전하고, 먼저 적용해야 한다(새 클라이언트가 모르는 컬럼을 보내면 행 전체가 실패한다).

- [ ] **Step 7: 커밋**

```bash
git add sql/migrations/migrate_boat_lineup.sql tests/boat-lineup-db.test.mjs
git commit -m "feat(boat): boat_runs lineup columns and course-split leaderboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 강 상수 분리 + 배 데이터

**Files:**
- Create: `js/boat/consts.js`, `js/boat/boats.js`
- Modify: `js/data/places.js` (강 상수·`BOAT_LAMPS`·`BOAT_UPGRADES` 선언, 168~218행 근처), `js/game.js:137` (import 목록)
- Test: `tests/boat-boats.test.mjs`

**Interfaces:**
- Produces:
  - `consts.js`: `RIVER_W`, `RIVER_LEN`, `RIVER_OBS`, `RIVER_PICKS`, `BOAT_BASE_SPEED`, `BOAT_BOOST_CD`, `BOAT_RUNS_PER_DAY`
  - `boats.js`: `BOATS: Record<id, Boat>`, `BOAT_IDS: string[]`(9척 순서), `LIVE_PHASE = 1`, `liveBoatIds(): string[]`, `MAT_IDS = ['lotus','driftwood','shell','moon_fish']`
  - `Boat = { id, name, ico, phase, lamps, steer, hitR, whirl: 'pull'|'ride', logPush: boolean, crewSeats, skill: null | { id, dur, cd }, unlock: null | { star, coins, mat: {}, need: {} } }`
  - `need` 키: `clears`(누적 완주), `rapidPerfect`, `comboBest`, `raftClears`, `nightClears`, `rapidNightClears`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOATS, BOAT_IDS, LIVE_PHASE, liveBoatIds, MAT_IDS } from '../js/boat/boats.js';
import { RIVER_W, RIVER_LEN, RIVER_OBS, RIVER_PICKS, BOAT_BASE_SPEED, BOAT_BOOST_CD, BOAT_RUNS_PER_DAY } from '../js/boat/consts.js';

test('강 상수는 기존 값 그대로', () => {
  assert.equal(RIVER_W, 6.4); assert.equal(RIVER_LEN, 620);
  assert.equal(BOAT_BASE_SPEED, 9.5); assert.equal(BOAT_BOOST_CD, 3.2); assert.equal(BOAT_RUNS_PER_DAY, 3);
  assert.deepEqual(Object.keys(RIVER_OBS), ['rock', 'log', 'pile', 'whirl']);
  assert.deepEqual(RIVER_PICKS.map(p => p.id), ['lotus', 'driftwood', 'shell', 'moon_fish']);
});

test('조개·달빛 물고기는 줍는 순간 다른 자원으로 바뀌지 않는다', () => {
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'shell').give, {});
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'moon_fish').give, {});
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'lotus').give, { seed: 2 });
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'driftwood').give, { wood: 2 });
});

test('배 9척, 1차는 4척', () => {
  assert.deepEqual(BOAT_IDS, ['ferry', 'lotus', 'raft', 'koi', 'catamaran', 'paper', 'walnut', 'lotuslamp', 'gourd']);
  assert.equal(LIVE_PHASE, 1);
  assert.deepEqual(liveBoatIds(), ['ferry', 'lotus', 'raft', 'koi']);
  assert.deepEqual(MAT_IDS, ['lotus', 'driftwood', 'shell', 'moon_fish']);
});

test('해금 조건은 설계 문서 9장 표', () => {
  const u = id => BOATS[id].unlock;
  assert.equal(BOATS.ferry.unlock, null);
  assert.deepEqual(u('lotus'), { star: 500, coins: 0, mat: { lotus: 10 }, need: { clears: 3 } });
  assert.deepEqual(u('raft'), { star: 1200, coins: 3000, mat: { driftwood: 25 }, need: {} });
  assert.deepEqual(u('koi'), { star: 1500, coins: 0, mat: { shell: 20 }, need: { rapidPerfect: 1 } });
  assert.deepEqual(u('catamaran'), { star: 2500, coins: 8000, mat: { shell: 30 }, need: {} });
  assert.deepEqual(u('paper'), { star: 2500, coins: 0, mat: { lotus: 40 }, need: { comboBest: 30 } });
  assert.deepEqual(u('walnut'), { star: 3000, coins: 0, mat: { driftwood: 50 }, need: { raftClears: 15 } });
  assert.deepEqual(u('lotuslamp'), { star: 3500, coins: 0, mat: { moon_fish: 20 }, need: { nightClears: 15 } });
  assert.deepEqual(u('gourd'), { star: 5000, coins: 15000, mat: { moon_fish: 40 }, need: { rapidNightClears: 5 } });
});

test('1차 4척 능력', () => {
  assert.deepEqual([BOATS.ferry.lamps, BOATS.lotus.lamps, BOATS.raft.lamps, BOATS.koi.lamps], [3, 2, 4, 3]);
  assert.equal(BOATS.lotus.whirl, 'ride'); assert.equal(BOATS.ferry.whirl, 'pull');
  assert.ok(BOATS.lotus.hitR < 1); assert.ok(BOATS.raft.steer < 1);
  assert.equal(BOATS.raft.logPush, true); assert.equal(BOATS.raft.crewSeats, 2);
  assert.deepEqual(BOATS.koi.skill, { id: 'dive', dur: 1.2, cd: 9 });
  for (const id of BOAT_IDS) assert.equal(typeof BOATS[id].name, 'string');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-boats.test.mjs`
Expected: FAIL (`Cannot find module .../js/boat/boats.js`)

- [ ] **Step 3: `js/boat/consts.js`**

```js
export const RIVER_W = 6.4;
export const RIVER_LEN = 620;
export const BOAT_RUNS_PER_DAY = 3;
export const BOAT_BASE_SPEED = 9.5;
export const BOAT_BOOST_CD = 3.2;
export const RIVER_OBS = {
  rock:  { r: 1.15, hit: true },
  log:   { r: 2.0,  hit: true },
  pile:  { r: 0.75, hit: true },
  whirl: { r: 1.7,  hit: false },
};
export const RIVER_PICKS = [
  { id: 'lotus',     name: '물 위 연꽃',    ico: '🪷', give: { seed: 2 }, color: 0xffb6d5 },
  { id: 'driftwood', name: '떠내려온 나무', ico: '🪵', give: { wood: 2 }, color: 0xc09068 },
  { id: 'shell',     name: '강 조개',       ico: '🐚', give: {},          color: 0xffe6c0 },
  { id: 'moon_fish', name: '달빛 물고기',   ico: '🌕', give: {},          color: 0xdfe9ff, night: true },
];
```

값은 `places.js` 원래 선언 그대로다. `shell`·`moon_fish`의 `give`만 비운다(설계 9장 "재료 처리 변경"). 재료 적립은 Task 9에서 한다.

- [ ] **Step 4: `js/data/places.js` 수정**

`RIVER_W`·`RIVER_LEN`·`BOAT_RUNS_PER_DAY`·`BOAT_LAMPS`·`BOAT_BASE_SPEED`·`BOAT_BOOST_CD`·`RIVER_OBS`·`RIVER_PICKS`·`BOAT_UPGRADES` 선언(주석 포함)을 지우고, 그 자리에:

```js
export { RIVER_W, RIVER_LEN, BOAT_RUNS_PER_DAY, BOAT_BASE_SPEED, BOAT_BOOST_CD, RIVER_OBS, RIVER_PICKS } from '../boat/consts.js';
```

`js/game.js:137`의 places import 목록에서 `BOAT_UPGRADES`를 지운다. 확인: `grep -rn "BOAT_LAMPS\|BOAT_UPGRADES" js index.html` 결과가 `js/spaces/river.js`만 남아야 한다(river.js는 Task 9에서 정리). 이 시점엔 river.js가 아직 `BOAT_LAMPS`·`BOAT_UPGRADES`를 import하므로 브라우저는 깨진다. Task 9까지 브라우저 검증은 하지 않는다.

- [ ] **Step 5: `js/boat/boats.js`**

```js
export const LIVE_PHASE = 1;
export const MAT_IDS = ['lotus', 'driftwood', 'shell', 'moon_fish'];

const boat = (id, o) => ({ id, phase: 1, lamps: 3, steer: 1, hitR: 1, whirl: 'pull', logPush: false, crewSeats: 1, skill: null, unlock: null, ...o });
const cost = (star, coins, mat, need = {}) => ({ star, coins, mat, need });

export const BOATS = {
  ferry: boat('ferry', { name: '나룻배', ico: '🛶' }),
  lotus: boat('lotus', { name: '연잎배', ico: '🍃', lamps: 2, steer: 1.1, hitR: 0.72, whirl: 'ride', unlock: cost(500, 0, { lotus: 10 }, { clears: 3 }) }),
  raft: boat('raft', { name: '뗏목', ico: '🪵', lamps: 4, steer: 0.72, hitR: 1.12, logPush: true, crewSeats: 2, unlock: cost(1200, 3000, { driftwood: 25 }) }),
  koi: boat('koi', { name: '비단잉어', ico: '🐟', skill: { id: 'dive', dur: 1.2, cd: 9 }, unlock: cost(1500, 0, { shell: 20 }, { rapidPerfect: 1 }) }),
  catamaran: boat('catamaran', { name: '쌍둥이 돛단배', ico: '⛵', phase: 2, unlock: cost(2500, 8000, { shell: 30 }) }),
  paper: boat('paper', { name: '종이배', ico: '📄', phase: 2, lamps: 2, skill: { id: 'fold', dur: 2, cd: 10 }, unlock: cost(2500, 0, { lotus: 40 }, { comboBest: 30 }) }),
  walnut: boat('walnut', { name: '호두 껍질 배', ico: '🌰', phase: 2, unlock: cost(3000, 0, { driftwood: 50 }, { raftClears: 15 }) }),
  lotuslamp: boat('lotuslamp', { name: '연꽃 등 배', ico: '🪷', phase: 3, unlock: cost(3500, 0, { moon_fish: 20 }, { nightClears: 15 }) }),
  gourd: boat('gourd', { name: '조롱박 등 배', ico: '🎃', phase: 3, skill: { id: 'lure', dur: 0.6, cd: 8 }, unlock: cost(5000, 15000, { moon_fish: 40 }, { rapidNightClears: 5 }) }),
};

export const BOAT_IDS = Object.keys(BOATS);
export const liveBoatIds = () => BOAT_IDS.filter(id => BOATS[id].phase <= LIVE_PHASE);
```

- [ ] **Step 6: 테스트 통과 + 전체 회귀**

Run: `node --test tests/boat-boats.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 5/5 PASS, 전체 `# fail 0`. `gameSource()`로 `RIVER_OBS` 같은 선언 원문을 읽던 테스트가 깨지면 `tests/helpers/game-source.mjs`의 `gameSource()` 반환 배열에 `...readDir('boat/')`를 추가한다(다른 테스트의 단언은 바꾸지 않는다).

- [ ] **Step 7: 커밋**

```bash
git add js/boat/consts.js js/boat/boats.js js/data/places.js js/game.js tests/boat-boats.test.mjs tests/helpers/game-source.mjs
git commit -m "feat(boat): river constants module and nine-boat data

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 저장 구조와 기존 강화 이전

**Files:**
- Create: `js/boat/save.js`
- Modify: `js/game.js:1082` (기본 상태), `js/game.js:2880` (`applySave`), `js/game.js:2518-2523` (`window.__boat` 검수 훅)
- Test: `tests/boat-save.test.mjs`

**Interfaces:**
- Consumes: `MAT_IDS`, `liveBoatIds` (Task 2)
- Produces:
  - `BOAT_V = 2`
  - `boatDefaults(): BoatState`
  - `restoreBoat(saved): { boat: BoatState, refundStar: number }` (입력 불변)
  - `migrateUpgrades(up): { parts: { ram?, wind?, bell? }, equip: { bow?: 'ram', flag?: 'wind', stern?: 'bell' }, refundStar: number }`
  - `BoatState` 필드: 기존 `date, count, clearsToday, best, clears, up, chestDate, perfect` + `v, sel{boat,bow,flag,stern,crew,course}, own{}, parts{}, crew{}, mat{}, mastery{}, stat{rapidClears,rapidNightClears,rapidPerfect,nightClears,raftClears,comboBest}, bestRapid`

1차 부품 효과: `ram`(쇄빙 뱃머리)과 `wind`(순풍 깃발)만 작동한다. `bell`(뱃종)은 저장만 하고 효과는 2차. 기존 등불 강화가 주던 밤 등불은 나룻배에서 밤마다 누구에게나 켜진다(Task 9).

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOAT_V, boatDefaults, restoreBoat, migrateUpgrades } from '../js/boat/save.js';
import { gameSource } from './helpers/game-source.mjs';

test('기본값', () => {
  const d = boatDefaults();
  assert.equal(d.v, BOAT_V);
  assert.deepEqual(d.sel, { boat: 'ferry', bow: null, flag: null, stern: null, crew: null, course: 'calm' });
  assert.deepEqual(d.own, { ferry: 1 });
  assert.deepEqual(d.mat, { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 });
  assert.deepEqual(d.stat, { rapidClears: 0, rapidNightClears: 0, rapidPerfect: 0, nightClears: 0, raftClears: 0, comboBest: 0 });
  assert.deepEqual(d.up, { oar: 0, hull: 0, lamp: 0 });
});

test('강화 이전: oar→순풍 깃발, hull→쇄빙 뱃머리, lamp→뱃종+별 300', () => {
  assert.deepEqual(migrateUpgrades({ oar: 2, hull: 1, lamp: 1 }), {
    parts: { wind: 2, ram: 1, bell: 1 }, equip: { flag: 'wind', bow: 'ram', stern: 'bell' }, refundStar: 300,
  });
  assert.deepEqual(migrateUpgrades({ oar: 0, hull: 0, lamp: 0 }), { parts: {}, equip: {}, refundStar: 0 });
  assert.deepEqual(migrateUpgrades(undefined), { parts: {}, equip: {}, refundStar: 0 });
});

test('옛 세이브(v 없음) 복원: 이전 1회 + 기존 필드 보존', () => {
  const r = restoreBoat({ date: '2026-10-20', count: 2, best: 812, clears: 7, up: { oar: 1, hull: 2, lamp: 1 }, chestDate: '2026-10-19', perfect: 1 });
  assert.equal(r.refundStar, 300);
  assert.equal(r.boat.v, 2);
  assert.deepEqual(r.boat.up, { oar: 1, hull: 2, lamp: 1 });
  assert.deepEqual(r.boat.parts, { wind: 1, ram: 2, bell: 1 });
  assert.equal(r.boat.sel.flag, 'wind'); assert.equal(r.boat.sel.bow, 'ram'); assert.equal(r.boat.sel.stern, 'bell');
  assert.equal(r.boat.clears, 7); assert.equal(r.boat.best, 812); assert.equal(r.boat.perfect, 1);
  assert.equal(r.boat.chestDate, '2026-10-19');
});

test('이미 v2 면 다시 이전하지 않는다', () => {
  const once = restoreBoat({ up: { oar: 0, hull: 0, lamp: 1 } }).boat;
  const twice = restoreBoat(once);
  assert.equal(twice.refundStar, 0);
  assert.deepEqual(twice.boat.parts, once.parts);
});

test('하위 객체가 빠진 v2 세이브도 기본값으로 채운다', () => {
  const r = restoreBoat({ v: 2, own: { ferry: 1, lotus: 1 } }).boat;
  assert.deepEqual(r.mat, { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 });
  assert.equal(r.stat.comboBest, 0);
  assert.equal(r.sel.boat, 'ferry');
  assert.deepEqual(r.mastery, {});
  assert.deepEqual(r.crew, {});
  assert.equal(r.bestRapid, 0);
});

test('가진 적 없는 배·1차에 없는 배를 고른 세이브는 나룻배로', () => {
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1 }, sel: { boat: 'koi' } }).boat.sel.boat, 'ferry');
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1, gourd: 1 }, sel: { boat: 'gourd' } }).boat.sel.boat, 'ferry');
  assert.equal(restoreBoat({ v: 2, own: { ferry: 1, raft: 1 }, sel: { boat: 'raft' } }).boat.sel.boat, 'raft');
});

test('잘못된 숫자는 0 으로, 코스는 calm|rapid 만', () => {
  const r = restoreBoat({ v: 2, mat: { lotus: -3, shell: 'x', driftwood: 4.7 }, sel: { course: 'lava' } }).boat;
  assert.deepEqual(r.mat, { lotus: 0, driftwood: 4, shell: 0, moon_fish: 0 });
  assert.equal(r.sel.course, 'calm');
});

test('restoreBoat 는 입력을 바꾸지 않는다', () => {
  const input = { up: { oar: 1, hull: 0, lamp: 0 } };
  const snap = JSON.stringify(input);
  restoreBoat(input);
  assert.equal(JSON.stringify(input), snap);
});

test('game.js: 기본값·복원·환급 순서', () => {
  const src = gameSource();
  assert.match(src, /boat: boatDefaults\(\),/);
  const inv = src.indexOf('if (saved.inventory)'), rb = src.indexOf('restoreBoat(saved.boat)');
  assert.ok(inv > 0 && rb > inv, '인벤토리 복원 뒤에 나룻배 복원(환급이 덮이지 않게)');
  assert.match(src, /rb\.refundStar/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-save.test.mjs`
Expected: FAIL (`Cannot find module .../js/boat/save.js`)

- [ ] **Step 3: `js/boat/save.js`**

```js
import { MAT_IDS, liveBoatIds } from './boats.js';

export const BOAT_V = 2;
const COURSE_IDS = ['calm', 'rapid'];
const STAT_KEYS = ['rapidClears', 'rapidNightClears', 'rapidPerfect', 'nightClears', 'raftClears', 'comboBest'];

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const natMap = (src, keys) => Object.fromEntries(keys.map(k => [k, nat(isObj(src) ? src[k] : 0)]));
const levelMap = src => (isObj(src) ? Object.fromEntries(Object.entries(src).map(([k, v]) => [k, nat(v)]).filter(([, v]) => v > 0)) : {});

export function boatDefaults() {
  return {
    date: null, count: 0, clearsToday: 0, best: 0, clears: 0, up: { oar: 0, hull: 0, lamp: 0 }, chestDate: null,
    v: BOAT_V,
    sel: { boat: 'ferry', bow: null, flag: null, stern: null, crew: null, course: 'calm' },
    own: { ferry: 1 },
    parts: {},
    crew: {},
    mat: natMap({}, MAT_IDS),
    mastery: {},
    stat: natMap({}, STAT_KEYS),
    bestRapid: 0,
  };
}

export function migrateUpgrades(up) {
  const u = isObj(up) ? up : {};
  const parts = {}, equip = {};
  if (nat(u.oar)) { parts.wind = nat(u.oar); equip.flag = 'wind'; }
  if (nat(u.hull)) { parts.ram = nat(u.hull); equip.bow = 'ram'; }
  if (nat(u.lamp)) { parts.bell = 1; equip.stern = 'bell'; }
  return { parts, equip, refundStar: nat(u.lamp) ? 300 : 0 };
}

export function restoreBoat(saved) {
  const s = isObj(saved) ? saved : {};
  const d = boatDefaults();
  const own = { ...levelMap(s.own), ferry: 1 };
  const base = {
    ...d,
    ...s,
    up: { ...d.up, ...(isObj(s.up) ? s.up : {}) },
    own,
    parts: levelMap(s.parts),
    crew: levelMap(s.crew),
    mat: natMap(s.mat, MAT_IDS),
    mastery: levelMap(s.mastery),
    stat: natMap(s.stat, STAT_KEYS),
    bestRapid: nat(s.bestRapid),
  };
  const sel0 = { ...d.sel, ...(isObj(s.sel) ? s.sel : {}) };
  const sel = {
    ...sel0,
    boat: own[sel0.boat] && liveBoatIds().includes(sel0.boat) ? sel0.boat : 'ferry',
    course: COURSE_IDS.includes(sel0.course) ? sel0.course : 'calm',
  };
  if (s.v === BOAT_V) return { boat: { ...base, v: BOAT_V, sel }, refundStar: 0 };
  const m = migrateUpgrades(s.up);
  return {
    boat: { ...base, v: BOAT_V, parts: { ...base.parts, ...m.parts }, sel: { ...sel, ...m.equip } },
    refundStar: m.refundStar,
  };
}
```

- [ ] **Step 4: `game.js` 연결**

상단 import에 추가:

```js
import { boatDefaults, restoreBoat } from './boat/save.js';
```

1082행 `boat: { date: null, count: 0, ... chestDate: null }, // 🛶 ...` 한 줄을:

```js
  boat: boatDefaults(),
```

2880행 `if (saved.boat) gameState.boat = { ... };` 한 줄을:

```js
  if (saved.boat) {
    const rb = restoreBoat(saved.boat);
    gameState.boat = rb.boat;
    if (rb.refundStar) gameState.inventory.star = (gameState.inventory.star || 0) + rb.refundStar;
  }
```

(인벤토리 복원은 2765행으로 이보다 앞이라 환급이 덮이지 않는다. 테스트가 이 순서를 고정한다.)

2518~2523행 `window.__boat = { ... up: (id, lv = 1) => {...}, ... }`에서 `up:` 줄을 지우고 대신:

```js
      own: (id) => { gameState.boat.own = { ...gameState.boat.own, [id]: 1 }; return { ...gameState.boat.own }; },
      sel: (patch) => { gameState.boat.sel = { ...gameState.boat.sel, ...patch }; return { ...gameState.boat.sel }; },
```

- [ ] **Step 5: 테스트 통과 + 전체 회귀**

Run: `node --test tests/boat-save.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 9/9 PASS, `# fail 0`

- [ ] **Step 6: 커밋**

```bash
git add js/boat/save.js js/game.js tests/boat-save.test.mjs
git commit -m "feat(boat): v2 boat save state with one-time upgrade migration

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 해금과 재료 적립

**Files:**
- Create: `js/boat/economy.js`
- Test: `tests/boat-economy.test.mjs`

**Interfaces:**
- Consumes: `BOATS`, `MAT_IDS`, `LIVE_PHASE` (Task 2), `BoatState`·`boatDefaults` (Task 3)
- Produces:
  - `unlockCheck(id, st, inv): { owned: boolean, live: boolean, ok: boolean, lacks: Array<{ key: string, have: number, need: number }> }` — `key`는 `'star' | 'coins' | 'mat:<id>' | 'need:<key>'`, 나열 순서는 star → coins → mat → need
  - `unlockBoat(id, st, inv): { ok: false, check } | { ok: true, st: BoatState, inv: Inventory, spentCoins: number }` (입력 불변)
  - `addRunMats(st, picks, mult): BoatState` — `Math.floor(n * mult + 0.5)`, `MAT_IDS` 밖은 무시
  - `needValue(key, st): number` — `clears`는 `st.clears`, 나머지는 `st.stat[key]`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlockCheck, unlockBoat, addRunMats, needValue } from '../js/boat/economy.js';
import { boatDefaults } from '../js/boat/save.js';

const st = (o = {}) => ({ ...boatDefaults(), ...o });

test('연잎배: 별·연꽃·완주 3번이 모두 차야 해금', () => {
  const s = st({ clears: 2, mat: { lotus: 10, driftwood: 0, shell: 0, moon_fish: 0 } });
  const c = unlockCheck('lotus', s, { star: 600, coins: 0 });
  assert.equal(c.ok, false);
  assert.deepEqual(c.lacks, [{ key: 'need:clears', have: 2, need: 3 }]);
  assert.equal(unlockCheck('lotus', { ...s, clears: 3 }, { star: 600, coins: 0 }).ok, true);
});

test('부족한 항목을 전부 나열한다', () => {
  const c = unlockCheck('raft', st(), { star: 100, coins: 50 });
  assert.deepEqual(c.lacks.map(l => l.key), ['star', 'coins', 'mat:driftwood']);
});

test('해금하면 별·코인·재료를 빼고 own 에 넣는다(입력 불변)', () => {
  const s = st({ mat: { lotus: 0, driftwood: 30, shell: 0, moon_fish: 0 } });
  const inv = { star: 1500, coins: 3500, wood: 9 };
  const r = unlockBoat('raft', s, inv);
  assert.equal(r.ok, true);
  assert.equal(r.inv.star, 300); assert.equal(r.inv.coins, 500); assert.equal(r.inv.wood, 9);
  assert.equal(r.st.mat.driftwood, 5); assert.equal(r.st.own.raft, 1);
  assert.equal(r.spentCoins, 3000);
  assert.equal(inv.star, 1500); assert.equal(s.mat.driftwood, 30); assert.equal(s.own.raft, undefined);
});

test('이미 가진 배·2차 배는 해금 불가', () => {
  assert.equal(unlockCheck('ferry', st(), { star: 99999, coins: 99999 }).ok, false);
  const rich = { star: 99999, coins: 99999 };
  const full = st({ mat: { lotus: 99, driftwood: 99, shell: 99, moon_fish: 99 } });
  const c = unlockCheck('catamaran', full, rich);
  assert.equal(c.live, false); assert.equal(c.ok, false);
  assert.equal(unlockBoat('catamaran', full, rich).ok, false);
});

test('비단잉어는 급류 무피해 완주가 있어야', () => {
  const s = st({ mat: { lotus: 0, driftwood: 0, shell: 20, moon_fish: 0 } });
  assert.equal(unlockCheck('koi', s, { star: 1500, coins: 0 }).ok, false);
  assert.equal(unlockCheck('koi', { ...s, stat: { ...s.stat, rapidPerfect: 1 } }, { star: 1500, coins: 0 }).ok, true);
});

test('재료 적립: 급류 1.5배 반올림, 모르는 재료는 무시', () => {
  const s = st();
  assert.deepEqual(addRunMats(s, { lotus: 2, shell: 1 }, 1).mat, { lotus: 2, driftwood: 0, shell: 1, moon_fish: 0 });
  assert.deepEqual(addRunMats(s, { lotus: 1, shell: 3, rock: 5 }, 1.5).mat, { lotus: 2, driftwood: 0, shell: 5, moon_fish: 0 });
  assert.equal(s.mat.lotus, 0);
});

test('needValue', () => {
  const s = st({ clears: 4, stat: { ...boatDefaults().stat, raftClears: 2 } });
  assert.equal(needValue('clears', s), 4);
  assert.equal(needValue('raftClears', s), 2);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-economy.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `js/boat/economy.js`**

```js
import { BOATS, MAT_IDS, LIVE_PHASE } from './boats.js';

export const needValue = (key, st) => (key === 'clears' ? st.clears || 0 : (st.stat && st.stat[key]) || 0);

export function unlockCheck(id, st, inv) {
  const b = BOATS[id];
  const owned = !!(st.own && st.own[id]);
  const live = !!b && b.phase <= LIVE_PHASE;
  if (!b || !b.unlock || owned) return { owned, live, ok: false, lacks: [] };
  const u = b.unlock, lacks = [];
  const push = (key, have, need) => { if (have < need) lacks.push({ key, have, need }); };
  push('star', inv.star || 0, u.star);
  push('coins', inv.coins || 0, u.coins);
  for (const m in u.mat) push(`mat:${m}`, (st.mat && st.mat[m]) || 0, u.mat[m]);
  for (const k in u.need) push(`need:${k}`, needValue(k, st), u.need[k]);
  return { owned, live, ok: live && lacks.length === 0, lacks };
}

export function unlockBoat(id, st, inv) {
  const check = unlockCheck(id, st, inv);
  if (!check.ok) return { ok: false, check };
  const u = BOATS[id].unlock;
  const mat = { ...st.mat };
  for (const m in u.mat) mat[m] -= u.mat[m];
  return {
    ok: true,
    st: { ...st, mat, own: { ...st.own, [id]: 1 } },
    inv: { ...inv, star: (inv.star || 0) - u.star, coins: (inv.coins || 0) - u.coins },
    spentCoins: u.coins,
  };
}

export function addRunMats(st, picks, mult) {
  const mat = { ...st.mat };
  for (const id of MAT_IDS) if (picks && picks[id]) mat[id] = (mat[id] || 0) + Math.floor(picks[id] * mult + 0.5);
  return { ...st, mat };
}
```

- [ ] **Step 4: 테스트 통과**

Run: `node --test tests/boat-economy.test.mjs`
Expected: PASS 7/7

- [ ] **Step 5: 커밋**

```bash
git add js/boat/economy.js tests/boat-economy.test.mjs
git commit -m "feat(boat): unlock checks, purchase and river material ledger

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 코스 생성(잔잔한 물길·급류)

**Files:**
- Create: `js/boat/course.js`
- Test: `tests/boat-course.test.mjs`

**Interfaces:**
- Consumes: `RIVER_W`, `RIVER_LEN`, `RIVER_OBS`, `RIVER_PICKS` (Task 2), `placeChest(rnd, { len, width })` (`js/boat-chest.js`, 기존)
- Produces:
  - `COURSE_V = 2`, `FORK_X = [-1.0, 3.2]`
  - `COURSES = { calm: CourseCfg, rapid: CourseCfg }`, `CourseCfg = { first, gapMul, speedMul, starP, pickP, matMul, kinds: [seg1[], seg2[], seg3[]], fork: null | [d0, d1], falls: number[] }`
  - `courseSeedKey(runNo, course): string` → `` `river:${runNo}:${course}` ``
  - `mulberry32(seed)`, `clampW(x, pad = 1.1)` (river.js에서 이동, 동작 동일)
  - `buildCourseData(seed, { night, chest, course }): { items: Item[], fork: null | { d0, d1, x0, x1 }, falls: number[] }`
  - `Item = { d, kind: 'rock'|'log'|'pile'|'whirl'|'star'|'pick'|'chest', x, drift?, pick? }` — 기존 `riverCourse` 원소와 같은 모양, `d` 오름차순

급류의 강 재료 1.5배는 **정산 때만** 곱한다(`matMul`, Task 9). 코스에 깔리는 수집물 수는 잔잔한 물길과 비슷하게 맞춘다. 둘 다 1.5배로 하면 2.25배가 된다.

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_V, COURSES, courseSeedKey, buildCourseData, FORK_X } from '../js/boat/course.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);
const count = (items, kinds) => items.filter(i => kinds.includes(i.kind)).length;
const OBS = ['rock', 'log', 'pile', 'whirl'];

test('버전·시드 키·정산 배율', () => {
  assert.equal(COURSE_V, 2);
  assert.equal(courseSeedKey(2, 'rapid'), 'river:2:rapid');
  assert.equal(COURSES.calm.matMul, 1); assert.equal(COURSES.rapid.matMul, 1.5);
  assert.equal(COURSES.calm.speedMul, 1); assert.equal(COURSES.rapid.speedMul, 1.2);
});

test('같은 시드는 같은 코스', () => {
  for (const course of ['calm', 'rapid']) {
    assert.deepEqual(buildCourseData(42, { night: false, course }), buildCourseData(42, { night: false, course }));
  }
});

test('잔잔한 물길: 첫 장애물 70m 이후, 1구간엔 바위만', () => {
  for (const s of SEEDS) {
    const obs = buildCourseData(s, { night: false, course: 'calm' }).items.filter(i => OBS.includes(i.kind));
    assert.ok(obs[0].d >= 70, `seed ${s}: ${obs[0].d}`);
    assert.ok(obs.filter(o => o.d / 620 < 0.34).every(o => o.kind === 'rock'), `seed ${s}`);
  }
});

test('급류: 장애물이 더 많고, 별·수집물 수는 잔잔한 물길과 비슷', () => {
  let cs = 0, rs = 0, co = 0, ro = 0, cp = 0, rp = 0;
  for (const s of SEEDS) {
    const c = buildCourseData(s, { night: true, course: 'calm' }).items;
    const r = buildCourseData(s, { night: true, course: 'rapid' }).items;
    cs += count(c, ['star']); rs += count(r, ['star']);
    co += count(c, ['rock', 'log', 'pile']); ro += count(r, ['rock', 'log', 'pile']);
    cp += count(c, ['pick']); rp += count(r, ['pick']);
  }
  assert.ok(rs / cs >= 0.9 && rs / cs <= 1.1, `별 비율 ${(rs / cs).toFixed(3)}`);
  assert.ok(rp / cp >= 0.85 && rp / cp <= 1.15, `수집물 비율 ${(rp / cp).toFixed(3)}`);
  assert.ok(ro > co * 1.2, `장애물 ${co} → ${ro}`);
});

test('급류: 갈림길 섬 안과 폭포 ±10m 엔 장애물이 없다', () => {
  for (const s of SEEDS) {
    const { items, fork, falls } = buildCourseData(s, { night: false, course: 'rapid' });
    assert.deepEqual([fork.d0, fork.d1, fork.x0, fork.x1], [270, 330, FORK_X[0], FORK_X[1]]);
    assert.deepEqual(falls, [180, 450]);
    for (const o of items.filter(i => OBS.includes(i.kind))) {
      const inIsland = o.d > fork.d0 && o.d < fork.d1 && o.x > fork.x0 - 1 && o.x < fork.x1 + 1;
      assert.ok(!inIsland, `seed ${s}: 섬 위 장애물 ${o.kind}@${o.d}`);
      assert.ok(falls.every(f => Math.abs(o.d - f) >= 10), `seed ${s}: 폭포 옆 ${o.d}`);
    }
  }
});

test('잔잔한 물길엔 갈림길·폭포가 없다', () => {
  const r = buildCourseData(7, { night: false, course: 'calm' });
  assert.equal(r.fork, null); assert.deepEqual(r.falls, []);
});

test('상자: 루프 뒤에만 난수를 써서 상자 없는 날 코스가 같다', () => {
  const a = buildCourseData(99, { night: false, course: 'calm', chest: false }).items;
  const b = buildCourseData(99, { night: false, course: 'calm', chest: true }).items;
  assert.equal(count(b, ['chest']), 1);
  assert.deepEqual(b.filter(i => i.kind !== 'chest'), a);
});

test('밤 전용 수집물은 낮에 안 나온다', () => {
  for (const s of SEEDS) assert.ok(buildCourseData(s, { night: false, course: 'rapid' }).items.every(i => i.pick !== 'moon_fish'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-course.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `js/boat/course.js`**

```js
import { RIVER_W, RIVER_LEN, RIVER_OBS, RIVER_PICKS } from './consts.js';
import { placeChest } from '../boat-chest.js';

export const COURSE_V = 2;
export const FORK_X = [-1.0, 3.2];

export const COURSES = {
  calm: {
    first: 70, gapMul: 1, speedMul: 1, starP: 0.78, pickP: 0.22, matMul: 1, fork: null, falls: [],
    kinds: [['rock'], ['rock', 'log', 'whirl', 'rock'], ['rock', 'log', 'whirl', 'pile', 'rock']],
  },
  rapid: {
    first: 40, gapMul: 0.72, speedMul: 1.2, starP: 0.4, pickP: 0.16, matMul: 1.5, fork: [270, 330], falls: [180, 450],
    kinds: [['rock', 'log', 'rock'], ['rock', 'log', 'whirl', 'rock', 'pile'], ['rock', 'log', 'whirl', 'pile', 'pile', 'rock']],
  },
};

export const courseSeedKey = (runNo, course) => `river:${runNo}:${course}`;

export function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clampW(x, pad = 1.1) { return Math.max(-RIVER_W + pad, Math.min(RIVER_W - pad, x)); }

export function buildCourseData(seed, { night = false, chest = false, course = 'calm' } = {}) {
  const cfg = COURSES[course] || COURSES.calm;
  const rnd = mulberry32(seed);
  const items = [];
  const fork = cfg.fork ? { d0: cfg.fork[0], d1: cfg.fork[1], x0: FORK_X[0], x1: FORK_X[1] } : null;
  const inFork = d => !!fork && d > fork.d0 && d < fork.d1;
  const nearFall = d => cfg.falls.some(f => Math.abs(d - f) < 10);
  let d = cfg.first;
  while (d < RIVER_LEN - 24) {
    const p = d / RIVER_LEN;
    const seg = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
    const gap = ((seg === 0 ? 26 : seg === 1 ? 17 : 12.5) + rnd() * 8) * cfg.gapMul;
    const kinds = cfg.kinds[seg];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const gx = rnd() * 2 - 1;
    if (inFork(d)) {
      items.push({ d, kind: 'rock', x: -RIVER_W + 2.2 + (gx + 1) * 0.6 });
    } else if (!nearFall(d)) {
      if (kind === 'pile') {
        const cx = gx * (RIVER_W - 3);
        items.push({ d, kind: 'pile', x: cx - 2.4 }, { d, kind: 'pile', x: cx + 2.4 });
      } else {
        items.push({ d, kind, x: clampW(gx * RIVER_W, RIVER_OBS[kind].r + 0.3), drift: kind === 'log' ? (rnd() * 2 - 1) * 0.7 : 0 });
      }
    }
    if (rnd() < cfg.starP && !inFork(d)) {
      const n = 3 + Math.floor(rnd() * 3);
      const sx = (rnd() * 2 - 1) * (RIVER_W - 1.4), curve = (rnd() * 2 - 1) * 0.9;
      for (let i = 0; i < n; i++) items.push({ d: d + gap * 0.42 + i * 2.7, kind: 'star', x: clampW(sx + curve * i) });
    }
    if (rnd() < cfg.pickP) {
      const cands = RIVER_PICKS.filter(k => !k.night || night);
      const k = cands[Math.floor(rnd() * cands.length)];
      items.push({ d: d + gap * 0.68, kind: 'pick', pick: k.id, x: clampW((rnd() * 2 - 1) * RIVER_W, 1.3) });
    }
    d += gap;
  }
  if (fork) for (let s = fork.d0 + 4; s < fork.d1 - 4; s += 3.2) items.push({ d: s, kind: 'star', x: RIVER_W - 1.5 });
  if (chest) {
    const c = placeChest(rnd, { len: RIVER_LEN, width: RIVER_W });
    const near = items.filter(o => RIVER_OBS[o.kind] && Math.abs(o.d - c.d) < 4);
    const clash = x => near.some(o => Math.abs(o.x - x) < RIVER_OBS[o.kind].r + 1.6);
    if (clash(c.x)) c.x = clash(-c.x) ? clampW(c.x + (c.x > 0 ? -3.2 : 3.2), 1.3) : -c.x;
    items.push({ d: c.d, kind: 'chest', x: c.x });
  }
  items.sort((a, b) => a.d - b.d);
  return { items, fork, falls: [...cfg.falls] };
}
```

기존 `buildCourse`와 난수 호출 순서가 다르다(코스 버전 2로 올리는 의도된 변경). 섬 구간의 바위는 왼쪽 넓은 물길(x ≈ −4.2 ~ −3.0)에 둔다.

- [ ] **Step 4: 테스트 실행, 확률 조정**

Run: `node --test tests/boat-course.test.mjs`
Expected: PASS 8/8. "별 비율"만 실패하면 `COURSES.rapid.starP`를, "수집물 비율"만 실패하면 `COURSES.rapid.pickP`를 0.01 단위로 조정한다. 다른 값은 바꾸지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add js/boat/course.js tests/boat-course.test.mjs
git commit -m "feat(boat): course generator with calm onboarding and rapids

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 배 능력·콤보·아슬아슬 판정

**Files:**
- Create: `js/boat/abilities.js`
- Test: `tests/boat-abilities.test.mjs`

**Interfaces:**
- Consumes: `BOATS` (Task 2), `RIVER_OBS`, `BOAT_BOOST_CD` (Task 2)
- Produces:
  - `COMBO_WINDOW = 1.5`, `NEAR_BAND = 0.6`, `NEAR_GAIN = 0.35`, `HIT_PAD = 0.7`, `RIDE = { spin: 0.8, boost: 1.4, boostDur: 1.5 }`
  - `comboStep(c, t): { n, last, bonus }` — `c = { n, last }`
  - `steerParams(boatId): { acc, maxVx }` — `26 * steer`, `6.2 * steer`
  - `boostCd(windLv): number` — `BOAT_BOOST_CD - [0, 0.3, 0.55, 0.8][min(lv,3)]`
  - `hitRadius(boatId, kind)`, `isHit(dx, boatId, kind)`, `isNearMiss(dx, boatId, kind)`
  - `obstacleOutcome(boatId, kind, { diving, ramLeft }): 'pass' | 'push' | 'ram' | 'hit'`
  - `ramPerRun(lv): number` — `[0, 1, 1, 2][min(lv,3)]`
  - `whirlMode(boatId): 'pull' | 'ride'`
  - `skillReady(skill, t, readyAt): boolean`, `startSkill(skill, t): { until, readyAt }`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/boat/abilities.js';

test('콤보: 1.5초 안이면 이어지고 10마다 보너스', () => {
  let c = { n: 0, last: -99 };
  const bonuses = [];
  for (let i = 0; i < 20; i++) { c = A.comboStep(c, i * 1.0); bonuses.push(c.bonus); }
  assert.equal(c.n, 20);
  assert.equal(bonuses.reduce((a, b) => a + b, 0), 2);
  assert.equal(A.comboStep({ n: 7, last: 10 }, 11.6).n, 1);
  assert.equal(A.comboStep({ n: 7, last: 10 }, 11.5).n, 8);
});

test('조향: 뗏목은 느리고 연잎배는 빠르다', () => {
  assert.deepEqual(A.steerParams('ferry'), { acc: 26, maxVx: 6.2 });
  assert.ok(A.steerParams('raft').acc < 26 && A.steerParams('lotus').acc > 26);
});

test('스퍼트 대기: 순풍 깃발 단계', () => {
  assert.equal(A.boostCd(0), 3.2);
  assert.equal(A.boostCd(2), 3.2 - 0.55);
  assert.equal(A.boostCd(9), 3.2 - 0.8);
});

test('충돌 판정과 아슬아슬 띠', () => {
  const r = 1.15 + 0.7;
  assert.equal(A.isHit(r - 0.01, 'ferry', 'rock'), true);
  assert.equal(A.isHit(r, 'ferry', 'rock'), false);
  assert.equal(A.isNearMiss(r, 'ferry', 'rock'), true);
  assert.equal(A.isNearMiss(r + 0.59, 'ferry', 'rock'), true);
  assert.equal(A.isNearMiss(r + 0.6, 'ferry', 'rock'), false);
  assert.equal(A.isNearMiss(0.75 + 0.7, 'ferry', 'pile'), false);
  assert.ok(A.hitRadius('lotus', 'rock') < A.hitRadius('ferry', 'rock'));
});

test('장애물 결과: 잠수 > 통나무 밀기 > 쇄빙 > 충돌', () => {
  assert.equal(A.obstacleOutcome('koi', 'rock', { diving: true, ramLeft: 0 }), 'pass');
  assert.equal(A.obstacleOutcome('raft', 'log', { diving: false, ramLeft: 1 }), 'push');
  assert.equal(A.obstacleOutcome('raft', 'rock', { diving: false, ramLeft: 1 }), 'ram');
  assert.equal(A.obstacleOutcome('ferry', 'pile', { diving: false, ramLeft: 1 }), 'hit');
  assert.equal(A.obstacleOutcome('ferry', 'rock', { diving: false, ramLeft: 0 }), 'hit');
});

test('쇄빙 횟수 상한은 판마다 2번', () => {
  assert.deepEqual([0, 1, 2, 3, 7].map(A.ramPerRun), [0, 1, 1, 2, 2]);
});

test('소용돌이·스킬', () => {
  assert.equal(A.whirlMode('lotus'), 'ride'); assert.equal(A.whirlMode('ferry'), 'pull');
  const sk = { id: 'dive', dur: 1.2, cd: 9 };
  assert.equal(A.skillReady(sk, 5, 0), true);
  const s = A.startSkill(sk, 5);
  assert.deepEqual(s, { until: 6.2, readyAt: 14 });
  assert.equal(A.skillReady(sk, 13.9, s.readyAt), false);
  assert.equal(A.skillReady(null, 99, 0), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-abilities.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `js/boat/abilities.js`**

```js
import { BOATS } from './boats.js';
import { RIVER_OBS, BOAT_BOOST_CD } from './consts.js';

export const COMBO_WINDOW = 1.5;
export const NEAR_BAND = 0.6;
export const NEAR_GAIN = 0.35;
export const HIT_PAD = 0.7;
export const RIDE = { spin: 0.8, boost: 1.4, boostDur: 1.5 };

const lvAt = (arr, lv) => arr[Math.max(0, Math.min(arr.length - 1, lv || 0))];
const B = id => BOATS[id] || BOATS.ferry;

export function comboStep(c, t) {
  const n = t - c.last <= COMBO_WINDOW ? c.n + 1 : 1;
  return { n, last: t, bonus: n % 10 === 0 ? 1 : 0 };
}

export const steerParams = id => ({ acc: 26 * B(id).steer, maxVx: 6.2 * B(id).steer });
export const boostCd = windLv => BOAT_BOOST_CD - lvAt([0, 0.3, 0.55, 0.8], windLv);
export const hitRadius = (id, kind) => RIVER_OBS[kind].r * B(id).hitR;
export const isHit = (dx, id, kind) => dx < hitRadius(id, kind) + HIT_PAD;

export function isNearMiss(dx, id, kind) {
  if (kind !== 'rock' && kind !== 'log') return false;
  const edge = hitRadius(id, kind) + HIT_PAD;
  return dx >= edge && dx < edge + NEAR_BAND;
}

export function obstacleOutcome(id, kind, ctx) {
  if (ctx.diving) return 'pass';
  if (B(id).logPush && kind === 'log') return 'push';
  if (ctx.ramLeft > 0 && kind === 'rock') return 'ram';
  return 'hit';
}

export const ramPerRun = lv => lvAt([0, 1, 1, 2], lv);
export const whirlMode = id => B(id).whirl;
export const skillReady = (skill, t, readyAt) => !!skill && t >= readyAt;
export const startSkill = (skill, t) => ({ until: t + skill.dur, readyAt: t + skill.cd });
```

- [ ] **Step 4: 테스트 통과**

Run: `node --test tests/boat-abilities.test.mjs`
Expected: PASS 7/7

- [ ] **Step 5: 커밋**

```bash
git add js/boat/abilities.js tests/boat-abilities.test.mjs
git commit -m "feat(boat): pure ability rules for combo, near miss, ram, push and dive

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 공정성·획득 기간 시뮬레이션

**Files:**
- Create: `tests/helpers/boat-bot.mjs`, `tests/boat-balance.test.mjs`
- Modify(조정 시): `js/boat/boats.js`의 `hitR`·`steer`, `js/boat/abilities.js`의 `RIDE`

**Interfaces:**
- Consumes: `buildCourseData`, `COURSES` (Task 5), 능력 함수 (Task 6), `BOATS`, `liveBoatIds`, `BOAT_IDS` (Task 2), 상수 (Task 2)
- Produces: `runBot(boatId, seed, course): { result: 'clear'|'wreck', stars: number, hits: number }`

봇은 실제 런 루프를 흉내 낸 단순 모델이다. 규칙을 고정해 배끼리 비교하는 용도이고, 사람 완주율을 맞추는 용도가 아니다.

- [ ] **Step 1: 봇 `tests/helpers/boat-bot.mjs`**

```js
import { buildCourseData, COURSES } from '../../js/boat/course.js';
import * as A from '../../js/boat/abilities.js';
import { BOATS } from '../../js/boat/boats.js';
import { BOAT_BASE_SPEED, RIVER_LEN, RIVER_W, RIVER_OBS } from '../../js/boat/consts.js';

const DT = 1 / 30, LOOK = 16, REACT = 0.35;
const LANES = [-5, -3.5, -2, -0.5, 0.5, 2, 3.5, 5];

export function runBot(boatId, seed, course = 'calm') {
  const cfg = COURSES[course];
  const live = buildCourseData(seed, { night: false, course }).items.map(i => ({ ...i, done: false }));
  const b = BOATS[boatId], sp = A.steerParams(boatId);
  let x = 0, vx = 0, dist = 0, t = 0, lamps = b.lamps, stars = 0, hits = 0, stunUntil = 0, invUntil = 0;
  let skillUntil = 0, skillReadyAt = 0, rideBoostUntil = 0, decideAt = 0, target = 0;
  while (dist < RIVER_LEN && lamps > 0 && t < 200) {
    t += DT;
    let speed = BOAT_BASE_SPEED * (1 + (dist / RIVER_LEN) * 0.55) * cfg.speedMul;
    if (t < rideBoostUntil) speed *= A.RIDE.boost;
    if (t < stunUntil) speed = 0;
    dist += speed * DT;
    for (const o of live) if (o.drift) o.x = Math.max(-RIVER_W + 2, Math.min(RIVER_W - 2, o.x + o.drift * DT));
    if (t >= decideAt) {
      decideAt = t + REACT;
      const ahead = live.filter(o => !o.done && RIVER_OBS[o.kind]?.hit && o.d - dist > 0 && o.d - dist < LOOK);
      const score = lx => Math.min(9, ...ahead.map(o => Math.abs(o.x - lx) - A.hitRadius(boatId, o.kind))) - Math.abs(lx - x) * 0.05;
      target = LANES.reduce((best, lx) => (score(lx) > score(best) ? lx : best), x);
      if (A.skillReady(b.skill, t, skillReadyAt) && ahead.some(o => o.d - dist < 6 && Math.abs(o.x - x) < 2)) {
        const s = A.startSkill(b.skill, t); skillUntil = s.until; skillReadyAt = s.readyAt;
      }
    }
    if (t >= stunUntil) vx += Math.max(-1, Math.min(1, (target - x) * 0.8)) * sp.acc * DT;
    vx *= Math.pow(0.06, DT);
    vx = Math.max(-sp.maxVx, Math.min(sp.maxVx, vx));
    x = Math.max(-RIVER_W + 0.7, Math.min(RIVER_W - 0.7, x + vx * DT));
    for (const o of live) {
      if (o.done || Math.abs(o.d - dist) > 1.0) continue;
      const dx = Math.abs(o.x - x);
      if (o.kind === 'star') { if (dx < 1.5 && t >= skillUntil) { o.done = true; stars++; } continue; }
      if (o.kind === 'whirl') {
        if (dx < RIVER_OBS.whirl.r + 1) { o.done = true; if (A.whirlMode(boatId) === 'ride') rideBoostUntil = t + A.RIDE.spin + A.RIDE.boostDur; }
        continue;
      }
      if (!RIVER_OBS[o.kind]?.hit || !A.isHit(dx, boatId, o.kind)) continue;
      o.done = true;
      if (t < invUntil) continue;
      if (A.obstacleOutcome(boatId, o.kind, { diving: t < skillUntil, ramLeft: 0 }) === 'hit') {
        lamps--; hits++; stunUntil = t + 1.15; invUntil = stunUntil + 1.0;
      }
    }
  }
  return { result: lamps > 0 && dist >= RIVER_LEN ? 'clear' : 'wreck', stars, hits };
}
```

- [ ] **Step 2: 테스트 `tests/boat-balance.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBot } from './helpers/boat-bot.mjs';
import { liveBoatIds, BOATS, BOAT_IDS } from '../js/boat/boats.js';

const SEEDS = Array.from({ length: 50 }, (_, i) => 20261027 + i * 104729);
const stats = (id, course) => {
  const rs = SEEDS.map(s => runBot(id, s, course));
  return { clear: rs.filter(r => r.result === 'clear').length / rs.length, stars: rs.reduce((a, r) => a + r.stars, 0) / rs.length };
};

for (const course of ['calm', 'rapid']) {
  test(`공정성(${course}): 1차 배는 나룻배 대비 완주율 ±10%p, 평균 별 ±15%`, () => {
    const base = stats('ferry', course);
    assert.ok(base.clear > 0.2 && base.clear < 1, `기준 완주율 ${base.clear}`);
    for (const id of liveBoatIds().filter(i => i !== 'ferry')) {
      const s = stats(id, course);
      assert.ok(Math.abs(s.clear - base.clear) <= 0.10, `${id} 완주율 ${s.clear.toFixed(2)} vs ${base.clear.toFixed(2)}`);
      assert.ok(Math.abs(s.stars / base.stars - 1) <= 0.15, `${id} 별 ${s.stars.toFixed(1)} vs ${base.stars.toFixed(1)}`);
    }
  });
}

test('급류가 잔잔한 물길보다 어렵다', () => {
  assert.ok(stats('ferry', 'rapid').clear < stats('ferry', 'calm').clear);
});

const RATE = { star: 70, lotus: 0.92, driftwood: 0.78, shell: 0.84, moon_fish: 0.55 };
const SPEC_DAYS = { 3: [4, 11, 15, 27, 39, 53, 70, 94], 1: [11, 32, 46, 81, 117, 160, 210, 281] };
const ORDER = ['lotus', 'raft', 'koi', 'catamaran', 'paper', 'walnut', 'lotuslamp', 'gourd'];

function unlockDays(perDay) {
  let star = 0;
  const used = { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 };
  return ORDER.map(id => {
    const u = BOATS[id].unlock;
    star += u.star;
    for (const m in u.mat) used[m] += u.mat[m];
    const days = Math.max(star / (RATE.star * perDay), ...Object.keys(used).map(m => used[m] / (RATE[m] * perDay)), (u.need.clears || 0) / perDay);
    return Math.ceil(days - 1e-9);
  });
}

for (const perDay of [3, 1]) {
  test(`획득 기간(하루 ${perDay}판): 설계 표 ±10%`, () => {
    unlockDays(perDay).forEach((d, i) => {
      const want = SPEC_DAYS[perDay][i];
      assert.ok(Math.abs(d - want) <= Math.max(1, want * 0.1), `${ORDER[i]}: ${d}일 vs 표 ${want}일`);
    });
  });
}

test('해금 순서 목록은 나룻배를 뺀 8척', () => {
  assert.deepEqual(ORDER, BOAT_IDS.filter(id => id !== 'ferry'));
});
```

- [ ] **Step 3: 실행**

Run: `node --test tests/boat-balance.test.mjs`
Expected: 획득 기간 2개와 순서 테스트는 PASS. 공정성 테스트는 처음엔 FAIL할 수 있다.

- [ ] **Step 4: 수치 조정**

공정성 테스트가 통과할 때까지 이 값들**만** 조정한다.
- `js/boat/boats.js`: `hitR`·`steer` (0.02 단위)
- `js/boat/abilities.js`: `RIDE.boost`·`RIDE.boostDur` (0.05 단위)

`lamps`·해금 조건·`skill`은 설계 값이라 바꾸지 않는다. 기준 완주율(`base.clear`)이 0.2~1을 벗어나면 배가 아니라 봇의 `REACT`·`LOOK`을 조정한다.

위 값만으로 ±10%p에 못 들면 멈추고 사용자에게 보고한다(어느 배가 얼마나 벗어나는지, `lamps` 조정 제안). 설계 값을 임의로 바꾸지 않는다.

Run: `node --test tests/boat-balance.test.mjs tests/boat-boats.test.mjs tests/boat-abilities.test.mjs`
Expected: 전부 PASS

- [ ] **Step 5: 커밋**

최종 조정값(`hitR`·`steer`·`RIDE`)을 커밋 본문에 적는다.

```bash
git add tests/helpers/boat-bot.mjs tests/boat-balance.test.mjs js/boat/boats.js js/boat/abilities.js
git commit -m "test(boat): fairness bot and unlock pacing guardrails

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 배 조형 이식

**Files:**
- Create: `js/boat/models.js`
- Test: `tests/boat-models.test.mjs`

**Interfaces:**
- Consumes: `sims/boat-models.js`의 `lotusLeaf`·`raftBoat`·`carpKoi`와 도우미, `js/spaces/river.js`의 `makeBoatHull`·`makeOar`·기존 `makeBoatRideable` 본문
- Produces:
  - `makeBoatModel(boatId): THREE.Group` — 진행 방향 −z, 물높이 y=0 기준
  - `userData.oars: Object3D[]`(노 젓기 애니메이션 대상, `rotation.x`를 흔든다), `userData.fpHide: Object3D[]`(1인칭에서 숨길 메시), `userData.lantern`·`userData.light`(나룻배만, 없으면 undefined)
  - 1차는 `ferry`·`lotus`·`raft`·`koi`. 그 외 id는 `ferry`.

- [ ] **Step 1: 텍스트 테스트(three 없이 검사)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/boat/models.js', import.meta.url), 'utf8');

test('1차 4척 조형 함수와 진입점', () => {
  assert.match(src, /export function makeBoatModel\(boatId\)/);
  for (const f of ['ferryModel', 'lotusModel', 'raftModel', 'koiModel']) assert.match(src, new RegExp(`function ${f}\\(`), f);
  for (const k of ['oars', 'fpHide']) assert.match(src, new RegExp(`userData\\.${k}`), k);
});

test('나룻배는 기존 선체·노·등불을 그대로 쓴다', () => {
  assert.match(src, /makeBoatHull\(/);
  assert.match(src, /makeOar\(/);
  assert.match(src, /BOAT_LAMP_POST/);
});

test('재질은 공유한다', () => {
  assert.match(src, /const MAT = \{/);
  assert.ok((src.match(/new THREE\.MeshStandardMaterial/g) || []).length <= 16);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-models.test.mjs`
Expected: FAIL (`ENOENT`)

- [ ] **Step 3: `js/boat/models.js` 작성**

뼈대:

```js
import * as THREE from 'three';
import { makeBoatHull, makeOar } from '../spaces/river.js';
import { BOAT_LAMP, BOAT_LAMP_POST } from '../boat-lamp.js';

const MAT = {
  trim: new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.95 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb2453e, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5fa64f, roughness: 0.9 }),
  vein: new THREE.MeshStandardMaterial({ color: 0x8cc66f, roughness: 0.9 }),
  petal: new THREE.MeshStandardMaterial({ color: 0xf4a6c6, roughness: 0.9 }),
  seat: new THREE.MeshStandardMaterial({ color: 0xc78a5a, roughness: 0.9 }),
  log: new THREE.MeshStandardMaterial({ color: 0xa9784e, roughness: 0.95 }),
  rope: new THREE.MeshStandardMaterial({ color: 0xe8d3a3, roughness: 0.95 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x1f1a17, roughness: 0.5 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.4, metalness: 0.3 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xe98d8d, roughness: 0.6 }),
  fin: new THREE.MeshStandardMaterial({ color: 0xffd9c8, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
};

const MAKERS = { ferry: ferryModel, lotus: lotusModel, raft: raftModel, koi: koiModel };

export function makeBoatModel(boatId) {
  const g = (MAKERS[boatId] || ferryModel)();
  g.userData.oars ??= [];
  g.userData.fpHide ??= [];
  return g;
}
```

이어서 네 함수를 아래 규칙대로 쓴다.
- `ferryModel()`: `js/spaces/river.js`의 `makeBoatRideable()` 본문을 그대로 옮긴다(선체 `makeBoatHull(1.05)` + `makeOar(-1)`·`makeOar(1)` + 등불 기둥·구·갓·`PointLight`). 노 두 개를 `g.userData.oars`에 넣고, `g.userData.lantern`·`g.userData.light`는 원래대로. 원본의 긴 주석은 옮기지 않는다(전역 규칙). 대신 그 내용(등불을 시선 위 왼쪽 기둥에 두는 이유, 블룸 임계 0.85)은 커밋 본문에 남긴다.
- `lotusModel()`: `sims/boat-models.js`의 `lotusLeaf()`를 옮긴다. `clay(...)` 호출은 `MAT.leaf`·`MAT.vein`·`MAT.petal`·`MAT.seat`·`MAT.trim`으로 바꾼다. 꽃(분홍 구 6개 + 노란 구)은 1인칭에서 오른쪽 아래를 가리므로 `fpHide`에 넣는다. 장대는 `oars`에 넣는다.
- `raftModel()`: `raftBoat()`를 옮긴다. 장대는 `oars`에 넣는다.
- `koiModel()`: `carpKoi()`와 도우미(`fishBoat`·`paint`·`lathe`·`fan`·`wave`·`eye`·`saddle`·`curveTube`·`noise`)를 옮긴다. 몸통(정점 색칠)과 꼬리(정점 색칠)는 자기 재질을 쓴다. 나머지는 `MAT`. 시안에서는 머리가 −z라 그대로 둔다. 등지느러미·안장은 `fpHide`에 넣는다.

`river.js`와 서로 import하는 구조라 `makeBoatHull`·`makeOar`는 함수 안에서만 호출한다(모듈 최상단에서 호출하지 않는다).

- [ ] **Step 4: 테스트 통과**

Run: `node --test tests/boat-models.test.mjs`
Expected: PASS 3/3

- [ ] **Step 5: 커밋**

```bash
git add js/boat/models.js tests/boat-models.test.mjs
git commit -m "feat(boat): rideable models for ferry, lotus, raft and koi

Ferry lantern stays on the left post above eye level; glow colour stays
under the 0.85 bloom threshold (see js/boat-lamp.js).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 런 루프 연결

**Files:**
- Modify: `js/spaces/river.js` (import, `boatLampMax`·`boatShopView`·`buyBoatUpgrade`·`mulberry32`·`clampW`·`buildCourse`·`makeBoatRideable`·`startBoatRun`·`endBoatRun`·`updateBoatRun`·`updateRiverObjects`)
- Modify: `js/game.js` (`wantSkill` 선언·`$w` 접근자·export 목록, river import 목록 173행, Input 훅 2041~2042행, 창고 열기 7226행, 키 입력)
- Modify: `tests/boat-chest-wiring.test.mjs`, `tests/boat-lamp.test.mjs`(텍스트를 읽는 대상이 옮겨졌을 때만)
- Modify: `docs/superpowers/specs/2026-10-27-boat-lineup-design.md` (12장 `boat_unlock` 파라미터, 7장 재료 1.5배 위치)
- Test: `tests/boat-run-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 2~8 전부
- Produces (Task 10이 쓴다):
  - `river.js`: `dockView(): DockView`, `selectBoat(id)`, `selectCourse(course)`, `unlockBoatNow(id)` — 반환 `{ ok: boolean, msg?: string, name?: string, ico?: string }`
  - `DockView = { star, coins, runsLeft, runsMax, best, bestRapid, sel, mat, rapidOpen: boolean, boats: Array<{ id, name, ico, owned, live, selected, lamps, skill, lacks, ok }> }`
  - `game.js` Input: `getDock()`, `selectBoat(id)`, `selectCourse(c)`, `unlockBoat(id)`, `boatSkill()`
  - HUD 객체(`ui.setBoatHud`)에 `skill: number|null`(0~1 쿨다운), `skillIco: string`, `combo: number` 추가

- [ ] **Step 1: 실패하는 배선 테스트 `tests/boat-run-wiring.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const R = readFileSync(new URL('../js/spaces/river.js', import.meta.url), 'utf8');
const G = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const fn = name => { const i = R.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return R.slice(i, R.indexOf('\n}\n', i)); };
const call = (body, ev) => { const i = body.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, `${ev} 없음`); return body.slice(i, body.indexOf('});', i)); };

test('옛 강화 코드가 사라졌다', () => {
  for (const s of ['BOAT_UPGRADES', 'BOAT_LAMPS', 'buyBoatUpgrade', 'boatShopView', 'boatLampMax', 'up.hull', 'up.lamp', 'up.oar']) assert.ok(!R.includes(s), s);
});

test('startBoatRun: 고른 배·코스로 시드와 코스를 만든다', () => {
  const s = fn('startBoatRun');
  assert.match(s, /courseSeedKey\(boat\.runNo, course\)/);
  assert.match(s, /buildCourse\(boat\.seed, boat\.night, \{ chest: offered, course \}\)/);
  assert.match(s, /lamps: BOATS\[boatId\]\.lamps/);
  assert.match(s, /ramLeft: ramPerRun\(/);
  assert.match(s, /makeBoatModel\(boatId\)/);
  for (const p of ['boat_id', 'course']) assert.match(call(s, 'boat_start'), new RegExp(`${p}:|\\b${p},`), p);
});

test('급류는 첫 완주 전엔 못 탄다', () => {
  assert.match(fn('selectCourse'), /clears/);
  assert.match(fn('startBoatRun'), /clears/);
});

test('updateBoatRun: 코스 속도 배율·스킬·스퍼트 대기·조향', () => {
  const u = fn('updateBoatRun');
  assert.match(u, /COURSES\[boat\.course\]\.speedMul/);
  assert.match(u, /wantSkill/);
  assert.match(u, /startSkill\(/);
  assert.match(u, /boostCd\(/);
  assert.match(u, /steerParams\(boat\.boatId\)/);
  assert.match(u, /userData\.oars/);
  assert.match(call(u, 'boat_skill'), /boat_id:/);
});

test('updateRiverObjects: 판정은 abilities 로', () => {
  const u = fn('updateRiverObjects');
  for (const f of ['obstacleOutcome', 'isHit', 'isNearMiss', 'comboStep', 'whirlMode']) assert.match(u, new RegExp(`${f}\\(`), f);
});

test('endBoatRun: 재료 적립·통계·새 컬럼', () => {
  const e = fn('endBoatRun');
  assert.match(e, /addRunMats\(/);
  assert.match(e, /COURSES\[boat\.course\]\.matMul/);
  for (const k of ['rapidClears', 'rapidNightClears', 'rapidPerfect', 'nightClears', 'raftClears', 'comboBest']) assert.match(e, new RegExp(k), k);
  for (const c of ['course: boat.course', 'boat_id: boat.boatId', 'loadout:', 'skill_used:', 'combo_max:', 'near_miss:', 'mats:', 'course_v: COURSE_V']) assert.ok(e.includes(c), c);
  for (const p of ['boat_id', 'course']) assert.match(call(e, 'boat_end'), new RegExp(`${p}:`), p);
  assert.match(e, /bestRapid/);
});

test('unlockBoatNow: 코인 원장·GA4', () => {
  const u = fn('unlockBoatNow');
  assert.match(u, /unlockBoat\(/);
  assert.match(u, /logEcon\('boat_unlock'/);
  assert.match(call(u, 'boat_unlock'), /boat_id:/);
});

test('game.js: wantSkill 접근자·Input 훅·스킬 키', () => {
  assert.match(G, /let wantSkill = false;/);
  assert.match(G, /get wantSkill\(\) \{ return wantSkill; \}, set wantSkill\(v\) \{ wantSkill = v; \}/);
  for (const h of ['getDock()', 'selectBoat(id)', 'selectCourse(c)', 'unlockBoat(id)', 'boatSkill()']) assert.ok(G.includes(h), h);
  assert.match(G, /KeyF/);
  assert.ok(!G.includes('boatShopView'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-run-wiring.test.mjs`
Expected: FAIL (여러 단언)

- [ ] **Step 3: import 정리**

`js/spaces/river.js` 상단:
- `../data/places.js` import에서 `BOAT_BASE_SPEED, BOAT_BOOST_CD, BOAT_LAMPS, BOAT_RUNS_PER_DAY, BOAT_UPGRADES, RIVER_LEN, RIVER_OBS, RIVER_PICKS, RIVER_W`를 빼고(`DOCK_GATE, DOCK_POND, DOCK_POND_R, RIVER, RIVER_DOCK_HALF`만 남김) 다음을 추가:

```js
import { BOAT_BASE_SPEED, BOAT_BOOST_CD, BOAT_RUNS_PER_DAY, RIVER_LEN, RIVER_OBS, RIVER_PICKS, RIVER_W } from '../boat/consts.js';
import { BOATS, liveBoatIds } from '../boat/boats.js';
import { COURSES, COURSE_V, buildCourseData, courseSeedKey, clampW, mulberry32 } from '../boat/course.js';
import { comboStep, steerParams, boostCd, isHit, isNearMiss, obstacleOutcome, ramPerRun, whirlMode, skillReady, startSkill, NEAR_GAIN, RIDE } from '../boat/abilities.js';
import { unlockCheck, unlockBoat, addRunMats } from '../boat/economy.js';
import { makeBoatModel } from '../boat/models.js';
```
- `../game.js` import 목록에 `wantSkill` 추가.
- `export function mulberry32`·`export function clampW` 정의를 지우고 `export { mulberry32, clampW };` 한 줄로 다시 내보낸다. 확인: `grep -rn "mulberry32\|clampW" js index.html`.

- [ ] **Step 4: 강화 상점 삭제와 창고 함수**

`boatLampMax`·`boatShopView`·`buyBoatUpgrade`를 지우고:

```js
export function dockView() {
  const st = gameState.boat, inv = gameState.inventory;
  return {
    star: inv.star || 0, coins: inv.coins || 0, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
    best: st.best || 0, bestRapid: st.bestRapid || 0, sel: { ...st.sel }, mat: { ...st.mat },
    rapidOpen: (st.clears || 0) >= 1,
    boats: liveBoatIds().map(id => {
      const b = BOATS[id], c = unlockCheck(id, st, inv);
      return { id, name: b.name, ico: b.ico, owned: !!st.own[id], live: true, selected: st.sel.boat === id, lamps: b.lamps, skill: b.skill?.id || null, lacks: c.lacks, ok: c.ok };
    }),
  };
}

export function selectBoat(id) {
  if (!gameState.boat.own[id] || !liveBoatIds().includes(id)) return { ok: false, msg: '아직 없는 배예요' };
  gameState.boat.sel = { ...gameState.boat.sel, boat: id };
  return { ok: true };
}

export function selectCourse(course) {
  if (!COURSES[course]) return { ok: false };
  if (course === 'rapid' && (gameState.boat.clears || 0) < 1) return { ok: false, msg: '잔잔한 물길을 한 번 완주하면 급류가 열려요' };
  gameState.boat.sel = { ...gameState.boat.sel, course };
  return { ok: true };
}

export function unlockBoatNow(id) {
  const r = unlockBoat(id, gameState.boat, gameState.inventory);
  if (!r.ok) return { ok: false, msg: '조건이 아직 모자라요' };
  gameState.boat = r.st;
  gameState.inventory.star = r.inv.star;
  gameState.inventory.coins = r.inv.coins;
  if (r.spentCoins) logEcon('boat_unlock', id, -r.spentCoins, gameState.inventory.coins);
  refreshInventoryUI(); Sound.build(); spawnSparkle(player.position.x, 1.5, player.position.z, 18);
  trackEvent('boat_unlock', { boat_id: id, runs_total: gameState.boat.clears || 0, star_left: gameState.inventory.star || 0 });
  return { ok: true, name: BOATS[id].name, ico: BOATS[id].ico };
}
```

- [ ] **Step 5: `buildCourse`를 데이터 생성기 호출로**

기존 `export function buildCourse(seed, night, opts = {})` 본문을 지우고:

```js
export function buildCourse(seed, night, opts = {}) {
  const r = buildCourseData(seed, { night, chest: !!opts.chest, course: opts.course || 'calm' });
  riverCourse.length = 0;
  riverCourse.push(...r.items);
  boat.fork = r.fork;
  boat.falls = r.falls;
}
```

`tests/boat-chest-wiring.test.mjs`의 첫 테스트(`buildCourse: 오늘 상자가 남았을 때만...`)를 `js/boat/course.js`를 읽도록 바꾼다(단언 내용은 같고 읽는 대상만 변경):

```js
const C = readFileSync(new URL('../js/boat/course.js', import.meta.url), 'utf8');
test('buildCourseData: 오늘 상자가 남았을 때만, 루프가 끝난 뒤 한 개(상자 없는 날 코스 불변)', () => {
  const i = C.indexOf('function buildCourseData('); const b = C.slice(i, C.indexOf('\n}\n', i));
  assert.match(b, /if \(chest\)[\s\S]{0,200}placeChest\(rnd/);
  assert.ok(b.indexOf('placeChest') > b.indexOf('d += gap'));
  assert.match(b, /kind: 'chest'/);
});
```

같은 파일 두 번째 테스트의 `assert.match(s, /buildCourse\(boat\.seed, boat\.night, \{ chest: offered \}\)/);`는 `/buildCourse\(boat\.seed, boat\.night, \{ chest: offered, course \}\)/`로 바꾼다.

- [ ] **Step 6: `startBoatRun`**

`boat.night = isNight();` 다음의 시드·코스·`Object.assign(boat, {...})`·배 메시·등불 부분을 아래로 바꾼다. 하루 횟수 검사, 플레이어 위치, HUD, 소리, 트래킹 호출 자리는 유지한다.

```js
  const sel = gameState.boat.sel;
  const boatId = gameState.boat.own[sel.boat] && liveBoatIds().includes(sel.boat) ? sel.boat : 'ferry';
  const course = sel.course === 'rapid' && (gameState.boat.clears || 0) >= 1 ? 'rapid' : 'calm';
  boat.seed = dateHash(courseSeedKey(boat.runNo, course));
  const offered = chestToday(gameState.boat, todayStr());
  buildCourse(boat.seed, boat.night, { chest: offered, course });
  const parts = gameState.boat.parts || {};
  Object.assign(boat, {
    active: true, dist: 0, speed: BOAT_BASE_SPEED, vx: 0, lamps: BOATS[boatId].lamps, stars: 0,
    hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
    invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, startedAt: performance.now(), t: 0,
    boatId, course, combo: { n: 0, last: -99 }, comboMax: 0, nearMiss: 0,
    ramLeft: ramPerRun(sel.bow === 'ram' ? parts.ram : 0), windLv: sel.flag === 'wind' ? parts.wind || 0 : 0,
    skillUntil: 0, skillReadyAt: 0, skillUsed: 0, skillSent: 0, rideUntil: 0, rideBoostUntil: 0, airUntil: 0, fallIdx: 0,
    chestOffered: offered, chestTaken: false, chestSeen: false, chestMissed: false, chestDxMin: Infinity, chestPos: null, chest: null,
  });
  clearRiverObjects();
  boat.models ??= {};
  if (!boat.models[boatId]) { boat.models[boatId] = makeBoatModel(boatId); scene.add(boat.models[boatId]); }
  for (const id in boat.models) boat.models[id].visible = id === boatId;
  boat.group = boat.models[boatId];
  const lantern = boat.group.userData.lantern, light = boat.group.userData.light;
  if (lantern) lantern.visible = !!boat.night;
  if (light) light.intensity = boat.night ? 2.4 : 0;
  for (const m of boat.group.userData.fpHide) m.visible = boatView === 'third';
```

`boat_start` 트래킹 인자에서 `lamps: boat.lamps, up_oar: up.oar, up_hull: up.hull, up_lamp: up.lamp,`를 `lamps: boat.lamps, boat_id: boatId, course,`로 바꾸고, `const up = gameState.boat.up;`를 지운다.

`export function makeBoatRideable()` 함수 전체를 지운다(`js/boat/models.js`의 `ferryModel`로 옮겼다). 1인칭/3인칭 전환 코드(`boatView`를 바꾸는 곳, `grep -n "boatView =" js/game.js js/spaces/river.js index.html`)에서 `boat.group?.userData.fpHide?.forEach(m => { m.visible = boatView === 'third'; });`를 같이 호출한다.

- [ ] **Step 7: `updateBoatRun`**

- 속도 줄을 `let sp = BOAT_BASE_SPEED * (1 + p * 0.55) * (RAIN_DAY ? 1.12 : 1) * COURSES[boat.course].speedMul;`로, 바로 다음에 `if (boat.t < boat.rideBoostUntil) sp *= RIDE.boost;`
- 조향: `const oar = gameState.boat.up.oar || 0;`와 `const acc = 26 + oar * 7, maxVx = 6.2 + oar * 1.4;`를 지우고 `const { acc, maxVx } = steerParams(boat.boatId);`
- 폭포(위치 갱신 직후):

```js
  if (boat.falls?.[boat.fallIdx] != null && boat.dist >= boat.falls[boat.fallIdx]) { boat.airUntil = boat.t + 0.8; boat.fallIdx++; }
```
  배 메시 블록 끝에 `if (boat.t < boat.airUntil) boat.group.position.y += Math.sin((1 - (boat.airUntil - boat.t) / 0.8) * Math.PI) * 0.9;`
- 스퍼트: `boat.boostReadyAt = boat.t + BOAT_BOOST_CD`를 `boat.boostReadyAt = boat.t + boostCd(boat.windLv)`로.
- 스킬(스퍼트 블록 바로 아래):

```js
  const sk = BOATS[boat.boatId].skill;
  if (wantSkill) {
    $w.wantSkill = false;
    if (!stunned && skillReady(sk, boat.t, boat.skillReadyAt)) {
      const s = startSkill(sk, boat.t);
      boat.skillUntil = s.until; boat.skillReadyAt = s.readyAt; boat.skillUsed++;
      Sound.water(); spawnSplash(player.position.x, 0.4, player.position.z - 1, 8, 1.2);
      if (boat.skillSent < 10) { boat.skillSent++; trackEvent('boat_skill', { boat_id: boat.boatId, skill: sk.id, dist_m: Math.round(boat.dist), seg }); }
    }
  }
  const diving = sk?.id === 'dive' && boat.t < boat.skillUntil;
```
  배 메시 블록 끝에 `if (diving) boat.group.position.y = -0.55;`
- 연잎배 회전: 배 메시 블록에서 `boat.group.rotation.y = ...` 다음에 `if (boat.t < boat.rideUntil) boat.group.rotation.y += (1 - (boat.rideUntil - boat.t) / RIDE.spin) * Math.PI * 2;`
- 노 애니메이션: `boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = ...; })` 형태 세 곳(침몰·충돌·평상시)을 `boat.group.userData.oars.forEach(c => { c.rotation.x = ...; })`로 바꾼다(곱하는 값은 그대로).
- HUD: `lampMax: boatLampMax(),`를 `lampMax: BOATS[boat.boatId].lamps,`로, `boost:` 식의 `BOAT_BOOST_CD`를 `boostCd(boat.windLv)`로. 객체에 추가:

```js
    skill: sk ? Math.min(1, 1 - (boat.skillReadyAt - boat.t) / sk.cd) : null,
    skillIco: { dive: '🫧', fold: '✈️', lure: '🎣' }[sk?.id] || '',
    combo: boat.combo.n,
```

- [ ] **Step 8: `updateRiverObjects`**

- `riverActive.push({ mesh, item, x: item.x, taken: false, prevRel: Infinity })`에 `passedCheck: false, rode: false`를 추가.
- 루프 안 `const bx = ...` 위에서 한 번 계산: `const diving = BOATS[boat.boatId].skill?.id === 'dive' && boat.t < boat.skillUntil;`
- 별·희귀 획득 블록: `if ((Math.abs(rel) < 1.4 || passed) && dx < 1.5) {` 바로 안쪽 첫 줄에 `if (diving) continue;`를 넣고, 별 처리 `if (it.kind === 'star') { boat.stars++; Sound.blip(); }`를:

```js
        if (it.kind === 'star') {
          boat.combo = comboStep(boat.combo, boat.t);
          boat.comboMax = Math.max(boat.comboMax, boat.combo.n);
          boat.stars += 1 + boat.combo.bonus;
          Sound.blip();
        }
```
- 소용돌이 블록을:

```js
    if (it.kind === 'whirl') {
      if (Math.abs(rel) < meta.r && dx < meta.r + 1) {
        if (whirlMode(boat.boatId) === 'ride') {
          if (!a.rode) { a.rode = true; boat.rideUntil = boat.t + RIDE.spin; boat.rideBoostUntil = boat.t + RIDE.spin + RIDE.boostDur; }
        } else boat.vx += (a.x - bx) * dt * 5.5;
      }
      continue;
    }
```
- 아슬아슬과 충돌(기존 `if ((Math.abs(rel) < 1.0 || passed) && dx < meta.r + 0.7) {` 줄부터 `if (boat.t < boat.invUntil) continue;`까지)을:

```js
    if (!a.passedCheck && rel < 0) {
      a.passedCheck = true;
      if (!a.taken && isNearMiss(dx, boat.boatId, it.kind)) {
        boat.nearMiss++;
        boat.boostReadyAt = Math.max(boat.t, boat.boostReadyAt - NEAR_GAIN * boostCd(boat.windLv));
      }
    }
    if ((Math.abs(rel) < 1.0 || passed) && isHit(dx, boat.boatId, it.kind)) {
      a.taken = true;
      if (boat.t < boat.invUntil) continue;
      const out = obstacleOutcome(boat.boatId, it.kind, { diving, ramLeft: boat.ramLeft });
      if (out === 'pass') continue;
      if (out === 'push') { a.x = clampW(a.x + (Math.sign(a.x - bx) || 1) * 2.4, RIVER_OBS.log.r); a.mesh.position.x = a.x; Sound.water(); continue; }
      if (out === 'ram') { boat.ramLeft--; boat.speed *= 0.5; Sound.build(); spawnSplash(player.position.x, 0.5, player.position.z - 1.5, 6, 1.2); continue; }
```
  그 뒤 기존 충돌 처리(`boat.lamps--; boat.hits++; ...`)는 그대로 둔다.
- 갈림길 섬(루프 앞, `bx` 계산 직후):

```js
  if (boat.fork && boat.dist > boat.fork.d0 && boat.dist < boat.fork.d1 && bx > boat.fork.x0 && bx < boat.fork.x1) {
    boat.vx = (bx > (boat.fork.x0 + boat.fork.x1) / 2 ? 1 : -1) * 6;
  }
```
  섬 메시: `buildRiverSpace()`에 초록 타원 하나(`CylinderGeometry` 납작, x 중심 `(FORK_X[0]+FORK_X[1])/2`, z 범위 270~330m에 해당하는 강 좌표)를 만들어 `riverGroup.userData.island`로 두고, `startBoatRun`에서 `riverGroup.userData.island.visible = course === 'rapid'`. 폭포 두 곳은 같은 방식으로 흰 띠(`PlaneGeometry`) 두 개를 `riverGroup.userData.falls`로.

- [ ] **Step 9: `endBoatRun`**

- `const up = gameState.boat.up;`와 `const lampBonus = ...` 줄을 지우고 `let stars = Math.round(boat.stars * rainBonus);`
- `const best = ...; if (best) gameState.boat.best = score;` 두 줄을:

```js
  const bestKey = boat.course === 'rapid' ? 'bestRapid' : 'best';
  const best = score > (gameState.boat[bestKey] || 0);
  if (best) gameState.boat[bestKey] = score;
```
- `perfect` 갱신 줄 다음에(완주 수·오늘 완주 수 갱신 **뒤**):

```js
  const matMul = COURSES[boat.course].matMul;
  const runMats = Object.fromEntries(Object.entries(boat.picks).map(([k, n]) => [k, Math.floor(n * matMul + 0.5)]));
  const stat = { ...gameState.boat.stat, comboBest: Math.max(gameState.boat.stat.comboBest || 0, boat.comboMax) };
  if (result === 'clear') {
    if (boat.night) stat.nightClears++;
    if (boat.boatId === 'raft') stat.raftClears++;
    if (boat.course === 'rapid') {
      stat.rapidClears++;
      if (boat.night) stat.rapidNightClears++;
      if (boat.hits === 0) stat.rapidPerfect++;
    }
  }
  gameState.boat = { ...addRunMats(gameState.boat, boat.picks, matMul), stat };
```
  (`addRunMats`는 `gameState.boat`를 새 객체로 바꾼다. 위의 `clears`·`clearsToday`·`perfect` 갱신이 그 전에 끝나 있어야 새 객체에 들어간다.)
- `payload`에서 `upgrades: { ...up },`를 지우고 추가:

```js
    course: boat.course, boat_id: boat.boatId,
    loadout: { bow: gameState.boat.sel.bow, flag: gameState.boat.sel.flag, stern: gameState.boat.sel.stern, crew: null, lv: { ...gameState.boat.parts } },
    skill_used: boat.skillUsed, combo_max: boat.comboMax, near_miss: boat.nearMiss, mats: runMats, course_v: COURSE_V,
```
  (`upgrades` 컬럼은 남아 있으니 `upgrades: null`을 보낸다.)
- `boat_end` 트래킹 인자에 `boat_id: boat.boatId, course: boat.course,` 추가.
- `ui.showBoatResult?.({ ... })` 인자에 `matsView: runMats, course: boat.course,` 추가.

- [ ] **Step 10: `game.js` 연결**

- `let wantAction = false;`(1706행) 아래에 `let wantSkill = false;`
- `$w` 객체(297행~)의 `wantAction` 접근자 줄 아래에:

```js
  get wantSkill() { return wantSkill; }, set wantSkill(v) { wantSkill = v; },
```
- 파일 끝 export 목록(8140행 근처, `wantAction,`이 있는 줄)에 `wantSkill,` 추가.
- 173행 river import 목록: `boatShopView, buyBoatUpgrade`를 빼고 `dockView, selectBoat, selectCourse, unlockBoatNow` 추가.
- 2041~2042행:

```js
  getDock() { return dockView(); },
  selectBoat(id) { return selectBoat(id); },
  selectCourse(c) { return selectCourse(c); },
  unlockBoat(id) { return unlockBoatNow(id); },
  boatSkill() { wantSkill = true; },
```
- 7226행 `ui.openBoatShop?.(boatShopView())` → `ui.openBoatShop?.(dockView())`.
- 스킬 키: Q·E는 카메라 회전(`js/camera-gestures.js:123`)이라 F를 쓴다. 키 입력 처리에서 `Space`(액션)를 다루는 곳(`grep -n "'Space'" js/game.js`) 옆에 `if (e.code === 'KeyF' && boat.active) { wantSkill = true; return; }`.

- [ ] **Step 11: 설계 문서 정정**

`docs/superpowers/specs/2026-10-27-boat-lineup-design.md`:
- 12장 `boat_unlock` 파라미터를 `boat_id`, `runs_total`, `star_left`로(첫 탑승일이 세이브에 없어 `days_since_first`는 계산할 수 없다).
- 7장 표 "강 재료 출현 ×1.5"를 "강 재료 정산 ×1.5(코스에 깔리는 수는 잔잔한 물길과 비슷)"로.
- 4장 끝에 "1차 부품 효과: 쇄빙 뱃머리·순풍 깃발만. 뱃종은 2차. 나룻배 등불은 밤에 누구에게나 켜진다."

- [ ] **Step 12: 테스트 통과 + 전체 회귀**

Run: `node --test tests/boat-run-wiring.test.mjs tests/boat-chest-wiring.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 전부 PASS, `# fail 0`. `tests/boat-lamp.test.mjs` 등 다른 테스트가 `makeBoatRideable`이나 `up.lamp`를 텍스트로 찾다가 실패하면, 읽는 대상을 `js/boat/models.js`의 `ferryModel`로 바꾼다(단언 내용은 유지).

- [ ] **Step 13: 커밋**

```bash
git add js/spaces/river.js js/game.js tests/boat-run-wiring.test.mjs tests/boat-chest-wiring.test.mjs tests/boat-lamp.test.mjs docs/superpowers/specs/2026-10-27-boat-lineup-design.md
git commit -m "feat(boat): wire boats, rapids, combo and materials into the river run

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 나루터 창고 화면·스킬 버튼·리더보드 탭·영어

**Files:**
- Create: `js/boat/dock-ui.js`
- Modify: `index.html` (`#boat-shop` 마크업 3043행 근처, `renderBoatShop` 6711행 근처, `setBoatRun`·`setBoatHud` 4588행 근처, `LB_BOARDS` 6811행 근처, 모듈 import 3397행 근처), `js/i18n-en.js`
- Test: `tests/boat-dock-ui.test.mjs`, `tests/boat-lineup-i18n.test.mjs`

**Interfaces:**
- Consumes: `DockView`, Input 훅 (Task 9)
- Produces: `dockHtml(view): string`, `renderDock(el, view, actions)` (`actions = { select(id), course(c), unlock(id) }`), `LACK_LABEL(lack): string`

- [ ] **Step 0: 문구 검수(구현 전)**

아래 후보를 사용자에게 보여 주고 승인을 받는다. 바뀐 문구는 이 태스크의 테스트·코드에 그대로 반영한다.

| 자리 | 후보 |
|---|---|
| 창고 제목 | 뱃사공의 창고 (그대로) |
| 코스 버튼 | 잔잔한 물길 · 급류 |
| 급류 잠금 | 잔잔한 물길을 한 번 완주하면 급류가 열려요 |
| 배 버튼 | 타기 · 타는 중 · 만들기 |
| 부족 표시 | ⭐ 별조각 4/500 · 🪷 연꽃 4/10 · 완주 2/3번 · 급류 무피해 완주 0/1번 |
| 해금 토스트 | 🍃 연잎배 완성! |
| 실패 토스트 | 아직 없는 배예요 · 조건이 아직 모자라요 |
| 스킬 버튼 | 🫧 (글자 없이 아이콘) |
| 리더보드 탭 | 🌊 급류 · 설명 "오늘 급류 최고 점수" |
| 결과 화면 | 강 재료 |

- [ ] **Step 1: 실패하는 테스트 `tests/boat-dock-ui.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dockHtml, LACK_LABEL } from '../js/boat/dock-ui.js';

const view = {
  star: 620, coins: 100, runsLeft: 2, runsMax: 3, best: 812, bestRapid: 0, rapidOpen: false,
  sel: { boat: 'ferry', course: 'calm' }, mat: { lotus: 4, driftwood: 0, shell: 0, moon_fish: 0 },
  boats: [
    { id: 'ferry', name: '나룻배', ico: '🛶', owned: true, live: true, selected: true, lamps: 3, skill: null, lacks: [], ok: false },
    { id: 'lotus', name: '연잎배', ico: '🍃', owned: false, live: true, selected: false, lamps: 2, skill: null, lacks: [{ key: 'mat:lotus', have: 4, need: 10 }, { key: 'need:clears', have: 2, need: 3 }], ok: false },
  ],
};

test('배 카드: 타는 중·만들기 버튼과 부족 항목', () => {
  const h = dockHtml(view);
  assert.match(h, /data-boat="ferry"[^>]*>타는 중</);
  assert.match(h, /data-unlock="lotus"[^>]*disabled/);
  assert.match(h, /🪷 연꽃 4\/10/);
  assert.match(h, /완주 2\/3번/);
});

test('급류가 잠겨 있으면 안내 문구', () => {
  assert.match(dockHtml(view), /잔잔한 물길을 한 번 완주하면 급류가 열려요/);
  assert.doesNotMatch(dockHtml({ ...view, rapidOpen: true }), /한 번 완주하면 급류가 열려요/);
});

test('부족 항목 라벨', () => {
  assert.equal(LACK_LABEL({ key: 'star', have: 1, need: 500 }), '⭐ 별조각 1/500');
  assert.equal(LACK_LABEL({ key: 'coins', have: 100, need: 3000 }), '🪙 코인 100/3000');
  assert.equal(LACK_LABEL({ key: 'need:rapidPerfect', have: 0, need: 1 }), '급류 무피해 완주 0/1번');
});

test('index.html: 스킬 버튼·리더보드 급류 탭·창고 연결', () => {
  const H = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(H, /id="boat-skill"/);
  assert.match(H, /\{ id: 'boat_rapid',/);
  assert.match(H, /Input\.unlockBoat\(/);
  assert.match(H, /renderDock\(/);
  assert.doesNotMatch(H, /Input\.buyBoatUpgrade/);
});

test('화면 문구에 엠대시 없음', () => {
  assert.ok(!readFileSync(new URL('../js/boat/dock-ui.js', import.meta.url), 'utf8').includes('—'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/boat-dock-ui.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `js/boat/dock-ui.js`**

```js
const MAT = { lotus: '🪷 연꽃', driftwood: '🪵 떠내려온 나무', shell: '🐚 강 조개', moon_fish: '🌕 달빛 물고기' };
const NEED = { clears: '완주', rapidPerfect: '급류 무피해 완주', comboBest: '별 콤보', raftClears: '뗏목으로 완주', nightClears: '밤 완주', rapidNightClears: '급류 밤 완주' };
const UNIT = { comboBest: '' };

export function LACK_LABEL({ key, have, need }) {
  if (key === 'star') return `⭐ 별조각 ${have}/${need}`;
  if (key === 'coins') return `🪙 코인 ${have}/${need}`;
  if (key.startsWith('mat:')) return `${MAT[key.slice(4)]} ${have}/${need}`;
  const k = key.slice(5);
  return `${NEED[k]} ${have}/${need}${UNIT[k] ?? '번'}`;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function boatCard(b) {
  const btn = b.owned
    ? `<button data-boat="${b.id}"${b.selected ? ' disabled' : ''}>${b.selected ? '타는 중' : '타기'}</button>`
    : `<button data-unlock="${b.id}"${b.ok ? '' : ' disabled'}>만들기</button>`;
  const lacks = b.owned ? '' : `<span class="bd-lacks">${b.lacks.map(l => `<i>${esc(LACK_LABEL(l))}</i>`).join('')}</span>`;
  return `<div class="boat-up bd-boat${b.selected ? ' on' : ''}"><span class="bu-ico">${b.ico}</span><span class="bu-body"><span class="bu-name">${esc(b.name)} <small>💡${b.lamps}</small></span>${lacks}</span>${btn}</div>`;
}

export function dockHtml(v) {
  const course = ['calm', 'rapid'].map(c => {
    const locked = c === 'rapid' && !v.rapidOpen;
    return `<button data-course="${c}" class="${v.sel.course === c ? 'on' : ''}"${locked ? ' disabled' : ''}>${c === 'calm' ? '잔잔한 물길' : '급류'}</button>`;
  }).join('');
  const lock = v.rapidOpen ? '' : '<p class="bd-note">잔잔한 물길을 한 번 완주하면 급류가 열려요</p>';
  const mats = Object.entries(v.mat).map(([k, n]) => `${MAT[k]} ${n}`).join(' · ');
  return `<p class="bd-sub">⭐별조각 <b>${v.star}</b> · 🪙<b>${v.coins}</b> · 오늘 <b>${v.runsLeft}/${v.runsMax}</b>회 남음</p>`
    + `<p class="bd-mats">${mats}</p>`
    + `<div class="bd-course">${course}</div>${lock}`
    + `<div class="bd-boats">${v.boats.map(boatCard).join('')}</div>`;
}

export function renderDock(el, view, actions) {
  el.innerHTML = dockHtml(view);
  el.querySelectorAll('[data-boat]').forEach(b => b.addEventListener('click', () => actions.select(b.dataset.boat)));
  el.querySelectorAll('[data-course]').forEach(b => b.addEventListener('click', () => actions.course(b.dataset.course)));
  el.querySelectorAll('[data-unlock]').forEach(b => b.addEventListener('click', () => actions.unlock(b.dataset.unlock)));
}
```

- [ ] **Step 4: `index.html` 수정**

- 3397행 근처 모듈 import 묶음에 `import { renderDock } from './js/boat/dock-ui.js';`
- `#boat-shop` 안의 `<p id="bs-sub" ...></p>`와 `<div id="bs-items"></div>`를 `<div id="bs-dock"></div>` 하나로.
- `function renderBoatShop(d) { ... }` 전체를:

```js
    function renderBoatShop(d) {
      renderDock($('bs-dock'), d, {
        select(id) { const r = Input.selectBoat(id); if (!r.ok) ui.toast(r.msg); renderBoatShop(Input.getDock()); },
        course(c) { const r = Input.selectCourse(c); if (!r.ok && r.msg) ui.toast(r.msg); renderBoatShop(Input.getDock()); },
        unlock(id) { const r = Input.unlockBoat(id); if (!r.ok) { ui.toast(r.msg); return; } ui.toast(`${r.ico} ${r.name} 완성!`, 2400); renderBoatShop(Input.getDock()); },
      });
    }
```
- 스킬 버튼: `#boat-quit` 버튼 옆에 `<button id="boat-skill" aria-label="스킬"></button>`. 스퍼트 쿨다운을 그리는 기존 방식을 찾아(`grep -n "boost" index.html | head -20`) 똑같이 따라 한다. `setBoatRun(on)`에서 `on`이면 표시, `setBoatHud(d)`에서 `d == null || d.skill == null`이면 숨기고, 아니면 아이콘을 `d.skillIco`로 두고 쿨다운을 `d.skill`(0~1)로 그린다. 클릭: `$('boat-skill').addEventListener('click', () => Input.boatSkill());`
- 콤보: `setBoatHud(d)`에서 `d.combo >= 3`이면 HUD 별 개수 옆에 `×${d.combo}`를 작게 붙인다(글자 말풍선을 월드에 띄우지 않는다).
- `LB_BOARDS`의 `boat` 항목 바로 아래:

```js
      { id: 'boat_rapid', label: '🌊 급류', unit: '점', desc: '오늘 급류 최고 점수', daily: true },
```
  (`boat` 항목의 `unit`·`fmt` 표기 방식을 확인하고 같게 맞춘다.)
- 결과 화면(`showBoatResult`)에서 `d.matsView`에 값이 있으면 기존 희귀 수집물 줄 아래에 "강 재료" 줄(`🪷 2 · 🐚 1` 형식)을 넣는다.
- CSS(기존 `.boat-up` 스타일 옆): `.bd-course{display:flex;gap:6px;margin:8px 0}`, `.bd-course button.on{outline:2px solid #3fb3c2}`, `.bd-lacks{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}`, `.bd-lacks i{font-style:normal;font-size:11px;background:rgba(0,0,0,.06);border-radius:999px;padding:1px 7px}`, `.bd-boat.on{outline:2px solid #3fb3c2}`, `.bd-mats,.bd-note{font-size:12px;opacity:.75;margin:4px 0}`.

- [ ] **Step 5: 영어 사전과 i18n 테스트**

`js/i18n-en.js`에 Step 0에서 확정한 문구 전부, `MAT`·`NEED` 라벨, 배 이름 4척을 기존 형식대로 추가한다. 숫자가 들어가는 문구는 기존 자리표시 규칙을 따른다(`grep -n "{0}" js/i18n-en.js | head`).

`tests/boat-lineup-i18n.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const RUNTIME = [
  '뱃사공의 창고', '잔잔한 물길', '급류', '잔잔한 물길을 한 번 완주하면 급류가 열려요',
  '타기', '타는 중', '만들기', '나룻배', '연잎배', '뗏목', '비단잉어', '강 재료', '🌊 급류', '오늘 급류 최고 점수',
  '⭐ 별조각 4/500', '🪷 연꽃 4/10', '🪵 떠내려온 나무 0/25', '🐚 강 조개 3/20', '🪙 코인 100/3000',
  '완주 2/3번', '급류 무피해 완주 0/1번', '아직 없는 배예요', '조건이 아직 모자라요', '🍃 연잎배 완성!',
];
for (const ko of RUNTIME) test(`🛶 en: ${ko}`, () => { const en = t(ko); assert.ok(!HAS_KO.test(en), `"${ko}" → "${en}"`); });
```

(Step 0에서 문구가 바뀌면 이 목록도 같이 바꾼다.)

- [ ] **Step 6: 테스트 통과 + 전체 회귀**

Run: `node --test tests/boat-dock-ui.test.mjs tests/boat-lineup-i18n.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 전부 PASS, `# fail 0`

- [ ] **Step 7: 커밋**

```bash
git add js/boat/dock-ui.js index.html js/i18n-en.js tests/boat-dock-ui.test.mjs tests/boat-lineup-i18n.test.mjs
git commit -m "feat(boat): dock boat picker, rapids toggle, skill button and rapids board

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 브라우저 검증

**Files:** 없음(문제가 나오면 해당 태스크 파일을 고치고 그 태스크 테스트를 다시 돌린다)

- [ ] **Step 1: 워크트리 미리보기**

미리보기는 루트의 `.claude/launch.json`만 읽는다(워크트리의 것은 무시됨). 루트 `/Users/uicheol_hwang/calm_forest/.claude/launch.json`의 `configurations`에 추가:

```json
{ "name": "boat-lineup", "runtimeExecutable": "python3", "runtimeArgs": ["/Users/uicheol_hwang/calm_forest/.claude/worktrees/boat-lineup/scripts/serve.py", "8061"], "port": 8061 }
```
`preview_start { name: "boat-lineup" }` → `navigate http://localhost:8061/?dbg=1`.

- [ ] **Step 2: 배마다 한 판**

콘솔에서:

```js
__boatTest();
['lotus', 'raft', 'koi'].forEach(id => __boat.own(id));
__boat.sel({ boat: 'koi', course: 'calm' }); __boat.start();
```
배 4척 × 잔잔한 물길 한 판씩, `__gs().boat.clears = 1` 후 급류 한 판씩. 확인:
- 콘솔 오류 0 (`read_console_messages onlyErrors`)
- 1인칭(기본)·3인칭 스크린샷: 배가 화면 아래쪽만 차지하고 앞 20m 바위가 보인다
- 비단잉어: F 키·스킬 버튼으로 잠수, 바위 통과, 잠수 중 별 안 먹힘
- 뗏목: 통나무가 옆으로 밀려나고 램프 그대로
- 연잎배: 소용돌이에서 한 바퀴 돈 뒤 빨라짐
- 급류: 갈림길 섬·폭포 점프가 보이고, 섬에 닿으면 바깥으로 밀림
- 결과 화면 "강 재료" 줄, `__gs().boat.mat`·`__gs().boat.stat` 증가
- `sendBoatRun`은 dev 세션이라 전송하지 않는다. `endBoatRun` 직전 payload를 확인하려면 콘솔에서 `sendBoatRun`을 감싸지 말고, 결과 화면 데이터(`ui.showBoatResult` 인자)의 `course`·`boat_id`·`mats`로 확인한다.

- [ ] **Step 3: 헤드리스로 끝까지 타기**

미리보기 창이 뒤에 있으면 rAF가 느려 한 판이 안 끝난다. 완주·난파 결과 화면까지는 Playwright 헤드리스(`browser_run_code`)로 확인한다. 키 입력은 `KeyboardEvent`(ArrowLeft/Right·Space·KeyF).

- [ ] **Step 4: 모바일 실측**

`resize_window preset: mobile`, 이어서 가로(812×375). 스킬 버튼이 스퍼트·조이스틱·그만두기 버튼과 겹치지 않는지, 창고 화면에서 배 4척이 스크롤 없이 다 보이는지. 드로우콜: 같은 지점(`__boat.seek(200)`)에서 `renderer.info.render.calls`를 배마다 기록하고, 나룻배 대비 증가가 10 이하인지. 넘으면 `js/boat/models.js`에서 같은 재질 메시를 합친다(`BufferGeometryUtils.mergeGeometries`, 기존 사용처 `grep -rn mergeGeometries js | head`).

- [ ] **Step 5: 옛 세이브 왕복**

루트 미리보기(`calm-forest`, main 코드)에서 `__boat.up('oar',2); __boat.up('hull',1); __boat.up('lamp',1);` 후 저장 → 세이브 JSON을 복사해 이 빌드에서 불러온다(`?dbg=1` 게스트, 세이브 주입은 기존 방식: 메모리 "워크트리 함정" fetch 세이브 주입). 확인: `parts = { wind: 2, ram: 1, bell: 1 }`, 별 +300 한 번만. 이 빌드에서 저장한 세이브를 다시 main 빌드에 넣어 `boat.own`·`boat.mat`이 남아 있는지 확인한다(옛 클라이언트가 지우지 않는지).

- [ ] **Step 6: 코드 리뷰**

`code-reviewer` 에이전트로 `git diff origin/main...HEAD` 리뷰. CRITICAL·HIGH는 고치고 해당 태스크 테스트를 다시 돌린다.

- [ ] **Step 7: dev docs 갱신과 커밋**

`dev/active/boat-lineup/boat-lineup-tasks.md` 1차 항목 체크, `boat-lineup-context.md`의 Last Updated와 Task 7 최종 조정값·드로우콜 측정값 기록.

```bash
git add dev/active/boat-lineup
git commit -m "docs(boat): stage 1 verification notes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 배포 준비(실행은 사용자 지시 후)

**Files:** 없음

체크리스트다. 사용자가 "배포해"라고 할 때 실행한다.

- [ ] Task 1 Step 6 운영 마이그레이션 적용 여부 재확인(컬럼 8개, 리더보드 3보드 오류 없음).
- [ ] `git grep -nE "AIza|GOCSPX-|sk-ant-|service_role"` 0건(공개 저장소 키 스캔).
- [ ] main 병합 → 웹·토스(`bundle_upload` + 메모)·Play(프로덕션 포함)·iOS·itch 5곳 동시 배포. 공지는 토스 출시 후.
- [ ] 다음 날 BigQuery에서 `boat_start`·`boat_end`의 `boat_id`·`course`, `boat_unlock`·`boat_skill` 파라미터가 들어왔는지 확인.
- [ ] 출시 2주 뒤 `boat_runs`에서 코스별·배별 완주율, `boat_unlock` 분포 확인.

---

## 설계 대비 1차 범위 확인

| 설계 항목 | 태스크 |
|---|---|
| 앞 구간 완화(70m, 1구간 바위만) | 5 |
| 급류 코스(속도·간격·갈림길·폭포·별 수·재료 1.5배·해금) | 5, 9 |
| 별 콤보 | 6, 9 |
| 아슬아슬 보너스 | 6, 9 |
| 재료 적립·조개/달빛 물고기 변환 중단 | 2, 4, 9 |
| 배 4척 능력·조형 | 2, 6, 8, 9 |
| 기존 강화 이전(쇄빙·순풍 효과) | 3, 9 |
| 배 고르기 화면 | 10 |
| `boat_runs` 컬럼·리더보드 분리 | 1, 9, 10 |
| GA4 `boat_start`·`boat_end` 확장, `boat_unlock`, `boat_skill` | 9 |
| 공정성·획득 기간 시뮬레이션 | 7 |
| 모바일 실측·드로우콜 | 11 |
| 2차로 미룸 | 부품 UI·강화, 뱃종 효과, 돛배 3척, `boat_part_up` |
| 3차로 미룸 | 등불 배 2척, 친구, 숙련도·색칠 |
