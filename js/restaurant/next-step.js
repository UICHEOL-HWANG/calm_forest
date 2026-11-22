import { panState, cookState, chopDone, fryState, fryBubble } from './rules.js';
import { HALL, MENU, FRY, BATTER_TAPS, FRY_OF } from './data.js';

export const RECIPE = {
  grilled: ['🐟', '🍳', '🍽️', '🙋'],
  riceball: ['🍚', '🔪', '🍽️', '🙋'],
  soup: ['🐟', '🔪', '🍲', '🍽️', '🙋'],
  shrimpfry: ['🦐', '🥣', '🔥', '🍤', '🍽️', '🙋'],
  squidfry: ['🦑', '🥣', '🔥', '🍤', '🍽️', '🙋'],
  vegfry: ['🥬', '🥣', '🔥', '🍤', '🍽️', '🙋'],
};

export const NEXT_TEXT = {
  crate_fish: '🐟 상자에서 생선을 꺼내요',
  crate_rice: '🍚 상자에서 쌀을 꺼내요',
  crate_shrimp: '🦐 상자에서 새우를 꺼내요',
  crate_squid: '🦑 상자에서 오징어를 꺼내요',
  crate_veg: '🥬 상자에서 채소를 꺼내요',
  panPut: '🍳 팬에 올려요',
  panFlip: '🍳 막대가 초록 칸일 때 뒤집어요',
  panWait: '🍳 다 익으면 꺼내요',
  panTake: '🍳 다 익었어요, 꺼내요',
  panBusy: '🍳 팬이 비면 올려요',
  burnt: '💨 탔어요, 꺼내서 버려요',
  boardPut: '🔪 도마에 올려요',
  boardBusy: '🔪 도마가 비면 올려요',
  boardChop: '🔪 박자에 맞춰 네 번 눌러요',
  boardPick: '🔪 다 썬 걸 들어요',
  potPut: '🍲 냄비에 넣어요',
  potBusy: '🍲 냄비가 비면 넣어요',
  potWait: '🍲 다 끓으면 꺼내요',
  potTake: '🍲 다 끓었어요, 꺼내요',
  bowlPut: '🥣 반죽 그릇에 올려요',
  bowlBusy: '🥣 반죽 그릇이 비면 올려요',
  bowlTap: '🥣 박자에 맞춰 두 번 눌러요',
  bowlPick: '🥣 반죽 묻힌 걸 들어요',
  fryerPut: '🍤 튀김기에 넣어요',
  fryerBusy: '🍤 튀김기가 비면 넣어요',
  fryHeat: '🔥 바늘이 초록 칸일 때 눌러요',
  fryShake: '🫧 거품이 오르면 눌러서 흔들어요',
  fryWait: '🍤 금빛이 되면 꺼내요',
  fryTake: '🍤 금빛이에요, 꺼내요',
  plates: '🍽️ 접시에 담아요',
  passPick: '🍽️ 배식대에서 들어요',
  trash: '🗑️ 쓰레기통에 버려요',
  serve: n => `🙋 ${n}번 손님에게 가져다줘요`,
};

const T = NEXT_TEXT;
const USES = { fish: ['grilled', 'soup'], fishChop: ['soup'], rice: ['riceball'], ...Object.fromEntries(Object.entries(FRY_OF).flatMap(([raw, dish]) => [[raw, [dish]], [`${raw}Bat`, [dish]]])) };
const panOn = (S, id) => id === 'pan0' || S.star >= 3;
const PANS = ['pan0', 'pan1'];
const FRYERS = ['fryer0', 'fryer1'];
const fryerOn = (S, id) => S.star >= HALL.stations.find(s => s.id === id).need;
const batOf = menu => `${MENU[menu].from}Bat`;
const last = menu => RECIPE[menu].length - 1;

function focusTicket(S) {
  const h = S.held, tks = S.tickets;
  if (h && h.kind in RECIPE) return tks.find(t => t.menu === h.kind) ?? null;
  if (h && USES[h.kind]) return tks.find(t => USES[h.kind].includes(t.menu)) ?? null;
  return tks[0] ?? null;
}

function heldStep(S, tk, h) {
  if (h.kind in RECIPE) return h.plated ? { i: last(tk.menu), at: 'table', text: T.serve(tk.table + 1) } : { i: last(tk.menu) - 1, at: 'plates', text: T.plates };
  if (h.kind === 'fish' && tk.menu === 'grilled') {
    const free = PANS.find(id => panOn(S, id) && !S.stations[id].item);
    return free ? { i: 1, at: free, text: T.panPut } : { i: 1, at: 'pan0', text: T.panBusy };
  }
  if (h.kind in FRY_OF) return { i: 1, at: 'bowl', text: S.stations.bowl.item ? T.bowlBusy : T.bowlPut };
  if (h.kind === batOf(tk.menu)) {
    const free = FRYERS.find(id => fryerOn(S, id) && !S.stations[id].item);
    return free ? { i: 2, at: free, text: T.fryerPut } : { i: 2, at: 'fryer0', text: T.fryerBusy };
  }
  if (h.kind === 'fishChop') return { i: 2, at: 'pot', text: S.stations.pot.item ? T.potBusy : T.potPut };
  return { i: 1, at: 'board', text: S.stations.board.item ? T.boardBusy : T.boardPut };
}

