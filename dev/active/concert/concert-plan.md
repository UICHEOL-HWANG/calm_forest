# Village Concert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 호수 옆 공원 무대에서 두 줄 박자 맞추기 공연을 하고, 받은 음표로 악기 4종과 꾸미기 6종을 바꾸는 항상 열린 미니게임을 만든다.

**Architecture:** 순수 모듈 셋(`rules.js` 상태 규칙, `judge.js` 판정, `songs.js` 악보)이 화면 없이 테스트되고, 소리는 Web Audio 시계로 예약한다. 판정 창에는 기존 DDA 계수 `ease`를 곱한다. game.js에는 연결 줄만 넣고, 카메라·조작 잠금·캐릭터 자세는 `bridge.js`가 맡는다. 서버 변경은 없다.

**Tech Stack:** 바닐라 ES 모듈, Three.js, Web Audio, `node --test`(tests/*.test.mjs), GA4 `trackEvent`(js/analytics.js), 기존 `js/difficulty.js`.

**Spec:** `docs/superpowers/specs/2026-11-14-concert-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 주석을 쓰지 않는다.
- 새 로직은 game.js에 넣지 않는다. game.js에서 `concert`가 들어간 줄은 16줄 이하(Task 7 테스트가 잠근다).
- 상태 갱신은 불변으로 한다. 규칙 함수는 새 객체를 돌려준다.
- 저장 요청은 공연 완주, 교환, 악기 바꾸기, 연습 완료 때만 한다. 초기화와 매 프레임 갱신은 저장을 요청하지 않는다.
- 날짜는 기존 `todayStr()`(KST) 값을 받아 쓴다.
- 팔 조형과 도구 휘두르는 모션(`slashPhase`, `SLASH`, `ARM_AIM_*`)은 고치지 않는다. 공연 중에만 팔 방향을 덮어쓴다.
- UI 문구에 엠대시(—)와 "놀다" 계열 낱말을 쓰지 않는다. 새 버튼·라벨 문구는 구현 전에 후보를 사용자에게 검수받는다.
- 머리 위 말풍선은 이모지만 쓴다. 길 안내 표식은 CSS·3D로 그린 금색 화살표만 쓴다.
- 조형과 화면은 시안 3개 이상을 렌더해 PC·모바일로 나란히 비교한 뒤 사용자가 고른다. 시안 파일(`sims/concert-*`)은 커밋하지 않는다.
- 새 GA4 이벤트는 5개. 기능 항목은 이벤트당 5개 이하, 공연 시작과 끝에는 기존 난이도 키 4개를 더 싣는다.
- 한국어 문구를 추가하면 `js/i18n-en.js`에 영어 값을 같이 넣는다.
- 커밋 메시지는 영어, `<type>: <description>` 형식. 서명 줄을 붙이지 않는다.
- 파일을 고칠 때 스크립트(sed, python)로 일괄 치환하지 않는다. 편집 도구로 한 곳씩 고친다.
- 작업은 워크트리 `.claude/worktrees/concert`(브랜치 `feat/concert`)에서 한다. 워크트리에는 `.env`와 `node_modules`가 없다. 테스트 `@capacitor/app 이 두 앱에 들어간다` 1건은 그래서 원래 실패한다.
- 배포, 푸시, 병합은 이 계획의 범위 밖이고 사용자 지시가 있을 때만 한다. 새 꾸미기 id와 세이브 칸이 생기므로 배포는 5곳(웹, 토스, Play, iOS, itch) 동시다.

## 스펙에서 달라진 점 (계획 단계에서 확정)

- 캐릭터 조작 잠금에 `mgView`를 쓰지 않는다. `mgView`가 켜지면 game.js가 `updateCamera`를 건너뛰어 카메라 리그가 돌지 않는다. 대신 `setCameraRig(fn)`으로 카메라를 잡고, 공연 화면 루트의 id를 `-modal`로 끝내 `ui.anyModalOpen()`이 이동과 상호작용을 막게 한다. HUD는 `body.mg-open`으로 숨긴다.
- 팔 자세는 `updateConcert`에서 덮어쓴다. `updatePlayer`가 먼저 돌며 팔을 쉬는 자세로 되돌리고, 그 뒤에 불리는 `updateConcert`가 같은 프레임에 공연 자세를 쓴다.
- `best`에는 점수가 아니라 달성률(0~1)을 넣는다. 곡마다 음표 수가 달라 점수는 비교가 안 된다.
- 곡 길이와 음표 수(카운트인 한 마디 포함): 숲의 아침 약 65초·65개, 장터 행진 약 60초·114개, 별빛 왈츠 약 69초·164개. 같은 줄 음표는 4분음표 간격 이상으로만 놓는다(8분음표 연타는 좋아요 창 두 배보다 좁다).
- 장터 행진의 마지막 한 박만 두 줄 동시 음표다(끝맺음). 그 밖의 동시 음표는 별빛 왈츠에만 있다.
- 반주는 손으로 쓴 선율 대신 코드 진행에서 만든다. 베이스, 화음, 그리고 악보 음표 시각에 맞춘 화음 구성음 선율이다. 곡 듣기 게이트에서 사용자가 판단한다.
- `concert_end`의 "끝난 이유"는 뺀다. 중간에 나간 판은 `minigame_abandon`으로 가므로 `concert_end`는 완주만 남는다. 대신 딱 맞음 수를 싣는다.
- 출력 지연 상수는 `OUTPUT_LAG_MS = 30`으로 시작한다.
- 무대 좌표는 잠정값 (6.5, 10.5), 정면은 +z(마을 기본 카메라 쪽)다. Task 9 게이트에서 실측해 확정한다.
- 스펙의 `js/concert/items.js`는 한 파일로 시작한다. 400줄을 넘으면 품목별로 나눈다.

## File Structure

| 파일 | 역할 |
|---|---|
| Create `js/data/concert.js` | 곡 id, 악기·꾸미기 값, 별 기준, 판정 상수, 좌표. 값만 |
| Create `js/concert/rules.js` | 세이브 칸 기본값·복구, 별, 음표, 하루 제한, 교환 판정 |
| Create `js/concert/judge.js` | 판정 창 계산, 입력 판정, 놓침 쓸기, 요약 |
| Create `js/concert/songs.js` | 곡 3개 악보와 반주 이벤트 |
| Create `js/concert/audio.js` | 반주 예약, 악기 소리, 소리 시계 |
| Create `js/concert/copy.js` | 화면 문구 |
| Create `js/concert/views.js` | 창과 두 줄 화면이 쓰는 표시용 데이터(순수) |
| Create `js/concert/ui.js` | 곡 고르기·결과·교환 창 |
| Create `js/concert/lanes.js` | 두 줄 화면 |
| Create `js/concert/style.js` | CSS 주입 |
| Create `js/concert/track.js` | GA4 이벤트 5개 |
| Create `js/concert/bridge.js` | 카메라, 잠금, 캐릭터 배치, 악기 장착 |
| Create `js/concert/guide.js` | 첫 방문 안내 판정 |
| Create `js/concert/index.js` | game.js가 부르는 진입점. 근접 판정, 공연 진행 |
| Create `js/concert/instruments/pose.js`, `kit.js` | 팔 방향 잡기, 몸 앞면 계산, 메시 도우미 |
| Create `js/concert/instruments/{drum,guitar,bass,bells,maracas}.js` | 악기 조형과 자세 |
| Create `js/concert/instruments/index.js` | 악기 id로 빌더 찾기 |
| Create `js/spaces/concert-stage-art.js` | 무대, 악단, 객석, 충돌 |
| Create `js/concert/items.js` | 꾸미기 6종 조형 |
| Modify `js/tuning.js`, `js/difficulty.js` | `concert` 난이도 표와 결과 값 |
| Modify `js/sound.js` | `audioBus()` 내보내기 |
| Modify `js/data/catalog.js` | 꾸미기 6종 등록 |
| Modify `js/game.js`, `js/spaces/doors.js`, `js/spaces/indoor.js` | 연결 줄 |
| Modify `js/i18n-en.js`, `docs/analysis/event-taxonomy.csv`, `.gitignore` | 영어 값, 이벤트 표, 시안 제외 |
| Create `tests/concert-*.test.mjs` | 테스트 |

---

### Task 1: 데이터 표와 상태 규칙

**Files:**
- Create: `js/data/concert.js`, `js/concert/rules.js`
- Modify: `.gitignore` (104번 줄 `sims/weekly-*` 아래)
- Test: `tests/concert-rules.test.mjs`

**Interfaces:**
- Produces (`js/data/concert.js`): `SONG_IDS`, `BASE_INSTRUMENT`, `INSTRUMENTS: {id, cost}[]`, `CONCERT_DECOR: {id, kind:'indoor'|'outdoor', cost}[]`, `CONCERT_DECOR_IDS`, `PAID_PLAYS`, `STAR_CUTS`, `JUDGE_MS`, `OUTPUT_LAG_MS`, `STAGE_POS: {x, z}`, `SPOT_R`
- Produces (`js/concert/rules.js`): `concertDefault()`, `restoreConcert(saved)`, `starsFor(songId, ratio)`, `notesFor(stars)`, `paidLeft(state, today)`, `settle(state, {songId, ratio, today}) → {state, stars, earned, bestUp, left}`, `buyPlan(state, item, {isGuest, owned, hasArt}) → {ok, reason?, lack?}`, `spend(state, cost)`, `addInstrument(state, id)`, `equip(state, id)`, `markTutorial(state)`

- [ ] **Step 1: `.gitignore`에 시안 제외 추가**

`sims/weekly-*/` 줄 아래에 두 줄을 넣는다.

```
sims/concert-*
sims/concert-*/
```

- [ ] **Step 2: 실패하는 테스트 작성 (`tests/concert-rules.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, CONCERT_DECOR, PAID_PLAYS, SONG_IDS } from '../js/data/concert.js';
import { concertDefault, restoreConcert, starsFor, notesFor, paidLeft, settle, buyPlan, spend, addInstrument, equip, markTutorial } from '../js/concert/rules.js';

const DAY = '2026-11-14', NEXT = '2026-11-15';

test('prices add up to 250 and the base instrument is free', () => {
  const total = [...INSTRUMENTS, ...CONCERT_DECOR].reduce((t, i) => t + i.cost, 0);
  assert.equal(total, 250);
  assert.equal(INSTRUMENTS.find(i => i.id === 'drum').cost, 0);
  assert.equal(CONCERT_DECOR.filter(d => d.kind === 'indoor').length, 3);
  assert.equal(CONCERT_DECOR.filter(d => d.kind === 'outdoor').length, 3);
});

test('default state owns only the drum', () => {
  const s = concertDefault();
  assert.deepEqual(s.owned, ['drum']);
  assert.equal(s.equipped, 'drum');
  assert.equal(s.notes, 0);
  assert.deepEqual(Object.keys(s.best), [...SONG_IDS]);
});

test('restore repairs broken saves', () => {
  assert.deepEqual(restoreConcert(null), concertDefault());
  const s = restoreConcert({ notes: -4, owned: ['guitar', 'laser', 'guitar'], equipped: 'laser', best: { morning: 7, march: 'x' }, day: 5, paid: 99, tutorial: 1 });
  assert.equal(s.notes, 0);
  assert.deepEqual(s.owned, ['drum', 'guitar']);
  assert.equal(s.equipped, 'drum');
  assert.equal(s.best.morning, 1);
  assert.equal(s.best.march, 0);
  assert.equal(s.day, '');
  assert.equal(s.paid, PAID_PLAYS);
  assert.equal(s.tutorial, false);
});

test('stars follow the cut lines and the hard song has a lower third cut', () => {
  assert.equal(starsFor('morning', 0.29), 0);
  assert.equal(starsFor('morning', 0.3), 1);
  assert.equal(starsFor('morning', 0.6), 2);
  assert.equal(starsFor('morning', 0.84), 2);
  assert.equal(starsFor('morning', 0.85), 3);
  assert.equal(starsFor('waltz', 0.8), 3);
  assert.equal(notesFor(0), 1);
  assert.equal(notesFor(3), 4);
});

test('only the first three shows of a day pay notes', () => {
  let s = concertDefault();
  for (let i = 0; i < 3; i++) {
    const r = settle(s, { songId: 'morning', ratio: 0.9, today: DAY });
    assert.equal(r.earned, 4);
    assert.equal(r.left, 2 - i);
    s = r.state;
  }
  assert.equal(s.notes, 12);
  const fourth = settle(s, { songId: 'morning', ratio: 0.9, today: DAY });
  assert.equal(fourth.earned, 0);
  assert.equal(fourth.state.notes, 12);
  assert.equal(paidLeft(fourth.state, DAY), 0);
  assert.equal(paidLeft(fourth.state, NEXT), 3);
  assert.equal(settle(fourth.state, { songId: 'morning', ratio: 0.1, today: NEXT }).earned, 1);
});

test('best keeps the highest ratio per song and settle does not mutate', () => {
  const s0 = concertDefault();
  const a = settle(s0, { songId: 'march', ratio: 0.5, today: DAY });
  assert.equal(a.bestUp, true);
  const b = settle(a.state, { songId: 'march', ratio: 0.4, today: DAY });
  assert.equal(b.bestUp, false);
  assert.equal(b.state.best.march, 0.5);
  assert.equal(s0.notes, 0);
  assert.equal(s0.best.march, 0);
});

test('buyPlan refuses in a fixed order: no art, owned, guest, short', () => {
  const item = { id: 'guitar', cost: 40 };
  const rich = { ...concertDefault(), notes: 40 };
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: true, hasArt: false }), { ok: false, reason: 'soon' });
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: true, hasArt: true }), { ok: false, reason: 'owned' });
  assert.deepEqual(buyPlan(rich, item, { isGuest: true, owned: false, hasArt: true }), { ok: false, reason: 'guest' });
  assert.deepEqual(buyPlan({ ...rich, notes: 31 }, item, { isGuest: false, owned: false, hasArt: true }), { ok: false, reason: 'short', lack: 9 });
  assert.deepEqual(buyPlan(rich, item, { isGuest: false, owned: false, hasArt: true }), { ok: true });
});

