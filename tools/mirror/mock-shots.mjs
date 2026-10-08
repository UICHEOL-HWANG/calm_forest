#!/usr/bin/env node
// 🪞 시안 캡처 — 단독 시안 HTML(dev/active/mirror-village/mockups/*.html)을 PC·모바일로 찍는다
// 사용: python3 scripts/serve.py 8033 후 node tools/mirror/mock-shots.mjs <page.html> <out-dir> <query1> [query2 ...] [--port N]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { launch } from '../store-shots/cdp.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const pi = args.indexOf('--port'); const port = pi >= 0 ? +args.splice(pi, 2)[1] : 9391;
const [page, outDir, ...queries] = args;
const OUT = path.join(ROOT, 'dev', 'active', 'mirror-village', 'mockups', outDir);
mkdirSync(OUT, { recursive: true });
const DEV = { pc: { w: 1280, h: 720, dsf: 1 }, m: { w: 390, h: 844, dsf: 2, touch: true, mobile: true } };
const b = await launch(port);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);
for (const [dn, D] of Object.entries(DEV)) {
  await b.viewport(D.w, D.h, D);
  for (const q of queries) {
    await b.goto(`http://127.0.0.1:8033/dev/active/mirror-village/mockups/${page}?${q}`, 6000);
    const name = q.replace(/[=&]/g, '-');
    await b.shot(`${OUT}/${dn}-${name}.png`);
    console.log('shot', dn, q);
  }
}
await b.close(); process.exit(0);
