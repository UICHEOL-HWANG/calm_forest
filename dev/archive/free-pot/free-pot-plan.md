# 🍲 자유 냄비 (Free Pot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 자유주방에서 재료 1~3개를 아무렇게나 넣어 요리하면, 미리 만든 조합 표가 요리 이름·맛(★1~5)·한 줄 평을 정하고 기존 미니게임 점수가 솜씨 등급을 정한다.

**Architecture:** 조합 표는 **오프라인에서 Gemini 로 한 번 생성**해 `js/free-pot/table.js` 에 커밋한다(런타임 LLM 호출 0).
게임은 조합 키로 표를 찾아 **레시피 모양의 합성 객체**(`{ id:'free:<key>', name, ico, cost, buff, dur, stages }`)를 만들고,
기존 `kitchenStart` / `kitchenFinish` / 찬장 / `eatDish` 를 그대로 태운다 — `recipeOf` 자리를 `dishOf` 로 바꾸는 것이 핵심 변경이다.
경제 수치(버프 종류·지속·미니게임 종류)는 LLM 이 아니라 `js/free-pot/rules.js` 의 코드 규칙이 정한다.

**Tech Stack:** Vanilla JS(ES modules) · node:test · Gemini REST(`gemini-flash-lite-latest`, JSON 모드 + responseSchema)

**Spec:** 이 대화에서 합의한 내용(2026-09-29) — 샘플 2차 톤 승인, 시큰둥한 톤 제외. 결정 근거는 `free-pot-context.md`.

## Global Constraints

- 런타임 Gemini 호출 금지 — 표는 커밋된 정적 모듈. (NPC 잡담과 같은 원칙)
- Gemini 는 **글과 맛 점수만**. 버프·지속·미니게임·원가는 코드 규칙.
- 모델 `gemini-flash-lite-latest`, 무료 한도 500 RPD·15 RPM 을 게임 크론과 공유 → 호출 간격 6.5초, 429 즉시 중단, **KST 17:00~20:00 에만 실행**(크론 20:00~22:40 회피).
- 같은 재료만 반복한 조합은 최대 ★3 (코드로 강제).
- 기존 레시피와 **재료가 같은 조합은 자유 냄비에서 막는다**(레시피 메뉴로 안내).
- 기존 레시피 이름과 겹치는 요리 이름 금지. 표 안에서도 이름 중복 금지.
- 한 줄 평 금지어(시큰둥 톤): `그냥` `별로` `평범` `단순` `그저` `밋밋` `그럭저럭`.
- 길이: 이름 ≤ 9자(공백 포함), 한 줄 평 ≤ 28자. 이모지는 그림 문자 1개(ASCII 금지).
- 새 코드는 game.js 에 몰지 않는다 → `js/free-pot/`. game.js 는 `dishOf` 교체 등 최소 수정만.
- ⚠️ `js/data/catalog.js` 는 `places.js` → `three` 를 import 해서 **Node 에서 import 할 수 없다**. 규칙·생성기·테스트는 RECIPES 를 import 하지 말고 `tools/free-pot/recipes-src.mjs` 로 **소스 텍스트를 파싱**한다(기존 cooking-course 테스트와 같은 방식). `BLOCKED` 는 rules.js 에 리터럴로 두고 테스트가 소스와 대조한다.
- 표 파일은 `js/data/` 에 두지 않는다 — `tests/helpers/game-source.mjs` 가 `js/data/*.js` 를 전부 이어 붙인다.
- UI 문구는 **만들기 전에 한국어 후보를 사용자에게 검수**받고, 모바일 실측(375px)까지.
- i18n: 정적 문구는 `js/i18n-en.js` 사전에 추가. 생성된 이름·평은 `LANG==='en'` 이면 `name_en`/`judge_en` 을 직접 쓴다. `" · "` 로 조각을 잇지 않는다(글루 패턴 함정).
- 트래킹은 구현과 같이 — 아래 **📊 Tracking Spec** 전 항목(생명주기·키값 축·제어 파라미터·다음날 BQ).

## 📊 Tracking Spec (체크리스트 적용)

**식별자:** 요리 id `recipe = 'free:<combo_key>'`(기존 요리 이벤트의 `recipe` 축에 그대로 섞여 레시피 요리와 한 표로 비교된다) + 별도 `combo_key`(접두사 없음). 표시 문자열(요리 이름·평)은 싣지 않는다.

| 단계 | 이벤트 | 파라미터 |
|---|---|---|
| 노출 | `free_pot_open` (🍲 탭을 열 때) | `found, total, kinds_have`(보유 재료 종류 수) |
| 막힘 | `free_pot_blocked` (레시피와 같은 조합으로 끓이기) | `combo_key, recipe_ids`(쉼표) |
| 시작 | `cooking_start` (기존) + 추가 | `recipe='free:…', where, combo_key, n_ing`(1~3), `stage` |
| 결과/포기 | `cooking_result`·`cooking_abandon` (기존) + 추가 | `combo_key, taste, is_new, found, buff, dur_base` (+ 기존 score·arms·eases·dda) |
| 먹기/보관 | `cook_eat`·`cook_store` (기존) + 추가 | `taste` |

