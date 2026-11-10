import { decorOf, habitatDone, recommendDecor } from '../world/tree-board.js';

export const STORY_GUIDE_RULES = Object.freeze(['branchWater', 'tasteGated']);

const ICO = { wood: '🪵', stone: '🪨', coal: '⚫', crop: '🥕', fish: '🐟', forage: '🍄', flour: '🌾', egg: '🥚', coins: '🪙' };
const FROM = { wood: '나무에서', stone: '동굴에서', coal: '동굴에서', crop: '텃밭에서', fish: '호수에서', forage: '숲에서', flour: '방앗간에서', egg: '닭장에서', coins: '팔아서' };
const BRANCH = { water: ['💧', '물의 가지'], farm: ['🌾', '밭의 가지'], kitchen: ['🍳', '부엌의 가지'] };
const TASTE_BRANCHES = ['farm', 'kitchen'];

export function shortfall(cost, inv) {
  return Object.entries(cost || {})
    .map(([k, need]) => ({ k, need, have: inv?.[k] || 0 }))
    .filter(r => r.have < r.need)
    .map(r => ({ ...r, more: r.need - r.have }));
}

export const shortParts = (list) => (list || []).map(r => ({ ico: ICO[r.k] || r.k, more: r.more }));
export const shortFrom = (list) => (list?.length ? FROM[list[0].k] || '' : '');

const titled = (st) => ({ ...st, title: st.name ? `${st.ico} ${st.name} ${st.verb}` : `${st.ico} ${st.verb}` });

export function shortText(list) {
  if (!list?.length) return '';
  const parts = list.map(r => `${ICO[r.k] || r.k} ${r.more}개`).join(' · ');
  const from = FROM[list[0].k];
  return `${parts} 더 필요${from ? ` · ${from}` : ''}`;
}

function branchStep(s, id) {
  const base = { rule: s.rule, branch: id };
  if (!s.boardOpen) return titled({ ...base, key: `${id}_tree`, where: 'worldTree', ico: '🌳', label: '세계수', name: '', verb: '세계수 살펴보기', doNow: '세계수 판을 열어요', short: null, shortList: [] });
  if (s.boardTab !== id) return titled({ ...base, key: `${id}_tab`, where: 'board', target: 'tab', tab: id, ico: BRANCH[id][0], name: BRANCH[id][1], verb: '고르기', doNow: '위쪽 탭을 눌러요', short: null, shortList: [] });
  const rec = recommendDecor(s.tree, id)[0];
  if (!rec) return titled({ ...base, key: `${id}_clear`, where: 'board', target: 'tiles', ico: '↩️', name: '', verb: '빈터 칸 비우기', doNow: '놓인 칸을 눌러 빼요. 재료는 돌아와요', short: null, shortList: [] });
  const d = decorOf(rec.id);
  const lack = shortfall(d.cost, s.inv);
  return titled({
    ...base, key: `${id}_place`, where: 'board', target: 'deco', deco: d.id, ico: d.ico, name: d.name, verb: '놓기',
    doNow: lack.length ? '재료를 모아 와요' : '눌러서 빈 칸에 놓아요', n: lack.length ? 0 : rec.n,
    short: lack.length ? shortText(lack) : null, shortList: lack,
  });
}

function cafeStep(s) {
  const base = { rule: s.rule };
  if (!s.atCafe) return titled({ ...base, key: 'cafe_door', where: 'cafeDoor', ico: '☕', label: '카페', name: '', verb: '카페 가기', doNow: '손님에게 요리를 내줘요', short: null, shortList: [] });
  const open = (s.orders || []).filter(o => !o.done).map(o => ({ o, lack: shortfall(o.recipe.cost, s.inv) }));
  if (!open.length) return null;
  const more = (x) => x.lack.reduce((n, r) => n + r.more, 0);
  const ready = open.find(x => !x.lack.length);
  const pick = ready || open.reduce((a, b) => (more(b) < more(a) ? b : a));
  const r = pick.o.recipe;
  return titled({
    ...base, key: ready ? 'cafe_guest' : 'cafe_short', where: 'cafeGuest', guest: pick.o.i,
    ico: r.ico, label: r.name, name: r.name, verb: '만들기',
    doNow: ready ? '손님 앞에서 눌러 요리해요' : '재료를 모아 와요',
    short: ready ? null : shortText(pick.lack), shortList: pick.lack,
  });
}

export function storyStep(s) {
  if (!s || !STORY_GUIDE_RULES.includes(s.rule)) return null;
  if (s.rule === 'branchWater') return habitatDone(s.tree, 'water') ? null : branchStep(s, 'water');
  const todo = TASTE_BRANCHES.find(id => !habitatDone(s.tree, id));
  if (todo) return branchStep(s, todo);
  if ((s.cooked || 0) >= 1 && (s.served || 0) >= 1) return null;
  return cafeStep(s);
}
