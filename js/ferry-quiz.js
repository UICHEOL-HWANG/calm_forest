// =============================================================
//  🦆 사공 오리 퀴즈 — 게임 데이터에서 문제를 만든다(정답이 늘 게임과 일치)
//  ------------------------------------------------------------
//  ▶ 데이터는 인자로 받는다: catalog.js 는 three 를 끌고 와 Node 테스트에서 import 할 수 없다.
//    (브라우저: game.js quizData() · Node: tools/ferry-quiz/data-node.mjs 가 같은 모양을 만든다)
//  ▶ qid = '<tpl>:<entity>' — GA4 축. 표시 문자열은 트래킹에 싣지 않는다.
//  ▶ 날짜 시드 → 그날 모두 같은 세트·같은 보기 순서.
//  ▶ 승인(2026-09-30): 화면 C 나루터 팻말 · 보상 (b) 코인. 계획: dev/active/ferry-quiz
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

// 밭 시설을 쉬운 말로 — 새 시설을 만들면 여기도 한 줄(테스트가 빠진 걸 잡는다)
export const FARM_PLAIN = {
  board:     { ko: '일꾼을 고용하는 곳은 어디겠나?', en: 'Where do you hire farm workers?' },
  warehouse: { ko: '일꾼이 거둔 작물을 모아 두는 곳은 어디겠나?', en: 'Where are the crops your workers harvest kept?' },
  trellis:   { ko: '옆 밭에 포도를 심을 수 있게 해 주는 건 무엇이겠나?', en: 'Which one lets you plant grapes in the next plot?' },
  well:      { ko: '근처 밭의 흙을 오래 촉촉하게 해 주는 건 무엇이겠나?', en: 'Which one keeps nearby soil moist for longer?' },
  compost:   { ko: '뽑은 잡초로 비료를 만들어 주는 건 무엇이겠나?', en: 'Which one turns pulled weeds into fertilizer?' },
  shelter:   { ko: '일꾼이 쉬면서 기운을 되찾는 곳은 어디겠나?', en: 'Where do workers rest and get their energy back?' },
  beehive:   { ko: '근처 작물을 잘 자라게 하고 꿀도 주는 건 무엇이겠나?', en: 'Which one helps nearby crops grow and gives honey?' },
};

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
  // 🦉 주민 — 이모지로 물으면 이름에 동물이 들어 있어 답이 보였다(🐼→요리사 판다, 검수 2026-09-30).
  //    퀘스트 제목으로 묻고 보기는 이름만. 여러 이웃이 같은 제목을 쓰면 답이 둘이라 뺀다.
  { id: 'npc_quest', make(d, rnd) {
    const count = new Map();
    d.npcs.forEach(n => (n.quests || []).forEach(t => count.set(t, (count.get(t) || 0) + 1)));
    const pool = d.npcs.flatMap(n => (n.quests || []).map((t, i) => ({ n, t, i }))).filter(x => count.get(x.t) === 1);
    if (!pool.length || d.npcs.length < 4) return null;
    const x = one(rnd, pool);
    const c = (n) => ({ id: n.id, ko: n.name, en: d.en(n.name) });
    return mkQuestion(rnd, 'npc_quest', `${x.n.id}-${x.i}`,
      { ko: `'${x.t}' 부탁을 하는 이웃은 누구겠나?`, en: `Who asks you for "${d.en(x.t)}"?` },
      c(x.n), pickN(rnd, d.npcs.filter(o => o.id !== x.n.id), 3).map(c),
      { ko: '이웃에게 말을 걸면 부탁을 들을 수 있다네.', en: 'Talk to your neighbors to hear their requests.' });
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
  // 🐝 밭 시설 — 게임 설명("반경 5 · 물주기 −40%")을 그대로 인용하면 딱딱했다(검수 2026-09-30) → 쉬운 말 질문
  { id: 'farm_building', make(d, rnd) {
    const known = d.farmBuildings.filter(b => FARM_PLAIN[b.id]);
    if (known.length < 4) return null;
    const b = one(rnd, known);
    return mkQuestion(rnd, 'farm_building', b.id, FARM_PLAIN[b.id],
      item(d)(b), pickN(rnd, known.filter(x => x.id !== b.id), 3).map(item(d)),
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

// 승인안 (b) 코인 — 정답당 🪙8 · 3/3 이면 🪙15 더(하루 최대 39). 사용자 "보상은 B 최대안"(2026-09-30)
export const QUIZ_COIN_PER = 8, QUIZ_COIN_PERFECT = 15;
export function quizReward(correctN) {
  if (!correctN) return {};
  return { coins: correctN * QUIZ_COIN_PER + (correctN >= 3 ? QUIZ_COIN_PERFECT : 0) };
}
