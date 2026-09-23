# 🎚️ 미니게임 난이도 probe + 유저별 자동 조절 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미니게임 5종의 난이도를 계수 `e` 하나로 통일하고, 판마다 도는 probe 지터와 유저별 DDA를 얹어 2주 안에 재튜닝 근거를 만든다.

**Architecture:** 순수 모듈 `js/difficulty.js`가 팔 배정·DDA 갱신·최종 계수를 전담하고, `js/game.js`는 얇은 어댑터 두 개(`rollDifficulty`·`settleDifficulty`)로 호출만 한다. 최종 계수는 `e = clamp(e_dda × e_probe)` — probe를 DDA 출력 **위에** 곱해야 DDA가 유저마다 달라도 probe 효과가 편향 없이 추정된다.

**Tech Stack:** 바닐라 ES 모듈 · `node --test` (외부 의존 없음) · GA4 `trackEvent` · Supabase 세이브

**Spec:** [docs/superpowers/specs/2026-09-22-difficulty-probe-design.md](../specs/2026-09-22-difficulty-probe-design.md)

**브랜치:** `feat/difficulty-probe` (main `0cf436b` 기준)

## Global Constraints

- **계수 `e`는 클수록 쉽다.** 기존 `easeMult` 의미를 그대로 물려받는다. 뒤집지 말 것.
- **`js/game.js`(16,498줄)에 로직을 넣지 않는다.** 판정·배정은 전부 `js/difficulty.js`. game.js는 호출과 로깅만.
- **GA4 예약 파라미터 금지**: `source` `medium` `campaign` `campaign_id` `term` `content`. 쓰는 필드는 `ease`·`dda`·`arm`뿐이라 안전하다.
- **새 Supabase 테이블을 만들지 않는다.** 분석은 GA4 → BigQuery로 한다.
- **`js/craft/minigame.js`는 수정하지 않는다.** 난이도가 이미 인자로 열려 있다.
- **1차 대상은 `fish`·`sea`·`mist`·`cook`·`craft` 다섯뿐.** 조각(`carve`)·승부(`duel`)·맷돌(`flour`)은 제외 — 표본이 없거나(조각 2건·승부 0행) 난이도 상수 자체가 없다(맷돌).
- **요리·가공은 1주 차에 DDA를 켜지 않는다** (`ddaOn: false`). 점수 분포를 모르는 채로 DDA가 목표로 끌고 가면 순서가 거꾸로다.
- **작업 트리에 다른 세션의 미커밋 파일이 있다** (`js/pet/art.js`, `sims/pet-sim.html`, `dev/active/pet-expansion/`, `android/`). **절대 `git add -A`나 `git add .`를 쓰지 말 것.** 커밋은 항상 파일을 하나씩 지정한다.
- 테스트 실행: `npm test` (= `node --test tests/*.test.mjs`)

---

### Task 1: 순수 모듈 — 팔 배정 · DDA · 최종 계수

**Files:**
- Modify: `js/tuning.js` (파일 끝에 추가)
- Create: `js/difficulty.js`
- Test: `tests/difficulty.test.mjs`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `DIFFICULTY`, `DIFF_K`, `DIFF_DDA_CLAMP`, `DIFF_EASE_CLAMP` from `js/tuning.js`
  - `hashId(id: string): number`
  - `probeArm(game: string, id: string, n?: number): number`
  - `easeFor(game: string, id: string, n?: number, dda?: number): { ease: number, arm: number|null, dda: number }`
  - `nextDda(game: string, dda?: number, outcome?: number): number`
  - `defaultDifficulty(): Record<string, { dda: number, n: number }>`
  - `mergeDifficulty(saved: unknown): Record<string, { dda: number, n: number }>`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/difficulty.test.mjs` 를 새로 만든다.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashId, probeArm, easeFor, nextDda, defaultDifficulty, mergeDifficulty } from '../js/difficulty.js';

test('probe 팔은 추첨이 아니라 순회 — 연속 3판이면 세 팔이 모두 나온다', () => {
  for (const id of ['user-a', 'user-b', 'device-xyz']) {
    const arms = [0, 1, 2].map(n => probeArm('fish', id, n));
    assert.deepEqual([...arms].sort(), [0, 1, 2], `${id} 가 3판에 세 팔을 다 쓰지 않는다`);
  }
});

test('유저마다 시작 팔이 흩어진다 — 모두가 팔 0 으로 시작하면 표본이 쏠린다', () => {
  const starts = Array.from({ length: 300 }, (_, i) => probeArm('fish', `client-${i}`, 0));
  const counts = [0, 1, 2].map(a => starts.filter(s => s === a).length);
  for (const c of counts) assert.ok(c > 60, `시작 팔 분포가 쏠렸다: ${counts.join('/')}`);
});

test('hashId 는 같은 입력에 같은 값 — 세션이 바뀌어도 팔 순서가 이어진다', () => {
  assert.equal(hashId('abc'), hashId('abc'));
  assert.notEqual(hashId('abc'), hashId('abd'));
  assert.ok(Number.isInteger(hashId(null)) && hashId(null) >= 0);
});

test('최종 계수는 dda × 팔 — 낚시 기본 입질창 1.4초가 팔마다 0.63 / 0.91 / 1.4초가 된다', () => {
  const secs = [0, 1, 2]
    .map(n => Math.round(1.4 * easeFor('fish', 'fixed-user', n, 1).ease * 100) / 100)
    .sort((a, b) => a - b);
  assert.deepEqual(secs, [0.63, 0.91, 1.4]);
});

test('DDA 는 목표 쪽으로 간다 — 계속 놓치면 쉬워지고 한 번도 안 놓치면 어려워진다', () => {
  let never = 1, always = 1;
  for (let i = 0; i < 100; i++) { never = nextDda('fish', never, 1); always = nextDda('fish', always, 0); }
  assert.ok(never < 1, `한 번도 안 놓치는 사람은 어려워져야 한다 (${never})`);
  assert.ok(always > 1, `계속 놓치는 사람은 쉬워져야 한다 (${always})`);
});

test('결과가 목표와 같으면 DDA 는 제자리 — 불필요하게 흔들지 않는다', () => {
  assert.equal(nextDda('fish', 1.2, 0.88), 1.2);
});

test('DDA 는 꼬리만 잡는다 — 0.7 ~ 1.5 를 벗어나지 않는다', () => {
  let lo = 1, hi = 1;
  for (let i = 0; i < 500; i++) { lo = nextDda('fish', lo, 1); hi = nextDda('fish', hi, 0); }
  assert.equal(lo, 0.7);
  assert.equal(hi, 1.5);
});

test('1주 차 요리·가공은 DDA 가 안 움직인다 — probe 만 돈다', () => {
  assert.equal(nextDda('cook', 1, 0), 1);
  assert.equal(nextDda('craft', 1, 1), 1);
  assert.notEqual(probeArm('cook', 'u', 0), probeArm('cook', 'u', 1));
});

test('최종 계수에도 상한이 있다 — 바다 최대 팔 × DDA 최대가 2.5 를 안 넘는다', () => {
  assert.equal(easeFor('sea', 'u', 0, 1.5).ease <= 2.5, true);
});

test('표에 없는 게임은 난이도를 안 건드린다 — 조각·승부는 1차 대상이 아니다', () => {
  assert.deepEqual(easeFor('carve', 'u', 0, 1), { ease: 1, arm: null, dda: 1 });
  assert.equal(nextDda('duel', 1.3, 0), 1.3);
});

test('difficulty 필드 없는 옛 세이브는 기본값으로 뜬다', () => {
  assert.deepEqual(mergeDifficulty(undefined), defaultDifficulty());
  assert.deepEqual(mergeDifficulty({ fish: { dda: 99, n: -5 } }).fish, { dda: 1.5, n: 0 });
  assert.equal(mergeDifficulty({ fish: { dda: 1.2, n: 7 } }).fish.n, 7);
});
```

