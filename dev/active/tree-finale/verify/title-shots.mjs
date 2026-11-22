import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const h = await open(dev, 9600 + Math.floor(Math.random() * 90));
await h.enterGame('bear');
await h.ev(`(async () => { const a = await import('/js/supabase-client.js'); a.state.isGuest = false; return 1; })()`);
const out = {};
for (const f of ['picker', 'board', 'head', 'chip']) {
  out[f] = await h.ev(`(async () => { const m = await import('/dev/active/tree-finale/verify/title-mock.js'); return m.${f}(); })()`);
  await h.b.sleep(1500);
  await h.b.shot(path.join(OUT, `t-${dev}-${f}.png`));
}
console.log(JSON.stringify(out));
await h.close();
process.exit(0);
