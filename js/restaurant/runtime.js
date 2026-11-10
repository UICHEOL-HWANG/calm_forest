import { HALL, STAR, RESTAURANT, MENU, PATIENCE } from './data.js';
import { createSession, tickSession, contextAt, actAt, finishSession, stationView } from './session.js';
import { recordServe, takeIngredient, settleService } from './rules.js';
import { showForStar, itemMesh, itemHeight } from './hall.js';
import { mountHud, contextLabel, goalRows } from './hud.js';

const BOARD_R = 1.6;
const START_PROMPT = '🍽️ 저녁 영업 시작';

export function createRestaurantRuntime(env) {
  const { THREE, hall } = env;
  const hud = mountHud(env.doc);
  const items = new Map(), guests = new Map();
  const v = new THREE.Vector3();
  let S = null, held = null, before = null;

  const local = p => ({ x: p.x - RESTAURANT.x, z: p.z - RESTAURANT.z });
  const world = (x, y, z) => v.set(RESTAURANT.x + x, y, RESTAURANT.z + z);
  const keyOf = it => (it ? `${it.kind}${it.plated ? '+' : ''}` : '');
  const drop = m => {
    m.parent?.remove(m);
    m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  };
  const nearBoard = lp => Math.hypot(lp.x - HALL.board.x, lp.z - HALL.board.z) < BOARD_R;
  const stationPos = id => HALL.stations.find(s => s.id === id);

  function refresh() {
    const r = env.rest();
    showForStar(hall, r.star, STAR[r.star].tables);
  }

  function syncItems() {
    for (const s of HALL.stations) {
      const it = S ? S.stations[s.id].item : null;
      const k = s.kind === 'pot' ? '' : keyOf(it);
      const cur = items.get(s.id);
      if ((cur?.key || '') === k) continue;
      if (cur) drop(cur.mesh);
      items.delete(s.id);
      if (!k) continue;
      const m = itemMesh(THREE, it);
      m.position.set(s.x, itemHeight(s.kind), s.z);
      hall.group.add(m);
      items.set(s.id, { key: k, mesh: m });
    }
  }

  function syncHeld() {
    const k = keyOf(S?.held);
    if ((held?.key || '') === k) return;
    if (held) drop(held.mesh);
    held = null;
    if (!k) return;
    const m = itemMesh(THREE, S.held);
    m.position.set(0, 0.95, 0.5);
    env.player.add(m);
    held = { key: k, mesh: m };
  }

  function placeGuest(g, m) {
    const [tx, tz] = HALL.tables[g.table];
    const sx = tx, sz = tz - 1.0;
    let k = 1;
    if (g.state === 'walk') k = Math.min(1, g.t / g.walk);
    else if (g.state === 'leave') k = Math.max(0, 1 - g.t / g.walk);
    const x = HALL.door.x + (sx - HALL.door.x) * k, z = HALL.door.z + (sz - HALL.door.z) * k;
    const y = g.state === 'eat' ? 0.16 + Math.abs(Math.sin(g.t * 8)) * 0.05 : k === 1 ? 0.16 : 0;
    m.position.set(x, y, z);
    if (g.state === 'walk') m.rotation.y = Math.atan2(sx - HALL.door.x, sz - HALL.door.z);
    else if (g.state === 'leave') m.rotation.y = Math.atan2(HALL.door.x - sx, HALL.door.z - sz);
    else m.rotation.y = 0;
  }

  function syncGuests() {
    const alive = new Set();
    for (const g of S ? S.guests : []) {
      alive.add(g.id);
      let m = guests.get(g.id);
      if (!m) { m = env.takeGuest(g.id); hall.group.add(m); guests.set(g.id, m); }
      placeGuest(g, m);
    }
    for (const [id, m] of guests) {
      if (alive.has(id)) continue;
      hall.group.remove(m);
      env.releaseGuest(m);
      hud.station(`g${id}`, null);
      guests.delete(id);
    }
  }

  function drawHud() {
    hud.clock(S.time);
    hud.tickets(S.tickets, S.time, S.dda.pat);
    for (const s of HALL.stations) {
      const view = stationView(S, s.id);
      const p = view ? env.project(world(s.x, 1.55, s.z)) : null;
      hud.station(s.id, p?.on ? view : null, p?.x, p?.y);
    }
    const waiting = new Set();
    for (const t of S.tickets) {
      const m = guests.get(t.id);
      if (!m) continue;
      waiting.add(t.id);
      const w = S.time - t.t0, a = PATIENCE[0] * S.dda.pat, b = PATIENCE[1] * S.dda.pat;
      const p = env.project(world(m.position.x, 2.2, m.position.z));
      hud.station(`g${t.id}`, p.on ? { kind: 'bubble', ico: MENU[t.menu].ico, mood: w < a ? '😊' : w < b ? '🙂' : '😟' } : null, p.x, p.y);
    }
    for (const g of S.guests) if (!waiting.has(g.id)) hud.station(`g${g.id}`, null);
  }

  function pop(id, ico) {
    const s = stationPos(id);
    if (s && ico) env.popAt(world(s.x, 1.4, s.z).clone(), ico);
  }

  function handle(events) {
    for (const e of events) {
      if (e.type === 'served' || e.type === 'staffServed') {
        env.setRest(recordServe(env.rest(), e.menu, e.stars));
        const [tx, tz] = HALL.tables[e.table];
        env.popAt(world(tx, 1.6, tz).clone(), '⭐'.repeat(e.stars));
      } else if (e.type === 'flip') pop(e.id, e.ok ? '✨' : '💨');
      else if (e.type === 'cooked') pop(e.id, e.kind === 'burnt' ? '💨' : e.q === 1 ? '✨' : '');
      else if (e.type === 'chopDone') pop(e.id, '✔️');
      else if (e.type === 'empty') env.toast(env.copy.empty);
    }
  }

  function clear() {
    for (const { mesh } of items.values()) drop(mesh);
    items.clear();
    if (held) drop(held.mesh);
    held = null;
    for (const m of guests.values()) { hall.group.remove(m); env.releaseGuest(m); }
    guests.clear();
    hud.show(false);
    S = null;
  }

  function finish() {
    const r = finishSession(S);
    const star0 = before.star;
    clear();
    const out = settleService(env.rest(), r);
    env.setRest(out.rest);
    env.earnCoins(r.coins + out.bonus);
    env.trackEvent('restaurant_service', { star: star0, served: r.served, avg_score: Math.round(r.avg * 10) / 10, dda: out.rest.dda.iv });
    if (out.starUp) env.trackEvent('restaurant_star_up', { star: out.rest.star });
    env.requestSave();
    const lines = [`🍽️ ${r.served}명 · 평균 ★${r.avg.toFixed(1)} · 🪙 ${r.coins}`];
    if (out.bonus) lines.push(`🎁 🪙 ${out.bonus}`);
    hud.result({ title: out.starUp ? env.copy.starUp(out.rest.star) : env.copy.done, lines, goals: goalRows(out.rest), onDone: refresh });
    env.onFinish?.(r, out);
  }

  function start() {
    const r = env.rest();
    before = r;
    refresh();
    S = createSession({ star: r.star, dda: r.dda, ...(env.sessionOpts?.() || {}) });
    hud.show(true);
    env.onStart?.();
  }

  return {
    running: () => !!S,
    session: () => S,
    refresh,
    prompt() {
      const lp = local(env.player.position);
      if (!S) return nearBoard(lp) ? START_PROMPT : null;
      return contextLabel(contextAt(S, lp));
    },
    action() {
      const lp = local(env.player.position);
      if (!S) {
        if (!nearBoard(lp)) return false;
        start();
        return true;
      }
      const take = kind => {
        const res = takeIngredient(env.port(), kind);
        if (res.ok) env.setPort(res.port);
        return res.ok;
      };
      handle(actAt(S, lp, { take }));
      return true;
    },
    frame(dt) {
      if (!S) return;
      handle(tickSession(S, dt));
      syncItems(); syncHeld(); syncGuests(); drawHud();
      if (S.ended) finish();
    },
    abort() { if (S) clear(); },
  };
}