function readyStep(S) {
  for (const id of PANS) {
    const st = S.stations[id];
    if (!panOn(S, id) || !st.item) continue;
    const ps = panState(st.t);
    if (ps !== 'raw') return { menu: 'grilled', i: 1, at: id, text: ps === 'burnt' ? T.burnt : T.panTake };
  }
  const pot = S.stations.pot;
  const cs = S.star >= 2 && pot?.item ? cookState('pot', pot.t, S.dda.win) : 'raw';
  if (cs !== 'raw') return { menu: 'soup', i: 2, at: 'pot', text: cs === 'burnt' ? T.burnt : T.potTake };
  for (const id of FRYERS) {
    const st = S.stations[id];
    if (!fryerOn(S, id) || !st.item || st.phase !== 'fry') continue;
    const fs = fryState(st.t, S.dda.win);
    if (fs !== 'raw') return { menu: FRY_OF[st.item.kind.slice(0, -3)], i: 3, at: id, text: fs === 'burnt' ? T.burnt : T.fryTake };
  }
  return null;
}

function workStep(S, tk) {
  const pass = S.stations.pass?.item;
  if (pass && pass.kind === tk.menu) return { i: last(tk.menu), at: 'pass', text: T.passPick };
  if (tk.menu === 'grilled') {
    const id = PANS.find(p => panOn(S, p) && S.stations[p].item);
    if (id) return { i: 1, at: id, text: S.stations[id].flipped === null ? T.panFlip : T.panWait };
  }
  if (MENU[tk.menu].fry) return fryWork(S, tk);
  const board = S.stations.board?.item;
  const wants = tk.menu === 'riceball' ? ['rice', 'riceball'] : tk.menu === 'soup' ? ['fish', 'fishChop'] : [];
  if (board && wants.includes(board.kind)) {
    const done = board.kind === wants[1] || chopDone(S.stations.board.chop);
    return { i: 1, at: 'board', text: done ? T.boardPick : T.boardChop };
  }
  if (tk.menu === 'soup' && S.stations.pot?.item) return { i: 2, at: 'pot', text: T.potWait };
  const crate = `crate_${MENU[tk.menu].from}`;
  return { i: 0, at: crate, text: T[crate] };
}

function fryerStep(st) {
  if (st.phase === 'heat') return { rank: 0, i: 2, text: T.fryHeat };
  if (st.t >= FRY.cook) return { rank: 1, i: 3, text: T.fryTake };
  const open = fryBubble(st.t);
  if (open >= 0 && !st.shakes[open]) return { rank: 1, i: 3, text: T.fryShake };
  return { rank: 2, i: 3, text: T.fryWait };
}

function fryWork(S, tk) {
  const raw = MENU[tk.menu].from, bat = batOf(tk.menu);
  const steps = FRYERS.filter(f => fryerOn(S, f) && S.stations[f].item?.kind === bat).map(f => ({ f, ...fryerStep(S.stations[f]) }));
  if (steps.length) {
    const s = steps.reduce((a, b) => (b.rank < a.rank ? b : a));
    return { i: s.i, at: s.f, text: s.text };
  }
  const bowl = S.stations.bowl?.item;
  if (bowl && (bowl.kind === raw || bowl.kind === bat)) {
    const done = bowl.kind === bat || chopDone(S.stations.bowl.chop, BATTER_TAPS);
    return { i: 1, at: 'bowl', text: done ? T.bowlPick : T.bowlTap };
  }
  return { i: 0, at: `crate_${raw}`, text: T[`crate_${raw}`] };
}

export function nextStep(S) {
  if (!S || S.ended) return null;
  const h = S.held;
  if (h?.kind === 'burnt') return { menu: null, steps: [], i: -1, at: 'trash', text: T.trash, table: null, ticket: null };
  const tk = focusTicket(S);
  if (h && !tk) return null;
  const ready = h ? null : readyStep(S);
  if (ready) return { ...ready, steps: RECIPE[ready.menu], table: null, ticket: null };
  if (!tk) return null;
  const r = h ? heldStep(S, tk, h) : workStep(S, tk);
  return { menu: tk.menu, steps: RECIPE[tk.menu], ...r, table: tk.table, ticket: tk.id };
}
