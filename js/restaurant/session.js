import { pickGuestNpc, pickMenu, FAV } from './regulars.js';
import { SPECIAL_COIN_MUL } from './special.js';
import { HALL, SERVICE_SEC, LAST_SPAWN_SEC, STAR, EAT_SEC, COIN_PER_STAR, PATIENCE, COOK, MENU } from './data.js';
import { cookState, panState, flipOk, flipZone, chopTap, chopDone, serveStars, spawnInterval, serviceAvg } from './rules.js';

const DISH = new Set(['grilled', 'riceball', 'soup']);
const RAW = new Set(['fish', 'rice']);
const STAFF_SEC = 2;
const FRESH_CHOP = () => ({ taps: 0, last: -1 });

const stationDef = id => HALL.stations.find(s => s.id === id);
const isActive = (S, s) => !s.need || S.star >= s.need;
const dist = (p, x, z) => Math.hypot(p.x - x, p.z - z);
export function guestPath(table) {
  const [tx, tz] = HALL.tables[table], seat = { x: tx, z: tz - 1.0 }, { door, aisles } = HALL;
  if (tx < aisles.mid) return [door, { x: aisles.west, z: seat.z }, seat];
  return [door, { x: aisles.mid, z: door.z }, { x: aisles.mid, z: seat.z }, seat];
}
export function pathLen(path) {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return d;
}
export function pointAlong(path, dist) {
  let left = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (left < seg - 1e-9) { const k = left / seg; return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dir: Math.atan2(b.x - a.x, b.z - a.z) }; }
    left -= seg;
  }
  const end = path[path.length - 1], prev = path[path.length - 2] || end;
  return { x: end.x, z: end.z, dir: Math.atan2(end.x - prev.x, end.z - prev.z) };
}
const walkTime = table => pathLen(guestPath(table)) / HALL.guestWalk;
export function guestAt(g) {
  const path = guestPath(g.table), len = pathLen(path);
  const k = g.state === 'walk' ? Math.min(1, g.t / g.walk) : g.state === 'leave' ? Math.max(0, 1 - g.t / g.walk) : 1;
  const p = pointAlong(path, len * k);
  return { ...p, k, dir: g.state === 'leave' ? p.dir + Math.PI : p.dir };
}
const BODY = 0.9, PLAYER_YIELD = 1.5;
function blocked(S, g, pos) {
  if (g.state !== 'walk' && g.state !== 'leave') return false;
  const me = guestAt(g), fx = Math.sin(me.dir), fz = Math.cos(me.dir);
  const ahead = o => { const dx = o.x - me.x, dz = o.z - me.z; return Math.hypot(dx, dz) < BODY + 0.15 && dx * fx + dz * fz > 0; };
  if (pos && (g.yield || 0) < PLAYER_YIELD && ahead(pos)) return true;
  return S.guests.some(h => h !== g && (h.state === 'walk' || h.state === 'leave') && ahead(guestAt(h)));
}

const FIRST_PAT = 1.2;
export const SET_ODDS = 0.25, SET_PATIENCE = 1.5, SET_COIN_MUL = 1.5;

export function createSession({ star, dda, rng = Math.random, first = false, stock = null, neighbors = null, special = null, regulars = null }) {
  const stations = {};
  for (const s of HALL.stations) stations[s.id] = { item: null, t: 0, chop: FRESH_CHOP(), flipped: null };
  return {
    star, cfg: STAR[star], dda: first ? { ...dda, pat: dda.pat * FIRST_PAT } : { ...dda }, first, rng, stock, neighbors, special: first ? null : special, regulars: first ? null : regulars, setUsed: new Set(), time: 0, next: 1.5, guests: [], tickets: [], gid: 0,
    held: null, stations, staff: null, ended: false,
    stats: { served: 0, stars: [], late: 0, perfect: 0, takes: 0, burnt: 0, coins: 0, npcServed: 0 },
  };
}

function freeTables(S) {
  const out = [];
  for (let i = 0; i < S.cfg.tables; i++) if (!S.guests.some(g => g.table === i && g.state !== 'leave')) out.push(i);
  return out;
}

const dishes = g => g.set || [g.menu];

function stockLeft(S, kind) {
  const pending = g => (g.state === 'wait' ? S.tickets.filter(t => t.id === g.id).map(t => t.menu) : dishes(g));
  const waiting = S.guests.filter(g => g.state !== 'leave' && g.state !== 'eat').flatMap(pending).filter(m => MENU[m].from === kind).length;
  return S.stock(kind) - waiting;
}