test('spend, addInstrument, equip and markTutorial return new states', () => {
  const s = { ...concertDefault(), notes: 40 };
  const t = addInstrument(spend(s, 40), 'guitar');
  assert.equal(t.notes, 0);
  assert.deepEqual(t.owned, ['drum', 'guitar']);
  assert.equal(equip(t, 'guitar').equipped, 'guitar');
  assert.equal(equip(t, 'bass'), t);
  assert.equal(equip(t, 'drum'), t);
  assert.equal(addInstrument(t, 'guitar'), t);
  assert.equal(markTutorial(t).tutorial, true);
  assert.equal(s.notes, 40);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/concert-rules.test.mjs`
Expected: FAIL, `Cannot find module '../js/data/concert.js'`

- [ ] **Step 4: 데이터 파일 작성 (`js/data/concert.js`)**

```js
export const SONG_IDS = Object.freeze(['morning', 'march', 'waltz']);
export const BASE_INSTRUMENT = 'drum';

export const INSTRUMENTS = Object.freeze([
  Object.freeze({ id: 'drum', cost: 0 }),
  Object.freeze({ id: 'maracas', cost: 20 }),
  Object.freeze({ id: 'bells', cost: 25 }),
  Object.freeze({ id: 'bass', cost: 35 }),
  Object.freeze({ id: 'guitar', cost: 40 }),
]);

export const CONCERT_DECOR = Object.freeze([
  Object.freeze({ id: 'musicstand', kind: 'indoor', cost: 10 }),
  Object.freeze({ id: 'metronome', kind: 'indoor', cost: 15 }),
  Object.freeze({ id: 'musicbox', kind: 'indoor', cost: 20 }),
  Object.freeze({ id: 'noteflags', kind: 'outdoor', cost: 25 }),
  Object.freeze({ id: 'hornpost', kind: 'outdoor', cost: 30 }),
  Object.freeze({ id: 'reedorgan', kind: 'outdoor', cost: 30 }),
]);
export const CONCERT_DECOR_IDS = Object.freeze(CONCERT_DECOR.map(d => d.id));

export const PAID_PLAYS = 3;
export const STAR_CUTS = Object.freeze({
  morning: Object.freeze([0.3, 0.6, 0.85]),
  march: Object.freeze([0.3, 0.6, 0.85]),
  waltz: Object.freeze([0.3, 0.6, 0.8]),
});
export const JUDGE_MS = Object.freeze({ perfect: 70, good: 140 });
export const OUTPUT_LAG_MS = 30;

export const STAGE_POS = Object.freeze({ x: 6.5, z: 10.5 });
export const SPOT_R = 2.4;
```

- [ ] **Step 5: 규칙 파일 작성 (`js/concert/rules.js`)**

```js
import { BASE_INSTRUMENT, INSTRUMENTS, SONG_IDS, PAID_PLAYS, STAR_CUTS } from '../data/concert.js';

const INSTRUMENT_IDS = INSTRUMENTS.map(i => i.id);
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const unit = (v) => Math.min(1, Math.max(0, Number(v) || 0));

export function concertDefault() {
  return {
    notes: 0,
    owned: [BASE_INSTRUMENT],
    equipped: BASE_INSTRUMENT,
    best: Object.fromEntries(SONG_IDS.map(id => [id, 0])),
    day: '',
    paid: 0,
    tutorial: false,
  };
}

export function restoreConcert(saved) {
  if (!saved || typeof saved !== 'object') return concertDefault();
  const listed = Array.isArray(saved.owned) ? saved.owned : [];
  const owned = [...new Set([BASE_INSTRUMENT, ...listed])].filter(id => INSTRUMENT_IDS.includes(id));
  return {
    notes: count(saved.notes),
    owned,
    equipped: owned.includes(saved.equipped) ? saved.equipped : BASE_INSTRUMENT,
    best: Object.fromEntries(SONG_IDS.map(id => [id, unit(saved.best?.[id])])),
    day: typeof saved.day === 'string' ? saved.day : '',
    paid: Math.min(PAID_PLAYS, count(saved.paid)),
    tutorial: saved.tutorial === true,
  };
}

export const starsFor = (songId, ratio) => (STAR_CUTS[songId] || STAR_CUTS.morning).filter(cut => ratio >= cut).length;
export const notesFor = (stars) => 1 + stars;
export const paidLeft = (state, today) => (state.day === today ? Math.max(0, PAID_PLAYS - state.paid) : PAID_PLAYS);

export function settle(state, { songId, ratio, today }) {
  const stars = starsFor(songId, ratio);
  const left = paidLeft(state, today);
  const pays = left > 0;
  const earned = pays ? notesFor(stars) : 0;
  const paidToday = state.day === today ? state.paid : 0;
  const bestUp = ratio > (state.best[songId] || 0);
  return {
    state: {
      ...state,
      notes: state.notes + earned,
      day: today,
      paid: paidToday + (pays ? 1 : 0),
      best: bestUp ? { ...state.best, [songId]: ratio } : state.best,
    },
    stars,
    earned,
    bestUp,
    left: Math.max(0, left - 1),
  };
}

export function buyPlan(state, item, { isGuest, owned, hasArt }) {
  if (!hasArt) return { ok: false, reason: 'soon' };
  if (owned) return { ok: false, reason: 'owned' };
  if (isGuest) return { ok: false, reason: 'guest' };
  if (state.notes < item.cost) return { ok: false, reason: 'short', lack: item.cost - state.notes };
  return { ok: true };
}

export const spend = (state, cost) => ({ ...state, notes: state.notes - cost });
export const addInstrument = (state, id) => (state.owned.includes(id) ? state : { ...state, owned: [...state.owned, id] });
export const equip = (state, id) => (state.owned.includes(id) && state.equipped !== id ? { ...state, equipped: id } : state);
export const markTutorial = (state) => (state.tutorial ? state : { ...state, tutorial: true });
```

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/concert-rules.test.mjs`
Expected: PASS, 8 tests

- [ ] **Step 7: 커밋**

```bash
git add .gitignore js/data/concert.js js/concert/rules.js tests/concert-rules.test.mjs
git commit -m "feat(concert): add data table and save state rules"
```

---

### Task 2: 판정과 난이도 자동 조절

**Files:**
- Create: `js/concert/judge.js`
- Modify: `js/tuning.js:155` 근처(`DIFFICULTY` 표 끝), `js/difficulty.js:91` 근처(`ddaOutcome`)
- Test: `tests/concert-judge.test.mjs`, `tests/concert-difficulty.test.mjs`

**Interfaces:**
- Consumes: `JUDGE_MS`
- Produces (`js/concert/judge.js`):
  - `windowsFor(ease = 1, minGapMs = Infinity) → {perfect, good}` (ms)
  - `makeJudge(chart: {t:number, lane:0|1}[], win) → { tap(lane, tMs) → {index, kind:'perfect'|'good', offset} | null, sweep(tMs) → number[], summary() → {perfect, good, miss, score, max, ratio, maxCombo}, done() → boolean }`
- Produces (기존 모듈): `DIFFICULTY.concert`, `ddaOutcome('concert', {abandoned, ratio})`

- [ ] **Step 1: 실패하는 판정 테스트 작성 (`tests/concert-judge.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowsFor, makeJudge } from '../js/concert/judge.js';

const chart = [{ t: 1000, lane: 0 }, { t: 1500, lane: 1 }, { t: 2000, lane: 0 }, { t: 2000, lane: 1 }];
const win = windowsFor(1, 1000);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('base windows are 70 and 140 ms', () => {
  assert.deepEqual(windowsFor(), { perfect: 70, good: 140 });
});

test('ease scales both windows', () => {
  const easy = windowsFor(1.2, 10000), hard = windowsFor(0.85, 10000);
  close(easy.perfect, 84);
  close(easy.good, 168);
  close(hard.perfect, 59.5);
  close(hard.good, 119);
});

test('good window never exceeds 45% of the smallest same-lane gap', () => {
  const w = windowsFor(1.8, 455);
  close(w.good, 455 * 0.45);
  assert.ok(w.perfect <= w.good / 2);
});

test('window edges: 70 is perfect, 71 is good, 140 is good, 141 is ignored', () => {
  const at = (off) => makeJudge(chart, win).tap(0, 1000 + off);
  assert.equal(at(70).kind, 'perfect');
  assert.equal(at(-70).kind, 'perfect');
  assert.equal(at(71).kind, 'good');
  assert.equal(at(140).kind, 'good');
  assert.equal(at(141), null);
  assert.equal(at(-141), null);
});

test('a tap in the wrong lane is ignored and costs nothing', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(1, 1000), null);
  assert.equal(j.tap(0, 1000).kind, 'perfect');
});

test('one tap judges one note, a second tap on the same note is ignored', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(0, 1010).index, 0);
  assert.equal(j.tap(0, 1020), null);
});

test('simultaneous notes need one tap per lane', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(0, 2000).index, 2);
  assert.equal(j.tap(1, 2000).index, 3);
});

test('sweep marks late notes as missed, once', () => {
  const j = makeJudge(chart, win);
  assert.deepEqual(j.sweep(1140), []);
  assert.deepEqual(j.sweep(1141), [0]);
  assert.deepEqual(j.sweep(1700), [1]);
  assert.deepEqual(j.sweep(1700), []);
  assert.equal(j.done(), false);
  assert.deepEqual(j.sweep(9999), [2, 3]);
  assert.equal(j.done(), true);
});

test('summary counts score, ratio and the longest combo', () => {
  const j = makeJudge(chart, win);
  j.tap(0, 1000);
  j.tap(1, 1600);
  j.sweep(9999);
  const s = j.summary();
  assert.deepEqual({ perfect: s.perfect, good: s.good, miss: s.miss }, { perfect: 1, good: 1, miss: 2 });
  assert.equal(s.score, 3);
  assert.equal(s.max, 8);
  assert.equal(s.ratio, 3 / 8);
  assert.equal(s.maxCombo, 2);
});

test('an empty chart is done and has ratio 0', () => {
  const j = makeJudge([], win);
  assert.equal(j.done(), true);
  assert.equal(j.summary().ratio, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/concert-judge.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/judge.js'`

- [ ] **Step 3: 판정 구현 (`js/concert/judge.js`)**

```js
import { JUDGE_MS } from '../data/concert.js';

const GAP_CAP = 0.45;

export function windowsFor(ease = 1, minGapMs = Infinity) {
  const good = Math.min(JUDGE_MS.good * ease, minGapMs * GAP_CAP);
  return { perfect: Math.min(JUDGE_MS.perfect * ease, good / 2), good };
}

export function makeJudge(chart, win) {
  const marks = chart.map(() => null);
  let cursor = 0;
  let combo = 0;
  let maxCombo = 0;

  const mark = (i, kind) => {
    marks[i] = kind;
    combo = kind === 'miss' ? 0 : combo + 1;
    maxCombo = Math.max(maxCombo, combo);
  };

  const tap = (lane, tMs) => {
    let best = -1;
    let bestOff = Infinity;
    for (let i = cursor; i < chart.length && chart[i].t - tMs <= win.good; i++) {
      if (marks[i] || chart[i].lane !== lane) continue;
      const off = Math.abs(chart[i].t - tMs);
      if (off <= win.good && off < bestOff) { best = i; bestOff = off; }
    }
    if (best < 0) return null;
    const kind = bestOff <= win.perfect ? 'perfect' : 'good';
    mark(best, kind);
    return { index: best, kind, offset: tMs - chart[best].t };
  };

  const sweep = (tMs) => {
    const missed = [];
    while (cursor < chart.length && (marks[cursor] || tMs - chart[cursor].t > win.good)) {
      if (!marks[cursor]) { mark(cursor, 'miss'); missed.push(cursor); }
      cursor += 1;
    }
    return missed;
  };

  const summary = () => {
    const n = { perfect: 0, good: 0, miss: 0 };
    for (const k of marks) if (k) n[k] += 1;
    const score = n.perfect * 2 + n.good;
    const max = chart.length * 2;
    return { ...n, score, max, ratio: max ? score / max : 0, maxCombo };
  };

  return { tap, sweep, summary, done: () => cursor >= chart.length };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/concert-judge.test.mjs`
Expected: PASS, 10 tests

- [ ] **Step 5: 실패하는 난이도 테스트 작성 (`tests/concert-difficulty.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, DIFF_K } from '../js/tuning.js';
import { easeFor, nextDda, ddaOutcome, defaultDifficulty, mergeDifficulty } from '../js/difficulty.js';

test('concert has a probe table with three arms and DDA on', () => {
  assert.deepEqual(DIFFICULTY.concert.arms, [0.85, 1.0, 1.2]);
  assert.equal(DIFFICULTY.concert.target, 0.75);
  assert.equal(DIFFICULTY.concert.ddaOn, true);
});

test('new and old saves both get a concert slot', () => {
  assert.deepEqual(defaultDifficulty().concert, { dda: 1, n: 0 });
  assert.deepEqual(mergeDifficulty({ fish: { dda: 1.2, n: 3 } }).concert, { dda: 1, n: 0 });
});

test('ease is dda times one of the arms, each arm once per block', () => {
  const seen = [0, 1, 2].map(n => easeFor('concert', 'device-a', n, 1).ease).sort((a, b) => a - b);
  assert.deepEqual(seen, [0.85, 1, 1.2]);
});

test('outcome is the ratio, and an abandoned show gives null', () => {
  assert.equal(ddaOutcome('concert', { ratio: 0.62 }), 0.62);
  assert.equal(ddaOutcome('concert', { ratio: 7 }), 1);
  assert.equal(ddaOutcome('concert', { ratio: -1 }), 0);
  assert.equal(ddaOutcome('concert', { abandoned: true, ratio: 0.9 }), null);
});

test('a weak show makes the next one easier, a strong one harder', () => {
  assert.ok(Math.abs(nextDda('concert', 1, 0.25) - (1 + DIFF_K * 0.5)) < 1e-9);
  assert.ok(nextDda('concert', 1, 1) < 1);
});
```

- [ ] **Step 6: 실패 확인**

Run: `node --test tests/concert-difficulty.test.mjs`
Expected: FAIL, `Cannot read properties of undefined (reading 'arms')`

- [ ] **Step 7: 난이도 표에 `concert` 추가 (`js/tuning.js`)**

`DIFFICULTY` 객체의 `dive:` 줄 아래에 한 줄을 넣는다.

```js
  concert: { arms: [0.85, 1.0, 1.2], target: 0.75, ddaOn: true },
```

- [ ] **Step 8: 결과 값 분기 추가 (`js/difficulty.js`)**

`ddaOutcome`의 `mudflat` 줄 아래, `return null;` 위에 한 줄을 넣는다.

```js
  if (game === 'concert') return res.abandoned ? null : Math.max(0, Math.min(1, Number(res.ratio) || 0));
```

- [ ] **Step 9: 통과와 기존 난이도 테스트 확인**

Run: `node --test tests/concert-difficulty.test.mjs tests/difficulty.test.mjs tests/mountain-difficulty.test.mjs tests/forage-difficulty.test.mjs`
Expected: 전부 PASS. 기존 테스트가 게임 목록이나 개수를 고정해 실패하면 그 기대값에 `concert`를 더한다.

- [ ] **Step 10: 커밋**

```bash
git add js/concert/judge.js js/tuning.js js/difficulty.js tests/concert-judge.test.mjs tests/concert-difficulty.test.mjs
git commit -m "feat(concert): add judging and hook into the difficulty module"
```

---

### Task 3: 곡 악보와 반주 이벤트

**Files:**
- Create: `js/concert/songs.js`
- Test: `tests/concert-songs.test.mjs`

**Interfaces:**
- Consumes: `SONG_IDS`, `JUDGE_MS`
- Produces (`js/concert/songs.js`):
  - `SONGS: Record<id, {id, bpm, slots, chords: string[], bars: string[]}>`. `slots`는 마디당 8분음표 칸 수(4/4는 8, 3/4는 6). 마디 문자열은 칸마다 `L`, `R`, `B`(둘 다), `.` 중 하나
  - `slotMs(song) → number`
  - `chartOf(id) → {t, lane}[]` (시간순, 카운트인 한 마디 뒤부터)
  - `lengthMs(id) → number` (카운트인 + 마디 + 끝 여운 한 마디)
  - `minGapMs(chart) → number` (같은 줄 최소 간격)
  - `backingEvents(id) → {t, kind:'tick'|'bass'|'chord'|'lead', midi?, midis?}[]` (시간순)
  - `practiceChart() → {t, lane}[]`, `practiceEvents()`, `PRACTICE_LENGTH_MS`

- [ ] **Step 1: 실패하는 테스트 작성 (`tests/concert-songs.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONG_IDS, JUDGE_MS } from '../js/data/concert.js';
import { SONGS, slotMs, chartOf, lengthMs, minGapMs, backingEvents, practiceChart, practiceEvents, PRACTICE_LENGTH_MS } from '../js/concert/songs.js';

const sorted = (list) => list.every((e, i) => i === 0 || list[i - 1].t <= e.t);

test('every song id has a song with full bars', () => {
  for (const id of SONG_IDS) {
    const s = SONGS[id];
    assert.equal(s.id, id);
    for (const bar of s.bars) {
      assert.equal(bar.length, s.slots, `${id} ${bar}`);
      assert.match(bar, /^[LRB.]+$/);
    }
  }
});

test('charts are time ordered and start after the count-in bar', () => {
  for (const id of SONG_IDS) {
    const chart = chartOf(id);
    assert.ok(sorted(chart), id);
    assert.ok(chart[0].t >= SONGS[id].slots * slotMs(SONGS[id]) - 1, id);
    assert.ok(chart.at(-1).t < lengthMs(id), id);
  }
});

test('note counts and lengths sit in the planned ranges', () => {
  const n = (id) => chartOf(id).length;
  assert.ok(n('morning') >= 60 && n('morning') <= 80, `morning ${n('morning')}`);
  assert.ok(n('march') >= 100 && n('march') <= 125, `march ${n('march')}`);
  assert.ok(n('waltz') >= 140 && n('waltz') <= 170, `waltz ${n('waltz')}`);
  for (const id of SONG_IDS) assert.ok(lengthMs(id) >= 55000 && lengthMs(id) <= 75000, `${id} ${lengthMs(id)}`);
});

test('same-lane notes are wider apart than two good windows', () => {
  for (const id of SONG_IDS) assert.ok(minGapMs(chartOf(id)) > JUDGE_MS.good * 2, `${id} ${minGapMs(chartOf(id))}`);
});

test('the easy song strictly alternates lanes and has no double notes', () => {
  const chart = chartOf('morning');
  assert.ok(SONGS.morning.bars.every(b => !b.includes('B')));
  assert.ok(chart.every((e, i) => i === 0 || e.lane !== chart[i - 1].lane));
});

test('double notes belong to the hard song, apart from the march closing accent', () => {
  assert.ok(SONGS.march.bars.slice(0, -1).every(b => !b.includes('B')));
  assert.ok(SONGS.waltz.bars.some(b => b.includes('B')));
});

test('backing events are ordered, tick through the count-in, and lead on every chart time', () => {
  for (const id of SONG_IDS) {
    const ev = backingEvents(id);
    assert.ok(sorted(ev), id);
    const bar = SONGS[id].slots * slotMs(SONGS[id]);
    assert.ok(ev.filter(e => e.t < bar - 1).every(e => e.kind === 'tick'), id);
    const leads = new Set(ev.filter(e => e.kind === 'lead').map(e => e.t));
    for (const note of chartOf(id)) assert.ok(leads.has(note.t), `${id} ${note.t}`);
  }
});

test('practice is four alternating notes with ticks only', () => {
  const chart = practiceChart();
  assert.deepEqual(chart.map(e => e.lane), [0, 1, 0, 1]);
  assert.ok(practiceEvents().every(e => e.kind === 'tick'));
  assert.ok(chart.at(-1).t < PRACTICE_LENGTH_MS);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/concert-songs.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/songs.js'`

- [ ] **Step 3: 구현 (`js/concert/songs.js`)**

```js
const CHORDS = Object.freeze({
  C: [48, 52, 55], G: [43, 47, 50], Am: [45, 48, 52], F: [41, 45, 48], D: [50, 54, 57], Em: [40, 43, 47],
});

const join = (...parts) => Object.freeze(parts.flat());

const MORNING_A = ['L...R...', 'L...R...', 'L.R.L.R.', 'L...R...'];
const MORNING_B = ['L.R.L.R.', 'L...R...', 'L.R.L.R.', 'L.R.L.R.'];
const MARCH_P = ['L.R.L.R.', 'L.L.R.R.', 'L.R.L.R.', 'LRL.R.R.'];
const MARCH_Q = ['L.LRL.R.', 'R.RLR.L.', 'L.R.LRL.', 'R.L.R.L.'];
const WALTZ_S = ['L.R.R.', 'R.L.L.', 'L.R...', 'B.L.R.'];
const WALTZ_U = ['L.RLR.', 'R.L.L.', 'B.R.L.', 'L.RLR.'];

export const SONGS = Object.freeze({
  morning: Object.freeze({
    id: 'morning', bpm: 92, slots: 8, chords: ['C', 'G', 'Am', 'F'],
    bars: join(MORNING_A, MORNING_A, MORNING_B, MORNING_A, MORNING_B, ['L.R.L.R.', 'L...R...', 'L.......']),
  }),
  march: Object.freeze({
    id: 'march', bpm: 112, slots: 8, chords: ['G', 'D', 'Em', 'C'],
    bars: join(MARCH_P, MARCH_Q, MARCH_P, MARCH_Q, MARCH_P, MARCH_Q, ['L.R.L.R.', 'B.......']),
  }),
  waltz: Object.freeze({
    id: 'waltz', bpm: 132, slots: 6, chords: ['Am', 'F', 'C', 'G'],
    bars: join(WALTZ_S, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_U, ['B.....']),
  }),
});

const COUNT_IN = 1;
const TAIL = 1;

export const slotMs = (song) => 30000 / song.bpm;
const at = (song, bar, slot) => Math.round((bar * song.slots + slot) * slotMs(song));

export function chartOf(id) {
  const song = SONGS[id];
  const out = [];
  song.bars.forEach((bar, bi) => [...bar].forEach((ch, si) => {
    const t = at(song, bi + COUNT_IN, si);
    if (ch === 'L' || ch === 'B') out.push({ t, lane: 0 });
    if (ch === 'R' || ch === 'B') out.push({ t, lane: 1 });
  }));
  return out;
}

export const lengthMs = (id) => at(SONGS[id], SONGS[id].bars.length + COUNT_IN + TAIL, 0);

export function minGapMs(chart) {
  const last = [-Infinity, -Infinity];
  let gap = Infinity;
  for (const note of chart) {
    gap = Math.min(gap, note.t - last[note.lane]);
    last[note.lane] = note.t;
  }
  return gap;
}

const beatSlots = (song) => Array.from({ length: song.slots / 2 }, (_, i) => i * 2);

export function backingEvents(id) {
  const song = SONGS[id];
  const out = beatSlots(song).map(slot => ({ t: at(song, 0, slot), kind: 'tick' }));
  song.bars.forEach((bar, bi) => {
    const tones = CHORDS[song.chords[bi % song.chords.length]];
    const b = bi + COUNT_IN;
    out.push({ t: at(song, b, 0), kind: 'bass', midi: tones[0] - 12 });
    if (song.slots === 8) out.push({ t: at(song, b, 4), kind: 'bass', midi: tones[2] - 12 });
    for (const slot of beatSlots(song).slice(1)) {
      if (song.slots === 8 && slot === 4) continue;
      out.push({ t: at(song, b, slot), kind: 'chord', midis: tones });
    }
    [...bar].forEach((ch, si) => {
      if (ch !== '.') out.push({ t: at(song, b, si), kind: 'lead', midi: tones[(bi + si) % 3] + 24 });
    });
  });
  return out.sort((a, b) => a.t - b.t);
}

const PRACTICE_BEAT = 650;
export const PRACTICE_LENGTH_MS = PRACTICE_BEAT * 10;
export const practiceChart = () => [0, 1, 0, 1].map((lane, i) => ({ t: PRACTICE_BEAT * (4 + i), lane }));
export const practiceEvents = () => Array.from({ length: 8 }, (_, i) => ({ t: PRACTICE_BEAT * i, kind: 'tick' }));
```

음표 수 확인: 숲의 아침 = A 10개 × 3 + B 14개 × 2 + 끝 7개 = 65. 장터 행진 = P 17개 × 3 + Q 19개 × 3 + 끝 6개 = 114. 별빛 왈츠 = S 12개 × 6 + U 15개 × 6 + 끝 2개 = 164. 같은 줄 최소 간격은 세 곡 모두 두 칸이다(숲의 아침은 네 칸): 장터 행진 536ms, 별빛 왈츠 455ms.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/concert-songs.test.mjs`
Expected: PASS, 8 tests. 같은 줄 간격 테스트가 실패하면 실패 메시지의 곡에서 마디 경계를 넘는 같은 줄 음표가 한 칸 간격인 곳을 찾아 그 마디만 고친다.

- [ ] **Step 5: 커밋**

```bash
git add js/concert/songs.js tests/concert-songs.test.mjs
git commit -m "feat(concert): add three song charts and backing events"
```

---

### Task 4: 소리 (사용자 게이트: 곡 듣기)

**Files:**
- Create: `js/concert/audio.js`
- Modify: `js/sound.js:38` 근처(`toggleSound` 위)
- Test: `tests/concert-audio.test.mjs`
- 시안(커밋 안 함): `sims/concert-listen.html`

**Interfaces:**
- Consumes: `OUTPUT_LAG_MS`, Task 3의 이벤트 모양
- Produces (`js/sound.js`): `audioBus() → {ctx: AudioContext, out: AudioNode, on: boolean}`
- Produces (`js/concert/audio.js`):
  - `createConcertAudio({ctx, out, on = true, voices = VOICES, hits = HITS}) → { start(events, leadInSec = 0.3), stop(), pump(), nowMs() → number, hit(instrumentId, lane) }`
  - `nowMs()`는 `(ctx.currentTime - t0) * 1000 - OUTPUT_LAG_MS`
  - `VOICES`, `HITS: Record<instrumentId, [(ctx, out, at) => void, (ctx, out, at) => void]>` (왼쪽 줄, 오른쪽 줄)

- [ ] **Step 1: `sound.js`에 버스 내보내기 추가**

`export function toggleSound(on) {` 줄 바로 위에 넣는다.

```js
export function audioBus() {
  return { ctx: ensureCtx(), out: master, on: enabled };
}
```

- [ ] **Step 2: 실패하는 테스트 작성 (`tests/concert-audio.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUTPUT_LAG_MS } from '../js/data/concert.js';
import { createConcertAudio, HITS } from '../js/concert/audio.js';

const fake = () => {
  const played = [];
  const ctx = { currentTime: 10 };
  const voices = { tick: (c, o, e) => played.push(['tick', e.at]), bass: (c, o, e) => played.push(['bass', e.at]) };
  return { ctx, played, voices };
};

test('nowMs counts from the lead-in and subtracts the output lag', () => {
  const { ctx, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, voices });
  audio.start([], 0.3);
  assert.ok(Math.abs(audio.nowMs() - (-300 - OUTPUT_LAG_MS)) < 1e-6);
  ctx.currentTime = 11.3;
  assert.ok(Math.abs(audio.nowMs() - (1000 - OUTPUT_LAG_MS)) < 1e-6);
  audio.stop();
});

test('only events inside the look-ahead are scheduled, each once', () => {
  const { ctx, played, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, voices });
  audio.start([{ t: 0, kind: 'tick' }, { t: 100, kind: 'bass' }, { t: 5000, kind: 'tick' }], 0);
  assert.deepEqual(played.map(p => p[0]), ['tick', 'bass']);
  assert.ok(Math.abs(played[1][1] - 10.1) < 1e-9);
  audio.pump();
  assert.equal(played.length, 2);
  ctx.currentTime = 14.9;
  audio.pump();
  assert.equal(played.length, 3);
  assert.ok(Math.abs(played[2][1] - 15) < 1e-9);
  audio.stop();
});

test('sound off schedules nothing but the clock still runs', () => {
  const { ctx, played, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, on: false, voices });
  audio.start([{ t: 0, kind: 'tick' }], 0);
  ctx.currentTime = 10.5;
  assert.equal(played.length, 0);
  assert.ok(audio.nowMs() > 400);
  audio.stop();
});

test('every instrument has a left and a right hit sound', () => {
  for (const id of ['drum', 'maracas', 'bells', 'bass', 'guitar']) {
    assert.equal(HITS[id].length, 2, id);
    assert.equal(typeof HITS[id][0], 'function');
    assert.equal(typeof HITS[id][1], 'function');
  }
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/concert-audio.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/audio.js'`

- [ ] **Step 4: 구현 (`js/concert/audio.js`)**

```js
import { OUTPUT_LAG_MS } from '../data/concert.js';

const LOOK_AHEAD = 0.15;
const PUMP_MS = 40;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function tone(ctx, out, { at, freq, dur, vol, type = 'triangle', slide = 1 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function noise(ctx, out, { at, dur, vol, band }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = band;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export const VOICES = {
  tick: (ctx, out, e) => noise(ctx, out, { at: e.at, dur: 0.04, vol: 0.12, band: 3200 }),
  bass: (ctx, out, e) => tone(ctx, out, { at: e.at, freq: hz(e.midi), dur: 0.42, vol: 0.2, type: 'sine' }),
  chord: (ctx, out, e) => e.midis.forEach(m => tone(ctx, out, { at: e.at, freq: hz(m + 12), dur: 0.24, vol: 0.045 })),
  lead: (ctx, out, e) => tone(ctx, out, { at: e.at, freq: hz(e.midi), dur: 0.26, vol: 0.06, type: 'sine' }),
};

const strum = (root) => (ctx, out, at) => [0, 4, 7, 12].forEach((s, i) => tone(ctx, out, { at: at + i * 0.012, freq: hz(root + s), dur: 0.5, vol: 0.07 }));
const bell = (midi) => (ctx, out, at) => {
  tone(ctx, out, { at, freq: hz(midi), dur: 0.9, vol: 0.12, type: 'sine' });
  tone(ctx, out, { at, freq: hz(midi) * 2.76, dur: 0.4, vol: 0.03, type: 'sine' });
};

export const HITS = {
  drum: [
    (ctx, out, at) => tone(ctx, out, { at, freq: 150, dur: 0.16, vol: 0.34, type: 'sine', slide: 0.5 }),
    (ctx, out, at) => { noise(ctx, out, { at, dur: 0.09, vol: 0.26, band: 1900 }); tone(ctx, out, { at, freq: 240, dur: 0.07, vol: 0.14 }); },
  ],
  bass: [
    (ctx, out, at) => tone(ctx, out, { at, freq: 78, dur: 0.34, vol: 0.5, type: 'sine', slide: 0.55 }),
    (ctx, out, at) => tone(ctx, out, { at, freq: 96, dur: 0.3, vol: 0.46, type: 'sine', slide: 0.55 }),
  ],
  guitar: [strum(55), strum(60)],
  bells: [bell(84), bell(88)],
  maracas: [
    (ctx, out, at) => noise(ctx, out, { at, dur: 0.07, vol: 0.3, band: 6200 }),
    (ctx, out, at) => noise(ctx, out, { at, dur: 0.07, vol: 0.3, band: 7600 }),
  ],
};

export function createConcertAudio({ ctx, out, on = true, voices = VOICES, hits = HITS }) {
  let t0 = 0;
  let queue = [];
  let next = 0;
  let timer = null;

  const pump = () => {
    const until = ctx.currentTime + LOOK_AHEAD;
    while (next < queue.length && t0 + queue[next].t / 1000 <= until) {
      const e = queue[next];
      next += 1;
      if (on) voices[e.kind]?.(ctx, out, { ...e, at: Math.max(ctx.currentTime, t0 + e.t / 1000) });
    }
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    queue = [];
    next = 0;
  };

  return {
    start(events, leadInSec = 0.3) {
      stop();
      t0 = ctx.currentTime + leadInSec;
      queue = events;
      pump();
      timer = setInterval(pump, PUMP_MS);
    },
    stop,
    pump,
    nowMs: () => (ctx.currentTime - t0) * 1000 - OUTPUT_LAG_MS,
    hit(instrumentId, lane) {
      if (on) hits[instrumentId]?.[lane]?.(ctx, out, ctx.currentTime);
    },
  };
}
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/concert-audio.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 6: 곡 듣기 페이지 만들기 (`sims/concert-listen.html`, 커밋 안 함)**

한 페이지에 버튼을 둔다: 곡 3개 재생, 멈춤, 악기 5종 × 왼쪽·오른쪽 소리. 페이지는 `new AudioContext()`와 `createConcertAudio`, `backingEvents`, `chartOf`, `HITS`를 가져와 쓴다. 곡을 재생하면 악보 음표 시각에 고른 악기 소리를 자동으로 얹어 "완벽하게 쳤을 때"의 소리를 들려준다. 얹는 방법: `audio.start(events, 0.3)` 직후 `const t0 = ctx.currentTime + 0.3`을 기억하고 `chartOf(id)`의 각 음표에 `HITS[instrument][note.lane](ctx, ctx.destination, t0 + note.t / 1000)`을 부른다.

- [ ] **Step 7: 사용자에게 들려주고 확정받기 (게이트)**

`.claude/launch.json`(메인 폴더 `/Users/uicheol_hwang/calm_forest/.claude/launch.json`)에 이 워크트리 서버 설정을 추가한다: 이름 `concert`, 포트 8898, 실행 파일 `python3`, 인자 `["<워크트리 절대 경로>/scripts/serve.py", "8898"]`. 브라우저 창에 페이지를 띄운다. 묻는 것: 곡 3개의 빠르기와 분위기, 악기 소리 5종, 반주와 내 악기의 크기 균형. 고칠 값은 `VOICES`, `HITS`, `SONGS[id].bpm`, `SONGS[id].chords`다. 음표 수나 길이를 바꾸면 Task 3 테스트 범위도 같이 본다.

- [ ] **Step 8: 커밋**

```bash
git add js/sound.js js/concert/audio.js tests/concert-audio.test.mjs
git commit -m "feat(concert): schedule backing and instrument sounds on the audio clock"
```

---

### Task 5: 문구 검수 (사용자 게이트)

**Files:**
- Create: `js/concert/copy.js`
- Modify: `js/i18n-en.js`, `dev/active/concert/concert-context.md`("확정 문구" 절)
- Test: `tests/concert-copy.test.mjs`
- 시안(커밋 안 함): `sims/concert-copy.html`

**Interfaces:**
- Produces (`js/concert/copy.js`): `CONCERT_COPY` 객체. 키는 Step 4의 코드 그대로. `{0}`은 숫자 자리

- [ ] **Step 1: 후보 페이지 만들기 (`sims/concert-copy.html`)**

Step 4 코드의 값이 추천안(A)이다. 자리마다 후보 두 개(B, C)를 더 지어 세 개를 세로 폰 360px 폭과 가로 폰 740×360 틀에 넣어 보여 준다. 버튼 문구는 한 줄로 고정하고, 넘치면 빨간 테두리와 "넘침 N건"을 표시한다. 장터 때 쓴 넘침 검사 페이지(`/Users/uicheol_hwang/calm_forest/.claude/worktrees/weekly-market/sims/weekly-market-copy.html`)의 방식을 따른다.

- [ ] **Step 2: 사용자에게 보여 주고 확정받기 (게이트)**

넘침 0건을 확인한 캡처를 보낸다. 고른 값을 `dev/active/concert/concert-context.md`의 "확정 문구" 절에 적는다.

- [ ] **Step 3: 실패하는 테스트 작성 (`tests/concert-copy.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONG_IDS, INSTRUMENTS } from '../js/data/concert.js';
import { CONCERT_COPY } from '../js/concert/copy.js';

const flat = (o) => Object.values(o).flatMap(v => (typeof v === 'string' ? [v] : flat(v)));

test('every song and instrument has a name', () => {
  for (const id of SONG_IDS) { assert.ok(CONCERT_COPY.song[id]); assert.ok(CONCERT_COPY.level[id]); }
  for (const { id } of INSTRUMENTS) assert.ok(CONCERT_COPY.inst[id]);
});

test('copy avoids the em dash and the banned verb', () => {
  for (const line of flat(CONCERT_COPY)) {
    assert.ok(!line.includes('—'), line);
    assert.ok(!/놀[아았이며고]/.test(line), line);
  }
});

test('every Korean line has an English value', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const line of flat(CONCERT_COPY)) assert.ok(en.includes(line), line);
});
```

- [ ] **Step 4: `copy.js` 작성**

확정된 값으로 쓴다. 아래는 추천안이다.

```js
export const CONCERT_COPY = Object.freeze({
  prompt: '음악회 열기',
  title: '마을 음악회',
  sub: '오늘 공연 보상 {0}번 남았어요',
  subDone: '오늘 보상은 다 받았어요. 연습은 계속할 수 있어요',
  tabSongs: '곡', tabInst: '내 악기', tabShop: '음표 교환',
  song: Object.freeze({ morning: '숲의 아침', march: '장터 행진', waltz: '별빛 왈츠' }),
  level: Object.freeze({ morning: '쉬움', march: '보통', waltz: '어려움' }),
  play: '연주하기',
  inst: Object.freeze({ drum: '작은북', maracas: '마라카스', bells: '핸드벨', bass: '큰북', guitar: '통기타' }),
  equip: '이 악기로', equipped: '연주 중',
  buy: '음표 {0}개로 바꾸기',
  short: '음표가 {0}개 모자라요',
  owned: '보유 중',
  soon: '준비 중이에요',
  guest: '로그인하면 음표로 바꿀 수 있어요. 모은 음표는 그대로 남아요',
  guestBtn: '로그인 후 교환 가능',
  practice: '왼쪽 줄은 왼쪽을, 오른쪽 줄은 오른쪽을 눌러요',
  judge: Object.freeze({ perfect: '딱 맞아요', good: '좋아요', miss: '놓쳤어요' }),
  quit: '그만하기',
  resultTitle: '연주 끝',
  earned: '음표 {0}개를 받았어요',
  noPay: '오늘 보상은 다 받아서 음표는 없어요',
  best: '최고 기록이에요',
  again: '다시 하기', leave: '나가기',
  noteName: '음표',
});
```

- [ ] **Step 5: 영어 값 추가 (`js/i18n-en.js`)**

기존 사전 형식(`'한국어 원문': 'English',`)을 따라 `CONCERT_COPY`의 모든 줄을 넣는다. 주간 장터 항목 묶음 아래에 둔다. 이미 사전에 있는 줄(예: `'보유 중'`)은 다시 넣지 않는다. 예: `'음악회 열기': 'Open the concert',`, `'음표 {0}개로 바꾸기': 'Trade {0} notes',`.

- [ ] **Step 6: 통과 확인 후 커밋**

Run: `node --test tests/concert-copy.test.mjs`
Expected: PASS, 3 tests

```bash
git add js/concert/copy.js js/i18n-en.js tests/concert-copy.test.mjs dev/active/concert/concert-context.md
git commit -m "feat(concert): add approved copy"
```

---

### Task 6: 창과 두 줄 화면 (사용자 게이트)

**Files:**
- Create: `js/concert/views.js`, `js/concert/ui.js`, `js/concert/lanes.js`, `js/concert/style.js`
- Test: `tests/concert-views.test.mjs`
- 시안(커밋 안 함): `sims/concert-ui.html`

**Interfaces:**
- Consumes: 규칙 함수, `CONCERT_COPY`, `INSTRUMENTS`, `CONCERT_DECOR`, `SONG_IDS`
- Produces (`js/concert/views.js`, 순수):
  - `hallView(state, {today, isGuest, ownsDecor, hasArt, thumbs}) → { notes, sub, songs: {id, name, level, stars}[], instruments: {id, name, status:'equipped'|'owned'|'buy'|'short'|'guest', cost, lack}[], decor: {id, cost, status:'owned'|'buy'|'short'|'guest'|'soon', lack, thumb}[] }`
  - `resultView({stars, earned, bestUp, summary}) → { title, stars, lines: string[], perfect, good, miss }`
  - `LANE_COLORS: Record<instrumentId, [string, string]>`
  - `noteY(noteT, nowMs, leadMs, hitY) → number` (0은 줄 위쪽 끝, `hitY`는 판정선)
- Produces (`js/concert/ui.js`): `showHall({getState, env: () => hallView의 둘째 인자, onPlay(songId), onEquip(id), onBuy(item: {id, cost, type:'instrument'|'decor', kind?}) → {ok, reason?}, onLogin, onOpen})`, `showResult({view, onAgain, onLeave})`
- Produces (`js/concert/lanes.js`): `showLanes({chart, instrument, practice, onTap(lane), onQuit}) → { draw(nowMs), flash(lane, kind|null), miss(index), close() }`

`ui.js`, `lanes.js`, `style.js`는 모듈 최상위에서 `document`나 `window`를 만지지 않는다. `index.js`가 이 파일들을 import하고 node 테스트에서 돌기 때문이다. DOM 접근은 함수 안에서만 한다.

화면 구조(게이트에서 3안 중 고른다):
- 공연 화면 루트 요소의 id는 `concert-show-modal`이고 `show` 클래스를 붙인다. `ui.anyModalOpen()`이 이 요소를 잡아 이동과 상호작용을 막는다(구현 전에 `index.html`의 `anyModalOpen` 정의를 읽어 선택자가 맞는지 확인한다).
- 두 줄은 `<canvas>` 하나에 그린다. 세로 폰·PC는 화면 아래 3분의 1, 가로 폰(`innerWidth > innerHeight && innerHeight < 500`)은 양옆 세로 띠 두 개다.
- 음표는 판정선에 닿기 1.6초 전부터 보인다(`LEAD_MS = 1600`).
- 입력: `pointerdown`의 `clientX`가 화면 가운데보다 왼쪽이면 0번 줄, 오른쪽이면 1번 줄. `keydown`은 `KeyF`·`ArrowLeft` = 0, `KeyJ`·`ArrowRight` = 1, `repeat`는 무시한다. 그만하기 버튼 위의 입력은 줄 입력으로 치지 않는다.
- 소리가 꺼져 있어도 보이게, 박마다 가는 가로선을 음표와 같은 속도로 흘린다.
- 연습 중(`practice`)에는 화면 위쪽에 `CONCERT_COPY.practice`를 띄운다.

- [ ] **Step 1: 실패하는 표시 데이터 테스트 작성 (`tests/concert-views.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, CONCERT_DECOR } from '../js/data/concert.js';
import { concertDefault } from '../js/concert/rules.js';
import { hallView, resultView, LANE_COLORS, noteY } from '../js/concert/views.js';

