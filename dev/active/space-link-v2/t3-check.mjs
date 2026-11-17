import { start, base } from './common.mjs';
const [mode = 'pc', cdp = '9541'] = process.argv.slice(2);
const OUT = '/Users/uicheol_hwang/calm_forest/.claude/worktrees/pond-expand/dev/active/space-link-v2';
const out = (n) => `${OUT}/t3-${n}.png`;
const DEVQ = { pcg: ['pc', '&house=3&prepass=1'], mob: ['mobile', '&house=3&prepass=1'], lnd: ['land', '&house=3&prepass=1'], en: ['mobile', '&house=3&prepass=1&lang=en'], pc: ['pc', '&house=3'], mobile: ['mobile', '&house=3'], land: ['land', '&house=3'], h7m: ['pc', '&house=7'], h7h: ['pc', '&house=7&style=hanok'], night: ['pc', '&house=3&time=0.92'], fallback: ['pc', '&house=3'], owl: ['pc', '&house=3'] };
const [dev, q] = DEVQ[mode];
const s = await start(dev, cdp, q);
const { b, ev, log } = s;
const settle = async (ms = 2600) => { await b.sleep(ms); await s.clearTut(); await s.clean(); await b.sleep(900); await s.clean(); };
const tp = async (x, z, ms = 1200) => { await ev(`__tp(${x}, ${z})`); await b.sleep(ms); };
const DISH = (n, trig = 'load') => `(async () => { const gs = __gs(); const cat = await import('/js/data/catalog.js'); const T = await import('/js/table/index.js');
  gs.kitchen = gs.kitchen || { cooked: 0, best: {}, tiers: {} }; gs.kitchen.best = {}; const sc = [95, 70, 40, 10];
  cat.RECIPES.slice(0, ${n}).forEach((r, i) => { gs.kitchen.best[r.id] = sc[i % 4]; }); gs.kitchen.best['free:crop'] = 99;
  window.__ui.coachActive = () => false; T.refreshTable('${trig}');
  return { pos: T.tablePos(), key: T.tableMapKey(), n: T.tableDishCount(), settling: T.tableSettling(), ev: (window.__ev || []).filter(e => /table/.test(e[0])), hints: Object.fromEntries(Object.entries(gs.hintsSeen).filter(([k]) => /^table/.test(k))) }; })()`;
const hud = () => ev(`(()=>{const d=document.getElementById('door-prompt');const a=document.getElementById('action-btn');return {prompt:d.classList.contains('show')?d.textContent:null,btn:a?a.textContent:null,door:window.__gsDoor}})()`);
const STATE = `(async () => { const G = await import('/js/game.js'); const T = await import('/js/table/index.js'); const S = await import('/js/table/site.js'); const D = await import('/js/data/table.js'); const pl = await import('/js/data/places.js');
  const p = T.tablePos(); if (!p) return { none: true }; const [site, shape] = T.tableMapKey().split('/'); const sh = D.TABLE_SHAPES[shape]; const cl = S.tableClear(shape);
  const edge = (q) => Math.hypot(Math.max(0, Math.abs(q.x - p.x) - sh.hx), Math.max(0, Math.abs(q.z - p.z) - sh.hz));
  const trees = G.trees.map(t => ({ x: +t.position.x.toFixed(1), z: +t.position.z.toFixed(1), e: +edge(t.position).toFixed(2), d: Math.hypot(t.position.x - p.x, t.position.z - p.z) }));
  const inCircle = trees.filter(t => t.d < cl.treeR).length, near = trees.filter(t => t.e < 1.5).length;
  const south = trees.filter(t => t.z > p.z && t.z - p.z < cl.treeR + cl.south && Math.abs(t.x - p.x) < cl.treeR).length;
  const owl = G.npcObjs.find(n => n.def.daily);
  const solids = G.colliders.filter(c => !c.off && (('r' in c && Math.abs(c.x - p.x) < 0.01 && Math.abs(c.z - p.z) < 0.01) || ('x1' in c && Math.abs((c.x1 + c.x2) / 2 - p.x) < 0.01 && Math.abs((c.z1 + c.z2) / 2 - p.z) < 0.01))).length;
  const obs = G.obstacles.filter(o => Math.abs(o.z - p.z) < 0.01 && Math.abs(o.x - p.x) < 2).map(o => [+o.x.toFixed(2), +o.r.toFixed(2)]);
  return { p, site, shape, treesInCircle: inCircle, treesNear15: near, treesSouthBand: south, nearestTree: trees.sort((a, b) => a.e - b.e)[0], solids, obs,
    owl: { home: [owl.home.x, owl.home.z], at: [+owl.group.position.x.toFixed(2), +owl.group.position.z.toFixed(2)], edge: +edge(owl.group.position).toFixed(2), st: owl.fly.st },
    meshes: G.scene.getObjectByName('yard-table').children.length, calls: __perf().calls }; })()`;