- [ ] **Step 2: 실패를 확인한다**

```bash
node --test tests/difficulty.test.mjs
```

Expected: FAIL — `Cannot find module '../js/difficulty.js'`

- [ ] **Step 3: 상수 표를 `js/tuning.js` 끝에 추가한다**

```js
// =============================================================
//  🎚️ 미니게임 난이도 — probe 팔 · DDA 목표
//  (docs/superpowers/specs/2026-09-22-difficulty-probe-design.md)
//  계수 e 는 클수록 쉽다 — easeMult 의 의미를 그대로 물려받는다. 판정은 js/difficulty.js 가 한다.
//   · arms   — 판마다 돌아가며 쓰는 probe 지터. 관측 성적이 한쪽으로 기운 게임은 그쪽으로만 흔든다.
//              반대쪽 팔은 이미 답을 아는 구간이라 표본 낭비다.
//   · target — DDA 가 끌고 갈 결과값(0~1). 이진 게임은 성공률, 점수 게임은 점수/만점.
//   · ddaOn  — false 면 probe 만 돌고 dda 는 1.0 에 멈춘다(점수 분포를 모르는 게임의 1주 차).
// =============================================================
export const DIFFICULTY = {
  fish:  { arms: [0.45, 0.65, 1.0], target: 0.88, ddaOn: true  },  // 30일 성공률 96%(24/25) — 어려운 쪽만
  sea:   { arms: [1.0,  1.5,  2.2], target: 0.55, ddaOn: true  },  // 30일 성공률 40%(14/35) — 쉬운 쪽만
  mist:  { arms: [0.7,  1.0,  1.3], target: 0.80, ddaOn: true  },  // 30일 성공률 80%(36/45) — 적정, 양방향
  cook:  { arms: [0.7,  1.0,  1.4], target: 0.65, ddaOn: false },  // 점수 분포 미측정 — 1주 차엔 probe 만
  craft: { arms: [0.7,  1.0,  1.4], target: 0.65, ddaOn: false },  // 점수 분포 미측정 — 1주 차엔 probe 만
};
export const DIFF_K = 0.10;                 // DDA 한 판당 이동량 계수 — probe 보다 느리게 움직여야 한다
export const DIFF_DDA_CLAMP = [0.7, 1.5];   // DDA 는 꼬리만 잡는다(목표값이 아직 잠정치라 좁게)
export const DIFF_EASE_CLAMP = [0.35, 2.5]; // 최종 계수 안전 범위
```

- [ ] **Step 4: `js/difficulty.js` 를 만든다**

```js
// =============================================================
//  calm forest · 🎚️ 미니게임 난이도 계수 (순수 모듈)
//  ------------------------------------------------------------
//  최종 계수 e = clamp(e_dda × e_probe). 클수록 쉽다.
//   · e_probe — 판마다 팔을 순회하는 지터(측정용). 난이도별 성공률 곡선을 그리려면 값이 흩어져야 한다.
//   · e_dda   — 유저별로 한 판에 최대 DIFF_K 만큼만 움직이는 보정(경험용).
//  probe 를 DDA 출력 **위에** 곱한다. 이 순서여야 유저마다 e_dda 가 달라도 팔끼리의 비교가
//  순수한 probe 효과가 된다. 거꾸로 DDA 가 probe 결과를 보고 반응하면 둘이 얽혀 원인을 못 가린다.
//  브라우저 전역에 의존하지 않아 node 테스트가 잠근다.
// =============================================================
import { DIFFICULTY, DIFF_K, DIFF_DDA_CLAMP, DIFF_EASE_CLAMP } from './tuning.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 문자열 id → 32bit 부호 없는 정수(FNV-1a). 유저마다 probe 시작 팔을 흩는다. */
export function hashId(id) {
  const s = String(id ?? '');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** 이 판에 쓸 probe 팔. 균등 추첨이 아니라 순회 — 표본이 작을 때 팔별로 고르게 떨어진다. */
export function probeArm(game, id, n = 0) {
  const d = DIFFICULTY[game]; if (!d) return 0;
  return (hashId(id) + Math.max(0, Math.floor(n || 0))) % d.arms.length;
}

/** 이 판의 난이도. ease 는 게임이 쓰고, 셋 다 결과 이벤트에 싣는다. */
export function easeFor(game, id, n = 0, dda = 1) {
  const d = DIFFICULTY[game];
  if (!d) return { ease: 1, arm: null, dda: 1 };   // 표에 없는 게임은 난이도를 건드리지 않는다
  const arm = probeArm(game, id, n);
  return { ease: clamp(dda * d.arms[arm], ...DIFF_EASE_CLAMP), arm, dda };
}

/** 판이 끝난 뒤의 새 e_dda. outcome 은 0~1(이진은 성공 1 / 실패 0, 점수 게임은 점수/만점). */
export function nextDda(game, dda = 1, outcome = 0) {
  const d = DIFFICULTY[game];
  if (!d || !d.ddaOn) return dda;                  // ddaOn:false — probe 만 돌고 바닥은 안 움직인다
  const o = clamp(Number(outcome) || 0, 0, 1);
  return clamp(dda + DIFF_K * (d.target - o), ...DIFF_DDA_CLAMP);
}

/** 신규 세이브의 기본값 */
export function defaultDifficulty() {
  return Object.fromEntries(Object.keys(DIFFICULTY).map(g => [g, { dda: 1, n: 0 }]));
}

/** 옛 세이브 병합 — 필드가 없거나 망가져 있어도 기본값으로 뜬다 */
export function mergeDifficulty(saved) {
  const out = defaultDifficulty();
  for (const g of Object.keys(out)) {
    const s = saved?.[g]; if (!s) continue;
    if (Number.isFinite(s.dda)) out[g].dda = clamp(s.dda, ...DIFF_DDA_CLAMP);
    if (Number.isFinite(s.n) && s.n >= 0) out[g].n = Math.floor(s.n);
  }
  return out;
}
```