const DAY = '2026-11-14';
const env = (over = {}) => ({ today: DAY, isGuest: false, ownsDecor: () => false, hasArt: () => true, thumbs: {}, ...over });

test('hall shows three songs with stars from the best ratio', () => {
  const v = hallView({ ...concertDefault(), best: { morning: 0.9, march: 0.61, waltz: 0 } }, env());
  assert.deepEqual(v.songs.map(s => s.stars), [3, 2, 0]);
  assert.equal(v.songs.length, 3);
});

test('instrument status covers equipped, owned, buy, short and guest', () => {
  const s = { ...concertDefault(), notes: 30, owned: ['drum', 'maracas'], equipped: 'maracas' };
  const by = (v) => Object.fromEntries(v.instruments.map(i => [i.id, i]));
  const a = by(hallView(s, env()));
  assert.equal(a.maracas.status, 'equipped');
  assert.equal(a.drum.status, 'owned');
  assert.equal(a.bells.status, 'buy');
  assert.equal(a.guitar.status, 'short');
  assert.equal(a.guitar.lack, 10);
  assert.equal(by(hallView(s, env({ isGuest: true }))).bells.status, 'guest');
  assert.equal(a.maracas.cost, INSTRUMENTS.find(i => i.id === 'maracas').cost);
});

