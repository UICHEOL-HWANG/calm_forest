import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './dish-harness.mjs';

const OUT = process.env.OUT || path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'phone', me = process.argv[3] || 'bear';
const host = me === 'bear' ? 'rabbit' : 'bear';
const h = await open(dev, 9400 + Math.floor(Math.random() * 80));
const { b, ev } = h;
await h.enterGame(me);
const log = { dev, me };
for (const shape of ['round', 'long']) {
  log[shape] = { visit: await h.visit(host, shape) };
  log[shape].approach = await ev(`(async () => { const g = await import('/js/game.js');
    const t = g.scene.getObjectByName('neighbor')?.getObjectByName('yard-table'); if (!t) return 'no table';
    const p = t.getWorldPosition(t.position.clone()); window.__tp(p.x, p.z + 2.0); return [p.x, p.z]; })()`);
  await b.sleep(1500);
  log[shape].prompt = await ev(`(async () => ({ nd: (await import('/js/game.js')).nearDoor, text: document.getElementById('door-prompt')?.textContent?.trim() }))()`);
  await b.shot(path.join(OUT, `walk-${dev}-${me}-${shape}.png`));
  await ev(`(async () => { const s = await import('/js/spaces/neighbor.js'); s.neighborAction('nbsit'); return true; })()`);
  await b.sleep(2600);
  log[shape].seated = await ev(`(async () => { const g = await import('/js/game.js'); const s = await import('/js/spaces/neighbor.js'); const p = g.player.position;
    return { seated: s.neighborSeated(), pos: [+p.x.toFixed(2), +p.z.toFixed(2)], prompt: document.getElementById('door-prompt')?.textContent?.trim() }; })()`);
  await b.shot(path.join(OUT, `seat-${dev}-${me}-${shape}.png`));
  await ev(`(async () => { const s = await import('/js/spaces/neighbor.js'); s.neighborAction('nbstand'); s.exitNeighbor(); return true; })()`);
  await b.sleep(1500);
}
console.log(JSON.stringify(log));
await h.close();
process.exit(0);
