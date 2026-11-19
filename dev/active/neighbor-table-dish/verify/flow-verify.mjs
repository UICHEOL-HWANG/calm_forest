import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './dish-harness.mjs';

const OUT = process.env.OUT || path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'phone';
const h = await open(dev, 9500 + Math.floor(Math.random() * 80));
const { b, ev, until } = h;
const shot = (n) => b.shot(path.join(OUT, `flow-${dev}-${n}.png`));
const PANTRY = [{ id: 'veg_stew', score: 90 }, { id: 'rice_ball', score: 70 }, { id: 'baked_yam', score: 50 }, { id: 'herb_salad', score: 95 }, { id: 'free:crop+fish', score: 80 }];
const NAMES = { veg_stew: '채소죽', rice_ball: '주먹밥', baked_yam: '군고구마', herb_salad: '들나물' };
const log = { dev, runs: [] };

await h.enterGame('bear');
await ev(`(async () => { const g = await import('/js/game.js'); const a = await import('/js/supabase-client.js');
  a.state.isGuest = false; g.gameState.pantry = ${JSON.stringify(PANTRY)}; return true; })()`);
log.visit = await h.visit('rabbit', 'round', `window.__leave = { mode: 'ok' }; window.__calls = [];
  A.dishLeave = async (pid, recipe, score) => { window.__calls.push([pid, recipe, score]); const m = window.__leave.mode;
    if (m === 'throw') throw new Error('net'); if (m !== 'ok') return { ok: false, reason: m };
    return { ok: true, reason: 'ok', stars: score >= 88 ? 3 : score >= 65 ? 2 : 1, rewarded: true }; };`);

const pantryIds = () => ev(`(async () => (await import('/js/game.js')).gameState.pantry.map(f => f.id))()`);
const coins = () => ev(`(async () => (await import('/js/game.js')).gameState.inventory.coins | 0)()`);
async function sit() {
  await ev(`(async () => { const g = await import('/js/game.js'); const t = g.scene.getObjectByName('neighbor').getObjectByName('yard-table');
    const p = t.getWorldPosition(t.position.clone()); window.__tp(p.x, p.z + 2.0); return true; })()`);
  await b.sleep(900);
  await ev(`(async () => { (await import('/js/spaces/neighbor.js')).neighborAction('nbsit'); return true; })()`);
  await b.sleep(1800);
}
async function stand() {
  await ev(`(async () => { (await import('/js/spaces/neighbor.js')).neighborAction('nbstand'); return true; })()`);
  await b.sleep(700);
}
async function pick(id) {
  return ev(`(() => { const m = document.getElementById('nb-dish-modal'); if (!m?.classList.contains('show')) return 'no modal';
    const c = [...m.querySelectorAll('.nb-it')].find(x => x.textContent.includes(${JSON.stringify(NAMES[id] || id)})); if (!c) return 'no cell'; c.click();
    [...m.querySelectorAll('.nb-btn')].find(x => x.textContent.includes('차려 주기')).click(); return 'ok'; })()`);
}
const toastText = () => ev(`document.getElementById('toast')?.textContent?.trim() || null`);

const TAP = `(() => { const e = document.getElementById('mg-tap'); e?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })); setTimeout(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })), 450); return 1; })()`;
for (const id of ['veg_stew', 'rice_ball', 'baked_yam', 'herb_salad']) {
  const r = { id, before: await pantryIds(), coinsBefore: await coins() };
  await sit();
  r.sheet = await ev(`[...document.querySelectorAll('#nb-dish-modal .nb-it b')].map(x => x.textContent)`);
  if (id === 'veg_stew') await shot('sheet');
  r.pick = await pick(id);
  r.open = await until(`document.getElementById('mg-layer')?.classList.contains('show') === true`, 6000);
  await b.sleep(1500);
  r.title = await ev(`document.getElementById('mg-title')?.textContent`);
  r.stump = await ev(`(async () => { const K = await import('/js/spaces/kitchen-stage.js'); return !!K.kset && K.kset.base.every(o => !o.visible); })()`);
  await shot(`game-${id}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !(await ev(`document.getElementById('mg-result')?.classList.contains('show') === true`))) { await ev(TAP); await b.sleep(600); }
  await b.sleep(500);
  r.result = await ev(`({ ico: document.getElementById('mgr-ico')?.textContent, title: document.getElementById('mgr-title')?.textContent, sub: document.getElementById('mgr-sub')?.textContent, btn: document.getElementById('mgr-close')?.textContent })`);
  await shot(`result-${id}`);
  await ev(`document.getElementById('mgr-close').click()`);
  await b.sleep(1500);
  r.back = await ev(`(async () => { const K = await import('/js/spaces/kitchen-stage.js'); return { seated: (await import('/js/spaces/neighbor.js')).neighborSeated(), mg: document.getElementById('mg-layer')?.classList.contains('show'), kitchenBack: K.kset.base.every(o => o.visible) }; })()`);
  await shot(`plate-${id}`);
  r.after = await pantryIds(); r.coinsAfter = await coins();
  await stand();
  log.runs.push(r);
}

log.fails = [];
await ev(`(async () => { (await import('/js/game.js')).gameState.pantry = ${JSON.stringify(PANTRY.slice(0, 2))}; return true; })()`);
for (const mode of ['upstream', 'dup', 'full', 'login', 'limit', 'throw']) {
  await ev(`window.__leave.mode = '${mode}'`);
  const r = { mode, before: await pantryIds(), coinsBefore: await coins() };
  await sit();
  r.pick = await pick('veg_stew');
  await until(`document.getElementById('mg-layer')?.classList.contains('show') === true`, 6000);
  const t1 = Date.now();
  while (Date.now() - t1 < 30000 && (await ev(`document.getElementById('mg-layer')?.classList.contains('show') === true`))) { await ev(TAP); await b.sleep(600); }
  await b.sleep(400);
  r.toast = await toastText();
  r.open = await ev(`document.getElementById('mg-layer')?.classList.contains('show')`);
  if (mode === 'dup') await shot('fail-dup');
  r.after = await pantryIds(); r.coinsAfter = await coins();
  await stand();
  log.fails.push(r);
}

await ev(`window.__leave.mode = 'ok'`);
{
  const r = { before: await pantryIds(), calls: (await ev(`window.__calls.length`)) };
  await sit();
  await pick('veg_stew');
  await until(`document.getElementById('mg-layer')?.classList.contains('show') === true`, 6000);
  await b.sleep(800);
  await ev(`document.getElementById('mg-quit').click()`);
  await b.sleep(1500);
  r.open = await ev(`document.getElementById('mg-layer')?.classList.contains('show')`);
  r.after = await pantryIds(); r.callsAfter = await ev(`window.__calls.length`); r.seated = await ev(`(async () => (await import('/js/spaces/neighbor.js')).neighborSeated())()`);
  await stand();
  log.abandon = r;
}
await ev(`(async () => { (await import('/js/supabase-client.js')).state.isGuest = true; return true; })()`);
await sit();
log.guest = { toast: await toastText(), modal: await ev(`document.getElementById('nb-dish-modal')?.classList.contains('show') || false`) };
await stand();
await ev(`(async () => { const a = await import('/js/supabase-client.js'); a.state.isGuest = false; (await import('/js/game.js')).gameState.pantry = [{ id: 'free:crop+fish', score: 80 }]; return true; })()`);
await sit();
log.empty = { toast: await toastText() };
await stand();
log.calls = await ev(`window.__calls`);
console.log(JSON.stringify(log, null, 1));
await h.close();
process.exit(0);
