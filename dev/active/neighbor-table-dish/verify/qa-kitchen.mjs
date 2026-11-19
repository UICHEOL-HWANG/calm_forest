import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './dish-harness.mjs';

const OUT = process.env.OUT || path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'phone';
const h = await open(dev, 9800 + Math.floor(Math.random() * 80));
const { b, ev, until } = h;
const TAP = `(() => { const e = document.getElementById('mg-tap'); e?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 })); setTimeout(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })), 450); return 1; })()`;
const state = () => ev(`(async () => { const g = await import('/js/game.js'); const K = await import('/js/spaces/kitchen-stage.js');
  return { cooked: g.gameState.kitchen.cooked | 0, best: g.gameState.kitchen.best.veg_stew | 0, pantry: g.gameState.pantry.map(f => f.id), crop: g.gameState.inventory.crop | 0,
    kitchenBase: K.kset ? K.kset.base.every(o => o.visible) : null }; })()`);
async function kitchenRound(tag) {
  const r = { before: await state() };
  r.start = await ev(`(async () => { const { Input } = await import('/js/game-lazy.js'); const g = await import('/js/game.js'); const st = Input.kitchenStart('veg_stew'); if (!st.ok) return st; g.ui.startCookCourse(st); return 'ok'; })()`);
  await until(`document.getElementById('mg-layer')?.classList.contains('show') === true`, 6000);
  const t0 = Date.now();
  while (Date.now() - t0 < 30000 && !(await ev(`document.getElementById('mg-result')?.classList.contains('show') === true`))) { await ev(TAP); await b.sleep(600); }
  await b.sleep(500);
  r.result = await ev(`({ close: document.getElementById('mgr-close').textContent, stats: getComputedStyle(document.getElementById('mgr-stats')).display !== 'none' && /점수/.test(document.getElementById('mgr-stats').textContent),
    choice: getComputedStyle(document.getElementById('mgr-choice')).display !== 'none', again: getComputedStyle(document.getElementById('mgr-again')).display !== 'none', sub: document.getElementById('mgr-sub').textContent })`);
  r.kitchenBaseDuring = (await state()).kitchenBase;
  await b.shot(path.join(OUT, `qa-${dev}-kitchen-${tag}.png`));
  await ev(`document.getElementById('mgr-store').click()`);
  await b.sleep(1200);
  r.after = await state();
  return r;
}
await h.enterGame('bear');
await ev(`(async () => { const g = await import('/js/game.js'); const a = await import('/js/supabase-client.js'); a.state.isGuest = false; g.gameState.inventory.crop = 20; g.gameState.pantry = []; return true; })()`);
const log = { dev };
log.k1 = await kitchenRound('before');
log.visit = await h.visit('rabbit', 'round', `A.dishLeave = async (pid, recipe, score) => ({ ok: true, reason: 'ok', stars: score >= 88 ? 3 : score >= 65 ? 2 : 1, rewarded: true });`);
log.neighborBefore = await state();
await ev(`(async () => { const g = await import('/js/game.js'); const t = g.scene.getObjectByName('neighbor').getObjectByName('yard-table'); const p = t.getWorldPosition(t.position.clone()); window.__tp(p.x, p.z + 2.0); return 1; })()`);
await b.sleep(900);
await ev(`(async () => { (await import('/js/spaces/neighbor.js')).neighborAction('nbsit'); return 1; })()`);
await b.sleep(1600);
await ev(`(() => { const m = document.getElementById('nb-dish-modal'); m.querySelector('.nb-it').click(); [...m.querySelectorAll('.nb-btn')].find(x => x.textContent.includes('차려 주기')).click(); return 1; })()`);
await until(`document.getElementById('mg-layer')?.classList.contains('show') === true`, 6000);
const t1 = Date.now();
while (Date.now() - t1 < 30000 && !(await ev(`document.getElementById('mg-result')?.classList.contains('show') === true`))) { await ev(TAP); await b.sleep(600); }
await b.sleep(500);
log.neighborResult = await ev(`({ close: document.getElementById('mgr-close').textContent, stats: getComputedStyle(document.getElementById('mgr-stats')).display })`);
await ev(`document.getElementById('mgr-close').click()`);
await b.sleep(1200);
log.neighborAfter = await state();
await ev(`(async () => { const s = await import('/js/spaces/neighbor.js'); s.neighborAction('nbstand'); s.exitNeighbor(); return 1; })()`);
await b.sleep(1500);
log.k2 = await kitchenRound('after');
console.log(JSON.stringify(log, null, 1));
await h.close();
process.exit(0);