test('decor status covers owned, soon, buy, short and guest', () => {
  const s = { ...concertDefault(), notes: 12 };
  const v = hallView(s, env({ ownsDecor: (id) => id === 'musicstand', hasArt: (id) => id !== 'reedorgan' }));
  const by = Object.fromEntries(v.decor.map(d => [d.id, d.status]));
  assert.equal(by.musicstand, 'owned');
  assert.equal(by.reedorgan, 'soon');
  assert.equal(by.metronome, 'short');
  assert.equal(v.decor.length, CONCERT_DECOR.length);
  const rich = hallView({ ...s, notes: 99 }, env());
  assert.ok(rich.decor.every(d => d.status === 'buy'));
});

test('the subtitle tells how many paid shows are left today', () => {
  assert.match(hallView(concertDefault(), env()).sub, /3/);
  assert.equal(hallView({ ...concertDefault(), day: DAY, paid: 3 }, env()).sub.includes('3'), false);
});

test('result lines mention earned notes, or that today is paid out', () => {
  const summary = { perfect: 5, good: 2, miss: 1 };
  const paid = resultView({ stars: 2, earned: 3, bestUp: true, summary });
  assert.ok(paid.lines.some(l => l.includes('3')));
  assert.equal(paid.lines.length, 2);
  const free = resultView({ stars: 2, earned: 0, bestUp: false, summary });
  assert.equal(free.lines.length, 1);
  assert.equal(free.perfect, 5);
});

test('every instrument has two lane colours', () => {
  for (const { id } of INSTRUMENTS) assert.equal(LANE_COLORS[id].length, 2, id);
});

