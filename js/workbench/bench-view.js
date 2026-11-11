import { STAR_TOOLS } from './rules.js';
import {
  FORGE_COPY, BENCH_COPY, EFFECT_LABEL, effectValue, upgradeLabel, pendingTag, foretell,
  needTier1, giftSub, storedLine, coverSub, weatherBanner, forgeBanner, carveBanner, carveSub,
} from './copy.js';

export function costRows(cost, inv = {}) {
  return Object.entries(cost || {}).map(([k, need]) => {
    const have = inv[k] || 0;
    return { k, need, have, lack: have < need };
  });
}

const short = rows => rows.some(r => r.lack);
const btn = (label, disabled = false) => ({ label, disabled });

function item(base) {
  return { sub: '', cost: [], cnt: 0, stars: null, eff: null, tag: null, dim: false, note: '', sale: null, act: null, ...base };
}

function makeable(id, ico, name, sub, cost, inv, act, label = BENCH_COPY.make) {
  const rows = costRows(cost, inv);
  const lack = short(rows);
  return item({ id, ico, name, sub, cost: rows, dim: lack, act, btn: lack ? btn(BENCH_COPY.short, true) : btn(label) });
}

function starItem(u, v, inv) {
  const c = v.check;
  const shown = ['ready', 'short', 'busy', 'pending'].includes(c.state) ? c.next : 0;
  const eff = { label: EFFECT_LABEL[v.tool], now: effectValue(v.tool, v.effects[v.star]), next: shown ? effectValue(v.tool, v.effects[shown]) : '' };
  const base = { id: u.id, ico: u.ico, name: u.name, stars: { on: v.star, next: shown }, eff, act: { kind: 'forge', tool: v.tool } };
  if (c.state === 'pending') return item({ ...base, tag: 'moon', note: foretell(c.next), btn: btn(pendingTag(c.next), true) });
  if (c.state === 'max') return item({ ...base, note: FORGE_COPY.max, btn: btn(FORGE_COPY.max, true) });
  const cost = costRows(c.cost, inv);
  if (c.state === 'busy') return item({ ...base, cost, note: FORGE_COPY.busy, btn: btn(upgradeLabel(c.next), true) });
  const lack = c.state === 'short';
  return item({ ...base, cost, dim: lack, note: FORGE_COPY.note, btn: lack ? btn(FORGE_COPY.short, true) : btn(upgradeLabel(c.next)) });
}

function coverItem(w, inv) {
  const sub = coverSub(w.info.ico, w.info.name, w.planted);
  if (w.covered) return item({ id: 'cover', ico: '🛡️', name: '밭 덮개', sub, tag: 'done', btn: btn(BENCH_COPY.covered, true) });
  return makeable('cover', '🛡️', '밭 덮개', sub, w.cost, inv, { kind: 'cover' }, BENCH_COPY.cover);
}

function tier2Items(tier2, inv) {
  const known = tier2.filter(x => x.state !== 'noBlueprint');
  if (!known.length) {
    return [item({ id: 'tier2', ico: '📜', name: BENCH_COPY.goldName, sub: BENCH_COPY.blueprintHint, tag: 'lock', dim: true, btn: btn(BENCH_COPY.needBlueprint, true) })];
  }
  return known.map(x => {
    const id = `t2:${x.tool}`, name = `✨ ${x.name}`;
    if (x.state === 'owned') return item({ id, ico: x.ico, name, sub: BENCH_COPY.goldSub, tag: 'done', btn: btn(BENCH_COPY.owned, true) });
    if (x.state === 'needTier1') return item({ id, ico: x.ico, name, sub: BENCH_COPY.goldSub, cost: costRows(x.cost, inv), dim: true, btn: btn(needTier1(x.tier1), true) });
    return makeable(id, x.ico, name, BENCH_COPY.goldSub, x.cost, inv, { kind: 'tier2', tool: x.tool });
  });
}

function toolBanner(forge, weather, upgrades) {
  if (weather?.severe && !weather.covered) return weatherBanner(weather.info.ico, weather.info.name);
  if (forge) return forgeBanner(upgrades.find(u => u.id === forge.tool)?.name || forge.tool, forge.star);
  return '';
}

