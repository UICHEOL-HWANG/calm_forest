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

const FIRST_PAT = 1.2;

export function createSession({ star, dda, rng = Math.random, first = false, stock = null }) {
  const stations = {};
  for (const s of HALL.stations) stations[s.id] = { item: null, t: 0, chop: FRESH_CHOP(), flipped: null };
  return {
    star, cfg: STAR[star], dda: first ? { ...dda, pat: dda.pat * FIRST_PAT } : { ...dda }, first, rng, stock, time: 0, next: 1.5, guests: [], tickets: [], gid: 0,
    held: null, stations, staff: null, ended: false,
    stats: { served: 0, stars: [], late: 0, perfect: 0, takes: 0, burnt: 0, coins: 0 },
  };
}

function freeTables(S) {
  const out = [];
  for (let i = 0; i < S.cfg.tables; i++) if (!S.guests.some(g => g.table === i && g.state !== 'leave')) out.push(i);
  return out;
}

function inStock(S, menu) {
  if (!S.stock) return true;
  const kind = MENU[menu].from;
  const waiting = S.guests.filter(g => g.state !== 'leave' && g.state !== 'eat' && MENU[g.menu].from === kind).length;
  return S.stock(kind) - waiting > 0;
}

function spawn(S) {
  const menus = S.first ? ['grilled'] : S.cfg.menus.filter(m => inStock(S, m));
  if (!menus.length) return null;
  const menu = menus[Math.floor(S.rng() * menus.length)];
  const free = freeTables(S);
  if (!free.length) return null;
  const table = free[Math.floor(S.rng() * free.length)];
  const g = { id: ++S.gid, table, menu, state: 'walk', t: 0, walk: walkTime(table) };
  S.guests.push(g);
  return g;
}

function serve(S, tk, it) {
  const wait = S.time - tk.t0;
  const stars = serveStars(wait, it.q, S.dda.pat);
  if (wait >= PATIENCE[1] * S.dda.pat) S.stats.late++;
  S.tickets.splice(S.tickets.indexOf(tk), 1);
  const g = S.guests.find(x => x.id === tk.id);
  if (g) { g.state = 'eat'; g.t = 0; }
  const coins = stars * COIN_PER_STAR;
  S.stats.served++;
  S.stats.stars.push(stars);
  S.stats.coins += coins;
  return { menu: tk.menu, stars, coins, table: tk.table, id: tk.id };
}

function stepStaff(S, dt, ev) {
  if (!S.cfg.staff) return;
  const pass = S.stations.pass;
  if (!S.staff) {
    if (!pass.item) return;
    const tk = S.tickets.find(t => t.menu === pass.item.kind);
    if (tk) S.staff = { t: 0, ticket: tk.id };
    return;
  }
  S.staff.t += dt;
  if (S.staff.t < STAFF_SEC) return;
  const tk = S.tickets.find(t => t.id === S.staff.ticket);
  const it = pass.item;
  S.staff = null;
  if (!tk || !it || it.kind !== tk.menu) return;
  pass.item = null;
  ev.push({ type: 'staffServed', ...serve(S, tk, it) });
}

export function tickSession(S, dt) {
  const ev = [];
  if (S.ended) return ev;
  S.time += dt;
  S.next -= dt;
  if (S.next <= 0 && S.time < LAST_SPAWN_SEC && !(S.first && S.gid > 0)) {
    const g = spawn(S);
    S.next = g ? spawnInterval(S.star, S.time, S.dda.iv) : 1;
    if (g) ev.push({ type: 'spawn', id: g.id, table: g.table, menu: g.menu });
  }
  for (const s of HALL.stations) {
    const st = S.stations[s.id];
    if ((s.kind === 'pan' || s.kind === 'pot') && st.item) st.t += dt;
  }
  stepStaff(S, dt, ev);
  for (const g of S.guests.slice()) {
    g.t += dt;
    if (g.state === 'walk' && g.t >= g.walk) {
      g.state = 'wait'; g.t = 0;
      S.tickets.push({ id: g.id, table: g.table, menu: g.menu, t0: S.time });
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
  if (firstDone || (S.time >= SERVICE_SEC && !S.guests.some(g => g.state === 'eat'))) {
    S.ended = true;
    ev.push({ type: 'end' });
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
  if (tk) return { do: 'serve', id: tk.id, ico: '🍽️' };
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
    const tk = S.tickets.find(t => t.id === c.id);
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
