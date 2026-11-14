# 공간 연결 2차 P1 · 연못 수첩 + 먹이 주기 + 마당 채우기 안내 · 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마당 연못에 🐟 행동 버튼을 붙여 물고기 수첩 창과 하루 한 번 먹이 주기(30초 낚시 행운, 광고 한 번 더)를 넣고, 다리를 고친 뒤 호수 → 연못으로 이어 주는 "마당 채우기" 안내와 다음 날 푸시를 만든다.

**Architecture:** 판정은 순수 모듈(`js/pond/actions.js`, `js/pond/yard-steps.js`)에 두고 node 테스트로 잠근다. 창은 연못·식탁 공용 `js/hud/collection-book.js`. 게임 쪽 연결은 `js/pond/feed.js`·`js/pond/yard-guide.js` 가 맡고 `game.js` 에는 생성·호출 줄만 둔다. 저장은 새 최상위 필드 없이 `gameState.hintsSeen` 키만 쓴다(옛 클라이언트도 보존 → 단독 배포 가능). 안내는 식당·포구 섬과 같은 금색 엔진 `createGuide` + `createGuideView`(E6 와 무관).

**Tech Stack:** 바닐라 JS ES 모듈, three.js, node:test(`npm test` = `node --test tests/*.test.mjs`), Cloudflare Worker 크론(`functions/push-cron.js`), Supabase Postgres(풀러 직접 실행).

**Spec:** `docs/superpowers/specs/2026-11-12-space-link-v2-design.md` (§2-1, §2-2, §4, §5, §6 `pond_feed_more`, §7 "P1 은 hintsSeen 안에", §9 P1)

## Global Constraints

- 새 코드·CSS·테스트에 **주석 금지**(메모리 no-code-comments). 설명은 커밋 메시지와 dev docs 로
- `game.js` 에는 로직을 넣지 않고 import·생성·호출 줄만(메모리 split-files-not-gamejs). 예외: 광고 버튼 함수는 기존 `dailyAdButton` 처럼 `rewarded` 가 game.js 안에만 있어 game.js 에 둔다
- 모든 기능은 `spaceLinkOn(e3Decision())` 뒤. 대조 무리는 아무것도 안 보인다
- 저장: `gameState.hintsSeen.pondDay` · `.pondFeedDay` · `.pondFeedAd` · `.yardFill` · `.pondD1` · `.pondBook` 만. 새 최상위 필드 금지
- 날짜는 KST `kstDate()` (`js/kst-date.js`). 계절은 게임과 같은 `seasonInfo(todayStr())`
- 월드 말풍선은 이모지만, 글자 안내는 HUD. 화살표 이모지 금지(금색 CSS·3D 화살표만)
- UI 문구에 엠대시(—)·"놀다" 금지. 문구는 `js/pond/copy.js` 한 곳에 두고 Task 10 에서 사용자 검수 후 확정
- 새 GA4 이벤트 파라미터 ≤ 5, 기존 키(`kind`·`count`·`flow`·`step`·`ms`·`assist`) 재사용. 새 이벤트 이름은 `docs/analysis/event-taxonomy.csv` 에 행 추가(테스트가 강제)
- 광고: 보상형, `repeatOpen(houseStage)` 뒤에만, prepass 처치 무리에만(`rewarded.offer`), 끝까지 본 것만 지급
- 커밋은 기능 브랜치 로컬에만. 푸시·병합·배포 금지(메모리 commit-only-means-no-push)
- 푸시(FCM)는 Android·iOS 앱만 받는다. 웹·토스는 해당 없음

---

## File Structure

| 파일 | 새/수정 | 책임 |
|---|---|---|
| `js/pond/actions.js` | 새 | 먹이 하루 판정·광고 횟수·계절까지 남은 날·수첩 모델(순수) |
| `js/pond/yard-steps.js` | 새 | 마당 채우기 시작 조건·단계 표·장소 이동 단계(순수) |
| `js/hud/collection-book.js` | 새 | 수첩 창(연못·식탁 공용). `bookHtml` 순수 + DOM 열기·닫기 |
| `js/pond/feed.js` | 새 | 먹이 주기·수첩 열기(게임 상태·버프·트래킹 연결) |
| `js/pond/yard-guide.js` | 새 | 마당 채우기·장소 이동 안내 실행(runner+view) |
| `js/pond/copy.js` | 수정 | P1 문구 전부 |
| `js/pond/build.js` | 수정 | `gather(sec)` 물고기 모으기 연출(메시 추가 없음) |
| `js/pond/index.js` | 수정 | `pondPos`·`pondNear`·`pondExists`·`pondCount`·`pondGather` 내보내기, `hintsSeen.pondDay` |
| `js/data/pond.js` | 수정 | `POND_ACT_R` |
| `js/spaces/fishing.js` | 수정 | 첫 캐스팅 보장(`setFishAssist`) |
| `js/spaces/doors.js` | 수정 | 연못 근처 🐟 프롬프트 |
| `js/game.js` | 수정 | import·`pondFeedAdButton`·`handleAction` 분기·안내 생성/갱신·`otherGuide` |
| `index.html` | 수정 | 행동 버튼 아이콘 정규식에 🐟 |
| `functions/push/pick-kind.js` | 수정 | `pond` 푸시 종류·문구 |
| `sql/migrations/migrate_push_pond.sql` | 새 | `push_logs.kind` 에 pond, `push_candidates` 에 `pond_day` |
| `js/guide/prepass-rules.js` | 수정 | `REPEAT_SLOTS` 에 `pond_feed_more` |
| `js/i18n-en.js` | 수정 | P1 문구 영어 |
| `docs/analysis/event-taxonomy.csv` | 수정 | `pond_feed`·`pond_book_open` 행, `guide_step`·`prepass_eligible`·`fishing_catch` 설명 |
| `dev/active/metrics-framework/space-link-experiment-prereg.md` | 수정 | 개정 2 |
| `dev/active/main-quest-guide/e6-guide-prereg.md` | 수정 | 교란 요인 한 줄 |
| 테스트 | 새 | `tests/pond-actions.test.mjs`, `tests/yard-steps.test.mjs`, `tests/collection-book.test.mjs`, `tests/pond-feed-wiring.test.mjs` / 수정: `tests/pond-wiring.test.mjs`, `tests/push-pick.test.mjs` |

---

### Task 1: 작업 브랜치 + 순수 규칙 `js/pond/actions.js`

**Files:**
- Create: `js/pond/actions.js`
- Test: `tests/pond-actions.test.mjs`

**Interfaces:**
- Consumes: `dayCount(rec, day)`, `bumpDay(rec, day)` from `js/guide/prepass-rules.js` (레코드 `{ d, n }`)
- Produces:
  - `FEED_BUFF_SEC = 30`, `FEED_AD_PER_DAY = 1`
  - `feedStatus(hints, day) → { fed: boolean, adLeft: number }`
  - `afterFeed(hints, day) → hints` (새 객체, `pondFeedDay = day`)
  - `afterFeedAd(hints, day) → hints` (새 객체, `pondFeedAd = bumpDay(...)`)
  - `daysUntilSeason(cur, left, target, ids, len = 14) → number`
  - `fishBook({ dexFish, seaBest }, { river, sea }, { season, left }, seasonIds, seasonDays = 14) → { river: Slot[], sea: Slot[], got, total }`, `Slot = { id, ico, name, got, w?, hint: null | { kind: 'season', season, days } | { kind: 'lake', now? } | { kind: 'sea' } }`

- [ ] **Step 1: 브랜치**

```bash
cd /Users/uicheol_hwang/calm_forest && git checkout main && git checkout -b feat/space-link-p1
```

- [ ] **Step 2: 실패하는 테스트 `tests/pond-actions.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEED_BUFF_SEC, FEED_AD_PER_DAY, feedStatus, afterFeed, afterFeedAd, daysUntilSeason, fishBook } from '../js/pond/actions.js';

const IDS = ['spring', 'summer', 'autumn', 'winter'];
const RIVER = [
  { id: 'common', ico: '🐟', name: '피라미' },
  { id: 'rare', ico: '🌈', name: '무지개 물고기' },
  { id: 'maple_carp', ico: '🍁', name: '단풍 잉어', season: 'autumn' },
  { id: 'ice_smelt', ico: '❄️', name: '얼음 빙어', season: 'winter' },
  { id: 'sakura_trout', ico: '🌸', name: '벚꽃 송어', season: 'spring' },
];
const SEA = [{ id: 'aji', ico: '🐟', name: '전갱이' }, { id: 'buri', ico: '🐠', name: '방어' }];

test('상수', () => {
  assert.equal(FEED_BUFF_SEC, 30);
  assert.equal(FEED_AD_PER_DAY, 1);
});

test('먹이: 오늘 안 줬으면 줄 수 있다', () => {
  assert.deepEqual(feedStatus({}, '2026-11-12'), { fed: false, adLeft: 1 });
  assert.deepEqual(feedStatus(null, '2026-11-12'), { fed: false, adLeft: 1 });
  assert.deepEqual(feedStatus({ pondFeedDay: '2026-11-11' }, '2026-11-12'), { fed: false, adLeft: 1 });
});

test('먹이: 같은 날 두 번은 안 된다', () => {
  const h = afterFeed({ pond: true }, '2026-11-12');
  assert.deepEqual(h, { pond: true, pondFeedDay: '2026-11-12' });
  assert.equal(feedStatus(h, '2026-11-12').fed, true);
});

test('먹이: 원본을 바꾸지 않는다', () => {
  const h = { pond: true };
  afterFeed(h, '2026-11-12');
  afterFeedAd(h, '2026-11-12');
  assert.deepEqual(h, { pond: true });
});

test('광고 한 번 더: 하루 1번, 날짜 바뀌면 다시', () => {
  const h = afterFeedAd(afterFeed({}, '2026-11-12'), '2026-11-12');
  assert.deepEqual(h.pondFeedAd, { d: '2026-11-12', n: 1 });
  assert.equal(feedStatus(h, '2026-11-12').adLeft, 0);
  assert.equal(feedStatus(h, '2026-11-13').adLeft, 1);
});

test('계절까지 남은 날: left 는 오늘 포함 이번 계절 남은 날', () => {
  assert.equal(daysUntilSeason('autumn', 5, 'autumn', IDS), 0);
  assert.equal(daysUntilSeason('autumn', 5, 'winter', IDS), 5);
  assert.equal(daysUntilSeason('autumn', 5, 'spring', IDS), 19);
  assert.equal(daysUntilSeason('autumn', 5, 'summer', IDS), 33);
  assert.equal(daysUntilSeason('winter', 14, 'spring', IDS), 14);
});

test('수첩: 잡은 칸·빈 칸 힌트', () => {
  const b = fishBook({ dexFish: { common: 10, maple_carp: 20 }, seaBest: { buri: 9.24 } }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(b.total, 7);
  assert.equal(b.got, 3);
  assert.deepEqual(b.river.map(s => s.got), [true, false, true, false, false]);
  assert.deepEqual(b.river[1].hint, { kind: 'lake' });
  assert.deepEqual(b.river[3].hint, { kind: 'season', season: 'winter', days: 5 });
  assert.deepEqual(b.river[4].hint, { kind: 'season', season: 'spring', days: 19 });
  assert.equal(b.river[0].hint, null);
  assert.deepEqual(b.sea[0], { id: 'aji', ico: '🐟', name: '전갱이', got: false, w: null, hint: { kind: 'sea' } });
  assert.deepEqual(b.sea[1], { id: 'buri', ico: '🐠', name: '방어', got: true, w: 9.2, hint: null });
});

test('수첩: 지금 계절 물고기를 못 잡았으면 호수 힌트(now)', () => {
  const b = fishBook({ dexFish: {}, seaBest: {} }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.deepEqual(b.river[2].hint, { kind: 'lake', now: true });
});

test('수첩: 이상한 입력에 죽지 않는다', () => {
  const b = fishBook({ dexFish: { common: 'x', shark: 1 }, seaBest: { aji: -1, buri: NaN } }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(b.got, 0);
  const e = fishBook(undefined, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(e.got, 0);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/pond-actions.test.mjs`