test('a note reaches the hit line exactly at its time', () => {
  assert.equal(noteY(5000, 5000, 1600, 300), 300);
  assert.equal(noteY(5000, 3400, 1600, 300), 0);
  assert.equal(noteY(5000, 4200, 1600, 300), 150);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/concert-views.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/views.js'`

- [ ] **Step 3: 표시 데이터 구현 (`js/concert/views.js`)**

```js
import { INSTRUMENTS, CONCERT_DECOR, SONG_IDS } from '../data/concert.js';
import { CONCERT_COPY as C } from './copy.js';
import { starsFor, paidLeft, buyPlan } from './rules.js';

const fill = (line, n) => line.replace('{0}', n);

export const LANE_COLORS = Object.freeze({
  drum: ['#e9c48c', '#d9574a'],
  guitar: ['#f4dcaa', '#e2a55a'],
  bass: ['#6aa6d8', '#f2c14e'],
  bells: ['#6aa6d8', '#d9574a'],
  maracas: ['#5c9a68', '#d9574a'],
});

const shopStatus = (state, item, flags) => {
  const plan = buyPlan(state, item, flags);
  return plan.ok ? { status: 'buy', lack: 0 } : { status: plan.reason, lack: plan.lack || 0 };
};

export function hallView(state, { today, isGuest, ownsDecor, hasArt, thumbs }) {
  const left = paidLeft(state, today);
  return {
    notes: state.notes,
    sub: left > 0 ? fill(C.sub, left) : C.subDone,
    songs: SONG_IDS.map(id => ({ id, name: C.song[id], level: C.level[id], stars: starsFor(id, state.best[id] || 0) })),
    instruments: INSTRUMENTS.map(item => {
      const owned = state.owned.includes(item.id);
      const s = owned
        ? { status: state.equipped === item.id ? 'equipped' : 'owned', lack: 0 }
        : shopStatus(state, item, { isGuest, owned: false, hasArt: true });
      return { id: item.id, name: C.inst[item.id], cost: item.cost, ...s };
    }),
    decor: CONCERT_DECOR.map(item => ({
      id: item.id, cost: item.cost, thumb: thumbs[item.id] || null,
      ...shopStatus(state, item, { isGuest, owned: ownsDecor(item.id), hasArt: hasArt(item.id) }),
    })),
  };
}

export function resultView({ stars, earned, bestUp, summary }) {
  const lines = [earned > 0 ? fill(C.earned, earned) : C.noPay];
  if (bestUp) lines.push(C.best);
  return { title: C.resultTitle, stars, lines, perfect: summary.perfect, good: summary.good, miss: summary.miss };
}

export const noteY = (noteT, nowMs, leadMs, hitY) => hitY * (1 - (noteT - nowMs) / leadMs);
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/concert-views.test.mjs`
Expected: PASS, 7 tests

- [ ] **Step 5: 화면 시안 3안 만들기 (`sims/concert-ui.html`)**

곡 고르기 창, 교환 창, 두 줄 화면, 결과 창을 3안으로 만든다. 무대 사진 자리에는 `sims/concert-instrument-v2.html`의 캡처를 깐다. 세로 폰 360×740, 가로 폰 740×360, PC 1280×720 세 틀을 나란히 둔다. 음표가 실제로 흘러내리는 미리보기를 넣는다(`chartOf('morning')`와 `noteY`를 그대로 가져다 쓴다).

- A: 무대 막 느낌. 짙은 초록 바탕에 크림색 카드, 줄은 반투명 어두운 띠.
- B: 악보 종이 느낌. 크림 바탕에 오선 무늬, 음표는 둥근 음표 머리 모양.
- C: 등불 느낌. 밤 무대에 맞춘 남색 바탕, 음표가 작은 등불처럼 빛남.

- [ ] **Step 6: 사용자에게 보여 주고 확정받기 (게이트)**

세 틀을 한 장에 캡처해 보낸다. 고른 안을 `dev/active/concert/concert-context.md`에 적는다.

- [ ] **Step 7: 고른 안으로 `style.js`, `ui.js`, `lanes.js` 구현**

- `style.js`: 장터의 `js/weekly/style.js`와 같은 방식으로 `<style id="concert-style">`을 한 번만 주입하는 `ensureConcertStyle()`을 내보낸다. 클래스 접두사는 `cc-`.
- `ui.js`: `showHall`은 `hallView(getState(), env())`를 다시 계산해 그리는 `render()`를 두고, 교환이나 장착 뒤에 `render()`를 부른다. 창 루트 id는 `concert-hall-modal`, 결과 창은 `concert-result-modal`이다. 닫기는 기존 창들과 같이 바깥 누르기와 닫기 버튼 둘 다 된다. 악기 칸의 교환은 `onBuy({ id, cost, type: 'instrument' })`, 꾸미기 칸은 `onBuy({ id, cost, kind, type: 'decor' })`로 부른다. `onBuy`가 `{ok: false, reason: 'guest'}`를 돌려주면 `onLogin()`을 부른다. 상태가 `guest`인 칸의 버튼은 `CONCERT_COPY.guestBtn`을 보여 주고 누르면 `onLogin()`을 부른다. 곡을 고르면 창을 닫고 `onPlay(songId)`를 부른다.
- `lanes.js`: `showLanes`가 루트(`#concert-show-modal.show`)와 캔버스를 만들고, `draw(nowMs)`에서 `noteY`로 음표와 박자선을 그린다. `flash(lane, kind)`는 판정선에 색 번짐과 판정 글자(`CONCERT_COPY.judge[kind]`)를 0.35초 띄운다. `kind`가 `null`이면 줄만 살짝 어두워진다. `miss(index)`는 그 음표를 흐리게 하고 `CONCERT_COPY.judge.miss`를 띄운다. `close()`는 리스너를 전부 떼고 루트를 지운다.
- 캔버스 크기는 `devicePixelRatio`를 2로 제한하고 `resize`에서 다시 잡는다.

- [ ] **Step 8: 브라우저에서 확인**

`sims/concert-ui.html`을 고쳐 실제 `showHall`, `showLanes`, `showResult`를 불러 띄운다. 세로 폰, 가로 폰, PC 크기에서 글자 넘침과 겹침이 없는지, 왼쪽·오른쪽 입력과 F·J·화살표 키가 맞는 줄로 가는지 본다.

- [ ] **Step 9: 커밋**

```bash
git add js/concert/views.js js/concert/ui.js js/concert/lanes.js js/concert/style.js tests/concert-views.test.mjs dev/active/concert/concert-context.md
git commit -m "feat(concert): add the hall, result and lane views"
```

---

### Task 7: 진입점, 공연 진행, game.js 연결

**Files:**
- Create: `js/concert/index.js`, `js/concert/bridge.js`, `js/concert/track.js`, `js/concert/items.js`, `js/spaces/concert-stage-art.js`
- Modify: `js/game.js` (import 86~87 근처, 기본 상태 1158 근처, 개발 훅 2741 근처, 복원 3243 근처, 흩뿌리기 3571·3612·5243 근처, 초기화 3587 근처, 갱신 6589 근처, 상호작용 7790 근처, 프롬프트 가드 7948)
- Modify: `js/spaces/doors.js:428` 근처
- Modify: `docs/analysis/event-taxonomy.csv`
- Test: `tests/concert-index.test.mjs`, `tests/concert-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1~6 전부
- Produces (`js/concert/track.js`): `trackOpen(notes, isGuest)`, `trackStart(song, instrument, nth, diff)`, `trackEnd(song, stars, pct, notes, perfect, diff)`, `trackExchange(itemId, cost, left)`, `trackLoginPrompt(notes)`. `diff`는 `deps.diffParams(roll)`이 돌려준 객체(`{ease, dda, arm, probe_v}`)이고 그대로 펼친다
- Produces (`js/spaces/concert-stage-art.js`): `DECK_H`, `STAGE_SOLIDS: [x, z, r][]`, `buildConcertStage(THREE) → Group`(`userData.lamps: Material[]`), `disposeConcertStage(group)`. 이 태스크에서는 나무 단만 있는 최소 조형이다(Task 9에서 완성)
- Produces (`js/concert/items.js`): `hasConcertArt(id)`, `concertDecorMesh(T, id)`. 이 태스크에서는 각각 `false`, `null`만 돌려준다(Task 10에서 채운다)
- Produces (`js/concert/bridge.js`): `makeConcertBridge(env) → { stage: {enter(instrumentId), strike(lane), update(dt), exit()}, bgm: {pause(), resume()} }`. `env = { player, setCameraRig, hideTool(hidden), isBgmOn, startBgm, stopBgm }`. 이 태스크에서 `strike`는 빈 함수다(Task 8에서 채운다)
- Produces (`js/concert/index.js`):
  - `concertDefault`, `restoreConcert`, `concertDecorMesh` 재수출
  - `initConcert(deps)`, `updateConcert(dt, inVillage, pos)`, `concertSpotNow() → boolean`, `concertPrompt() → string`, `openConcert()`, `concertScatterBlocks(x, z, pad = 1) → boolean`, `concertDev()`
  - `deps = { getState, setState, requestSave, isGuest, login, ownsDecor, grantDecorItem, today, stopMove, roll, settle, diffParams, abandon, audio, stage, bgm, night, scene, THREE, solidCircle, guideEnv }`와 테스트용 주입 `{ showHall, showLanes, showResult, createAudio, buildStage }`

- [ ] **Step 1: 실패하는 진행 테스트 작성 (`tests/concert-index.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_POS } from '../js/data/concert.js';
import { concertDefault } from '../js/concert/rules.js';
import { chartOf, lengthMs, PRACTICE_LENGTH_MS } from '../js/concert/songs.js';
import { initConcert, updateConcert, concertSpotNow, openConcert, concertScatterBlocks } from '../js/concert/index.js';

function world(over = {}) {
  const w = { state: concertDefault(), saves: 0, clock: -330, log: [], hall: null, lanes: null, result: null, settled: [], abandoned: [], rolls: 0 };
  const deps = {
    getState: () => w.state,
    setState: (s) => { w.state = s; },
    requestSave: () => { w.saves += 1; },
    isGuest: () => false,
    login: () => w.log.push('login'),
    ownsDecor: () => false,
    grantDecorItem: () => true,
    today: () => '2026-11-14',
    stopMove: () => {},
    roll: () => { w.rolls += 1; return { ease: 1, arm: 1, dda: 1 }; },
    settle: (o) => w.settled.push(o),
    diffParams: (r) => ({ ease: r.ease, dda: r.dda, arm: r.arm, probe_v: 2 }),
    abandon: (r, stage, extra) => w.abandoned.push([stage, extra.song]),
    audio: () => ({ ctx: {}, out: {}, on: true }),
    stage: { enter: (id) => w.log.push(`enter:${id}`), strike: (lane) => w.log.push(`strike:${lane}`), update: () => {}, exit: () => w.log.push('exit') },
    bgm: { pause: () => w.log.push('bgm-off'), resume: () => w.log.push('bgm-on') },
    night: () => 0,
    showHall: (h) => { w.hall = h; },
    showLanes: (l) => { w.lanes = l; return { draw() {}, flash: (lane, kind) => w.log.push(`flash:${lane}:${kind}`), miss() {}, close: () => w.log.push('lanes-close') }; },
    showResult: (r) => { w.result = r; },
    createAudio: () => ({ start() {}, stop() {}, nowMs: () => w.clock, hit: (id, lane) => w.log.push(`hit:${id}:${lane}`) }),
    ...over,
  };
  initConcert(deps);
  return w;
}

const near = { x: STAGE_POS.x, z: STAGE_POS.z + 1 };
const openAt = (w) => { updateConcert(0.016, true, near); openConcert(); };
const playAll = (w, songId) => {
  for (const note of chartOf(songId)) { w.clock = note.t; w.lanes.onTap(note.lane); }
  w.clock = lengthMs(songId) + 1;
  updateConcert(0.016, true, near);
};

test('init writes no state and never saves', () => {
  const w = world();
  assert.equal(w.saves, 0);
  assert.deepEqual(w.state, concertDefault());
});

test('the spot is on only near the stage in the village', () => {
  world();
  updateConcert(0.016, true, { x: 0, z: 0 });
  assert.equal(concertSpotNow(), false);
  updateConcert(0.016, true, near);
  assert.equal(concertSpotNow(), true);
  updateConcert(0.016, false, near);
  assert.equal(concertSpotNow(), false);
});

test('the first show runs practice without a roll, then the song', () => {
  const w = world();
  openAt(w);
  w.hall.onPlay('morning');
  assert.equal(w.lanes.practice, true);
  assert.equal(w.rolls, 0);
  w.clock = PRACTICE_LENGTH_MS + 1;
  updateConcert(0.016, true, near);
  assert.equal(w.state.tutorial, true);
  assert.equal(w.saves, 1);
  assert.equal(w.lanes.practice, false);
  assert.equal(w.rolls, 1);
});

test('a perfect show pays four notes, saves once, and feeds the DDA', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('morning');
  playAll(w, 'morning');
  assert.equal(w.state.notes, 4);
  assert.equal(w.state.best.morning, 1);
  assert.equal(w.saves, 1);
  assert.deepEqual(w.settled, [1]);
  assert.equal(w.result.view.stars, 3);
  assert.ok(w.log.includes('hit:drum:0'));
  assert.ok(w.log.includes('strike:1'));
  assert.deepEqual(w.log.slice(-3), ['lanes-close', 'exit', 'bgm-on']);
});

test('quitting pays nothing, keeps the day count, and logs an abandon without moving the DDA', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('march');
  w.lanes.onQuit();
  assert.equal(w.state.notes, 0);
  assert.equal(w.state.paid, 0);
  assert.equal(w.saves, 0);
  assert.deepEqual(w.settled, []);
  assert.deepEqual(w.abandoned, [['play', 'march']]);
  assert.deepEqual(w.log.slice(-3), ['lanes-close', 'exit', 'bgm-on']);
});

test('quitting during practice logs no abandon', () => {
  const w = world();
  openAt(w);
  w.hall.onPlay('morning');
  w.lanes.onQuit();
  assert.deepEqual(w.abandoned, []);
  assert.equal(w.state.tutorial, false);
});

test('a missed tap neither sounds nor moves the character', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('morning');
  w.clock = 0;
  w.lanes.onTap(0);
  assert.ok(w.log.includes('flash:0:null'));
  assert.ok(!w.log.some(l => l.startsWith('hit:')));
  assert.ok(!w.log.some(l => l.startsWith('strike:')));
});

test('buying an instrument spends notes and saves, equipping saves once', () => {
  const w = world();
  w.state = { ...w.state, notes: 25 };
  openAt(w);
  assert.deepEqual(w.hall.onBuy({ id: 'bells', cost: 25, type: 'instrument' }), { ok: true });
  assert.equal(w.state.notes, 0);
  assert.deepEqual(w.state.owned, ['drum', 'bells']);
  assert.equal(w.saves, 1);
  w.hall.onEquip('bells');
  w.hall.onEquip('bells');
  assert.equal(w.state.equipped, 'bells');
  assert.equal(w.saves, 2);
});

test('guests cannot exchange and keep their notes', () => {
  const g = world({ isGuest: () => true });
  g.state = { ...g.state, notes: 99 };
  openAt(g);
  assert.equal(g.hall.onBuy({ id: 'bells', cost: 25, type: 'instrument' }).reason, 'guest');
  assert.equal(g.state.notes, 99);
  assert.equal(g.saves, 0);
});

test('decor without art is not sold', () => {
  const w = world();
  w.state = { ...w.state, notes: 99 };
  openAt(w);
  assert.equal(w.hall.onBuy({ id: 'musicstand', cost: 10, kind: 'indoor', type: 'decor' }).reason, 'soon');
  assert.equal(w.state.notes, 99);
});