export function toolView({ upgrades = [], owned = {}, stars = [], forge = null, tier2 = [], weather = null, inv = {} }) {
  const starOf = new Map(stars.filter(v => v.owned).map(v => [v.tool, v]));
  const mine = [], make = [];
  if (weather?.severe) make.push(coverItem(weather, inv));
  for (const u of upgrades) {
    if (!owned[u.id]) { make.push(makeable(u.id, u.ico, u.name, u.desc, u.cost, inv, { kind: 'upgrade', id: u.id })); continue; }
    const sv = STAR_TOOLS.includes(u.id) ? starOf.get(u.id) : null;
    mine.push(sv ? starItem(u, sv, inv) : item({ id: u.id, ico: u.ico, name: u.name, sub: u.desc, tag: 'done', btn: btn(BENCH_COPY.owned, true) }));
  }
  make.push(...tier2Items(tier2, inv));
  const groups = [];
  if (mine.length) groups.push({ key: 'mine', title: BENCH_COPY.mine, items: mine });
  if (make.length) groups.push({ key: 'make', title: BENCH_COPY.makeNew, items: make });
  return { banner: toolBanner(forge, weather, upgrades), groups };
}

export function outView({ outdoor = [], stored = {}, atFarm = false, inv = {} }) {
  const items = outdoor.filter(o => (!o.farm || atFarm) && (!o.hidden || stored[o.id] > 0)).map(o => {
    const n = stored[o.id] || 0;
    const sale = o.tag ? { label: o.tag.label, until: o.tag.until } : null;
    if (n > 0) return item({ id: o.id, ico: o.ico, name: o.name, sub: `${storedLine(n)} · ${BENCH_COPY.storedSub}`, cnt: n, sale, act: { kind: 'place', id: o.id }, btn: btn(BENCH_COPY.place) });
    return { ...makeable(o.id, o.ico, o.name, o.desc, o.cost, inv, { kind: 'place', id: o.id }, BENCH_COPY.place), sale };
  });
  return { banner: BENCH_COPY.outBanner, groups: [{ key: 'all', title: '', items }] };
}

export function giftView({ gifts = [], owned = {}, kept = [], inv = {} }) {
  const items = gifts.map(g => ({
    ...makeable(g.id, g.ico, g.name, giftSub(g.love || 1), g.cost, inv, { kind: 'gift', id: g.id }),
    cnt: owned[g.id] || 0,
    tag: g.isNew ? 'new' : null,
  }));
  const banner = kept.length
    ? `🎁 ${kept.map(k => `${k.ico}${k.paper ? '🎀' : ''} ×${k.n}`).join(' ')} · ${BENCH_COPY.keptTail}`
    : BENCH_COPY.giftBanner;
  return { banner, groups: [{ key: 'all', title: '', items }] };
}

export function carveView({ workshop = { orders: [] } }) {
  const items = workshop.orders.map(o => {
    const sub = carveSub(o.pay, o.best);
    if (o.done) return item({ id: o.id, ico: o.ico, name: o.name, sub, tag: 'done', btn: btn(BENCH_COPY.doneToday, true) });
    const cost = o.cost.map(c => ({ k: c.k, need: c.need, have: c.have, lack: c.have < c.need }));
    const lack = !o.ready;
    return item({ id: o.id, ico: o.ico, name: o.name, sub, cost, dim: lack, act: { kind: 'carve', id: o.id }, btn: lack ? btn(BENCH_COPY.short, true) : btn(BENCH_COPY.carve) });
  });
  return { banner: carveBanner(items.length), groups: [{ key: 'all', title: '', items }] };
}

export function allItems(view) { return view.groups.flatMap(g => g.items); }

export function pickSel(view, sel) {
  const list = allItems(view);
  if (!list.length) return null;
  return list.some(i => i.id === sel) ? sel : list[0].id;
}

export function tourPick(view) {
  const list = allItems(view);
  const withCost = list.filter(i => i.cost.length && i.act);
  return (withCost.find(i => i.cost.some(c => c.lack)) || withCost[0] || list[0])?.id ?? null;
}