Expected: FAIL `Cannot find module '../js/pond/actions.js'`

- [ ] **Step 4: 구현 `js/pond/actions.js`**

```js
import { dayCount, bumpDay } from '../guide/prepass-rules.js';

export const FEED_BUFF_SEC = 30;
export const FEED_AD_PER_DAY = 1;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function feedStatus(hints, day) {
  const h = obj(hints);
  return { fed: h.pondFeedDay === day, adLeft: Math.max(0, FEED_AD_PER_DAY - dayCount(h.pondFeedAd, day)) };
}

export function afterFeed(hints, day) {
  return { ...obj(hints), pondFeedDay: day };
}

export function afterFeedAd(hints, day) {
  const h = obj(hints);
  return { ...h, pondFeedAd: bumpDay(h.pondFeedAd, day) };
}

export function daysUntilSeason(cur, left, target, ids, len = 14) {
  if (cur === target) return 0;
  const k = (ids.indexOf(target) - ids.indexOf(cur) + ids.length) % ids.length;
  return left + (k - 1) * len;
}

function riverHint(f, got, season, left, ids, len) {
  if (got) return null;
  if (!f.season) return { kind: 'lake' };
  const days = daysUntilSeason(season, left, f.season, ids, len);
  return days === 0 ? { kind: 'lake', now: true } : { kind: 'season', season: f.season, days };
}

export function fishBook({ dexFish, seaBest } = {}, { river, sea }, { season, left }, seasonIds, seasonDays = 14) {
  const dex = obj(dexFish), best = obj(seaBest);
  const r = river.map(f => {
    const got = isNum(dex[f.id]);
    return { id: f.id, ico: f.ico, name: f.name, got, hint: riverHint(f, got, season, left, seasonIds, seasonDays) };
  });
  const s = sea.map(f => {
    const w = best[f.id];
    const got = isNum(w) && w > 0;
    return { id: f.id, ico: f.ico, name: f.name, got, w: got ? Math.round(w * 10) / 10 : null, hint: got ? null : { kind: 'sea' } };
  });
  const got = r.filter(x => x.got).length + s.filter(x => x.got).length;
  return { river: r, sea: s, got, total: r.length + s.length };
}
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/pond-actions.test.mjs`
Expected: PASS (9 tests)

- [ ] **Step 6: 커밋**

```bash
git add js/pond/actions.js tests/pond-actions.test.mjs
git commit -m "feat(pond): pure rules for daily feed, feed ad count and fish book"
```

---

### Task 2: 마당 채우기 순수 규칙 `js/pond/yard-steps.js`

**Files:**
- Create: `js/pond/yard-steps.js`
- Test: `tests/yard-steps.test.mjs`

**Interfaces:**
- Consumes: `createGuide` from `js/guide/runner.js` (테스트에서만, 단계 건너뛰기 확인)
- Produces:
  - `YARD_IDLE_SEC = 5`, `YARD_PIER = { x: 12.8, z: 9 }`, `GO_REACH = 3`
  - `yardIdle(prev, dt, free) → number`
  - `yardReady({ on, bridge, done, idleSec }) → boolean`
  - `yardSteps(copy) → Step[]` (id 순서 `lake, cast, catch, pond, feed`)
  - `goStep(spot, text) → Step` (id `go`)
  - `d1Ready({ on, yardDone, d1Done, pondDay, today, fedToday, idleSec }) → boolean` (마당 채우기를 끝낸 뒤, 연못이 생긴 날이 아닌 다른 날 처음 접속해 아직 먹이를 안 줬을 때 한 번)
  - `d1Steps(copy) → Step[]` (id 순서 `d1_pond, d1_feed`)
  - ctx 모양: `{ me: {x,z}, pier: {x,z}, pond: {x,z}|null, hasPond, nearLake, fishing, nearPond, fedToday }`
  - `copy` 키: `stepLake, stepCast, stepCatch, stepPond, stepFeed, stepD1`

- [ ] **Step 1: 실패하는 테스트 `tests/yard-steps.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YARD_IDLE_SEC, YARD_PIER, GO_REACH, yardIdle, yardReady, yardSteps, goStep, d1Ready, d1Steps } from '../js/pond/yard-steps.js';
import { createGuide } from '../js/guide/runner.js';

const COPY = { stepLake: 'L', stepCast: 'C', stepCatch: 'K', stepPond: 'P', stepFeed: 'F', stepD1: 'D' };
const base = { me: { x: 0, z: 0 }, pier: YARD_PIER, pond: null, hasPond: false, nearLake: false, fishing: false, nearPond: false, fedToday: false };

test('상수', () => {
  assert.equal(YARD_IDLE_SEC, 5);
  assert.deepEqual(YARD_PIER, { x: 12.8, z: 9 });
  assert.equal(GO_REACH, 3);
});

test('한가한 시간: 바쁘면 0 으로', () => {
  assert.equal(yardIdle(2, 0.5, true), 2.5);
  assert.equal(yardIdle(4.9, 0.5, false), 0);
});

test('시작 조건: 스위치·다리·미완료·5초', () => {
  const ok = { on: true, bridge: true, done: false, idleSec: 5 };
  assert.equal(yardReady(ok), true);
  assert.equal(yardReady({ ...ok, on: false }), false);
  assert.equal(yardReady({ ...ok, bridge: false }), false);
  assert.equal(yardReady({ ...ok, done: true }), false);
  assert.equal(yardReady({ ...ok, idleSec: 4.9 }), false);
});

test('단계 순서와 문구', () => {
  const s = yardSteps(COPY);
  assert.deepEqual(s.map(x => x.id), ['lake', 'cast', 'catch', 'pond', 'feed']);
  assert.deepEqual(s.map(x => x.text), ['L', 'C', 'K', 'P', 'F']);
  assert.deepEqual(s[0].target(base), YARD_PIER);
  assert.equal(s[3].target(base), null);
  assert.deepEqual(s[4].target({ ...base, pond: { x: 1, z: 2 } }), { x: 1, z: 2 });
});

test('처음부터: 호수 → 던짐 → 낚음 → 연못 → 먹이', () => {
  const g = createGuide({ flow: 'yard_fill', steps: yardSteps(COPY), now: () => 0 });
  g.tick(base);
  assert.equal(g.current().id, 'lake');
  g.tick({ ...base, nearLake: true });
  assert.equal(g.current().id, 'cast');
  g.tick({ ...base, nearLake: true, fishing: true });
  assert.equal(g.current().id, 'catch');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'pond');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true });
  assert.equal(g.current().id, 'feed');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true, fedToday: true });
  assert.equal(g.active(), false);
});

test('이미 연못이 있으면 첫 틱에 연못 단계로 건너뛴다', () => {
  const g = createGuide({ flow: 'yard_fill', steps: yardSteps(COPY), now: () => 0 });
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'pond');
});

test('장소 이동 단계: 3 안에 들면 끝', () => {
  const s = goStep({ x: 10, z: 0 }, 'G');
  assert.equal(s.id, 'go');
  assert.equal(s.text, 'G');
  assert.deepEqual(s.target(base), { x: 10, z: 0 });
  assert.equal(s.done({ ...base, me: { x: 7.1, z: 0 } }), true);
  assert.equal(s.done({ ...base, me: { x: 6.9, z: 0 } }), false);
});

test('다음 날 안내: 마당 채우기 끝·다른 날·먹이 전·한 번만', () => {
  const ok = { on: true, yardDone: true, d1Done: false, pondDay: '2026-11-12', today: '2026-11-13', fedToday: false, idleSec: 5 };
  assert.equal(d1Ready(ok), true);
  assert.equal(d1Ready({ ...ok, on: false }), false);
  assert.equal(d1Ready({ ...ok, yardDone: false }), false);
  assert.equal(d1Ready({ ...ok, d1Done: true }), false);
  assert.equal(d1Ready({ ...ok, today: '2026-11-12' }), false, '연못 생긴 날엔 안 한다');
  assert.equal(d1Ready({ ...ok, pondDay: null }), false);
  assert.equal(d1Ready({ ...ok, fedToday: true }), false);
  assert.equal(d1Ready({ ...ok, idleSec: 4 }), false);
});

test('다음 날 안내 단계', () => {
  const s = d1Steps(COPY);
  assert.deepEqual(s.map(x => x.id), ['d1_pond', 'd1_feed']);
  assert.deepEqual(s.map(x => x.text), ['D', 'F']);
  const g = createGuide({ flow: 'pond_d1', steps: s, now: () => 0 });
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'd1_pond');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true });
  assert.equal(g.current().id, 'd1_feed');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true, fedToday: true });
  assert.equal(g.active(), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/yard-steps.test.mjs`
