import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './dish-harness.mjs';

const OUT = process.env.OUT || path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'phone';
const h = await open(dev, 9600 + Math.floor(Math.random() * 80));
const { b, ev } = h;
await h.enterGame('bear');
const COURSE = {
  pot: { id: 'veg_stew', name: '든든한 채소죽', ico: '🥘', keys: ['crop', 'crop', 'crop'], grillKey: '', course: [{ mg: 'pot', mult: 1, weight: 1, ico: '🍲', name: '끓이기', tip: '바늘이 초록 구간에 올 때 탭!' }] },
  chop: { id: 'herb_salad', name: '들나물 무침', ico: '🥗', keys: ['forage'], grillKey: '', course: [{ mg: 'chop', mult: 1, weight: 1, ico: '🔪', name: '썰기', tip: '박자에 맞춰 탭!' }] },
};
for (const kind of ['table', 'blanket', 'stump']) {
  for (const mg of ['pot', 'chop']) {
    const r = await ev(`(async () => { const g = await import('/js/game.js'); const K = await import('/js/spaces/kitchen-stage.js'); const A = await import('/js/neighbors/dish-stage-art.js'); const THREE = await import('three');
      g.ui.startCookCourse({ ...${JSON.stringify(COURSE[mg])}, where: 'kitchen', icos: ['🥕'] });
      await new Promise(r => setTimeout(r, 900));
      const k = K.kset; if (!k) return 'no kset';
      if (!window.__orig) window.__orig = k.group.children.slice(0, 8);
      window.__orig.forEach(o => { o.visible = false; });
      if (window.__bd) { k.group.remove(window.__bd); }
      if (window.__host) { k.group.remove(window.__host); }
      window.__bd = A.buildDishBackdrop(THREE, '${kind}'); k.group.add(window.__bd);
      const s = A.HOST_SEAT['${kind}'];
      window.__host = g.buildCharacterMesh('rabbit', { owned: [], equipped: {} }); window.__host.position.set(s.x, s.y, s.z); window.__host.rotation.y = s.ry; k.group.add(window.__host);
      return 'ok'; })()`);
    await b.sleep(1600);
    await b.shot(path.join(OUT, `stage-${dev}-${kind}-${mg}.png`));
    await ev(`document.getElementById('mg-quit')?.click()`);
    await b.sleep(700);
    await ev(`document.getElementById('mgr-close')?.click()`);
    await b.sleep(900);
    console.log(kind, mg, r);
  }
}
await h.close();
process.exit(0);