**분석 축:** 발견률(`found`/`total` 추이), 조합 탐색 폭(`n_ing`·`is_new`), 맛 ★ 분포 vs 재시도, 막힘 빈도(잦으면 UI 개선), 레시피 대비 자유 요리 비중(`recipe LIKE 'free:%'`).
**제어 파라미터(8번):** 맛 ★·지속은 조합마다 달라 **자연히 흔들린다** → 결과 이벤트에 `taste`·`dur_base` 를 싣는다. 미니게임 난이도는 기존 DDA 팔(`arms`·`eases`)이 이미 실린다.
**DB 결정:** GA4 만. 발견 기록은 세이브(`kitchen.best` 의 `free:` 키). 재료 소비는 코인이 아니라 `econ_logs` 대상 아님.
**검증:** trackEvent 가로채기로 open→(blocked)→start→result→eat/store 순서·파라미터 확인. **다음 날 BQ** 에서 `recipe LIKE 'free:%'` 행에 `combo_key`·`taste`·`is_new` 가 있는지, `free_pot_open`→`cooking_start` 전환율이 나오는지.
**예약어 금지.** `free_pot_*` 를 `ACTION_EVENTS`(`js/retention-guidance.js:25`)에 넣을지 확인.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/free-pot/rules.js` (신규) | 재료 목록·조합 키·막힌 조합·버프/지속/미니게임 규칙·맛 상한·항목 검증. 순수 함수만(game.js import 없음) |
| `js/free-pot/table.js` (신규, 생성물) | `export const FREE_POT_TABLE = { "<key>": { name, name_en, ico, taste, judge, judge_en, tags } }` |
| `js/free-pot/dish.js` (신규) | 표 지연 로드(`loadFreePot`) + `freeDishOf(id)` 합성 레시피 + `freePotCheck` |
| `tools/free-pot/recipes-src.mjs` (신규) | `js/data/catalog.js` 원문에서 RECIPES 의 id·name·cost 를 파싱(Node 전용) |
| `tools/free-pot/generate.mjs` (신규) | Gemini 배치 생성기 — 빠진 키만, 검증 실패는 재생성, 표 모듈 기록 |
| `tools/free-pot/review.mjs` (신규) | 검수용 HTML(★5·★1~2 먼저) → `dev/active/free-pot/review.html` |
| `js/game.js` (수정) | `kitchenStart`·`kitchenFinish` 가 `dishOf` 사용, 자유 요리는 도감 제외·결과에 맛 정보·트래킹 |
| `js/spaces/cooking.js` (수정) | `dishOf`·`freePotView` 정의, `pantryView`·`cookResolve`·`pantryEat` 가 `dishOf` 사용 |
| `index.html` (수정) | 주방 메뉴 🍲 탭(재료 고르기) + 결과 카드 맛 ★·한 줄 평 |
| `js/i18n-en.js` (수정) | 새 정적 문구 |
| `tests/free-pot.test.mjs` (신규) | 규칙·키·검증·표 무결성·합성 레시피 |
| `tests/free-pot-wiring.test.mjs` (신규) | game.js/cooking.js/index.html 배선(소스 검사) |

---

### Task 1: 규칙 모듈 `js/free-pot/rules.js`

**Files:**
- Create: `js/free-pot/rules.js`, `tools/free-pot/recipes-src.mjs`
- Test: `tests/free-pot.test.mjs`

**Interfaces — Produces:**
- `INGREDIENTS: string[]` — 순서 고정 `['crop','forage','fish','egg','flour','wheat','corn','grape','honey','apple','pear','peach','persimmon','chestnut']`
- `comboKey(ids) → string` (INGREDIENTS 순서 정렬, `+` 결합, 중복 유지) · `parseKey(key) → string[]`
- `allCombos() → string[]` (크기 1~3 중복조합 679개) · `BLOCKED: Record<key, recipeId[]>` · `freeCombos()`
- `capTaste(key, taste) → 1..5` · `buffOf(key) → 'luck'|'speed'|'chop'|'mine'` · `durOf(taste) → [20,30,45,60,90][taste-1]`
- `stageOf(key) → 'grill'|'chop'|'pot'` · `costOf(key) → {id:count}`
- `validateEntry(key, e, { recipeNames:Set, seenNames:Set }) → string[]` (빈 배열 = 통과, 통과 시 seenNames 에 이름 추가)
- `TAGS`, `BANNED_JUDGE`, `NAME_MAX=9`, `JUDGE_MAX=28`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/free-pot.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, comboKey, parseKey, allCombos, BLOCKED, freeCombos, capTaste, buffOf, durOf, stageOf,
         costOf, validateEntry } from '../js/free-pot/rules.js';
import { recipesFromSource } from '../tools/free-pot/recipes-src.mjs';

const RECIPES = recipesFromSource();   // catalog.js 는 three 때문에 import 불가 → 원문 파싱

test('recipesFromSource: 레시피 11종의 id·name·cost 를 읽는다', () => {
  assert.equal(RECIPES.length, 11);
  assert.deepEqual(RECIPES.find(r => r.id === 'omelette').cost, { egg: 2, crop: 1 });
  assert.equal(RECIPES.find(r => r.id === 'grape_juice').name, '포도주스');
});

test('comboKey: 재료 순서가 달라도 같은 키, 중복은 유지', () => {
  assert.equal(comboKey(['honey', 'fish', 'apple']), 'fish+honey+apple');
  assert.equal(comboKey(['apple', 'honey', 'fish']), 'fish+honey+apple');
  assert.equal(comboKey(['egg', 'egg']), 'egg+egg');
  assert.deepEqual(parseKey('fish+honey+apple'), ['fish', 'honey', 'apple']);
});

test('allCombos: 14종 크기 1~3 중복조합 = 14+105+560', () => {
  const all = allCombos();
  assert.equal(INGREDIENTS.length, 14);
  assert.equal(all.length, 679);
  assert.equal(new Set(all).size, 679);
});

test('BLOCKED: 재료가 레시피와 똑같은 조합은 전부 막는다(리터럴 ↔ 원문 대조)', () => {
  const expect = {};
  for (const r of RECIPES) {
    const ids = Object.entries(r.cost).flatMap(([k, n]) => Array(n).fill(k));
    if (ids.length > 3 || !ids.every(k => INGREDIENTS.includes(k))) continue;
    (expect[comboKey(ids)] ||= []).push(r.id);
  }
  assert.deepEqual(BLOCKED, expect);
  for (const r of RECIPES) {
    const ids = Object.entries(r.cost).flatMap(([k, n]) => Array(n).fill(k));
    if (ids.length > 3 || !ids.every(k => INGREDIENTS.includes(k))) continue;
    assert.ok(BLOCKED[comboKey(ids)]?.includes(r.id), `${r.id} 가 막혀야 한다`);
  }
  assert.deepEqual([...BLOCKED['crop+forage+forage']].sort(), ['baked_yam', 'herb_salad']);
  assert.equal(freeCombos().length, 672);   // 679 − 막힌 7
  assert.ok(freeCombos().every(k => !BLOCKED[k]));
});

test('capTaste: 한 재료만 반복하면 최대 ★3, 1~5 범위로 자른다', () => {
  assert.equal(capTaste('honey+honey+honey', 5), 3);
  assert.equal(capTaste('honey', 4), 3);
  assert.equal(capTaste('apple+honey', 5), 5);
  assert.equal(capTaste('apple+honey', 9), 5);
  assert.equal(capTaste('apple+honey', 0), 1);
});

test('buffOf: 재료 계열 다수결, 동률은 luck>speed>chop>mine', () => {
  assert.equal(buffOf('fish+fish+honey'), 'luck');
  assert.equal(buffOf('grape+pear'), 'speed');
  assert.equal(buffOf('egg+flour+wheat'), 'chop');
  assert.equal(buffOf('crop+egg'), 'mine');
  assert.equal(buffOf('fish+honey'), 'luck');
  assert.equal(buffOf('crop+corn'), 'chop');
});

test('durOf: 맛 → 기본 지속(★3 이 ★1 레시피 60초보다 짧게)', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(durOf), [20, 30, 45, 60, 90]);
});

test('stageOf: 생선 있으면 굽기, 과일·꿀만이면 썰기, 나머지 끓이기', () => {
  assert.equal(stageOf('fish+honey'), 'grill');
  assert.equal(stageOf('honey+apple+pear'), 'chop');
  assert.equal(stageOf('egg+corn'), 'pot');
});

test('costOf: 키 → 재료 개수', () => {
  assert.deepEqual(costOf('egg+egg+honey'), { egg: 2, honey: 1 });
});

test('validateEntry: 시큰둥 금지어·길이·이모지·이름 충돌·괴요리 태그·중복', () => {
  const ctx = () => ({ recipeNames: new Set(RECIPES.map(r => r.name)), seenNames: new Set() });
  const ok = { name: '꿀 배숙', name_en: 'Honey Poached Pear', ico: '🍐', taste: 4,
               judge: '목을 따뜻하게 감싸주는 보약 같아요.', judge_en: 'A soothing sweet remedy.', tags: ['sweet', 'fruity'] };
  assert.deepEqual(validateEntry('honey+pear', ok, ctx()), []);
  assert.ok(validateEntry('peach+peach', { ...ok, judge: '그냥 복숭아 맛이에요.' }, ctx()).some(m => m.includes('금지어')));
  assert.ok(validateEntry('honey+pear', { ...ok, ico: 'persimmon' }, ctx()).some(m => m.includes('이모지')));
  assert.ok(validateEntry('honey+pear', { ...ok, name: '포도주스' }, ctx()).some(m => m.includes('레시피')));
  assert.ok(validateEntry('honey+pear', { ...ok, name: '수상한포도밀생선범벅' }, ctx()).some(m => m.includes('이름 길이')));
  assert.ok(validateEntry('honey+pear', { ...ok, judge: '가'.repeat(29) }, ctx()).some(m => m.includes('평 길이')));
  assert.ok(validateEntry('honey+pear', { ...ok, taste: 2 }, ctx()).some(m => m.includes('weird')));
  const c = ctx(); validateEntry('honey+pear', ok, c);
  assert.ok(validateEntry('honey+apple', ok, c).some(m => m.includes('중복')));
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/free-pot.test.mjs` / Expected: FAIL `Cannot find module '../js/free-pot/rules.js'`

