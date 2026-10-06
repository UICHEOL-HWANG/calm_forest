// 썸네일 시안 캡처 — sims/thumbnail-sim.html 을 헤드리스 Chrome(CDP)으로 열어 규격 해상도 PNG 로 굽는다.
// 사용: python3 scripts/serve.py 8793 &  →  node dev/active/thumbnail-redesign/shoot.mjs [포트=8793] [시안 목록 ABC]
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/store-shots/cdp.mjs';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'look');
mkdirSync(OUT, { recursive: true });
const PORT = process.argv[2] || '8793';
const VARIANTS = (process.argv[3] || 'ABC').split('');
const SIZES = { toss: [1932, 828], og: [1200, 630], itch: [630, 500] };

const b = await launch(9344);
try {
  for (const v of VARIANTS) for (const [name, [w, h]] of Object.entries(SIZES)) {
    await b.viewport(w, h, { dsf: 1 });
    await b.goto(`http://127.0.0.1:${PORT}/sims/thumbnail-sim.html?v=${v}`, 1500);
    let ok = false;
    for (let i = 0; i < 60 && !ok; i++) { ok = await b.evaluate(`document.title==='READY'`); if (!ok) await b.sleep(500); }
    if (!ok) { console.log(v, name, 'FAIL', b.logs.slice(-3)); continue; }
    await b.sleep(600);
    console.log(await b.shot(path.join(OUT, `${v}-${name}.png`)));
  }
} finally { await b.close(); }
