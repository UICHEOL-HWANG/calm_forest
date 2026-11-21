import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
await h.enterGame('bear');
const info = [];
for (const v of ['A', 'B', 'C']) {
  for (const [i, k] of [[1, 0.2], [2, 0.55], [3, 0.9]]) {
    info.push(await h.ev(`(async () => { const m = await import('/dev/active/tree-finale/verify/finale-mock.js'); return m.pose('${v}', ${k}); })()`));
    await h.b.sleep(1400);
    await h.b.shot(path.join(OUT, `${dev}-${v}${i}.png`));
  }
}
console.log(JSON.stringify(info));
await h.close();
process.exit(0);
