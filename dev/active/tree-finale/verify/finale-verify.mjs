import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
await h.enterGame('bear');
await h.ev(`(() => { window.__errs = []; addEventListener('error', e => __errs.push(String(e.message))); addEventListener('unhandledrejection', e => __errs.push(String(e.reason))); return 1; })()`);
const shot = async (name) => { await h.b.shot(path.join(OUT, `v-${dev}-${name}.png`)); };
const tap = () => h.ev(`document.getElementById('finale-modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); 1`);
const busy = `(async () => (await import('/js/spaces/tree-finale.js')).finaleBusy())()`;
const idle = `(async () => !(await import('/js/spaces/tree-finale.js')).finaleBusy())()`;
const G = `(await import('/js/game.js'))`;

const npcs = () => h.ev(`(async () => ${G}.npcObjs.filter(o => o.group && !o.hidden).map(o => ({ id: o.def.id, x: +o.group.position.x.toFixed(3), y: +o.group.position.y.toFixed(3), z: +o.group.position.z.toFixed(3), spr: (() => { let n = 0; o.group.traverse(c => { if (c.isSprite && c.visible) n++; }); return n; })() })))()`);
const hud = () => h.ev(`(() => { const c = document.getElementById('fin-cap'); const k = document.getElementById('fin-card'); return { cap: c ? c.style.opacity : null, card: k ? k.style.display : null, cine: document.body.classList.contains('cine-open') }; })()`);
const maxMove = (a, b) => Math.max(0, ...a.map((p, i) => Math.hypot(p.x - b[i].x, p.z - b[i].z)));

const clearBlockers = () => h.ev(`(() => { document.getElementById('story-close')?.click(); document.getElementById('coach-skip')?.click(); document.querySelector('#spot-layer .sp-skip')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1; })()`);

const dc = async (ch) => {
  await h.ev(`(async () => { const g = ${G}; g.gameState.story.ch = ${ch}; g.gameState.hintsSeen.treeFinale = '2000-01-01'; window.__tp(4, -27); return 1; })()`);
  await h.b.sleep(2500);
  const r = [];
  for (let i = 0; i < 3; i++) r.push(await h.ev('window.__perf().calls'));
  return r;
};

for (let i = 0; i < 6; i++) { await clearBlockers(); await h.b.sleep(900); }
await h.ev(`window.__dream.day()`);
const dc8 = await dc(8);
const dc9 = await dc(9);
await h.ev(`(async () => { const g = ${G}; g.gameState.story.ch = 8; delete g.gameState.hintsSeen.treeFinale; window.__tp(0, 0); return 1; })()`);
await h.b.sleep(1500);

const before = await npcs();
await h.ev(`(async () => { const g = ${G}; g.gameState.story.ch = 9; delete g.gameState.hintsSeen.treeFinale; return 1; })()`);
let started = false;
for (let i = 0; i < 40 && !started; i++) {
  await clearBlockers();
  started = await h.ev(busy) === true;
  if (!started) await h.b.sleep(500);
}
const blocked = started ? null : await h.ev(`(async () => ({ pending: (await import('/js/guide/modal-queue.js')).modalQueue.pending('story'), shown: [...document.querySelectorAll('.modal.show, [id$="-modal"].show')].map(e => e.id) }))()`);
const capIs = (v) => h.until(`document.getElementById('fin-cap')?.style.opacity === '${v}'`, 60000);
await h.b.sleep(500); await shot('1-fly');
const hud1 = await hud();
await capIs('1');
await h.b.sleep(1500); await shot('2-root');
const hud2 = await hud();
const rootA = await npcs();
await h.b.sleep(300);
const rootB = await npcs();
await capIs('0');
await h.b.sleep(700); await shot('3-bloom');
const hud3 = await hud();
await h.until(`document.getElementById('fin-card')?.style.display === 'block'`, 60000);
await h.b.sleep(600); await shot('4-card');
const hud4 = await hud();
await tap();
await h.until(idle, 60000);
await h.b.sleep(1200); await shot('5-after');
const after = await npcs();
const hud5 = await hud();

await h.ev(`(async () => { (await import('/js/spaces/world-tree.js')).openWorldTree(); return 1; })()`);
await h.b.sleep(800); await shot('6-board');
const board = await h.ev(`(() => { const r = document.getElementById('tb-title-row'); const b = document.querySelector('.tb-title-btn'); const q = (e) => e && e.getBoundingClientRect(); return { row: q(r) && [q(r).left, q(r).right, q(r).height], btn: q(b) && [q(b).left, q(b).right], vw: innerWidth, sw: document.documentElement.scrollWidth }; })()`);
await h.ev(`document.querySelector('.tb-title-btn').click(); 1`);
await h.until(busy, 5000);
await h.b.sleep(1500);
await tap();
await h.b.sleep(400); await shot('7-skip-card');
await tap();
await h.until(idle, 60000);
await h.b.sleep(800);

await h.ev(`(async () => { window.__tp(4, -27); window.__dream.night(); return 1; })()`);
await h.b.sleep(2500); await shot('8-night');
await h.ev(`window.__dream.day()`);
await h.b.sleep(1500); await shot('9-day-tree');

const seen = await h.ev(`(async () => ${G}.gameState.hintsSeen.treeFinale)()`);
const jsErrs = await h.ev('window.__errs');
const jitter = maxMove(rootA, rootB);
const back = Math.max(0, ...before.map(p => { const q = after.find(n => n.id === p.id); return q ? Math.hypot(p.x - q.x, p.z - q.z) : 0; }));
const dy = Math.max(0, ...rootA.map(p => Math.abs(p.y - (before.find(n => n.id === p.id)?.y ?? 0))));
console.log(JSON.stringify({ dev, seen, jsErrs, started, blocked, dc8, dc9, hud: [hud1, hud2, hud3, hud4, hud5], sprRoot: rootA.reduce((s, n) => s + n.spr, 0), sprBefore: before.reduce((s, n) => s + n.spr, 0), sprAfter: after.reduce((s, n) => s + n.spr, 0), npcN: before.length, jitter, back, dy, board }));
await h.close();
process.exit(0);