- [ ] **Step 3: 구현** — `js/free-pot/rules.js`

```js
// =============================================================
//  🍲 자유 냄비 규칙 — 조합 키·막힌 조합·버프/지속/미니게임·항목 검증
//  ------------------------------------------------------------
//  ▶ 글(이름·평)과 맛 ★ 만 Gemini 가 정한다(오프라인 생성, js/free-pot/table.js).
//    버프·지속·미니게임·원가는 여기 규칙이 정한다 — LLM 이 경제 수치를 정하면 밸런스를 못 잡는다.
//  ▶ 순수 함수만. game.js 를 import 하지 않는다(생성기·테스트가 Node 에서 읽는다).
// =============================================================
export const INGREDIENTS = ['crop', 'forage', 'fish', 'egg', 'flour', 'wheat', 'corn', 'grape', 'honey',
  'apple', 'pear', 'peach', 'persimmon', 'chestnut'];
export const TAGS = ['sweet', 'salty', 'savory', 'fresh', 'hearty', 'fruity', 'fishy', 'veggie', 'weird'];
export const BANNED_JUDGE = ['그냥', '별로', '평범', '단순', '그저', '밋밋', '그럭저럭'];
export const NAME_MAX = 9, JUDGE_MAX = 28;

const ORDER = Object.fromEntries(INGREDIENTS.map((k, i) => [k, i]));
export const comboKey = (ids) => [...ids].sort((a, b) => ORDER[a] - ORDER[b]).join('+');
export const parseKey = (key) => key.split('+');

export function allCombos() {
  const out = [], n = INGREDIENTS.length;
  for (let a = 0; a < n; a++) {
    out.push(INGREDIENTS[a]);
    for (let b = a; b < n; b++) {
      out.push(`${INGREDIENTS[a]}+${INGREDIENTS[b]}`);
      for (let c = b; c < n; c++) out.push(`${INGREDIENTS[a]}+${INGREDIENTS[b]}+${INGREDIENTS[c]}`);
    }
  }
  return out;
}

// 레시피와 재료가 똑같은 조합 — 자유 냄비에선 막고 레시피 메뉴로 안내한다.
//   ⚠️ 리터럴로 둔다: catalog.js 는 three 를 끌고 와 Node(생성기·테스트)에서 import 할 수 없다.
//      레시피 재료를 바꾸면 tests/free-pot.test.mjs 가 원문과 대조해 잡아낸다.
export const BLOCKED = {
  'crop+crop+crop': ['veg_stew'], 'forage+forage+forage': ['mushroom_soup'], 'crop+crop': ['rice_ball'],
  'crop+forage+forage': ['baked_yam', 'herb_salad'], 'fish+fish': ['grilled_fish'],
  'crop+egg+egg': ['omelette'], 'flour+flour': ['bread'],
};
export const freeCombos = () => allCombos().filter(k => !BLOCKED[k]);

export function capTaste(key, taste) {
  const t = Math.max(1, Math.min(5, Math.round(taste)));
  return new Set(parseKey(key)).size === 1 ? Math.min(3, t) : t;
}

// 재료 계열 → 버프. 동률이면 BUFF_ORDER 앞쪽
const FAMILY = { fish: 'luck', grape: 'speed', honey: 'speed', apple: 'speed', pear: 'speed', peach: 'speed', persimmon: 'speed',
  flour: 'chop', wheat: 'chop', corn: 'chop', crop: 'mine', forage: 'mine', egg: 'mine', chestnut: 'mine' };
const BUFF_ORDER = ['luck', 'speed', 'chop', 'mine'];
export function buffOf(key) {
  const n = {};
  for (const k of parseKey(key)) n[FAMILY[k]] = (n[FAMILY[k]] || 0) + 1;
  const max = Math.max(...Object.values(n));
  return BUFF_ORDER.find(b => n[b] === max);
}

const DUR = [20, 30, 45, 60, 90];
export const durOf = (taste) => DUR[Math.max(1, Math.min(5, taste)) - 1];

const SWEET = new Set(['grape', 'honey', 'apple', 'pear', 'peach', 'persimmon']);
export function stageOf(key) {
  const ids = parseKey(key);
  if (ids.includes('fish')) return 'grill';
  if (ids.every(k => SWEET.has(k))) return 'chop';
  return 'pot';
}

export function costOf(key) {
  const c = {};
  for (const k of parseKey(key)) c[k] = (c[k] || 0) + 1;
  return c;
}

const EMOJI = /^\p{Extended_Pictographic}/u;
export function validateEntry(key, e, { recipeNames, seenNames }) {
  if (!e || typeof e !== 'object') return ['항목 없음'];
  const bad = [];
  const name = String(e.name || '').trim();
  if (name.length < 2 || name.length > NAME_MAX) bad.push(`이름 길이 ${name.length}`);
  if (recipeNames.has(name)) bad.push(`레시피 이름과 충돌: ${name}`);
  if (seenNames.has(name)) bad.push(`이름 중복: ${name}`);
  if (!e.name_en || /[가-힣]/.test(e.name_en)) bad.push('name_en 없음/한글 섞임');
  if (!EMOJI.test(e.ico || '') || /[A-Za-z]/.test(e.ico || '')) bad.push(`이모지 아님: ${e.ico}`);
  if (!Number.isInteger(e.taste) || e.taste < 1 || e.taste > 5) bad.push(`taste 범위: ${e.taste}`);
  const judge = String(e.judge || '');
  if (!judge || judge.length > JUDGE_MAX) bad.push(`평 길이 ${judge.length}`);
  const hit = BANNED_JUDGE.find(w => judge.includes(w));
  if (hit) bad.push(`금지어: ${hit}`);
  if (!e.judge_en || /[가-힣]/.test(e.judge_en)) bad.push('judge_en 없음/한글 섞임');
  if (!Array.isArray(e.tags) || !e.tags.length || e.tags.some(t => !TAGS.includes(t))) bad.push('tags 형식');
  if (e.taste <= 2 && !e.tags?.includes('weird')) bad.push('괴요리(★1~2)는 weird 태그 필요');
  if (!bad.length) seenNames.add(name);
  return bad;
}
```

