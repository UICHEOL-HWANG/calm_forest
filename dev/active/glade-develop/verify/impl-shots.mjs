import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../../../../sims/glade-develop/impl');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const BASE_Q = '?dbg=1&weather=clear&time=0.9&house=6&unlocks=off&spawn=7.2,29.2';
for (const name of process.argv.slice(3)) {
  const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
  await h.enterGame((name.includes('time=') ? BASE_Q.replace('&time=0.9', '') : BASE_Q) + '&' + name);
  const quiet = `(async () => { (await import('/js/game.js')).gameState.tutorialSeen = true; document.getElementById('coach-skip')?.click(); document.querySelector('#spot-layer .sp-skip')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1; })()`;
  const file = path.join(OUT, `${dev}-${name.replace(/[^a-z0-9]+/gi, '_')}`);
  let banner = null;
  for (let waited = 0; waited < (name.includes('gswarm') ? 9000 : 14000); waited += 500) {
    await h.ev(quiet);
    if (await h.ev(`(async () => (await import('/js/game.js')).ui.anyModalOpen())()`) === true) await h.dismiss(1);
    const text = banner ? null : await h.ev(`(() => { const e = document.getElementById('hint-banner'); return e && e.classList.contains('show') && /(도는|내려앉은|빛) 밤|줄등|큰 반디| night|String light|big firefly/i.test(document.getElementById('hb-title').textContent) ? e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 90) : null; })()`);
    if (text && text !== 'TIMEOUT') { banner = text; await h.b.shot(file + '-banner.png'); }
    await h.b.sleep(500);
  }
  await h.dismiss(4);
  const info = await h.ev(`(async () => { const g = await import('/js/game.js'); const r = g.renderer; await new Promise(f => requestAnimationFrame(f)); r.info.autoReset = false; r.info.reset(); for (let i = 0; i < 10; i++) await new Promise(f => requestAnimationFrame(f)); const calls = Math.round(r.info.render.calls / 10); r.info.autoReset = true; return JSON.stringify({ calls, bugs: g.gladeBugs.length, caught: g.gameState.hintsSeen.gladeCaught | 0, seen: g.gameState.hintsSeen.gladeNightSeen || null }); })()`);
  console.log(name, info, banner ? 'banner: ' + banner : 'no banner');
  await h.b.shot(file + '.png');
  await h.close();
}
process.exit(0);
