// =============================================================
//  🦆 사공 퀴즈 진행 — 시작·답·끝, 보상·트래킹 (문제 생성은 js/ferry-quiz.js)
//  ------------------------------------------------------------
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//  ▶ 시작하는 순간 그날은 끝(닫고 다시 열어 정답 캐기 방지). 보상은 맞힐 때마다 바로(quizAnswer).
//  ▶ 트래킹엔 qid·엔티티 id 만(표시 문자열 금지 — i18n·리네임에 깨진다). 계획: dev/active/ferry-quiz
// =============================================================
import { dateHash, gameState, giveReward, requestSave, todayStr } from '../game.js';   // 🔁 순환 import — 함수 안에서만
import { trackEvent } from '../analytics.js';
import { LANG, t } from '../i18n.js';
import { QUIZ_COIN_PER, QUIZ_COIN_PERFECT, buildDailyQuiz, quizAvailable, quizLine } from '../ferry-quiz.js';
import { NPCS } from '../data/npcs.js';
import { BUFF_META, RECIPES } from '../data/catalog.js';
import { BOAT_RUNS_PER_DAY, RIVER_PICKS } from '../data/places.js';
import { FRUITS } from '../orchard.js';
import { FARM_BUILDINGS } from '../farm-building.js';

let run = null;   // { quizDate, questions, t0, answers: [] }
const L = (x) => (LANG === 'en' ? x.en : x.ko);
const lineSeed = (k) => dateHash('ferry-quiz-line') + k;

// 브라우저 쪽 문제 데이터 — Node 는 tools/ferry-quiz/data-node.mjs 가 같은 모양을 만든다(같은 시드 → 같은 세트)
export function quizData() {
  return {
    fruits: FRUITS,
    npcs: NPCS.map(n => ({ id: n.id, name: n.name, emoji: n.emoji, quests: n.quests.map(q => q.title) })),
    recipes: RECIPES.map(r => ({ id: r.id, name: r.name, ico: r.ico, buff: r.buff })),
    buffs: BUFF_META,
    riverPicks: RIVER_PICKS.map(p => ({ id: p.id, name: p.name, ico: p.ico, night: !!p.night })),
    farmBuildings: FARM_BUILDINGS.filter(b => b.farm),
    boatRunsPerDay: BOAT_RUNS_PER_DAY,
    en: (ko) => t(ko),
  };
}

// 사공 창을 열 때 — 오늘 풀 수 있는지 + 이미 풀었으면 사공 한마디
export function quizOffer() {
  const available = quizAvailable(gameState.quiz, todayStr());
  return { available, line: available ? '' : quizLine('done', lineSeed(0), LANG) };
}

export function quizStart() {
  const today = todayStr();
  if (run) quizEnd({ quit: true });                          // 남은 판은 먼저 정산(끊긴 UI)
  if (!quizAvailable(gameState.quiz, today)) return { ok: false };
  const questions = buildDailyQuiz(dateHash('ferry-quiz'), quizData());
  if (!questions.length) return { ok: false };
  gameState.quiz = { date: today, done: true, correct: 0 };   // 시작 = 오늘 끝(닫고 다시 열어 정답 캐기 방지)
  requestSave();
  run = { quizDate: today, questions, t0: performance.now(), answers: [], coins: 0 };
  trackEvent('ferry_quiz_start', { quiz_date: today, qids: questions.map(q => q.qid).join(','), tpls: questions.map(q => q.tpl).join(',') });   // [GA4] 시작
  return { ok: true, quizDate: today, line: quizLine('start', lineSeed(0), LANG),
    questions: questions.map(q => ({ q: L(q.q), choices: q.choices.map(L) })) };
}

export function quizAnswer(qNo, pickedIdx, ms) {
  const q = run?.questions[qNo];
  if (!q || run.answers[qNo] != null || !(pickedIdx >= 0 && pickedIdx < q.choices.length)) return null;   // 두 번 눌러도 한 번만
  const correct = pickedIdx === q.answer;
  run.answers[qNo] = correct;
  // 🪙 맞힐 때마다 바로 지급 — 결과 화면 전에 앱이 꺼져도(모바일 백그라운드) 맞힌 몫은 남는다(리뷰 2026-09-30).
  //    3/3 보너스는 마지막 정답에서. 합은 quizReward(맞힌 수)와 같다.
  if (correct) {
    gameState.quiz.correct++;
    const perfect = run.answers.length === run.questions.length && run.answers.every(Boolean);
    const coins = QUIZ_COIN_PER + (perfect ? QUIZ_COIN_PERFECT : 0);
    giveReward({ coins }, 'ferry_quiz', 'ferry_quiz:' + (perfect ? 'perfect' : 'q' + qNo));   // [원장] econ_logs source='ferry_quiz'
    run.coins += coins;
    requestSave();
  }
  trackEvent('ferry_quiz_answer', { quiz_date: run.quizDate, q_no: qNo, qid: q.qid, tpl: q.tpl,
    picked_id: q.choices[pickedIdx].id, answer_id: q.choices[q.answer].id, picked_idx: pickedIdx, answer_idx: q.answer,
    correct: correct ? 1 : 0, ms: Math.round(ms) });   // [GA4] 문제마다 — qid 별 정답률·헷갈리는 오답(picked_id)
  const line = correct ? quizLine('right', lineSeed(qNo + 1), LANG)
    : quizLine('wrong', lineSeed(qNo + 1), LANG, { a: L(q.choices[q.answer]), h: L(q.hint) });
  return { correct, answerIdx: q.answer, line, last: qNo >= run.questions.length - 1 };
}

// 끝 — 결과 화면을 닫는 모든 길·도중 닫기가 여기를 지난다(한 번만). 트래킹·끝 대사만(보상은 답마다 이미 줬다)
export function quizEnd({ quit = false } = {}) {
  if (!run) return null;
  const r0 = run; run = null;
  const correctN = r0.answers.filter(Boolean).length, total = r0.questions.length;
  const reward = r0.coins ? { coins: r0.coins } : {};        // 이미 답마다 지급했다 — 여기선 합만 보고한다
  trackEvent('ferry_quiz_end', { quiz_date: r0.quizDate, correct_n: correctN, total,
    reached: r0.answers.filter(a => a != null).length, quit: quit ? 1 : 0,
    ms_total: Math.round(performance.now() - r0.t0), reward_id: reward.coins ? 'coins' : 'none', coins: reward.coins || 0 });   // [GA4] 끝
  const line = correctN >= total ? quizLine('perfect', lineSeed(9), LANG)
    : correctN ? quizLine('endSome', lineSeed(9), LANG, { n: correctN }) : quizLine('endZero', lineSeed(9), LANG);
  return { correctN, total, reward, line };
}