- [ ] **Step 5: 테스트 통과를 확인한다**

```bash
node --test tests/difficulty.test.mjs
```

Expected: PASS — 11 tests

- [ ] **Step 6: 커밋**

```bash
git add js/tuning.js js/difficulty.js tests/difficulty.test.mjs
git commit -m "feat: 🎚️ 난이도 계수 순수 모듈 — probe 팔 순회 + DDA 목표 추적

계수 e 하나로 통일한다(클수록 쉽다 — easeMult 의미 그대로).
e = clamp(e_dda × e_probe) 이고, probe 를 DDA 출력 위에 곱한다.
이 순서여야 유저마다 e_dda 가 달라도 팔끼리 비교가 순수한 probe 효과가 된다.

팔은 균등 추첨이 아니라 순회다. 표본 70회 규모에서 추첨은 팔별로
20/31/19 처럼 쏠리지만 순회는 유저 안에서도 고르게 떨어진다.
시작 팔은 hashId(clientId) 로 흩어 모두가 팔 0 으로 시작하지 않게 한다.

요리·가공은 점수 분포를 아직 모르므로 ddaOn:false — probe 만 돈다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: 세이브 필드 + game.js 어댑터 + 🎣 낚시 적용

**Files:**
- Modify: `js/game.js` (import 추가 · `gameState` 기본값 · `applySave` · 어댑터 3개 · 낚시 4곳)

**Interfaces:**
- Consumes: Task 1의 `easeFor`·`nextDda`·`defaultDifficulty`·`mergeDifficulty`
- Produces:
  - `rollDifficulty(game: string): { ease, arm, dda }` — 판 시작 시 호출, `n`을 1 올린다
  - `settleDifficulty(game: string, outcome: number): void` — 판 종료 시 호출
  - `diffParams(r): { ease: number, dda: number, arm: number|null }` — 결과 이벤트에 펼칠 세 필드
  - `gameState.difficulty` — `{ fish|sea|mist|cook|craft: { dda, n } }`

- [ ] **Step 1: import 를 추가한다**

`js/game.js:32` 의 `import { TUNING, rewardBoostMult, easeMult, ... } from './tuning.js';` 바로 **아래 줄**에 넣는다.

```js
import { easeFor, nextDda, defaultDifficulty, mergeDifficulty } from './difficulty.js';   // 🎚️ 미니게임 난이도 — probe 지터 + 유저별 DDA
```

- [ ] **Step 2: 세이브 기본값을 추가한다**

`gameState` 기본값 객체 안의 `beta: { tries: {} },` 줄 **바로 아래**에 넣는다. (Step 1에서 import 를 넣어 줄 번호가 밀렸으므로 줄 번호가 아니라 이 텍스트로 찾는다.)

```js
  difficulty: defaultDifficulty(),   // 🎚️ 미니게임별 난이도 상태 { dda: 유저 보정, n: probe 순회용 누적 시도 }
```

- [ ] **Step 3: 세이브 복원을 추가한다**

`js/game.js` 의 `if (saved.beta) gameState.beta = { tries: {}, ...saved.beta };` 줄 **바로 아래**에 넣는다.

```js
  gameState.difficulty = mergeDifficulty(saved.difficulty);   // 🎚️ 난이도 상태 복원 — 필드가 없는 옛 세이브는 기본값으로 뜬다
