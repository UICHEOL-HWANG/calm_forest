# 🐗🦝 밤손님 되찾기 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 밤사이 털린 🐾 흔적을 조사하면 도둑이 그 자리에 나타나고, 동물별 3판 승부로 작물을 되찾고 그 동물이 2밤 발길을 끊게 한다.

**Architecture:** 승부 규칙은 `js/duel/` 순수 모듈 3종(rps·shells·truce)에 두고 `node --test` 로 못 박는다. 렌더·UI·흐름은 같은 디렉터리의 별도 파일로 나눈다. `js/game.js` 에는 확장점 훅(`setDuelSource`)만 추가해 등록이 안 돼 있으면 기존 흔적 조사 동작 그대로 흘러가게 한다. 휴전 규칙(`truce.js`)은 브라우저와 Cloudflare Worker 양쪽이 같은 파일을 import 한다.

**Tech Stack:** Vanilla JS (ESM) · Three.js (CDN, 전역 `THREE`) · Cloudflare Workers (`worker/index.js` → `functions/api/*`) · `node --test` (외부 테스트 러너 없음)

**Spec:** [docs/superpowers/specs/2026-09-21-night-duel-design.md](../specs/2026-09-21-night-duel-design.md)

## Global Constraints

- **외부 에셋 금지.** 이미지·모델·사운드 파일을 추가하지 않는다. 모든 형상·효과음은 코드로 생성한다.
- **`js/game.js` 에 새 로직을 넣지 않는다.** 15,901줄이다. 이 계획이 game.js 를 건드리는 것은 Task 5 뿐이고, 거기서도 훅·필드 추가만 한다.
- **불변 갱신.** 상태 함수는 인자를 변형하지 않고 새 객체를 반환한다(사용자 전역 규칙).
- **아트 모듈은 `THREE` 를 인자로 받는다.** `js/visitor-art.js` 의 `makeVisitor(THREE, id)` 와 같은 문법. 모듈이 전역 `THREE` 를 직접 참조하지 않는다.
- **i18n**: 새 문구는 `js/i18n-en.js` 에 **한국어 원문을 키로** 등재한다. `" · "` 글루나 `{0}` 조합으로 문장을 만들지 않고 **통문장을 키로** 쓴다.
- **트래킹 축은 키값으로.** `boar`/`raccoon`, `rps`/`shells`. 표시 이름을 보내지 않는다.
- **휴전은 동물당 최대 2밤**이고 **서버가 상한을 강제**한다(`TRUCE_NIGHTS = 2`).
- **폭력 연출 금지.** 때리고 맞는 동작·효과음·이펙트를 넣지 않는다.
- **테스트 실행**: 전체 `npm test`, 단일 파일 `node --test tests/duel.test.mjs`.
- **커밋 메시지**: 한국어, `type: 이모지 요약` 형식(`feat:`/`fix:`/`docs:`/`test:`). 저장소 관행상 attribution 줄을 붙이지 않는다.
- **브랜치**: `feat/night-duel` 에서 작업한다(이미 생성돼 있고 스펙 커밋 `57205b0` 이 올라가 있다).

---

## 파일 구조

| 파일 | 책임 | 태스크 |
|---|---|---|
| `js/duel/rps.js` | 가위바위보 판정 — 순수 | 1 |
| `js/duel/shells.js` | 그릇 섞기 시퀀스·추적 — 순수 | 2 |
| `js/duel/truce.js` | 휴전 유효기간 — 순수, 클라·서버 공유 | 3 |
| `functions/api/night-visit.js` | 휴전 입력·상한 검증 (수정) | 4 |
| `js/night-visit.js` | 휴전을 판정 요청에 싣기 (수정) | 4 |
| `js/game.js` | 흔적 `crop` 보존 · `night` 세이브 필드 · `setDuelSource` 훅 (수정) | 5 |
| `sims/duel-sim.html` | 🐗🦝 조형 시안 비교 | 6 |
| `js/duel/art.js` | 🐗🦝 저폴리 모델 | 6 |
| `index.html` | 대결 오버레이 마크업·CSS (수정) | 8 |
| `js/duel/ui.js` | 오버레이 조작 | 8 |
| `js/duel/stage.js` | 카메라 클로즈업·등장 연출·가림 처리 | 9 |
| `js/duel/index.js` | 흐름 오케스트레이션·트래킹 | 10 |
| `js/i18n-en.js` | 영어 사전 등재 (수정) | 10 |
| `tests/duel.test.mjs` | 순수 모듈 3종 + 서버 동물 선택 | 1·2·3·4 |

**의존 방향**: `index.js` → (`rps`·`shells`·`ui`·`stage`). `stage` → `art`. 순수 모듈 3종은 아무것도 import 하지 않는다.

---

## Task 1: 가위바위보 판정 (순수)

**Files:**
- Create: `js/duel/rps.js`
- Create: `tests/duel.test.mjs`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `HANDS: ['rock', 'scissors', 'paper']`
  - `RPS_WIN = 2`
  - `rollHand(r: number) → 'rock'|'scissors'|'paper'` — `r` 은 0 이상 1 미만
  - `judge(mine: string, theirs: string) → 'win'|'lose'|'draw'`
  - `initMatch() → { wins: 0, losses: 0, rounds: 0, done: false, won: false }`
  - `applyRound(m: Match, result: 'win'|'lose'|'draw') → Match` (새 객체)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/duel.test.mjs` 를 새로 만든다.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDS, RPS_WIN, rollHand, judge, initMatch, applyRound } from '../js/duel/rps.js';

// ── 🐗 가위바위보 ───────────────────────────────────────────
test('rollHand: 0~1 을 세 손에 고르게 가른다', () => {
  assert.equal(rollHand(0), 'rock');
  assert.equal(rollHand(0.34), 'scissors');
  assert.equal(rollHand(0.67), 'paper');
  assert.equal(rollHand(0.999), 'paper', '상한에서 배열 밖으로 나가지 않는다');
});

test('judge: 바위>가위>보>바위', () => {
  assert.equal(judge('rock', 'scissors'), 'win');
  assert.equal(judge('scissors', 'paper'), 'win');
  assert.equal(judge('paper', 'rock'), 'win');
  assert.equal(judge('scissors', 'rock'), 'lose');
  assert.equal(judge('rock', 'rock'), 'draw');
});

test('2승 하면 즉시 끝난다 — 3판을 다 치르지 않는다', () => {
  let m = initMatch();
  m = applyRound(m, 'win');
  assert.equal(m.done, false, '1승은 아직');
  m = applyRound(m, 'win');
  assert.equal(m.done, true);
  assert.equal(m.won, true);
  assert.equal(m.rounds, 2, '두 판만 치렀다');
});

test('2패 하면 진다', () => {
  const m = applyRound(applyRound(initMatch(), 'lose'), 'lose');
  assert.equal(m.done, true);
  assert.equal(m.won, false);
});

test('비김은 판수에 들지 않는다 — 그 판은 다시 낸다', () => {
  const m = applyRound(initMatch(), 'draw');
  assert.equal(m.rounds, 0, '비긴 판은 세지 않는다');
  assert.equal(m.wins, 0);
  assert.equal(m.losses, 0);
  assert.equal(m.done, false);
});

test('applyRound 는 인자를 변형하지 않는다', () => {
  const m0 = initMatch();
  const m1 = applyRound(m0, 'win');
  assert.equal(m0.wins, 0, '원본은 그대로');
  assert.notEqual(m0, m1, '새 객체를 돌려준다');
});

test('끝난 판에 더 내도 결과가 바뀌지 않는다', () => {
  const won = applyRound(applyRound(initMatch(), 'win'), 'win');
  const after = applyRound(won, 'lose');
  assert.equal(after.won, true);
  assert.equal(after.rounds, 2);
});

test('상대 수가 한쪽으로 치우치지 않는다', () => {
  const count = { rock: 0, scissors: 0, paper: 0 };
  for (let i = 0; i < 3000; i++) count[rollHand(i / 3000)]++;
  for (const h of HANDS) {
    assert.ok(count[h] > 900 && count[h] < 1100, `${h} 가 ${count[h]} 번 — 균등에서 벗어났다`);
  }
});

test('RPS_WIN 은 2 — 2선승제', () => assert.equal(RPS_WIN, 2));
```

- [ ] **Step 2: 실패를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: FAIL — `Cannot find module '../js/duel/rps.js'`

- [ ] **Step 3: 최소 구현을 쓴다**

`js/duel/rps.js`:

