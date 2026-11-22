import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../../sims/glade-develop/art');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const MOCK = '/dev/active/glade-develop/verify/glade-mock.js';
const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
await h.enterGame('?dbg=1&weather=clear&time=0.9&house=6&unlocks=off&spawn=2,28');
const call = (expr) => h.ev(`(async () => { const m = await import('${MOCK}'); return JSON.stringify(${expr}); })()`);
console.log('ring', await call(`m.stand('strings')`));
await h.b.sleep(6000);
await h.dismiss(4);
for (const v of ['S1', 'S2', 'S3']) {
  console.log(v, await call(`m.strings('${v}')`));
  await h.b.sleep(1600);
  await h.b.shot(path.join(OUT, `${dev}-${v}.png`));
}
console.log('stand', await call(`m.stand('swarm')`));
for (const v of ['F1', 'F2', 'F3']) {
  console.log(v, await call(`m.swarm('${v}')`));
  await h.b.sleep(1600);
  await h.b.shot(path.join(OUT, `${dev}-${v}.png`));
}
await h.close();
process.exit(0);
