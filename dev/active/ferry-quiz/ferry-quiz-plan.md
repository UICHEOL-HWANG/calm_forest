# 🦆 사공 오리 퀴즈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마을의 사공 오리에게 말을 걸면 하루 한 번 게임 세계에 관한 4지선다 3문제를 내고, 맞히면 작은 보상을, 틀리면 정답과 "어디서 알 수 있는지" 힌트를 준다.

**Architecture:** 문제는 **게임 데이터에서 템플릿으로 생성**한다(`js/ferry-quiz.js`, 순수). 정답이 항상 게임 수치와 일치하고 수치를 바꾸면 문제도 따라간다.
문제 세트는 날짜 시드(`dateHash`)로 뽑아 그날 모두 같다. UI 는 기존 `#chat-modal`(대화 선택지) 또는 승인된 새 카드. 사공 말투는 **하오체**("~구먼", "~보시게").

**Tech Stack:** Vanilla JS · node:test · GA4

**Spec:** 2026-09-29 대화 합의 — 세 기능 중 마지막. **디자인·문구는 사용자 검토 필수**, **트래킹은 체크리스트 전 항목**.
(처음 말한 "Supabase 문제 풀" 대신 데이터 템플릿으로 바꾼 이유: LLM·사람이 쓴 문제는 정답이 게임과 어긋날 수 있다.)

## Global Constraints

- **⏸️ 디자인 게이트: 퀴즈 화면·사공 대사·보상·문제 목록은 사용자 승인 전에 게임 코드에 넣지 않는다.** 시안 3개 이상, PC+모바일.
- 하루 1회, 3문제, 4지선다. 도중에 닫으면 그날 퀴즈는 끝(재시도로 정답 캐기 방지) — 이미 맞힌 만큼은 보상.
- 문제 세트·보기 순서는 날짜 시드에서 파생(모두 같음). 한 세트 안에서 템플릿은 겹치지 않는다.
- 사공 대사는 하오체. 틀려도 나무라지 않는다(시큰둥·비꼼 금지).
- ko/en 둘 다 템플릿이 만든다. 이름 번역은 `js/i18n-en.js` 사전을 거친다(사전에 없는 이름은 테스트로 잡는다).
- `js/data/catalog.js` 는 Node 에서 import 불가(three) → 퀴즈 모듈은 **데이터를 인자로 받는** 순수 함수. 테스트는 소스 파싱·import 가능한 모듈(`npcs.js`·`orchard.js`·`farm-building.js`)로 데이터를 만든다.
- 새 코드는 game.js 에 몰지 않는다 → `js/ferry-quiz.js`, 진행은 `js/spaces/ferry-quiz-run.js`, 배선은 `js/spaces/npc.js`·index.html.

## 📊 Tracking Spec (체크리스트 적용)

**식별자:** 문제 id `qid = '<tpl>:<entity>'`(예: `fruit_days:peach`, `recipe_buff:luck`, `npc_name:owl`). 보기 id 도 엔티티 id(`picked_id`). 그날 세트 = `quiz_date`.
표시 문자열(문제 문장·이름)은 보내지 않는다 — i18n·리네임에 깨진다.

| 단계 | 이벤트 | 파라미터 |
|---|---|---|
| 노출 | `ferry_quiz_offer` (사공 창을 열 때) | `quiz_date, available`(0/1), `reason`(`done`·`ok`) |
| 시작 | `ferry_quiz_start` | `quiz_date, qids`(쉼표), `tpls`(쉼표) |
| 답 | `ferry_quiz_answer` (문제마다) | `quiz_date, q_no, qid, tpl, picked_id, answer_id, picked_idx, answer_idx, correct`(0/1), `ms` |
| 끝 | `ferry_quiz_end` | `quiz_date, correct_n, total, reached`(답한 문제 수), `quit`(0/1), `ms_total`, `reward_id` |
| 원장 | `giveReward(r, 'ferry_quiz', 'ferry_quiz:' + correct_n)` | 보상에 코인이 있을 때만 `econ_logs`(코인 전용)에 `source='ferry_quiz'` |