`tools/free-pot/recipes-src.mjs`:

```js
// 🍲 catalog.js 원문에서 RECIPES 를 읽는다 — catalog.js 는 places.js → three 를 끌고 와 Node 에서 import 할 수 없다.
import { readFileSync } from 'node:fs';

export function recipesFromSource(text = readFileSync(new URL('../../js/data/catalog.js', import.meta.url), 'utf8')) {
  const i = text.indexOf('export const RECIPES = [');
  const block = text.slice(i, text.indexOf('\n];', i));
  return [...block.matchAll(/\{ id: '(\w+)',\s*name: '([^']+)'.*?cost: (\{[^}]*\})/g)]
    .map(m => ({ id: m[1], name: m[2], cost: Function(`return (${m[3]})`)() }));
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/free-pot.test.mjs` / Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/free-pot/rules.js tools/free-pot/recipes-src.mjs tests/free-pot.test.mjs
git commit -m "feat: 🍲 자유 냄비 규칙 — 조합 키·막힌 조합·버프/지속/미니게임·항목 검증"
```

---

### Task 2: 생성기·검수 도구 `tools/free-pot/`

**Files:**
- Create: `tools/free-pot/generate.mjs`, `tools/free-pot/review.mjs`
- Test: `tests/free-pot.test.mjs`

**Interfaces:**
- Consumes: Task 1 전부
- Produces: `buildPrompt(keys) → string`, `SCHEMA`, `renderTableModule(table) → string`;
  CLI `node tools/free-pot/generate.mjs [--limit N] [--dry]`(빠진 키만 생성, 기존 항목 보존) · `node tools/free-pot/review.mjs`

- [ ] **Step 1: 실패하는 테스트 추가** (`tests/free-pot.test.mjs` 끝)

```js
import { buildPrompt, renderTableModule } from '../tools/free-pot/generate.mjs';

test('buildPrompt: 규칙(재료 제한·분포·반복 상한·금지어·띄어쓰기)이 프롬프트에 들어간다', () => {
  const p = buildPrompt(['fish+honey', 'apple+pear']);
  for (const s of ['밀가루', '★5 약 10%', '최대 ★3', '"그냥"', '띄어쓰기', 'key=fish+honey', 'key=apple+pear']) assert.ok(p.includes(s), s);
});

test('renderTableModule: 키 정렬된 export 모듈을 만든다', () => {
  const src = renderTableModule({ 'honey+pear': { name: 'b' }, 'fish+honey': { name: 'a' } });
  assert.match(src, /^\/\/ ⚠️ 생성물/);
  assert.ok(src.indexOf('"fish+honey"') < src.indexOf('"honey+pear"'));
  assert.match(src, /export const FREE_POT_TABLE = /);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/free-pot.test.mjs` / Expected: FAIL `Cannot find module '../tools/free-pot/generate.mjs'`

- [ ] **Step 3: 구현** — `tools/free-pot/generate.mjs`

```js
// =============================================================
//  🍲 자유 냄비 조합 표 생성기 — Gemini 로 한 번 만들어 js/free-pot/table.js 에 커밋한다
//  ------------------------------------------------------------
//  ▶ 무료 한도(500 RPD·15 RPM)를 게임 크론(KST 20:00~22:40)과 공유 → KST 17:00~20:00 에만 돌린다.
//  ▶ 6.5초 간격, 429 면 즉시 멈춘다. 다시 돌리면 빠진 키만 이어서 만든다.
//  ▶ 검증(validateEntry) 실패 항목은 버리고 다음 라운드에 다시 만든다(최대 3라운드).
//  사용: node tools/free-pot/generate.mjs [--limit N] [--dry]
// =============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TAGS, BANNED_JUDGE, capTaste, freeCombos, parseKey, validateEntry } from '../../js/free-pot/rules.js';
import { recipesFromSource } from './recipes-src.mjs';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('js/free-pot/table.js', ROOT);
const MODEL = 'gemini-flash-lite-latest';
const BATCH = 40, PACE_MS = 6500, ROUNDS = 3;

const LABEL = { crop: '당근·채소', forage: '숲 버섯·나물', fish: '물고기', egg: '달걀', flour: '밀가루', wheat: '밀',
  corn: '옥수수', grape: '포도', honey: '꿀', apple: '사과', pear: '배', peach: '복숭아', persimmon: '감', chestnut: '밤' };

export function buildPrompt(keys) {
  const list = keys.map((k, i) => `${i + 1}. key=${k} → ${parseKey(k).map(x => LABEL[x]).join(', ')}`).join('\n');
  return `너는 아늑한 숲속 동물 마을 힐링 게임 "calm forest"의 요리 심사위원이야.
플레이어가 냄비에 재료 1~3개를 넣으면, 그 조합으로 나올 법한 요리를 판정해.
규칙:
- key: 입력의 key 를 그대로.
- name: 한국어 요리 이름(2~9자, 귀엽고 소박하게). 자연스러운 띄어쓰기(예: "달콤 사과파이", "꿀 배숙").
- name_en: 자연스러운 영어 이름.
- ⚠️ 넣은 재료만으로 만들 수 있는 요리여야 해. 밀가루·밀이 없으면 빵·파이·케이크·팬케이크·전 금지, 달걀이 없으면 달걀 요리 금지.
- ico: 요리를 나타내는 이모지 1개(글자 금지).
- taste: 1~5 정수. 실제 맛 궁합으로 엄격하게. 전체 분포 목표: ★5 약 10%, ★4 약 25%, ★3 약 30%, ★1~2 약 35%. ★5 는 누구나 인정할 조합만.
- 같은 재료만 반복한 조합은 최대 ★3. 그래도 평은 그 재료의 매력을 칭찬해.
- taste 1~2(괴요리)는 이름에서도 이상한 요리라는 게 드러나게("수상한", "모험", "정체불명" 느낌). 맛있어 보이는 이름 금지. tags 에 weird 포함.
- judge: 한국어 한 줄 평, 해요체, 25자 이내, 따뜻하고 다정하게. 괴요리도 비난하지 말고 귀엽게.
  시큰둥하거나 심드렁한 말투 금지 — ${BANNED_JUDGE.map(w => `"${w}"`).join(' ')} 같은 말을 쓰지 마.
- judge_en: 같은 뜻의 영어 한 줄.
- tags: 다음 중 1~3개 ${JSON.stringify(TAGS)}
- 같은 재료가 반복되면 그 재료가 주재료인 요리로.
조합 목록:
${list}`;
}

export const SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      key: { type: 'STRING' }, name: { type: 'STRING' }, name_en: { type: 'STRING' }, ico: { type: 'STRING' },
      taste: { type: 'INTEGER' }, judge: { type: 'STRING' }, judge_en: { type: 'STRING' },
      tags: { type: 'ARRAY', items: { type: 'STRING', enum: TAGS } },
    },
    required: ['key', 'name', 'name_en', 'ico', 'taste', 'judge', 'judge_en', 'tags'],
  },
};