```

- [ ] **Step 4: 어댑터 세 개를 추가한다**

`js/game.js` 의 `function betaEase(game) {` 블록 **바로 위**에 넣는다. (`betaEase` 자체는 Task 7에서 지운다 — 지금은 남겨둔다.)

```js
// 🎚️ 이 판의 난이도를 뽑고 순회 카운터를 올린다. 돌려준 { ease, arm, dda } 를 그대로 결과 이벤트에 싣는다.
//    id 는 clientId(기기 영구 식별자) — 게스트도 세션을 넘어 같은 팔 순서를 이어 간다.
function rollDifficulty(game) {
  const st = gameState.difficulty[game] || (gameState.difficulty[game] = { dda: 1, n: 0 });
  const r = easeFor(game, authState.clientId || authState.userId || '', st.n, st.dda);
  st.n += 1;
  return r;
}

// 🎚️ 판이 끝나면 결과를 먹인다. outcome 은 0~1 — 이진은 성공 1 / 실패 0, 점수 게임은 점수/만점.
//    ddaOn:false 인 게임에선 nextDda 가 그대로 돌려주므로 호출해도 안전하다(1주 차 요리·가공).
function settleDifficulty(game, outcome) {
  const st = gameState.difficulty[game]; if (!st) return;
  st.dda = nextDda(game, st.dda, outcome);
}

// 🎚️ 결과 이벤트에 펼칠 세 필드. GA4 예약 파라미터(source·medium·campaign·term·content)와 겹치지 않는다.
const diffParams = r => ({
  ease: Math.round((r?.ease ?? 1) * 100) / 100,
  dda:  Math.round((r?.dda  ?? 1) * 100) / 100,
  arm:  r?.arm ?? null,
});
```

- [ ] **Step 5: 낚시 상태 변수를 바꾼다**

`let fishEase = 1;` 선언 줄을 교체한다.

```js
// before
let fishEase = 1;   // 🧪 첫 3회 관대 판정용 입질 여유 배율
// after
let fishDiff = { ease: 1, arm: null, dda: 1 };   // 🎚️ 이번 캐스트의 난이도 — 입질 여유 배율 + 로깅용 팔·DDA
```

- [ ] **Step 6: 캐스트에서 난이도를 뽑는다**

`js/game.js` 의 `fishEase = betaEase('fish');   // 🧪 첫 3회 관대 판정` 줄을 교체한다.

```js
  fishDiff = rollDifficulty('fish');   // 🎚️ 이번 캐스트의 입질 여유 — probe 팔 × 유저 DDA
```

- [ ] **Step 7: 입질창에 적용한다**

`js/game.js` 의 `fishState = 'bite'; biteEnd = now + (gameState.upgrades.rod ? 2.6 : 1.4) * fishEase;` 줄을 교체한다.

```js
      fishState = 'bite'; biteEnd = now + (gameState.upgrades.rod ? 2.6 : 1.4) * fishDiff.ease; // 튼튼한 낚싯대: 입질 여유↑ · 🎚️ probe × DDA
```

⚠️ 낚싯대 업그레이드(`2.6`)와 곱해지므로 팔 번호가 절대 난이도를 뜻하지 않는다. 업글 유저의 팔 0(`2.6 × 0.45 = 1.17초`)이 미업글 유저의 팔 2(`1.4초`)보다 **짧다**. 분석은 팔 번호가 아니라 실제 입질창 초로 한다.

- [ ] **Step 8: 성공·실패에 로깅과 정산을 붙인다**

`trackEvent('fishing_catch', { fish: kind.name, rarity: kind.rarity }); // [GA4]` 줄을 교체한다.

```js
  settleDifficulty('fish', 1);   // 🎚️ 성공 → DDA 가 조금 어려워진다
  trackEvent('fishing_catch', { fish: kind.name, rarity: kind.rarity, rod: gameState.upgrades.rod ? 1 : 0, ...diffParams(fishDiff) }); // [GA4] 🎚️ 난이도 동봉
```

`if (now > biteEnd) { ui.toast?.('놓쳤어요 🐟💨'); trackEvent('fishing_miss'); resetFishing(); }` 줄을 교체한다.

```js
    if (now > biteEnd) {
      ui.toast?.('놓쳤어요 🐟💨');
      settleDifficulty('fish', 0);   // 🎚️ 실패 → DDA 가 조금 쉬워진다
      trackEvent('fishing_miss', { rod: gameState.upgrades.rod ? 1 : 0, ...diffParams(fishDiff) });   // [GA4] 🎚️ 난이도 동봉
      resetFishing();
    }
```

- [ ] **Step 9: 회귀 테스트와 문법 검사**

```bash
npm test && node --check js/game.js
```

Expected: 전부 PASS

- [ ] **Step 10: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🎣 낚시에 난이도 probe 적용 — 입질창 0.63 / 0.91 / 1.4초

세이브에 gameState.difficulty 를 두고(옛 세이브는 mergeDifficulty 로
기본값), 판마다 rollDifficulty 로 팔을 돌려 입질창에 곱한다.
성공·실패에 settleDifficulty 로 결과를 먹여 DDA 를 움직인다.

fishing_catch / fishing_miss 에 ease·dda·arm 과 rod 를 싣는다.
rod 업그레이드가 입질창에 함께 곱해져(2.6 vs 1.4) 팔 번호가 절대
난이도를 뜻하지 않기 때문에, 분석에서 갈라 보려면 rod 가 필요하다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 🌊 바다 적용

**Files:**
- Modify: `js/game.js` (`seaMG` 초기화 · `sea_catch` · `sea_miss`)

**Interfaces:**
- Consumes: Task 2의 `rollDifficulty`·`settleDifficulty`·`diffParams`
- Produces: 없음 (게임별 적용)

- [ ] **Step 1: 난이도를 뽑아 `seaMG` 에 담는다**

`js/game.js` 의 `seaMG.ease = betaEase('sea');   // 🧪 첫 3회 관대 판정` 줄을 교체한다.

```js
    seaMG.diff = rollDifficulty('sea'); seaMG.ease = seaMG.diff.ease;   // 🎚️ 연타 효율 ×ease · 끌림 ÷ease (아래 두 줄이 그대로 쓴다)
```

`seaMG.progress`·`seaMG.pz` 계산 두 줄은 **건드리지 않는다** — 이미 `seaMG.ease` 를 쓰고 있어 그대로 동작한다.

- [ ] **Step 2: 성공 로깅**

`trackEvent('sea_catch', { species: sp.id, weight: w, duration: dur, good: seaMG.good, bad: seaMG.bad });   // [GA4] 코어 KPI` 줄을 교체한다.

```js
  settleDifficulty('sea', 1);   // 🎚️ 성공
  trackEvent('sea_catch', { species: sp.id, weight: w, duration: dur, good: seaMG.good, bad: seaMG.bad, ...diffParams(seaMG.diff) });   // [GA4] 코어 KPI · 🎚️ 난이도 동봉
```

- [ ] **Step 3: 실패 로깅**

`trackEvent('sea_miss', { species: seaMG.sp?.id, progress: Math.round(seaMG.progress * 100) });   // [GA4] 난이도 튜닝 데이터` 줄을 교체한다.

```js
  settleDifficulty('sea', 0);   // 🎚️ 실패
  trackEvent('sea_miss', { species: seaMG.sp?.id, progress: Math.round(seaMG.progress * 100), ...diffParams(seaMG.diff) });   // [GA4] 난이도 튜닝 데이터 — 이제 정말 난이도가 들어 있다
```

- [ ] **Step 4: 검사**

```bash
npm test && node --check js/game.js
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🌊 바다에 난이도 probe 적용 — 진행량 ×1.0 / 1.5 / 2.2

30일 성공률이 40%(14/35) 라 쉬워지는 쪽으로만 흔든다.
seaMG.ease 는 이름을 유지해 연타 효율·끌림 두 줄은 손대지 않는다.

sea_miss 주석은 전부터 '난이도 튜닝 데이터' 였는데 정작 난이도가
빠져 있었다. 이제 ease·dda·arm 이 실린다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 🌫️ 안개 적용

**Files:**
- Modify: `js/game.js` (`mist.soothe` 초기화 · 판정창 주석 · `mist_soothe` · `mist_soothe_miss`)

**Interfaces:**
- Consumes: Task 2의 어댑터 3개
- Produces: 없음

⚠️ 난이도는 **정령 하나당 한 번** 뽑는다(달래기 한 번 = 탭 3회). 탭마다 뽑으면 한 정령 안에서 판정창이 요동쳐 조작감이 깨진다.
⚠️ 연습 모드(`mist.practice`)는 보상·기록이 없는 튜토리얼이므로 **정산하지 않는다** — 연습 성적이 DDA를 움직이면 안 된다.

- [ ] **Step 1: 난이도를 뽑는다**

`js/game.js` 의 `mist.soothe = { sp, step: 0, phase: 0, note, ease: betaEase('mist') };   // 🧪 첫 3회 관대 판정` 줄을 교체한다.

```js
  const md = rollDifficulty('mist');   // 🎚️ 정령 하나당 한 번 — 탭마다 뽑으면 한 마리 안에서 판정창이 요동친다
  mist.soothe = { sp, step: 0, phase: 0, note, ease: md.ease, diff: md };
```

- [ ] **Step 2: 판정창 주석을 고친다** (코드는 그대로 — 이미 `so.ease` 를 쓴다)

`const lo = 1 - 0.38 * (so.ease || 1);` 줄의 주석을 교체한다.

```js
  const lo = 1 - 0.38 * (so.ease || 1);                 // 기본 0.62 — 🎚️ 팔 0.7 / 1.0 / 1.3 → 0.734 / 0.62 / 0.506
```

- [ ] **Step 3: 성공 로깅**

`trackEvent('mist_soothe', { kind: sp.def.id, wave: mist.wave });   // [GA4] 달래기 성공 분포` 줄을 교체한다.

```js
      settleDifficulty('mist', 1);   // 🎚️ 성공 (연습은 이 줄 앞에서 이미 return 한다)
      trackEvent('mist_soothe', { kind: sp.def.id, wave: mist.wave, ...diffParams(so.diff) });   // [GA4] 달래기 성공 분포 · 🎚️ 난이도 동봉
```

⚠️ 교체 전에 위쪽을 읽어 `if (mist.practice) { ... return; }` 분기가 **이 줄보다 앞에** 있는지 확인한다. 앞에 없으면 연습 성적이 DDA를 움직인다.

- [ ] **Step 4: 실패 로깅**

`trackEvent(mist.practice ? 'mist_practice_miss' : 'mist_soothe_miss', { wave: mist.wave });   // [GA4] 리듬 난이도 튜닝(연습은 분리)` 줄을 교체한다.

```js
    if (!mist.practice) settleDifficulty('mist', 0);   // 🎚️ 실패 — 연습 성적은 DDA 를 안 움직인다
    trackEvent(mist.practice ? 'mist_practice_miss' : 'mist_soothe_miss', { wave: mist.wave, ...diffParams(mist.soothe?.diff) });   // [GA4] 리듬 난이도 튜닝(연습은 분리)
```

⚠️ 이 지점에서 지역 변수 `so` 가 살아 있으면 `mist.soothe?.diff` 대신 `so?.diff` 를 써도 된다. 둘 중 스코프에 있는 쪽을 쓴다.

- [ ] **Step 5: 검사**

```bash
npm test && node --check js/game.js
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🌫️ 안개에 난이도 probe 적용 — 판정창 0.734 / 0.62 / 0.506

30일 성공률 80%(36/45) 로 셋 중 가장 적정해서 양방향으로 흔든다.
난이도는 정령 하나당 한 번만 뽑는다 — 탭마다 뽑으면 한 마리를
달래는 도중 판정창이 요동쳐 조작감이 깨진다.

연습 모드는 보상·기록이 없는 튜토리얼이라 정산하지 않는다.
연습 성적이 DDA 를 움직이면 실전 난이도가 엉뚱하게 밀린다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: 🍳 요리 적용 — 스테이지 단위 순회

**Files:**
- Modify: `js/game.js` (`cookDiffs` 변수 · `kitchenStart` · `kitchenFinish`)

**Interfaces:**
- Consumes: Task 2의 어댑터 3개
- Produces: `cookDiffs: Array<{ ease, arm, dda }>` — 모듈 스코프 변수, `kitchenFinish` 가 읽는다

⚠️ **`courseOf` 안에서 난이도를 뽑으면 안 된다.** `courseOf` 는 `kitchenView()`(주방 메뉴판 렌더)도 부르므로, 메뉴를 열 때마다 `n` 이 올라가 순회가 망가진다. 반드시 `kitchenStart` 에서만 뽑는다.
⚠️ `index.html` 은 고치지 않는다. 네 미니게임이 이미 `cfg.mult` 를 판정창 배율로 쓰고(`this.half = s.half * this.cfg.mult` 등 4곳), 그 `cfg` 가 `courseOf()` 가 만든 스테이지 객체다. **`mult` 에 한 번만** 곱한다 — index.html 에서 또 곱하면 이중 적용된다.

- [ ] **Step 1: 스테이지별 난이도 보관 변수를 만든다**

`js/game.js` 의 `let pendingDish = null;` 줄 **바로 위**에 넣는다.

```js
let cookDiffs = [];   // 🎚️ 이번 코스의 스테이지별 난이도 — kitchenStart 가 채우고 kitchenFinish 가 로깅한다
```

- [ ] **Step 2: `kitchenStart` 에서 스테이지마다 팔을 돌린다**

`kitchenStart` 안의 `const course = courseOf(r);` 줄과 그 아래 `trackEvent('cooking_start', ...)` 줄을 교체한다.

```js
  // 🎚️ 스테이지마다 팔이 갈린다 — 한 판(★3이면 3스테이지)에서 표본이 세 개 나온다.
  //    courseOf 는 메뉴판(kitchenView)도 부르므로 여기서만 뽑는다. 거기서 뽑으면 메뉴를 열 때마다 순회가 돈다.
  const base = courseOf(r);
  cookDiffs = base.map(() => rollDifficulty('cook'));
  const course = base.map((s, i) => ({ ...s, mult: s.mult * cookDiffs[i].ease }));
  trackEvent('cooking_start', { recipe: id, mg_type: course.map(s => s.mg).join('>'), diff: recipeDiff(r), where });   // [GA4] 미니게임 퍼널: 시작
```

- [ ] **Step 3: `kitchenFinish` 에 정산을 붙인다**

`trackEvent(res.abandoned ? 'cooking_abandon' : 'cooking_result', {` 호출 **바로 위**에 넣는다.

```js
  settleDifficulty('cook', score / 100);   // 🎚️ 점수 게임 — 0~1 로 정규화. 1주 차엔 ddaOn:false 라 값이 안 움직인다
```

- [ ] **Step 4: `kitchenFinish` 에 로깅을 붙인다**

같은 `trackEvent(...)` 객체 안, `is_best: isBest ? 1 : 0, total_cooked: st.cooked,` 줄 **바로 아래**에 넣는다.

```js
    // 🎚️ 스테이지마다 팔이 다르므로 배열로 싣는다. 탭별 offsets 와 맞물려 탭 단위 분석이 된다.
    arms:  cookDiffs.map(d => d.arm).join(','),
    eases: cookDiffs.map(d => Math.round(d.ease * 100) / 100).join(','),
    dda:   Math.round((cookDiffs[0]?.dda ?? 1) * 100) / 100,
```

- [ ] **Step 5: 검사**

```bash
npm test && node --check js/game.js && grep -c "cfg.mult" index.html && grep -n "cookDiffs" js/game.js
```

Expected:
- 테스트 PASS
- `index.html` 의 `cfg.mult` 가 **4** (수정 없음 — 이중 적용이 없다는 뜻)
- `cookDiffs` 가 3곳: 선언 1 · `kitchenStart` 의 `base.map` 1 · `kitchenFinish` 로깅 1. `cookDiffs` 는 `base.map()` 으로 만들어지므로 길이가 코스 길이와 **구조적으로** 같다(스펙 §6-6). `arms`·`eases` 문자열의 쉼표 개수가 `mg_type` 의 `>` 개수와 같아야 한다 — 배포 후 BigQuery에서 이걸로 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🍳 요리에 난이도 probe 적용 — 스테이지마다 팔이 갈린다

표본이 여기에 있다. 30일 31판이지만 스테이지 × 탭으로 내려가면
수백 개이고, 결과가 연속 점수라 이진 승패보다 표본 효율이 몇 배다.
코스가 아니라 스테이지 단위로 순회해 한 판에서 표본을 서너 개 뽑는다.

⚠️ courseOf 안에서 뽑으면 안 된다 — 메뉴판(kitchenView)도 그걸
부르므로 메뉴를 열 때마다 순회가 돌아 버린다. kitchenStart 에서만 뽑는다.

index.html 은 무수정이다. 네 미니게임이 이미 cfg.mult 를 판정창
배율로 쓰고 그 cfg 가 courseOf 의 산출물이라, mult 에 한 번만 곱하면 된다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 🔥🫙 가공 적용 — 숯·벽돌·포도

**Files:**
- Modify: `js/game.js` (`craftDiffCur` 변수 · `Input.craftDiff` 추가 · `Input.craftScore` · `craftSet`)
- Modify: `index.html` (숯·벽돌·포도 오버레이 3곳)

**Interfaces:**
- Consumes: Task 2의 어댑터 3개
- Produces: `Input.craftDiff(itemId): { half, targetMs, tol, tolRatio }` — `index.html` 이 부른다

⚠️ **🌾 맷돌(`flour`)은 대상이 아니다.** `millScore` 는 각속도의 변동계수로 점수를 내는 구조라 흔들 난이도 상수가 없다. 팔을 돌리면 효과 없는 판만 `n` 에 쌓여 순회가 오염된다.
⚠️ `js/craft/minigame.js` 는 **수정하지 않는다** — `half`·`tol`·`tolRatio` 가 이미 인자다.

- [ ] **Step 1: 현재 난이도 보관 변수를 추가한다**

`js/game.js` 의 `export const Input = {` 줄 **바로 위**(모듈 스코프)에 넣는다.

```js
let craftDiffCur = null;   // 🎚️ 이번 가공 판의 난이도 — craftDiff 가 채우고 craftScore·craftSet 이 읽는다
```

- [ ] **Step 2: `Input.craftDiff` 를 추가한다**

`Input` 객체 안, `craftScore(itemId, input) {` 블록 **바로 위**에 넣는다.

```js
  // 🎚️ 가공 미니게임 난이도 — index.html 이 오버레이를 열 때 부른다. 판정 경계만 흔든다(조작·길이는 고정).
  //    🌾 맷돌(flour)은 변동계수 기반이라 흔들 상수가 없다 — 팔을 돌리지 않고 기본값을 준다.
  craftDiff(itemId) {
    if (itemId === 'flour') { craftDiffCur = null; return { half: 0.12, targetMs: 1200, tol: 400, tolRatio: 0.5 }; }
    craftDiffCur = rollDifficulty('craft');
    const e = craftDiffCur.ease;
    return { half: 0.12 * e, targetMs: 1200, tol: 400 * e, tolRatio: 0.5 * e };
  },
```

- [ ] **Step 3: `craftScore` 에서 포도만 계수를 먹인다**

`Input.craftScore` 블록을 교체한다.

```js
  craftScore(itemId, input) {
    if (itemId === 'flour') return millScore(input);
    if (itemId === 'charcoal') return fireScore(input.pos, input.target, input.half);
    // 🍷 포도는 index.html 이 박자만 모으고 허용 오차를 안 넘긴다 — 여기서 먹인다
    if (itemId === 'juice') return crushScore(input, 520, 0.5 * (craftDiffCur?.ease ?? 1));
    return knead2Score(input.heldMs, input.targetMs, input.tol);
  },
```

- [ ] **Step 4: `craftSet` 에 정산과 로깅을 붙인다**

`craftSet` 안의 `trackEvent('craft_set', { ... });` 호출을 교체한다.

```js
  settleDifficulty('craft', (grade || 0) / 3);   // 🎚️ 등급 0~3 → 0~1. 1주 차엔 ddaOn:false 라 값이 안 움직인다
  trackEvent('craft_set', { item: itemId, grade, qty: yieldOf(itemId, grade), station,
                            slot_idx: slotsOf(gameState.craft.slots, station).length - 1, station_seq: stationCount(station),
                            ...diffParams(craftDiffCur) });   // [GA4] 🎚️ 난이도 동봉 (맷돌은 craftDiffCur 가 null → ease 1 / arm null)
```

- [ ] **Step 5: `index.html` 숯 오버레이를 바꾼다**

`const half = 0.12, target = 0.5;` 줄을 교체한다.

```js
        const { half } = Input.craftDiff('charcoal'), target = 0.5;   // 🎚️ 초록 구간 반폭만 흔든다
```

- [ ] **Step 6: `index.html` 벽돌 오버레이를 바꾼다**

`const targetMs = 1200, tol = 400, MAX = 2200;` 줄을 교체한다.

```js
        const { targetMs, tol } = Input.craftDiff('brick'), MAX = 2200;   // 🎚️ 허용 오차만 흔든다
```

- [ ] **Step 7: `index.html` 포도 오버레이에서 팔을 돌린다**

`if (taps.length >= NEED) finish(Input.craftScore('juice', taps));` 가 들어 있는 블록에서, `taps` 배열을 선언하는 줄 **바로 위**에 넣는다.

```js
        Input.craftDiff('juice');   // 🎚️ 팔만 돌린다 — 허용 오차는 채점할 때 game.js 가 먹인다
```

- [ ] **Step 8: 검사**

```bash
npm test && node --check js/game.js && grep -c "Input.craftDiff" index.html
```

Expected: 테스트 PASS · `index.html` 에 `Input.craftDiff` 가 **3** (charcoal·brick·juice)

- [ ] **Step 9: 수동 확인**

`preview_start` 로 게임을 띄워 🔥 화덕에서 숯·벽돌·포도를 각각 한 번씩 걸고 콘솔 오류가 없는지 본다. 맷돌도 한 번 돌려 기본 난이도로 동작하는지 본다.

⚠️ **로컬에선 GA4 발화를 못 본다.** dev 파라미터(`?spawn=`·`?weather=`)가 있으면 `trackEvent` 가 맨 앞에서 반환하고, 빼면 **프로덕션 GA4로 나간다**. 여기서는 오류 유무만 본다 — 파라미터 검증은 배포 다음 날 BigQuery에서 한다.

- [ ] **Step 10: 커밋**

```bash
git add js/game.js index.html
git commit -m "feat: 🔥🫙 가공에 난이도 probe 적용 — 숯·벽돌·포도

판정 경계만 흔든다(숯 half · 벽돌 tol · 포도 tolRatio). 조작과 길이를
같이 흔들면 어느 쪽이 어려웠는지 지표로 가를 수 없다 — 이미 코드에
적혀 있던 규칙을 그대로 따른다.

🌾 맷돌은 제외한다. millScore 는 각속도의 변동계수라 흔들 상수가
아예 없어서, 팔을 돌리면 효과 없는 판만 순회에 쌓인다.

js/craft/minigame.js 는 무수정 — half·tol·tolRatio 가 이미 인자다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: 옛 `easeMult` 제거

**Files:**
- Modify: `js/tuning.js` (`easeMult` 함수 · `TUNING.firstTryEase` 제거)
- Modify: `js/game.js` (`betaEase` 제거 · import 정리 · `gameState.beta` 주석)
- Modify: `tests/*.test.mjs` (`easeMult` 케이스가 있으면 제거)

**Interfaces:**
- Consumes: Task 2~6이 모든 호출부를 대체 완료
- Produces: 없음

- [ ] **Step 1: 남은 참조를 전수 확인한다**

```bash
grep -rn "easeMult\|betaEase\|firstTryEase" js/ tests/ index.html
```

Expected: `js/tuning.js` 의 정의와 `js/game.js` 의 `betaEase` 정의·import 만 남는다. **호출부가 하나라도 남아 있으면 Task 2~6 중 빠진 게 있다 — 멈추고 해당 태스크로 돌아간다.**

- [ ] **Step 2: 테스트에서 걷어낸다**

```bash
grep -n "easeMult\|firstTryEase" tests/*.test.mjs
```

나온 케이스를 지운다. 없으면 건너뛴다.

- [ ] **Step 3: `js/tuning.js` 에서 제거한다**

두 곳을 지운다.

```js
// 지울 것 1 — TUNING 객체 안
  // 관대 판정 — 미니게임별 첫 tries회 시도는 판정 계수 ×mult
  firstTryEase: { tries: 3, mult: 1.3 },

// 지울 것 2 — 함수 전체
// 해당 미니게임 시도 횟수가 tries 미만인 A군이면 1.3, 아니면 1
export function easeMult(variant, tries) {
  return (isBetaA(variant) && (tries || 0) < TUNING.firstTryEase.tries)
    ? TUNING.firstTryEase.mult : 1;
}
```

- [ ] **Step 4: `js/game.js` 에서 제거한다**

`betaEase` 함수 전체를 지운다.

```js
// 지울 것 — 함수 전체
// 🧪 [베타 A군] 미니게임 첫 3회 관대 판정 — 시도 카운트를 올리고 현재 ease 배율을 돌려준다
function betaEase(game) {
  const t = gameState.beta.tries;
  const m = easeMult(authState.variant, t[game]);
  t[game] = (t[game] || 0) + 1;
  return m;
}
```

import 에서 `easeMult` 만 뺀다.

```js
import { TUNING, rewardBoostMult, isMapLocked, mapOpenDay, betaDay, lockLine, openLine } from './tuning.js';   // 🧪 [베타 A/B] 보상 부스트 + 2차 맵 계단식
```

`gameState.beta` 는 **지우지 않는다** — 필드를 지우면 옛 세이브 복원이 깨진다. 주석만 고친다.

```js
  beta: { tries: {} },   // 🧪 미니게임별 시도 횟수 — 관대 판정은 js/difficulty.js 로 옮겼다(이 카운터는 옛 세이브 호환용)
```

- [ ] **Step 5: 검사**

```bash
grep -rn "easeMult\|betaEase\|firstTryEase" js/ tests/ index.html; npm test && node --check js/game.js
```

Expected: grep 결과 없음 · 테스트 전부 PASS

- [ ] **Step 6: 커밋**

```bash
git add js/tuning.js js/game.js tests/
git commit -m "refactor: 🧹 옛 easeMult 제거 — 난이도는 js/difficulty.js 하나로

easeMult 는 베타 A군의 미니게임당 첫 3회만 ×1.3 이었다. 값이
1.0/1.3 둘뿐이고 해당자가 4~5명뿐이라 분산이 사실상 0 이었고,
이게 애초에 난이도를 분석하지 못한 이유다.

gameState.beta.tries 는 남긴다 — 지우면 옛 세이브 복원이 깨진다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: 분석 SQL

**Files:**
- Create: `sql/analytics/difficulty_probe.sql`

**Interfaces:**
- Consumes: Task 2~6이 심은 GA4 파라미터 `ease`·`dda`·`arm` (요리는 `arms`·`eases` 문자열)
- Produces: 없음

- [ ] **Step 1: 관례를 다시 확인한다**

```bash
head -20 sql/analytics/bigquery_queries.sql
```

Expected: 데이터셋은 `calm-forest.analytics_547127440.events_*`, 날짜 필터는 `_TABLE_SUFFIX`, 파라미터는 `(select value.X from unnest(event_params) where key = '...')`.

- [ ] **Step 2: `sql/analytics/difficulty_probe.sql` 을 쓴다**

아래를 그대로 넣는다. 질의 5·6은 골격이 같으므로 4를 본떠 채운다.

```sql
-- =============================================================
--  calm forest · 🎚️ 미니게임 난이도 probe 분석
--  ------------------------------------------------------------
--  대상: GA4 export `calm-forest.analytics_547127440.events_*`
--  설계: docs/superpowers/specs/2026-09-22-difficulty-probe-design.md
--
--  ⚠️ ease·dda 는 GA4 가 값에 따라 int 로도 double 로도 넣는다(1.0 은 int 가 되기 쉽다).
--     반드시 coalesce 로 양쪽을 받을 것 — double_value 만 읽으면 팔 2(ease 1.0)가 통째로 null 이 된다.
-- =============================================================

-- 공통 추출 뷰 — 아래 질의들이 이걸 재사용한다
with ev as (
  select
    event_name,
    user_pseudo_id,
    timestamp_micros(event_timestamp) as ts,
    parse_date('%Y%m%d', regexp_extract(_TABLE_SUFFIX, r'\d{8}$')) as day,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'ease') as ease,
    (select coalesce(value.double_value, cast(value.int_value as float64))
       from unnest(event_params) where key = 'dda')  as dda,
    (select value.int_value    from unnest(event_params) where key = 'arm')      as arm,
    (select value.int_value    from unnest(event_params) where key = 'rod')      as rod,
    (select value.string_value from unnest(event_params) where key = 'species')  as species,
    (select value.int_value    from unnest(event_params) where key = 'progress') as progress,
    (select value.int_value    from unnest(event_params) where key = 'score')    as score,
    (select value.string_value from unnest(event_params) where key = 'arms')     as arms,
    (select value.string_value from unnest(event_params) where key = 'eases')    as eases,
    (select value.string_value from unnest(event_params) where key = 'mg_type')  as mg_type
  from `calm-forest.analytics_547127440.events_*`
  where _TABLE_SUFFIX between '20260923' and format_date('%Y%m%d', current_date())
)

-- ── 1. 팔별 표본 — 순회가 실제로 도는가(위생 검사) ──────────────
--    각 게임에서 팔 0/1/2 의 판 수가 엇비슷해야 한다. 한쪽이 두 배 이상이면
--    배정이 깨진 것이다(예: 판 시작이 아닌 곳에서 rollDifficulty 를 부르고 있다).
select
  case
    when event_name like 'fishing%' then 'fish'
    when event_name like 'sea_%'    then 'sea'
    when event_name like 'mist_soothe%' then 'mist'
    when event_name like 'cooking_%' then 'cook'
    when event_name = 'craft_set'   then 'craft'
  end as game,
  arm, count(*) as plays
from ev
where arm is not null
group by game, arm
order by game, arm;
```

이어서 같은 파일에 아래 질의들을 붙인다. 각 질의는 위 `with ev as (...)` 블록을 복사해 앞에 둔다(BigQuery 콘솔에서 하나씩 실행하므로 self-contained 여야 한다).

```sql
-- ── 2. 🎣 낚시 성공률 곡선 ────────────────────────────────────
--    ⚠️ 팔 번호로 묶지 말 것. 낚싯대 업그레이드가 입질창에 함께 곱해져
--       업글 유저의 팔 0(2.6×0.45=1.17초)이 미업글 팔 2(1.4초)보다 짧다.
--       비교는 반드시 **실제 입질창 초**로 한다.
select
  rod,
  round(ease * if(rod = 1, 2.6, 1.4), 2) as bite_sec,
  countif(event_name = 'fishing_catch') as caught,
  count(*) as casts,
  round(100 * countif(event_name = 'fishing_catch') / count(*), 1) as catch_pct
from ev
where event_name in ('fishing_catch', 'fishing_miss') and ease is not null
group by rod, bite_sec
order by rod, bite_sec;

-- ── 3. 🌊 바다 성공률 곡선 ────────────────────────────────────
--    실패해도 progress 가 높으면 거의 다 온 것이다 — 그 비중이 크면 조금만 쉽게 해도 넘어간다.
select
  arm, round(ease, 2) as ease, species,
  count(*) as plays,
  round(100 * countif(event_name = 'sea_catch') / count(*), 1) as catch_pct,
  round(avg(if(event_name = 'sea_miss', progress, null)), 1) as avg_miss_progress
from ev
where event_name in ('sea_catch', 'sea_miss') and arm is not null
group by arm, ease, species
order by arm, species;

-- ── 4. 🌫️ 안개 성공률 곡선 ───────────────────────────────────
--    연습(mist_practice_miss)은 애초에 이벤트 이름이 달라 여기 안 들어온다.
select
  arm, round(ease, 2) as ease,
  count(*) as taps,
  round(100 * countif(event_name = 'mist_soothe') / count(*), 1) as soothe_pct
from ev
where event_name in ('mist_soothe', 'mist_soothe_miss') and arm is not null
group by arm, ease
order by arm;
```

남은 두 질의는 위 골격을 본떠 직접 쓴다.

5. **🍳 요리 점수 곡선** — `arms`·`eases` 는 쉼표로 이어 붙인 스테이지 배열이다. `unnest(split(arms, ','))` 로 풀어 스테이지 인덱스(`with offset`)와 함께 묶고, `arm` 별 평균 `score` 와 `n_miss` 비율을 본다. **위생 검사**: `array_length(split(arms, ','))` 가 `array_length(split(mg_type, '>'))` 와 같아야 한다 — 다르면 `cookDiffs` 와 코스 길이가 어긋난 것이다.
6. **🎚️ DDA 궤적** — `user_pseudo_id` × `day` 별 `dda` 평균의 시간 변화. 마지막 날 `dda` 가 벽(0.7·1.5)에 붙은 유저 비율이 높으면 clamp 가 좁다는 뜻이다.

- [ ] **Step 3: 커밋**

```bash
git add sql/analytics/difficulty_probe.sql
git commit -m "docs: 📊 난이도 probe 분석 질의 6종

팔별 표본(위생 검사) · 게임별 성공률/점수 곡선 4종 · DDA 궤적.

⚠️ 낚시는 팔 번호로 묶으면 안 된다. rod 업그레이드가 입질창에
함께 곱해져(2.6 vs 1.4) 업글 유저의 가장 어려운 팔이 미업글
유저의 가장 쉬운 팔보다 짧다. 실제 입질창 초로 묶는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## 배포 후 할 일 (이 계획의 범위 밖 — 잊지 말 것)

1. **배포 다음 날 BigQuery 확인** — `ease`·`dda`·`arm` 이 다섯 게임 결과 이벤트에 실제로 찍히는지. GA4 export 는 되돌릴 수 없어서, 안 찍히면 그 기간은 통째로 손실이다.
2. **웹·토스·itch 3곳 전부 배포.** 토스는 `ait deploy` 가 아니라 `bundle_upload(memo)` 로 올린다.
3. **1주 뒤**: 요리·가공 점수 분포를 보고 `DIFFICULTY.cook.target`·`craft.target` 을 확정한 다음 `ddaOn: true` 로 바꾼다.
4. **2주 뒤**: 성공률 곡선으로 기본 상수를 재튜닝하고, probe 팔 범위를 새 기본값 주변으로 좁힌다.