Expected: FAIL `Cannot find module '../js/pond/yard-steps.js'`

- [ ] **Step 3: 구현 `js/pond/yard-steps.js`**

```js
export const YARD_IDLE_SEC = 5;
export const YARD_PIER = Object.freeze({ x: 12.8, z: 9 });
export const GO_REACH = 3;

export function yardIdle(prev, dt, free) {
  return free ? prev + dt : 0;
}

export function yardReady({ on, bridge, done, idleSec }) {
  return !!on && !!bridge && !done && idleSec >= YARD_IDLE_SEC;
}

export function yardSteps(copy) {
  return [
    { id: 'lake', text: copy.stepLake, target: c => c.pier, done: c => c.hasPond || c.nearLake },
    { id: 'cast', text: copy.stepCast, target: c => c.pier, done: c => c.hasPond || c.fishing },
    { id: 'catch', text: copy.stepCatch, target: c => c.pier, done: c => c.hasPond },
    { id: 'pond', text: copy.stepPond, target: c => c.pond, done: c => c.fedToday || c.nearPond },
    { id: 'feed', text: copy.stepFeed, target: c => c.pond, done: c => c.fedToday },
  ];
}

export function goStep(spot, text) {
  return { id: 'go', text, target: () => spot, done: c => Math.hypot(c.me.x - spot.x, c.me.z - spot.z) <= GO_REACH };
}

export function d1Ready({ on, yardDone, d1Done, pondDay, today, fedToday, idleSec }) {
  return !!on && !!yardDone && !d1Done && !!pondDay && pondDay !== today && !fedToday && idleSec >= YARD_IDLE_SEC;
}

export function d1Steps(copy) {
  return [
    { id: 'd1_pond', text: copy.stepD1, target: c => c.pond, done: c => c.fedToday || c.nearPond },
    { id: 'd1_feed', text: copy.stepFeed, target: c => c.pond, done: c => c.fedToday },
  ];
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/yard-steps.test.mjs tests/guide-runner.test.mjs`
Expected: PASS (yard-steps 9 tests, guide-runner 그대로)

- [ ] **Step 5: 커밋**

```bash
git add js/pond/yard-steps.js tests/yard-steps.test.mjs
git commit -m "feat(pond): pure rules for the yard-fill, next-day and go-to guides"
```

---

### Task 3: 공용 수첩 창 `js/hud/collection-book.js`

**Files:**
- Create: `js/hud/collection-book.js`
- Test: `tests/collection-book.test.mjs`

**Interfaces:**
- Produces:
  - `bookHtml({ sections }) → string` (순수)
  - `openBook(model)`, `closeBook()`, `isBookOpen() → boolean`
  - `model = { title, count, closeLabel, hint, head: HTMLElement|null, sections: [{ title, slots: [{ id, ico, label, got }] }], onSlot(slot) → { line, go?: { label, onClick } } | null }`
  - DOM id `collection-book-modal` (`-modal` 으로 끝나 `ui.anyModalOpen()` 이 잡는다 → 창이 떠 있는 동안 월드 액션이 막힌다)

- [ ] **Step 1: 실패하는 테스트 `tests/collection-book.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bookHtml } from '../js/hud/collection-book.js';

const src = readFileSync(new URL('../js/hud/collection-book.js', import.meta.url), 'utf8');

test('잡은 칸은 아이콘+이름, 빈 칸은 ❔', () => {
  const html = bookHtml({ sections: [{ title: '강 물고기', slots: [{ id: 'common', ico: '🐟', label: '피라미', got: true }, { id: 'rare', ico: '🌈', label: '무지개', got: false }] }] });
  assert.match(html, /<div class="cb-sec">강 물고기<\/div>/);
  assert.match(html, /<button class="cb-slot" data-k="0:0">🐟<small>피라미<\/small><\/button>/);
  assert.match(html, /<button class="cb-slot empty" data-k="0:1">❔<\/button>/);
  assert.doesNotMatch(html, /무지개/);
});

test('섹션 번호가 data-k 에 들어간다', () => {
  const html = bookHtml({ sections: [{ title: 'A', slots: [] }, { title: 'B', slots: [{ id: 'x', ico: '🐠', label: '9.2kg', got: true }] }] });
  assert.match(html, /data-k="1:0"/);
});

test('글자는 이스케이프', () => {
  const html = bookHtml({ sections: [{ title: '<b>', slots: [{ id: 'x', ico: '🐟', label: 'a"<', got: true }] }] });
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /a&quot;&lt;/);
});

test('모달 id 는 -modal 로 끝난다(anyModalOpen)', () => {
  assert.match(src, /'collection-book-modal'/);
});

test('주석 없음', () => {
  assert.doesNotMatch(src, /^\s*\/\//m);
  assert.doesNotMatch(src, /\/\*/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/collection-book.test.mjs`
Expected: FAIL `Cannot find module '../js/hud/collection-book.js'`

- [ ] **Step 3: 구현 `js/hud/collection-book.js`**