test('the stage blocks scatter around itself', () => {
  assert.equal(concertScatterBlocks(STAGE_POS.x, STAGE_POS.z), true);
  assert.equal(concertScatterBlocks(STAGE_POS.x + 30, STAGE_POS.z), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/concert-index.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/index.js'`

- [ ] **Step 3: 최소 무대 조형과 최소 품목 파일 작성**

`js/spaces/concert-stage-art.js`:

```js
import { STAGE_POS } from '../data/concert.js';

export const DECK_H = 0.14;
export const STAGE_SOLIDS = Object.freeze([]);

export function buildConcertStage(T) {
  const g = new T.Group();
  g.name = 'concert-stage';
  const deck = new T.Mesh(
    new T.CylinderGeometry(1.9, 2.0, DECK_H, 20),
    new T.MeshStandardMaterial({ color: 0xa8683c, roughness: 0.95, flatShading: true }),
  );
  deck.position.set(STAGE_POS.x, DECK_H / 2, STAGE_POS.z);
  deck.receiveShadow = true;
  g.add(deck);
  g.userData.lamps = [];
  return g;
}

export function disposeConcertStage(group) {
  group.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });
}
```

단은 올라설 수 있어야 하므로 충돌체가 없다. 가림막과 기둥의 충돌체는 Task 9에서 넣는다.

`js/concert/items.js`:

```js
export const hasConcertArt = () => false;
export const concertDecorMesh = () => null;
```

- [ ] **Step 4: 이벤트 작성 (`js/concert/track.js`)**

```js
import { trackEvent } from '../analytics.js';

export const trackOpen = (notes, isGuest) => trackEvent('concert_open', { notes, is_guest: isGuest ? 1 : 0 });
export const trackStart = (song, instrument, nth, diff) => trackEvent('concert_start', { song, instrument, nth, ...diff });
export const trackEnd = (song, stars, pct, notes, perfect, diff) => trackEvent('concert_end', { song, stars, pct, notes, perfect, ...diff });
export const trackExchange = (itemId, cost, left) => trackEvent('concert_exchange', { item_id: itemId, cost, left });
export const trackLoginPrompt = (notes) => trackEvent('concert_login_prompt', { notes });
```

- [ ] **Step 5: 진입점 구현 (`js/concert/index.js`)**

```js
import { STAGE_POS, SPOT_R, PAID_PLAYS } from '../data/concert.js';
import { concertDefault, restoreConcert, settle, buyPlan, spend, addInstrument, equip, markTutorial, paidLeft } from './rules.js';
import { windowsFor, makeJudge } from './judge.js';
import { chartOf, lengthMs, minGapMs, backingEvents, practiceChart, practiceEvents, PRACTICE_LENGTH_MS } from './songs.js';
import { createConcertAudio } from './audio.js';
import { CONCERT_COPY } from './copy.js';
import { resultView } from './views.js';
import { showHall, showResult } from './ui.js';
import { showLanes } from './lanes.js';
import { trackOpen, trackStart, trackEnd, trackExchange, trackLoginPrompt } from './track.js';
import { buildConcertStage, STAGE_SOLIDS } from '../spaces/concert-stage-art.js';
import { hasConcertArt, concertDecorMesh } from './items.js';

export { concertDefault, restoreConcert, concertDecorMesh };

const SCATTER_R = 2.6;
const LAMP_DAY = 0.25;
const LAMP_NIGHT = 2.1;

let deps = null;
let spot = false;
let show = null;
let stage = null;
let solidsAdded = false;
let onHidden = null;

const state = () => deps.getState();
const save = (next) => { deps.setState(next); deps.requestSave(); };

export function concertScatterBlocks(x, z, pad = 1) {
  return Math.hypot(x - STAGE_POS.x, z - STAGE_POS.z) < SCATTER_R + pad;
}

export function initConcert(d) {
  if (show) closeShow();
  deps = d;
  spot = false;
  if (typeof document !== 'undefined' && !onHidden) {
    onHidden = () => { if (document.hidden) quitShow(); };
    document.addEventListener('visibilitychange', onHidden);
  }
  if (!(d.scene && d.THREE && d.solidCircle)) return;
  if (!solidsAdded) {
    STAGE_SOLIDS.forEach(([x, z, r]) => d.solidCircle(x, z, r));
    solidsAdded = true;
  }
  if (!stage) {
    stage = (d.buildStage || buildConcertStage)(d.THREE);
    d.scene.add(stage);
  }
}

function lightStage() {
  if (!stage) return;
  const level = Math.max(0, Math.min(1, deps.night?.() || 0));
  const glow = LAMP_DAY + (LAMP_NIGHT - LAMP_DAY) * level;
  for (const mat of stage.userData?.lamps || []) mat.emissiveIntensity = glow;
}

export function updateConcert(dt, inVillage, pos) {
  if (!deps) return;
  lightStage();
  spot = inVillage && !show && Math.hypot(pos.x - STAGE_POS.x, pos.z - STAGE_POS.z) < SPOT_R;
  if (show) tickShow(dt);
}

export const concertSpotNow = () => spot;
export const concertPrompt = () => CONCERT_COPY.prompt;

function startShow(songId, practice = !state().tutorial) {
  const s = state();
  const chart = practice ? practiceChart() : chartOf(songId);
  const diff = practice ? null : deps.roll();
  const audio = (deps.createAudio || createConcertAudio)(deps.audio());
  deps.stage.enter(s.equipped);
  deps.bgm.pause();
  const view = (deps.showLanes || showLanes)({ chart, instrument: s.equipped, practice, onTap: tapLane, onQuit: quitShow });
  audio.start(practice ? practiceEvents() : backingEvents(songId));
  show = {
    songId, practice, chart, diff, audio, view,
    judge: makeJudge(chart, windowsFor(diff ? diff.ease : 1, minGapMs(chart))),
    endMs: practice ? PRACTICE_LENGTH_MS : lengthMs(songId),
  };
  if (!practice) trackStart(songId, s.equipped, PAID_PLAYS - paidLeft(s, deps.today()) + 1, deps.diffParams(diff));
}

function tapLane(lane) {
  if (!show) return;
  const hit = show.judge.tap(lane, show.audio.nowMs());
  show.view.flash(lane, hit ? hit.kind : null);
  if (!hit) return;
  show.audio.hit(state().equipped, lane);
  deps.stage.strike(lane);
}

function tickShow(dt) {
  const now = show.audio.nowMs();
  for (const index of show.judge.sweep(now)) show.view.miss(index);
  show.view.draw(now);
  deps.stage.update(dt);
  if (now >= show.endMs) finishShow();
}

function closeShow() {
  show.audio.stop();
  show.view.close();
  deps.stage.exit();
  deps.bgm.resume();
  show = null;
}

function quitShow() {
  if (!show) return;
  if (!show.practice) deps.abandon(show.diff, 'play', { song: show.songId });
  closeShow();
}

function finishShow() {
  const { songId, practice, judge, diff } = show;
  closeShow();
  if (practice) {
    save(markTutorial(state()));
    startShow(songId, false);
    return;
  }
  const summary = judge.summary();
  const r = settle(state(), { songId, ratio: summary.ratio, today: deps.today() });
  save(r.state);
  deps.settle(summary.ratio);
  trackEnd(songId, r.stars, Math.round(summary.ratio * 100), r.earned, summary.perfect, deps.diffParams(diff));
  (deps.showResult || showResult)({
    view: resultView({ stars: r.stars, earned: r.earned, bestUp: r.bestUp, summary }),
    onAgain: () => startShow(songId),
    onLeave: () => {},
  });
}

function onBuy(item) {
  const s = state();
  const isInstrument = item.type === 'instrument';
  const plan = buyPlan(s, item, {
    isGuest: deps.isGuest(),
    owned: isInstrument ? s.owned.includes(item.id) : deps.ownsDecor(item.id),
    hasArt: isInstrument || hasConcertArt(item.id),
  });
  if (plan.reason === 'guest') trackLoginPrompt(s.notes);
  if (!plan.ok) return plan;
  if (!isInstrument && !deps.grantDecorItem(item)) return { ok: false, reason: 'grant_failed' };
  const paid = spend(state(), item.cost);
  save(isInstrument ? addInstrument(paid, item.id) : paid);
  trackExchange(item.id, item.cost, paid.notes);
  return plan;
}

function onEquip(id) {
  const next = equip(state(), id);
  if (next !== state()) save(next);
}

export function openConcert() {
  if (!spot || show) return;
  const s = state();
  trackOpen(s.notes, deps.isGuest());
  return (deps.showHall || showHall)({
    getState: state,
    env: () => ({ today: deps.today(), isGuest: deps.isGuest(), ownsDecor: deps.ownsDecor, hasArt: hasConcertArt, thumbs: {} }),
    onPlay: (songId) => startShow(songId),
    onEquip,
    onBuy,
    onLogin: () => deps.login?.(),
    onOpen: deps.stopMove,
  });
}

export function concertDev() {
  if (!deps) return null;
  return {
    state,
    notes: (n) => { if (Number.isInteger(n) && n >= 0) deps.setState({ ...state(), notes: n }); return state().notes; },
    own: (id) => { deps.setState(addInstrument(state(), id)); return state().owned; },
    use: (id) => { deps.setState(equip(state(), id)); return state().equipped; },
    play: (songId) => startShow(songId, false),
    quit: quitShow,
  };
}
```

`settle`은 `rules.js`의 규칙 함수이고 `deps.settle`은 DDA다. 이 파일에서 DDA는 항상 `deps.settle`로만 부른다. `grantDecorItem`은 장터 브리지의 `grant`이고 `item.kind`(`indoor`/`outdoor`)를 보고 보관함에 넣는다.

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/concert-index.test.mjs`
Expected: PASS, 11 tests

- [ ] **Step 7: 브리지 구현 (`js/concert/bridge.js`)**

```js
import { STAGE_POS } from '../data/concert.js';
import { DECK_H } from '../spaces/concert-stage-art.js';

const EXIT_GAP = 2.6;

export function makeConcertBridge(env) {
  let bgmWasOn = false;
  let active = false;

  const rig = (camera) => {
    const dist = camera.aspect < 1 ? 9.5 : 7;
    camera.position.set(STAGE_POS.x, 3.2, STAGE_POS.z + dist);
    camera.lookAt(STAGE_POS.x, 1.3, STAGE_POS.z);
  };

  const hold = () => {
    env.player.position.set(STAGE_POS.x, DECK_H, STAGE_POS.z);
    env.player.rotation.y = 0;
  };

  return {
    stage: {
      enter() {
        active = true;
        env.setCameraRig(rig);
        env.hideTool(true);
        document.body.classList.add('mg-open', 'concert-open');
        hold();
      },
      strike() {},
      update() {
        if (active) hold();
      },
      exit() {
        active = false;
        env.setCameraRig(null);
        env.hideTool(false);
        document.body.classList.remove('mg-open', 'concert-open');
        env.player.position.set(STAGE_POS.x, 0, STAGE_POS.z + EXIT_GAP);
      },
    },
    bgm: {
      pause() { bgmWasOn = env.isBgmOn(); if (bgmWasOn) env.stopBgm(); },
      resume() { if (bgmWasOn) env.startBgm(); bgmWasOn = false; },
    },
  };
}
```

카메라 거리(7, 9.5)와 높이는 Step 10의 브라우저 확인에서 세로 폰과 PC 둘 다 캐릭터 전신과 줄 위쪽 무대가 보이도록 맞춘다. 캐릭터가 카메라를 보는 방향이 `rotation.y = 0`이 아니면(게임에서 캐릭터 정면이 어느 축인지 `updatePlayer`의 회전 코드로 확인) 그 값으로 바꾼다.

- [ ] **Step 8: 실패하는 연결 테스트 작성 (`tests/concert-wiring.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js only wires the concert module', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /concert/i.test(l));
  assert.ok(lines.length <= 16, `${lines.length} concert lines:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*concert/i.test(game));
  for (const k of ["from './concert/index.js'", "from './concert/bridge.js'", 'initConcert(', 'updateConcert(', 'concertSpotNow()', 'openConcert()', 'concert: concertDefault()', 'restoreConcert(saved.concert)', "rollDifficulty('concert')", "settleDifficulty('concert'", "trackDiffAbandon('concert'"]) {
    assert.ok(game.includes(k), k);
  }
});

test('the concert dev hook sits once, right after the weekly hook', () => {
  const game = read('js/game.js');
  const hook = 'window.__concert = concertDev();';
  assert.equal(game.split(hook).length - 1, 1);
  const gap = game.indexOf(hook) - game.indexOf('window.__weekly = weeklyDev();');
  assert.ok(gap > 0 && gap < 200, String(gap));
});

test('doors shows the concert prompt', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /concertSpotNow\(\)/);
  assert.match(doors, /concertPrompt\(\)/);
});

test('concert modules stay out of game.js internals', () => {
  for (const f of ['index', 'rules', 'judge', 'songs', 'audio', 'track', 'bridge', 'views']) {
    assert.doesNotMatch(read(`js/concert/${f}.js`), /from '\.\.\/game\.js'/, f);
  }
});

test('the weekly wiring assertions still hold', () => {
  assert.ok(read('js/game.js').includes('const m = weeklyDecorMesh(THREE, id); if (m)'));
});
```

- [ ] **Step 9: game.js와 doors.js 연결**

각 줄을 편집 도구로 한 곳씩 넣는다.

1. import (87번 줄 `makeWeeklyBridge` import 아래):
```js
import { initConcert, updateConcert, concertSpotNow, openConcert, concertDefault, restoreConcert, concertScatterBlocks, concertDecorMesh, concertDev } from './concert/index.js';
import { makeConcertBridge } from './concert/bridge.js';
```
2. `js/sound.js`를 가져오는 기존 import 줄에 `audioBus`, `isBGMOn`, `startBGM`, `stopBGM` 가운데 없는 이름만 더한다.
3. 기본 상태 (`weekly: weeklyDefault(),` 아래): `concert: concertDefault(),`
4. 개발 훅 (`window.__weekly = weeklyDev();` 바로 아래 줄): `window.__concert = concertDev();`
5. 복원 (`gameState.weekly = restoreWeekly(saved.weekly);` 아래): `gameState.concert = restoreConcert(saved.concert);`
6. 초기화 (3587번 줄 `initWeekly({...});` 바로 아래, 같은 `{ const wb = ... }` 블록 안에 한 줄):
```js
    { const cb = makeConcertBridge({ player, setCameraRig, hideTool: (h) => { if (heldGroup) heldGroup.visible = !h; }, isBgmOn: isBGMOn, startBgm: startBGM, stopBgm: stopBGM }); initConcert({ getState: () => gameState.concert, setState: (s) => { gameState.concert = s; }, requestSave, isGuest: () => authState.isGuest !== false, login: () => ui.loginNudge?.('shop'), ownsDecor: wb.owns, grantDecorItem: wb.grant, today: todayStr, stopMove: () => Input.setAnalog(0, 0), roll: () => rollDifficulty('concert'), settle: (o) => settleDifficulty('concert', o), diffParams, abandon: (r, stage, extra) => trackDiffAbandon('concert', r, stage, extra), audio: audioBus, stage: cb.stage, bgm: cb.bgm, night: () => nightLevel, scene, solidCircle, THREE, guideEnv: wb.guideEnv }); }
```
7. 흩뿌리기 막음: `weeklyScatterBlocks(x, z)`가 있는 세 곳에 `concertScatterBlocks(x, z)`를 같은 조건으로 더한다. `|| weeklyScatterBlocks(x, z)`는 `|| weeklyScatterBlocks(x, z) || concertScatterBlocks(x, z)`로, `if (weeklyScatterBlocks(x, z)) continue;`는 `if (weeklyScatterBlocks(x, z) || concertScatterBlocks(x, z)) continue;`로.
8. 갱신 (`updateWeekly(dt, inVillage2(), player.position);` 아래): `updateConcert(dt, inVillage2(), player.position);`
9. 상호작용 (`if (weeklySpotNow()) return openWeekly();` 아래): `if (concertSpotNow()) return openConcert();`
10. 프롬프트 가드 (7948번 줄 조건 끝 `|| !!weeklySpotNow()` 뒤): `|| concertSpotNow()`
11. `js/spaces/doors.js`: import에 `import { concertSpotNow, concertPrompt } from '../concert/index.js';`를 더하고, 428번 줄 `weeklyPrompt()` 분기 아래에 `else if (inVillage && concertSpotNow()) prompt = concertPrompt();`를 넣는다.

`setCameraRig`, `heldGroup`, `nightLevel`, `todayStr`, `rollDifficulty`, `settleDifficulty`, `diffParams`, `trackDiffAbandon`은 game.js에 이미 있다. 이 단계 뒤 concert 줄은 13줄이다(import 2, 기본 상태 1, 개발 훅 1, 복원 1, 흩뿌리기 3, 초기화 1, 갱신 1, 상호작용 1, 가드 1). Task 8은 초기화 줄을 고칠 뿐 줄을 늘리지 않고, Task 10에서 꾸미기 줄 1이 더해져 14줄이 된다.

- [ ] **Step 10: 통과 확인과 브라우저 확인**

Run: `node --test tests/concert-wiring.test.mjs tests/concert-index.test.mjs tests/weekly-wiring.test.mjs`
Expected: 전부 PASS

브라우저(`concert` 서버, localhost): 게스트로 들어가 `window.__tp(6.5, 12)`로 무대 앞에 간다.
- 프롬프트 "음악회 열기"가 뜨고 누르면 창이 열리는가
- 곡을 고르면 카메라가 무대 정면으로 가고 HUD가 숨는가
- 공연 중 방향키와 조이스틱으로 캐릭터가 움직이지 않는가
- 줄 입력이 판정되고 소리가 나는가, 마을 배경음악이 멈췄다가 끝나면 돌아오는가
- 그만하기와 탭 가리기에서 공연이 끝나고 카메라가 돌아오는가
- 콘솔 오류가 없는가

`anyModalOpen`이 `#concert-show-modal.show`를 잡지 못해 캐릭터가 움직이면 `lanes.js` 루트의 id와 클래스를 `index.html`의 `anyModalOpen` 정의에 맞춘다.

- [ ] **Step 11: 이벤트 표 갱신 (`docs/analysis/event-taxonomy.csv`)**

기존 열 구성을 그대로 따라 5줄을 더한다: `concert_open`, `concert_start`, `concert_end`, `concert_exchange`, `concert_login_prompt`. `minigame_abandon` 줄의 게임 목록에 `concert`를 더한다.

- [ ] **Step 12: 커밋**

```bash
git add js/concert/index.js js/concert/bridge.js js/concert/track.js js/concert/items.js js/spaces/concert-stage-art.js js/game.js js/spaces/doors.js docs/analysis/event-taxonomy.csv tests/concert-index.test.mjs tests/concert-wiring.test.mjs
git commit -m "feat(concert): wire the show flow, camera lock and save into the game"
```

---

### Task 8: 악기 조형과 연주 자세 (사용자 게이트)

**Files:**
- Create: `js/concert/instruments/pose.js`, `kit.js`, `drum.js`, `guitar.js`, `bass.js`, `bells.js`, `maracas.js`, `index.js`
- Modify: `js/concert/bridge.js`, `js/game.js`(초기화 줄의 `makeConcertBridge` 인자)
- Test: `tests/concert-instruments.test.mjs`
- 시안: `sims/concert-instrument-v2.html`(워크트리에 복사돼 있다. 이 태스크의 조형·수치 원본)

**Interfaces:**
- Consumes: `playerArms`(`{R: {pivot, hand}, L: {pivot, hand}}`), `playerAnchor`, 현재 캐릭터 정의(`bodyR`, `bodyScale`, `extras`)
- Produces (`pose.js`):
  - `makeRig(T, {anchor, arms, def}) → {T, root, R, bodyY, bs, wings, arms: {1: {pivot, rest, reach}, [-1]: {pivot, rest, reach}}}`. `rest`는 팔이 쉴 때 어깨에서 손으로 가는 단위 벡터(앵커 좌표), `reach`는 그 길이
  - `aimDir(rig, side, dir) → Vector3`(손 위치), `aimAt(rig, side, target) → Vector3`
  - `frontZ(rig, x, y) → number`, `orient(T, obj, yDir, zHint) → {x, y, z}`, `shoulderTop(rig, side, k)`
  - `relax(rig)`: 두 팔의 `pivot.quaternion`을 항등으로 되돌린다
- Produces (`instruments/index.js`): `buildInstrument(T, id, rig) → { group: Group, pose(hitL, hitR), dispose() }`. `group`은 `rig.root`에 붙어 있다
- Produces (`bridge.js` 변경): `stage.enter(instrumentId)`가 악기를 만들고, `stage.strike(lane)`가 그 줄의 타격 값을 1로 올리며, `stage.update(dt)`가 타격 값을 0.2초에 걸쳐 0으로 내리고 `pose`를 부른다. `stage.exit()`가 악기를 떼고 `relax`를 부른다

팔 방향 잡는 방법: 게임의 팔은 `pivot → aim(고정 방향) → 팔·발바닥·hand` 구조이고 `playerArms`는 `pivot`과 `hand`만 준다. 그래서 `aim`을 건드리지 않고 `pivot.quaternion`을 "쉬는 방향 → 원하는 방향" 회전으로 놓는다. 시안은 `aim.quaternion`을 직접 썼으므로 이 부분만 다르다.

- [ ] **Step 1: 실패하는 테스트 작성 (`tests/concert-instruments.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { INSTRUMENTS } from '../js/data/concert.js';
import { makeRig, aimDir, frontZ, relax } from '../js/concert/instruments/pose.js';
import { buildInstrument } from '../js/concert/instruments/index.js';

const DEFS = {
  bear: { bodyR: 0.63, bodyScale: [1.08, 1.0, 1.06] },
  rabbit: { bodyR: 0.46, bodyScale: [1.0, 0.96, 1.0] },
  chick: { bodyR: 0.5, bodyScale: [1.02, 0.94, 1.02], extras: ['wings'] },
};

function fakePlayer(def) {
  const R = def.bodyR, bs = def.bodyScale, bodyY = R * bs[1] + 0.02;
  const anchor = new THREE.Group();
  const arm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * R * 0.85 * bs[0], bodyY + R * 0.54, R * 0.2);
    const aim = new THREE.Group();
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(side * 0.29, -0.9, 0.32).normalize());
    const hand = new THREE.Group();
    hand.position.y = -R * 0.527;
    aim.add(hand); pivot.add(aim); anchor.add(pivot);
    return { pivot, hand };
  };
  return { anchor, arms: { R: arm(1), L: arm(-1) }, def };
}

const handAt = (p, key) => p.anchor.worldToLocal(p.arms[key].hand.getWorldPosition(new THREE.Vector3()));

test('aimDir puts the hand along the asked direction at arm length', () => {
  const p = fakePlayer(DEFS.bear);
  const rig = makeRig(THREE, p);
  const dir = new THREE.Vector3(-0.2, -0.4, 0.9).normalize();
  const want = aimDir(rig, 1, dir);
  assert.ok(handAt(p, 'R').distanceTo(want) < 1e-6);
  const fromShoulder = want.clone().sub(p.arms.R.pivot.position);
  assert.ok(Math.abs(fromShoulder.length() - rig.arms[1].reach) < 1e-6);
  assert.ok(fromShoulder.normalize().distanceTo(dir) < 1e-6);
});

test('relax returns both arms to the rest pose', () => {
  const p = fakePlayer(DEFS.rabbit);
  const rig = makeRig(THREE, p);
  aimDir(rig, 1, new THREE.Vector3(0, 0, 1));
  aimDir(rig, -1, new THREE.Vector3(0, 1, 0));
  relax(rig);
  for (const key of ['R', 'L']) assert.ok(p.arms[key].pivot.quaternion.angleTo(new THREE.Quaternion()) < 1e-6);
});

test('the body front is farthest at the belly centre and zero outside the body', () => {
  const rig = makeRig(THREE, fakePlayer(DEFS.bear));
  const centre = frontZ(rig, 0, rig.bodyY);
  assert.ok(centre > frontZ(rig, rig.R * 0.6, rig.bodyY));
  assert.equal(frontZ(rig, rig.R * 3, rig.bodyY), 0);
});

for (const [name, def] of Object.entries(DEFS)) {
  for (const { id } of INSTRUMENTS) {
    test(`${id} builds, poses and cleans up on a ${name}`, () => {
      const p = fakePlayer(def);
      const rig = makeRig(THREE, p);
      const inst = buildInstrument(THREE, id, rig);
      assert.equal(inst.group.parent, p.anchor);
      inst.pose(0, 0);
      inst.pose(1, 0);
      inst.pose(0, 1);
      let meshes = 0;
      inst.group.traverse(o => {
        if (!o.isMesh) return;
        meshes += 1;
        for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
      });
      assert.ok(meshes > 0);
      inst.dispose();
      assert.equal(inst.group.parent, null);
    });
  }
}

test('a hit changes the pose of that side only', () => {
  const p = fakePlayer(DEFS.bear);
  const rig = makeRig(THREE, p);
  const inst = buildInstrument(THREE, 'drum', rig);
  inst.pose(0, 0);
  const restR = p.arms.R.pivot.quaternion.clone(), restL = p.arms.L.pivot.quaternion.clone();
  inst.pose(0, 1);
  assert.ok(p.arms.R.pivot.quaternion.angleTo(restR) > 0.01);
  assert.ok(p.arms.L.pivot.quaternion.angleTo(restL) < 1e-6);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/concert-instruments.test.mjs`
Expected: FAIL, `Cannot find module '../js/concert/instruments/pose.js'`

- [ ] **Step 3: 자세 도우미 구현 (`js/concert/instruments/pose.js`)**

```js
export function makeRig(T, { anchor, arms, def }) {
  const R = def.bodyR, bs = def.bodyScale, bodyY = R * bs[1] + 0.02;
  const side = (arm) => {
    const keep = arm.pivot.quaternion.clone();
    arm.pivot.quaternion.identity();
    anchor.updateMatrixWorld(true);
    const hand = anchor.worldToLocal(arm.hand.getWorldPosition(new T.Vector3()));
    arm.pivot.quaternion.copy(keep);
    const off = hand.sub(arm.pivot.position);
    return { pivot: arm.pivot, reach: off.length(), rest: off.clone().normalize() };
  };
  return { T, root: anchor, R, bodyY, bs, wings: (def.extras || []).includes('wings'), arms: { 1: side(arms.R), [-1]: side(arms.L) } };
}

export function aimDir(rig, side, dir) {
  const arm = rig.arms[side];
  const d = dir.clone().normalize();
  arm.pivot.quaternion.setFromUnitVectors(arm.rest, d);
  return arm.pivot.position.clone().addScaledVector(d, arm.reach);
}

export const aimAt = (rig, side, target) => aimDir(rig, side, target.clone().sub(rig.arms[side].pivot.position));

export function relax(rig) {
  rig.arms[1].pivot.quaternion.identity();
  rig.arms[-1].pivot.quaternion.identity();
}

export function frontZ(rig, x, y) {
  const { R, bs, bodyY } = rig;
  const tx = x / (R * bs[0]), ty = (y - bodyY) / (R * bs[1]), t = 1 - tx * tx - ty * ty;
  const torso = t > 0 ? Math.sqrt(t) * R * bs[2] : 0;
  const bx = x / (R * 0.62), by = (y - (bodyY - R * 0.16)) / (R * 0.682), b = 1 - bx * bx - by * by;
  const belly = b > 0 ? R * 0.55 + Math.sqrt(b) * R * 0.372 : 0;
  return Math.max(torso, belly);
}

export function orient(T, obj, yDir, zHint) {
  const y = yDir.clone().normalize();
  const x = new T.Vector3().crossVectors(y, zHint).normalize();
  const z = new T.Vector3().crossVectors(x, y).normalize();
  obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  return { x, y, z };
}

export function shoulderTop(rig, side, k = 0.55) {
  const { T, R, bs, bodyY } = rig;
  return new T.Vector3(side * R * bs[0] * k, bodyY + R * bs[1] * Math.sqrt(1 - k * k) * 0.98, R * 0.12);
}
```

- [ ] **Step 4: 악기 5종 옮기기**

`sims/concert-instrument-v2.html`의 다음 함수를 파일별로 옮긴다. 조형 수치(반지름, 길이, 색)는 그대로 둔다. 바꾸는 것은 다섯 가지다.

1. `THREE` 전역 대신 `rig.T`를 쓴다.
2. 시안의 `aimDir`, `aimAt`, `frontZ`, `orient`, `shoulderTop`은 `pose.js` 것을 쓴다. `orient`는 첫 인자로 `rig.T`를 넘긴다.
3. 시안의 `M`, `rod`, `strapTube`, `clay`, `brass`, `PAL`은 `js/concert/instruments/kit.js`로 옮긴다. 내보내는 모양은 `makeKit(T) → {M, rod, strapTube, clay, brass, PAL}`이다.
4. 각 `setup*` 함수는 모든 메시를 `group` 하나 아래에 넣고 `rig.root.add(group)` 한다. 시안처럼 `rig.root`에 낱개로 붙이지 않는다. `dispose()`는 `group`을 떼고 그 아래 모든 `geometry`와 `material`을 해제한다.
5. 함수 이름을 `build*`로 바꾸고 반환값을 `{ group, pose(hitL, hitR), dispose }`로 맞춘다.

| 새 파일 | 내보내는 함수 | 시안 함수 | 비고 |
|---|---|---|---|
| `drum.js` | `buildDrum(rig)`, `drumBody(kit, g, r, h, shell)` | `drumBody`, `setupDrum` | 기본 악기 |
| `bass.js` | `buildBass(rig)` | `starGeo`, `setupBass` | `drumBody`는 `drum.js`에서 가져온다 |
| `guitar.js` | `buildGuitar(rig)` | `figure8`, `plate`, `heelOf`, `guitarModel`, `setupGuitar` | 시안 ②의 값만 쓴다: `scale 1.45, cx .36, cy .16, fretUp .12`. `round` 분기와 `HOLDS` 표는 지운다 |
| `bells.js` | `buildBells(rig)` | `bellModel`, `setupBells` | 파랑 = 왼쪽 줄, 빨강 = 오른쪽 줄 |
| `maracas.js` | `buildMaracas(rig)` | `maracaModel`, `setupMaracas` | 초록 = 왼쪽 줄, 빨강 = 오른쪽 줄 |

줄과 팔의 대응: 게임의 `R` 팔(+x)은 정면에서 볼 때 화면 오른쪽이다. 오른쪽 줄(1번)은 `side 1`, 왼쪽 줄(0번)은 `side -1`이다. 시안의 `pose(hitL, hitR)`가 이미 이 대응이다. 통기타는 한 팔이 튕기므로 `hitR - hitL`로 쓸어내림과 올림을 나눈다(시안 그대로).

`js/concert/instruments/index.js`:

```js
import { buildDrum } from './drum.js';
import { buildGuitar } from './guitar.js';
import { buildBass } from './bass.js';
import { buildBells } from './bells.js';
import { buildMaracas } from './maracas.js';

const BUILDERS = { drum: buildDrum, guitar: buildGuitar, bass: buildBass, bells: buildBells, maracas: buildMaracas };

export const buildInstrument = (T, id, rig) => (BUILDERS[id] || buildDrum)(rig);
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/concert-instruments.test.mjs`
Expected: PASS, 19 tests (도우미 3 + 캐릭터 3 × 악기 5 + 타격 1)

- [ ] **Step 6: 브리지에 악기 장착 넣기 (`js/concert/bridge.js`)**

`makeConcertBridge`의 `env`에 `THREE`와 `getPlayerRig`를 더한다. game.js 초기화 줄의 `makeConcertBridge({...})` 인자에 `THREE, getPlayerRig: () => ({ anchor: playerAnchor, arms: playerArms, def: <현재 캐릭터 정의> })`를 더한다. 현재 캐릭터 정의는 game.js 4175번 줄 근처에서 `playerArms`를 채우는 코드가 쓰는 변수를 그대로 쓴다.

파일 맨 위 import에 두 줄을 더한다.

```js
import { makeRig, relax } from './instruments/pose.js';
import { buildInstrument } from './instruments/index.js';
```

`makeConcertBridge` 안에 상태를 더한다.

```js
  const HIT_FADE = 5;
  const hit = [0, 0];
  let rigNow = null;
  let inst = null;
```

`stage`의 네 함수를 다음으로 바꾼다.

```js
      enter(instrumentId) {
        active = true;
        env.setCameraRig(rig);
        env.hideTool(true);
        document.body.classList.add('mg-open', 'concert-open');
        hold();
        const p = env.getPlayerRig();
        if (p.arms) {
          rigNow = makeRig(env.THREE, p);
          inst = buildInstrument(env.THREE, instrumentId, rigNow);
        }
      },
      strike(lane) {
        hit[lane] = 1;
      },
      update(dt) {
        if (!active) return;
        hold();
        hit[0] = Math.max(0, hit[0] - dt * HIT_FADE);
        hit[1] = Math.max(0, hit[1] - dt * HIT_FADE);
        if (inst) inst.pose(hit[0], hit[1]);
      },
      exit() {
        active = false;
        if (inst) inst.dispose();
        if (rigNow) relax(rigNow);
        inst = null;
        rigNow = null;
        hit[0] = 0;
        hit[1] = 0;
        env.setCameraRig(null);
        env.hideTool(false);
        document.body.classList.remove('mg-open', 'concert-open');
        env.player.position.set(STAGE_POS.x, 0, STAGE_POS.z + EXIT_GAP);
      },
```

- [ ] **Step 7: 브라우저에서 캐릭터 7종 확인하고 캡처**

`window.__concert.own('guitar')`, `window.__concert.use('guitar')`로 악기를 바꾸고, 캐릭터를 여우, 강아지, 토끼, 고양이, 곰, 판다, 병아리로 바꿔 가며 다섯 악기를 연주한다(`window.__concert.play('morning')`).
- 악기가 몸에 붙어 있고 앞발이 닿는가
- 맞게 칠 때만 그 발이 움직이는가
- 공연이 끝나면 팔이 평소 자세로 돌아오고 도구가 다시 보이는가
- 공연 중 도구가 다시 나타나지 않는가(나타나면 `bridge.update`에서 매 프레임 `env.hideTool(true)`를 부른다)
- 공연 직후 도끼를 휘둘렀을 때 모션이 평소와 같은가

캐릭터 7 × 악기 5를 한 장에 모은 캡처를 만든다. 시안 페이지에 여우, 강아지, 판다 정의를 더해 찍어도 된다(`/Users/uicheol_hwang/calm_forest/sims/tool-grip-sim.html`의 `ANIMALS` 값).

- [ ] **Step 8: 사용자에게 보여 주고 확정받기 (게이트)**

특히 병아리(날개), 판다(팔 색이 다름), 곰(몸이 큼)을 짚어 보여 준다. 고칠 값은 각 악기 파일의 배치 상수다.

- [ ] **Step 9: 전체 테스트 후 커밋**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app 이 두 앱에 들어간다` 1건만 실패

```bash
git add js/concert/instruments js/concert/bridge.js js/game.js tests/concert-instruments.test.mjs
git commit -m "feat(concert): add five instruments and playing poses"
```

---

### Task 9: 무대 조형, 자리, 악단, 객석, 첫 안내 (사용자 게이트)

**Files:**
- Modify: `js/spaces/concert-stage-art.js`, `js/data/concert.js`(`STAGE_POS`), `js/concert/index.js`(안내, 박수), `js/concert/bridge.js`(카메라)
- Create: `js/concert/guide.js`
- Test: `tests/concert-stage.test.mjs`, `tests/concert-guide.test.mjs`
- 시안(커밋 안 함): `sims/concert-stage.html`

**Interfaces:**
- Produces (`concert-stage-art.js`): `STAGE_SOLIDS`(가림막과 기둥), `buildConcertStage(T) → Group`(`userData.lamps: Material[]`, `userData.band: Group[]`, `userData.seats: {x, z}[]`), `stageCheer(group, level)`(객석 위 박수 이모지를 `level` 0~1만큼 보인다), `stageSway(group, beatPhase)`(악단이 박에 맞춰 좌우로 5도 흔들린다), `disposeConcertStage`
- Produces (`guide.js`): `guideNeed(state) → boolean`, `guideTarget({need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide}) → boolean`

- [ ] **Step 1: 자리 실측**

`js/data/places.js`에서 무대 주변 시설 좌표를 읽고 간격을 잰다. 기준 값: 공원 벤치 `PARK_BENCHES`(6.5, 6.5), 시세판 `MARKET`(10, 5.5), 호수 `LAKE`(16, 9) 반지름 6, 선착 데크 `PIER`(x 9.6~13.4, z 8.25~9.75), 카페 입구 `CAFE_GATE`(4, 14), 텃밭 입구 `FARM_GATE`(0, 7). 나무와 꽃 배치, 돌길도 본다(game.js의 흩뿌리기 코드와 `js/world/`). 브라우저에서 `window.__tp`로 후보 자리 2~3곳을 걸어 보고 캡처한다.

- [ ] **Step 2: 실패하는 무대 테스트 작성 (`tests/concert-stage.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { STAGE_POS, SPOT_R } from '../js/data/concert.js';
import { STAGE_SOLIDS, DECK_H, buildConcertStage } from '../js/spaces/concert-stage-art.js';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const NEAR = [
  { name: 'park bench', x: 6.5, z: 6.5, r: 0.9 },
  { name: 'price board', x: 10, z: 5.5, r: 1.2 },
  { name: 'cafe gate', x: 4, z: 14, r: 2.0 },
  { name: 'farm gate', x: 0, z: 7, r: 2.0 },
  { name: 'lake', x: 16, z: 9, r: 6 },
];

test('the stage keeps clear of nearby facilities', () => {
  for (const f of NEAR) assert.ok(gap(STAGE_POS, f) > f.r + 2.0, `${f.name} ${gap(STAGE_POS, f)}`);
});

test('colliders leave the performer spot and the front approach open', () => {
  assert.ok(STAGE_SOLIDS.length >= 1);
  for (const [x, z, r] of STAGE_SOLIDS) {
    assert.ok(gap({ x, z }, STAGE_POS) > r + 0.6, 'performer spot');
    assert.ok(gap({ x, z }, { x: STAGE_POS.x, z: STAGE_POS.z + SPOT_R }) > r + 0.5, 'front approach');
    assert.ok(z <= STAGE_POS.z, 'colliders sit behind the performer');
  }
});

test('the stage has lamps, a band and seats', () => {
  const g = buildConcertStage(THREE);
  assert.ok(g.userData.lamps.length >= 2);
  assert.ok(g.userData.band.length >= 2 && g.userData.band.length <= 3);
  assert.ok(g.userData.seats.length >= 2);
  assert.ok(DECK_H > 0 && DECK_H <= 0.2);
  for (const lamp of g.userData.lamps) assert.equal(lamp.emissiveIntensity, 0);
});
```

- [ ] **Step 3: 무대 시안 3안 만들기 (`sims/concert-stage.html`)**

실측한 자리에 놓은 모습으로 3안을 만든다. 각 안에 통기타를 든 캐릭터를 세우고, 낮과 밤, 공연 카메라(정면)와 마을 기본 카메라(위에서 41도) 네 장면을 보여 준다. PC 1280×720과 세로 폰 360×740 틀을 나란히 둔다.

- A: 조개 가림막. 나무 단 뒤에 부채꼴 조개 모양 가림막, 가림막 가장자리에 등불 줄.
- B: 정자 지붕. 기둥 네 개와 낮은 지붕, 지붕 아래 등불. 앞쪽 기둥 두 개는 가늘게 해 캐릭터를 가리지 않는다.
- C: 열린 단과 깃발 줄. 지붕 없이 단과 양옆 기둥, 기둥 사이에 음표 깃발 줄과 등불.

조형 규칙: 장식을 붙이지 말고 형태 자체로 만든다. 겹친 면은 0.01 이상 띄운다. 색은 `js/spaces/weekly-market-art.js`의 `PAL`을 따른다. 정점색으로 합쳐 메시 3개 이하(몸체, 세부, 등불)로 만든다(같은 파일의 `kit()` 방식). 등불 재질의 `emissiveIntensity`는 0으로 만들고 `userData.lamps`에 넣는다.

악단: 주민 2~3명이 단 뒤쪽 양옆에 선다. 먼저 game.js와 `js/data/npcs.js`에서 주민 메시를 만드는 함수를 찾아 game.js를 고치지 않고 가져다 쓸 수 있는지 본다. 어렵다면 `js/animal-faces.js`의 `buildAnimalHead`와 몸통 구(`plushMat`)로 단순한 인형을 만든다(시안 페이지의 `buildRig`에서 팔을 뺀 모양).

객석: 무대 앞 벤치 2개. 기존 공원 벤치(6.5, 6.5)가 무대 정면 쪽에 오지 않으면 같은 조형의 벤치를 무대 조형 안에 새로 놓는다.

- [ ] **Step 4: 사용자에게 보여 주고 확정받기 (게이트)**

고른 안, 확정 좌표, 벤치 처리 방식을 `dev/active/concert/concert-context.md`에 적는다.

- [ ] **Step 5: 고른 안 구현**

- `STAGE_POS`를 확정 좌표로 바꾼다. 좌표가 바뀌면 Step 2 테스트의 `NEAR` 간격이 통과하는지 다시 본다.
- `buildConcertStage`를 고른 안으로 채우고, `STAGE_SOLIDS`에 가림막과 기둥의 원형 충돌체를 넣는다.
- `bridge.js`의 카메라 거리와 높이를 새 무대에 맞게 다시 잡는다.
- `index.js`에 박수와 악단 흔들림을 붙인다. `show`에 `streak: 0`을 두고 `tapLane`에서 `hit.kind === 'perfect'`면 1을 더하고 그 밖의 판정과 `sweep`의 놓침에서는 0으로 되돌린다. `tickShow`에서 `stageCheer(stage, Math.min(1, show.streak / 8))`와 `stageSway(stage, (now / 500) % 1)`를 부른다. `closeShow`에서 `stageCheer(stage, 0)`을 부른다. `stage`가 없을 때(테스트)는 건너뛴다.

- [ ] **Step 6: 첫 안내 테스트와 구현**

`tests/concert-guide.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concertDefault } from '../js/concert/rules.js';
import { guideNeed, guideTarget } from '../js/concert/guide.js';

const ok = { need: true, inVillage: true, pastOnboarding: true, cameraFree: true, uiBusy: false, otherGuide: false };

test('only a player who never played needs the guide', () => {
  assert.equal(guideNeed(concertDefault()), true);
  assert.equal(guideNeed({ ...concertDefault(), tutorial: true }), false);
  assert.equal(guideNeed({ ...concertDefault(), notes: 3 }), false);
});

test('the guide yields to every other gate', () => {
  assert.equal(guideTarget(ok), true);
  for (const k of ['need', 'inVillage', 'pastOnboarding', 'cameraFree']) assert.equal(guideTarget({ ...ok, [k]: false }), false, k);
  assert.equal(guideTarget({ ...ok, uiBusy: true }), false);
  assert.equal(guideTarget({ ...ok, otherGuide: true }), false);
});
```

`js/concert/guide.js`:

```js
export const guideNeed = (state) => !state.tutorial && state.notes === 0;

export function guideTarget({ need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide }) {
  return !!need && inVillage && pastOnboarding && cameraFree && !uiBusy && !otherGuide;
}
```

`index.js`의 `updateConcert`에 안내를 붙인다. `deps.guideEnv`가 있을 때만 돈다. 흐름은 장터의 `js/weekly/index.js` `tickGuide`와 같다.

```js
let guide = null;
let guideOff = false;

function tickGuide(dt, inVillage) {
  const env = deps.guideEnv;
  if (!env || guideOff) return;
  const want = guideTarget({
    need: guideNeed(state()) && !show, inVillage, pastOnboarding: env.pastOnboarding(),
    cameraFree: env.cameraFree(), uiBusy: env.uiBusy(), otherGuide: env.otherGuide(),
  });
  if (!want) {
    if (guide?.active) guide.cancel('gate');
    return;
  }
  guide ??= env.makeGuide('concert', STAGE_POS, SPOT_R);
  if (!guide.active) guide.start();
  guide.update(dt);
}
```

`updateConcert`에서 `lightStage()` 다음에 `tickGuide(dt, inVillage)`를 부른다. `openConcert`에서 `guideOff = true`로 두고 `guide?.active`면 `guide.cancel('gate')`를 부른다. `initConcert`에서 `guide = null; guideOff = false;`로 되돌린다. 장터 안내가 떠 있으면 `otherGuide`에 걸려 음악회 안내가 양보한다.

- [ ] **Step 7: 통과 확인과 브라우저 확인**

Run: `node --test tests/concert-stage.test.mjs tests/concert-guide.test.mjs tests/concert-index.test.mjs`
Expected: 전부 PASS

브라우저: 낮과 밤(`?time=0.75`)에 무대를 보고, 무대 주변을 걸어 충돌이 자연스러운지, 등불이 밤에 켜지는지, 딱 맞음이 이어질 때 객석에 박수가 뜨는지, 새 계정에서 화살표 안내가 무대를 가리키는지 본다.

- [ ] **Step 8: 커밋**

```bash
git add js/spaces/concert-stage-art.js js/data/concert.js js/concert/index.js js/concert/guide.js js/concert/bridge.js tests/concert-stage.test.mjs tests/concert-guide.test.mjs dev/active/concert/concert-context.md
git commit -m "feat(concert): build the park stage with band, seats and first-visit guide"
```

---

### Task 10: 교환 꾸미기 6종 (사용자 게이트)

**Files:**
- Modify: `js/concert/items.js`, `js/data/catalog.js`, `js/game.js:5831` 근처, `js/spaces/indoor.js:458` 근처, `js/i18n-en.js`, `js/concert/index.js`(썸네일)
- Test: `tests/concert-items.test.mjs`
- 시안(커밋 안 함): `sims/concert-items.html`

**Interfaces:**
- Produces (`js/concert/items.js`): `hasConcertArt(id) → boolean`, `concertDecorMesh(T, id) → Group | null`(`userData.lamps: Material[]`)
- Consumes: 장터의 `js/weekly/items/kit.js`(`kit`, `PAL`, `lantern`), `js/weekly/thumbs.js`(`makeThumbs`)

- [ ] **Step 1: 품목마다 시안 3안 만들기 (`sims/concert-items.html`)**

6종(보면대 `musicstand`, 메트로놈 `metronome`, 오르골 `musicbox`, 음표 깃발 줄 `noteflags`, 나팔 기둥 `hornpost`, 작은 풍금 `reedorgan`)에 각 3안. 실내 품목은 방 안에, 야외 품목은 마당에 캐릭터와 함께 놓아 크기를 보여 준다. PC와 세로 폰 틀을 나란히 둔다. 장터 꾸미기와 같은 `kit()`으로 만들어 메시 3개 이하로 합친다. 오르골, 풍금, 나팔 기둥에는 `lamp` 묶음을 조금 넣어 밤에 빛나게 한다.

- [ ] **Step 2: 사용자에게 보여 주고 확정받기 (게이트)**

품목마다 고른 안과 이름, 한 줄 설명을 `dev/active/concert/concert-context.md`에 적는다.

- [ ] **Step 3: 실패하는 테스트 작성 (`tests/concert-items.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { CONCERT_DECOR } from '../js/data/concert.js';
import { hasConcertArt, concertDecorMesh } from '../js/concert/items.js';
import * as catalog from '../js/data/catalog.js';

const defOf = (id) => Object.values(catalog).filter(Array.isArray).flat().find(d => d && d.id === id);

test('all six decor items have art and at most three meshes', () => {
  for (const { id } of CONCERT_DECOR) {
    assert.equal(hasConcertArt(id), true, id);
    const g = concertDecorMesh(THREE, id);
    let meshes = 0;
    g.traverse(o => { if (o.isMesh) meshes += 1; });
    assert.ok(meshes >= 1 && meshes <= 3, `${id} ${meshes}`);
    assert.ok(Array.isArray(g.userData.lamps), id);
  }
  assert.equal(hasConcertArt('nope'), false);
  assert.equal(concertDecorMesh(THREE, 'nope'), null);
});

test('every item is in the catalog and hidden from the coin shop', () => {
  for (const { id, kind } of CONCERT_DECOR) {
    const def = defOf(id);
    assert.ok(def, id);
    assert.equal(def.hidden, true, id);
    if (kind === 'indoor') assert.equal(def.keep, true, id);
  }
});
```

`js/data/catalog.js`가 node에서 import되지 않으면(THREE 의존) `tests/weekly-items.test.mjs`가 카탈로그를 읽는 방식을 그대로 따른다.

- [ ] **Step 4: 조형과 카탈로그 구현**

- `js/concert/items.js`: 고른 안을 빌더 6개로 쓰고 `BUILDERS[id]`로 찾는다. `hasConcertArt = (id) => Object.hasOwn(BUILDERS, id)`, `concertDecorMesh = (T, id) => (hasConcertArt(id) ? BUILDERS[id](T) : null)`.
- `js/data/catalog.js`: 장터 품목 줄(104번 줄 `teacups`, 261번 줄 `teadeck`)과 같은 모양으로 6줄을 더한다. 실내는 `{ id, name, ico, cost: 0, pay: 'coins', hidden: true, keep: true, foot, sm?, h }`, 야외는 `{ id, name, ico, cost: { coins: 9999 }, desc, hidden: true, box?, posts? }`. 발자국과 높이는 조형에서 잰다.
- `js/game.js` 5831번 줄(장터 꾸미기 줄) 바로 아래에 한 줄: `{ const m = concertDecorMesh(THREE, id); if (m) { houseWindows.push(...m.userData.lamps); return m; } }`
- `js/spaces/indoor.js` 458번 줄 `hasItemArt(id)` 분기 아래에 분기 하나를 넣는다: `} else if (hasConcertArt(id)) {` 다음 줄 `g.add(concertDecorMesh(THREE, id));`. import에 `import { hasConcertArt, concertDecorMesh } from '../concert/items.js';`를 더한다.
- `js/concert/index.js`: `openConcert`의 `thumbs: {}`를 썸네일로 바꾼다. 모듈에 `let thumbFn = null;`을 두고 `const thumbsNow = () => { if (!deps.THREE) return {}; thumbFn ??= makeThumbs(deps.THREE, concertDecorMesh); return thumbFn(CONCERT_DECOR_IDS.filter(hasConcertArt)); };`를 만들어 `env`의 `thumbs: thumbsNow()`로 넘긴다. `initConcert`에서 `thumbFn = null`로 되돌린다. import에 `makeThumbs`(`'../weekly/thumbs.js'`)와 `CONCERT_DECOR_IDS`를 더한다.
- `js/i18n-en.js`: 품목 이름과 설명의 영어 값.

Task 7의 `decor without art is not sold` 테스트는 이제 조형이 생겨 `soon`이 나오지 않는다. 그 테스트의 품목 id를 `'nope'`으로 바꿔 "조형 없는 품목은 팔지 않는다"는 뜻을 유지한다.

- [ ] **Step 5: 통과 확인과 브라우저 확인**

Run: `node --test tests/concert-items.test.mjs tests/concert-index.test.mjs tests/concert-wiring.test.mjs tests/weekly-items.test.mjs`
Expected: 전부 PASS (game.js의 concert 줄 수 16 이하 포함)

브라우저: `window.__concert.notes(250)` 뒤 로그인 계정으로 6종을 바꾸고, 보관함에서 꺼내 놓고 다시 줍는다. 야외 품목은 충돌과 회전을, 실내 품목은 탁자 위 놓기를 본다. 게스트로는 로그인 안내가 뜨는지 본다.

- [ ] **Step 6: 커밋**

```bash
git add js/concert/items.js js/concert/index.js js/data/catalog.js js/game.js js/spaces/indoor.js js/i18n-en.js tests/concert-items.test.mjs tests/concert-index.test.mjs dev/active/concert/concert-context.md
git commit -m "feat(concert): add six exchange decor items"
```

---

### Task 11: 마무리 검증

**Files:**
- Modify: `dev/active/concert/concert-tasks.md`, `dev/active/concert/concert-context.md`

- [ ] **Step 1: 전체 테스트**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app 이 두 앱에 들어간다` 1건만 실패

- [ ] **Step 2: 브라우저 점검 (PC 1280×720, 세로 폰 360×740, 가로 폰 740×360)**

- 한 곡 완주: 별, 받은 음표, 오늘 남은 횟수가 맞는가
- 하루 네 번째 공연에서 음표가 0인가
- 악기를 바꿔 다시 연주하면 모습과 소리가 바뀌는가
- 가로 폰에서 줄이 양옆 띠로 가고 무대를 가리지 않는가
- 밤(`?time=0.75`)에 등불이 켜지는가
- 소리를 끄고도 박자선으로 칠 수 있는가
- 공연 중 탭을 가렸다 돌아오면 공연이 끝나 있고 캐릭터와 카메라가 정상인가
- 콘솔 오류가 없는가

- [ ] **Step 3: 난이도 기록 확인**

콘솔에서 `gameState.difficulty.concert`를 본다. 완주하면 `n`이 1 늘고 `dda`가 달성률에 따라 움직이는가, 그만하면 `n`만 늘고 `dda`는 그대로인가, 연습 4박에서는 둘 다 그대로인가. 이벤트는 `gtag`를 스텁으로 바꿔 `concert_start`, `concert_end`, `minigame_abandon`에 `ease`, `dda`, `arm`, `probe_v`가 실리는지 본다(개발 세션은 `trackEvent`가 꺼져 있다).

- [ ] **Step 4: 세이브 왕복**

로그인 계정으로 음표를 얻고 악기를 바꾼 뒤 새로 고쳐 값이 남는지 본다. 게스트는 매번 새 계정이라 이 확인에 쓸 수 없다.

- [ ] **Step 5: dev docs 갱신과 커밋**

`dev/active/concert/concert-tasks.md`의 체크를 채우고, `concert-context.md`에 확정된 좌표, 문구, 고른 시안, 남은 일(배포 5곳 동시, 배포 다음 날 BigQuery 적재 확인, 난이도 목표 75%는 표본이 쌓이면 재조정)을 적는다.

```bash
git add dev/active/concert
git commit -m "docs(concert): record final decisions and remaining deploy steps"
```

---

## Self-Review 결과

**스펙 대조**

| 스펙 항목 | 태스크 |
|---|---|
| 항상 열림, 무대에서 누르면 창 | Task 7 |
| 두 줄 조작과 판정, 놓침 | Task 2, 6, 7 |
| DDA(`ease`가 판정 창에, 45% 상한, 나간 판 제외, 연습 제외) | Task 2, 7, 11 |
| 별, 음표, 하루 3번 | Task 1 |
| 곡 3개 | Task 3, 4 |
| 교환(악기 4, 꾸미기 6, 게스트 막음, 조형 없으면 안 팖) | Task 1, 6, 7, 10 |
| 악기 5종과 자세, 캐릭터 7종 | Task 8 |
| 무대, 악단, 객석, 등불, 첫 안내 | Task 9 |
| 화면(세로, 가로, PC, 박자선) | Task 6 |
| 소리(반주, 악기, 배경음악 멈춤) | Task 4, 7 |
| 저장 칸과 저장 시점 | Task 1, 7 |
| 측정 5종과 `minigame_abandon` | Task 7 |
| 시안 게이트 6개 | Task 4(곡), 5(문구), 6(화면), 8(악기), 9(무대), 10(꾸미기) |
| 배포 주의 | Global Constraints, Task 11 |

**이름 일치 확인**
- `settle`은 규칙 함수(`rules.js`)이고 DDA는 `deps.settle`이다. `index.js`에서 둘을 섞지 않는다.
- `orient`는 `pose.js`에서 `T`를 첫 인자로 받는다.
- 악기 id: 작은북 `drum`, 통기타 `guitar`, 큰북 `bass`, 핸드벨 `bells`, 마라카스 `maracas`.
- `showHall`의 `env`는 값을 돌려주는 함수다. `onBuy`에 넘기는 품목에는 `type`이 붙는다.
- `resultView`는 `{stars, earned, bestUp, summary}`만 받는다.

**남는 위험**
- `ui.anyModalOpen()` 선택자가 공연 화면 루트를 잡지 못하면 캐릭터가 움직인다. Task 7 Step 10에서 확인한다.
- `heldGroup.visible`을 끈 것을 `poseHeldTool`이 다시 켤 수 있다. Task 8 Step 7에서 확인하고, 다시 켜지면 `bridge.update`에서 매 프레임 끈다.
- 모바일에서 `AudioContext`가 멈춰 있으면 소리 시계가 흐르지 않는다. 곡을 고르는 누름이 사용자 제스처라 `initSound`의 재개 리스너가 먼저 돌지만, 실기기 확인이 필요하다.
- 캐릭터 정면 축과 `player.rotation.y = 0`이 맞는지는 코드로 확정하지 못했다. Task 7 Step 7에서 확인한다.
