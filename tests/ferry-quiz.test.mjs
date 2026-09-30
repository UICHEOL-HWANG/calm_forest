import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARM_PLAIN, QUIZ_TEMPLATES, buildDailyQuiz, quizAvailable, quizReward } from '../js/ferry-quiz.js';
import { nodeQuizData } from '../tools/ferry-quiz/data-node.mjs';
import { FRUITS } from '../js/orchard.js';

// 🦆 사공 오리 퀴즈 — 문제는 게임 데이터 템플릿에서(정답이 늘 게임 수치와 일치). 계획: dev/active/ferry-quiz
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
      if (t.id === 'npc_quest') assert.equal(ans, ent.split('-')[0]);   // 부탁한 이웃
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

// 승인안 (b) 코인 — 정답당 🪙8 · 3/3 이면 🪙15 더(하루 최대 39). 사용자 "보상은 B 최대안"(2026-09-30)
test('quizReward: 0 은 빈 보상, 정답당 코인 8, 3/3 은 15 더', () => {
  assert.deepEqual(quizReward(0), {});
  assert.deepEqual(quizReward(1), { coins: 8 });
  assert.deepEqual(quizReward(2), { coins: 16 });
  assert.deepEqual(quizReward(3), { coins: 39 });
});

// 검수 반영(2026-09-30 "추천대로 고치고 진행해"):
//  · 주민 이름 → 이모지만 봐도 답이 보여(🐼→요리사 판다) 쉬웠다 → 퀘스트 제목으로 묻고 보기는 이름만
//  · 밭 시설 → 게임 수치 문장("반경 5 · 물주기 −40%")을 그대로 인용해 딱딱했다 → 쉬운 말 질문
test('npc_quest: 보기에 이모지가 없고, 제목이 여러 이웃에 겹치는 퀘스트는 내지 않는다', () => {
  assert.ok(!QUIZ_TEMPLATES.some(t => t.id === 'npc_name'));
  const seen = new Set();
  for (let s = 1; s <= 300; s++) {
    const q = QUIZ_TEMPLATES.find(t => t.id === 'npc_quest').make(DATA, mulberry(s));
    seen.add(q.qid);
    for (const c of q.choices) assert.doesNotMatch(c.ko, /\p{Extended_Pictographic}/u, `${q.qid}: 보기에 이모지 "${c.ko}"`);
  }
  assert.ok(seen.size >= 15, `퀘스트 문제 ${seen.size}종`);
});
test('farm_building: 시설마다 쉬운 말 질문이 있고 게임 수치 문장을 인용하지 않는다', () => {
  for (const b of DATA.farmBuildings) assert.ok(FARM_PLAIN[b.id], `${b.id}: 쉬운 말 질문 없음 — 새 시설이면 FARM_PLAIN 에 추가`);
  for (let s = 1; s <= 100; s++) {
    const q = QUIZ_TEMPLATES.find(t => t.id === 'farm_building').make(DATA, mulberry(s));
    assert.doesNotMatch(q.q.ko, /반경|%|·/, q.qid);
  }
});

// ── Task 3: 상태·진행·트래킹 (js/spaces/ferry-quiz-run.js) ──
import { gameSource } from './helpers/game-source.mjs';
import { QUIZ_LINES, quizLine } from '../js/ferry-quiz.js';
const src = gameSource();
const body = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };
const call = (b, ev) => { const i = b.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, ev); return b.slice(i, b.indexOf('});', i)); };

test('세이브 기본값에 quiz, 복원은 오늘 것만(어제 done 이 오늘을 막지 않게)', () => {
  assert.match(src, /quiz: \{ date: '', done: false, correct: 0 \}/);
  assert.match(body('applySave'), /saved\.quiz[\s\S]{0,200}todayStr\(\)/);
});
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
  for (const p of ['quiz_date', 'correct_n', 'total', 'reached', 'quit', 'ms_total', 'reward_id', 'coins']) assert.match(e, new RegExp(`${p}:`));
});
test('시작하면 그날은 끝난 것으로 기록(닫아도 재시도 불가), 보상은 ferry_quiz 출처', () => {
  assert.match(body('quizStart'), /gameState\.quiz = \{ date: today, done: true, correct: 0 \}/);
  // 리뷰(2026-09-30): quizEnd 에서만 주면 결과 화면 전에 앱이 꺼질 때(모바일 백그라운드) 맞힌 보상이 사라진다
  //   → 맞힐 때마다 바로 지급, 3/3 보너스는 마지막 정답에서. quizEnd 는 트래킹·대사만.
  assert.match(body('quizAnswer'), /giveReward\([^)]*'ferry_quiz', 'ferry_quiz:' \+ /);
  assert.doesNotMatch(body('quizEnd'), /giveReward\(/);
  assert.match(body('quizStart'), /if \(run\) quizEnd\(\{ quit: true \}\)/);   // 남은 판은 먼저 정산
});
test('npc_quest qid 는 퀘스트 순서가 바뀌어도 그대로(제목 해시)', () => {
  const q = QUIZ_TEMPLATES.find(t => t.id === 'npc_quest').make(DATA, mulberry(3));
  assert.match(q.qid, /^npc_quest:[a-z]+-[0-9a-z]{4,}$/);
});
test('트래킹에 표시 문자열(문제 문장·이름)을 싣지 않는다', () => {
  assert.doesNotMatch(call(body('quizAnswer'), 'ferry_quiz_answer'), /\.ko\b|\.en\b|q\.q\b/);
});
test('quizEnd 는 한 번만 정산된다', () => {
  assert.match(body('quizEnd'), /if \(!run\) return/);
});
test('사공 대사(승인안): 자리마다 ko/en, 오답은 답·힌트 자리, 날마다 같은 줄', () => {
  for (const k of ['start', 'right', 'wrong', 'perfect', 'endSome', 'endZero', 'done']) {
    assert.ok(QUIZ_LINES[k]?.length, k);
    for (const l of QUIZ_LINES[k]) assert.ok(l.ko && l.en && !/[가-힣]/.test(l.en), `${k}: ${l.ko}`);
  }
  for (const l of QUIZ_LINES.wrong) assert.ok(l.ko.includes('{a}') && l.ko.includes('{h}') && l.en.includes('{a}') && l.en.includes('{h}'));
  assert.equal(quizLine('right', 7, 'ko'), quizLine('right', 7, 'ko'));
  assert.match(quizLine('wrong', 1, 'ko', { a: '4일', h: '힌트' }), /4일[\s\S]*힌트/);
});
