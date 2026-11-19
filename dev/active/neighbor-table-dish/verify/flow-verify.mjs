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

const GO = `document.querySelector('#nb-cook-modal .nbc-go')`;
const down = () => ev(`${GO}.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }))`);
const up = () => ev(`${GO}.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))`);
async function play(id, aim) {
  if (id === 'rice_ball') { await down(); await b.sleep(aim === 3 ? 1330 : aim === 2 ? 1120 : 300); await up(); return; }
  if (id === 'herb_salad') { for (let i = 0; i < 3; i++) { await b.sleep(i < aim ? 760 : 300); await down(); } return; }
  const lo = aim === 3 ? 50 : aim === 2 ? 60 : 85, hi = aim === 3 ? 56 : aim === 2 ? 65 : 98;
  for (let k = 0; k < 400; k++) {
    const p = await ev(`parseFloat(document.querySelector('#nb-cook-modal .nbc-needle')?.style.left)`);
    if (p >= lo && p <= hi) { await down(); return; }
    await b.sleep(8);
  }
  await down();
}
const AIM = { veg_stew: 3, rice_ball: 3, baked_yam: 2, herb_salad: 3 };
for (const id of ['veg_stew', 'rice_ball', 'baked_yam', 'herb_salad']) {
  const r = { id, before: await pantryIds(), coinsBefore: await coins() };
  await sit();
  r.sheet = await ev(`[...document.querySelectorAll('#nb-dish-modal .nb-it b')].map(x => x.textContent)`);
  if (id === 'veg_stew') await shot('sheet');
  r.pick = await pick(id);
  r.open = await until(`document.getElementById('nb-cook-modal')?.classList.contains('show') === true`, 5000);
  await b.sleep(700);
  r.title = await ev(`document.querySelector('#nb-cook-modal h3')?.textContent`);
  await shot(`game-${id}`);
  await play(id, AIM[id]);
  await until(`document.querySelector('#nb-cook-modal .nbc-go')?.textContent === '좋아요'`, 6000);
  await b.sleep(400);
  r.result = await ev(`({ title: document.querySelector('#nb-cook-modal h3')?.textContent, stars: document.querySelectorAll('#nb-cook-modal .nbc-stars i.on').length, line: document.querySelector('#nb-cook-modal .nbc-res')?.textContent })`);
  await shot(`result-${id}`);
  await ev(`${GO}.click()`);
  await b.sleep(1200);
  r.back = await ev(`(async () => ({ seated: (await import('/js/spaces/neighbor.js')).neighborSeated(), open: document.getElementById('nb-cook-modal')?.classList.contains('show') }))()`);
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
  await until(`document.getElementById('nb-cook-modal')?.classList.contains('show') === true`, 5000);
  await b.sleep(400);
  await down();
  await b.sleep(1500);
  r.toast = await toastText();
  r.open = await ev(`document.getElementById('nb-cook-modal')?.classList.contains('show')`);
  if (mode === 'dup') await shot('fail-dup');
  r.after = await pantryIds(); r.coinsAfter = await coins();
  await stand();
  log.fails.push(r);
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