**분석 축:** `tpl`(어떤 지식이 약한가), `qid`(구체 항목), `picked_id`(가장 헷갈리는 오답), `ms`(망설임), `q_no`(피로·이탈).
**제어 파라미터(8번):** 세트가 날마다 시드로 바뀌어 템플릿·항목이 **자연히 흔들린다** → `qid` 별 정답률 비교 가능. 난이도 조절은 지금 없음(넣게 되면 결과 이벤트에 값을 싣는다).
**DB 결정:** GA4 만. ML 피처·당일 확인 요구가 없다. (필요해지면 `quiz_answers` 새 테이블 — `game_logs` 에 섞지 않는다.)
**검증:** 개발 세션에서 trackEvent 가로채기로 offer→start→answer×3→end 순서·파라미터 확인. **다음 날 BQ** 에서 `quiz_date` 로 조인, `qid` 별 정답률 쿼리가 나오는지.
**예약어 금지**(source·medium·campaign·campaign_id·term·content). `ferry_quiz_*` 를 `ACTION_EVENTS`(`js/retention-guidance.js:25`)에 넣을지 확인.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/ferry-quiz.js` (신규) | `QUIZ_TEMPLATES`, `buildDailyQuiz(seed, data, n)`, `quizAvailable`, `quizReward` — 순수 |
| `tools/ferry-quiz/data-node.mjs` (신규) | Node 용 `QuizData` 구성(테스트·검수 공유) |
| `tools/ferry-quiz/review.mjs` (신규) | 모든 템플릿×엔티티 문제 ko/en 검수 HTML |
| `js/spaces/ferry-quiz-run.js` (신규) | `quizStart/quizAnswer/quizEnd` 진행·보상·트래킹 |
| `js/spaces/npc.js` (수정) | `talkToNPC` 뷰에 `quiz`(사공일 때만) + offer 트래킹 |
| `js/game.js` (수정) | `gameState.quiz` 기본값, Input 브리지, `quizData()` |
| `index.html` (수정) | 사공 창 🦆 퀴즈 버튼 + 퀴즈 화면(승인안) |
| `js/i18n-en.js` (수정) | 정적 문구·사공 대사·이름 누락분 |
| `sims/ferry-quiz/quiz-options.html` (신규) | 디자인 시안 3안 |
| `tests/ferry-quiz.test.mjs` (신규) | 템플릿 정합성·시드·보상·배선·트래킹 |

---

### Task 1: ⏸️ 디자인·문구·보상 검토 (코드 전에)

**Files:** Create `sims/ferry-quiz/quiz-options.html` (self-contained, 게임 폰트·색 토큰 복사)

- [ ] **Step 1: 퀴즈 화면 3안** — PC(1280)+모바일(375) 캡처
  - A안 **대화창 이어가기**: 기존 `#chat-modal` 말풍선에 사공이 문제를 말하고, 보기 4개가 세로 버튼. 새 UI 거의 없음.
  - B안 **퀴즈 카드**: 상단 🦆 얼굴+"1/3", 가운데 문제, 2×2 보기 타일. 정답/오답 색 피드백.
  - C안 **나루터 팻말**: 나무 팻말 질감 카드, 보기는 밧줄에 매단 표찰. 분위기 최고·구현 최중.
- [ ] **Step 2: 사공 대사 후보(하오체)** — 시작·정답·오답(정답+힌트)·3/3·끝(0~2) 각 2~3개.
  예) 시작 "물때 기다리는 동안 문제 하나 내 보겠네." / 정답 "옳거니! 제법이구먼." / 오답 "허허, 아깝구먼. 답은 {답}일세 — {힌트}"
- [ ] **Step 3: 보상 안** — (a) 정답당 ⭐별조각 2 + 3/3 이면 🪱미끼 2(코인 없음, 사공=배 재화) / (b) 정답당 🪙5 + 3/3 이면 🪙10 / (c) (a)+주민 호감도 +1.
- [ ] **Step 4: 문제 목록 검수** — Task 2 뒤 `review.html` 로 **모든 가능한 문제**(문장·보기·힌트·영어)를 보낸다. 템플릿 추가·삭제도 여기서.
- [ ] **Step 5: 승인 기록** — `ferry-quiz-context.md`. 화면·대사·보상 승인 전 Task 3 이후 금지.