function inStock(S, menu) {
  return !S.stock || stockLeft(S, MENU[menu].from) > 0;
}

function pickSet(S, npc, menus) {
  const fav = npc && FAV[npc];
  if (!fav || !S.regulars?.[npc]?.done || S.setUsed.has(npc) || !menus.includes(fav)) return null;
  if (S.rng() >= SET_ODDS) return null;
  const others = menus.filter(m => m !== fav);
  if (!others.length) return null;
  const set = [fav, others[Math.floor(S.rng() * others.length)]];
  if (S.stock) {
    const need = {};
    for (const m of set) need[MENU[m].from] = (need[MENU[m].from] || 0) + 1;
    if (Object.entries(need).some(([k, n]) => stockLeft(S, k) < n)) return null;
  }
  return set;
}

function spawn(S) {
  const menus = S.first ? ['grilled'] : S.cfg.menus.filter(m => inStock(S, m));
  if (!menus.length) return null;
  const free = freeTables(S);
  if (!free.length) return null;
  const busy = new Set(S.guests.map(g => g.npc).filter(Boolean));
  const npc = S.neighbors ? pickGuestNpc(S.neighbors(), busy, S.rng) : null;
  const set = S.first ? null : pickSet(S, npc, menus);
  const menu = set ? set[0] : pickMenu(npc, menus, S.rng, S.special);
  if (set) S.setUsed.add(npc);
  const table = free[Math.floor(S.rng() * free.length)];
  const g = { id: ++S.gid, table, menu, npc, state: 'walk', t: 0, walk: walkTime(table), ...(set ? { set } : {}) };
  S.guests.push(g);
  return g;
}

function setDone(S, g, stars, coins) {
  g.got = [...(g.got || []), { stars, coins }];
  if (S.tickets.some(t => t.id === g.id)) return { coins, set: null };
  const sum = g.got.reduce((a, x) => a + x.coins, 0);
  const total = Math.round(sum * SET_COIN_MUL);
  const avg = Math.round(g.got.reduce((a, x) => a + x.stars, 0) / g.got.length);
  return { coins: coins + total - sum, set: { stars: avg, coins: total } };
}

function serve(S, tk, it) {
  const wait = S.time - tk.t0;
  const pat = S.dda.pat * (tk.pat || 1);
  const stars = serveStars(wait, it.q, pat);
  if (wait >= PATIENCE[1] * pat) S.stats.late++;
  S.tickets.splice(S.tickets.indexOf(tk), 1);
  const g = S.guests.find(x => x.id === tk.id);
  const dish = stars * COIN_PER_STAR * (tk.menu === S.special ? SPECIAL_COIN_MUL : 1);
  const { coins, set } = g?.set ? setDone(S, g, stars, dish) : { coins: dish, set: null };
  if (g && !S.tickets.some(t => t.id === g.id)) { g.state = 'eat'; g.t = 0; }
  S.stats.served++;
  S.stats.stars.push(stars);
  S.stats.coins += coins;
  if (g?.npc) S.stats.npcServed++;
  return { menu: tk.menu, stars, coins, table: tk.table, id: tk.id, npc: g?.npc ?? null, ...(set ? { set } : {}) };
}

function stepStaff(S, dt, ev) {
  if (!S.cfg.staff) return;
  const pass = S.stations.pass;
  if (!S.staff) {
    if (!pass.item) return;
    const tk = S.tickets.find(t => t.menu === pass.item.kind);
    if (tk) S.staff = { t: 0, ticket: tk.id, menu: tk.menu };
    return;
  }
  S.staff.t += dt;
  if (S.staff.t < STAFF_SEC) return;
  const tk = S.tickets.find(t => t.id === S.staff.ticket && t.menu === S.staff.menu);
  const it = pass.item;
  S.staff = null;
  if (!tk || !it || it.kind !== tk.menu) return;
  pass.item = null;
  ev.push({ type: 'staffServed', ...serve(S, tk, it) });
}

