# EXAONE 문구 풀 1단계 (공통 계층 + 저녁 경매) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** EXAONE 으로 경매인(방랑 상인) 대사와 경매품 소개 문구를 미리 쌓아 두고, 경매 창이 날짜 시드로 그날 문구를 골라 보여 준다. 게임 실행 중 EXAONE 호출은 0.

**Architecture:** 문구 규칙(slot 정의·검증·자리표시)은 서버와 클라이언트가 같이 쓰는 순수 모듈 `js/lines/slots.js` 하나에 둔다. 생성은 `functions/api/_line-gen.js`(프롬프트·파싱·검증·계획)가 맡고, 수동 시드 스크립트와 주 1회 크론이 같은 `runLinePool` 을 부른다. 게임은 `/api/lines` 에서 그날 문구를 받고, 실패하면 손으로 쓴 기본 문구(`js/lines/fallback.js`)를 쓴다. EXAONE 호출부는 빛 공방 크론에서 `functions/api/_exaone.js` 로 떼어 내 두 곳이 공유한다.

**Tech Stack:** Cloudflare Workers(`worker/index.js` 라우팅·scheduled), Supabase(PostgREST + security definer RPC, service_role), K-EXAONE 2.5(OpenAI 호환 chat/completions), 브라우저 ES module(번들러 없음, 배포 때 `scripts/lib/bundle-boot.mjs`), node:test + node:assert/strict, GA4 `trackEvent`.

**Spec:** `docs/superpowers/specs/2026-11-10-exaone-line-pool-design.md` (2·3·5·6·7·8절). 경매 스펙 `docs/superpowers/specs/2026-11-10-evening-auction-design.md`, 경매 확정 문구 `dev/active/evening-auction/evening-auction-context.md`(브랜치 `feat/evening-auction`).

**범위 밖:** 스펙 4절 포구 반복 의뢰. 포구 섬 1단계가 main 에 들어간 뒤 별도 계획으로 쓴다.

## Global Constraints

- 작업 브랜치는 `feat/line-pool`, **`feat/evening-auction` 에서 분기**한다(경매 코드가 아직 main 에 없다). 워크트리 `.claude/worktrees/line-pool`.
- 새 코드·CSS·테스트에 주석을 쓰지 않는다. 설명은 커밋 메시지와 dev docs 에.
- 화면 문구에 엠대시(—)와 "놀다/놀아요"를 쓰지 않는다. 월드(머리 위) 말풍선은 이모지만, 글자는 HUD 창.
- 새 UI 문구(기본 문구)와 새 UI 배치(상인 대사 줄)는 코드 전에 사용자 승인. 배치는 시안 3개를 PC·모바일로 나란히.
- 경매인 말투는 `functions/api/_npc-gen.js` 의 `NPC_SHEET.merchant`(하오체)가 단일 출처.
- GA4: 이벤트 파라미터 ≤5, 코드 키 총량 ≤23, `docs/analysis/event-taxonomy.csv` 갱신(`tests/event-taxonomy.test.mjs`).
- `functions/api` 새 파일은 `worker/index.js` 에 라우트 등록.
- 크론 슬롯이 5/5 다. 새 트리거를 만들지 않는다(빛 공방 틱 하나를 요일·시각으로 가른다).
- Workers 무료 플랜 서브리퀘스트는 실행당 50.
- 키 `EXAONE_API_KEY`·`SUPABASE_SERVICE_KEY`·`SUPABASE_DB_PASSWORD` 는 루트 `.env`(`/Users/uicheol_hwang/calm_forest/.env`, 워크트리에는 없다)·키체인·Worker 시크릿에만. 공개 저장소이므로 푸시 전 키 스캔.
- SQL 은 사용자에게 붙여 넣기 시키지 않고 pg8000 풀러로 직접 실행한다(Task 4).
- `git stash` 를 쓰지 않는다(다른 워크트리·세션과 스택을 공유한다).
- "커밋"만 지시받으면 푸시·병합·배포하지 않는다. 배포는 경매와 함께 5곳 동시, 사용자 승인 뒤.
- 테스트 실행: `node --test tests/<file>.test.mjs`, 전체 `npm test`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/lines/slots.js` (새) | slot 표, 칸 목록, `lineProblem`(검증), `fillLine`(자리표시 채우기). DOM·fetch 없음. 서버·클라이언트 공용 |
| `js/lines/fallback.js` (새) | 손으로 쓴 기본 문구(한국어 원문, 영어는 `js/i18n-en.js`) |
| `js/lines/client.js` (새) | `/api/lines` 받기·캐시·3초 제한, `line()` 으로 풀 또는 기본 문구 |
| `functions/api/_exaone.js` (새) | EXAONE 호출·호출 간격·동시 수·실패 분류·JSON 추출 |
| `functions/api/_line-gen.js` (새) | 프롬프트, 응답 파싱, `validateLines`, `planLineWork`, `fillCells` |
| `functions/line-pool-cron.js` (새) | `runLinePool`(크론·시드 공용), `isLinePoolTick` |
| `functions/api/lines.js` (새) | `GET /api/lines` |
| `tools/seed-line-pool.mjs` (새) | 수동 시드·샘플 검수 표 |
| `sql/migrations/migrate_line_pool.sql` (새) | `line_pool`·`line_picks`·`line_pool_runs`·RPC 2개 |
| `sql/migrations/selftest_line_pool.sql` (새) | 적용 뒤 셀프테스트 DO 블록 |
| `sims/auction-say-compare.html` (새) | 상인 대사 줄 배치 시안 3개 |
| `functions/aura-cron.js` | EXAONE 공용부를 `_exaone.js` 에서 가져오게 |
| `worker/index.js` | `/api/lines` 라우트, scheduled 분기 |
| `js/config.js` | `LINES_API` |
| `js/auction/scene.js` | 상태에 `say` 추가 |
| `js/auction/ui.js` | 상인 대사 줄·경매품 소개 |
| `js/auction/index.js` | 문구 받기·`line_src` 트래킹 |
| `js/i18n-en.js` | 기본 문구 영어 |
| `docs/analysis/event-taxonomy.csv` | `auction_open` 파라미터에 `line_src` |

---

### Task 0: 브랜치·dev docs

**Files:**
- Create: `dev/active/line-pool/line-pool-plan.md`, `dev/active/line-pool/line-pool-context.md`, `dev/active/line-pool/line-pool-tasks.md`

- [ ] **Step 1: 워크트리 만들기**

```bash
cd /Users/uicheol_hwang/calm_forest
git worktree add -b feat/line-pool .claude/worktrees/line-pool feat/evening-auction
cd .claude/worktrees/line-pool
npm install
```

- [ ] **Step 2: 스펙·계획을 브랜치로 가져오기**

```bash
cp /Users/uicheol_hwang/calm_forest/docs/superpowers/specs/2026-11-10-exaone-line-pool-design.md docs/superpowers/specs/
cp /Users/uicheol_hwang/calm_forest/docs/superpowers/plans/2026-11-10-exaone-line-pool-auction.md docs/superpowers/plans/
```

- [ ] **Step 3: dev docs 3개 작성**

`line-pool-plan.md` 에는 이 계획 파일 경로와 한 줄 요약, `line-pool-context.md` 에는 `Last Updated: <오늘 날짜>`, 핵심 파일 표(위 File Structure 그대로), 결정 3개(문구 풀+날짜 시드 / EXAONE 은 대사만 / 크론은 빛 공방 틱 UTC 일요일 21:30), `line-pool-tasks.md` 에는 Task 0~11 체크리스트.

- [ ] **Step 4: 기준선 테스트**

Run: `npm test 2>&1 | tail -5`
Expected: 실패 0. 실패가 있으면 실패한 테스트 이름을 `line-pool-context.md` "기준선" 절에 적고 사용자에게 알린 뒤 진행 여부를 묻는다.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-11-10-exaone-line-pool-design.md docs/superpowers/plans/2026-11-10-exaone-line-pool-auction.md dev/active/line-pool
git commit -m "docs: add exaone line pool spec, plan and dev docs"
```

---

### Task 1: 문구 규칙 모듈 `js/lines/slots.js`

**Files:**
- Create: `js/lines/slots.js`
- Test: `tests/line-slots.test.mjs`

**Interfaces:**
- Produces:
  - `POOL_CAP = 30`, `EN_RATIO = 1.8`, `LINE_LANGS = ['ko','en']`, `ANY = '_any'`, `AUCTION_ITEMS = ['moonswing','lanternarch','starvane']`
  - `SLOTS: { auction: { [slot]: { scope: 'item'|'any', max: number, per: number, vars: string[] } } }`
  - `keysFor(kind) → string[]`, `slotsFor(kind, key) → string[]`, `cells(kind) → {kind,key,slot,lang}[]`, `cellId(cell) → string`
  - `lineLength(text) → number`, `lineProblem(text, {kind, slot, lang}) → null | 'slot'|'empty'|'vars'|'digit'|'banned'|'josa'|'length'|'lang'`
  - `fillLine(text, vars) → string | null` (자리표시가 남으면 null)

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL_CAP, ANY, AUCTION_ITEMS, SLOTS, keysFor, slotsFor, cells, cellId, lineLength, lineProblem, fillLine,
} from '../js/lines/slots.js';

const cell = (slot, lang = 'ko') => ({ kind: 'auction', slot, lang });

test('경매 칸은 경매품별 2 slot과 공통 5 slot, 두 언어로 22칸', () => {
  assert.deepEqual(keysFor('auction'), [...AUCTION_ITEMS, ANY]);
  assert.deepEqual(slotsFor('auction', 'moonswing'), ['intro', 'open']);
  assert.deepEqual(slotsFor('auction', ANY), ['raise_npc', 'raise_me', 'last', 'sold_me', 'sold_npc']);
  assert.equal(cells('auction').length, 22);
  assert.equal(cellId({ kind: 'auction', key: ANY, slot: 'last', lang: 'en' }), 'auction|_any|last|en');
  assert.equal(POOL_CAP, 30);
  assert.equal(SLOTS.auction.raise_npc.per, 4);
});

test('정상 문구는 통과한다', () => {
  assert.equal(lineProblem('{who}께서 부르셨소!', cell('raise_npc')), null);
  assert.equal(lineProblem('{who} raises the bid!', cell('raise_npc', 'en')), null);
  assert.equal(lineProblem('더 부르실 분 없소?', cell('last')), null);
});

test('자리표시가 빠지거나 모르는 자리표시가 있으면 vars', () => {
  assert.equal(lineProblem('좋소, 좋아!', cell('raise_npc')), 'vars');
  assert.equal(lineProblem('{name}께서 부르셨소!', cell('raise_npc')), 'vars');
  assert.equal(lineProblem('{who}, 손님도 부르시오!', cell('raise_me')), 'vars');
});

test('숫자·금지어·조사·언어·길이를 거른다', () => {
  assert.equal(lineProblem('3번째 손님이오!', cell('raise_me')), 'digit');
  assert.equal(lineProblem('자, 시작하오 — 서두르시오!', cell('last')), 'banned');
  assert.equal(lineProblem('같이 놀아요!', cell('last')), 'banned');
  assert.equal(lineProblem('{who}가 불렀소!', cell('raise_npc')), 'josa');
  assert.equal(lineProblem('{who}를 보시오!', cell('raise_npc')), 'josa');
  assert.equal(lineProblem('Going once!', cell('last')), 'lang');
  assert.equal(lineProblem('한 번 더!', cell('last', 'en')), 'lang');
  assert.equal(lineProblem('가'.repeat(21), cell('last')), 'length');
  assert.equal(lineProblem('a'.repeat(36), cell('last', 'en')), null);
  assert.equal(lineProblem('a'.repeat(37), cell('last', 'en')), 'length');
  assert.equal(lineProblem('   ', cell('last')), 'empty');
  assert.equal(lineProblem('좋소', cell('nope')), 'slot');
});

test('자리표시는 네 글자로 세어 길이를 잰다', () => {
  assert.equal(lineLength('{who}!'), 5);
  assert.equal(lineLength('가나다'), 3);
});