const PERF = `(async () => { const G = await import('/js/game.js'); const t = G.scene.getObjectByName('yard-table'); const ring = G.scene.children.find(c => c.isMesh && c.renderOrder === 3 && Math.abs(c.position.x - t.position.x) < 0.01 && Math.abs(c.position.z - t.position.z) < 0.01);
  const on = __perf().calls; t.visible = false; if (ring) ring.visible = false; const off = __perf().calls; t.visible = true; if (ring) ring.visible = true; return { on, off, ring: !!ring }; })()`;
const WALK = (tx, tz, arrive) => `(async () => { const G = await import('/js/game.js'); const R = await import('/js/guide/guide-rules.js'); const me = { x: G.player.position.x, z: G.player.position.z }; const to = { x: ${tx}, z: ${tz} };
  const live = G.colliders.filter(o => !o.off && !o.lock);
  if (Math.hypot(me.x - to.x, me.z - to.z) < ${arrive}) { __setAnalog(0, 0); return { done: true, me }; } const wp = R.detourPoint(me, to, live.filter(c => ('r' in c ? c.r >= 1.0 : true))); const l = Math.hypot(wp.x - me.x, wp.z - me.z) || 1; __setAnalog((wp.x - me.x) / l, (wp.z - me.z) / l); return { done: false, me }; })()`;
async function walk(tx, tz, arrive, max = 400) {
  let len = 0, last = null, stuck = 0; const path = [];
  for (let i = 0; i < max; i++) {
    const st = await ev(WALK(tx, tz, arrive));
    if (!st || !st.me) continue;
    if (last) { const dd = Math.hypot(st.me.x - last.x, st.me.z - last.z); len += dd; stuck = dd < 0.02 ? stuck + 1 : 0; }
    last = st.me; if (i % 8 === 0) path.push([+st.me.x.toFixed(1), +st.me.z.toFixed(1)]);
    if (st.done) return { ok: true, len: +len.toFixed(1) };
    if (stuck > 30) { await ev('__setAnalog(0,0)'); return { ok: false, stuckAt: [+last.x.toFixed(2), +last.z.toFixed(2)], len: +len.toFixed(1), path }; }
    await b.sleep(250);
  }
  await ev('__setAnalog(0,0)');
  return { ok: false, timeout: true, at: last, len: +len.toFixed(1), path };
}
async function lap(c, hx, hz, off = 0.95) {
  const ring = [[-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]].map(([ux, uz]) => [c.x + ux * (hx + off), c.z + uz * (hz + off)]);
  await tp(ring[0][0], ring[0][1], 700);
  const res = []; for (let i = 1; i <= 8; i++) { const [x, z] = ring[i % 8]; const r = await walk(x, z, 0.45, 80); res.push(r.ok ? 1 : { leg: i, r }); if (!r.ok) await tp(x, z, 400); }
  return res;
}
const OWLHOME = `(async () => { const G = await import('/js/game.js'); const o = G.npcObjs.find(n => n.def.daily); o.fly.st = 'perch'; o.fly.t = 0; o.fly.next = 999; o.group.position.set(o.home.x, 0, o.home.z); o.target.copy(o.home); o.wanderTimer = 999; return [o.home.x, o.home.z]; })()`;
const closeMap = () => ev(`(() => { const m = [...document.querySelectorAll('.show')].find(e => /map/.test(e.id)); const x = m && [...m.querySelectorAll('button')].find(e => /close|닫|✕|×/.test(e.id + e.className + e.textContent)); x?.click(); return x?.id || null; })()`);