export function tickSession(S, dt, { pos = null } = {}) {
  const ev = [];
  if (S.ended) return ev;
  S.time += dt;
  S.next -= dt;
  const leaving = S.guests.some(g => g.state === 'leave');
  if (S.next <= 0 && leaving) S.next = 0.5;
  if (S.next <= 0 && S.time < LAST_SPAWN_SEC && !(S.first && S.gid > 0)) {
    const g = spawn(S);
    S.next = g ? spawnInterval(S.star, S.time, S.dda.iv) : 1;
    if (g) ev.push({ type: 'spawn', id: g.id, table: g.table, menu: g.menu, npc: g.npc });
  }
  for (const s of HALL.stations) {
    const st = S.stations[s.id];
    if ((s.kind === 'pan' || s.kind === 'pot') && st.item) st.t += dt;
  }
  stepStaff(S, dt, ev);
  const walking = S.guests.some(g => g.state === 'walk');
  for (const g of S.guests.slice()) {
    if (blocked(S, g, pos)) { g.yield = (g.yield || 0) + dt; continue; }
    g.yield = 0;
    if (g.state === 'eat' && g.t + dt >= EAT_SEC && walking) continue;
    g.t += dt;
    if (g.state === 'walk' && g.t >= g.walk) {
      g.state = 'wait'; g.t = 0;
      for (const m of dishes(g)) S.tickets.push({ id: g.id, table: g.table, menu: m, t0: S.time, ...(g.set ? { set: true, pat: SET_PATIENCE } : {}) });
      ev.push({ type: 'seat', id: g.id, table: g.table, menu: g.menu });
    } else if (g.state === 'eat' && g.t >= EAT_SEC) {
      g.state = 'leave'; g.t = 0;
      ev.push({ type: 'leave', id: g.id, table: g.table });
    } else if (g.state === 'leave' && g.t >= g.walk) {
      S.guests.splice(S.guests.indexOf(g), 1);
      ev.push({ type: 'gone', id: g.id });
    }
  }
  const firstDone = S.first && S.gid > 0 && !S.guests.length;
  const soldOut = !S.first && !!S.stock && !S.guests.length && !S.cfg.menus.some(m => inStock(S, m));
  if (firstDone || soldOut || (S.time >= SERVICE_SEC && !S.guests.some(g => g.state === 'eat'))) {
    S.ended = true;
    S.soldOut = soldOut && S.time < SERVICE_SEC;
    ev.push({ type: 'end', soldOut: S.soldOut });
  }
  return ev;
}