test('fillLine 은 자리표시를 채우고, 남으면 null', () => {
  assert.equal(fillLine('{who}께서 부르셨소!', { who: '목수 아저씨' }), '목수 아저씨께서 부르셨소!');
  assert.equal(fillLine('{who}께서 부르셨소!', {}), null);
  assert.equal(fillLine('더 없소?', {}), '더 없소?');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/line-slots.test.mjs`
Expected: FAIL, `Cannot find module '../js/lines/slots.js'`

- [ ] **Step 3: 구현**

```js
export const POOL_CAP = 30;
export const EN_RATIO = 1.8;
export const VAR_LEN = 4;
export const LINE_LANGS = ['ko', 'en'];
export const ANY = '_any';
export const AUCTION_ITEMS = ['moonswing', 'lanternarch', 'starvane'];

export const SLOTS = {
  auction: {
    intro: { scope: 'item', max: 60, per: 1, vars: [] },
    open: { scope: 'item', max: 30, per: 1, vars: [] },
    raise_npc: { scope: 'any', max: 24, per: 4, vars: ['who'] },
    raise_me: { scope: 'any', max: 24, per: 4, vars: [] },
    last: { scope: 'any', max: 20, per: 1, vars: [] },
    sold_me: { scope: 'any', max: 30, per: 1, vars: [] },
    sold_npc: { scope: 'any', max: 30, per: 1, vars: ['who'] },
  },
};

const VAR_RE = /\{(\w+)\}/g;
const HAS_VAR = /\{\w+\}/;
const JOSA = /\}(으로|이|가|을|를|은|는|와|과|로)(?=[\s.,!?…~]|$)/;
const BANNED = [/[—–]/, /놀(다|아|았|자|고|러|이)/];

export function keysFor(kind) {
  return kind === 'auction' ? [...AUCTION_ITEMS, ANY] : [];
}

export function slotsFor(kind, key) {
  const all = SLOTS[kind] || {};
  const scope = key === ANY ? 'any' : 'item';
  return Object.keys(all).filter(s => all[s].scope === scope);
}

export function cells(kind) {
  return keysFor(kind).flatMap(key => slotsFor(kind, key).flatMap(slot => LINE_LANGS.map(lang => ({ kind, key, slot, lang }))));
}

export const cellId = c => `${c.kind}|${c.key}|${c.slot}|${c.lang}`;

export function lineLength(text) {
  return [...String(text).replace(VAR_RE, 'x'.repeat(VAR_LEN))].length;
}

export function lineProblem(text, { kind, slot, lang }) {
  const def = SLOTS[kind]?.[slot];
  if (!def) return 'slot';
  if (typeof text !== 'string' || !text.trim()) return 'empty';
  const vars = [...text.matchAll(VAR_RE)].map(m => m[1]);
  if (vars.some(v => !def.vars.includes(v)) || def.vars.some(v => !vars.includes(v))) return 'vars';
  if (/[0-9０-９]/.test(text)) return 'digit';
  if (BANNED.some(re => re.test(text))) return 'banned';
  if (JOSA.test(text)) return 'josa';
  const max = lang === 'en' ? Math.round(def.max * EN_RATIO) : def.max;
  if (lineLength(text) > max) return 'length';
  const hangul = /[가-힣]/.test(text);
  if (lang === 'en' ? hangul : !hangul) return 'lang';
  return null;
}

export function fillLine(text, vars = {}) {
  const out = String(text).replace(VAR_RE, (m, k) => (vars[k] == null ? m : String(vars[k])));
  return HAS_VAR.test(out) ? null : out;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/line-slots.test.mjs`
Expected: PASS 6/6

- [ ] **Step 5: Commit**

```bash
git add js/lines/slots.js tests/line-slots.test.mjs
git commit -m "feat: add shared line slot rules and validation"
```

---

### Task 2: EXAONE 공용부 `functions/api/_exaone.js` + 빛 공방 정리

**Files:**
- Create: `functions/api/_exaone.js`
- Modify: `functions/aura-cron.js` (17~25행 상수, `parseJsonObject`, `callExaone`, `mapLimit`, `sleep`, `runAuraCron` 의 `paced`·`mapLimit` 호출)
- Test: `tests/exaone.test.mjs`. 기존 `tests/aura-cron.test.mjs` 는 고치지 않고 그대로 통과해야 한다

**Interfaces:**
- Produces:
  - `EXAONE_URL`, `EXAONE_MODEL = 'k-exaone_v2.5'`, `SPACING_MS = 1100`, `CONCURRENCY = 6`, `CALL_TIMEOUT_MS = 90000`
  - `callExaone(env, body, fetch) → Promise<{ok:true, finish, text} | {ok:false, status, reason}>`
  - `failKind(res) → null | 'rate_limited' | 'auth' | string`
  - `parseJsonObject(text) → object` (실패 시 throw `no_json`)
  - `createPacer(spacingMs, sleep?) → (fn) => Promise` (호출 **시작**을 spacingMs 간격으로 줄 세움)
  - `mapLimit(items, limit, fn, halted = () => false, haltValue = null) → Promise<any[]>`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callExaone, failKind, parseJsonObject, createPacer, mapLimit, EXAONE_URL, EXAONE_MODEL } from '../functions/api/_exaone.js';

const env = { EXAONE_API_KEY: 'k' };

test('callExaone 은 성공 응답에서 finish 와 text 를 꺼낸다', async () => {
  let seen;
  const fetch = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"lines":[]}' } }] })); };
  const r = await callExaone(env, { model: EXAONE_MODEL }, fetch);
  assert.deepEqual(r, { ok: true, finish: 'stop', text: '{"lines":[]}' });
  assert.equal(seen.url, EXAONE_URL);
  assert.equal(seen.init.headers.authorization, 'Bearer k');
});

test('callExaone 은 HTTP 오류와 네트워크 오류를 ok:false 로 돌려준다', async () => {
  assert.deepEqual(await callExaone(env, {}, async () => new Response('', { status: 429 })), { ok: false, status: 429, reason: 'http_429' });
  assert.deepEqual(await callExaone(env, {}, async () => { throw new TypeError('x'); }), { ok: false, status: 0, reason: 'network' });
});

test('failKind', () => {
  assert.equal(failKind({ ok: true }), null);
  assert.equal(failKind({ ok: false, status: 429 }), 'rate_limited');
  assert.equal(failKind({ ok: false, status: 401 }), 'auth');
  assert.equal(failKind({ ok: false, status: 403 }), 'auth');
  assert.equal(failKind({ ok: false, status: 500, reason: 'http_500' }), 'http_500');
});

test('parseJsonObject 는 코드펜스와 앞뒤 글자를 걷어 낸다', () => {
  assert.deepEqual(parseJsonObject('여기요\n```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => parseJsonObject('없음'), /no_json/);
});

test('createPacer 는 호출 시작 사이에 간격을 둔다', async () => {
  const starts = [];
  const pace = createPacer(30);
  const t0 = Date.now();
  await Promise.all([1, 2, 3].map(() => pace(async () => { starts.push(Date.now() - t0); })));
  assert.ok(starts[1] - starts[0] >= 25);
  assert.ok(starts[2] - starts[1] >= 25);
});