---

### Task 2: 문제 템플릿 모듈 `js/ferry-quiz.js`

**Files:** Create `js/ferry-quiz.js`, `tools/ferry-quiz/data-node.mjs`, `tools/ferry-quiz/review.mjs`, Test `tests/ferry-quiz.test.mjs`

**Interfaces — Produces:**
- `QuizData = { fruits:[{id,name,ico,growDays}], npcs:[{id,name,emoji}], recipes:[{id,name,ico,buff}], buffs:{[id]:{name,ico}}, riverPicks:[{id,name,ico,night?}], farmBuildings:[{id,name,ico,desc}], boatRunsPerDay:number, en:(ko)=>string }`
- `QUIZ_TEMPLATES: { id, make(data, rnd) → Question|null }[]`
- `Question = { qid, tpl, q:{ko,en}, choices:[{id,ko,en}]×4, answer:idx, hint:{ko,en} }`
- `buildDailyQuiz(seed, data, n = 3) → Question[]` · `quizAvailable(st, today) → bool` · `quizReward(correctN) → give`
- `nodeQuizData() → QuizData` (tools/ferry-quiz/data-node.mjs)

- [ ] **Step 1: Node 데이터 구성** — `tools/ferry-quiz/data-node.mjs`

```js
// 🦆 Node(테스트·검수)용 퀴즈 데이터 — 브라우저에선 game.js quizData() 가 같은 모양을 만든다.
//    catalog.js·places.js 는 three 를 끌고 와 import 불가 → 원문 파싱.
import { readFileSync } from 'node:fs';
import { NPCS } from '../../js/data/npcs.js';
import { FRUITS } from '../../js/orchard.js';
import { FARM_BUILDINGS } from '../../js/farm-building.js';
import { recipesFromSource } from '../free-pot/recipes-src.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockUntil = (t, start, end) => { const i = t.indexOf(start); return t.slice(i, t.indexOf(end, i)); };

export function nodeQuizData() {
  const EN = read('../../js/i18n-en.js'), CAT = read('../../js/data/catalog.js'), PL = read('../../js/data/places.js');
  const en = (ko) => (EN.match(new RegExp(`'${esc(ko)}':\\s*'((?:[^'\\\\]|\\\\.)+)'`)) || [])[1] ?? ko;
  const recipes = recipesFromSource().map(r => ({ ...r, ico: CAT.match(new RegExp(`id: '${r.id}'[^\\n]*ico: '([^']+)'`))[1],
    buff: CAT.match(new RegExp(`id: '${r.id}'[^\\n]*buff: '(\\w+)'`))[1] }));
  // ⚠️ 표 블록 안에서만 찾는다 — 파일 전체에 돌리면 COOK_MG 같은 다른 표가 섞이고(2026-09-29 실측) 두 칸 들여쓰기 키를 놓친다
  const buffs = {};
  for (const m of blockUntil(CAT, 'export const BUFF_META', '\n};').matchAll(/(\w+):\s+\{ ico: '([^']+)', name: '([^']+)'/g)) buffs[m[1]] = { ico: m[2], name: m[3] };
  const riverPicks = [...blockUntil(PL, 'export const RIVER_PICKS', '\n];').matchAll(/\{ id: '(\w+)',\s*name: '([^']+)',\s*ico: '([^']+)'.*$/gm)]
    .map(m => ({ id: m[1], name: m[2], ico: m[3], night: /night: true/.test(m[0]) }));
  const boatRunsPerDay = Number(PL.match(/BOAT_RUNS_PER_DAY = (\d+)/)[1]);
  return { fruits: FRUITS, npcs: NPCS.map(n => ({ id: n.id, name: n.name, emoji: n.emoji })), recipes,
    buffs,
    riverPicks, farmBuildings: FARM_BUILDINGS.filter(b => b.farm), boatRunsPerDay, en };
}
```

- [ ] **Step 2: 실패 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ_TEMPLATES, buildDailyQuiz, quizAvailable, quizReward } from '../js/ferry-quiz.js';
import { nodeQuizData } from '../tools/ferry-quiz/data-node.mjs';
import { FRUITS } from '../js/orchard.js';

const DATA = nodeQuizData();
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

test('nodeQuizData: 데이터가 비지 않는다', () => {
  assert.ok(DATA.recipes.length === 11 && DATA.recipes.every(r => r.buff && r.ico));
  assert.deepEqual(Object.keys(DATA.buffs), ['speed', 'luck', 'chop', 'mine']);
  assert.ok(DATA.riverPicks.length === 4 && DATA.riverPicks.filter(p => p.night).length === 1);
  assert.equal(DATA.boatRunsPerDay, 3);
});

test('모든 템플릿: 보기 4개·서로 다름·정답 하나·ko/en·qid 형식', () => {
  for (const t of QUIZ_TEMPLATES) {
    for (let s = 1; s <= 300; s++) {
      const q = t.make(DATA, mulberry(s)); if (!q) continue;
      assert.equal(q.tpl, t.id);
      assert.match(q.qid, new RegExp(`^${t.id}:[\\w-]+$`));
      assert.equal(q.choices.length, 4, q.qid);
      assert.equal(new Set(q.choices.map(c => c.id)).size, 4, `${q.qid}: 보기 id 중복`);
      assert.equal(new Set(q.choices.map(c => c.ko)).size, 4, `${q.qid}: 보기 문구 중복`);
      assert.ok(q.answer >= 0 && q.answer < 4);
      for (const x of [q.q, q.hint, ...q.choices]) {
        assert.ok(x.ko && x.en, `${q.qid}: ko/en`);
        assert.doesNotMatch(x.en, /[가-힣]/, `${q.qid}: 영어에 한글 — i18n 사전 누락 "${x.en}"`);
      }
    }
  }
});

test('정답이 게임 데이터와 일치한다', () => {
  for (let s = 1; s <= 100; s++) {
    for (const t of QUIZ_TEMPLATES) {
      const q = t.make(DATA, mulberry(s)); if (!q) continue;
      const ans = q.choices[q.answer].id, ent = q.qid.split(':')[1];
      if (t.id === 'fruit_days') assert.equal(ans, String(FRUITS.find(f => f.id === ent).growDays));
      if (t.id === 'recipe_buff') assert.equal(DATA.recipes.find(r => r.id === ans).buff, ent);
      if (t.id === 'npc_name') assert.equal(ans, ent);
      if (t.id === 'river_night') assert.ok(DATA.riverPicks.find(p => p.id === ans).night);
      if (t.id === 'boat_runs') assert.equal(ans, String(DATA.boatRunsPerDay));
      if (t.id === 'farm_building') assert.equal(ans, ent);
    }
  }
});

test('buildDailyQuiz: 같은 시드 같은 세트, 템플릿 중복 없음, 3문제, 60일에 20종 이상', () => {
  const a = buildDailyQuiz(20261001, DATA), b = buildDailyQuiz(20261001, DATA);
  assert.deepEqual(a.map(q => q.qid), b.map(q => q.qid));
  assert.deepEqual(a.map(q => q.choices.map(c => c.id)), b.map(q => q.choices.map(c => c.id)));
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map(q => q.tpl)).size, 3);
  const seen = new Set(); for (let s = 0; s < 60; s++) buildDailyQuiz(s * 97 + 1, DATA).forEach(q => seen.add(q.qid));
  assert.ok(seen.size >= 20, `60일 동안 서로 다른 문제 ${seen.size}개`);
});

test('quizAvailable: 하루 한 번', () => {
  assert.equal(quizAvailable({ date: '' }, '2026-10-01'), true);
  assert.equal(quizAvailable({ date: '2026-10-01', done: true }, '2026-10-01'), false);
  assert.equal(quizAvailable({ date: '2026-09-30', done: true }, '2026-10-01'), true);
});

test('quizReward: 0 은 빈 보상, 1~3 정의(승인안)', () => {
  assert.deepEqual(quizReward(0), {});
  for (const n of [1, 2, 3]) assert.ok(Object.keys(quizReward(n)).length > 0);
});
```

- [ ] **Step 3: 실패 확인** — `node --test tests/ferry-quiz.test.mjs` → FAIL(모듈 없음)
- [ ] **Step 4: 구현** — `js/ferry-quiz.js` (보상은 Task 1 승인안으로 교체)

```js
// =============================================================
//  🦆 사공 오리 퀴즈 — 게임 데이터에서 문제를 만든다(정답이 늘 게임과 일치)
//  ▶ 데이터는 인자로 받는다: catalog.js 는 three 를 끌고 와 Node 테스트에서 import 할 수 없다.
//  ▶ qid = '<tpl>:<entity>' — GA4 축. 표시 문자열은 트래킹에 싣지 않는다.
//  ▶ 날짜 시드 → 그날 모두 같은 세트·같은 보기 순서.
// =============================================================
function pickN(rnd, arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const one = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
function mkQuestion(rnd, tpl, entity, q, answer, wrongs, hint) {
  const choices = pickN(rnd, [answer, ...wrongs], 4);
  return { qid: `${tpl}:${entity}`, tpl, q, choices, answer: choices.findIndex(c => c.id === answer.id), hint };
}
const num = (n, unitKo, unitEn) => ({ id: String(n), ko: `${n}${unitKo}`, en: `${n} ${unitEn}` });
const item = (d) => (x) => ({ id: x.id, ko: `${x.ico} ${x.name}`, en: `${x.ico} ${d.en(x.name)}` });

export const QUIZ_TEMPLATES = [
  { id: 'fruit_days', make(d, rnd) {
    const f = one(rnd, d.fruits);
    return mkQuestion(rnd, 'fruit_days', f.id,
      { ko: `${f.ico} ${f.name} 나무는 심고 며칠이면 다 자라나?`, en: `How many days does a ${f.ico} ${d.en(f.name)} tree take to grow?` },
      num(f.growDays, '일', 'days'), pickN(rnd, [2, 3, 4, 5, 6, 7].filter(x => x !== f.growDays), 3).map(x => num(x, '일', 'days')),
      { ko: '과수원 묘목 설명에 적혀 있다네.', en: 'It says so on the orchard sapling card.' });
  } },
  { id: 'recipe_buff', make(d, rnd) {
    const buff = one(rnd, Object.keys(d.buffs));
    const right = d.recipes.filter(r => r.buff === buff), wrongPool = d.recipes.filter(r => r.buff !== buff);
    if (!right.length || wrongPool.length < 3) return null;
    const b = d.buffs[buff];
    return mkQuestion(rnd, 'recipe_buff', buff,
      { ko: `${b.ico} ${b.name} 버프를 주는 요리는?`, en: `Which dish gives the ${b.ico} ${d.en(b.name)} buff?` },
      item(d)(one(rnd, right)), pickN(rnd, wrongPool, 3).map(item(d)),
      { ko: '자유주방 메뉴판에 버프가 적혀 있지.', en: 'The kitchen menu lists each buff.' });
  } },
  { id: 'npc_name', make(d, rnd) {
    const n = one(rnd, d.npcs);
    const c = (x) => ({ id: x.id, ko: x.name, en: d.en(x.name) });
    return mkQuestion(rnd, 'npc_name', n.id,
      { ko: `${n.emoji} 이 이웃의 이름은 무엇이겠나?`, en: `What is this neighbor ${n.emoji} called?` },
      c(n), pickN(rnd, d.npcs.filter(x => x.id !== n.id), 3).map(c),
      { ko: '지도에서 이웃을 누르면 이름이 보인다네.', en: 'Tap a neighbor on the map to see their name.' });
  } },
  { id: 'river_night', make(d, rnd) {
    const night = d.riverPicks.filter(p => p.night), day = d.riverPicks.filter(p => !p.night);
    if (!night.length || day.length < 3) return null;
    const p = one(rnd, night);
    return mkQuestion(rnd, 'river_night', p.id,
      { ko: '강에서 밤에만 떠오르는 건 어느 것이겠나?', en: 'Which one only shows up on the river at night?' },
      item(d)(p), pickN(rnd, day, 3).map(item(d)),
      { ko: '밤에 나룻배를 타 보면 알 수 있구먼.', en: 'Take the boat out at night and you will see.' });
  } },
  { id: 'boat_runs', make(d, rnd) {
    const n = d.boatRunsPerDay;
    return mkQuestion(rnd, 'boat_runs', String(n),
      { ko: '나룻배는 하루에 몇 번 탈 수 있겠나?', en: 'How many boat rides can you take a day?' },
      num(n, '번', 'times'), pickN(rnd, [1, 2, 4, 5, 6].filter(x => x !== n), 3).map(x => num(x, '번', 'times')),
      { ko: '나루터에서 남은 횟수를 알려 준다네.', en: 'The dock shows how many rides are left.' });
  } },
  { id: 'farm_building', make(d, rnd) {
    const withDesc = d.farmBuildings.filter(b => b.desc);
    if (withDesc.length < 4) return null;
    const b = one(rnd, withDesc);
    return mkQuestion(rnd, 'farm_building', b.id,
      { ko: `"${b.desc}" — 이건 어느 시설 이야기겠나?`, en: `"${d.en(b.desc)}" — which building is this?` },
      item(d)(b), pickN(rnd, withDesc.filter(x => x.id !== b.id), 3).map(item(d)),
      { ko: '논밭 건설 메뉴에 설명이 있다네.', en: 'The farm build menu describes each one.' });
  } },
];

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function buildDailyQuiz(seed, data, n = 3) {
  const rnd = mulberry32(seed);
  const out = [];
  for (const t of pickN(rnd, QUIZ_TEMPLATES, QUIZ_TEMPLATES.length)) {
    if (out.length >= n) break;
    const q = t.make(data, rnd); if (q) out.push(q);
  }
  return out;
}

export const quizAvailable = (st, today) => !(st?.date === today && st.done);

// Task 1 승인안 — 초안 (a): 정답당 ⭐2, 3/3 이면 🪱미끼 2 추가(코인 없음)
export function quizReward(correctN) {
  if (!correctN) return {};
  return correctN >= 3 ? { star: 6, bait: 2 } : { star: correctN * 2 };
}
```

  영어 테스트가 실패하면(사전에 없는 이름·`farm_building` 설명) `js/i18n-en.js` 에 추가하거나 Task 1 검수에서 그 템플릿을 뺀다.

- [ ] **Step 5:** `tools/ferry-quiz/review.mjs` — 템플릿마다 시드 1..300 으로 **서로 다른 qid 전부**를 ko/en 표(문제·4보기·정답 굵게·힌트)로 `dev/active/ferry-quiz/review.html` 에 쓴다(`nodeQuizData()` 사용, HTML 이스케이프).
- [ ] **Step 6: 통과 확인** — `node --test tests/ferry-quiz.test.mjs` → PASS
- [ ] **Step 7: Commit** — `git add js/ferry-quiz.js tools/ferry-quiz/ tests/ferry-quiz.test.mjs && git commit -m "feat: 🦆 사공 퀴즈 문제 템플릿(게임 데이터에서 생성)"`
- [ ] **Step 8: ⏸️** review.html 을 사용자에게 보내 문제 목록 승인(Task 1 Step 4).

---

### Task 3: 상태·진행·트래킹

**Files:** Create `js/spaces/ferry-quiz-run.js`. Modify `js/game.js`(세이브 기본값 945 `talk` 옆, Input 브리지, `quizData()`), `js/spaces/npc.js`(`talkToNPC` 747). Test `tests/ferry-quiz.test.mjs`

**Interfaces — Produces:**
- `gameState.quiz = { date: '', done: false, correct: 0 }`
- `quizStart() → { ok, quizDate, questions:[{ q, choices:[text] }] }` (현재 언어로 풀어서)
- `quizAnswer(qNo, pickedIdx, ms) → { correct, answerIdx, hint, line }`
- `quizEnd({ quit }) → { correctN, reward, line }`

- [ ] **Step 1: 배선·트래킹 실패 테스트** (추가)

```js
import { gameSource } from './helpers/game-source.mjs';
const src = gameSource();
const body = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };
const call = (b, ev) => { const i = b.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, ev); return b.slice(i, b.indexOf('});', i)); };

test('세이브 기본값에 quiz', () => assert.match(src, /quiz: \{ date: '', done: false, correct: 0 \}/));
test('offer: 사공 창을 열 때 available·reason', () => {
  const c = call(body('talkToNPC'), 'ferry_quiz_offer');
  for (const p of ['quiz_date', 'available', 'reason']) assert.match(c, new RegExp(`${p}:`));
});
test('start·answer·end 가 같은 quiz_date 와 qid 축을 싣는다', () => {
  const s = call(body('quizStart'), 'ferry_quiz_start');
  for (const p of ['quiz_date', 'qids', 'tpls']) assert.match(s, new RegExp(`${p}:`));
  const a = call(body('quizAnswer'), 'ferry_quiz_answer');
  for (const p of ['quiz_date', 'q_no', 'qid', 'tpl', 'picked_id', 'answer_id', 'picked_idx', 'answer_idx', 'correct', 'ms']) assert.match(a, new RegExp(`${p}:`));
  const e = call(body('quizEnd'), 'ferry_quiz_end');
  for (const p of ['quiz_date', 'correct_n', 'total', 'reached', 'quit', 'ms_total', 'reward_id']) assert.match(e, new RegExp(`${p}:`));
});
test('시작하면 그날은 끝난 것으로 기록(닫아도 재시도 불가), 보상은 ferry_quiz 출처', () => {
  assert.match(body('quizStart'), /gameState\.quiz = \{ date: today, done: true, correct: 0 \}/);
  assert.match(body('quizEnd'), /giveReward\([^)]*'ferry_quiz', 'ferry_quiz:' \+ /);
});
test('트래킹에 표시 문자열(문제 문장·이름)을 싣지 않는다', () => {
  assert.doesNotMatch(call(body('quizAnswer'), 'ferry_quiz_answer'), /\.ko\b|\.en\b|q\.q\b/);
});
test('quizEnd 는 한 번만 정산된다', () => {
  assert.match(body('quizEnd'), /if \(!run\) return/);
});
```

- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: 구현** — `js/spaces/ferry-quiz-run.js`(spaces 규칙: game.js 와 순환 import, 함수 안에서만 읽기)

```js
// =============================================================
//  🦆 사공 퀴즈 진행 — 시작·답·끝, 보상·트래킹 (문제 생성은 js/ferry-quiz.js)
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import { dateHash, gameState, giveReward, quizData, requestSave, todayStr } from '../game.js';
import { trackEvent } from '../analytics.js';
import { LANG } from '../i18n.js';
import { buildDailyQuiz, quizAvailable, quizReward } from '../ferry-quiz.js';

let run = null;   // { quizDate, questions, t0, qT0, answers: [] }
const L = (x) => (LANG === 'en' ? x.en : x.ko);

export function quizStart() {
  const today = todayStr();
  if (!quizAvailable(gameState.quiz, today)) return { ok: false };
  const questions = buildDailyQuiz(dateHash('ferry-quiz'), quizData());
  gameState.quiz = { date: today, done: true, correct: 0 };   // 시작 = 오늘 끝(닫고 다시 열어 정답 캐기 방지)
  requestSave();
  run = { quizDate: today, questions, t0: performance.now(), answers: [] };
  trackEvent('ferry_quiz_start', { quiz_date: today, qids: questions.map(q => q.qid).join(','), tpls: questions.map(q => q.tpl).join(',') });
  return { ok: true, quizDate: today, questions: questions.map(q => ({ q: L(q.q), choices: q.choices.map(L) })) };
}

export function quizAnswer(qNo, pickedIdx, ms) {
  const q = run?.questions[qNo];
  if (!q || run.answers[qNo] != null) return null;   // 두 번 눌러도 한 번만
  const correct = pickedIdx === q.answer;
  run.answers[qNo] = correct;
  if (correct) gameState.quiz.correct++;
  trackEvent('ferry_quiz_answer', { quiz_date: run.quizDate, q_no: qNo, qid: q.qid, tpl: q.tpl,
    picked_id: q.choices[pickedIdx].id, answer_id: q.choices[q.answer].id, picked_idx: pickedIdx, answer_idx: q.answer,
    correct: correct ? 1 : 0, ms: Math.round(ms) });
  return { correct, answerIdx: q.answer, hint: L(q.hint) /* 대사는 Task 1 승인안 표에서 */ };
}

export function quizEnd({ quit = false } = {}) {
  if (!run) return null;                               // 한 번만 정산
  const r0 = run; run = null;
  const correctN = r0.answers.filter(Boolean).length;
  const reward = quizReward(correctN);
  if (Object.keys(reward).length) giveReward(reward, 'ferry_quiz', 'ferry_quiz:' + correctN);
  requestSave();
  trackEvent('ferry_quiz_end', { quiz_date: r0.quizDate, correct_n: correctN, total: r0.questions.length,
    reached: r0.answers.filter(a => a != null).length, quit: quit ? 1 : 0,
    ms_total: Math.round(performance.now() - r0.t0), reward_id: Object.keys(reward).join('+') || 'none' });
  return { correctN, reward };
}
```

  - `talkToNPC`(npc.js): 사공이면 `const av = quizAvailable(gameState.quiz, todayStr());` 뷰에 `quiz: { available: av }`, `trackEvent('ferry_quiz_offer', { quiz_date: todayStr(), available: av ? 1 : 0, reason: av ? 'ok' : 'done' })`.
  - game.js: 세이브 기본값 `quiz: { date: '', done: false, correct: 0 }`, `export function quizData()`(실데이터 `FRUITS`·`NPCS`·`RECIPES`·`BUFF_META`·`RIVER_PICKS`·`FARM_BUILDINGS`·`BOAT_RUNS_PER_DAY`·`en: ko => EN[ko] ?? ko` — 사전 객체는 i18n 모듈의 기존 export 를 쓴다), Input 에 `quizStart/quizAnswer/quizEnd` 연결. `dateHash`·`quizData` 가 game.js 에서 export 되는지 확인해 없으면 추가.
  - `tests/save-migrate.test.mjs` 가 옛 세이브에 기본값을 채우는 방식 확인(다르면 그 규칙대로).
- [ ] **Step 4:** `npm test` 전체 PASS, `.mjs` 복사 문법 검사
- [ ] **Step 5: Commit** — `git commit -m "feat: 🦆 사공 퀴즈 상태·진행·생명주기 트래킹"`

---

### Task 4: 퀴즈 화면(승인안) · 검증 · ⏸️ 최종 확인

**Files:** Modify `index.html`(`openNPCModal` 2835 에 🦆 버튼, 퀴즈 화면), `js/i18n-en.js`

- [ ] **Step 1:** Task 1 승인안대로. A안이면 `#chat-modal` 의 `talkSay/talkClear/renderTalkTurn` 흐름 재사용, B/C안이면 새 카드. 사공 대사·문구는 승인 후보만. 보기 버튼 중복 입력 무시. **닫는 모든 길**이 `quizEnd({ quit: true })` 를 거친다(결과 화면 닫기 포함 — 요리 결과 카드 함정과 같은 규칙).
- [ ] **Step 2: 브라우저 검증** — 사공 말 걸기 → 🦆 퀴즈 → 3문제 → 결과·보상. 같은 날 다시 → 버튼 비활성·안내. 도중 닫기 → 맞힌 만큼 보상. `?lang=en`. 모바일 375 긴 보기 줄바꿈. 콘솔 에러 0.
- [ ] **Step 3: 트래킹 실측** — trackEvent 가로채기로 offer→start→answer×3→end, 도중 닫기(`quit=1, reached<3`) 둘 다 로그를 context 에 붙인다.
- [ ] **Step 4: ⏸️ 실제 게임 캡처(PC·모바일)를 사용자에게 보내 최종 확인.**
- [ ] **Step 5:** code-reviewer 에이전트 → CRITICAL/HIGH 수정 → `npm test`
- [ ] **Step 6: Commit** — `git commit -m "feat: 🦆 사공 퀴즈 화면·대사"`
- [ ] **Step 7 (배포 다음 날):** BQ — `quiz_date` 로 start·answer·end 조인, `qid` 별 정답률, `picked_id` 오답 분포. 보상이 코인이면 `econ_logs` `source='ferry_quiz'`.
- 배포는 사용자 결정(웹·토스 메모·itch·Play 4곳, 공지는 토스 출시 후).