function nearestStation(S, pos) {
  let best = null, bd = HALL.reach;
  for (const s of HALL.stations) {
    if (!isActive(S, s)) continue;
    const d = dist(pos, s.x, s.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function servableTicket(S, pos) {
  const h = S.held;
  if (!h || !h.plated) return null;
  let best = null, bd = HALL.tableReach;
  for (const tk of S.tickets) {
    if (tk.menu !== h.kind) continue;
    const tb = HALL.tables[tk.table];
    const d = dist(pos, tb[0], tb[1]);
    if (d < bd) { bd = d; best = tk; }
  }
  return best;
}

function stationContext(S, s) {
  const st = S.stations[s.id], h = S.held;
  const c = (d, ico) => ({ do: d, id: s.id, ico });
  switch (s.kind) {
    case 'crate': return h ? null : c('take', '✋');
    case 'board':
      if (h && !h.plated && (h.kind === 'rice' || (h.kind === 'fish' && S.cfg.pot)) && !st.item) return c('put', '🫳');
      if (!h && st.item && chopDone(st.chop)) return c('pick', '✋');
      if (!h && st.item) return c('chop', '🔪');
      return null;
    case 'pan':
      if (h && h.kind === 'fish' && !h.plated && !st.item) return c('put', '🫳');
      if (!st.item) return null;
      if (panState(st.t) === 'raw') return st.flipped === null ? c('flip', '🍳') : null;
      return h ? null : c('pickCook', '✋');
    case 'pot':
      if (h && h.kind === 'fishChop' && !st.item) return c('put', '🫳');
      if (!h && st.item && cookState('pot', st.t, S.dda.win) !== 'raw') return c('pickCook', '✋');
      return null;
    case 'plates': return h && !h.plated && DISH.has(h.kind) ? c('plate', '🍽️') : null;
    case 'trash': return h ? c('trash', '🗑️') : null;
    case 'pass':
      if (h && h.plated && !st.item) return c('put', '🫳');
      if (!h && st.item) return c('pick', '✋');
      return null;
  }
  return null;
}

export function contextAt(S, pos) {
  if (S.ended) return null;
  const tk = servableTicket(S, pos);
  if (tk) return { do: 'serve', id: tk.id, menu: tk.menu, ico: '🍽️' };
  const s = nearestStation(S, pos);
  return s ? stationContext(S, s) : null;
}

function cookOut(S, s, st) {
  if (s.kind === 'pan') {
    if (panState(st.t) === 'burnt') return { kind: 'burnt' };
    return { kind: 'grilled', q: st.flipped ? 1 : 0.75 };
  }
  const cs = cookState('pot', st.t, S.dda.win);
  if (cs === 'burnt') return { kind: 'burnt' };
  return { kind: 'soup', q: cs === 'perfect' ? 1 : 0.75 };
}

export function actAt(S, pos, { take }) {
  const c = contextAt(S, pos);
  if (!c) return [];
  if (c.do === 'serve') {
    const tk = S.tickets.find(t => t.id === c.id && t.menu === c.menu);
    const it = S.held;
    S.held = null;
    return [{ type: 'served', ...serve(S, tk, it) }];
  }
  const s = stationDef(c.id), st = S.stations[c.id];
  switch (c.do) {
    case 'take':
      if (!take(s.give)) return [{ type: 'empty', kind: s.give }];
      S.held = { kind: s.give, q: 1 };
      return [{ type: 'take', kind: s.give }];
    case 'put':
      st.item = S.held; st.t = 0; st.chop = FRESH_CHOP(); st.flipped = null;
      S.held = null;
      return [{ type: 'put', id: c.id, kind: st.item.kind }];
    case 'chop':
      st.chop = chopTap(st.chop, S.time);
      if (chopDone(st.chop) && RAW.has(st.item.kind)) {
        st.item = { kind: st.item.kind === 'fish' ? 'fishChop' : 'riceball', q: 1 };
        return [{ type: 'chopDone', id: c.id, kind: st.item.kind }];
      }
      return [{ type: 'chop', id: c.id, taps: st.chop.taps }];
    case 'flip':
      st.flipped = flipOk(st.t, S.dda.win);
      return [{ type: 'flip', id: c.id, ok: st.flipped }];
    case 'pick': {
      const it = st.item;
      st.item = null; st.chop = FRESH_CHOP();
      S.held = it;
      return [{ type: 'pick', id: c.id, kind: it.kind }];
    }
    case 'pickCook': {
      const it = cookOut(S, s, st);
      S.stats.takes++;
      if (it.kind === 'burnt') S.stats.burnt++;
      else if (it.q === 1) S.stats.perfect++;
      st.item = null; st.t = 0; st.flipped = null;
      S.held = it;
      return [{ type: 'cooked', id: c.id, kind: it.kind, q: it.q ?? 0 }];
    }
    case 'plate':
      S.held = { ...S.held, plated: true };
      return [{ type: 'plate', kind: S.held.kind }];
    case 'trash': {
      const kind = S.held.kind;
      S.held = null;
      return [{ type: 'trash', kind }];
    }
  }
  return [];
}

export function finishSession(S) {
  const st = S.stats;
  const unserved = S.tickets.length;
  return {
    served: st.served, stars: [...st.stars], unserved, late: st.late, perfect: st.perfect,
    takes: st.takes, burnt: st.burnt, coins: st.coins, avg: serviceAvg(st.stars, unserved),
    soldOut: !!S.soldOut, regularN: st.npcServed,
  };
}

const BEAT = 0.35;

export function stationView(S, id) {
  const s = stationDef(id);
  if (!isActive(S, s)) return null;
  const st = S.stations[id];
  if (!st.item) return null;
  if (s.kind === 'board') return chopDone(st.chop) ? null : { kind: 'chop', taps: st.chop.taps, beat: S.time % BEAT < 0.12 };
  if (s.kind === 'pan') {
    const state = panState(st.t), cook = COOK.pan.cook;
    if (state === 'raw') {
      const [a, b] = flipZone(S.dda.win);
      return { kind: 'gauge', p: st.t / cook, zone: st.flipped === null ? [a / cook, b / cook] : null, state, perfect: st.flipped === true };
    }
    return { kind: 'gauge', p: Math.min(1, (st.t - cook) / COOK.pan.burn), zone: null, state, perfect: st.flipped === true };
  }
  if (s.kind === 'pot') {
    const win = COOK.pot.win * S.dda.win, span = COOK.pot.cook + win + 2;
    const cs = cookState('pot', st.t, S.dda.win);
    return { kind: 'gauge', p: Math.min(1, st.t / span), zone: [COOK.pot.cook / span, (COOK.pot.cook + win) / span],
      state: cs === 'burnt' ? 'burnt' : cs === 'over' ? 'done' : 'raw', perfect: cs === 'perfect' };
  }
  return null;
}