```js
const CSS = `
#collection-book-modal{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(30,40,50,.5)}
#collection-book-modal.show{display:grid}
.cb-card{width:min(400px,92vw);max-height:calc(100dvh - 24px);overflow:auto;background:#fffaf2;border-radius:18px;padding:16px 14px 12px;box-shadow:0 10px 30px rgba(0,0,0,.25);color:#2b2118}
.cb-title{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 8px;font-size:17px}
.cb-title small{font-size:12px;color:#6b5b4a;font-weight:500}
#cb-head:empty{display:none}
#cb-head{margin-bottom:10px}
.cb-head{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;background:#e6eff2;border-radius:12px;padding:8px 10px;font-size:13px}
.cb-sec{font-size:12px;color:#6b5b4a;margin:8px 0 5px}
.cb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.cb-slot{aspect-ratio:1;border-radius:12px;background:#eef3f5;border:2px solid #9cc3d6;display:grid;place-items:center;font-size:24px;position:relative;cursor:pointer;padding:0;color:inherit}
.cb-slot small{position:absolute;bottom:2px;left:2px;right:2px;font-size:9px;color:#6b5b4a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-slot.empty{background:#dde5e8;border-color:transparent;color:#8a9aa0;font-size:18px}
.cb-slot.sel{outline:3px solid #4e7f9a;outline-offset:1px}
.cb-hint{display:flex;gap:8px;align-items:center;justify-content:space-between;min-height:40px;margin-top:10px;padding:8px 10px;border-radius:12px;background:#f3ead8;font-size:13px}
.cb-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:700;background:#4e7f9a;color:#fff;font-size:13px;white-space:nowrap;cursor:pointer}
.cb-btn.ghost{background:#e7dcc8;color:#2b2118}
.cb-close{display:block;width:100%;margin-top:10px}
@media (max-height:520px){.cb-card{padding:10px 12px 8px}.cb-grid{grid-template-columns:repeat(7,1fr)}.cb-slot{font-size:18px}}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (id) => document.getElementById(id);
let model = null;

export function bookHtml({ sections }) {
  return sections.map((sec, si) => `<div class="cb-sec">${esc(sec.title)}</div><div class="cb-grid">${sec.slots.map((s, i) => (s.got
    ? `<button class="cb-slot" data-k="${si}:${i}">${esc(s.ico)}<small>${esc(s.label)}</small></button>`
    : `<button class="cb-slot empty" data-k="${si}:${i}">❔</button>`)).join('')}</div>`).join('');
}

function mount() {
  if ($('collection-book-modal')) return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.append(st);
  const m = document.createElement('div');
  m.id = 'collection-book-modal';
  m.innerHTML = '<div class="cb-card"><h2 class="cb-title"><span id="cb-title"></span><small id="cb-count"></small></h2><div id="cb-head"></div><div id="cb-body"></div><div class="cb-hint" id="cb-hint"></div><button class="cb-btn ghost cb-close" id="cb-close"></button></div>';
  m.addEventListener('click', e => { if (e.target === m) closeBook(); });
  document.body.append(m);
}

function setHint(info) {
  const box = $('cb-hint');
  box.textContent = '';
  const line = document.createElement('span');
  line.textContent = info?.line ?? model.hint;
  box.append(line);
  if (!info?.go) return;
  const b = document.createElement('button');
  b.className = 'cb-btn';
  b.textContent = info.go.label;
  b.onclick = info.go.onClick;
  box.append(b);
}

export function isBookOpen() {
  return !!$('collection-book-modal')?.classList.contains('show');
}

export function closeBook() {
  $('collection-book-modal')?.classList.remove('show');
  model = null;
}

export function openBook(next) {
  mount();
  model = next;
  $('cb-title').textContent = next.title;
  $('cb-count').textContent = next.count;
  $('cb-close').textContent = next.closeLabel;
  $('cb-close').onclick = closeBook;
  const head = $('cb-head');
  head.textContent = '';
  if (next.head) head.append(next.head);
  const body = $('cb-body');
  body.innerHTML = bookHtml(next);
  for (const el of body.querySelectorAll('.cb-slot')) {
    el.onclick = () => {
      const [si, i] = el.dataset.k.split(':').map(Number);
      for (const o of body.querySelectorAll('.cb-slot.sel')) o.classList.remove('sel');
      el.classList.add('sel');
      setHint(next.onSlot?.(next.sections[si].slots[i]) ?? null);
    };
  }
  setHint(null);
  $('collection-book-modal').classList.add('show');
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/collection-book.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/hud/collection-book.js tests/collection-book.test.mjs
git commit -m "feat(hud): shared collection book window for pond and table"
```

---

### Task 4: 연못 모듈 확장 (위치·근처·모으기 연출·연못 생긴 날)

**Files:**
- Modify: `js/data/pond.js`
- Modify: `js/pond/build.js:26-86` (`buildPond` 반환 객체)
- Modify: `js/pond/index.js` (import 줄, `refreshPond` created 분기, 끝에 export 추가)
- Modify: `js/pond/copy.js`
- Test: `tests/pond-wiring.test.mjs` (단언 추가)

**Interfaces:**
- Consumes: `kstDate()` from `js/kst-date.js`
- Produces (from `js/pond/index.js`):
  - `pondExists() → boolean`
  - `pondPos() → { x, z } | null`
  - `pondNear() → boolean` (`POND_ACT_R = 3.4` 안, 마을에서 보이는 중)
  - `pondCount() → number` (연못 물고기 수, 대어 포함)
  - `pondGather()` (물고기 2초 모으기)
- Produces (from `js/pond/build.js`): 반환 객체에 `gather(sec)`
- Produces (from `js/pond/copy.js`): `POND_COPY` 에 아래 키 전부(뒤 Task 들이 씀)

- [ ] **Step 1: 실패하는 단언을 `tests/pond-wiring.test.mjs` 끝에 추가**

```js
test('P1: 연못 위치·근처·모으기·연못 생긴 날', () => {
  const p = src('js/pond/index.js');
  for (const fn of ['pondExists', 'pondPos', 'pondNear', 'pondCount', 'pondGather']) assert.match(p, new RegExp(`export function ${fn}\\(`));
  assert.match(p, /hintsSeen\.pondDay = kstDate\(\)/);
  assert.match(src('js/pond/build.js'), /gather\(sec\)/);
  assert.match(src('js/data/pond.js'), /export const POND_ACT_R = 3\.4;/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/pond-wiring.test.mjs`
Expected: FAIL (새 테스트 하나, 나머지 PASS)

- [ ] **Step 3: `js/data/pond.js` 끝에 추가**

```js
export const POND_ACT_R = 3.4;
```

- [ ] **Step 4: `js/pond/build.js` 수정**

`let t = 0;` 다음 줄에 추가:

```js
  let gatherT = 0;
  const GATHER_Z = POND_R * 0.55;
```

`update(dt)` 안의 물고기 반복문(기존 `for (const f of swimmers) { ... }` 블록 전체)을 아래로 교체:

```js
      const g = Math.min(1, gatherT / 0.6);
      gatherT = Math.max(0, gatherT - dt);
      swimmers.forEach((f, i) => {
        const a = t * f.speed + f.phase;
        const sx = f.cx + Math.cos(a) * f.rx, sz = f.cz + Math.sin(a) * f.rz;
        const gx = Math.cos(i * 2.1) * 0.35, gz = GATHER_Z + Math.sin(i * 2.1) * 0.2;
        f.mesh.position.set(sx + (gx - sx) * g, -0.05 + Math.sin(a * 2) * 0.03 + g * 0.06, sz + (gz - sz) * g);
        f.mesh.rotation.y = -a - (Math.PI / 2) * Math.sign(f.speed);
      });
```

반환 객체의 `pop(emoji) { ... },` 다음에 추가:

```js
    gather(sec) {
      gatherT = Math.max(gatherT, sec);
    },
```

- [ ] **Step 5: `js/pond/copy.js` 전체 교체**

```js
export const POND_COPY = Object.freeze({
  created: '🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요',
  prompt: '🐟 내 연못',
  bookTitle: '🐟 내 연못',
  bookClose: '닫기',
  bookHint: '❔ 칸을 누르면 어디서 낚이는지 알려 줘요',
  secRiver: '강 물고기',
  secSea: '바다 대어',
  feedBtn: '🍞 먹이 주기',
  fedToday: '🍞 오늘 먹이를 줬어요. 내일 또 줄 수 있어요',
  fedToast: '🍞 물고기들이 몰려왔어요 · 🍀 낚시 행운 30초',
  hintLake: '🎣 마을 호수에서 낚여요',
  hintLakeNow: '🎣 지금 계절이에요. 마을 호수에서 낚여요',
  hintSea: '🌊 바다터에서 낚여요',
  goLake: '호수로',
  goSea: '바다터로',
  season: Object.freeze({
    spring: '🌸 봄에만 강에서 낚여요',
    summer: '☀️ 여름에만 강에서 낚여요',
    autumn: '🍂 가을에만 강에서 낚여요',
    winter: '❄️ 겨울에만 강에서 낚여요',
  }),
  until: Object.freeze({
    spring: '봄까지 {0}일',
    summer: '여름까지 {0}일',
    autumn: '가을까지 {0}일',
    winter: '겨울까지 {0}일',
  }),
  adMore: '🍞 한 번 더',
  owlTitle: '의뢰 올빼미',
  owlStart: '마당이 좀 허전하지? 호수에서 한 마리 낚아서 연못을 만들어 보자',
  owlDone: '물고기들이 좋아해요. 내일 또 먹이 주러 와요',
  stepLake: '🎣 호수 부두로 가 보세요',
  stepCast: '🎣 👆',
  stepCatch: '❗ ➜ 🎣 👆',
  stepPond: '🐟 마당에 연못이 생겼어요. 가 보세요',
  stepFeed: '🐟 👆 ➜ 🍞',
  stepD1: '🐟 물고기들이 기다려요. 연못으로 가 보세요',
  goStepLake: '🎣 호수 부두로 가 보세요',
  goStepSea: '🌊 바다터 입구로 가 보세요',
});
```

`created` 는 1차에서 검수·배포된 문구라 그대로 둔다(pond-wiring 테스트가 영어 짝을 잠근다).

- [ ] **Step 6: `js/pond/index.js` 수정**

import 블록의 `import { POND_COPY } from './copy.js';` 다음에 한 줄 추가:

```js
import { kstDate } from '../kst-date.js';
```

`import { POND_R, POND_SPOTS, POND_VIEW_R, POND_VIEW_SEC } from '../data/pond.js';` 를 아래로 교체:

```js
import { POND_R, POND_SPOTS, POND_VIEW_R, POND_VIEW_SEC, POND_ACT_R } from '../data/pond.js';
```

`refreshPond` 의 created 분기, `if (!gameState.hintsSeen.pond) { toastPending = true; toastWait = 0; }` 바로 다음 줄에 추가:

```js
      if (trigger !== 'load' && !gameState.hintsSeen.pondDay) { gameState.hintsSeen.pondDay = kstDate(); requestSave(); }
```

파일 끝(`pondScatterBlocks` 다음)에 추가:

```js
export function pondExists() {
  return !!pond && !!last?.has;
}

export function pondPos() {
  return pondExists() ? { x: pond.group.position.x, z: pond.group.position.z } : null;
}

export function pondNear() {
  return pondExists() && pond.group.visible && dist2D(player.position, pond.group.position) < POND_ACT_R;
}

export function pondCount() {
  return (last?.fish.length ?? 0) + (last?.sea ? 1 : 0);
}

export function pondGather() {
  pond?.gather(2);
}
```

- [ ] **Step 7: 통과 확인**

Run: `node --test tests/pond-wiring.test.mjs tests/pond-rules.test.mjs tests/pond-spots.test.mjs tests/neighbor-pond.test.mjs`
Expected: PASS (build.js `new THREE.Mesh(` 2개 단언 그대로 통과)

- [ ] **Step 8: 커밋**

```bash
git add js/data/pond.js js/pond/build.js js/pond/index.js js/pond/copy.js tests/pond-wiring.test.mjs
git commit -m "feat(pond): expose pond position/near/count, add fish gather motion and pond day"
```

---

### Task 5: 첫 캐스팅 보장 `setFishAssist`

**Files:**
- Modify: `js/spaces/fishing.js` (`tryFish`, `catchFish`, `resetFishing`, `updateFishing`, 새 export)
- Create: `tests/pond-feed-wiring.test.mjs` (이 Task 에서 만들고 Task 6·7 이 단언을 더한다)

**Interfaces:**
- Produces: `setFishAssist(on: boolean)` from `js/spaces/fishing.js`. 켜져 있으면 다음 캐스팅은 1.2초 뒤 입질, 입질 창 20초, 성공해도 DDA(`settleDifficulty`)를 건드리지 않고 `fishing_catch` 에 `assist: 1`

- [ ] **Step 1: 실패하는 테스트 `tests/pond-feed-wiring.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('낚시 보장: 다음 한 번만, DDA 안 건드림, assist 기록', () => {
  const f = src('js/spaces/fishing.js');
  assert.match(f, /export function setFishAssist\(on\)/);
  assert.match(f, /const ASSIST_BITE_SEC = 1\.2;/);
  assert.match(f, /const ASSIST_HOLD_SEC = 20;/);
  assert.match(f, /if \(!assisted\) settleDifficulty\('fish', 1\);/);
  assert.match(f, /\.\.\.\(assisted \? \{ assist: 1 \} : \{\}\)/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/pond-feed-wiring.test.mjs`
Expected: FAIL

- [ ] **Step 3: `js/spaces/fishing.js` 수정**

`const SEA_GATE_HINT_R = 8;` 줄 다음에 추가:

```js
const ASSIST_BITE_SEC = 1.2;
const ASSIST_HOLD_SEC = 20;
let assistNext = false;
let assisted = false;

export function setFishAssist(on) {
  assistNext = !!on;
}
```

`tryFish` 의 `$w.fishState = 'wait'; $w.biteAt = clock.elapsedTime + (RAIN_DAY ? ...);` 줄 바로 다음에 추가:

```js
  assisted = assistNext;
  if (assisted) $w.biteAt = clock.elapsedTime + ASSIST_BITE_SEC;
```

`updateFishing` 의 입질 시작 줄 `$w.fishState = 'bite'; $w.biteEnd = now + (...) * fishDiff.ease;` 바로 다음에 추가:

```js
      if (assisted) $w.biteEnd = now + ASSIST_HOLD_SEC;
```

`catchFish` 의 `settleDifficulty('fish', 1);` 줄을 아래로 교체:

```js
  if (!assisted) settleDifficulty('fish', 1);
```

`catchFish` 의 `trackEvent('fishing_catch', { ... ...diffParams(fishDiff) });` 줄을 아래 두 줄로 교체:

```js
  trackEvent('fishing_catch', { fish: kind.name, rarity: kind.rarity, season: SEASON, rod: gameState.upgrades.rod ? 1 : 0, ...diffParams(fishDiff), ...(assisted ? { assist: 1 } : {}) });
  if (assisted) assistNext = false;
```

`resetFishing` 함수 본문 맨 앞에 추가:

```js
  assisted = false;
```

- [ ] **Step 4: 통과 확인 + 모듈 문법 확인**

Run: `node --test tests/pond-feed-wiring.test.mjs && cp js/spaces/fishing.js /tmp/fishing-check.mjs && node --check /tmp/fishing-check.mjs`
Expected: PASS, 문법 오류 없음(메모리 cooking-course-rework: `.mjs` 로 검사해야 모듈 문법을 잡는다)

- [ ] **Step 5: 커밋**

```bash
git add js/spaces/fishing.js tests/pond-feed-wiring.test.mjs
git commit -m "feat(fishing): one-shot assisted cast for the yard-fill guide (no DDA change)"
```

---

### Task 6: 먹이 주기·수첩 열기 `js/pond/feed.js` + 🐟 행동 버튼

**Files:**
- Create: `js/pond/feed.js`
- Modify: `js/game.js` (import 줄, `pondFeedAdButton` 함수, `handleAction` 분기)
- Modify: `js/spaces/doors.js` (import, 프롬프트 분기)
- Modify: `index.html:5268` (`setDoorPrompt` 아이콘 정규식 두 곳)
- Modify: `js/guide/prepass-rules.js:11`
- Test: `tests/pond-feed-wiring.test.mjs` (단언 추가)

**Interfaces:**
- Consumes: Task 1 `feedStatus`·`afterFeed`·`afterFeedAd`·`fishBook`·`FEED_BUFF_SEC`, Task 3 `openBook`·`closeBook`, Task 4 `pondExists`·`pondCount`·`pondGather`·`POND_COPY`, Task 7 `yardGuidePointTo(kind)` (Task 7 이 만든다. 이 Task 에선 import 만 하고 `yard-guide.js` 는 아직 없으므로 **전체 `npm test`·브라우저 확인은 Task 7 뒤**)
- Produces:
  - `feedPond(kind: 'free'|'ad') → boolean` from `js/pond/feed.js`
  - `openPondBook()` from `js/pond/feed.js`
  - `pondFeedAdButton(onDone) → HTMLButtonElement | null` from `js/game.js`

- [ ] **Step 1: 실패하는 단언을 `tests/pond-feed-wiring.test.mjs` 에 추가**

```js
test('먹이·수첩 연결', () => {
  const f = src('js/pond/feed.js');
  assert.match(f, /export function feedPond\(kind = 'free'\)/);
  assert.match(f, /export function openPondBook\(\)/);
  assert.match(f, /trackEvent\('pond_feed', \{ kind, count: pondCount\(\) \}\)/);
  assert.match(f, /trackEvent\('pond_book_open', \{ count: book\.got \}\)/);
  assert.match(f, /buffs\.luck = Math\.max\(buffs\.luck, clock\.elapsedTime\) \+ FEED_BUFF_SEC/);
  assert.doesNotMatch(f, /^\s*\/\//m);
});

test('🐟 행동 버튼: 프롬프트·아이콘·분기·광고', () => {
  const d = src('js/spaces/doors.js');
  assert.match(d, /if \(!prompt && pondNear\(\)\) \{ \$w\.nearDoor = 'pond'; prompt = POND_COPY\.prompt; \}/);
  const h = src('index.html');
  assert.equal((h.match(/\|🗑️\|🐟\)\/u/g) || []).length, 2);
  const g = src('js/game.js');
  assert.match(g, /if \(nearDoor === 'pond'\) return openPondBook\(\);/);
  assert.match(g, /rewarded\.button\('pond_feed_more', \['광고 보고', ' ', POND_COPY\.adMore\]/);
  assert.match(src('js/guide/prepass-rules.js'), /'sell_bonus', 'pond_feed_more'\]/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/pond-feed-wiring.test.mjs`
Expected: FAIL (새 테스트 2개)

- [ ] **Step 3: 구현 `js/pond/feed.js`**

```js
import { gameState, buffs, clock, ui, requestSave, todayStr, pondFeedAdButton } from '../game.js';
import { emitBuffs } from '../spaces/cooking.js';
import { trackEvent } from '../analytics.js';
import { kstDate } from '../kst-date.js';
import { FISH_KINDS } from '../data/catalog.js';
import { SEA_SPECIES } from '../data/places.js';
import { DEX } from '../data/dex.js';
import { SEASON_IDS, seasonInfo } from '../season.js';
import { feedStatus, afterFeed, afterFeedAd, fishBook, FEED_BUFF_SEC } from './actions.js';
import { pondExists, pondCount, pondGather } from './index.js';
import { openBook, closeBook } from '../hud/collection-book.js';
import { yardGuidePointTo } from './yard-guide.js';
import { POND_COPY } from './copy.js';

const RIVER_ORDER = ['common', 'uncommon', 'rare', 'sakura_trout', 'puffer', 'maple_carp', 'ice_smelt'];

function riverList() {
  return RIVER_ORDER.map(id => FISH_KINDS.find(k => k.rarity === id)).filter(Boolean).map(k => ({
    id: k.rarity, name: k.name, ico: DEX.fish.find(f => f.id === k.rarity)?.ico || '🐟', season: k.season || null,
  }));
}

function seaList() {
  return SEA_SPECIES.map(s => ({ id: s.id, name: s.name, ico: s.ico }));
}

export function feedPond(kind = 'free') {
  if (!pondExists()) return false;
  const day = kstDate();
  const st = feedStatus(gameState.hintsSeen, day);
  if (kind === 'free' && st.fed) return false;
  if (kind === 'ad' && !st.adLeft) return false;
  gameState.hintsSeen = kind === 'ad' ? afterFeedAd(gameState.hintsSeen, day) : afterFeed(gameState.hintsSeen, day);
  buffs.luck = Math.max(buffs.luck, clock.elapsedTime) + FEED_BUFF_SEC;
  emitBuffs();
  pondGather();
  ui.toast?.(POND_COPY.fedToast, 2600);
  trackEvent('pond_feed', { kind, count: pondCount() });
  requestSave();
  return true;
}

function feedRow() {
  const st = feedStatus(gameState.hintsSeen, kstDate());
  const row = document.createElement('div');
  row.className = 'cb-head';
  if (!st.fed) {
    const b = document.createElement('button');
    b.className = 'cb-btn';
    b.textContent = POND_COPY.feedBtn;
    b.onclick = () => { closeBook(); feedPond('free'); };
    row.append(b);
    return row;
  }
  const line = document.createElement('span');
  line.textContent = POND_COPY.fedToday;
  row.append(line);
  const ad = st.adLeft ? pondFeedAdButton(ok => { if (ok) closeBook(); }) : null;
  if (ad) row.append(ad);
  return row;
}

function go(kind) {
  closeBook();
  yardGuidePointTo(kind);
}

function slotInfo(slot) {
  if (slot.got) return { line: `${slot.ico} ${slot.name}` };
  const h = slot.hint;
  if (h.kind === 'season') return { line: `${POND_COPY.season[h.season]} · ${POND_COPY.until[h.season].replace('{0}', h.days)}` };
  if (h.kind === 'sea') return { line: POND_COPY.hintSea, go: { label: POND_COPY.goSea, onClick: () => go('sea') } };
  return { line: h.now ? POND_COPY.hintLakeNow : POND_COPY.hintLake, go: { label: POND_COPY.goLake, onClick: () => go('lake') } };
}

export function openPondBook() {
  if (!pondExists()) return;
  const info = seasonInfo(todayStr());
  const book = fishBook({ dexFish: gameState.dex?.fish, seaBest: gameState.sea?.best }, { river: riverList(), sea: seaList() }, { season: info.season.id, left: info.left }, SEASON_IDS);
  const label = s => ({ ...s, label: s.w != null ? `${s.w}kg` : s.name });
  openBook({
    title: POND_COPY.bookTitle,
    count: `${book.got} / ${book.total}`,
    closeLabel: POND_COPY.bookClose,
    hint: POND_COPY.bookHint,
    head: feedRow(),
    sections: [{ title: POND_COPY.secRiver, slots: book.river.map(label) }, { title: POND_COPY.secSea, slots: book.sea.map(label) }],
    onSlot: slotInfo,
  });
  if (!gameState.hintsSeen.pondBook) { gameState.hintsSeen.pondBook = true; requestSave(); }
  trackEvent('pond_book_open', { count: book.got });
}
```

시즌 힌트 줄은 계절 문장과 남은 날 문장을 `·` 로 잇는다. 영어는 Task 9 에서 조각마다 따로 넣는다(`t()` 가 줄을 문장 단위로 나눠 번역한다). Task 10 브라우저 확인에서 영어 모드도 본다.

- [ ] **Step 4: `js/guide/prepass-rules.js:11` 교체**

```js
export const REPEAT_SLOTS = Object.freeze(['farm_rush', 'craft_rush', 'daily_double', 'sell_bonus', 'pond_feed_more']);
```

- [ ] **Step 5: `js/game.js` 수정**

86행 `import { refreshPond, updatePond, pondScatterBlocks } from './pond/index.js';` 은 pond-wiring 테스트가 글자 그대로 잠그므로 건드리지 않고, **그 다음 줄**에 새 import 를 따로 추가:

```js
import { feedPond, openPondBook } from './pond/feed.js';
import { POND_COPY } from './pond/copy.js';
```

`function dailyAdButton(coins, streak) { ... }` 함수 바로 다음에 추가:

```js
export function pondFeedAdButton(onDone) {
  if (!repeatOpen(gameState.houseStage) || !rewarded?.offer('pond_feed_more')) return null;
  return rewarded.button('pond_feed_more', ['광고 보고', ' ', POND_COPY.adMore], () => feedPond('ad'), (ok, btn) => onDone?.(ok, btn));
}
```

`handleAction` 의 `if (nearDoor === 'pet') return commandPet();` (7679행) 바로 앞 줄에 추가:

```js
  if (nearDoor === 'pond') return openPondBook();
```

- [ ] **Step 6: `js/spaces/doors.js` 수정**

import 블록 끝(`import { plazaSpot } from '../plaza/index.js';` 다음)에 추가:

```js
import { pondNear } from '../pond/index.js';
import { POND_COPY } from '../pond/copy.js';
```

`if (!prompt && !farmActionFirst() && !visitorTarget() && petChoresNear()) { $w.nearDoor = 'pet'; prompt = '🐾 맡기기'; }` 바로 **앞** 줄에 추가:

```js
  if (!prompt && pondNear()) { $w.nearDoor = 'pond'; prompt = POND_COPY.prompt; }
```

- [ ] **Step 7: `index.html` `setDoorPrompt` 아이콘 정규식 두 곳**

5268행 근처의 두 정규식 `/^(❗|⛏️|🍄|🛗|🪜|🧰|🪞|🚏|💬|💧|🎁|🔙|🎃|🪏|🍽️|🍽|✋|🫳|🔪|🍳|🗑️)/u` 를 둘 다 아래로 바꾼다:

```js
/^(❗|⛏️|🍄|🛗|🪜|🧰|🪞|🚏|💬|💧|🎁|🔙|🎃|🪏|🍽️|🍽|✋|🫳|🔪|🍳|🗑️|🐟)/u
```

- [ ] **Step 8: 통과 확인**

Run: `node --test tests/pond-feed-wiring.test.mjs tests/homi-stall.test.mjs tests/prepass-repeat.test.mjs tests/prepass-rules.test.mjs`
Expected: PASS (이 테스트들은 소스를 글자로 읽어 `yard-guide.js` 가 아직 없어도 통과한다)

- [ ] **Step 9: 커밋**

```bash
git add js/pond/feed.js js/game.js js/spaces/doors.js index.html js/guide/prepass-rules.js tests/pond-feed-wiring.test.mjs
git commit -m "feat(pond): fish book window, daily feed with luck buff and pond_feed_more ad"
```

---

### Task 7: 마당 채우기 안내 `js/pond/yard-guide.js` + game.js 연결

**Files:**
- Create: `js/pond/yard-guide.js`
- Modify: `js/game.js` (import, `let yardGuide`, 생성, 매 프레임 갱신, `otherGuide`)
- Test: `tests/pond-feed-wiring.test.mjs` (단언 추가)

**Interfaces:**
- Consumes: Task 2 `yardIdle`·`yardReady`·`yardSteps`·`goStep`·`d1Ready`·`d1Steps`·`YARD_PIER`, Task 1 `feedStatus`, Task 4 `pondPos`·`pondNear`·`POND_COPY`, Task 5 `setFishAssist`, `createGuide` (`js/guide/runner.js`), `createGuideView` (`js/guide/view.js`), `detourPoint` (`js/guide/guide-rules.js`), `SEA_GATE` (`js/data/places.js`)
- Produces:
  - `createYardGuide(deps) → { active(), pointTo(kind), update(dt) }`
  - `installYardGuide(deps)` (모듈 싱글턴), `yardGuidePointTo(kind)` (Task 6 이 씀)
  - `guide_step` 이벤트: `{ flow: 'yard_fill' | 'pond_d1' | 'pond_go', step, ms }` (runner 가 보냄)

- [ ] **Step 1: 실패하는 단언을 `tests/pond-feed-wiring.test.mjs` 에 추가**

```js
test('마당 채우기 연결', () => {
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /export function createYardGuide\(deps\)/);
  assert.match(y, /export function installYardGuide\(deps\)/);
  assert.match(y, /export function yardGuidePointTo\(kind\)/);
  assert.match(y, /run\('yard_fill', yardSteps\(POND_COPY\)/);
  assert.match(y, /run\('pond_d1', d1Steps\(POND_COPY\)/);
  assert.match(y, /onStep: e => deps\.track\('guide_step', e\)/);
  assert.match(y, /hintsSeen\.yardFill = true/);
  assert.match(y, /hintsSeen\.pondD1 = true/);
  assert.doesNotMatch(y, /guideRevamp|e6Decision/);
  const g = src('js/game.js');
  assert.match(g, /yardGuide = installYardGuide\(\{/);
  assert.match(g, /if \(mode === 'play'\) yardGuide\?\.update\(dt\);/);
  assert.match(g, /otherGuide: \(\) => portGuideActive\(\) \|\| restaurantGuideActive\(\) \|\| auctionGuideActive\(\) \|\| !!yardGuide\?\.active\(\),/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/pond-feed-wiring.test.mjs`
Expected: FAIL (새 테스트 1개)

- [ ] **Step 3: 구현 `js/pond/yard-guide.js`**

```js
import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { SEA_GATE } from '../data/places.js';
import { feedStatus } from './actions.js';
import { yardIdle, yardReady, yardSteps, goStep, d1Ready, d1Steps, YARD_PIER } from './yard-steps.js';
import { POND_COPY } from './copy.js';

let inst = null;

export function createYardGuide(deps) {
  let guide = null, view = null, idle = 0, flow = null;

  const ctx = () => {
    const pond = deps.pondPos();
    return {
      me: deps.player.position, pier: YARD_PIER, pond, hasPond: !!pond,
      nearLake: deps.nearLake(), fishing: deps.fishing(), nearPond: deps.pondNear(),
      fedToday: feedStatus(deps.state().hintsSeen, deps.today()).fed,
    };
  };

  const stop = () => {
    guide = null;
    flow = null;
    view?.hide();
    deps.setAssist(false);
  };

  const run = (name, steps, onDone) => {
    view ??= createGuideView({ scene: deps.scene, camera: deps.camera, root: document.body });
    flow = name;
    guide = createGuide({
      flow: name, steps, now: () => performance.now(),
      onStep: e => deps.track('guide_step', e),
      onDone: () => { stop(); onDone?.(); },
    });
  };

  const startYard = () => {
    deps.banner(POND_COPY.owlStart);
    deps.setAssist(true);
    run('yard_fill', yardSteps(POND_COPY), () => {
      deps.state().hintsSeen.yardFill = true;
      deps.save();
      deps.banner(POND_COPY.owlDone);
    });
  };

  const startD1 = () => {
    run('pond_d1', d1Steps(POND_COPY), () => {
      deps.state().hintsSeen.pondD1 = true;
      deps.save();
    });
  };

  return {
    active: () => !!guide?.active(),
    pointTo(kind) {
      if (flow === 'yard_fill' || flow === 'pond_d1') return;
      const sea = kind === 'sea';
      run('pond_go', [goStep(sea ? { x: SEA_GATE.x, z: SEA_GATE.z } : YARD_PIER, sea ? POND_COPY.goStepSea : POND_COPY.goStepLake)]);
    },
    update(dt) {
      if (!guide) {
        const s = deps.state(), h = s.hintsSeen || {}, on = deps.on(), today = deps.today();
        idle = yardIdle(idle, dt, deps.free() && deps.inVillage());
        if (yardReady({ on, bridge: !!s.unlocks?.flags?.bridge, done: !!h.yardFill, idleSec: idle })) {
          idle = 0;
          startYard();
        } else if (d1Ready({ on, yardDone: !!h.yardFill, d1Done: !!h.pondD1, pondDay: h.pondDay, today, fedToday: feedStatus(h, today).fed, idleSec: idle })) {
          idle = 0;
          startD1();
        }
        return;
      }
      const c = ctx();
      guide.tick(c);
      if (!guide) return;
      const step = guide.current();
      if (!deps.inVillage() || !step) { view.hide(); return; }
      view.show(step, guide.index(), guide.total, c, deps.player.position, deps.route, 0);
    },
  };
}

export function installYardGuide(deps) {
  inst = createYardGuide(deps);
  return inst;
}

export function yardGuidePointTo(kind) {
  inst?.pointTo(kind);
}
```

- [ ] **Step 4: `js/game.js` 연결**

69행 `import { rearmMerchant } from './guide/guide-rules.js';` 를 아래로 교체:

```js
import { rearmMerchant, detourPoint } from './guide/guide-rules.js';
```

Task 6 에서 넣은 `import { POND_COPY } from './pond/copy.js';` 다음 줄에 추가. 먼저 `grep -n "spaceLinkOn\|e3Decision\|kst-date" js/game.js` 로 확인하고 이미 import 된 이름의 줄은 빼고 넣는다:

```js
import { pondPos, pondNear } from './pond/index.js';
import { installYardGuide } from './pond/yard-guide.js';
import { spaceLinkOn } from './exp-e3.js';
import { e3Decision } from './exp-e3-boot.js';
import { kstDate } from './kst-date.js';
```

288~291행 fishing import 를 아래로 교체:

```js
import {
  tryChop, tryFish, updateFishing, setFishAssist,
} from './spaces/fishing.js';   // 📦 낚시: 호수 물가에서 던지기 → 물면 낚아채기(반응 미니게임)
```

(끝의 주석은 기존 줄의 것을 그대로 둔다. 새 주석을 쓰지 않는다)

`let houseShort = null;` (1621행) 다음 줄에 추가:

```js
let yardGuide = null;
```

`goalGuide = guideRevamp ? createGoalGuide({` 블록 안의 `otherGuide` 줄을 아래로 교체:

```js
    otherGuide: () => portGuideActive() || restaurantGuideActive() || auctionGuideActive() || !!yardGuide?.active(),
```

`goalGuide = ... createGoalGuide({ ... }) : null;` 문장이 끝난 바로 다음 줄에 추가:

```js
  yardGuide = installYardGuide({
    state: () => gameState, on: () => spaceLinkOn(e3Decision()), inVillage: inVillage2,
    free: () => !ui.anyModalOpen?.() && !ui.coachActive?.() && !portGuideActive() && !restaurantGuideActive() && !auctionGuideActive() && !goalGuide?.cinematic && !houseGuidance?.cinematic && cameraFree(),
    scene, camera, player,
    route: (me, tgt) => detourPoint({ x: me.x, z: me.z }, { x: tgt.x, z: tgt.z }, colliders.filter(c => ('r' in c ? c.r >= 1.0 : true))),
    track: trackEvent, save: requestSave, today: kstDate,
    banner: line => ui.showHintBanner?.({ ico: '🦉', title: POND_COPY.owlTitle, line, near: () => true, attention: true }),
    setAssist: setFishAssist, pondPos, pondNear,
    nearLake: () => dist2D(LAKE, player.position) <= LAKE_R + 2.8,
    fishing: () => fishState !== 'idle',
  });
```

메인 루프의 `if (mode === 'play') goalGuide?.update(dt);` (6555행) 다음 줄에 추가:

```js
  if (mode === 'play') yardGuide?.update(dt);
```

- [ ] **Step 5: 전체 테스트 + 모듈 문법**

Run: `npm test 2>&1 | tail -5 && for f in js/game.js js/pond/feed.js js/pond/yard-guide.js js/spaces/doors.js; do cp $f /tmp/check.mjs && node --check /tmp/check.mjs || echo "SYNTAX $f"; done`
Expected: `# fail 0`, `SYNTAX` 출력 없음. `tests/pond-wiring.test.mjs` 의 86행 import 단언, `tests/lazy-game-boot.test.mjs`, `tests/bundle-boot.test.mjs` 포함 전부 통과(새 모듈은 game.js 를 통해서만 들어가 첫 화면 번들에 안 붙는다)

- [ ] **Step 6: 커밋**

```bash
git add js/pond/yard-guide.js js/game.js tests/pond-feed-wiring.test.mjs
git commit -m "feat(pond): yard-fill guide after the bridge, lake to pond to first feed"
```

---

### Task 8: 다음 날 연못 푸시

**Files:**
- Modify: `functions/push/pick-kind.js` (`pickPush`, `messageFor`)
- Create: `sql/migrations/migrate_push_pond.sql`
- Test: `tests/push-pick.test.mjs` (테스트 추가)

**Interfaces:**
- Consumes: `push_candidates` 의 새 열 `pond_day text` (= `game_saves.state -> 'hintsSeen' ->> 'pondDay'`, Task 4 가 씀)
- Produces: `pickPush` 가 `{ kind: 'pond' }` 를 돌려줄 수 있다. 우선순위 🦝 night > 🔥🫙 craft > 🐟 pond > 🌱 return

- [ ] **Step 1: 실패하는 테스트를 `tests/push-pick.test.mjs` 끝에 추가**

```js
test('🐟 연못 — 어제 연못을 만들고 오늘 아직 안 들어온 사람', () => {
  const away = { updated_at: '2026-10-12T05:00:00Z', plots: [], pond_day: '2026-10-12' };
  assert.deepEqual(pickPush(row(away), D, null), { kind: 'pond' });
  assert.equal(pickPush(row({ ...away, pond_day: '2026-10-11' }), D, null), null, '그저께 만든 연못은 안 보낸다');
  assert.equal(pickPush(row({ ...away, pond_day: null }), D, null), null);
  assert.equal(pickPush(row({ pond_day: '2026-10-12', plots: [] }), D, null), null, '오늘 이미 들어왔다');
});

test('🐟 연못 — 밤손님이 먼저', () => {
  assert.deepEqual(pickPush(row({ updated_at: '2026-10-12T05:00:00Z', pond_day: '2026-10-12' }), D, { visited: true }), { kind: 'night' });
});

test('🐟 연못 문구', () => {
  assert.deepEqual(messageFor({ kind: 'pond' }, 'ko'), { title: '🐟 연못 물고기들이 기다려요', body: '오늘 먹이를 주러 와 주세요 🌿' });
  assert.deepEqual(messageFor({ kind: 'pond' }, 'en'), { title: '🐟 Your pond fish are waiting', body: 'Come feed them today 🌿' });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/push-pick.test.mjs`
Expected: FAIL (pond 판정·문구 테스트 2개)

- [ ] **Step 3: `functions/push/pick-kind.js` 수정**

`pickPush` 의 craft `if (lastMs < dates.todayStartMs) { ... }` 블록 바로 다음에 추가:

```js
  if (lastMs < dates.todayStartMs && row.pond_day === dates.yesterday) return { kind: 'pond' };
```

`messageFor` 의 craft 분기 다음, 마지막 `return en ? ...` 앞에 추가:

```js
  if (pick.kind === 'pond') {
    return en ? { title: '🐟 Your pond fish are waiting', body: 'Come feed them today 🌿' }
              : { title: '🐟 연못 물고기들이 기다려요', body: '오늘 먹이를 주러 와 주세요 🌿' };
  }
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/push-pick.test.mjs tests/push-cron.test.mjs`
Expected: PASS

- [ ] **Step 5: 운영 제약 이름 확인 (읽기만)**

메모리 sql-run-direct-pooler 의 pg8000 풀러 방법으로 실행:

```sql
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.push_logs'::regclass and contype = 'c';
```

Expected: `kind` 제약 이름(보통 `push_logs_kind_check`). 다르면 Step 6 의 이름을 그 값으로 바꾼다.

- [ ] **Step 6: `sql/migrations/migrate_push_pond.sql`**

```sql
alter table public.push_logs drop constraint if exists push_logs_kind_check;
alter table public.push_logs add constraint push_logs_kind_check check (kind in ('night', 'craft', 'return', 'pond'));

drop function if exists public.push_candidates(date, int);
create or replace function public.push_candidates(p_today date, p_limit int default 100)
returns table (
  token text, user_id uuid, lang text, updated_at timestamptz,
  plots jsonb, outdoor jsonb, truce jsonb, night_last text, craft jsonb, returns_7d int, pond_day text
)
language sql stable security definer set search_path = public as $$
  select c.token, c.user_id, c.lang, c.updated_at, c.plots, c.outdoor, c.truce, c.night_last, c.craft, c.returns_7d, c.pond_day from (
  select distinct on (t.user_id)
         t.token, t.user_id, t.lang, s.updated_at,
         s.state -> 'plots' as plots, s.state -> 'outdoor' as outdoor, s.state -> 'night' -> 'truce' as truce,
         s.state -> 'night' ->> 'lastDate' as night_last, s.state -> 'craft' as craft,
         (select count(*)::int from public.push_logs l
           where l.user_id = t.user_id and l.kind = 'return' and l.status = 'sent'
             and l.sent_at > now() - interval '7 days') as returns_7d,
         s.state -> 'hintsSeen' ->> 'pondDay' as pond_day
  from public.push_tokens t
  join public.game_saves s on s.user_id = t.user_id
  where t.enabled and (t.last_checked_on is null or t.last_checked_on < p_today)
  order by t.user_id, t.updated_at desc
  ) c
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 1000);
$$;

revoke all on function public.push_candidates(date, int) from public, anon, authenticated;
grant execute on function public.push_candidates(date, int) to service_role;
```

**운영 적용은 이 단계에서 하지 않는다.** 웹 배포와 같은 날 사용자 확인 뒤 풀러로 실행한다(배포 체크리스트에 적는다). 옛 크론 코드는 새 열을 무시하고, 새 크론 코드는 옛 함수에서 `pond_day` 가 `undefined` 라 pond 를 고르지 않으므로 순서가 엇갈려도 깨지지 않는다.

- [ ] **Step 7: 커밋**

```bash
git add functions/push/pick-kind.js sql/migrations/migrate_push_pond.sql tests/push-pick.test.mjs
git commit -m "feat(push): next-day pond push for app users who made their pond yesterday"
```

---

### Task 9: 이벤트 목록·영어 문구·실험 문서

**Files:**
- Modify: `docs/analysis/event-taxonomy.csv` (`pond_view` 행 다음에 2행, `guide_step`·`prepass_eligible`·`fishing_catch` 행 수정)
- Modify: `js/i18n-en.js` (3151행 `'🌊 내 연못이 생겼어요 — ...'` 줄 다음)
- Modify: `dev/active/metrics-framework/space-link-experiment-prereg.md` (끝에 개정 2)
- Modify: `dev/active/main-quest-guide/e6-guide-prereg.md` ("양쪽 공통" 줄)

- [ ] **Step 1: 코드 줄 번호 확인**

Run: `grep -n "trackEvent('pond_feed'\|trackEvent('pond_book_open'" js/pond/feed.js`
Expected: 두 줄의 행 번호(아래 CSV 의 `:N` 에 넣는다)

- [ ] **Step 2: `docs/analysis/event-taxonomy.csv` — `pond_view` 행 다음에 추가 (`:N` 은 Step 1 값)**

```csv
pond_feed,gathering,pond,2,N,not_fired,0,0,,,count|kind,js/pond/feed.js:N,"마당 연못에 먹이를 줬을 때 (kind=free 하루 1번 또는 ad 광고 한 번 더, count=연못 물고기 수). 30초 낚시 행운",
pond_book_open,gathering,pond,2,N,not_fired,0,0,,,count,js/pond/feed.js:N,"🐟 버튼으로 물고기 수첩을 열었을 때 (count=채운 칸 수, 최대 11)",
```

- [ ] **Step 3: 같은 CSV 의 세 행 수정**

`guide_step` 행: `custom_keys` 는 그대로 두고, `description_draft` 끝의 닫는 `"` 바로 앞에 덧붙인다:

```text
 · 마당 채우기(js/pond/yard-guide.js): flow=yard_fill 다리 수리 뒤 호수→연못→먹이 5단계(lake·cast·catch·pond·feed) | pond_d1 다음 날 첫 접속 연못→먹이 2단계 | pond_go 수첩에서 장소로 1단계, step=끝낸 단계 번호, ms=그 단계에 머문 밀리초
```

`prepass_eligible` 행 설명의 `sell_bonus` 를 `sell_bonus·pond_feed_more` 로 바꾼다.

`fishing_catch` 행의 `custom_keys` 끝에 `|assist` 를 붙이고, 설명의 닫는 `"` 앞에 ` · assist=1 은 마당 채우기 안내의 보장된 첫 캐스팅(DDA 미반영)` 을 덧붙인다.

- [ ] **Step 4: `js/i18n-en.js` — 3151행 `'🌊 내 연못이 생겼어요 — ...'` 줄 다음에 추가**

```js
  '🐟 내 연못': '🐟 My pond',
  '❔ 칸을 누르면 어디서 낚이는지 알려 줘요': '❔ Tap a slot to see where it bites',
  '강 물고기': 'River fish',
  '바다 대어': 'Big sea fish',
  '🍞 먹이 주기': '🍞 Feed the fish',
  '🍞 오늘 먹이를 줬어요. 내일 또 줄 수 있어요': '🍞 Fed for today. You can feed them again tomorrow',
  '🍞 물고기들이 몰려왔어요 · 🍀 낚시 행운 30초': '🍞 The fish swam over · 🍀 Fishing luck for 30s',
  '🎣 마을 호수에서 낚여요': '🎣 Bites at the village lake',
  '🎣 지금 계절이에요. 마을 호수에서 낚여요': '🎣 It is in season now. Bites at the village lake',
  '🌊 바다터에서 낚여요': '🌊 Bites at the sea spot',
  '호수로': 'To the lake',
  '바다터로': 'To the sea',
  '🌸 봄에만 강에서 낚여요': '🌸 Only bites in spring',
  '☀️ 여름에만 강에서 낚여요': '☀️ Only bites in summer',
  '🍂 가을에만 강에서 낚여요': '🍂 Only bites in autumn',
  '❄️ 겨울에만 강에서 낚여요': '❄️ Only bites in winter',
  '봄까지 {0#}일': '{0} days to spring',
  '여름까지 {0#}일': '{0} days to summer',
  '가을까지 {0#}일': '{0} days to autumn',
  '겨울까지 {0#}일': '{0} days to winter',
  '🍞 한 번 더': '🍞 One more',
  '마당이 좀 허전하지? 호수에서 한 마리 낚아서 연못을 만들어 보자': 'The yard looks a bit empty. Catch a fish at the lake and start a pond',
  '물고기들이 좋아해요. 내일 또 먹이 주러 와요': 'The fish loved it. Come feed them again tomorrow',
  '🎣 호수 부두로 가 보세요': '🎣 Head to the lake pier',
  '🐟 마당에 연못이 생겼어요. 가 보세요': '🐟 A pond appeared in your yard. Go take a look',
  '🌊 바다터 입구로 가 보세요': '🌊 Head to the sea gate',
  '🐟 물고기들이 기다려요. 연못으로 가 보세요': '🐟 The fish are waiting. Head to your pond',
```

`'닫기'`·`'의뢰 올빼미'`·`'광고 보고'` 는 이미 있다(Step 5 검사로 확인). `'봄까지 {0#}일'` 류는 숫자 슬롯 패턴이라 사전 **맨 끝 캐치올 묶음보다 앞**이면 된다(메모리 cooking-course-rework: 캐치올은 맨 끝).

- [ ] **Step 5: 번역 누락 검사**

Run: `node scripts/i18n_check.mjs 2>&1 | tail -20`
Expected: 새 문구 누락 0. 누락이 뜨면 그 원문을 Step 4 목록에 추가

- [ ] **Step 6: E3 사전등록 개정 2 — `space-link-experiment-prereg.md` 끝에 추가**

```markdown
## 개정 2 (2026-11-12, 결과 보기 전)

공간 연결 2차 P1 이 처치 무리에 더해진다: 🐟 연못 버튼 · 물고기 수첩 · 하루 한 번 먹이 주기(30초 낚시 행운, 광고로 한 번 더) · 다리 수리 뒤 "마당 채우기" 안내(첫 캐스팅 보장) · 다음 날 앱 푸시.

- 판정 대상은 "공간 연결 묶음(보상·안내 포함)" 효과다. 연못 단독 효과로 해석하지 않는다
- 주 지표·판정 규칙·표본·기간은 그대로
- 보조 지표 추가(판정 미사용): 먹이 주기 사용률(`pond_feed` kind=free 기기 비율), 광고 한 번 더 비율, `guide_step` flow=yard_fill 단계별 통과율, 수첩 열기 비율
- 교란: 마당 채우기의 첫 캐스팅 보장은 처치 무리에만 있어 처치 무리의 첫 낚시 도달이 기계적으로 오른다. 주 지표 트리거(첫 물고기)가 처치 쪽에서 더 쉽게 생긴다는 뜻이므로, 트리거 기준 비교 외에 ITT(배정된 새 기기 전체 1~7일차 재방문)를 함께 보고한다
- 웹 배포일을 P1 시작일로 이 문서에 적는다
```

- [ ] **Step 7: E6 사전등록 — "양쪽 공통(교란 요인으로 기록)" 줄 끝에 덧붙이기**

```text
, 공간 연결 P1 마당 채우기 안내(다리 수리 뒤, E3 처치 무리만, E6 와 해시 독립 · 2026-11-12 추가)
```

- [ ] **Step 8: 전체 테스트**

Run: `npm test 2>&1 | tail -5`
Expected: `# fail 0` (`tests/event-taxonomy.test.mjs` 가 새 이벤트 행을 확인)

- [ ] **Step 9: 커밋**

```bash
git add docs/analysis/event-taxonomy.csv js/i18n-en.js dev/active/metrics-framework/space-link-experiment-prereg.md dev/active/main-quest-guide/e6-guide-prereg.md
git commit -m "docs(pond): taxonomy rows, English copy and E3 amendment 2 for space link P1"
```

---

### Task 10: 브라우저 검증·문구 검수·리뷰

**Files:**
- Modify (필요할 때만): Task 1~9 파일
- Modify: `dev/active/space-link-v2/space-link-v2-tasks.md`, `-context.md`

- [ ] **Step 1: 미리보기 띄우기**

`preview_start {name: "calm-forest"}` → `http://localhost:8000/?dbg&e3=on&prepass=1`. `prepass=1` 은 localhost 에서 광고 무리를 `ad` 로 고정하고 가짜 광고를 쓴다. dev 세션이라 `trackEvent` 는 GA4 로 안 나간다.

- [ ] **Step 2: 마당 채우기 처음부터**

콘솔에서:

```js
const s = window.__liveState(); s.unlocks.flags.bridge = true; s.houseStage = 3; s.dex.fish = {}; s.sea.best = {}; s.hintsSeen.yardFill = false; delete s.hintsSeen.pondFeedDay; delete s.hintsSeen.pondDay;
```

Expected: 5초 안에 🦉 배너 "마당이 좀 허전하지?..." 와 금색 카드 `1/5 🎣 호수 부두로 가 보세요`, 금색 고리가 부두(12.8, 9)에.

- [ ] **Step 3: 화살표만 따라가는 봇**

`grep -n "window.__tp\|__walk\|Input.doAction" js/game.js index.html | head` 로 디버그 이동·행동 훅을 찾는다. 카드의 다음 목표(`#guide-card` 텍스트, 고리 위치)만 보고 이동·행동해서 5단계를 끝까지 간다. 단계마다 확인:
- `cast` 뒤 1.2초 안에 입질, 20초 동안 놓치지 않음
- `catch` 뒤 집 마당에 연못이 생기고 카드가 `4/5 🐟 마당에 연못이 생겼어요...` 로, 고리가 연못 위에
- 연못 3.4 안에서 행동 버튼 아이콘이 🐟(🚪 아님), 누르면 수첩 창
- 창 위 `🍞 먹이 주기` → 물고기가 남쪽 물가로 모이고, 버프 칩 🍀 30초, 카드 사라짐, 🦉 "내일 또..." 배너
- 화살표가 집·바위를 관통하지 않음(메모리 onboarding-arrow-guidance). 막히면 `route` 경유점 원인 조사

- [ ] **Step 4: 다시 열기 · 광고 · 장소 이동**

다시 🐟 → 창 머리에 "오늘 먹이를 줬어요..." 와 `광고 보고 🍞 한 번 더`. 누르면 가짜 광고 완료 → 버프 연장, 창 닫힘. 다시 열면 광고 버튼 없음. 빈 칸 ❔(예: 바다) → `🌊 바다터에서 낚여요` + `바다터로` → 창 닫히고 금색 1단계 안내가 바다터 입구로. 계절 칸은 남은 날만, 버튼 없음. `?lang=en` 으로 같은 화면을 영어로 확인.

- [ ] **Step 5: 대조 무리 · 이미 연못 있는 유저 · 다음 날**

`?dbg&e3=off` → 연못·버튼·안내 모두 없음. `?dbg&e3=on` 에서 `dex.fish = { common: 1 }` 인 상태로 Step 2 → 카드가 바로 `4/5` 연못 단계부터. 다음 날 흉내: `s.hintsSeen.yardFill = true; s.hintsSeen.pondDay = '2026-01-01'; delete s.hintsSeen.pondFeedDay; delete s.hintsSeen.pondD1;` → 5초 뒤 `1/2 🐟 물고기들이 기다려요...` 카드, 먹이 주면 끝, 다시 안 뜸.

- [ ] **Step 6: 캡처·드로우콜**

PC(1280×800)와 모바일 세로(375×812)·가로(812×375)에서 수첩 창·안내 카드·연못 모이기를 캡처해 `dev/active/space-link-v2/p1-*.png` 로 저장. `renderer.info.render.calls` 를 연못 앞에서 먹이 전후로 측정(메시 추가가 없으니 차이 0 이 기대값).

- [ ] **Step 7: 문구 검수 (사용자)**

`js/pond/copy.js` 의 새 문구와 푸시 문구(`functions/push/pick-kind.js`)를 표로 사용자에게 보여 주고 확정받는다(메모리 ui-copy-review-first). 바뀌면 `copy.js`·`i18n-en.js`·`tests/push-pick.test.mjs` 를 함께 고치고 `npm test`.

- [ ] **Step 8: 코드 리뷰**

`code-reviewer` 에이전트에 `git diff main...feat/space-link-p1` 리뷰를 맡긴다. CRITICAL·HIGH 는 고치고 다시 `npm test`.

- [ ] **Step 9: dev docs 갱신 · 커밋**

`space-link-v2-tasks.md` 의 P1 체크, `-context.md` 의 Last Updated·결정(다리 뒤 안내, hintsSeen 저장)·남은 일(운영 SQL, 배포, 다음 날 BQ 재검증) 갱신.

```bash
git add dev/active/space-link-v2 js tests docs
git commit -m "chore(pond): P1 verification notes and copy review"
```

푸시·병합·배포·운영 SQL 적용은 사용자 확인 뒤 별도로(메모리 deploy-checklist 5곳, push-secret-scan).