const M = (code) => ev(`(async () => { const G = await import('/js/game.js'); const B = await import('/js/table/book-ui.js'); const T = await import('/js/table/index.js'); const K = await import('/js/kst-date.js'); const gs = __gs(); ${code} })()`);
const click = (sel, i = 0) => ev(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(x => x.offsetParent)[${i}]; if (!e) return null; e.click(); return e.textContent.trim().slice(0, 60); })()`);
const hint = () => ev(`(() => { const h = document.getElementById('cb-hint'); return h ? [...h.childNodes].map(n => n.textContent.trim()) : null; })()`);
const evs = () => ev(`(window.__ev || []).filter(e => /table|cookbook|guide_step|prepass/.test(e[0])).map(e => e[0] + ' ' + JSON.stringify(e[1]))`);
const PREP = `gs.hintsSeen.yardFill = true; gs.hintsSeen.pondD1 = true; gs.hintsSeen.pondStage = 3; gs.hintsSeen.tableSeen = true; gs.hintsSeen.tableRingSeen = true; gs.inventory.crop = 1; gs.inventory.fish = 0; gs.inventory.forage = 2;`;
log('setup', await ev(base(PREP)));
if (mode === 'pcg') {
  log('dishes', await ev(DISH(5, 'cook')));
  await tp(-1, 6, 800); await settle(1500);
  await ev(`window.__ui.coachActive = () => false`);
  let g = null; for (let i = 0; i < 20 && !(g = (await evs()).find(e => /table_first/.test(e))); i++) await b.sleep(1000);
  log('guide start', g); await b.sleep(1200); await b.shot(out('guide-1-pc'));
  await tp(-6.6, 2.6, 2500); await b.shot(out('guide-2-pc'));
  log('pantry before', await M(`gs.pantry = [{ id: 'bread', score: 90 }]; return JSON.stringify(gs.pantry);`));
  await M(`B.openCookbook(); return 1;`); await b.sleep(800); await b.shot(out('book-pc'));
  log('bite btn', await click('#cb-head .cb-btn')); await b.sleep(600);
  log('pick slot', await click('#cb-body .cb-slot', 0)); await b.sleep(400); log('pick hint', await hint());
  await b.shot(out('bite-pick-pc'));
  const pre = await M(`const d = (await import('/js/table/rules.js')).tableDishes(gs.kitchen.best, (await import('/js/data/catalog.js')).RECIPES, (await import('/js/spaces/cooking.js')).COOK_TIERS)[0]; G.buffs[d.buff] = G.clock.elapsedTime + 150; return { buff: d.buff, tier: d.tier, left: +(G.buffs[d.buff] - G.clock.elapsedTime).toFixed(1) };`);
  log('buff before', pre);
  log('double eat', await ev(`(() => { const e = [...document.querySelectorAll('#cb-hint .cb-btn')][0]; e.click(); e.click(); return 2; })()`));
  await b.sleep(700); await b.shot(out('bite-done-pc'));
  log('buff after', await M(`return +(G.buffs['${pre.buff}'] - G.clock.elapsedTime).toFixed(1);`));
  log('pantry after', await M(`return JSON.stringify(gs.pantry);`));
  log('second free bite', await M(`return B.takeBite('${'veg_stew'}', 'free');`));
  await b.sleep(1500); await b.shot(out('guide-3-pc'));
  await M(`B.openCookbook(); return 1;`); await b.sleep(800); await b.shot(out('book-bitten-pc'));
  await click('#cb-close'); await b.sleep(1500);
  log('guide done', await M(`return { tableGuide: gs.hintsSeen.tableGuide, tries: gs.hintsSeen.tableGuideTries, cookbookSeen: gs.hintsSeen.cookbookSeen, biteDay: gs.hintsSeen.tableBiteDay };`));
}
if (mode === 'mob' || mode === 'lnd' || mode === 'en') {
  log('dishes', await ev(DISH(mode === 'lnd' ? 9 : 5, 'cook')));
  await M(`gs.hintsSeen.tableGuide = true; return 1;`);
  await tp(-6.6, 2.6, 1200); await settle(1500);
  await M(`B.openCookbook(); return 1;`); await b.sleep(800); await b.shot(out(`book-${mode}`));
  log('empty slot', await click('#cb-body .cb-slot.empty', mode === 'en' ? 3 : 0)); await b.sleep(500); log('hint', await hint());
  await b.shot(out(mode === 'mob' ? 'book-short-ad-mobile' : `book-empty-${mode}`));
  if (mode === 'mob') {
    log('ad grant', await click('#cb-hint .rw-ad')); await b.sleep(3500); log('hint after grant', await hint());
    log('inv', await M(`return { crop: gs.inventory.crop, fish: gs.inventory.fish, forage: gs.inventory.forage };`));
    await b.shot(out('book-after-grant-mobile'));
    await click('#cb-close'); await b.sleep(400);
    await M(`gs.hintsSeen.tableBiteDay = K.kstDate(); B.openCookbook(); return 1;`); await b.sleep(700);
    log('head', await ev(`document.getElementById('cb-head').textContent`));
    log('ad more', await click('#cb-head .cb-btn')); await b.sleep(500);
    log('pick', await click('#cb-body .cb-slot', 1)); await b.sleep(400); log('hint', await hint());
    await b.shot(out('bite-ad-mobile'));
    log('watch', await click('#cb-hint .rw-ad')); await b.sleep(3500);
    log('after ad', await M(`return { ad: gs.hintsSeen.tableBiteAd, open: document.getElementById('collection-book-modal').classList.contains('show') };`));
    await M(`B.openCookbook(); return 1;`); await b.sleep(700); log('head after ad', await ev(`document.getElementById('cb-head').textContent`));
  } else {
    await click('#cb-close'); await b.sleep(400);
    await M(`B.openBitePick('free'); return 1;`); await b.sleep(600); await click('#cb-body .cb-slot', 0); await b.sleep(400);
    await b.shot(out(`bite-pick-${mode}`)); log('pick hint', await hint());
  }
}
log('events', await evs());
log('errors', b.logs.filter(l => /error|Error|\[table\]/.test(JSON.stringify(l))).slice(0, 5));
await s.stop();
