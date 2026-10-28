// Cave pest guidance mockups on the real game HUD: offline guest, dev session, inside the mining cave.
// usage: preview server running, then `node dev/archive/cave-delve/mockup/capture.mjs [port] [scene...]`
import { launch } from '../../../../tools/store-shots/cdp.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 8001;
const ONLY = process.argv.slice(3);
const BASE = `http://127.0.0.1:${PORT}/`;
const UA_AOS = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];

const DEVICES = [
  { id: 'pc', w: 1280, h: 800, opts: { dsf: 1 } },
  { id: 'phone', w: 375, h: 812, opts: { dsf: 2, touch: true, mobile: true, ua: UA_AOS } },
];

const SCENES = [
  { id: '0-common', banner: ['⛏️', '조각 도둑', '가방은 안전해요. 조각만 노려요'], prompt: null, act: null,
    items: [{ k: 'chunk', at: [-1.2, 0.5] }, { k: 'pest', id: 'grub', at: [-2.6, 1.4], face: [-1.2, 0.5] }] },
  { id: '1-bat', banner: ['🦇', '잎귀박쥐', '반짝이면 툭! 조각은 바로 주워요'], prompt: null, act: null,
    items: [{ k: 'chunk', at: [-1.3, 0.6] }, { k: 'ring', at: [-1.3, 0.6] }, { k: 'pest', id: 'bat', at: [1.4, -0.6], face: [-1.3, 0.6], carry: true, bubble: '💎' }] },
  { id: '2-axolotl', banner: ['🦎', '동굴 도롱뇽', '웅덩이 아가미를 톡 치면 뱉어요'], prompt: '❗ 톡 치기', act: '❗',
    items: [{ k: 'puddle', at: [1.3, -0.4] }, { k: 'pest', id: 'axolotl', opts: { submerged: true }, at: [1.3, -0.4], face: [0, 0] }] },
  { id: '3-grub', banner: ['🐛', '등불벌레', '놓쳐도 OK. 빛 자국 끝 굴로'], prompt: '⛏️ 굴 파기', act: '⛏️',
    items: [{ k: 'burrow', at: [1.2, -0.5] }, { k: 'trail', from: [-3.4, 1.6], to: [0.9, -0.3] }] },
  { id: '4-crab', banner: ['💎', '수정집게', '먹보예요. 🍄 미끼를 던져요'], prompt: '🍄 미끼 던지기', act: '🍄',
    items: [{ k: 'chunk', at: [-0.9, 0.3] }, { k: 'pest', id: 'crab', at: [-2.2, -0.7], face: [-0.9, 0.3], bubble: '😋' }] },
];

