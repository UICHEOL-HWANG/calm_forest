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

// 승인안 (b) 코인 — 정답당 🪙8 · 3/3 이면 🪙15 더(하루 최대 39). 사용자 "보상은 B 최대안"(2026-09-30)
export const QUIZ_COIN_PER = 8, QUIZ_COIN_PERFECT = 15;
export function quizReward(correctN) {
  if (!correctN) return {};
  return { coins: correctN * QUIZ_COIN_PER + (correctN >= 3 ? QUIZ_COIN_PERFECT : 0) };
}
