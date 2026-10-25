import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from '../neighbor-indoor/verify/harness.mjs';

const DEV = process.argv[2] || 'pc';
const OUT = path.resolve(import.meta.dirname, 'shots'); mkdirSync(OUT, { recursive: true });
const h = await open(DEV === 'mobile' ? { w: 390, h: 844, mobile: true, cdpPort: 9374 } : { cdpPort: 9375 });
const { b, ev } = h;
const HIDE_SPOT = `(() => { const l = document.getElementById('spot-layer'); if (l) l.style.display = 'none'; document.body.classList.remove('spot-on'); return !!l; })()`;
const shot = (n) => b.shot(path.join(OUT, `${DEV}-banner-${n}.png`));
await h.enterGame('unlocks=off&time=0.4');
await b.sleep(3000);
for (let i = 0; i < 6; i++) {
  const hit = await ev(`(() => { const t = [...document.querySelectorAll('button, [role=button], a')].find(x => x.offsetParent && /건너뛰기|Skip/.test(x.textContent)); t?.click(); return !!t; })()`);
  await b.sleep(900);
  if (!hit && i > 1) break;
}
console.log('spot', await ev(`!!document.querySelector('[class*=spot]') && [...document.querySelectorAll('[class*=spot]')].filter(e => e.offsetParent).map(e => e.className).slice(0, 4)`));
await ev(`(async () => { const g = await import('/js/game.js'); g.gameState.hintsSeen.neighborGate = false; g.player.position.set(-4, 0, 30); g.player.rotation.y = Math.PI; g.snapCamera(); })()`);
await b.sleep(1500);
for (let i = 0; i < 12; i++) {
  await ev(`(async () => { const g = await import('/js/game.js'); g.player.position.z -= 0.25; })()`);
  await b.sleep(250);
}
await b.sleep(2500);
console.log('hidden', await ev(HIDE_SPOT)); await b.sleep(600);
await shot('1-gate-first');
await ev(`(async () => { const g = await import('/js/game.js'); g.ui.hideHintBanner?.(); document.body.classList.remove('hintbanner'); })()`);
await b.sleep(1500);
await ev(HIDE_SPOT); await b.sleep(400);
await shot('2-gate-prompt');
await ev(`(async () => { const g = await import('/js/game.js'); g.player.position.set(2, 0, 6); g.snapCamera();
  g.ui.showHintBanner?.({ ico: '🏡', title: '오늘의 이웃이 기다려요', line: '눌러서 이웃 마을 구경 가기', near: () => true, attention: true, onTap: () => {}, onDismiss: () => {} }); })()`);
await b.sleep(2500);
await ev(HIDE_SPOT); await b.sleep(400);
await shot('3-daily');
await h.close();
console.log('ok');
process.exit(0);
