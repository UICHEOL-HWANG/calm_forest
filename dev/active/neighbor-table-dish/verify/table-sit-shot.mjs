import { mkdirSync } from 'node:fs';
import { launch } from '/Users/uicheol_hwang/calm_forest/.claude/worktrees/merge-main/tools/store-shots/cdp.mjs';

const OUT = '/Users/uicheol_hwang/calm_forest/sims/neighbor-table-sit';
const BASE = 'http://127.0.0.1:8793/';
const DEV = {
  phone: { w: 360, h: 640, dsf: 2, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' },
  pc: { w: 1280, h: 720, dsf: 1 },
};
const dev = process.argv[2] || 'phone', d = DEV[dev];
mkdirSync(OUT, { recursive: true });
const b = await launch(dev === 'phone' ? 9341 : 9342);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(d.w, d.h, d);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);
const ev = async (e, ms = 20000) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), ms))]); } catch (x) { return 'ERR ' + x.message; } };

await b.goto(BASE + '?dbg=1&weather=clear&time=0.36&house=6&e3=on', 9000);
for (let i = 0; i < 30; i++) {
  if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break;
  await b.sleep(1000);
}
await b.sleep(3500);
for (let i = 0; i < 30; i++) {
  const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click();
    const n=document.querySelector('#char-modal input'); if (n && !n.value) { n.value='도토리숲'; n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true})); }
    [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK|friend/i.test(x.textContent))?.click(); return 'open'; })()`);
  if (r === 'closed' && i > 2) break;
  await b.sleep(1000);
}
await b.sleep(2500);
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'daily-ok', 'weekly-close', 'notice-ok'];
const dismiss = async (n) => { for (let i = 0; i < n; i++) {
  const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
    const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
  if (!hit && i > 2) break;
  await b.sleep(1300);
} };
await dismiss(12);

console.log('setup:', await ev(`(async () => {
  const g = await import('/js/game.js'), T = await import('/js/table/index.js'), THREE = await import('three');
  for (const id of ['veg_stew','rice_ball','baked_yam','herb_salad']) g.gameState.kitchen.best[id] = 95;
  T.refreshTable('load');
  const p = T.tablePos(); if (!p) return 'no table';
  const anchor = g.player.children[0];
  const host = g.buildAnimalMesh('rabbit').group; g.scene.add(host);
  const css = document.createElement('style');
  css.textContent = '#hotbar,#quest-panel,#story-chip,#toast,#joystick,#action-btn,#sea-btn,#topleft,#topright,#coach,#tool-wheel,.hintbanner{display:none!important}' +
    '#mg{position:fixed;z-index:50;transform:translate(-50%,-100%);background:#fff;border-radius:14px;padding:7px 9px 6px;box-shadow:0 4px 14px rgba(30,50,40,.3);text-align:center;font:700 12px system-ui;color:#2f4a3c;white-space:nowrap}' +
    '#mg::after{content:"";position:absolute;left:50%;bottom:-7px;transform:translateX(-50%);border:7px solid transparent;border-bottom:0;border-top:7px solid #fff}' +
    '#mg .bar{position:relative;width:120px;height:14px;border-radius:7px;background:#eef2ee;overflow:hidden}' +
    '#mg .bar i{position:absolute;top:0;bottom:0}#mg .beats{display:flex;gap:8px}#mg .beats b{width:26px;height:26px;border-radius:50%;background:#eef2ee;display:grid;place-items:center;font-size:14px}' +
    '#mg .beats b.hit{background:#bfe8cf}#mg .beats b.now{outline:3px solid #f2c23c;outline-offset:3px}' +
    '#mgh{position:fixed;z-index:50;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translateX(-50%);background:rgba(255,255,255,.9);border-radius:14px;padding:9px 16px;font:800 13px system-ui;color:#2f4a3c;box-shadow:0 3px 10px rgba(40,60,50,.2);white-space:nowrap}' +
    '#mgt{position:fixed;z-index:50;top:calc(10px + env(safe-area-inset-top));left:12px;right:12px;background:rgba(255,255,255,.86);border-radius:12px;padding:7px 8px;font:700 13px system-ui;color:#2f4a3c;text-align:center;box-shadow:0 3px 10px rgba(40,60,50,.14)}';
  document.head.appendChild(css);
  for (const id of ['mg','mgh','mgt']) { const e = document.createElement('div'); e.id = id; document.body.appendChild(e); }
  document.getElementById('mgt').textContent = '🏡 달빛마을 의 마을';
  const v = new THREE.Vector3();
  window.__sit = null;
  g.scene.onBeforeRender = () => {
    const s = window.__sit; if (!s) return;
    g.player.position.set(p.x + s.me[0], 0, p.z + s.me[1]); g.player.rotation.y = s.me[2];
    anchor.position.y = s.y; anchor.rotation.set(s.lean, 0, 0); anchor.scale.set(1, 1, 1);
    if (anchor.children[0]) anchor.children[0].visible = false;
    g.player.updateMatrixWorld(true);
    host.position.set(p.x + s.host[0], s.y, p.z + s.host[1]); host.rotation.y = s.host[2]; host.updateMatrixWorld(true);
    if (s.cam) { const k = innerWidth < innerHeight ? s.kp : 1; g.camera.position.set(p.x + s.look[0] + (s.cam[0] - s.look[0]) * k, s.look[1] + (s.cam[1] - s.look[1]) * k, p.z + s.look[2] + (s.cam[2] - s.look[2]) * k); g.camera.lookAt(p.x + s.look[0], s.look[1], p.z + s.look[2]); g.camera.updateMatrixWorld(true); }
    v.set(p.x + s.dish[0], 1.12, p.z + s.dish[1]).project(g.camera);
    const m = document.getElementById('mg'); m.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; m.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  };
  for (const e of document.body.children) if (!['mg','mgh','mgt'].includes(e.id) && !e.contains(g.renderer.domElement) && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE') e.style.setProperty('display', 'none', 'important');
  const mine = (o) => { for (let q = o; q; q = q.parent) if (q === g.player || q === host || q.name === 'yard-table') return true; return false; };
  window.__hideNear = () => { let n = 0;
    g.scene.traverse(o => { if (!(o.isMesh || o.isSprite) || mine(o)) return; o.getWorldPosition(v); if (v.y > 0.25 && Math.hypot(v.x - p.x, v.z - p.z) < 3.4) { o.visible = false; n++; } });
    return n; };
  window.__tp(p.x, p.z + 1.6);
  return 'table at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1);
})()`));
await b.sleep(2500);
await dismiss(4);

const PI = Math.PI;
const GAUGE = {
  season: ['<div class="bar"><i style="left:55%;width:30%;background:#bfe8cf"></i><i style="left:66%;width:10%;background:#7fcf9c"></i><i style="left:0;width:62%;background:rgba(242,194,60,.75)"></i></div>', '🧂 꾹 눌렀다가 초록에서 떼세요'],
  grill: ['<div class="bar"><i style="left:40%;width:26%;background:#bfe8cf"></i><i style="left:49%;width:8%;background:#7fcf9c"></i><i style="left:44%;width:4px;background:#2f4a3c"></i></div>', '🔥 바늘이 초록일 때 누르세요'],
  chop: ['<div class="beats"><b class="hit">🌿</b><b class="now">🌿</b><b>🌿</b></div>', '🌿 고리가 맞을 때 누르세요'],
  done: ['⭐⭐⭐', '🍽️ 식탁에 올렸어요 · 🪙+5'],
};
const SCENES = [
  ['A-back', { me: [0, 1.18, PI], host: [0, -1.18, 0], y: 0.41, lean: 0, dish: [0, 0.6] }, 'season'],
  ['B-side', { me: [-1.18, 0, PI / 2], host: [1.18, 0, -PI / 2], y: 0.41, lean: 0.12, dish: [-0.52, 0.3], cam: [0, 4.4, 5.6], look: [0, 0.8, 0], kp: 1.7 }, 'grill'],
  ['C-shoulder', { me: [0, 1.3, PI], host: [0, -1.18, 0], y: 0.41, lean: 0.16, dish: [0, 0.6], cam: [1.7, 2.9, 4.2], look: [0, 0.95, -0.1], kp: 1.45 }, 'chop'],
  ['D-done', { me: [-1.18, 0, PI / 2], host: [1.18, 0, -PI / 2], y: 0.41, lean: 0, dish: [-0.52, 0.3], cam: [0, 4.4, 5.6], look: [0, 0.8, 0], kp: 1.7 }, 'done'],
];
for (const [name, sit, mg] of SCENES) {
  if (process.argv[3] && !name.startsWith(process.argv[3])) continue;
  await ev(`(() => { window.__sit = ${JSON.stringify(sit)}; document.getElementById('mg').innerHTML = ${JSON.stringify(GAUGE[mg][0])}; document.getElementById('mgh').textContent = ${JSON.stringify(GAUGE[mg][1])}; return 1; })()`);
  await b.sleep(1200); console.log('hidden', await ev('window.__hideNear()')); await b.sleep(1200);
  await b.shot(`${OUT}/${dev}-${name}.png`);
  console.log('shot', dev, name);
}
if (b.logs.length) console.log('logs:', b.logs.slice(0, 5).join('\n'));
clearInterval(front);
await b.close();
process.exit(0);