```js
// =============================================================
//  calm forest · 🐗 멧돼지 기싸움 — 가위바위보 판정 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 순수 운이다. 버릇·힌트를 넣지 않는다 — 관찰로 이길 여지를 주면
//    🦝 그릇 섞기(관찰·추적)와 축이 겹친다. 멧돼지 쪽은 배짱이다.
//  ▶ 리롤 방지는 이 모듈의 일이 아니다. 대결 진입 때 흔적을 소모하므로
//    상대 수가 클라이언트 난수여도 다시 굴릴 기회 자체가 없다.
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 이기는 순서대로 — HANDS[i] 는 HANDS[i+1] 을 이긴다(순환) */
export const HANDS = ['rock', 'scissors', 'paper'];

/** 먼저 2승 */
export const RPS_WIN = 2;

/** 0 이상 1 미만 난수 → 손. 상한에서 배열 밖으로 나가지 않게 자른다 */
export function rollHand(r) {
  return HANDS[Math.min(HANDS.length - 1, Math.floor(r * HANDS.length))];
}

/** 내 손 기준 판정 */
export function judge(mine, theirs) {
  if (mine === theirs) return 'draw';
  // 바로 다음 칸을 이긴다: rock→scissors→paper→rock
  return HANDS[(HANDS.indexOf(mine) + 1) % HANDS.length] === theirs ? 'win' : 'lose';
}

export function initMatch() {
  return { wins: 0, losses: 0, rounds: 0, done: false, won: false };
}

/** 한 판 반영 — 새 객체를 돌려준다(원본 불변) */
export function applyRound(m, result) {
  if (m.done) return { ...m };
  if (result === 'draw') return { ...m };          // 비긴 판은 판수에 안 든다
  const wins = m.wins + (result === 'win' ? 1 : 0);
  const losses = m.losses + (result === 'lose' ? 1 : 0);
  const done = wins >= RPS_WIN || losses >= RPS_WIN;
  return { wins, losses, rounds: m.rounds + 1, done, won: done && wins >= RPS_WIN };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: PASS — 9 tests

- [ ] **Step 5: 커밋**

```bash
git add js/duel/rps.js tests/duel.test.mjs
git commit -m "feat: 🐗 가위바위보 2선승 판정 — 비긴 판은 판수에 넣지 않는다"
```

---

## Task 2: 그릇 섞기 (순수)

**Files:**
- Create: `js/duel/shells.js`
- Modify: `tests/duel.test.mjs` (import 블록 교체 + 테스트 추가)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SHELL_COUNT = 3`
  - `SHELL_ROUNDS: [{ swaps: 4, ms: 450 }, { swaps: 6, ms: 380 }, { swaps: 8, ms: 320 }]`
  - `makeSwaps(n: number, rolls: number[]) → [number, number][]`
  - `finalPos(start: number, swaps: [number, number][]) → number`
  - `initMatch() → { round: 0, done: false, won: false }`
  - `applyRound(m: Match, correct: boolean) → Match` (새 객체)

**⚠️ 이름 충돌**: `rps.js` 와 `shells.js` 가 둘 다 `initMatch`·`applyRound` 를 export 한다. 테스트와 `js/duel/index.js` 에서 **반드시 별칭으로 import** 한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

먼저 `tests/duel.test.mjs` 의 import 블록(3번째 줄)을 아래로 교체한다.

```js
import { HANDS, RPS_WIN, rollHand, judge,
         initMatch as rpsInit, applyRound as rpsRound } from '../js/duel/rps.js';
import { SHELL_COUNT, SHELL_ROUNDS, makeSwaps, finalPos,
         initMatch as shellInit, applyRound as shellRound } from '../js/duel/shells.js';
```

Task 1 이 쓴 테스트 본문에서 `initMatch()` → `rpsInit()`, `applyRound(` → `rpsRound(` 로 모두 바꾼다.

이어서 파일 끝에 붙인다.

```js
// ── 🦝 그릇 섞기 ───────────────────────────────────────────
test('바가지는 3개 · 3판이고 판이 갈수록 빨라진다', () => {
  assert.equal(SHELL_COUNT, 3);
  assert.equal(SHELL_ROUNDS.length, 3);
  assert.deepEqual(SHELL_ROUNDS.map(r => r.swaps), [4, 6, 8]);
  for (let i = 1; i < SHELL_ROUNDS.length; i++) {
    assert.ok(SHELL_ROUNDS[i].ms < SHELL_ROUNDS[i - 1].ms, '뒤 판이 더 빠르다');
  }
});

test('finalPos: 스왑을 차례로 적용한 자리를 낸다', () => {
  assert.equal(finalPos(0, [[0, 1]]), 1);
  assert.equal(finalPos(1, [[0, 1]]), 0);
  assert.equal(finalPos(2, [[0, 1]]), 2, '나와 무관한 스왑은 자리를 안 바꾼다');
  assert.equal(finalPos(0, [[0, 1], [1, 2]]), 2, '따라가며 옮겨간다');
  assert.equal(finalPos(0, [[0, 1], [0, 1]]), 0, '같은 스왑 두 번이면 제자리');
});

test('makeSwaps: 요청한 횟수만큼, 늘 서로 다른 두 자리', () => {
  const rolls = Array.from({ length: 8 }, (_, i) => (i * 0.37) % 1);
  const sw = makeSwaps(8, rolls);
  assert.equal(sw.length, 8);
  for (const [a, b] of sw) {
    assert.notEqual(a, b, '자기 자신과는 바꾸지 않는다');
    assert.ok(a >= 0 && a < SHELL_COUNT && b >= 0 && b < SHELL_COUNT);
  }
});

test('makeSwaps: 같은 쌍이 연달아 나오지 않는다 — 되감기면 눈이 속지 않는다', () => {
  const rolls = Array.from({ length: 20 }, () => 0);   // 최악의 입력: 늘 첫 후보
  const sw = makeSwaps(20, rolls);
  for (let i = 1; i < sw.length; i++) {
    assert.notDeepEqual(sw[i], sw[i - 1], `${i}번째가 직전과 같은 쌍이다`);
  }
});

test('makeSwaps: 같은 rolls 면 같은 시퀀스 (재현 가능)', () => {
  const rolls = [0.1, 0.9, 0.5, 0.3];
  assert.deepEqual(makeSwaps(4, rolls), makeSwaps(4, rolls));
});

test('3판 전승이어야 이긴다', () => {
  let m = shellInit();
  m = shellRound(m, true);
  assert.equal(m.done, false, '1판만으론 안 끝난다');
  m = shellRound(m, true);
  assert.equal(m.done, false);
  m = shellRound(m, true);
  assert.equal(m.done, true);
  assert.equal(m.won, true);
  assert.equal(m.round, 3);
});

test('한 판이라도 틀리면 그 자리에서 진다', () => {
  const m = shellRound(shellRound(shellInit(), true), false);
  assert.equal(m.done, true);
  assert.equal(m.won, false);
  assert.equal(m.round, 2, '틀린 판까지 세고 멈춘다');
});

test('shells: applyRound 는 인자를 변형하지 않는다', () => {
  const m0 = shellInit();
  const m1 = shellRound(m0, true);
  assert.equal(m0.round, 0);
  assert.notEqual(m0, m1);
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: FAIL — `Cannot find module '../js/duel/shells.js'`

- [ ] **Step 3: 최소 구현을 쓴다**

`js/duel/shells.js`:

```js
// =============================================================
//  calm forest · 🦝 너구리 그릇 섞기 — 시퀀스·추적 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 관찰·추적 게임이다. 🐗 가위바위보(운·배짱)와 축을 갈라둔다.
//  ▶ 난이도는 **섞기 속도(ms)로만** 조절한다. 횟수와 속도를 같이 흔들면
//    어느 쪽이 어려웠는지 지표로 가를 수 없다(fireScore·COURSE_MULT 와 같은 규칙).
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 바가지 개수 */
export const SHELL_COUNT = 3;

/** 판별 섞기 횟수·한 번에 걸리는 시간(ms). 3판 전승이어야 이긴다 */
export const SHELL_ROUNDS = [
  { swaps: 4, ms: 450 },
  { swaps: 6, ms: 380 },
  { swaps: 8, ms: 320 },
];

/** 3개짜리에서 가능한 자리 맞바꿈 전부 */
const PAIRS = [[0, 1], [1, 2], [0, 2]];

/**
 * 섞기 순서를 만든다.
 * rolls[i] 는 0 이상 1 미만. 같은 rolls 면 같은 시퀀스가 나온다(재현 가능).
 * ⚠️ 직전과 **같은 쌍을 연달아 내지 않는다** — 같은 둘이 두 번 자리를 바꾸면
 *    제자리로 돌아와, 보는 사람에겐 아무 일도 없던 것처럼 보인다.
 */
export function makeSwaps(n, rolls = []) {
  const out = [];
  let prev = -1;
  for (let i = 0; i < n; i++) {
    const others = PAIRS.map((_, k) => k).filter(k => k !== prev);
    const r = Number(rolls[i]) || 0;
    const k = others[Math.min(others.length - 1, Math.floor(r * others.length))];
    out.push(PAIRS[k]);
    prev = k;
  }
  return out;
}

/** 시작 자리에서 스왑을 차례로 맞으면 어디에 있나 — 판정의 근간 */
export function finalPos(start, swaps = []) {
  let p = start;
  for (const [a, b] of swaps) {
    if (p === a) p = b;
    else if (p === b) p = a;
  }
  return p;
}

export function initMatch() {
  return { round: 0, done: false, won: false };
}