async function enterGame(b) {
  await b.goto(BASE + '?dbg=1&weather=clear&time=0.34', 9000);
  for (let i = 0; i < 30; i++) {
    const ok = await b.evaluate(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`);
    if (ok) break; await b.sleep(1000);
  }
  await b.sleep(3500);
  await b.evaluate(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰/.test(e.textContent)); c?.click();
    [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구/.test(x.textContent))?.click(); return true; })()`);
  await b.sleep(2500);
  for (let i = 0; i < 12; i++) {
    const hit = await b.evaluate(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
      const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
    if (!hit && i > 3) break;
    await b.sleep(1500);
  }
}

const SETUP = `(async () => {
  for (let i = 0; i < 40 && typeof window.__gs !== 'function'; i++) await new Promise(r => setTimeout(r, 500));
  const gs = window.__gs(); gs.hintsSeen = gs.hintsSeen || {}; gs.hintsSeen.mineInside = true;
  const mine = await import('/js/spaces/mine.js'); mine.enterMine();
  const g = await import('/js/game.js');
  const THREE = await import('three');
  const ph = new THREE.Box3().setFromObject(g.player).getSize(new THREE.Vector3()).y;
  window.__mk = { g, art: await import('/sims/cave-pest-art.mjs'), THREE, objs: [], k: 2.2 * ph / 1.6, floor: 0.15 };
  return { ph };
})()`;

const place = (scene) => `(() => {
  const { g, art, THREE, k, floor } = window.__mk;
  window.__mk.objs.forEach(o => o.parent && o.parent.remove(o)); window.__mk.objs = [];
  const P = g.player.position, add = (o) => { g.scene.add(o); window.__mk.objs.push(o); return o; };
  const sc = k / 1.6;
  const at = ([x, z], y = 0) => new THREE.Vector3(P.x + x * sc, floor + y * sc, P.z + z * sc);
  for (const it of ${JSON.stringify(scene.items)}) {
    if (it.k === 'chunk') { const c = add(art.makeOreChunk()); c.scale.setScalar(sc); c.position.copy(at(it.at, 0.12)); }
    if (it.k === 'ring') { const r = add(art.makeRing(0.5)); r.scale.setScalar(sc); r.position.copy(at(it.at, 0.02)); }
    if (it.k === 'puddle') { const p = add(art.makePuddle(0.85)); p.scale.setScalar(sc); p.position.copy(at(it.at, 0.0)); }
    if (it.k === 'burrow') { const p = add(art.makeBurrow()); p.scale.setScalar(sc); p.position.copy(at(it.at, 0.0)); }
    if (it.k === 'trail') { const n = 9, pts = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); const q = at([it.from[0] + (it.to[0] - it.from[0]) * t + Math.sin(t * 6) * 0.3, it.from[1] + (it.to[1] - it.from[1]) * t]); pts.push([q.x, q.z]); } const tr = add(art.makeTrail(pts)); tr.position.y = floor; tr.children.forEach(m => m.scale.setScalar(sc)); }
    if (it.k === 'pest') {
      const pest = art.makePest(it.id, it.opts); const o = add(pest.g); o.scale.setScalar(k);
      o.position.copy(at(it.at, pest.hover || 0));
      const f = at(it.face); o.rotation.y = Math.atan2(f.x - o.position.x, f.z - o.position.z);
      if (it.carry) { const c = add(art.makeOreChunk()); c.scale.setScalar(sc); c.position.copy(pest.holdAt.clone().multiplyScalar(k).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.rotation.y).add(o.position)); }
      if (it.bubble) { const b = add(art.emojiBubble(it.bubble, 0.85 * sc)); b.position.set(o.position.x, o.position.y + 1.3 * sc, o.position.z); }
    }
  }
  document.querySelectorAll('#toast').forEach(e => e.style.display = 'none');
  const [ico, title, line] = ${JSON.stringify(scene.banner)};
  document.getElementById('hb-ico').textContent = ico;
  document.getElementById('hb-title').textContent = title;
  document.getElementById('hb-line').textContent = line;
  const hb = document.getElementById('hint-banner'); hb.classList.remove('slot-bottom', 'attn', 'tap'); hb.classList.add('show'); document.body.classList.add('hintbanner');
  g.ui.setDoorPrompt?.(${JSON.stringify(scene.prompt)});
  const act = ${JSON.stringify(scene.act)}; if (act) document.getElementById('action-btn').textContent = act;
  return true;
})()`;

const MEASURE = `(() => {
  const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const box = (sel) => { const e = document.querySelector(sel); return vis(e) ? e.getBoundingClientRect() : null; };
  const hit = (a, b) => !!(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
  const hb = box('#hint-banner'), dp = box('#door-prompt'), line = document.getElementById('hb-line');
  const lh = parseFloat(getComputedStyle(line).lineHeight) || 16;
  const o = {};
  for (const s of ['#joy-base', '#action-btn', '#quest-panel', '#minimap', '#hotbar', '#topright', '#story-chip']) { const r = box(s); if (r) o[s] = { banner: hit(hb, r), prompt: hit(dp, r) }; }
  return { banner: hb && { top: Math.round(hb.top), left: Math.round(hb.left), w: Math.round(hb.width), h: Math.round(hb.height), lineLines: Math.round(line.getBoundingClientRect().height / lh) },
    prompt: dp && { top: Math.round(dp.top), w: Math.round(dp.width), text: document.getElementById('door-prompt').textContent }, overlaps: o };
})()`;

for (const d of DEVICES.filter(x => !process.env.DEV || x.id === process.env.DEV)) {
  const b = await launch(9461 + DEVICES.indexOf(d));
  await b.send('Network.enable');
  await b.send('Network.setCacheDisabled', { cacheDisabled: true });
  await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
  await b.viewport(d.w, d.h, d.opts);
  await enterGame(b);
  await b.sleep(2000);
  console.log(d.id, 'setup', await b.evaluate(SETUP));
  await b.sleep(2500);
  for (const s of SCENES) {
    if (ONLY.length && !ONLY.includes(s.id)) continue;
    await b.evaluate(place(s));
    await b.sleep(1200);
    await b.evaluate(place(s));
    await b.sleep(600);
    await b.evaluate(`(() => { document.getElementById('hint-banner').classList.add('show'); document.body.classList.add('hintbanner'); return 1; })()`);
    await b.sleep(250);
    const m = await b.evaluate(MEASURE);
    await b.shot(path.join(OUT, `${d.id}-${s.id}.png`));
    console.log(d.id, s.id, JSON.stringify(m));
  }
  if (b.logs.length) console.log(d.id, 'errors', b.logs.slice(0, 5));
  await b.close();
}