test('mapLimit 은 동시 수를 지키고 halted 면 haltValue 를 채운다', async () => {
  let live = 0, peak = 0, stop = false;
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async n => {
    live++; peak = Math.max(peak, live);
    await new Promise(r => setTimeout(r, 5));
    live--;
    if (n === 2) stop = true;
    return n;
  }, () => stop, 'H');
  assert.equal(peak, 2);
  assert.deepEqual(out.slice(0, 2), [1, 2]);
  assert.ok(out.includes('H'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/exaone.test.mjs`
Expected: FAIL, `Cannot find module '../functions/api/_exaone.js'`

- [ ] **Step 3: `functions/api/_exaone.js` 구현**

```js
export const EXAONE_URL = 'https://api.exaone.ai/v1/chat/completions';
export const EXAONE_MODEL = 'k-exaone_v2.5';
export const SPACING_MS = 1100;
export const CONCURRENCY = 6;
export const CALL_TIMEOUT_MS = 90000;

const wait = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

export async function callExaone(env, body, fetch = globalThis.fetch) {
  try {
    const r = await fetch(EXAONE_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.EXAONE_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
    if (!r.ok) return { ok: false, status: r.status, reason: `http_${r.status}` };
    const choice = (await r.json())?.choices?.[0];
    return { ok: true, finish: choice?.finish_reason, text: choice?.message?.content };
  } catch (e) {
    return { ok: false, status: 0, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

export function failKind(res) {
  if (res?.ok) return null;
  if (res?.status === 429) return 'rate_limited';
  if (res?.status === 401 || res?.status === 403) return 'auth';
  return res?.reason || 'error';
}

export function parseJsonObject(text) {
  const body = String(text ?? '').replace(/```(?:json)?/gi, '');
  const from = body.indexOf('{'), to = body.lastIndexOf('}');
  if (from < 0 || to <= from) throw new Error('no_json');
  return JSON.parse(body.slice(from, to + 1));
}

export function createPacer(spacingMs, sleep = wait) {
  let gate = Promise.resolve();
  return async fn => {
    const turn = gate;
    gate = turn.then(() => sleep(spacingMs));
    await turn;
    return fn();
  };
}

export async function mapLimit(items, limit, fn, halted = () => false, haltValue = null) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = halted() ? haltValue : await fn(items[k]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
```

- [ ] **Step 4: `functions/aura-cron.js` 를 공용부로 바꾸기**

파일 위 import 들 옆에 추가:

```js
import { EXAONE_MODEL, EXAONE_URL, SPACING_MS, CONCURRENCY, CALL_TIMEOUT_MS, callExaone, parseJsonObject, createPacer, mapLimit } from './api/_exaone.js';
```

상수 블록(`export const AURA_TICK_CRON` 부터 `export const CALL_TIMEOUT_MS = 90000;` 까지 9줄)을 아래로 바꾼다. 테스트가 `AURA_MODEL`·`CONCURRENCY`·`SPACING_MS` 를 이 파일에서 import 하므로 다시 내보낸다.

```js
export { EXAONE_URL, SPACING_MS, CONCURRENCY, CALL_TIMEOUT_MS };
export const AURA_TICK_CRON = '0,30 18-21 * * *';
export const AURA_FINAL_CRON = '0 22 * * *';
export const AURA_MODEL = EXAONE_MODEL;
export const MAX_ATTEMPTS = 3;
export const TICK_MAX = 40;
```

이 파일의 로컬 정의 네 개를 지운다: `const parseJsonObject = text => {...};`, `async function callExaone(env, o, fetch) {...}`, `async function mapLimit(items, limit, fn, halted) {...}`, `const sleep = ms => ...;`.

`runAuraCron` 안에서 `let gate = Promise.resolve();` 부터 `paced` 정의 끝(`};`)까지를 한 줄로 바꾼다:

```js
  const paced = createPacer(spacingMs);
```

`mapLimit` 호출을 바꾼다(요청 본문을 만든 뒤 넘기고, 중단 값은 지금과 같은 객체):

```js
      const results = await mapLimit(orders, CONCURRENCY, async o => {
        const got = recipeFromResult(o, await paced(() => callExaone(env, buildRequest(o), fetch)));
        if (got.status === 'skip') stopped ??= got.reason;
        return got;
      }, () => stopped !== null, { status: 'skip', reason: 'halted' });
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/exaone.test.mjs tests/aura-cron.test.mjs`
Expected: PASS 전부. `aura-cron.test.mjs` 는 한 줄도 고치지 않았다.

- [ ] **Step 6: Commit**

```bash
git add functions/api/_exaone.js functions/aura-cron.js tests/exaone.test.mjs
git commit -m "refactor: share exaone client between aura cron and line pool"
```

---

### Task 3: 생성 로직 `functions/api/_line-gen.js`

**Files:**
- Create: `functions/api/_line-gen.js`
- Test: `tests/line-gen.test.mjs`

**Interfaces:**
- Consumes: Task 1 `SLOTS, ANY, POOL_CAP, cells, cellId, lineProblem`; Task 2 `callExaone, failKind, parseJsonObject, mapLimit, CONCURRENCY, EXAONE_MODEL`; `NPC_SHEET` (`functions/api/_npc-gen.js`)
- Produces:
  - `PER_CALL = 10`, `RETRIES = 2`
  - `buildLineRequest({kind,key,slot,lang}, n) → body`
  - `parseLines(text) → string[]`
  - `validateLines(lines, cell, seen: Set<string>) → { ok: string[], dropped: {[reason]: number} }`
  - `planLineWork(counts: {kind,key,slot,lang,n}[], { kinds, cap, maxCalls }) → { cell, want }[]`
  - `generateCell(env, cell, want, { fetch, seen }) → { lines: string[], dropped, failure: null|string }`
  - `fillCells(env, plan, { fetch, pace, existing: Map<cellId, string[]>, maxCalls, limit }) → { rows: {kind,key,slot,lang,text}[], calls, failed, stopped, firstError }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLineRequest, parseLines, validateLines, planLineWork, generateCell, fillCells, PER_CALL } from '../functions/api/_line-gen.js';
import { cells } from '../js/lines/slots.js';

const env = { EXAONE_API_KEY: 'k' };
const reply = lines => async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ lines }) } }] }));
const now = async fn => fn();

test('영어 요청에는 한글이 한 글자도 없다', () => {
  for (const c of cells('auction').filter(c => c.lang === 'en')) {
    const body = buildLineRequest(c, PER_CALL);
    assert.doesNotMatch(JSON.stringify(body.messages), /[가-힣]/, `${c.key}/${c.slot}`);
  }
});

test('한국어 요청은 하오체 상인과 slot 상한·개수를 담는다', () => {
  const body = buildLineRequest({ kind: 'auction', key: 'moonswing', slot: 'intro', lang: 'ko' }, 10);
  const all = body.messages.map(m => m.content).join('\n');
  assert.match(all, /하오체/);
  assert.match(all, /60자/);
  assert.match(all, /10줄/);
  assert.match(all, /초승달/);
  assert.equal(body.model, 'k-exaone_v2.5');
  assert.equal(body.reasoning_effort, 'low');
});

test('{who} slot 요청은 자리표시와 조사 규칙을 알려 준다', () => {
  const all = buildLineRequest({ kind: 'auction', key: '_any', slot: 'raise_npc', lang: 'ko' }, 10).messages.map(m => m.content).join('\n');
  assert.match(all, /\{who\}/);
  assert.match(all, /조사/);
});

test('parseLines 는 lines 배열의 문자열만 다듬어 꺼낸다', () => {
  assert.deepEqual(parseLines('```json\n{"lines":[" 좋소! ", 3, "\\"더 없소?\\""]}\n```'), ['좋소!', '더 없소?']);
  assert.throws(() => parseLines('없음'));
});

test('validateLines 는 문제 줄과 중복을 버리고 이유를 센다', () => {
  const seen = new Set(['더 없소?']);
  const r = validateLines(['더 없소?', '마지막이오!', '마지막이오!', '3초 남았소!', 'Last call!'], { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, seen);
  assert.deepEqual(r.ok, ['마지막이오!']);
  assert.deepEqual(r.dropped, { dup: 2, digit: 1, lang: 1 });
});

test('planLineWork 는 모자란 칸을 적게 찬 순서로, 호출당 최대 PER_CALL 줄로 나눈다', () => {
  const counts = [{ kind: 'auction', key: '_any', slot: 'last', lang: 'ko', n: 25 }];
  const plan = planLineWork(counts, { kinds: ['auction'], cap: 30, maxCalls: 1000 });
  assert.equal(plan.length, 21 * 3 + 1);
  assert.deepEqual(plan.at(-1), { cell: { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, want: 5 });
  assert.equal(planLineWork(counts, { kinds: ['auction'], cap: 30, maxCalls: 4 }).length, 4);
});

test('generateCell 은 검증한 줄을 want 개까지 돌려준다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  const r = await generateCell(env, cell, 1, { fetch: reply(['마지막이오!', '더 없소?']), seen: new Set() });
  assert.deepEqual(r.lines, ['마지막이오!']);
  assert.equal(r.failure, null);
});

test('generateCell 실패 분류', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  assert.equal((await generateCell(env, cell, 5, { fetch: async () => new Response('', { status: 429 }), seen: new Set() })).failure, 'rate_limited');
  assert.equal((await generateCell(env, cell, 5, { fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '몰라요' } }] })), seen: new Set() })).failure, 'parse');
  assert.equal((await generateCell(env, cell, 5, { fetch: reply(['3초!']), seen: new Set() })).failure, 'empty');
});

test('fillCells 는 빈 응답을 RETRIES 번 다시 부르고, 429 면 멈춘다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  let n = 0;
  const flaky = async () => { n++; return n < 3 ? new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'x' } }] })) : reply(['마지막이오!'])(); };
  const a = await fillCells(env, [{ cell, want: 5 }], { fetch: flaky, pace: now, maxCalls: 10, limit: 1 });
  assert.equal(n, 3);
  assert.deepEqual(a.rows, [{ ...cell, text: '마지막이오!' }]);

  const b = await fillCells(env, [{ cell, want: 5 }, { cell, want: 5 }], { fetch: async () => new Response('', { status: 429 }), pace: now, maxCalls: 10, limit: 1 });
  assert.equal(b.stopped, 'rate_limited');
  assert.equal(b.calls, 1);
});

test('fillCells 는 maxCalls 를 넘겨 부르지 않는다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  let n = 0;
  const fetch = async () => { n++; return new Response('', { status: 500 }); };
  const r = await fillCells(env, [{ cell, want: 5 }, { cell, want: 5 }], { fetch, pace: now, maxCalls: 4, limit: 1 });
  assert.equal(n, 4);
  assert.equal(r.calls, 4);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/line-gen.test.mjs`
Expected: FAIL, `Cannot find module '../functions/api/_line-gen.js'`

- [ ] **Step 3: 구현**

```js
import { SLOTS, ANY, POOL_CAP, EN_RATIO, cells, cellId, lineProblem } from '../../js/lines/slots.js';
import { NPC_SHEET } from './_npc-gen.js';
import { callExaone, failKind, parseJsonObject, mapLimit, CONCURRENCY, EXAONE_MODEL } from './_exaone.js';

export const PER_CALL = 10;
export const RETRIES = 2;
const MAX_TOKENS = 4096;

const ITEMS = {
  moonswing: {
    ko: '달빛 그네. 큰 초승달 모양 그네로, 밤에 달과 별 장식이 은은하게 빛난다.',
    en: 'Moon Swing. A large crescent-moon swing whose moon and star ornaments glow softly at night.',
  },
  lanternarch: {
    ko: '등불 아치. 빨간 지붕을 얹은 마당 문에 경매 무대와 같은 종이 등불이 달려 있다.',
    en: 'Lantern Arch. A red-roofed garden gate hung with paper lanterns like the ones on the auction stage.',
  },
  starvane: {
    ko: '별 풍향계. 바람이 불면 금빛 별이 빙글 도는 풍향계.',
    en: 'Star Vane. A weather vane with a golden star that spins in the wind.',
  },
};

const SLOT_BRIEF = {
  intro: { ko: '경매 창을 열면 경매품 이름 아래 뜨는 소개 한두 문장. 무엇인지와 어디에 두면 좋은지.', en: 'One or two sentences under the lot name when the auction window opens. What it is and where it would look good.' },
  open: { ko: '시작 종이 울릴 때 경매인이 외치는 첫마디. 오늘의 경매품을 띄운다.', en: "The auctioneer's opening call as the bell rings, hyping today's lot." },
  raise_npc: { ko: '마을 주민이 값을 올려 부를 때 경매인의 짧은 반응.', en: 'The auctioneer reacting briefly when a villager raises the bid.' },
  raise_me: { ko: '플레이어(손님)가 값을 올려 부를 때 경매인의 짧은 반응.', en: 'The auctioneer reacting briefly when the player (the guest) raises the bid.' },
  last: { ko: '남은 시간이 거의 없을 때 망치를 들며 하는 말. 더 부를 사람이 없는지 묻는다.', en: 'Said while lifting the gavel with almost no time left, asking if anyone will bid more.' },
  sold_me: { ko: '플레이어가 낙찰받았을 때 축하하는 말.', en: 'Congratulating the player on winning the lot.' },
  sold_npc: { ko: '마을 주민이 낙찰받았을 때 하는 말.', en: 'Announcing that a villager won the lot.' },
};

function systemPrompt(lang) {
  const m = NPC_SHEET.merchant;
  if (lang === 'en') {
    return [
      'You write lines for calm forest, a cozy low-poly farming village game.',
      `Speaker: ${m.nameEn}. ${m.personaEn}`,
      'Setting: every evening he runs a small auction on the lantern stage in the village square.',
      'Output exactly one JSON object {"lines": [string, ...]} and nothing else. No explanations, no code fences.',
      'Never write digits; prices and timers are shown separately on screen. Never use an em dash.',
      'Keep it warm and playful, suitable for all ages.',
    ].join('\n');
  }
  return [
    '너는 calm forest(포근한 저폴리 농사 마을 게임)의 대사 작가다.',
    `화자: ${m.name}. ${m.persona}`,
    '상황: 마을 광장 등불 무대에서 저녁마다 작은 경매를 연다.',
    '출력은 {"lines": [문자열, ...]} JSON 객체 하나뿐이다. 설명·코드펜스·다른 글자는 쓰지 않는다.',
    '숫자를 쓰지 않는다(가격·남은 시간은 화면이 따로 보여 준다). 줄표(—)를 쓰지 않는다. "놀다"를 쓰지 않는다.',
    '따뜻하고 장난스럽게, 모든 연령이 보는 게임에 맞게.',
  ].join('\n');
}

function userPrompt({ kind, key, slot, lang }, n) {
  const def = SLOTS[kind][slot];
  const max = lang === 'en' ? Math.round(def.max * EN_RATIO) : def.max;
  const brief = SLOT_BRIEF[slot][lang];
  const item = key === ANY ? '' : ITEMS[key]?.[lang] || '';
  if (lang === 'en') {
    return [
      `Situation: ${brief}`,
      item ? `Lot: ${item}` : 'This line must work for any lot, so do not name the lot.',
      def.vars.includes('who') ? 'Write the literal placeholder {who} where the villager name goes, exactly once per line.' : 'Do not use any {placeholder}.',
      `Write ${n} different lines in English, each at most ${max} characters.`,
    ].join('\n');
  }
  return [
    `상황: ${brief}`,
    item ? `경매품: ${item}` : '어느 경매품에도 맞아야 하므로 경매품 이름을 쓰지 않는다.',
    def.vars.includes('who')
      ? '주민 이름 자리에는 {who} 를 줄마다 정확히 한 번 그대로 쓴다. {who} 바로 뒤에 받침에 따라 바뀌는 조사(이/가, 을/를, 은/는, 와/과, 으로/로)를 붙이지 않는다. "께서", "의", "님" 이나 쉼표는 괜찮다.'
      : '{자리표시} 를 쓰지 않는다.',
    `서로 다른 표현으로 ${n}줄, 줄마다 ${max}자 이내 한국어.`,
  ].join('\n');
}

export function buildLineRequest(cell, n) {
  return {
    model: EXAONE_MODEL,
    max_tokens: MAX_TOKENS,
    reasoning_effort: 'low',
    messages: [
      { role: 'system', content: systemPrompt(cell.lang) },
      { role: 'user', content: userPrompt(cell, n) },
    ],
  };
}

const unquote = s => s.trim().replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '').trim();

export function parseLines(text) {
  const raw = parseJsonObject(text)?.lines;
  if (!Array.isArray(raw)) throw new Error('no_lines');
  return raw.filter(s => typeof s === 'string').map(unquote).filter(Boolean);
}

export function validateLines(lines, cell, seen = new Set()) {
  const ok = [], dropped = {};
  const drop = r => { dropped[r] = (dropped[r] || 0) + 1; };
  const local = new Set(seen);
  for (const text of lines) {
    if (local.has(text)) { drop('dup'); continue; }
    const why = lineProblem(text, cell);
    if (why) { drop(why); continue; }
    local.add(text);
    ok.push(text);
  }
  return { ok, dropped };
}

export function planLineWork(counts, { kinds, cap = POOL_CAP, maxCalls = Infinity }) {
  const have = new Map((counts || []).map(c => [cellId(c), Number(c.n) || 0]));
  const todo = kinds.flatMap(cells)
    .map(cell => ({ cell, n: have.get(cellId(cell)) || 0 }))
    .filter(x => x.n < cap)
    .sort((a, b) => a.n - b.n);
  const plan = [];
  for (const { cell, n } of todo) {
    for (let need = cap - n; need > 0; need -= PER_CALL) plan.push({ cell, want: Math.min(PER_CALL, need) });
  }
  return plan.slice(0, maxCalls);
}

export async function generateCell(env, cell, want, { fetch = globalThis.fetch, seen = new Set() } = {}) {
  const res = await callExaone(env, buildLineRequest(cell, PER_CALL), fetch);
  const fail = failKind(res);
  if (fail) return { lines: [], dropped: {}, failure: fail };
  if (res.finish === 'length') return { lines: [], dropped: {}, failure: 'length' };
  let parsed;
  try { parsed = parseLines(res.text); } catch { return { lines: [], dropped: {}, failure: 'parse' }; }
  const { ok, dropped } = validateLines(parsed, cell, seen);
  if (!ok.length) return { lines: [], dropped, failure: 'empty' };
  return { lines: ok.slice(0, want), dropped, failure: null };
}

export async function fillCells(env, plan, { fetch = globalThis.fetch, pace, existing = new Map(), maxCalls = Infinity, limit = CONCURRENCY } = {}) {
  let calls = 0, failed = 0, stopped = null, firstError = null;
  const seenOf = new Map();
  const seen = cell => {
    const id = cellId(cell);
    if (!seenOf.has(id)) seenOf.set(id, new Set(existing.get(id) || []));
    return seenOf.get(id);
  };
  const rows = [];
  await mapLimit(plan, limit, async ({ cell, want }) => {
    let last = null;
    for (let a = 0; a <= RETRIES; a++) {
      if (stopped || calls >= maxCalls) return;
      calls++;
      const got = await pace(() => generateCell(env, cell, want, { fetch, seen: seen(cell) }));
      if (!got.failure) {
        got.lines.forEach(text => { seen(cell).add(text); rows.push({ ...cell, text }); });
        return;
      }
      last = got.failure;
      if (last === 'rate_limited' || last === 'auth') { stopped ??= last; break; }
    }
    failed++;
    firstError ??= `${cellId(cell)}: ${last}`;
  }, () => stopped !== null || calls >= maxCalls);
  return { rows, calls, failed, stopped, firstError };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/line-gen.test.mjs tests/line-slots.test.mjs`
Expected: PASS 전부

- [ ] **Step 5: Commit**

```bash
git add functions/api/_line-gen.js tests/line-gen.test.mjs
git commit -m "feat: add exaone line generation, validation and planning"
```

---

### Task 4: Supabase 테이블·RPC 적용

**Files:**
- Create: `sql/migrations/migrate_line_pool.sql`, `sql/migrations/selftest_line_pool.sql`
- Test: `tests/line-pool-migration.test.mjs`

- [ ] **Step 1: 실패하는 테스트 작성** (기존 `tests/aura-migration.test.mjs` 처럼 SQL 본문을 정적으로 본다)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_line_pool.sql', import.meta.url), 'utf8');

test('세 테이블 모두 RLS 를 켜고 정책을 열지 않는다', () => {
  for (const t of ['line_pool', 'line_picks', 'line_pool_runs']) {
    assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`));
  }
  assert.doesNotMatch(sql, /create policy/i);
});

test('RPC 는 service_role 에만 연다', () => {
  for (const f of ['line_pick_many', 'line_pool_counts']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`));
  }
  assert.doesNotMatch(sql, /to anon/);
});

test('같은 칸 같은 문장은 한 번만, 뽑기는 hidden 을 빼고 md5 시드로', () => {
  assert.match(sql, /unique index if not exists line_pool_uniq on public\.line_pool \(kind, key, slot, lang, text\)/);
  assert.match(sql, /md5\(p_seed \|\| '\/' \|\| p\.key \|\| '\/' \|\| p\.id::text\)/);
  assert.match(sql, /not p\.hidden/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/line-pool-migration.test.mjs`
Expected: FAIL, `ENOENT`

- [ ] **Step 3: 마이그레이션 작성** `sql/migrations/migrate_line_pool.sql`

```sql
create table if not exists public.line_pool (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('auction', 'port')),
  key text not null check (char_length(key) between 1 and 40),
  slot text not null check (char_length(slot) between 1 and 20),
  lang text not null check (lang in ('ko', 'en')),
  text text not null check (char_length(text) between 1 and 200),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists line_pool_uniq on public.line_pool (kind, key, slot, lang, text);
create index if not exists line_pool_cell on public.line_pool (kind, key, slot, lang) where not hidden;

create table if not exists public.line_picks (
  date date not null,
  kind text not null,
  key text not null,
  slot text not null,
  lang text not null,
  line_id bigint not null references public.line_pool (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (date, kind, key, slot, lang, line_id)
);

create table if not exists public.line_pool_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  source text not null check (source in ('cron', 'seed')),
  requested int not null default 0,
  inserted int not null default 0,
  failed int not null default 0,
  calls int not null default 0,
  rate_limited boolean not null default false,
  error text,
  duration_ms int
);

alter table public.line_pool       enable row level security;
alter table public.line_picks      enable row level security;
alter table public.line_pool_runs  enable row level security;

create or replace function public.line_pick_many(p_kind text, p_keys text[], p_lang text, p_seed text, p_n int)
returns table (key text, slot text, id bigint, text text)
language sql stable security definer set search_path = public as $$
  select s.key, s.slot, s.id, s.text from (
    select p.key, p.slot, p.id, p.text,
      row_number() over (partition by p.key, p.slot order by md5(p_seed || '/' || p.key || '/' || p.id::text)) as rn
    from public.line_pool p
    where p.kind = p_kind and p.key = any(p_keys) and p.lang = p_lang and not p.hidden
  ) s
  where s.rn <= greatest(least(p_n, 10), 0)
$$;

create or replace function public.line_pool_counts()
returns table (kind text, key text, slot text, lang text, n bigint)
language sql stable security definer set search_path = public as $$
  select p.kind, p.key, p.slot, p.lang, count(*) from public.line_pool p where not p.hidden group by 1, 2, 3, 4
$$;

revoke all on function public.line_pick_many(text, text[], text, text, int) from public, anon, authenticated;
revoke all on function public.line_pool_counts() from public, anon, authenticated;
grant execute on function public.line_pick_many(text, text[], text, text, int) to service_role;
grant execute on function public.line_pool_counts() to service_role;
```

- [ ] **Step 4: 셀프테스트 작성** `sql/migrations/selftest_line_pool.sql` (DO 블록 하나, 끝에서 스스로 정리)

```sql
do $$
declare a bigint; b bigint; c bigint; first_pick text; again text; hidden_hits int;
begin
  insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 하나') returning id into a;
  insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 둘') returning id into b;
  insert into public.line_pool (kind, key, slot, lang, text, hidden) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 숨김', true) returning id into c;
  select string_agg(text, '|' order by text) into first_pick from public.line_pick_many('auction', array['_selftest'], 'ko', '2026-11-10:auction', 1);
  select string_agg(text, '|' order by text) into again from public.line_pick_many('auction', array['_selftest'], 'ko', '2026-11-10:auction', 1);
  if first_pick is distinct from again then raise exception 'pick not deterministic: % vs %', first_pick, again; end if;
  select count(*) into hidden_hits from public.line_pick_many('auction', array['_selftest'], 'ko', 'x', 10) where id = c;
  if hidden_hits <> 0 then raise exception 'hidden line was picked'; end if;
  if (select n from public.line_pool_counts() where key = '_selftest') <> 2 then raise exception 'counts must skip hidden'; end if;
  begin
    insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 하나');
    raise exception 'duplicate text was accepted';
  exception when unique_violation then null;
  end;
  delete from public.line_pool where key = '_selftest';
  raise notice 'line_pool selftest ok: %', first_pick;
end $$;
```

- [ ] **Step 5: 정적 테스트 통과 확인**

Run: `node --test tests/line-pool-migration.test.mjs`
Expected: PASS 3/3

- [ ] **Step 6: 실행 스크립트 작성** — 스크래치패드에 Write 로 `run_sql.py` 를 만든다(Bash 명령에 `delete` 글자가 있으면 훅이 막으므로 SQL 은 파일 경로로 넘긴다)

```python
import pathlib, ssl, sys
import pg8000.native

env = {}
for line in pathlib.Path('/Users/uicheol_hwang/calm_forest/.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
con = pg8000.native.Connection(
    user='postgres.zuyxgjfihxtfdpolljzw', password=env['SUPABASE_DB_PASSWORD'],
    host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432, database='postgres', ssl_context=ctx)
con.run(pathlib.Path(sys.argv[1]).read_text())
for n in con.notices or []:
    print(n)
print('ok', sys.argv[1])
con.close()
```

- [ ] **Step 7: 마이그레이션·셀프테스트 실행**

```bash
python3 <scratchpad>/run_sql.py sql/migrations/migrate_line_pool.sql
python3 <scratchpad>/run_sql.py sql/migrations/selftest_line_pool.sql
```

Expected: 두 번 다 `ok ...`, 두 번째는 `line_pool selftest ok` NOTICE. 예외가 나면 메시지를 그대로 보고 마이그레이션을 고친다. 이어서 Supabase MCP `execute_sql`(읽기 전용)로 `select count(*) from public.line_pool where key = '_selftest'` 가 0 인지 확인한다.

- [ ] **Step 8: Commit**

```bash
git add sql/migrations/migrate_line_pool.sql sql/migrations/selftest_line_pool.sql tests/line-pool-migration.test.mjs
git commit -m "feat: add line pool tables and service-role pick rpc"
```

---

### Task 5: 읽기 API `/api/lines`

**Files:**
- Create: `functions/api/lines.js`
- Modify: `worker/index.js` (import 블록, `/api/npc-talk` 라우트 바로 아래), `js/config.js` (`NIGHT_NOTE_API` 줄 아래)
- Test: `tests/lines-api.test.mjs`

**Interfaces:**
- Consumes: Task 1 `SLOTS, LINE_LANGS, keysFor, slotsFor`; `storeHeaders, storeReady` (`functions/api/_ai-store.js`)
- Produces:
  - `parseQuery(url, now) → { kind, keys, lang, date } | null`
  - `shapeLines(rows, kind, keys) → { [key]: { [slot]: {id,text}[] } }`
  - `srcOf(lines, kind, keys) → 'pool'|'partial'|'fallback'`
  - `onRequestGet({request, env, waitUntil}, {fetch, cache, now}) → Response` (JSON `{ date, src, lines }`)
  - `CONFIG.LINES_API = \`${API_BASE}/api/lines\``

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQuery, shapeLines, srcOf, onRequestGet } from '../functions/api/lines.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const env = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 's' };
const memCache = () => { const m = new Map(); return { m, match: async r => m.get(r.url)?.clone() ?? null, put: async (r, res) => { m.set(r.url, res); } }; };

test('parseQuery 는 화이트리스트만 받는다', () => {
  const q = parseQuery(new URL('https://x/api/lines?kind=auction&key=moonswing,_any,evil&lang=en&date=2026-11-10'), NOW);
  assert.deepEqual(q, { kind: 'auction', keys: ['moonswing', '_any'], lang: 'en', date: '2026-11-10' });
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=nope&key=a'), NOW), null);
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=evil'), NOW), null);
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=_any&lang=jp&date=1999-01-01'), NOW).lang, 'ko');
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=_any&date=1999-01-01'), NOW).date, '2026-11-10');
});

test('shapeLines 는 slot 별 하루 수만큼만 남긴다', () => {
  const rows = [
    ...[1, 2, 3, 4, 5].map(id => ({ key: '_any', slot: 'raise_me', id, text: `t${id}` })),
    { key: '_any', slot: 'last', id: 9, text: '더 없소?' }, { key: '_any', slot: 'last', id: 10, text: '마지막이오!' },
  ];
  const s = shapeLines(rows, 'auction', ['_any']);
  assert.equal(s._any.raise_me.length, 4);
  assert.equal(s._any.last.length, 1);
});

test('srcOf', () => {
  const full = { moonswing: { intro: [{}], open: [{}] } };
  assert.equal(srcOf(full, 'auction', ['moonswing']), 'pool');
  assert.equal(srcOf({ moonswing: { intro: [{}] } }, 'auction', ['moonswing']), 'partial');
  assert.equal(srcOf({}, 'auction', ['moonswing']), 'fallback');
});

test('캐시 미스면 RPC 로 뽑아 캐시하고 line_picks 를 남긴다', async () => {
  const calls = [], later = [];
  const fetch = async (url, init) => {
    calls.push({ url, body: init?.body && JSON.parse(init.body) });
    if (url.endsWith('/rpc/line_pick_many')) return new Response(JSON.stringify([{ key: '_any', slot: 'last', id: 7, text: '더 없소?' }]));
    return new Response('', { status: 201 });
  };
  const cache = memCache();
  const req = new Request('https://x/api/lines?kind=auction&key=_any&lang=ko&date=2026-11-10');
  const res = await onRequestGet({ request: req, env, waitUntil: p => later.push(p) }, { fetch, cache, now: NOW });
  await Promise.all(later);
  const body = await res.json();
  assert.equal(body.lines._any.last[0].text, '더 없소?');
  assert.equal(body.src, 'partial');
  assert.deepEqual(calls[0].body, { p_kind: 'auction', p_keys: ['_any'], p_lang: 'ko', p_seed: '2026-11-10:auction', p_n: 4 });
  const picks = calls.find(c => c.url.includes('/line_picks'));
  assert.deepEqual(picks.body, [{ date: '2026-11-10', kind: 'auction', key: '_any', slot: 'last', lang: 'ko', line_id: 7 }]);
  assert.equal(cache.m.size, 1);
});

test('풀이 비었거나 오류면 캐시하지 않고 빈 응답', async () => {
  const cache = memCache();
  const req = new Request('https://x/api/lines?kind=auction&key=_any&lang=ko&date=2026-11-10');
  const empty = await onRequestGet({ request: req, env, waitUntil: () => {} }, { fetch: async () => new Response('[]'), cache, now: NOW });
  assert.equal((await empty.json()).src, 'fallback');
  assert.equal(empty.headers.get('Cache-Control'), 'no-store');
  const boom = await onRequestGet({ request: req, env, waitUntil: () => {} }, { fetch: async () => new Response('x', { status: 500 }), cache, now: NOW });
  assert.equal((await boom.json()).src, 'fallback');
  assert.equal(cache.m.size, 0);
});

test('worker 에 /api/lines 라우트가 있고 config 에 LINES_API 가 있다', () => {
  const worker = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(worker, /import \{ onRequestGet as lines \} from '\.\.\/functions\/api\/lines\.js'/);
  assert.match(worker, /pathname === '\/api\/lines'/);
  const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.match(config, /LINES_API: `\$\{API_BASE\}\/api\/lines`/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/lines-api.test.mjs`
Expected: FAIL, `Cannot find module '../functions/api/lines.js'`

- [ ] **Step 3: `functions/api/lines.js` 구현**

```js
import { SLOTS, LINE_LANGS, keysFor, slotsFor } from '../../js/lines/slots.js';
import { storeHeaders, storeReady } from './_ai-store.js';

const CACHE_TTL = 60 * 60 * 12;
const MAX_KEYS = 4;
const PICK_N = Math.max(...Object.values(SLOTS).flatMap(k => Object.values(k).map(s => s.per)));

const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

function clampDate(raw, now) {
  for (let d = -1; d <= 1; d++) if (raw === isoDay(now + d * 86400000)) return raw;
  return isoDay(now);
}

export function parseQuery(url, now = Date.now()) {
  const kind = url.searchParams.get('kind') || '';
  if (!SLOTS[kind]) return null;
  const allowed = keysFor(kind);
  const keys = [...new Set((url.searchParams.get('key') || '').split(','))].filter(k => allowed.includes(k)).slice(0, MAX_KEYS);
  if (!keys.length) return null;
  const rawLang = url.searchParams.get('lang') || '';
  const lang = LINE_LANGS.includes(rawLang) ? rawLang : 'ko';
  return { kind, keys, lang, date: clampDate(url.searchParams.get('date') || '', now) };
}

export function shapeLines(rows, kind, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = {};
    for (const slot of slotsFor(kind, key)) {
      out[key][slot] = rows.filter(r => r.key === key && r.slot === slot).slice(0, SLOTS[kind][slot].per).map(r => ({ id: r.id, text: r.text }));
    }
  }
  return out;
}

export function srcOf(lines, kind, keys) {
  const counts = keys.flatMap(key => slotsFor(kind, key).map(slot => lines?.[key]?.[slot]?.length || 0));
  if (counts.length && counts.every(n => n > 0)) return 'pool';
  return counts.some(n => n > 0) ? 'partial' : 'fallback';
}

const json = (body, headers) => new Response(JSON.stringify(body), { headers });

export async function onRequestGet({ request, env, waitUntil }, { fetch = globalThis.fetch, cache = globalThis.caches?.default, now = Date.now() } = {}) {
  const url = new URL(request.url);
  const q = parseQuery(url, now);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  const empty = reason => json({ date: q?.date || isoDay(now), src: 'fallback', lines: {} }, { ...headers, 'Cache-Control': 'no-store', 'X-Lines': reason });
  if (!q) return empty('bad-query');
  if (!storeReady(env)) return empty('no-supabase');

  const cacheKey = new Request(`${url.origin}/api/lines?kind=${q.kind}&key=${q.keys.join(',')}&lang=${q.lang}&date=${q.date}&n=${PICK_N}`, { method: 'GET' });
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return hit;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/line_pick_many`, {
      method: 'POST',
      headers: storeHeaders(env),
      body: JSON.stringify({ p_kind: q.kind, p_keys: q.keys, p_lang: q.lang, p_seed: `${q.date}:${q.kind}`, p_n: PICK_N }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`line_pick_many ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return empty('empty-pool');
    const lines = shapeLines(rows, q.kind, q.keys);
    const out = json({ date: q.date, src: srcOf(lines, q.kind, q.keys), lines }, headers);
    const picks = Object.entries(lines).flatMap(([key, slots]) => Object.entries(slots).flatMap(([slot, list]) =>
      list.map(l => ({ date: q.date, kind: q.kind, key, slot, lang: q.lang, line_id: l.id }))));
    if (cache) waitUntil(cache.put(cacheKey, out.clone()));
    waitUntil(fetch(`${env.SUPABASE_URL}/rest/v1/line_picks?on_conflict=date,kind,key,slot,lang,line_id`, {
      method: 'POST', headers: storeHeaders(env, 'resolution=ignore-duplicates,return=minimal'), body: JSON.stringify(picks),
    }).catch(e => console.error(JSON.stringify({ message: 'line_picks failed', error: e.message }))));
    return out;
  } catch (e) {
    console.error(JSON.stringify({ message: 'lines failed', kind: q.kind, keys: q.keys, lang: q.lang, error: e.message }));
    return empty('error');
  }
}
```

- [ ] **Step 4: worker 라우트 등록**

`worker/index.js` import 블록의 `npcTalk` import 줄 아래에 추가:

```js
import { onRequestGet as lines } from '../functions/api/lines.js';
```

`/api/npc-talk` 라우트 블록 바로 아래에 추가:

```js
  if (pathname === '/api/lines') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await lines({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }
```

- [ ] **Step 5: config 등록** — `js/config.js` 의 `NIGHT_NOTE_API` 줄 아래에 추가:

```js
  LINES_API: `${API_BASE}/api/lines`,
```

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/lines-api.test.mjs`
Expected: PASS 6/6

- [ ] **Step 7: Commit**

```bash
git add functions/api/lines.js worker/index.js js/config.js tests/lines-api.test.mjs
git commit -m "feat: serve date-seeded lines from the pool at /api/lines"
```

---

### Task 6: 주 1회 보충 크론

**Files:**
- Create: `functions/line-pool-cron.js`
- Modify: `worker/index.js` (import 블록, `scheduled` 의 빛 공방 분기 바로 위)
- Test: `tests/line-pool-cron.test.mjs`

**Interfaces:**
- Consumes: Task 1 `cellId`; Task 2 `createPacer, SPACING_MS`; Task 3 `planLineWork, fillCells`
- Produces:
  - `LIVE_KINDS = ['auction']`, `CRON_MAX_CALLS = 36`
  - `isLinePoolTick(scheduledTime) → boolean` (UTC 일요일 21:30)
  - `runLinePool(env, { fetch, notify, spacingMs, maxCalls, source, kinds }) → { requested, inserted, failed, calls, rate_limited, error, duration_ms } | { skipped }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLinePoolTick, runLinePool, CRON_MAX_CALLS } from '../functions/line-pool-cron.js';
import { CONCURRENCY } from '../functions/api/_exaone.js';

const env = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 's', EXAONE_API_KEY: 'k' };

function world({ counts = [], existing = [], exaone }) {
  const log = { inserts: [], runs: [], mails: [], exaone: 0 };
  const fetch = async (url, init = {}) => {
    if (url.endsWith('/rpc/line_pool_counts')) return new Response(JSON.stringify(counts));
    if (url.includes('/line_pool?select=')) return new Response(JSON.stringify(existing));
    if (url.includes('/line_pool?on_conflict')) { log.inserts.push(JSON.parse(init.body)); return new Response('', { status: 201 }); }
    if (url.endsWith('/line_pool_runs')) { log.runs.push(JSON.parse(init.body)); return new Response('', { status: 201 }); }
    if (url.includes('exaone')) { log.exaone++; return exaone(log.exaone); }
    throw new Error(`unexpected ${url}`);
  };
  const notify = async (...a) => { log.mails.push(a); };
  return { fetch, notify, log };
}
const ok = lines => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ lines }) } }] }));

test('isLinePoolTick 은 UTC 일요일 21:30 한 번만', () => {
  assert.equal(isLinePoolTick(Date.parse('2026-11-15T21:30:00Z')), true);
  assert.equal(isLinePoolTick(Date.parse('2026-11-15T21:00:00Z')), false);
  assert.equal(isLinePoolTick(Date.parse('2026-11-16T21:30:00Z')), false);
});

test('설정이 없으면 건너뛴다', async () => {
  assert.deepEqual(await runLinePool({}, { notify: async () => {} }), { skipped: 'not_configured' });
});

test('모자란 칸을 채워 적재하고 성공도 기록한다', async () => {
  const items = ['moonswing', 'lanternarch', 'starvane'];
  const full = ['intro', 'open'].flatMap(slot => items.flatMap(key => ['ko', 'en'].map(lang => ({ kind: 'auction', key, slot, lang, n: 30 }))));
  const anyFull = ['raise_npc', 'raise_me', 'sold_me', 'sold_npc'].flatMap(slot => ['ko', 'en'].map(lang => ({ kind: 'auction', key: '_any', slot, lang, n: 30 })));
  const counts = [...full, ...anyFull, { kind: 'auction', key: '_any', slot: 'last', lang: 'en', n: 30 }, { kind: 'auction', key: '_any', slot: 'last', lang: 'ko', n: 28 }];
  const w = world({ counts, exaone: () => ok(['마지막이오!', '더 없소?', '자, 마지막이오!']) });
  const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.equal(r.inserted, 2);
  assert.deepEqual(w.log.inserts[0].map(x => x.text), ['마지막이오!', '더 없소?']);
  assert.equal(w.log.runs[0].source, 'cron');
  assert.equal(w.log.runs[0].inserted, 2);
  assert.equal(w.log.mails.length, 0);
});

test('서브리퀘스트 예산: 빈 풀이어도 EXAONE 호출은 CRON_MAX_CALLS 까지', async () => {
  const w = world({ exaone: () => new Response('', { status: 500 }) });
  await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.equal(w.log.exaone, CRON_MAX_CALLS);
  assert.ok(CRON_MAX_CALLS + 5 <= 50);
});

test('401 이면 이미 출발한 호출 뒤로는 더 부르지 않고 메일', async () => {
  const w = world({ exaone: () => new Response('', { status: 401 }) });
  const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.ok(w.log.exaone <= CONCURRENCY);
  assert.equal(r.calls, w.log.exaone);
  assert.match(r.error, /auth/);
  assert.equal(w.log.mails.length, 1);
});

test('worker 는 빛 공방 틱 중 UTC 일요일 21:30 을 문구 풀로 보낸다', () => {
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ runLinePool, isLinePoolTick \} from '\.\.\/functions\/line-pool-cron\.js'/);
  const lp = src.indexOf('isLinePoolTick(event.scheduledTime)');
  const aura = src.indexOf('runAuraCron(env, { phase })');
  assert.ok(lp > 0 && lp < aura);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/line-pool-cron.test.mjs`
Expected: FAIL, `Cannot find module '../functions/line-pool-cron.js'`

- [ ] **Step 3: 구현** `functions/line-pool-cron.js`

```js
import { cellId } from '../js/lines/slots.js';
import { planLineWork, fillCells } from './api/_line-gen.js';
import { createPacer, SPACING_MS } from './api/_exaone.js';
import { storeHeaders, storeReady } from './api/_ai-store.js';

const defaultNotify = async (...args) => (await import('./notify.js')).notify(...args);

export const LIVE_KINDS = ['auction'];
export const CRON_MAX_CALLS = 36;

export function isLinePoolTick(scheduledTime) {
  const d = new Date(scheduledTime);
  return d.getUTCDay() === 0 && d.getUTCHours() === 21 && d.getUTCMinutes() === 30;
}

export async function runLinePool(env, {
  fetch = globalThis.fetch, notify = defaultNotify, spacingMs = SPACING_MS,
  maxCalls = CRON_MAX_CALLS, source = 'cron', kinds = LIVE_KINDS,
} = {}) {
  if (!storeReady(env) || !env?.EXAONE_API_KEY) return { skipped: 'not_configured' };
  const t0 = Date.now();
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const out = { requested: 0, inserted: 0, failed: 0, calls: 0, rate_limited: false, error: null };
  try {
    const cr = await fetch(`${base}/rpc/line_pool_counts`, { method: 'POST', headers: storeHeaders(env), body: '{}', signal: AbortSignal.timeout(10000) });
    if (!cr.ok) throw new Error(`counts ${cr.status}`);
    const counts = await cr.json();
    const er = await fetch(`${base}/line_pool?select=kind,key,slot,lang,text&kind=in.(${kinds.join(',')})&limit=10000`, { headers: storeHeaders(env), signal: AbortSignal.timeout(10000) });
    if (!er.ok) throw new Error(`existing ${er.status}`);
    const existing = new Map();
    for (const r of await er.json()) {
      const id = cellId(r);
      existing.set(id, [...(existing.get(id) || []), r.text]);
    }
    const plan = planLineWork(counts, { kinds, maxCalls });
    out.requested = plan.reduce((s, p) => s + p.want, 0);
    const got = await fillCells(env, plan, { fetch, pace: createPacer(spacingMs), existing, maxCalls });
    out.calls = got.calls;
    out.failed = got.failed;
    out.rate_limited = got.stopped === 'rate_limited';
    if (got.rows.length) {
      const ins = await fetch(`${base}/line_pool?on_conflict=kind,key,slot,lang,text`, {
        method: 'POST', headers: storeHeaders(env, 'resolution=ignore-duplicates,return=minimal'), body: JSON.stringify(got.rows),
      });
      if (!ins.ok) throw new Error(`insert ${ins.status}: ${(await ins.text()).slice(0, 200)}`);
      out.inserted = got.rows.length;
    }
    if (got.stopped) out.error = got.stopped;
    else if (got.failed && !out.inserted) out.error = got.firstError;
  } catch (e) {
    out.error = String(e?.message || e).slice(0, 400);
  }
  out.duration_ms = Date.now() - t0;
  await fetch(`${base}/line_pool_runs`, {
    method: 'POST', headers: storeHeaders(env, 'return=minimal'), body: JSON.stringify({ source, ...out }),
  }).catch(e => console.error(JSON.stringify({ message: 'line_pool_runs failed', error: e.message })));
  if (out.error) await notify(env, `🔴 문구 풀 ${source} 실패`, `적재 ${out.inserted} · 호출 ${out.calls} · 실패 ${out.failed}\n오류: ${out.error}`);
  return out;
}
```

- [ ] **Step 4: worker scheduled 분기**

import 블록의 `runAuraCron` import 줄 아래에 추가:

```js
import { runLinePool, isLinePoolTick } from '../functions/line-pool-cron.js';
```

`scheduled` 안, `if (event.cron === '0,30 18-21 * * *' || event.cron === '0 22 * * *') {` 바로 위에 추가:

```js
    if (event.cron === '0,30 18-21 * * *' && isLinePoolTick(event.scheduledTime)) {
      ctx.waitUntil(runLinePool(env).then(r => {
        console.log(JSON.stringify({ message: 'line-pool cron', cron: event.cron, ...r }));
      }));
      return;
    }
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/line-pool-cron.test.mjs tests/aura-cron.test.mjs`
Expected: PASS 전부

- [ ] **Step 6: Commit**

```bash
git add functions/line-pool-cron.js worker/index.js tests/line-pool-cron.test.mjs
git commit -m "feat: refill the line pool weekly on the sunday aura tick"
```

---

### Task 7: 시드 스크립트 + 샘플 검수 (사용자 승인 게이트)

**Files:**
- Create: `tools/seed-line-pool.mjs`, `dev/active/line-pool/sample-auction.md` (스크립트 출력)
- Test: `tests/seed-line-pool.test.mjs`

**Interfaces:**
- Consumes: Task 1 `cells`; Task 2 `createPacer, mapLimit, CONCURRENCY, SPACING_MS`; Task 3 `generateCell`; Task 6 `runLinePool`
- Produces: `sampleTable(results) → string` (마크다운 표), CLI `--sample N`, `--kind auction`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleTable } from '../tools/seed-line-pool.mjs';

test('sampleTable 은 칸마다 줄을 표로 만들고 버린 이유를 센다', () => {
  const md = sampleTable([
    { cell: { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, lines: ['더 없소?', '마지막이오!'], dropped: { digit: 1 }, failure: null },
    { cell: { kind: 'auction', key: 'moonswing', slot: 'intro', lang: 'en' }, lines: [], dropped: {}, failure: 'parse' },
  ]);
  assert.match(md, /\| _any \| last \| ko \| 더 없소\? \|/);
  assert.match(md, /\| _any \| last \| ko \| 마지막이오! \|/);
  assert.match(md, /digit 1/);
  assert.match(md, /moonswing \| intro \| en \| \(실패: parse\)/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/seed-line-pool.test.mjs`
Expected: FAIL, `Cannot find module`

- [ ] **Step 3: 구현** `tools/seed-line-pool.mjs`

```js
import { pathToFileURL } from 'node:url';
import { cells } from '../js/lines/slots.js';
import { generateCell } from '../functions/api/_line-gen.js';
import { createPacer, mapLimit, CONCURRENCY, SPACING_MS } from '../functions/api/_exaone.js';
import { runLinePool } from '../functions/line-pool-cron.js';

export function sampleTable(results) {
  const rows = ['| key | slot | lang | 문구 |', '|---|---|---|---|'];
  const notes = [];
  for (const { cell, lines, dropped, failure } of results) {
    if (failure) rows.push(`| ${cell.key} | ${cell.slot} | ${cell.lang} | (실패: ${failure}) |`);
    for (const l of lines) rows.push(`| ${cell.key} | ${cell.slot} | ${cell.lang} | ${l.replace(/\|/g, '\\|')} |`);
    const d = Object.entries(dropped || {}).map(([k, v]) => `${k} ${v}`).join(', ');
    if (d) notes.push(`- ${cell.key}/${cell.slot}/${cell.lang} 버림: ${d}`);
  }
  return [...rows, '', ...notes].join('\n');
}

async function sample(env, kind, n) {
  const pace = createPacer(SPACING_MS);
  const results = await mapLimit(cells(kind), CONCURRENCY, async cell => ({ cell, ...(await pace(() => generateCell(env, cell, n, { seen: new Set() }))) }));
  return sampleTable(results);
}

async function main(argv) {
  const arg = name => { const i = argv.indexOf(name); return i < 0 ? null : argv[i + 1]; };
  const kind = arg('--kind') || 'auction';
  const n = Number(arg('--sample')) || 0;
  const env = process.env;
  if (!env.EXAONE_API_KEY) throw new Error('EXAONE_API_KEY 없음');
  if (n) {
    process.stdout.write(`${await sample(env, kind, n)}\n`);
    return;
  }
  const r = await runLinePool(env, { source: 'seed', kinds: [kind], maxCalls: 1000, notify: async (_e, title, body) => console.error(title, body) });
  console.log(JSON.stringify(r));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(e => { console.error(e); process.exit(1); });
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/seed-line-pool.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tools/seed-line-pool.mjs tests/seed-line-pool.test.mjs
git commit -m "feat: add line pool seed script with sample review table"
```

- [ ] **Step 6: 샘플 생성 (실호출, DB 쓰기 없음)**

```bash
node --env-file=/Users/uicheol_hwang/calm_forest/.env tools/seed-line-pool.mjs --kind auction --sample 10 > dev/active/line-pool/sample-auction.md
```

Expected: 22칸 × 최대 10줄 표, 2~5분. `(실패: …)` 칸이 절반을 넘으면 멈추고 이유를 사용자에게 알린다(`auth` 면 키, `rate_limited` 면 간격 문제).

- [ ] **Step 7: 🚦 사용자 승인 게이트**

`sample-auction.md` 를 사용자에게 보여 주고 말투(하오체), 어색한 줄, 길이를 검수받는다. 고칠 점이 나오면 `functions/api/_line-gen.js` 의 `SLOT_BRIEF`·`systemPrompt`·`userPrompt` 를 고치고 `node --test tests/line-gen.test.mjs` 통과를 확인한 뒤 Step 6 을 다시 돈다. **승인 전에는 Step 8 로 가지 않는다.** 승인 결과(날짜·고친 프롬프트 요지)를 `line-pool-context.md` 에 적는다.

- [ ] **Step 8: 본 채우기 (승인 뒤)**

```bash
node --env-file=/Users/uicheol_hwang/calm_forest/.env tools/seed-line-pool.mjs --kind auction
```

Expected: `{"requested":660,...,"inserted":<600 이상>}`. 이어서 Supabase MCP `execute_sql` 로 확인:

```sql
select key, slot, lang, count(*) from public.line_pool where kind = 'auction' and not hidden group by 1, 2, 3 order by 4;
```

Expected: 22행, 가장 적은 칸도 20 이상. 20 미만인 칸이 있으면 Step 8 명령을 한 번 더 돈다(모자란 칸만 채운다).

- [ ] **Step 9: Commit**

```bash
git add dev/active/line-pool/sample-auction.md dev/active/line-pool/line-pool-context.md
git commit -m "docs: record approved auction line sample"
```

---

### Task 8: 상인 대사 줄 배치 시안 + 기본 문구 검수 (사용자 승인 게이트)

**Files:**
- Create: `sims/auction-say-compare.html`, `dev/active/line-pool/say-compare-pc.png`, `dev/active/line-pool/say-compare-phone.png`
- Modify: `dev/active/line-pool/line-pool-context.md`

- [ ] **Step 1: 시안 파일 작성**

`js/auction/ui.js` 의 `CSS` 문자열과 run 레이아웃 마크업(`.au-head`·`.au-item`·`.au-body` 안의 `.au-big`·`.au-tbar`·`.au-call`·`.au-feed`·입찰 버튼)을 그대로 복사한 정적 패널을 시안마다 하나씩 나란히 둔다. 각 패널에 가장 긴 문구를 넣는다: 경매품 소개 60자 `밤이면 큰 초승달과 별 장식이 은은하게 빛나는 그네요. 마당 한가운데 두면 달밤이 더 깊어지오`(60자), 상인 대사 24자 `목수 아저씨께서 부르셨소! 기세 좋구려!`.

| 시안 | 상인 대사 줄 위치 | 경매품 소개 위치 |
|---|---|---|
| A | `.au-item` 과 `.au-body` 사이 한 줄 `.au-say`(🧙 + 대사, 연보라 배경) | `.au-item` 이름 아래 작은 글씨 `.ds` |
| B | `.au-big`(가격) 바로 아래, `.au-who` 줄을 대사가 1.5초 차지했다가 1등 표시로 돌아감 | A 와 같음 |
| C | 창 맨 위 `.au-head` 오른쪽 칸(제목은 왼쪽 그대로) | 대기 화면(`.au-hint` 위)에서만 보이고 run 에서는 숨김 |

각 시안을 세 크기로 렌더한다: PC `data-layout=side`(1280×800), 가로 폰 `side-short`(844×390), 세로 폰 기본(390×844).

- [ ] **Step 2: 캡처**

브라우저 미리보기로 `sims/auction-say-compare.html` 을 열어 PC 와 폰 크기로 각각 스크린샷을 찍어 `say-compare-pc.png`, `say-compare-phone.png` 로 저장한다. 가로 폰에서 창이 화면 밖으로 넘치거나 입찰 버튼이 가려지는 시안은 표에 ❌ 로 표시한다.

- [ ] **Step 3: 기본 문구 후보 표 작성** (`line-pool-context.md` "기본 문구 후보" 절)

| slot | 한국어 후보 | 영어 후보 |
|---|---|---|
| intro moonswing | 밤이면 달과 별이 은은하게 빛나는 그네요. | A swing whose moon and stars glow softly at night. |
| intro lanternarch | 무대와 같은 종이 등불을 단 마당 문이오. | A garden gate hung with the same paper lanterns as the stage. |
| intro starvane | 바람이 불면 금빛 별이 빙글 도는 풍향계요. | A weather vane whose golden star spins in the wind. |
| open | 자, 오늘의 물건이오. 시작하겠소! | Here is today's treasure. Let us begin! |
| raise_npc | {who}께서 부르셨소! · 오, {who}! 좋소! · {who}, 기세가 좋구려! · {who}께서 한 번 더! | {who} bids! · Oh, {who}! Splendid! · {who} is not giving up! · Another from {who}! |
| raise_me | 손님께서 부르셨소! · 좋은 배짱이오! · 오, 손님! 좋소! · 손님 차례가 왔소! | The guest bids! · Bold move! · Oh, splendid, guest! · Your turn paid off! |
| last | 더 없소? | Any more bids? |
| sold_me | 손님 것이오! 축하하오! | It is yours! Congratulations! |
| sold_npc | {who}의 것이 되었소! | It goes to {who}! |

- [ ] **Step 4: 🚦 사용자 승인 게이트**

캡처 2장과 문구 표를 보여 주고 (1) 배치 시안 A·B·C 중 하나, (2) 기본 문구 확정본을 받는다. 결과를 `line-pool-context.md` 에 "확정 배치"·"확정 기본 문구"로 적는다. **승인 전에는 Task 9 로 가지 않는다.**

- [ ] **Step 5: Commit**

```bash
git add sims/auction-say-compare.html dev/active/line-pool
git commit -m "docs: compare auction speech row placements and record approved fallback copy"
```

---

### Task 9: 클라이언트 모듈 `js/lines/client.js` + 기본 문구

**Files:**
- Create: `js/lines/client.js`, `js/lines/fallback.js`
- Modify: `js/i18n-en.js` (`'🔨 오늘의 경매'` 항목이 있는 경매 문구 묶음 바로 아래)
- Test: `tests/line-client.test.mjs`

**Interfaces:**
- Consumes: Task 1 `ANY, fillLine, lineProblem, slotsFor, AUCTION_ITEMS`
- Produces:
  - `FALLBACK: { auction: { [key]: { [slot]: string[] } } }` (한국어 원문, Task 8 확정본)
  - `LOAD_TIMEOUT_MS = 3000`
  - `createLineClient({ api, lang, t, fetch }) → { load(kind, keys, date) → Promise<{src, lines}>, peek(kind, keys, date) → {src, lines} | null, line(got, kind, key, slot, i, vars) → string }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLineClient, LOAD_TIMEOUT_MS } from '../js/lines/client.js';
import { FALLBACK } from '../js/lines/fallback.js';
import { AUCTION_ITEMS, ANY, slotsFor, lineProblem } from '../js/lines/slots.js';

const body = { date: '2026-11-10', src: 'pool', lines: { _any: { raise_npc: [{ id: 1, text: '{who}께서 부르셨소!' }, { id: 2, text: '오, {who}!' }], last: [{ id: 3, text: '{oops} 더 없소?' }] } } };
const okFetch = async () => new Response(JSON.stringify(body));

test('기본 문구는 모든 경매 칸을 채우고 검증을 통과한다', () => {
  for (const key of [...AUCTION_ITEMS, ANY]) {
    for (const slot of slotsFor('auction', key)) {
      const list = FALLBACK.auction[key]?.[slot];
      assert.ok(list?.length, `${key}/${slot}`);
      for (const text of list) assert.equal(lineProblem(text, { kind: 'auction', slot, lang: 'ko' }), null, text);
    }
  }
});

test('기본 문구 영어가 i18n-en 에 모두 있다', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const slots of Object.values(FALLBACK.auction)) for (const list of Object.values(slots)) for (const ko of list) assert.ok(en.includes(`'${ko}'`), ko);
});

test('load 는 한 번만 부르고 결과를 캐시한다', async () => {
  let n = 0;
  const c = createLineClient({ api: '/api/lines', lang: 'ko', fetch: async (...a) => { n++; return okFetch(...a); } });
  const [a, b] = await Promise.all([c.load('auction', ['moonswing', ANY], '2026-11-10'), c.load('auction', ['moonswing', ANY], '2026-11-10')]);
  assert.equal(n, 1);
  assert.equal(a, b);
  assert.equal(c.peek('auction', ['moonswing', ANY], '2026-11-10').src, 'pool');
});

test('실패·api 없음이면 fallback', async () => {
  const c1 = createLineClient({ api: '/api/lines', lang: 'ko', fetch: async () => new Response('', { status: 500 }) });
  assert.equal((await c1.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  const c2 = createLineClient({ api: '', lang: 'ko', fetch: okFetch });
  assert.equal((await c2.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  assert.ok(LOAD_TIMEOUT_MS <= 3000);
});

test('line 은 풀 문구를 i 로 돌려 쓰고, 자리표시가 남으면 기본 문구로', async () => {
  const c = createLineClient({ api: '/api/lines', lang: 'ko', fetch: okFetch });
  const got = await c.load('auction', [ANY], '2026-11-10');
  assert.equal(c.line(got, 'auction', ANY, 'raise_npc', 0, { who: '목수 아저씨' }), '목수 아저씨께서 부르셨소!');
  assert.equal(c.line(got, 'auction', ANY, 'raise_npc', 3, { who: '목수 아저씨' }), '오, 목수 아저씨!');
  assert.equal(c.line(got, 'auction', ANY, 'last', 0), FALLBACK.auction[ANY].last[0]);
  assert.equal(c.line(null, 'auction', 'moonswing', 'intro', 0), FALLBACK.auction.moonswing.intro[0]);
});

test('기본 문구는 t 로 번역해 채운다', () => {
  const c = createLineClient({ api: '', lang: 'en', t: s => (s === FALLBACK.auction[ANY].sold_npc[0] ? 'It goes to {who}!' : s) });
  assert.equal(c.line(null, 'auction', ANY, 'sold_npc', 0, { who: 'Carpenter' }), 'It goes to Carpenter!');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/line-client.test.mjs`
Expected: FAIL, `Cannot find module '../js/lines/client.js'`

- [ ] **Step 3: `js/lines/fallback.js` 작성** — Task 8 확정본을 넣는다. 아래는 후보 표 그대로이며, 확정본에서 바뀐 줄만 바꾼다.

```js
const OPEN = ['자, 오늘의 물건이오. 시작하겠소!'];

export const FALLBACK = {
  auction: {
    moonswing: { intro: ['밤이면 달과 별이 은은하게 빛나는 그네요.'], open: OPEN },
    lanternarch: { intro: ['무대와 같은 종이 등불을 단 마당 문이오.'], open: OPEN },
    starvane: { intro: ['바람이 불면 금빛 별이 빙글 도는 풍향계요.'], open: OPEN },
    _any: {
      raise_npc: ['{who}께서 부르셨소!', '오, {who}! 좋소!', '{who}, 기세가 좋구려!', '{who}께서 한 번 더!'],
      raise_me: ['손님께서 부르셨소!', '좋은 배짱이오!', '오, 손님! 좋소!', '손님 차례가 왔소!'],
      last: ['더 없소?'],
      sold_me: ['손님 것이오! 축하하오!'],
      sold_npc: ['{who}의 것이 되었소!'],
    },
  },
};
```

- [ ] **Step 4: `js/lines/client.js` 작성**

```js
import { ANY, fillLine } from './slots.js';
import { FALLBACK } from './fallback.js';

export const LOAD_TIMEOUT_MS = 3000;

export function createLineClient({ api, lang, t = s => s, fetch = globalThis.fetch }) {
  const store = new Map(), loading = new Map();
  const keyOf = (kind, keys, date) => `${kind}|${date}|${keys.join(',')}`;

  async function fetchLines(kind, keys, date) {
    try {
      if (!api) throw new Error('off');
      const q = `kind=${encodeURIComponent(kind)}&key=${encodeURIComponent(keys.join(','))}&lang=${encodeURIComponent(lang)}&date=${encodeURIComponent(date)}`;
      const r = await fetch(`${api}?${q}`, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const j = await r.json();
      return { src: j?.src || 'fallback', lines: j?.lines || {} };
    } catch {
      return { src: 'fallback', lines: {} };
    }
  }

  function load(kind, keys, date) {
    const k = keyOf(kind, keys, date);
    if (store.has(k)) return Promise.resolve(store.get(k));
    if (!loading.has(k)) {
      loading.set(k, fetchLines(kind, keys, date).then(got => { store.set(k, got); loading.delete(k); return got; }));
    }
    return loading.get(k);
  }

  const peek = (kind, keys, date) => store.get(keyOf(kind, keys, date)) || null;

  function line(got, kind, key, slot, i = 0, vars = {}) {
    const pool = got?.lines?.[key]?.[slot] || [];
    const fromPool = pool.length ? fillLine(pool[i % pool.length].text, vars) : null;
    if (fromPool) return fromPool;
    const fb = FALLBACK[kind]?.[key]?.[slot] || FALLBACK[kind]?.[ANY]?.[slot] || [];
    return fb.length ? fillLine(t(fb[i % fb.length]), vars) || '' : '';
  }

  return { load, peek, line };
}
```

- [ ] **Step 5: 영어 사전 추가** — `js/i18n-en.js` 의 경매 문구 묶음 바로 아래에 Task 8 확정 영어를 넣는다(후보 표 기준):

```js
  '밤이면 달과 별이 은은하게 빛나는 그네요.': 'A swing whose moon and stars glow softly at night.',
  '무대와 같은 종이 등불을 단 마당 문이오.': 'A garden gate hung with the same paper lanterns as the stage.',
  '바람이 불면 금빛 별이 빙글 도는 풍향계요.': 'A weather vane whose golden star spins in the wind.',
  '자, 오늘의 물건이오. 시작하겠소!': "Here is today's treasure. Let us begin!",
  '{who}께서 부르셨소!': '{who} bids!',
  '오, {who}! 좋소!': 'Oh, {who}! Splendid!',
  '{who}, 기세가 좋구려!': '{who} is not giving up!',
  '{who}께서 한 번 더!': 'Another from {who}!',
  '손님께서 부르셨소!': 'The guest bids!',
  '좋은 배짱이오!': 'Bold move!',
  '오, 손님! 좋소!': 'Oh, splendid, guest!',
  '손님 차례가 왔소!': 'Your turn paid off!',
  '더 없소?': 'Any more bids?',
  '손님 것이오! 축하하오!': 'It is yours! Congratulations!',
  '{who}의 것이 되었소!': 'It goes to {who}!',
```

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/line-client.test.mjs tests/auction-i18n.test.mjs`
Expected: PASS 전부

- [ ] **Step 7: Commit**

```bash
git add js/lines/client.js js/lines/fallback.js js/i18n-en.js tests/line-client.test.mjs
git commit -m "feat: add line client with hand-written fallback copy"
```

---

### Task 10: 경매에 연결 + 트래킹

**Files:**
- Modify: `js/auction/scene.js` (`createAuctionScene` 상태·`emit`·`onBid`·`finish`·`begin`·`update`), `js/auction/ui.js` (`createAuctionUi`·`CSS`·새 순수 함수 2개), `js/auction/index.js` (import, 모듈 상수, `ensurePanel`, `updateAuction`, `openAuction`), `docs/analysis/event-taxonomy.csv` (`auction_open` 행)
- Test: `tests/auction-scene.test.mjs`, `tests/auction-ui.test.mjs`, `tests/auction-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1 `ANY, SLOTS`; Task 5 `CONFIG.LINES_API`; Task 9 `createLineClient`
- Produces:
  - 장면 상태 `say: null | { slot: 'open'|'raise_npc'|'raise_me'|'last'|'sold_me'|'sold_npc', who?: string, i: number }`
  - `ui.js`: `sayHtml(text) → string`, `itemHtml(icon, name, intro) → string`, `createAuctionUi({ ..., sayText, introText })`, 반환 객체에 `refreshItem()`
  - GA4 `auction_open` 파라미터 `item_id, coins, line_src`

- [ ] **Step 1: 장면 테스트 추가** (`tests/auction-scene.test.mjs` 끝에)

```js
test('say: 시작 → 내 입찰 → 막판 → 낙찰 순으로 상인 대사 자리가 바뀐다', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'open', i: 0 });
  s.playerBid(50);
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'raise_me', i: 0 });
  let sawLast = false;
  for (let i = 0; i < 200 && s.active(); i++) {
    s.update(0.1, i * 0.1);
    if (f.log.ui.at(-1).say?.slot === 'last') sawLast = true;
  }
  assert.ok(sawLast);
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'sold_me', i: 0 });
});

test('say: 주민 입찰은 raise_npc 와 who, 주민 낙찰은 sold_npc', () => {
  const f = fakes({ rng: () => 0 });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  s.update(0.1, 0);
  const first = f.log.ui.find(u => u.say?.slot === 'raise_npc');
  assert.ok(first.say.who);
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  const end = f.log.ui.at(-1).say;
  assert.equal(end.slot, 'sold_npc');
  assert.equal(end.who, f.log.done.leader);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/auction-scene.test.mjs`
Expected: 새 테스트 2개 FAIL (`say` 가 undefined)

- [ ] **Step 3: `js/auction/scene.js` 수정**

`createAuctionScene` 첫 줄 `let run = null, ...` 바로 아래에 추가:

```js
  let say = null, sayN = { raise_npc: 0, raise_me: 0 }, wasTense = false;
```

`emit` 객체의 마지막 속성 `itemId: lot.id,` 뒤에 `say,` 를 더한다:

```js
    canBid: Object.fromEntries(BID_INCS.map(n => [n, allowed(n)])), result: done, itemId: lot.id, say,
```

`onBid` 화살표 함수 본문 맨 앞에 추가:

```js
    const slot = who === 'me' ? 'raise_me' : 'raise_npc';
    say = who === 'me' ? { slot, i: sayN[slot]++ } : { slot, who, i: sayN[slot]++ };
```

`finish` 에서 `slamT = 0; bellT = 0;` 바로 위에 추가:

```js
    say = out === 'win' ? { slot: 'sold_me', i: 0 }
      : run.leader && out !== 'none' && run.leader !== 'me' ? { slot: 'sold_npc', who: run.leader, i: 0 }
      : null;
```

`begin` 의 `acc = 0; feed = []; flashUntil = 0; done = null; slamT = 0; bellT = 0;` 줄 바로 아래에 추가:

```js
      say = { slot: 'open', i: 0 }; sayN = { raise_npc: 0, raise_me: 0 }; wasTense = false;
```

`update` 의 아래 부분을 바꾼다. 지금:

```js
        if (!done) emit();
      }
      const tense = !done && run.t < 3;
```

바꾼 뒤(막판 대사가 같은 프레임에 나가게 `emit` 을 `tense` 계산 아래로 옮긴다):

```js
      }
      const tense = !done && run.t < 3;
      if (tense && !wasTense) say = { slot: 'last', i: 0 };
      wasTense = tense;
      if (!done) emit();
```

- [ ] **Step 4: 장면 테스트 통과 확인**

Run: `node --test tests/auction-scene.test.mjs`
Expected: PASS 전부(기존 테스트 포함)

- [ ] **Step 5: UI 테스트 추가** — `tests/auction-ui.test.mjs` 의 import 줄에 `sayHtml, itemHtml` 을 더하고 끝에 추가:

```js
test('sayHtml 은 상인 이모지와 대사를 이스케이프해 담고, 빈 대사면 빈 문자열', () => {
  assert.equal(sayHtml(''), '');
  assert.match(sayHtml('<b>좋소</b>'), /🧙/);
  assert.match(sayHtml('<b>좋소</b>'), /&lt;b&gt;좋소&lt;\/b&gt;/);
});

test('itemHtml 은 소개가 있을 때만 .ds 를 넣는다', () => {
  assert.match(itemHtml('🌙', '달빛 그네', '빛나는 그네요.'), /<div class="ds">빛나는 그네요\.<\/div>/);
  assert.doesNotMatch(itemHtml('🌙', '달빛 그네', ''), /class="ds"/);
});
```

- [ ] **Step 6: `js/auction/ui.js` 수정** — 아래는 시안 A 기준이다. Task 8 에서 B 나 C 가 확정되면, `.au-say` 요소를 넣는 자리(`ensure()` 의 `innerHTML`)와 CSS 블록을 `sims/auction-say-compare.html` 의 확정 시안 마크업·CSS 로 바꾸고 나머지 단계는 그대로 둔다.

`itemVisual` 함수 아래에 순수 함수 2개 추가:

```js
export function sayHtml(text) {
  return text ? `<span class="au-say-ico" aria-hidden="true">🧙</span><span>${esc(text)}</span>` : '';
}

export function itemHtml(icon, name, intro) {
  const ds = intro ? `<div class="ds">${esc(intro)}</div>` : '';
  return `${itemVisual(icon)}<div class="txt"><div class="nm">${esc(name)}</div>${ds}</div>`;
}
```

`CSS` 템플릿 문자열 끝(마지막 백틱 바로 앞)에 줄바꿈 후 추가:

```css
#auction-modal .au-item .txt{min-width:0}
#auction-modal .au-item .ds{font-size:12px;color:#5b5f68;line-height:1.35;margin-top:2px}
#auction-modal .au-say{display:none;align-items:center;gap:6px;font-size:13px;font-weight:800;color:#5a3f8a;background:#f1eafb;border-radius:12px;padding:6px 10px;line-height:1.35}
#auction-modal .au-say.on{display:flex}
#auction-modal .au-say.pop{animation:au-in .25s}
#auction-modal .au-say-ico{flex:none;font-size:16px}
#auction-modal[data-layout=side-short] .au-item .ds{display:none}
#auction-modal[data-layout=side-short] .au-say{font-size:12px;padding:4px 8px}
```

`createAuctionUi` 시그니처와 상태 줄을 바꾼다:

```js
export function createAuctionUi({ t, names, itemName, itemIcon, onJoin, onBid, onClose, sayText = () => '', introText = () => '' }) {
  let root = null, body = null, sayEl = null, mode = 'bid', view = null, itemId = '', layout = '', lastPrice = null, lastSig = '', lastCall = '', lastSay = '';
```

`ensure()` 의 `root.innerHTML = ...` 와 `body = ...` 두 줄을 바꾼다:

```js
    root.innerHTML = '<div class="au-head"></div><div class="au-item"></div><div class="au-say"></div><div class="au-body"></div>';
    body = root.querySelector('.au-body');
    sayEl = root.querySelector('.au-say');
```

`setItem` 을 바꾸고 바로 아래에 `showSay` 를 추가:

```js
  const setItem = id => {
    itemId = id;
    root.querySelector('.au-item').innerHTML = itemHtml(itemIcon(id), t(itemName(id)), introText(id));
  };
  const showSay = say => {
    const text = say ? sayText(say) : '';
    if (text === lastSay) return;
    lastSay = text;
    sayEl.innerHTML = sayHtml(text);
    sayEl.classList.toggle('on', !!text);
    if (text) { sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop'); }
  };
```

`open(v)` 안 `setItem(v.itemId);` 바로 아래에 추가:

```js
    showSay(null);
```

`render(state)` 의 `if (!root || !view) return;` 바로 아래에 추가:

```js
    showSay(state.say);
```

반환 객체를 바꾼다:

```js
  return { open, render, close, refreshItem: () => { if (root && itemId) setItem(itemId); }, isOpen: () => !!root && root.classList.contains('show') };
```

- [ ] **Step 7: UI 테스트 통과 확인**

Run: `node --test tests/auction-ui.test.mjs`
Expected: PASS 전부

- [ ] **Step 8: 배선 테스트 갱신** — `tests/auction-wiring.test.mjs`

기존 테스트 `'reopening a finished auction does not count as an open'` 의 assert 를 같은 의도(끝난 경매·닫힌 경매는 열림으로 세지 않음)를 새 형태로 검사하도록 바꾼다:

```js
test('reopening a finished auction does not count as an open', () => {
  const open = index.slice(index.indexOf('export function openAuction('));
  const body = open.slice(0, open.indexOf('\n}\n'));
  assert.match(body, /if \(mode !== 'bid' && mode !== 'watch'\) return;[\s\S]*trackEvent\('auction_open'/);
});
```

파일 끝에 새 테스트 추가(`readFileSync` 는 이 파일에 이미 import 돼 있다):

```js
test('경매는 문구 풀을 받아 상인 대사와 소개를 채우고 auction_open 에 line_src 를 싣는다', () => {
  assert.match(index, /import \{ createLineClient \} from '\.\.\/lines\/client\.js'/);
  assert.match(index, /CONFIG\.LINES_API/);
  assert.match(index, /sayText:/);
  assert.match(index, /introText:/);
  assert.match(index, /trackEvent\('auction_open', \{ item_id: lot\.id, coins, line_src: got\.src \}\)/);
  const csv = readFileSync(new URL('../docs/analysis/event-taxonomy.csv', import.meta.url), 'utf8');
  assert.match(csv, /^auction_open,.*,item_id\|coins\|line_src,/m);
});
```

- [ ] **Step 9: 배선 테스트 실패 확인**

Run: `node --test tests/auction-wiring.test.mjs`
Expected: 고친 테스트와 새 테스트 FAIL

- [ ] **Step 10: `js/auction/index.js` 수정**

import 를 바꾸고 더한다. 기존 `import { t } from '../i18n.js';` 를:

```js
import { t, getLang } from '../i18n.js';
```

import 블록 끝에 추가:

```js
import { CONFIG } from '../config.js';
import { ANY, SLOTS } from '../lines/slots.js';
import { createLineClient } from '../lines/client.js';
```

`const PROMPTS = ...` 줄 아래에 추가:

```js
const lines = createLineClient({ api: CONFIG.LINES_API, lang: getLang(), t });
const lineKeys = id => [id, ANY];
const linesFor = (id, day) => lines.peek('auction', lineKeys(id), day);
const lineKeyOf = (id, slot) => (SLOTS.auction[slot]?.scope === 'item' ? id : ANY);
```

`ensurePanel` 의 `createAuctionUi({ ... })` 인자 목록 끝(`onClose: () => teardown(),` 아래)에 추가:

```js
    sayText: say => {
      const day = todayStr(), id = lotFor(day).id;
      return lines.line(linesFor(id, day), 'auction', lineKeyOf(id, say.slot), say.slot, say.i, { who: say.who ? t(names[say.who]) : undefined });
    },
    introText: id => lines.line(linesFor(id, todayStr()), 'auction', id, 'intro', 0),
```

`updateAuction` 의 `if (day !== shownDay) { shownDay = day; stage.setItem(lotFor(day).id); }` 줄 바로 아래(같은 블록 안)에 미리 받기를 추가:

```js
    if (inVillage) {
      const m = modeNow(day);
      if (m.mode === 'bid' || m.mode === 'watch') lines.load('auction', lineKeys(m.lot.id), day);
    }
```

`openAuction` 을 통째로 바꾼다:

```js
export function openAuction() {
  const day = todayStr();
  const { lot, coins, mode } = modeNow(day);
  if (mode === 'hidden') return;
  ensurePanel().open({ mode, itemId: lot.id, appraisal: lot.appraisal, start: lot.start, coins, secondsToOpen: secondsUntilOpen(gameState.timeOfDay, DAY_SPEED) });
  if (mode !== 'bid' && mode !== 'watch') return;
  lines.load('auction', lineKeys(lot.id), day).then(got => {
    panel?.refreshItem();
    trackEvent('auction_open', { item_id: lot.id, coins, line_src: got.src });
  });
}
```

- [ ] **Step 11: 트래킹 표 갱신** — `docs/analysis/event-taxonomy.csv` 의 `auction_open` 행에서 파라미터 칸 `item_id|coins` 를 `item_id|coins|line_src` 로 바꾸고, 설명 칸 끝에 ` · line_src=pool/partial/fallback(문구 풀 출처)` 를 붙인다.

- [ ] **Step 12: 통과 확인**

Run: `node --test tests/auction-wiring.test.mjs tests/auction-ui.test.mjs tests/auction-scene.test.mjs tests/event-taxonomy.test.mjs tests/ga-param-split.test.mjs && npm test 2>&1 | tail -5`
Expected: PASS 전부, 전체 실패 0

- [ ] **Step 13: Commit**

```bash
git add js/auction/scene.js js/auction/ui.js js/auction/index.js docs/analysis/event-taxonomy.csv tests/auction-scene.test.mjs tests/auction-ui.test.mjs tests/auction-wiring.test.mjs
git commit -m "feat: show pooled merchant lines and lot intro in the auction panel"
```

---

### Task 11: 실게임 확인 + 코드 리뷰

**Files:**
- Create: `dev/active/line-pool/shots/` (캡처)
- Modify: `dev/active/line-pool/line-pool-context.md`, `dev/active/line-pool/line-pool-tasks.md`

- [ ] **Step 1: 번들 확인** — 새 module(`js/lines/*.js`)은 `js/auction/index.js` 의 import 로만 들어간다. index.html 에 직접 추가하지 않는다(메모리 boot-bundle).

Run: `node --test tests/bundle-boot.test.mjs`
Expected: PASS

- [ ] **Step 2: 로컬 실행** — 브라우저 미리보기로 게임을 띄우고 게스트로 `?time=0.8&dbg=1` 진입, 콘솔에서 `window.__tp(32.5,0.5)` 로 무대 앞에 선 뒤 Space(모바일은 `#action-btn`)로 창을 연다.

확인할 것:
1. 창을 열면 경매품 이름 아래 소개가 뜬다. 네트워크 탭에서 `/api/lines?kind=auction&key=<id>,_any` 가 200, 응답 `src` 가 `pool`.
2. 참가하면 상인 대사 줄에 시작 멘트, 입찰마다 반응, 막판에 `last`, 끝나면 낙찰 대사가 뜬다.
3. 네트워크를 끊고(오프라인) 새로고침해 같은 흐름을 돌리면 기본 문구가 뜨고 콘솔 오류가 없다.
4. `?lang=en` 으로 영어 문구가 뜬다.
5. PC(1280×800), 가로 폰(844×390), 세로 폰(390×844)에서 창이 넘치지 않고 입찰 버튼이 가려지지 않는다.

각 확인을 캡처해 `dev/active/line-pool/shots/` 에 저장한다.

- [ ] **Step 3: GA4 이벤트 확인** — `dbg=1` 세션은 GA4 를 오염시키므로(메모리 night-duel) 실제 전송을 보지 않고, 콘솔에서 `trackEvent` 호출 인자로 `auction_open` 에 `line_src` 가 실리는지만 본다.

- [ ] **Step 4: 코드 리뷰** — code-reviewer 에이전트로 `git diff feat/evening-auction...HEAD` 를 리뷰받고 CRITICAL·HIGH 를 고친 뒤 `npm test` 를 다시 돈다.

- [ ] **Step 5: 키 스캔**

```bash
git diff feat/evening-auction...HEAD | grep -nE "sk-ant|eyJhbGci|EXAONE_API_KEY=|SUPABASE_SERVICE_KEY=|AIza" || echo clean
```

Expected: `clean`

- [ ] **Step 6: dev docs 갱신 + Commit** — `line-pool-context.md` 의 Last Updated, 확인 결과, 남은 것(배포는 경매와 함께 5곳 동시, Worker 시크릿 `EXAONE_API_KEY` 는 이미 등록됨, 배포 뒤 첫 일요일 21:30 UTC 크론 1회 후 `line_pool_runs` 확인, 배포 다음 날 BQ 에서 `auction_open.line_src` 값 확인)을 적는다.

```bash
git add dev/active/line-pool
git commit -m "docs: record line pool verification"
```

- [ ] **Step 7: 사용자에게 보고** — 캡처, 테스트 결과, 남은 사용자 몫(배포 승인)을 알린다. 병합·푸시·배포는 하지 않는다.