export function renderTableModule(table) {
  const body = Object.keys(table).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])},`).join('\n');
  return `// ⚠️ 생성물 — tools/free-pot/generate.mjs 가 쓴다. 손으로 고칠 땐 validateEntry 규칙을 지킬 것.\n` +
    `//    검수: node tools/free-pot/review.mjs → dev/active/free-pot/review.html\n` +
    `export const FREE_POT_TABLE = {\n${body}\n};\n`;
}

async function loadTable() {
  if (!existsSync(OUT)) return {};
  return { ...(await import(`${pathToFileURL(fileURLToPath(OUT)).href}?t=${Date.now()}`)).FREE_POT_TABLE };
}

function readKey() {
  const line = readFileSync(new URL('.env', ROOT), 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
  if (!line) throw new Error('.env 에 GEMINI_API_KEY 가 없다');
  return line.slice('GEMINI_API_KEY='.length).trim();
}

async function callGemini(apiKey, keys) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(keys) }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  if (res.status === 429) { const e = new Error('429 — 한도. 멈춘다'); e.stop = true; throw e; }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function save(table, calls) {
  writeFileSync(OUT, renderTableModule(table));
  console.log(`  저장 ${Object.keys(table).length}개 · Gemini ${calls}회`);
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
  const dry = args.includes('--dry');
  const table = await loadTable();
  const recipeNames = new Set(recipesFromSource().map(r => r.name));
  const seenNames = new Set(Object.values(table).map(e => e.name));
  const apiKey = dry ? null : readKey();
  let calls = 0;
  for (let round = 1; round <= ROUNDS; round++) {
    const missing = freeCombos().filter(k => !table[k]).slice(0, limit);
    console.log(`round ${round}: 빠진 조합 ${missing.length}`);
    if (!missing.length) break;
    if (dry) { console.log(buildPrompt(missing.slice(0, BATCH))); return; }
    for (let i = 0; i < missing.length; i += BATCH) {
      const keys = missing.slice(i, i + BATCH);
      let rows;
      try { rows = await callGemini(apiKey, keys); calls++; }
      catch (e) { console.error(e.message); if (e.stop) { save(table, calls); return; } await sleep(PACE_MS); continue; }
      for (const r of rows) {
        if (!keys.includes(r.key)) continue;
        const e = { name: r.name.trim(), name_en: r.name_en.trim(), ico: r.ico.trim(), taste: capTaste(r.key, r.taste),
          judge: r.judge.trim(), judge_en: r.judge_en.trim(), tags: r.tags };
        const bad = validateEntry(r.key, e, { recipeNames, seenNames });
        if (bad.length) { console.log(`  ✗ ${r.key}: ${bad.join(' / ')}`); continue; }
        table[r.key] = e;
      }
      save(table, calls);
      await sleep(PACE_MS);
    }
  }
  save(table, calls);
  const hist = [1, 2, 3, 4, 5].map(t => Object.values(table).filter(e => e.taste === t).length);
  console.log(`★ 분포 1~5: ${hist.join(' / ')} · 채움 ${Object.keys(table).length}/${freeCombos().length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
```

`tools/free-pot/review.mjs`:

```js
// 🍲 자유 냄비 표 검수 페이지 — ★5·★1~2 항목을 위로 모아 한 장으로 본다
import { writeFileSync } from 'node:fs';
import { FREE_POT_TABLE } from '../../js/free-pot/table.js';
import { buffOf, durOf, stageOf, freeCombos } from '../../js/free-pot/rules.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rank = (e) => (e.taste === 5 ? 0 : e.taste <= 2 ? 1 : 2);
const rows = Object.entries(FREE_POT_TABLE).sort(([, a], [, b]) => rank(a) - rank(b) || b.taste - a.taste);
const missing = freeCombos().filter(k => !FREE_POT_TABLE[k]);
const hist = [1, 2, 3, 4, 5].map(t => rows.filter(([, e]) => e.taste === t).length);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Free pot review</title>
<style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}.s5{background:#fff5d6}.s1,.s2{background:#fde8e8}</style>
<h1>🍲 자유 냄비 표 검수</h1>
<p>채움 ${rows.length}/${freeCombos().length} · 빠짐 ${missing.length} · ★1~5 분포 ${hist.join(' / ')}</p>
<table><tr><th>조합</th><th>요리</th><th>★</th><th>평</th><th>EN</th><th>버프·지속·판</th><th>태그</th></tr>
${rows.map(([k, e]) => `<tr class="s${e.taste}"><td>${esc(k)}</td><td>${esc(e.ico)} ${esc(e.name)}</td><td>${e.taste}</td><td>${esc(e.judge)}</td><td>${esc(e.name_en)} — ${esc(e.judge_en)}</td><td>${buffOf(k)} · ${durOf(e.taste)}s · ${stageOf(k)}</td><td>${esc(e.tags.join(','))}</td></tr>`).join('\n')}
</table>`;
writeFileSync(new URL('../../dev/active/free-pot/review.html', import.meta.url), html);
console.log(`review.html · ${rows.length}행`);
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/free-pot.test.mjs` / Expected: PASS. `node tools/free-pot/generate.mjs --dry` 가 API 를 부르지 않고 프롬프트만 찍는지 확인.

- [ ] **Step 5: Commit**

```bash
git add tools/free-pot/ tests/free-pot.test.mjs
git commit -m "feat: 🍲 자유 냄비 조합 표 생성기·검수 페이지"
```

---

### Task 3: 표 생성·검수 (⏸️ 사람 게이트)

**Files:**
- Create: `js/free-pot/table.js` (생성물). `dev/active/free-pot/review.html` 은 커밋하지 않는다.
- Test: `tests/free-pot.test.mjs`

- [ ] **Step 1: 표 무결성 테스트 추가**

```js
import { FREE_POT_TABLE } from '../js/free-pot/table.js';

test('FREE_POT_TABLE: 막히지 않은 모든 조합이 있고 항목이 전부 검증을 통과한다', () => {
  const recipeNames = new Set(RECIPES.map(r => r.name)), seenNames = new Set();
  for (const k of freeCombos()) {
    const e = FREE_POT_TABLE[k];
    assert.ok(e, `빠진 조합 ${k}`);
    assert.deepEqual(validateEntry(k, e, { recipeNames, seenNames }), [], k);
    assert.equal(e.taste, capTaste(k, e.taste), `${k}: 반복 상한`);
  }
  for (const k of Object.keys(FREE_POT_TABLE)) assert.ok(!BLOCKED[k], `막힌 조합이 표에 있다 ${k}`);
});

test('FREE_POT_TABLE: ★5 는 15% 이하, ★1~2 는 20% 이상', () => {
  const v = Object.values(FREE_POT_TABLE), n = v.length;
  assert.ok(v.filter(e => e.taste === 5).length / n <= 0.15);
  assert.ok(v.filter(e => e.taste <= 2).length / n >= 0.20);
});
```

- [ ] **Step 2: 실행 시각 확인** — `TZ=Asia/Seoul date` 가 17:00~20:00 사이인지. 아니면 그 시간까지 미룬다.
- [ ] **Step 3: 생성** — Run: `node tools/free-pot/generate.mjs` / Expected: 약 17~25회 호출, `★ 분포` 출력, 채움 = 전부. 429 로 멈추면 다음 날 같은 시간대에 다시(이어서 만든다).
- [ ] **Step 4: 테스트** — Run: `node --test tests/free-pot.test.mjs` / Expected: PASS. 분포 테스트가 실패하면 초과 등급 항목 일부를 표에서 지우고 Step 3 재실행.
- [ ] **Step 5: 검수** — Run: `node tools/free-pot/review.mjs` → `review.html` 을 사용자에게 보내고 **승인받을 때까지 멈춘다**. 짚은 항목은 표에서 지우고 Step 3 재실행 또는 손으로 수정 후 Step 4.
- [ ] **Step 6: Commit**

```bash
git add js/free-pot/table.js tests/free-pot.test.mjs
git commit -m "feat: 🍲 자유 냄비 조합 표(Gemini 오프라인 생성·검수 완료)"
```

---

### Task 4: 게임 배선 — `dishOf` 로 기존 요리 흐름 재사용

**Files:**
- Create: `js/free-pot/dish.js`
- Modify: `js/spaces/cooking.js` (`dishOf`·`freePotView` 추가, `pantryView`·`cookResolve`·`pantryEat` 교체)
- Modify: `js/game.js` — `kitchenStart`(현재 4585행), `kitchenFinish`(4608행), cooking.js import 줄
- (확인됨) `SELL_ICO_G`·`RES_LABEL` 에 과일 5종이 이미 있다 — 수정 불필요
- Test: `tests/free-pot.test.mjs`, `tests/free-pot-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1 `comboKey, BLOCKED, costOf, buffOf, durOf, stageOf, capTaste, INGREDIENTS`, Task 3 `FREE_POT_TABLE`
- Produces:
  - dish.js: `FREE_PREFIX='free:'`, `isFreeId(id)`, `loadFreePot() → Promise`, `freePotReady()`, `freePotTotal()`,
    `freeDishOf(id) → { id, name, name_en, ico, desc, cost, buff, dur, stages:[stage], free:{ key, taste, judge, judge_en, tags } } | null`,
    `freePotCheck(ids) → { ok, key?, blocked?, msg? }`
  - cooking.js: `dishOf(id)`, `freePotView() → { ingredients:[{k,ico,label,have}], found, total }`
  - game.js `kitchenFinish` 반환에 `free: { taste, judge, judge_en, name_en, isNew, found, total } | null`

- [ ] **Step 1: 실패 테스트** — `tests/free-pot.test.mjs` 에 추가

```js
import { FREE_PREFIX, isFreeId, freeDishOf, freePotCheck, loadFreePot } from '../js/free-pot/dish.js';

test('freeDishOf: 표 → 레시피 모양(버프·지속·판은 규칙에서)', async () => {
  await loadFreePot();
  const k = freeCombos().find(x => x.startsWith('fish+'));
  const d = freeDishOf(FREE_PREFIX + k);
  assert.equal(d.id, FREE_PREFIX + k);
  assert.equal(d.name, FREE_POT_TABLE[k].name);
  assert.deepEqual(d.cost, costOf(k));
  assert.equal(d.buff, buffOf(k));
  assert.equal(d.dur, durOf(FREE_POT_TABLE[k].taste));
  assert.deepEqual(d.stages, [stageOf(k)]);
  assert.equal(d.free.taste, FREE_POT_TABLE[k].taste);
  assert.ok(isFreeId(d.id) && !isFreeId('veg_stew'));
  assert.equal(freeDishOf('free:nope'), null);
  assert.equal(freeDishOf('free:crop+crop+crop'), null);   // 막힌 조합
});

test('freePotCheck: 1~3개만, 막힌 조합은 레시피 안내', () => {
  assert.equal(freePotCheck([]).ok, false);
  assert.equal(freePotCheck(['egg', 'egg', 'egg', 'egg']).ok, false);
  const b = freePotCheck(['crop', 'crop', 'crop']);
  assert.equal(b.ok, false); assert.deepEqual(b.blocked, ['veg_stew']);
  const ok = freePotCheck(['pear', 'honey']);
  assert.equal(ok.ok, true); assert.equal(ok.key, 'honey+pear');
});
```

`tests/free-pot-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };

test('kitchenStart·kitchenFinish 는 dishOf 로 요리를 찾는다(자유 요리도 같은 길)', () => {
  assert.match(fn('kitchenStart'), /dishOf\(id\)/);
  assert.match(fn('kitchenFinish'), /dishOf\(id\)/);
});
test('자유 요리는 도감(cook)에 올리지 않는다', () => {
  assert.match(fn('kitchenFinish'), /if \(!isFreeId\(id\)\) dexDiscover\('cook', id\)/);
});
test('찬장·먹기도 dishOf 를 쓴다(자유 요리를 보관해도 안 깨진다)', () => {
  for (const f of ['pantryView', 'cookResolve', 'pantryEat']) assert.match(fn(f), /dishOf\(/, f);
});
test('자유 요리 결과·시작·먹기에 축 파라미터가 실린다', () => {
  for (const p of ['combo_key', 'taste', 'is_new', 'found', 'buff', 'dur_base']) assert.match(fn('kitchenFinish'), new RegExp(`${p}:`), p);
  for (const p of ['combo_key', 'n_ing', 'stage']) assert.match(fn('kitchenStart'), new RegExp(`${p}:`), p);
  assert.match(fn('eatDish'), /taste:/);
  assert.match(fn('cookResolve'), /taste:/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/free-pot.test.mjs tests/free-pot-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/free-pot/dish.js`**

```js
// =============================================================
//  🍲 자유 냄비 → 레시피 모양 객체. kitchenStart/kitchenFinish/찬장이 레시피처럼 다룬다
//  ▶ 표(약 130KB)는 첫 로딩에 넣지 않는다 — 주방을 열 때 loadFreePot() 로 한 번만 불러온다.
//    찬장에 자유 요리가 있는데 표가 아직 없으면 '🍲 냄비 요리' 대체 객체로 안전하게 보여 준다.
// =============================================================
import { BLOCKED, INGREDIENTS, buffOf, capTaste, comboKey, costOf, durOf, stageOf } from './rules.js';

export const FREE_PREFIX = 'free:';
export const isFreeId = (id) => typeof id === 'string' && id.startsWith(FREE_PREFIX);

let TABLE = null, loading = null;
export function loadFreePot() {
  if (TABLE) return Promise.resolve();
  return (loading ||= import('./table.js').then(m => { TABLE = m.FREE_POT_TABLE; }));
}
export const freePotReady = () => !!TABLE;
export const freePotTotal = () => (TABLE ? Object.keys(TABLE).length : 0);

export function freeDishOf(id) {
  if (!isFreeId(id)) return null;
  const key = id.slice(FREE_PREFIX.length);
  const parts = key.split('+');
  if (parts.length > 3 || !parts.every(k => INGREDIENTS.includes(k)) || BLOCKED[key]) return null;
  const e = TABLE?.[key];
  if (TABLE && !e) return null;
  const taste = e ? capTaste(key, e.taste) : 3;
  return {
    id, name: e?.name || '냄비 요리', name_en: e?.name_en || 'Pot Dish', ico: e?.ico || '🍲', desc: '',
    cost: costOf(key), buff: buffOf(key), dur: durOf(taste), stages: [stageOf(key)],
    free: { key, taste, judge: e?.judge || '', judge_en: e?.judge_en || '', tags: e?.tags || [] },
  };
}

export function freePotCheck(ids) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3) return { ok: false, msg: '재료를 1~3개 골라 주세요' };
  const key = comboKey(ids);
  if (BLOCKED[key]) return { ok: false, key, blocked: BLOCKED[key], msg: '레시피가 있는 요리예요 — 메뉴에서 만들어 주세요' };
  return { ok: true, key };
}
```

- [ ] **Step 4: cooking.js** — import·정의 추가, 사용처 교체

```js
import { FREE_PREFIX, freeDishOf, freePotCheck, freePotTotal, isFreeId, loadFreePot } from '../free-pot/dish.js';
import { INGREDIENTS } from '../free-pot/rules.js';

export function dishOf(id) { return isFreeId(id) ? freeDishOf(id) : recipeOf(id); }

// 🍲 자유 냄비 재료판 — index.html 이 렌더. found = 발견한 조합 수(kitchen.best 의 free: 키)
export function freePotView() {
  const inv = gameState.inventory;
  return {
    ingredients: INGREDIENTS.map(k => ({ k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, have: inv[k] || 0 })),
    found: Object.keys(gameState.kitchen.best || {}).filter(isFreeId).length,
    total: freePotTotal(),
  };
}
export { FREE_PREFIX, freePotCheck, freePotTotal, isFreeId, loadFreePot };
```

`pantryView`:

```js
    items: (gameState.pantry || []).map((f, i) => {
      const r = dishOf(f.id); if (!r) return null;
      const t = cookTier(f.score);
      return { i, id: f.id, name: r.name, ico: r.ico, score: f.score, tier: { id: t.id, ico: t.ico, name: t.name, mult: t.mult },
        buff: { ...BUFF_META[r.buff], dur: buffDur(r, t) } };
    }).filter(Boolean),
```

`cookResolve`·`pantryEat` 의 `recipeOf(` → `dishOf(`.

- [ ] **Step 5: game.js** — `kitchenStart` 첫 줄 `const r = dishOf(id); if (!r) return { ok: false };`. 기존 `trackEvent('cooking_start', {…})` 에 `combo_key: r.free?.key ?? null, n_ing: r.free ? r.free.key.split('+').length : null, stage: r.free ? r.stages[0] : null` 추가. `cookResolve`(보관)·`eatDish` 의 `cook_store`·`cook_eat` 에 `taste: r.free?.taste ?? null` 추가. `kitchenFinish`:

```js
function kitchenFinish(id, res = {}) {
  const r = dishOf(id); if (!r) return { ok: false };
  const score = Math.max(0, Math.min(100, Math.round(res.score || 0)));
  const tier = cookTier(score);
  const st = gameState.kitchen;
  st.cooked = (st.cooked || 0) + 1;
  st.tiers[tier.id] = (st.tiers[tier.id] || 0) + 1;
  const isNew = isFreeId(id) && !(id in st.best);            // 🍲 처음 발견한 조합(기록 전에 본다)
  const isBest = score > (st.best[id] || 0);
  if (isBest || isNew) st.best[id] = Math.max(score, st.best[id] || 0);
  // … Sound / spawnFloatText / spawnSparkle 원문 그대로 …
  if (!isFreeId(id)) dexDiscover('cook', id);                // 📖 도감(첫 요리) — 자유 요리는 발견 수로 센다
  // … questEvent / triggerMoment / syncStory / DDA 원문 그대로 …
  trackEvent(res.abandoned ? 'cooking_abandon' : 'cooking_result', {
    // … 기존 필드 원문 그대로 …
    combo_key: r.free ? r.free.key : null,                 // 🍲 조합(접두사 없는 키) — recipe 와 같은 대상
    taste: r.free ? r.free.taste : null,                     // 🍲 자유 요리 맛 ★(레시피 요리는 null)
    is_new: r.free ? (isNew ? 1 : 0) : null,                 // 🍲 처음 발견한 조합인지
    found: r.free ? Object.keys(st.best).filter(isFreeId).length : null,   // 🍲 누적 발견 수(이 판 포함)
    buff: r.buff, dur_base: r.dur,                         // 제어 파라미터 — 버프 종류·기본 지속
  });
  pendingDish = { id, tier: tier.id, score };
  return {
    ok: true, name: r.name, ico: r.ico, score, isBest, cooked: st.cooked,
    tier: { id: tier.id, ico: tier.ico, name: tier.name, mult: tier.mult },
    buff: { ...BUFF_META[r.buff], dur: buffDur(r, tier) },
    canStore: (gameState.pantry || []).length < PANTRY_MAX,
    pantryFull: (gameState.pantry || []).length >= PANTRY_MAX,
    free: r.free ? { taste: r.free.taste, judge: r.free.judge, judge_en: r.free.judge_en, name_en: r.name_en,
                     isNew, found: Object.keys(st.best).filter(isFreeId).length, total: freePotTotal() } : null,
  };
}
```

game.js 의 cooking.js import 에 `dishOf, isFreeId, freePotTotal` 추가.

- [ ] **Step 6: 통과·문법 확인** — Run: `npm test` / Expected: 전체 PASS(기존 cooking-course·save 테스트 포함). `cp js/game.js /tmp/x.mjs && node --check /tmp/x.mjs`, cooking.js 도 같은 방식.

- [ ] **Step 7: Commit**

```bash
git add js/free-pot/dish.js js/spaces/cooking.js js/game.js tests/free-pot*.test.mjs
git commit -m "feat: 🍲 자유 냄비를 기존 요리 흐름에 — dishOf 로 코스·찬장·먹기 재사용"
```

---

### Task 5: UI — 🍲 탭과 결과 카드 (⏸️ 문구 검수 게이트)

**Files:**
- Modify: `index.html` — `#kitchen-menu` 탭, `renderFreePot`, `showCookResult`(4726행 부근)
- Modify: `js/game.js` — Input 브리지에 `getFreePot`, `loadFreePot`, `freePotStart`
- Modify: `js/i18n-en.js`
- Test: `tests/free-pot-wiring.test.mjs`

- [ ] **Step 1: 문구 후보 검수 — 사용자 승인 전 구현 금지**
  - 탭: `🍲 자유 냄비` / `🍲 아무거나 냄비` / `🍲 모험 냄비`
  - 안내: `재료를 1~3개 넣어 보세요` / `무엇이 나올지 몰라요 — 재료를 골라 보세요`
  - 버튼: `🍳 끓이기` / `🍳 요리 시작`
  - 막힌 조합: `레시피가 있는 요리예요 — 메뉴에서 만들어 주세요`
  - 발견 수: `발견한 요리 {0}/{1}`
  - 새 발견: `✨ 새 요리 발견!`
  - 결과 맛 줄: `맛 ★★★★☆ — {평}`

- [ ] **Step 2: 실패 테스트 추가** (`tests/free-pot-wiring.test.mjs`)

```js
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('주방에 자유 냄비 탭이 있고 표를 지연 로드한다', () => {
  assert.match(html, /id="kt-tab-free"/);
  assert.match(html, /Input\.loadFreePot\(\)/);
  assert.match(html, /function renderFreePot\(/);
});
test('결과 카드가 자유 요리의 맛·평·새 발견을 보여 준다', () => {
  assert.match(html, /res\.free/);
  assert.match(html, /id="mgr-taste"/);
});
test('영어일 때 생성된 이름·평은 _en 을 직접 쓴다', () => {
  assert.match(html, /LANG === 'en' \? res\.free\.judge_en : res\.free\.judge/);
});
test('free_pot_open·free_pot_blocked 트래킹', () => {
  assert.match(src, /trackEvent\('free_pot_open', \{ found[\s\S]{0,80}total[\s\S]{0,80}kinds_have/);
  assert.match(src, /trackEvent\('free_pot_blocked', \{ combo_key: c\.key, recipe_ids:/);
});
test('freePotStart 는 freePotCheck 를 거쳐 kitchenStart 로 들어간다', () => {
  assert.match(src, /freePotStart[\s\S]{0,200}freePotCheck\(ids\)[\s\S]{0,400}kitchenStart\(FREE_PREFIX \+ c\.key\)/);
});
```

- [ ] **Step 3: 실패 확인** — Run: `node --test tests/free-pot-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 4: 구현** (확정 문구로)
  - game.js Input: `getFreePot`(열 때 `trackEvent('free_pot_open', { found, total, kinds_have })`), `loadFreePot`, `freePotStart(ids) { const c = freePotCheck(ids); if (!c.ok) { if (c.blocked) trackEvent('free_pot_blocked', { combo_key: c.key, recipe_ids: c.blocked.join(',') }); return c; } return kitchenStart(FREE_PREFIX + c.key); }`
  - `#kitchen-menu` 머리에 탭 두 개(`#kt-tab-recipe` 기본, `#kt-tab-free`). 자유 탭 → `await Input.loadFreePot(); renderFreePot(Input.getFreePot())`.
  - `renderFreePot(d)`: 재료 칩 14개(보유 0 이면 비활성). 칩 → 냄비 칸(최대 3, 같은 재료 여러 번 가능·보유 수 이내). 냄비 칸 누르면 빠짐. 발견 수 줄. 끓이기 → `Input.freePotStart(ids)` → ok 면 `closeKitchen(); startCookCourse(st)`, 아니면 `ui.toast(st.msg)`.
  - `showCookResult(res)`: `res.free` 면 `#mgr-taste` 에 `맛 ${'★'.repeat(t)}${'☆'.repeat(5 - t)} — ${LANG === 'en' ? res.free.judge_en : res.free.judge}`, `res.free.isNew` 면 새 발견 배지와 발견 수. 영어면 요리 이름도 `res.free.name_en`.
  - 조각을 `" · "` 로 잇지 않는다. 한국어 정적 문구는 `js/i18n-en.js` 에 추가(캐치올 패턴보다 위).

- [ ] **Step 5: 통과 확인** — Run: `npm test` / Expected: PASS

- [ ] **Step 5b: 트래킹 실측** — trackEvent 가로채기로 open→blocked(당근×3)→start→result→eat/store 로그를 context 에 붙인다.
- [ ] **Step 6: 브라우저 검증** — `preview_start` → `window.__kitchenOpen()` → 자유 탭 → 재료 담기 → 끓이기 → 미니게임 끝 → 결과 카드(이름·맛·평·새 발견). 막힌 조합(당근×3) 토스트. 찬장 보관 후 가방 찬장 이름. `?lang=en`. `resize_window mobile`(375px) 에서 칩·냄비·결과 카드 안 잘림. 콘솔 에러 0. PC·모바일 스크린샷 전달.

- [ ] **Step 7: Commit**

```bash
git add index.html js/game.js js/i18n-en.js tests/free-pot-wiring.test.mjs
git commit -m "feat: 🍲 자유 냄비 탭·결과 카드(맛 ★·한 줄 평·새 요리 발견)"
```

---

### Task 6: 리뷰·마무리

- [ ] **Step 1:** code-reviewer 에이전트로 Task 1~5 리뷰 → CRITICAL/HIGH 수정
- [ ] **Step 2:** `npm test` 전체 PASS, `.mjs` 복사 문법 검사 통과
- [ ] **Step 3:** 새 파라미터가 GA4 예약어가 아닌지 확인(`tests/ga-params.test.mjs` 는 예약어 rename 만 검사 — 화이트리스트 없음). **배포 다음날 BQ** 에서 `recipe LIKE 'free:%'` 행의 `combo_key`·`taste`·`is_new`·`found`, `free_pot_open`→`cooking_start` 전환율 확인.
- [ ] **Step 4:** 배포는 사용자 결정 — 웹·토스(`bundle_upload` + 메모)·itch·Play 4곳, 공지는 토스 출시 후. 푸시는 main + feat/capacitor-app 둘 다, 푸시 전 키 스캔.