/** 한 판 반영 — 틀리면 그 자리에서 끝. 새 객체를 돌려준다 */
export function applyRound(m, correct) {
  if (m.done) return { ...m };
  const round = m.round + 1;
  if (!correct) return { round, done: true, won: false };
  const done = round >= SHELL_ROUNDS.length;
  return { round, done, won: done };
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: PASS — 17 tests (Task 1 의 9개 + 8개)

- [ ] **Step 5: 커밋**

```bash
git add js/duel/shells.js tests/duel.test.mjs
git commit -m "feat: 🦝 그릇 섞기 시퀀스·추적 — 같은 쌍을 연달아 내지 않는다"
```

---

## Task 3: 휴전 유효기간 (순수 · 클라·서버 공유)

**Files:**
- Create: `js/duel/truce.js`
- Modify: `tests/duel.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `TRUCE_NIGHTS = 2`
  - `DUEL_ANIMALS: ['boar', 'raccoon']`
  - `addDays(date: 'YYYY-MM-DD', n: number) → 'YYYY-MM-DD'`
  - `truceUntil(today: string, nights?: number) → string` — 오늘 기준 만료일
  - `truceActive(until: string, today: string) → boolean`
  - `blockedAnimals(truce: object, today: string) → string[]`

**날짜 기준**: 클라이언트가 보낸 `date` 를 서버가 그대로 쓴다. 기존 밤손님 판정이 이미 `body.date` 를 기준으로 삼으므로 같은 규칙이다 — 서버가 제 UTC 날짜를 따로 계산하지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/duel.test.mjs` 상단 import 에 한 줄 추가한다.

```js
import { TRUCE_NIGHTS, DUEL_ANIMALS, addDays, truceUntil, truceActive, blockedAnimals } from '../js/duel/truce.js';
```

파일 끝에 붙인다.

```js
// ── 🤝 발길 끊기 ───────────────────────────────────────────
test('휴전은 2밤 — 서버가 재는 상한과 같은 값', () => {
  assert.equal(TRUCE_NIGHTS, 2);
  assert.deepEqual(DUEL_ANIMALS, ['boar', 'raccoon']);
});

test('addDays: 달·해를 넘는다', () => {
  assert.equal(addDays('2026-09-21', 2), '2026-09-23');
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-09-21', 0), '2026-09-21');
});

test('truceUntil: 오늘 이긴 값은 오늘+2', () => {
  assert.equal(truceUntil('2026-09-21'), '2026-09-23');
});

test('오늘 이하로 만료된 휴전은 무효', () => {
  assert.equal(truceActive('2026-09-21', '2026-09-21'), false, '오늘까지면 오늘 밤은 이미 지났다');
  assert.equal(truceActive('2026-09-20', '2026-09-21'), false);
  assert.equal(truceActive('', '2026-09-21'), false, '빈 값');
  assert.equal(truceActive(null, '2026-09-21'), false, 'null');
});

test('내일·모레는 유효', () => {
  assert.equal(truceActive('2026-09-22', '2026-09-21'), true);
  assert.equal(truceActive('2026-09-23', '2026-09-21'), true);
});

test('상한 초과는 무효 — 세이브를 고쳐 1년 휴전을 만들 수 없다', () => {
  assert.equal(truceActive('2026-09-24', '2026-09-21'), false, '오늘+3');
  assert.equal(truceActive('2027-09-21', '2026-09-21'), false, '1년 뒤');
});

test('형식이 깨진 값은 무효 — 서버가 받는 입력이라 믿지 않는다', () => {
  assert.equal(truceActive('2026-9-22', '2026-09-21'), false, '0 채움 없음');
  assert.equal(truceActive('나중에', '2026-09-21'), false);
  assert.equal(truceActive('2026-09-22T00:00', '2026-09-21'), false);
});

test('blockedAnimals: 유효한 것만 막고, 두 동물은 서로 독립이다', () => {
  const today = '2026-09-21';
  assert.deepEqual(blockedAnimals({ boar: '2026-09-23', raccoon: null }, today), ['boar']);
  assert.deepEqual(blockedAnimals({ boar: '2026-09-20', raccoon: '2026-09-22' }, today), ['raccoon'],
    '만료된 멧돼지는 풀리고 너구리만 남는다');
  assert.deepEqual(blockedAnimals({ boar: '2026-09-22', raccoon: '2026-09-23' }, today), ['boar', 'raccoon']);
  assert.deepEqual(blockedAnimals({}, today), []);
  assert.deepEqual(blockedAnimals(null, today), [], '아예 없는 세이브(옛 판)');
  assert.deepEqual(blockedAnimals({ bear: '2026-09-23' }, today), [], '모르는 동물은 무시');
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: FAIL — `Cannot find module '../js/duel/truce.js'`

- [ ] **Step 3: 최소 구현을 쓴다**

`js/duel/truce.js`:

```js
// =============================================================
//  calm forest · 🤝 발길 끊기 — 유효기간 (순수)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ ⚠️ 이 파일은 **브라우저와 Cloudflare Worker 양쪽이 import 한다**
//    (functions/api/night-visit.js). 만료 규칙이 두 곳에 흩어지면 어긋나는 날이 온다.
//    그래서 DOM·THREE·Node API 를 쓰지 않는다 — 순수 ESM 만.
//  ▶ 날짜는 **클라이언트가 보낸 date 기준**이다. 기존 밤손님 판정이 이미
//    body.date 로 도는 것과 같은 규칙이라, 서버가 제 UTC 날짜를 따로 재지 않는다.
//  ▶ 서버가 상한(TRUCE_NIGHTS)을 강제하므로, 세이브를 고쳐도 최대 2밤이다.
//  ▶ 테스트: node --test tests/duel.test.mjs
// =============================================================

/** 이기면 그 동물이 쉬는 밤 수 — 서버가 재는 상한과 같은 값이어야 한다 */
export const TRUCE_NIGHTS = 2;

/** 대결 상대 — 밤손님 판정의 animal 과 같은 키 */
export const DUEL_ANIMALS = ['boar', 'raccoon'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' + n일. UTC 로 계산해 서머타임·시간대에 흔들리지 않게 한다 */
export function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 오늘 이겼을 때 찍을 만료일 */
export function truceUntil(today, nights = TRUCE_NIGHTS) {
  return addDays(today, nights);
}

/**
 * 이 만료일이 오늘 밤에 유효한가.
 * 오늘 이하면 이미 지났고, 오늘+TRUCE_NIGHTS 를 넘으면 상한 초과다.
 * 형식이 깨진 값은 전부 무효 — 서버가 받는 입력이라 믿지 않는다.
 */
export function truceActive(until, today) {
  if (typeof until !== 'string' || !DATE_RE.test(until)) return false;
  if (typeof today !== 'string' || !DATE_RE.test(today)) return false;
  return until > today && until <= addDays(today, TRUCE_NIGHTS);
}

/** 오늘 밤 오지 않는 동물들 */
export function blockedAnimals(truce, today) {
  if (!truce || typeof truce !== 'object') return [];
  return DUEL_ANIMALS.filter(a => truceActive(truce[a], today));
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: PASS — 25 tests

- [ ] **Step 5: 커밋**

```bash
git add js/duel/truce.js tests/duel.test.mjs
git commit -m "feat: 🤝 발길 끊기 유효기간 — 클라·서버가 같은 규칙을 쓴다"
```

---

## Task 4: 서버 판정에 휴전을 반영한다

**Files:**
- Modify: `functions/api/night-visit.js`
- Modify: `js/night-visit.js`
- Modify: `tests/duel.test.mjs`

**Interfaces:**
- Consumes: `blockedAnimals` (Task 3)
- Produces:
  - `pickAnimal(roll: number, blocked: string[]) → 'boar'|'raccoon'|null` — `functions/api/night-visit.js` 에서 export
  - 서버 응답에 `{ visited: false, reason: 'truce', truce: true }` 가 추가된다
  - `js/night-visit.js` 의 요청 body 에 `truce` 가 실리고, `normalizeVerdict` 가 `truce: boolean` 을 돌려준다

**왜 `pickAnimal` 을 따로 빼는가** — 휴전이 끼면서 동물 선택에 분기가 생긴다. HMAC·fetch 에 묶인 `onRequestPost` 는 테스트하기 어려우므로 판단 부분만 순수 함수로 꺼낸다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/duel.test.mjs` 상단 import 에 추가한다.

```js
import { pickAnimal } from '../functions/api/night-visit.js';
```

파일 끝에 붙인다.

```js
// ── 🌙 서버 판정의 동물 선택 ────────────────────────────────
test('pickAnimal: 아무도 안 막혔으면 난수대로', () => {
  assert.equal(pickAnimal(0.2, []), 'raccoon');
  assert.equal(pickAnimal(0.8, []), 'boar');
});

test('pickAnimal: 막힌 동물이 뽑히면 남은 쪽으로 넘긴다', () => {
  assert.equal(pickAnimal(0.8, ['boar']), 'raccoon', '멧돼지가 쉬면 너구리가 온다');
  assert.equal(pickAnimal(0.2, ['raccoon']), 'boar');
});

test('pickAnimal: 안 막힌 쪽이 뽑히면 그대로 둔다', () => {
  assert.equal(pickAnimal(0.2, ['boar']), 'raccoon');
  assert.equal(pickAnimal(0.8, ['raccoon']), 'boar');
});

test('pickAnimal: 둘 다 막히면 null — 그 밤은 아무도 안 온다', () => {
  assert.equal(pickAnimal(0.2, ['boar', 'raccoon']), null);
  assert.equal(pickAnimal(0.8, ['boar', 'raccoon']), null);
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: FAIL — `The requested module '../functions/api/night-visit.js' does not provide an export named 'pickAnimal'`

- [ ] **Step 3: 서버에 순수 함수를 넣는다**

`functions/api/night-visit.js` 맨 위 주석 블록 **바로 아래**에 import 를 추가한다.

```js
import { blockedAnimals } from '../../js/duel/truce.js';
```

`ANIMALS` 상수 **바로 아래**에 추가한다.

```js
/**
 * 오늘 밤 올 동물을 고른다.
 * 🤝 휴전 중인 동물이 뽑히면 남은 쪽으로 넘기고, 둘 다 쉬면 아무도 안 온다.
 * (테스트: node --test tests/duel.test.mjs)
 */
export function pickAnimal(roll, blocked = []) {
  const first = roll < 0.5 ? 'raccoon' : 'boar';
  const other = first === 'raccoon' ? 'boar' : 'raccoon';
  if (!blocked.includes(first)) return first;
  if (!blocked.includes(other)) return other;
  return null;
}
```

- [ ] **Step 4: 통과를 확인한다**

```bash
node --test tests/duel.test.mjs
```

Expected: PASS — 29 tests

- [ ] **Step 5: `onRequestPost` 가 휴전을 읽게 한다**

입력 정규화부의 `const fence = ...` 줄 **바로 아래**에 추가한다.

```js
  // 🤝 발길 끊기 — 대결에서 이긴 동물은 며칠 쉰다. 상한은 truce.js 가 강제한다.
  const blocked = blockedAnimals(body?.truce, date);
```

동물 선택 줄

```js
  const animal = rollAnimal < 0.5 ? 'raccoon' : 'boar';
```

을 아래로 교체한다.

```js
  const animal = pickAnimal(rollAnimal, blocked);
  if (!animal) {
    // 두 동물 다 휴전 — 방어 성공과 구분해 내려준다(클라이언트가 "약속을 지켰어요" 라고 말할 수 있게)
    return new Response(JSON.stringify({ visited: false, reason: 'truce', truce: true }), { headers });
  }
```

- [ ] **Step 6: 클라이언트 어댑터가 휴전을 싣게 한다**

`js/night-visit.js` 의 `setNightVisitSource` 콜백 안 `body: JSON.stringify({...})` 를 아래로 교체한다.

```js
        body: JSON.stringify({ uid, date: ctx.date, nights: ctx.nights, plots: ctx.plots,
                               defense: ctx.defense, truce: ctx.truce }),
```

같은 파일 `normalizeVerdict` 의 반환 객체에 한 줄 추가한다(휴전으로 조용한 밤을 클라이언트가 구분할 수 있게).

```js
    truce: v.truce === true,
```

- [ ] **Step 7: 전체 테스트**

```bash
npm test
```

Expected: 기존 테스트 전부 + duel 29개 통과

- [ ] **Step 8: 커밋**

```bash
git add functions/api/night-visit.js js/night-visit.js tests/duel.test.mjs
git commit -m "feat: 🌙 휴전 중인 동물은 밤에 오지 않는다 — 상한은 서버가 잰다"
```

---

## Task 5: game.js 확장점과 세이브 필드

**Files:**
- Modify: `js/game.js` — 세이브 기본값(1306 부근) · 복원(2832 부근) · 밤손님 블록(12719~12870) · import(39 부근)

**Interfaces:**
- Consumes: `truceUntil` (Task 3)
- Produces (Task 10 의 `js/duel/index.js` 가 쓴다):
  - `setDuelSource(fn)` — `fn: async (ctx) => boolean`. `true` 를 돌려주면 이긴 것.
    - `ctx = { animal: 'boar'|'raccoon', x, z, crops: string[], stage: { THREE, scene, camera, player } }`
    - `crops` 는 그 동물이 오늘 가져간 작물 id 목록(빈 문자열이면 일반 작물)
  - `gameState.night.truce = { boar: null, raccoon: null }`
  - `gameState.night.duelDate: string|null` · `gameState.night.duelDone: string[]`
  - 흔적 데이터에 `crop: string` 이 실린다

- [ ] **Step 1: 쓸 심볼이 그대로 있는지 확인한다**

계획을 쓰며 확인해둔 것 — 달라졌으면 실제 코드를 따른다.

```bash
grep -n "ADV_CROPS\|isAdv" js/game.js | head -3 && grep -n "export function isAdv" js/farm-crops.js
```

확인된 사실:
- **`CROPS` 라는 배열은 없다.** 일반 작물은 `CROP_TYPES`(game.js:75), 고급 작물은 `ADV_CROPS`(`js/farm-crops.js:22` — 밀·옥수수·포도 3종).
- `isAdv(crop)` 는 **작물 객체**를 받아 `crop.adv` 를 본다(`js/farm-crops.js:32`). id 로는 못 부른다.
- **`ADV_CROPS` 는 game.js 가 이미 import 하고 있다**(51행). 추가 import 가 필요 없다.
- `refreshInventoryUI()` 는 game.js:15881 에 있다.

따라서 Step 5 의 회수 분기는 **고급 작물 id 목록에 있는지만 보면 된다** — `isAdv` 를 쓸 필요가 없다.

- [ ] **Step 2: 세이브 기본값과 복원을 고친다**

`js/game.js:1306` 의 `night:` 줄을 아래로 교체한다.

```js
  // 🦝 밤손님 { 마지막 판정일(YYYY-MM-DD), 조사 안 한 흔적 [{x,z,animal,loot,crop}],
  //            🤝 발길 끊기 만료일, 오늘 대결한 동물 }
  night: { lastDate: null, traces: [], truce: { boar: null, raccoon: null }, duelDate: null, duelDone: [] },
```

`js/game.js:2832` 의 복원 줄을 아래로 교체한다. `truce` 는 **중첩 객체라 전개만으로는 안 채워진다.**

```js
  if (saved.night) {
    gameState.night = { lastDate: null, traces: [], duelDate: null, duelDone: [], ...saved.night,
                        truce: { boar: null, raccoon: null, ...(saved.night.truce || {}) } };
  }
```

- [ ] **Step 3: 흔적에 작물 종류를 보존한다**

`resolveNightVisit()` 의 도난 루프를 아래로 교체한다. **`clearCrop()` 이 `cropType` 을 지우므로 그 전에 id 를 잡아야 한다.**

```js
  for (const i of (v.stolenIdx || [])) {
    const c = cands[i]; if (!c) continue;
    const cropId = c.p.cropType?.id || '';        // ⚠️ clearCrop 전에 잡아둔다 — 되찾을 때 이게 없으면 뭘 줄지 모른다
    stolen.push(c.p.cropType?.name || '작물');
    clearCrop(c.p);
    c.p.state = 'empty'; c.p.growth = 0; c.p.stage = -1; c.p.watered = false;
    updatePlotVisual(c.p);
    const t = { x: c.p.x, z: c.p.z, animal: v.animal, loot: v.loot, crop: cropId };
    st.traces.push(t); spawnTrace(t);
  }
```

- [ ] **Step 4: 휴전을 판정에 싣고, 조용한 밤을 안내한다**

`nightFetcher({...})` 호출을 아래로 교체한다.

```js
    v = await nightFetcher({
      date: today, nights,
      plots: cands.map(c => ({ crop: c.p.cropType?.id || '' })),
      defense: computeNightDefense(cands),
      truce: st.truce,                       // 🤝 대결에서 이긴 동물은 며칠 쉰다(상한은 서버가 잰다)
    });
```

`if (!v.visited) { ... }` 블록을 아래로 교체한다.

```js
  if (!v.visited) {
    // 🤝 휴전으로 조용한 밤은 방어 성공과 다르게 말한다 — 어제 이긴 보람이 보여야 한다
    if (v.truce) setTimeout(() => ui.toast?.('🤝 어제 이긴 숲 친구가 약속을 지켜 오지 않았어요', 2800), 900);
    else if (v.defended) setTimeout(() => ui.toast?.('🎃 허수아비와 울타리가 밤새 밭을 지켰어요!', 2800), 900);
    requestSave();
    return;
  }
```

- [ ] **Step 5: 확장점과 대결 진입을 만든다**

`setNightNoteSource` 정의 **바로 아래**에 추가한다.

```js
let duelFetcher = null;   // async (ctx) => boolean — js/duel/index.js 가 등록. true 면 이겼다
/** 🐗🦝 대결 등록 — 안 끼우면 흔적 조사는 지금까지처럼 조사 보상만 주고 끝난다(기능 플래그 겸용) */
export function setDuelSource(fn) { duelFetcher = fn || null; }
```

`investigateTrace(tr)` 의 마지막 줄 `requestSave();` 뒤에 한 줄을 더한다.

```js
  requestSave();       // ← 대결 전에 저장한다(리롤 방지의 핵심: 흔적은 이미 지워졌고 보상은 이미 줬다)
  maybeDuel(t);
```

그리고 `investigateTrace` **바로 아래**에 두 함수를 추가한다.

```js
// 🐗🦝 대결 — 하루에 동물당 한 번. 이기면 그 동물이 가져간 작물을 전부 되찾는다.
//   ▶ 흔적 보상을 먼저 주고 흔적을 지운 **뒤**에 연다. 새로고침해도 흔적이 없어
//     다시 못 하고(리롤 방지), 중간에 창을 닫아도 손해가 없다.
function maybeDuel(t) {
  if (!duelFetcher) return;                              // 등록 전이면 지금까지 동작 그대로
  const st = gameState.night, today = todayStr();
  if (st.duelDate !== today) { st.duelDate = today; st.duelDone = []; }   // 날이 바뀌면 비운다
  if (st.duelDone.includes(t.animal)) return;            // 오늘 이 동물과는 이미 붙었다
  st.duelDone = [...st.duelDone, t.animal];
  // 그 동물이 오늘 가져간 작물 전부 — 방금 조사한 것 + 아직 조사 안 한 흔적
  const crops = [t.crop || '', ...st.traces.filter(x => x.animal === t.animal).map(x => x.crop || '')];
  requestSave();
  duelFetcher({ animal: t.animal, x: t.x, z: t.z, crops, stage: { THREE, scene, camera, player } })
    .then(won => { if (won) winDuel(t.animal, crops); requestSave(); })
    .catch(e => console.warn('[대결] 진행 실패 — 오늘은 넘어간다', e?.message || e));
}

// 승리 — 작물 회수(tryHarvest 와 같은 지급 규칙) + 🤝 발길 끊기
//   밭은 되살리지 않는다: 성장 단계까지 복원하면 도난이 없던 일이 되고 다시 심을 이유가 사라진다.
function winDuel(animal, crops) {
  for (const id of crops) {
    // 🌾 고급 작물(밀·옥수수·포도)은 종류별 인벤 키, 나머지는 crop — tryHarvest 와 같은 규칙.
    //    씨앗은 주지 않는다: 수확이 아니라 회수다. 옛 세이브의 빈 crop('')은 일반 작물로 본다.
    if (id && ADV_CROPS.some(c => c.id === id)) gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
    else gameState.inventory.crop = (gameState.inventory.crop || 0) + 1;
  }
  gameState.night.truce = { ...gameState.night.truce, [animal]: truceUntil(todayStr()) };
  refreshInventoryUI();
  const a = NIGHT_ANIMAL[animal] || NIGHT_ANIMAL.raccoon;
  ui.toast?.(`${a.ico} ${a.name}에게서 작물 ${crops.length}개를 되찾았어요! 당분간 안 올 거예요`, 3600);
}
```

`ADV_CROPS` 는 game.js 가 이미 import 하고 있으므로(51행) 따로 들여올 것이 없다.

- [ ] **Step 6: 검수용 dev 훅을 만든다 (Task 8·9·11 이 이것 없이는 막힌다)**

⚠️ **왜 필요한가** — 밤손님 판정은 `HMAC(시크릿, uid:date)` 결정값이라 **같은 날 같은 유저면 몇 번을 불러도 결과가 같다.** 그게 리롤 방지의 근거지만, 동시에 `__nightTest()` 를 반복해도 흔적이 새로 생기지 않는다는 뜻이다. 오늘 안 털리는 계정으로는 대결을 한 번도 볼 수 없어 실측 태스크가 전부 막힌다.

`__nightTest` 를 등록하는 자리(2579~2582 부근, `?dbg` 전용 블록)에 한 훅을 더 단다.

```js
    // 🐗🦝 대결 검수 — 서버 판정을 건너뛰고 흔적을 직접 심는다.
    //   판정이 HMAC(uid:date) 결정값이라 __nightTest 를 반복해도 오늘 결과는 안 바뀐다.
    //   animal: 'boar' | 'raccoon'
    window.__nightForce = (animal = 'boar') => {
      const p = plots.find(x => x.state === 'growing' || x.state === 'mature') || plots[0];
      if (!p) return '밭이 없다';
      const t = { x: p.x, z: p.z, animal, loot: animal === 'boar' ? 'acorn_drop' : 'fur_tuft', crop: p.cropType?.id || '' };
      gameState.night.traces.push(t); spawnTrace(t);
      gameState.night.duelDate = null; gameState.night.duelDone = [];   // 오늘 이미 붙었어도 다시 볼 수 있게
      return `${animal} 흔적을 (${p.x}, ${p.z}) 에 심었다 — 가서 조사하세요`;
    };
```

이 훅은 **세이브를 건드린다**(흔적 추가·`duelDone` 비움). `?dbg=1` 전용 블록 안에 두어 일반 유저 경로에 노출되지 않게 한다.

- [ ] **Step 7: import 를 추가한다**

`js/game.js` 상단 import 블록(39행 `visitor-art.js` 부근)에 추가한다.

```js
import { truceUntil } from './duel/truce.js';                                                        // 🤝 발길 끊기 만료일
```

- [ ] **Step 8: 문법·회귀 확인**

```bash
node --check js/game.js && npm test
```

Expected: 문법 오류 없음 · 기존 테스트 전부 통과

- [ ] **Step 9: 브라우저에서 확인한다**

`.claude/launch.json` 에 이 프로젝트 항목이 있는지 본다. 없으면 `scripts/serve.py` 가 쓰는 포트로 만든다.

```bash
grep -n "port\|PORT" scripts/serve.py | head -5
```

preview 를 띄우고 게임에 **실제로 입장**한다(`body.playing` 을 손으로 씌우면 미니맵이 빈 채로 뜬다). 콘솔에서:

```js
__nightTest()
```

어젯밤이 지난 셈 치고 재판정한다. 흔적이 생기면 다가가 조사하고 확인한다:

```js
getGameState().night   // duelDate 가 오늘, duelDone 에 동물이 들어있다
```

`duelFetcher` 가 아직 없으므로 대결은 안 열린다 — **이게 정상이다.** 콘솔 오류가 없어야 한다.

- [ ] **Step 10: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🐾 흔적에 작물을 기억시키고 🐗🦝 대결 확장점을 연다"
```

---

## Task 6: 🐗🦝 조형 — 시안 3개 비교 후 확정

**Files:**
- Create: `sims/duel-sim.html`
- Create: `js/duel/art.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `makeBoar(THREE) → THREE.Group` — 발치가 y=0, 앞면이 −Z 를 본다
  - `makeRaccoon(THREE) → THREE.Group` — 같은 규약
  - `DUEL_ART_H = { boar: number, raccoon: number }` — 모델 높이(Task 9 의 카메라 프레이밍용)

**⚠️ 이 태스크는 사용자 승인 게이트다.** 시안을 비교받기 전에는 `js/duel/art.js` 를 확정하지 않는다.

- [ ] **Step 1: 선례를 읽는다**

```bash
sed -n 1,80p sims/farm-barn-sim.html
```

창고·쉼터 리디자인 때 시안 3안을 나란히 렌더해 비교한 파일이다. 조명·카메라·배경 설정을 그대로 가져온다.

- [ ] **Step 2: 시안 3개씩 만든다**

`sims/duel-sim.html` 에 멧돼지 3안·너구리 3안을 나란히 놓는다. 지킬 것:

- **부속을 꽂지 말고 형태로 승격한다.** 엄니·갈기를 덩어리에 붙이는 대신, 어깨 덩어리를 높이고 머리를 낮춰 **실루엣으로** 멧돼지가 되게 한다.
- **저폴리 · 플랫 셰이딩 · 아웃라인 없음**: `MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true })`.
- **정점 색으로 칠한다**(`paintGeo` 문법). 그림자 O/X 두 덩어리로 끝내는 것이 목표다.
- **촘촘한 반복을 피한다.** 털·점무늬를 작은 조각 수십 개로 만들지 않는다.
- 🐗 레퍼런스: 저폴리, 어두운 갈색, 굵은 목덜미, 낮은 머리, 짧은 다리.
- 🦝: 회색 몸, **검은 눈가 띠**, **줄무늬 꼬리**. 이 둘이 너구리를 너구리로 만든다 — 빼면 어떤 색을 써도 다른 동물이 된다.

- [ ] **Step 3: 캡처해서 나란히 비교받는다**

시뮬을 preview 로 띄우고 PC 폭·모바일 폭(375) 두 번 캡처해 사용자에게 보낸다. **어느 안인지 고르게 한다.** 승인 전에는 다음 스텝으로 넘어가지 않는다.

- [ ] **Step 4: 승인받은 안으로 `js/duel/art.js` 를 쓴다**

머리 주석에 스펙 경로와 "왜 이 형태인가"를 남긴다(`js/visitor-art.js` 의 주석 밀도를 따른다).

```js
// =============================================================
//  calm forest · 🐗🦝 밤손님 조형 2종
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 시안 3안씩 렌더해 비교한 뒤 고른 형태다(sims/duel-sim.html).
//  ▶ THREE 를 인자로 받는다 — visitor-art.js 와 같은 문법.
//  ▶ 발치가 y=0, 앞면이 −Z. 무대(js/duel/stage.js)가 이 규약을 믿고 회전시킨다.
// =============================================================
```

- [ ] **Step 5: 시뮬이 같은 코드를 그리게 한다**

`sims/duel-sim.html` 이 `js/duel/art.js` 를 import 하도록 고친다. **시뮬에만 있는 사본을 남기지 않는다** — 사본이 둘로 갈리면 시뮬에서 본 것과 게임이 달라진다.

- [ ] **Step 6: 커밋**

```bash
git add sims/duel-sim.html js/duel/art.js
git commit -m "feat: 🐗🦝 밤손님 조형 2종 — 시안 3안 비교 후 확정"
```

---

## Task 7: 문구 선검수

**Files:**
- Modify: `docs/superpowers/plans/2026-09-21-night-duel.md` (확정 문구를 이 자리에 덧쓴다)

**⚠️ 이 태스크는 사용자 승인 게이트다.** UI 를 만들기 전에 한국어 문구를 확정한다. 새 버튼·라벨은 후보를 먼저 검수받는 것이 이 저장소의 규칙이다.

**✅ 확정 (2026-09-21 사용자 승인)** — 아래 표가 최종이다. Task 8 의 `ui.js` 상단 `COPY` 와 Task 10 의 i18n 등재가 이 값을 그대로 쓴다.

**대결의 이름은 「승부」다.** "일기토"·"기싸움"을 쓰지 않는다 — 안내 문구·i18n 키·주석 어디에서도.

| 자리 | COPY 키 | 확정 문구 |
|---|---|---|
| 🐗 시작 배너 | `boarOpen` | 멧돼지가 길을 막아섰어요 |
| 🦝 시작 배너 | `raccoonOpen` | 너구리가 바가지 셋을 늘어놨어요 |
| 손 고르기 | `askHand` | 무엇을 낼까요? |
| 그릇 고르기 | `askShell` | 어느 바가지에 있을까요? |
| 한 판 승 | `win` | 이겼어요! |
| 한 판 패 | `lose` | 졌어요… |
| 비김 | `draw` | 비겼어요! 다시 |
| 최종 승 | `matchWin` | 되찾았어요! 당분간 안 올 거예요 |
| 최종 패 | `matchLose` | 놓쳤어요… 내일 다시 만나요 |
| 휴전 밤 토스트 | (game.js) | 🤝 어제 승부에서 진 친구가 오지 않았어요 |

**버튼은 이모지만 둔다** — ✊ ✌️ 🖐️. 라벨을 붙이면 모바일에서 버튼 3개가 좁아지고, 가위바위보는 이모지만으로 설명이 필요 없다. 다만 `aria-label` 에는 "바위"·"가위"·"보"를 넣는다(`COPY.rock`·`COPY.scissors`·`COPY.paper`).

⚠️ **game.js 의 휴전 토스트도 이 표에 맞춰야 한다.** Task 5 가 `'🤝 어제 이긴 숲 친구가 약속을 지켜 오지 않았어요'` 로 넣어뒀다 — Task 10 에서 위 확정 문구로 바꾸고 i18n 에도 그 문장을 등재한다.

**모바일 실측은 Task 8 Step 5 에서 한다.** 375px 에서 두 줄로 넘어가는 문구가 있으면 그때 짧게 고치고 이 표를 갱신한다.

## Task 8: 대결 오버레이 UI

**Files:**
- Modify: `index.html` — CSS(`#mg-layer` 규칙 부근, 1015행) · 마크업(`#mg-layer` 마크업 뒤)
- Create: `js/duel/ui.js`

**Interfaces:**
- Consumes: `HANDS` (Task 1) · `SHELL_COUNT`·`SHELL_ROUNDS` (Task 2) · 확정 문구 (Task 7)
- Produces:
  - `openDuel() → void` · `closeDuel() → void`
  - `setBanner(text: string) → void` · `setRound(n: number, total: number) → void`
  - `askHand() → Promise<'rock'|'scissors'|'paper'>`
  - `showHands(mine: string, theirs: string, result: string) → Promise<void>` — 결과를 1.2초 보여준다
  - `askShell(swaps: [number,number][], startPos: number, ms: number) → Promise<number>` — 섞은 뒤 고른 바가지 index

- [ ] **Step 1: CSS 를 추가한다**

`index.html` 의 `#mg-layer` 규칙들 **바로 아래**에 붙인다.

```css
  /* 🐗🦝 밤손님 대결 — 3D 클로즈업 위에 얹는 오버레이. #mg-layer 와 같은 문법(z-index 40) */
  #duel-layer { position: fixed; inset: 0; z-index: 40; display: none; align-items: end; justify-content: center;
                padding: 0 12px calc(18px + env(safe-area-inset-bottom)); pointer-events: none; }
  #duel-layer.show { display: flex; }
  #duel-card { width: min(480px, 94vw); background: rgba(255,252,244,0.93); border-radius: 22px 22px 16px 16px;
               box-shadow: var(--shadow); padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px;
               pointer-events: auto; }
  #duel-banner { font-weight: 800; font-size: 15px; text-align: center; min-height: 20px; }
  #duel-round { font-size: 12px; opacity: .6; text-align: center; font-variant-numeric: tabular-nums; }
  #duel-hands, #duel-shells { display: flex; gap: 10px; justify-content: center; }
  #duel-hands.hide, #duel-shells.hide { display: none; }
  #duel-hands button, #duel-shells button {
    flex: 1; border: none; border-radius: 14px; padding: 14px 0; font-size: 28px; cursor: pointer;
    background: #f0ead8; box-shadow: 0 2px 0 rgba(0,0,0,.06); }
  #duel-shells button { transition: transform .3s ease; }   /* 섞을 때 자리를 옮긴다 */
  #duel-hands button:active { transform: translateY(1px); }
  #duel-hands button:disabled, #duel-shells button:disabled { cursor: default; }
  #duel-hands button:disabled { opacity: .45; }
```

그리고 **HUD 를 걷는 규칙에 `body.duel-open` 을 같이 넣는다.** `body.mg-open #catch-banner, ...` 로 시작하는 선택자 목록(1011~1014행)에 `body.duel-open` 판을 추가한다 — 대결 중에도 조이스틱·액션 버튼·미니맵이 걷혀야 한다.

- [ ] **Step 2: 마크업을 추가한다**

`#mg-layer` 마크업 **바로 뒤**에 붙인다.

```html
    <!-- 🐗🦝 밤손님 대결 오버레이 — js/duel/ui.js 가 조작. 버튼은 JS 가 만든다
         (마크업에 한국어를 박아두면 translateDom 이 대결 중에 건드린다) -->
    <div id="duel-layer">
      <div id="duel-card">
        <div id="duel-banner"></div>
        <div id="duel-round"></div>
        <div id="duel-hands" class="hide"></div>
        <div id="duel-shells" class="hide"></div>
      </div>
    </div>
```

- [ ] **Step 3: `js/duel/ui.js` 를 쓴다**

Task 7 확정 문구를 그대로 쓴다. 아래는 골격이고, `askShell` 은 직접 채운다.

```js
// =============================================================
//  calm forest · 🐗🦝 대결 오버레이 (DOM)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 3D 클로즈업 위에 얹는 얇은 층이다. 무대는 js/duel/stage.js 가 만든다.
//  ▶ 문구는 t() 로 감싼다 — 영어 사전은 js/i18n-en.js. 통문장을 키로 쓴다.
// =============================================================
import { t } from '../i18n.js';
import { HANDS } from './rps.js';
import { SHELL_COUNT } from './shells.js';

const HAND_ICO = { rock: '✊', scissors: '✌️', paper: '🖐️' };

// ⚠️ 표시 문구는 **전부 여기 모은다.** ui.js 와 index.js 에 흩어지면 한쪽만 고쳐
//    영어가 한국어로 새는 사고가 난다. Task 10 은 이 값들을 그대로 i18n 키로 등재한다.
//    값은 Task 7 에서 확정한 문구로 맞춘다.
export const COPY = {
  boarOpen:   '멧돼지가 길을 막아섰어요',
  raccoonOpen:'너구리가 바가지 셋을 늘어놨어요',
  askHand:    '무엇을 낼까요?',
  askShell:   '어느 바가지에 있을까요?',
  win:        '이겼어요!',
  lose:       '졌어요…',
  draw:       '비겼어요! 다시',
  matchWin:   '되찾았어요! 당분간 안 올 거예요',
  matchLose:  '놓쳤어요… 내일 다시 만나요',
  rock: '바위', scissors: '가위', paper: '보',
};
const HAND_LABEL = { rock: COPY.rock, scissors: COPY.scissors, paper: COPY.paper };
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

export function openDuel() {
  document.body.classList.add('duel-open');
  $('duel-layer').classList.add('show');
}

export function closeDuel() {
  document.body.classList.remove('duel-open');
  $('duel-layer').classList.remove('show');
  $('duel-hands').classList.add('hide');
  $('duel-shells').classList.add('hide');
}

export function setBanner(text) { $('duel-banner').textContent = t(text); }
export function setRound(n, total) { $('duel-round').textContent = `${n} / ${total}`; }

/** 세 손 중 하나를 누를 때까지 기다린다 */
export function askHand() {
  const box = $('duel-hands');
  box.innerHTML = '';
  box.classList.remove('hide');
  $('duel-shells').classList.add('hide');
  return new Promise(resolve => {
    for (const h of HANDS) {
      const b = document.createElement('button');
      b.textContent = HAND_ICO[h];
      b.setAttribute('aria-label', t(HAND_LABEL[h]));
      b.addEventListener('click', () => {
        [...box.children].forEach(c => { c.disabled = true; });
        resolve(h);
      }, { once: true });
      box.appendChild(b);
    }
  });
}

/** 낸 손과 상대 손을 잠깐 보여준다 */
export async function showHands(mine, theirs, result) {
  setBanner(result === 'win' ? COPY.win : result === 'lose' ? COPY.lose : COPY.draw);
  const box = $('duel-hands');
  box.innerHTML = '';
  for (const h of [mine, theirs]) {
    const b = document.createElement('button');
    b.textContent = HAND_ICO[h];
    b.disabled = true;
    box.appendChild(b);
  }
  await wait(1200);
}
```

`askShell(swaps, startPos, ms)` 는 이렇게 만든다:

1. 바가지 버튼 `SHELL_COUNT` 개를 만들고 전부 `disabled` 로 둔다.
2. 시작 자리(`startPos`)를 잠깐 열어 보여준다(작물 이모지를 띄운다).
3. `swaps` 를 `ms` 간격으로 하나씩 적용하며, 두 버튼의 `transform: translateX()` 를 서로 바꾼다.
4. 섞기가 끝나면 `disabled` 를 풀고 클릭을 기다려 **자리 index** 를 돌려준다.

**⚠️ 화면 자리 ≠ 배열 index.** DOM 순서는 그대로 두고 `translateX` 로만 옮긴다. 클릭한 버튼이 **지금 몇 번째 자리에 보이는지**를 돌려줘야 `finalPos` 와 비교가 맞는다.

- [ ] **Step 4: 문법 확인**

```bash
node --check js/duel/ui.js
```

- [ ] **Step 5: 브라우저에서 단독으로 돌려본다**

preview 콘솔에서(아직 게임 흐름에 안 붙어 있다):

```js
const d = await import('./js/duel/ui.js');
d.openDuel(); d.setBanner('멧돼지가 길을 막아섰어요'); d.setRound(1, 3);
console.log(await d.askHand());
```

그리고 그릇도 돌려본다.

```js
d.setBanner('어느 바가지에 있을까요?');
console.log('고른 자리', await d.askShell([[0,1],[1,2],[0,2],[1,2]], 0, 450));
```

`resize_window` 로 mobile(375×812) 에서도 같은 것을 본다 — 배너가 두 줄로 넘치지 않고 버튼이 엄지에 닿아야 한다.

- [ ] **Step 6: 커밋**

```bash
git add index.html js/duel/ui.js
git commit -m "feat: 🐗🦝 대결 오버레이 — 손·바가지 선택 카드"
```

---

## Task 9: 클로즈업 무대

**Files:**
- Create: `js/duel/stage.js`

**Interfaces:**
- Consumes: `makeBoar`·`makeRaccoon`·`DUEL_ART_H` (Task 6)
- Produces:
  - `enterDuelStage(stage, { animal, x, z }) → handle` — `stage` 는 Task 5 가 `ctx.stage` 로 넘기는 `{ THREE, scene, camera, player }`
  - `exitDuelStage(handle) → void` — 카메라와 가려둔 오브젝트를 되돌린다
  - `updateDuelStage(handle, dt) → void` — 등장 팝·숨쉬기 (호출은 선택)

- [ ] **Step 1: 기존 카메라 코드를 읽는다**

```bash
sed -n 9275,9320p js/game.js
```

`applyStationCamera()` 와 `hideKilnOccluders()` 를 읽는다. 두 가지를 그대로 가져온다:

- **세로 화면 보정** — `const k = Math.min(1.75, Math.max(1, 1.55 / (camera.aspect || 1.55)));` 화각이 좁아지는 만큼 뒤로 뺀다.
- **가림 처리** — 카메라와 대상 사이에 선 나무·장식을 잠깐 숨긴다. 안개로는 못 지운다(가리는 것이 대상보다 카메라 쪽에 있다).

거리·높이 상수에 **실측 횟수가 주석으로 적혀 있다.** 여기서도 추측값을 쓰지 않는다.

- [ ] **Step 2: `js/duel/stage.js` 를 쓴다**

플레이어와 동물이 마주 서고, 카메라가 **옆에서** 둘을 함께 잡는다.

- 동물은 흔적 좌표에서 플레이어 반대편으로 1.8 떨어진 자리에 두고, 플레이어를 보도록 `lookAt` 한다.
- 카메라는 두 사람을 잇는 선의 **수직 방향**에서 본다 — 정면에서 잡으면 한쪽이 다른 쪽을 가린다.
- **되돌릴 목록은 `handle` 에 담는다.** 모듈 전역 배열에 쌓으면 대결이 겹칠 때 서로의 것을 되살린다.

```js
// =============================================================
//  calm forest · 🐗🦝 대결 무대 — 카메라 클로즈업
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ 전용 무대로 **전환하지 않는다**. 사건은 털린 밭 그 자리에서 벌어져야
//    인과가 끊기지 않는다. 카메라만 밀고, 끝나면 원래 시점으로 돌아온다.
//  ▶ 거리·높이는 실측으로 잡는다(applyStationCamera 의 주석과 같은 규칙).
//  ▶ 되돌릴 것(카메라 위치·숨긴 오브젝트)은 전부 handle 에 담는다.
// =============================================================
```

- [ ] **Step 3: 거리·높이를 실측한다**

preview 에서 `__nightTest()` 로 흔적을 만들고 대결을 연다. PC 가로·폰 세로(375×812) 두 화면에서 캡처해 확인한다:

- 동물이 화면 밖으로 잘리지 않는다
- 오버레이 카드(화면 아래 약 40%)에 동물이 가리지 않는다
- 플레이어와 동물이 둘 다 보인다

**3회 이상 재서** 값을 고르고, 고른 값과 버린 값을 주석에 남긴다.

- [ ] **Step 4: 커밋**

```bash
git add js/duel/stage.js
git commit -m "feat: 🐗🦝 대결 클로즈업 무대 — 밭 그 자리에서 마주 선다"
```

---

## Task 10: 흐름을 잇고 트래킹·i18n 을 단다

**Files:**
- Create: `js/duel/index.js`
- Modify: `index.html` (부팅 배선)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: 앞선 모든 태스크 · `setDuelSource` (Task 5)
- Produces: `initDuel() → void` — `index.html` 이 `initNightVisit()` 옆에서 부른다

- [ ] **Step 1: `js/duel/index.js` 를 쓴다**

```js
// =============================================================
//  calm forest · 🐗🦝 밤손님 대결 — 흐름
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ game.js 의 setDuelSource() 확장점에 끼운다(night-visit.js 와 같은 문법).
//  ▶ 여기서 true 를 돌려주면 game.js 가 작물 회수와 🤝 휴전을 처리한다.
//    보상 규칙을 이쪽에 두지 않는다 — 인벤토리는 game.js 의 것이다.
//  ▶ ⚠️ rps 와 shells 가 같은 이름(initMatch·applyRound)을 export 한다. 별칭으로 받는다.
// =============================================================
import { setDuelSource } from '../game.js';
import { trackEvent } from '../analytics.js';
import { rollHand, judge, initMatch as rpsInit, applyRound as rpsRound } from './rps.js';
import { SHELL_ROUNDS, makeSwaps, finalPos,
         initMatch as shellInit, applyRound as shellRound } from './shells.js';
import { enterDuelStage, exitDuelStage } from './stage.js';
import * as ui from './ui.js';

// 🐗 가위바위보 2선승 — 비기면 판 번호를 올리지 않고 다시 낸다
async function playRps(onRound) {
  let m = rpsInit();
  while (!m.done) {
    onRound(m.rounds + 1);
    ui.setRound(m.rounds + 1, 3);
    ui.setBanner(ui.COPY.askHand);
    const mine = await ui.askHand();
    const theirs = rollHand(Math.random());
    const result = judge(mine, theirs);
    await ui.showHands(mine, theirs, result);
    m = rpsRound(m, result);
  }
  return m;
}

// 🦝 그릇 섞기 3판 전승 — 한 판이라도 틀리면 그 자리에서 끝
async function playShells(onRound) {
  let m = shellInit();
  for (const r of SHELL_ROUNDS) {
    onRound(m.round + 1);
    ui.setRound(m.round + 1, SHELL_ROUNDS.length);
    ui.setBanner(ui.COPY.askShell);
    const rolls = Array.from({ length: r.swaps }, () => Math.random());
    const swaps = makeSwaps(r.swaps, rolls);
    const start = Math.floor(Math.random() * 3);
    const picked = await ui.askShell(swaps, start, r.ms);
    m = shellRound(m, picked === finalPos(start, swaps));
    if (m.done) break;
  }
  return m;
}

export function initDuel() {
  setDuelSource(async (ctx) => {
    const game = ctx.animal === 'boar' ? 'rps' : 'shells';
    let at = 0;                                 // 몇 번째 판까지 갔나 — 중간 이탈 지점
    const onRound = (n) => { at = n; };
    trackEvent('duel_start', { animal: ctx.animal, game, crops: ctx.crops.length });   // [GA4] 진입률
    let handle = null;
    try {
      handle = enterDuelStage(ctx.stage, { animal: ctx.animal, x: ctx.x, z: ctx.z });
      ui.openDuel();
      ui.setBanner(ctx.animal === 'boar' ? ui.COPY.boarOpen : ui.COPY.raccoonOpen);
      const m = game === 'rps' ? await playRps(onRound) : await playShells(onRound);
      const won = !!m.won;
      ui.setBanner(won ? ui.COPY.matchWin : ui.COPY.matchLose);
      trackEvent('duel_result', {                                                      // [GA4] 실제 승률
        animal: ctx.animal, game, win: won ? 1 : 0,
        rounds: game === 'rps' ? m.rounds : m.round,
        recovered: won ? ctx.crops.length : 0,
      });
      await new Promise(r => setTimeout(r, 1400));   // 결과를 읽을 틈
      return won;
    } catch (e) {
      trackEvent('duel_quit', { animal: ctx.animal, game, round: at });                // [GA4] 중간 이탈
      console.warn('[대결] 중단', e?.message || e);
      return false;
    } finally {
      ui.closeDuel();
      if (handle) exitDuelStage(handle);
    }
  });
}
```

- [ ] **Step 2: 부팅에 배선한다**

`index.html` 의 import 블록(2154행 `night-visit.js` 부근)에 추가한다.

```js
    import { initDuel } from './js/duel/index.js';   // 🐗🦝 밤손님 대결(흔적 조사 → 추격)
```

`initNightVisit();` **바로 다음 줄**에 추가한다.

```js
      initDuel();                                    // 🐗🦝 대결 등록(흔적을 조사하면 도둑과 마주 선다)
```

- [ ] **Step 3: i18n 사전에 등재한다**

`js/i18n-en.js` 에 새 섹션을 연다. **통문장을 키로** 쓴다.

```js
  // ── 🐗🦝 밤손님 대결 ────────────────────────────────────────
  '멧돼지가 길을 막아섰어요': 'The boar blocks your path',
  '너구리가 바가지 셋을 늘어놨어요': 'The raccoon lines up three bowls',
  '무엇을 낼까요?': 'What will you throw?',
  '어느 바가지에 있을까요?': 'Which bowl is it under?',
  '이겼어요!': 'You win!',
  '졌어요…': 'You lose…',
  '비겼어요! 다시': 'A draw — again!',
  '되찾았어요! 당분간 안 올 거예요': 'You got it back! They will stay away for a while',
  '놓쳤어요… 내일 다시 만나요': 'It got away… try again tomorrow',
  '바위': 'Rock', '가위': 'Scissors', '보': 'Paper',
  '🤝 어제 이긴 숲 친구가 약속을 지켜 오지 않았어요': '🤝 Yesterday\'s loser kept their word and stayed away',
```

`winDuel` 의 토스트는 숫자·이름이 끼는 문장이라 `{0}` 슬롯을 쓴다. **문장을 조각내지 말고** 전체를 하나의 키로 넣는다.

- [ ] **Step 4: 커버리지를 확인한다**

```bash
node scripts/i18n_check.mjs
```

Expected: 새 문구가 미등재 목록에 없다. (이 스크립트는 저장소에 있다 — 건너뛰지 않는다.)

- [ ] **Step 5: 문법·회귀 확인**

```bash
node --check js/duel/index.js && npm test
```

- [ ] **Step 6: 커밋**

```bash
git add js/duel/index.js index.html js/i18n-en.js
git commit -m "feat: 🐗🦝 흔적을 조사하면 도둑과 마주 선다 — 대결 흐름·트래킹·영어"
```

---

## Task 11: 실측 검증

**Files:** 없음 (검증 전용 — 문제를 찾으면 해당 태스크의 파일을 고친다)

- [ ] **Step 1: 🐗 한 판을 끝까지 돌린다**

preview 를 **`?dbg=1` 로** 띄우고 게임에 **실제로 입장**한 뒤(`body.playing` 을 손으로 씌우면 미니맵이 빈 채로 찍힌다) 콘솔에서:

```js
__nightForce('boar')
```

⚠️ **`__nightTest()` 를 반복하지 않는다.** 서버 판정은 `HMAC(uid:date)` 결정값이라 같은 날 같은 유저면 몇 번을 불러도 결과가 같다 — 오늘 안 털리는 계정은 아무리 반복해도 흔적이 안 생긴다. `__nightForce` 는 Task 5 Step 6 에서 만든 dbg 훅으로, 흔적을 직접 심고 `duelDone` 을 비워 몇 번이고 다시 볼 수 있게 한다.

심어진 좌표로 걸어가 조사하고, 멧돼지와 끝까지 둔다.

확인할 것:
- 카드가 뜨고 버튼이 눌린다
- **비기면 판 번호가 안 올라간다**
- 이기면 인벤토리 작물이 늘고 `getGameState().night.truce.boar` 에 **오늘+2** 가 찍힌다
- 지면 아무 일도 안 일어난다(추가 손실 없음)

- [ ] **Step 2: 🦝 도 같은 방식으로 돌린다**

```js
__nightForce('raccoon')
```

**섞기가 눈으로 따라갈 수 있는 속도인지** 본다 — 1판부터 어렵다면 `SHELL_ROUNDS[0].ms` 를 올린다(횟수는 건드리지 않는다).

- [ ] **Step 3: 휴전이 실제로 먹는지 본다**

이긴 뒤 `__nightTest()` 를 다시 돌린다. 네트워크 탭에서 `/api/night-visit` 응답이 `{ visited: false, reason: 'truce' }` 인지 확인하고, 토스트가 "🤝 …약속을 지켜…" 로 뜨는지 본다.

```js
getGameState().night.truce
```

- [ ] **Step 4: 리롤이 막히는지 본다**

대결 카드가 떠 있는 동안 **새로고침**한다. 다시 들어왔을 때:
- 그 흔적이 없다
- 같은 동물과 다시 붙을 수 없다(`night.duelDone` 에 남아 있다)
- 조사 보상(씨앗 2·도감)은 이미 받아 있다

- [ ] **Step 5: 모바일 폭에서 확인한다**

`resize_window` 로 mobile 프리셋(375×812) 후 **새로고침**한다(로드 시점 기기 판정이 다시 돌아야 한다). 한 판 돌리고 확인한다:
- 배너가 두 줄로 넘치지 않는다
- 손·바가지 버튼이 엄지에 닿는 높이다
- 동물이 오버레이 카드에 가리지 않는다
- 조이스틱·액션 버튼·미니맵이 대결 중에 숨는다(`body.duel-open` 규칙)

- [ ] **Step 6: 영어로 한 판 더 돌린다**

`?lang=en` 으로 들어가 같은 흐름을 돌린다. 한국어가 섞여 나오는 자리를 `js/i18n-en.js` 에 채운다.

- [ ] **Step 7: 승률을 숫자로 확인한다**

순수 함수만 돌려 설계값과 맞는지 본다.

```js
const { rollHand, judge, initMatch, applyRound } = await import('./js/duel/rps.js');
let win = 0;
for (let i = 0; i < 20000; i++) {
  let m = initMatch();
  while (!m.done) m = applyRound(m, judge(rollHand(Math.random()), rollHand(Math.random())));
  if (m.won) win++;
}
console.log('rps 승률', win / 20000);   // 0.45 ~ 0.55 여야 한다
```

벗어나면 `judge` 나 `applyRound` 에 버그가 있다.

- [ ] **Step 8: 결과를 정리해 보고한다**

캡처(PC·모바일·영어)와 승률 숫자를 사용자에게 보낸다. 고칠 것이 있으면 해당 태스크로 돌아간다.

- [ ] **Step 9: 커밋**

실측으로 수치를 고쳤다면 커밋한다.

```bash
git add -A
git commit -m "fix: 🐗🦝 대결 실측 — 카메라 거리·섞기 속도 조정"
```

---

## 배포 (사용자 승인 후)

구현이 끝나도 **자동으로 배포하지 않는다.** 사용자가 지시하면 저장소 규칙대로 **웹·토스·itch 세 곳 전부** 올린다. 공지는 토스 출시 후 `notices_admin.html` 로 쓴다(SQL 불필요).

---

## Self-Review

**스펙 커버리지**

| 스펙 절 | 태스크 |
|---|---|
| 1. 흐름 (조사 → 추격 → 대결) | 5 (훅·연결) · 10 (흐름) |
| 1. 대결은 흔적 자리에서 (무대 전환 없음) | 9 |
| 1. 하루 한 번·동물당 한 번 | 5 Step 5 (`duelDone`) |
| 1. 리롤 방지 (흔적 선소모·선저장) | 5 Step 5 · 11 Step 4 (검증) |
| 2. 🐗 가위바위보 2선승·비김 재경기 | 1 · 10 `playRps` |
| 2. 🦝 그릇 섞기 3판 전승·속도로만 난이도 | 2 · 10 `playShells` · 11 Step 2 |
| 3. 발길 끊기 (서버 상한) | 3 (규칙) · 4 (서버) · 5 (저장·적용) |
| 4. 흔적에 crop 보존 | 5 Step 3 |
| 4. 회수 지급 규칙 (고급 작물 분기·밭 미복원) | 5 Step 5 `winDuel` |
| 4. 새 세이브 필드·옛 세이브 폴백 | 5 Step 2 (`truce` 중첩 채우기) · `crop \|\| ''` |
| 5. 파일 구조 | 파일 구조 표 |
| 5. 동물 조형 (시안 3개 비교) | 6 |
| 6. 테스트 3종 | 1 · 2 · 3 (+ 4 의 `pickAnimal`) |
| 7. 트래킹 4종 | 10 Step 1 (`duel_start`·`duel_result`·`duel_quit`) · 5 Step 4 (`night_visit` 의 truce 경로) |
| 8. i18n · 모바일 | 7 (문구) · 10 Step 3 (사전) · 11 Step 5·6 |
| 9. 성공 기준 | 11 Step 7 (승률) · 배포 후 GA4 |
| 10. 열린 질문 | 11 Step 2 (섞기 속도) · 배포 후 판단 |

**이름 일관성** — `initMatch`/`applyRound` 가 두 모듈에 같은 이름으로 있다. 별칭 import 를 Task 2 Step 1·Task 10 Step 1 에 명시했다. `truceUntil` 은 Task 3 정의 → Task 5 Step 6 import. `pickAnimal` 은 Task 4 정의, 같은 태스크에서만 사용. `ctx.stage` 는 Task 5 Step 5 가 싣고 Task 10 Step 1 이 `enterDuelStage` 에 넘긴다.

**확인해둔 전제** — 계획을 쓰며 실제 코드에서 확인했다: `CROPS` 는 없고 `CROP_TYPES`(game.js:75)·`ADV_CROPS`(farm-crops.js:22)로 갈린다 · `isAdv(crop)` 는 작물 **객체**를 받는다(farm-crops.js:32) · `ADV_CROPS` 는 game.js 가 이미 import 중이다(51행) · `scripts/i18n_check.mjs` 는 존재한다 · 테스트는 `node --test tests/*.test.mjs`(package.json). Task 5 Step 1 에 재확인 명령을 남겨뒀다.

**승인 게이트** — Task 6(조형 3안 비교)과 Task 7(문구 검수)은 사용자 승인 없이 다음으로 넘어가지 않는다.
