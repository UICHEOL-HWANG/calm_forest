#!/usr/bin/env node
// 🪞 시안 캡처 — 마을 정류장 위치 후보 3곳에 임시 모형을 꽂아 실제 게임 화면으로 찍는다(오프라인, 운영 기록 차단)
// 사용: python3 scripts/serve.py 8033 후 node tools/mirror/mock-stop.mjs [pc|mobile] [CDP 포트]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { launch } from '../store-shots/cdp.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'dev', 'active', 'mirror-village', 'mockups', 'stop');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc', port = +(process.argv[3] || 9381);
const D = dev === 'pc' ? { w: 1280, h: 720, dsf: 1 } : { w: 390, h: 844, dsf: 2, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' };
const b = await launch(port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(D.w, D.h, D);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);
const ev = async (e) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]); } catch (x) { return 'ERR ' + x.message; } };
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
await b.goto(`http://127.0.0.1:8033/?dbg=1&weather=clear&time=0.42`, 9000);
for (let i = 0; i < 30; i++) { if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break; await b.sleep(1000); }
await b.sleep(3500);
await ev(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click(); [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK/.test(x.textContent))?.click(); return true; })()`);
await b.sleep(2500);
for (let i = 0; i < 12; i++) { const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } } const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인|Skip|Got it|Close|OK)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`); if (!hit && i > 3) break; await b.sleep(1500); }
await ev(`document.body.classList.add('playing'); __dream.day()`);

// 후보: [라벨, x, z, 회전, 플레이어 서는 자리(정류장 남쪽 앞)]
const CANDS = [
  ['a', 16, 17, Math.PI, '호수 남쪽 잔디'],
  ['b', 22.5, 9, -Math.PI / 2, '호수 동쪽 기슭'],
  ['c', 5, -15.6, Math.PI, '나루터 옆'],
];
await ev(`(async () => {
  const THREE = await import('three');
  const S = window.__scene;
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
  const sign = (txt) => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const g = cv.getContext('2d');
    g.fillStyle = '#fff8ea'; g.fillRect(0, 0, 512, 160); g.fillStyle = '#4a3a2a'; g.font = 'bold 64px "Apple SD Gothic Neo", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 82);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshBasicMaterial({ map: t }); };
  window.__mockStops = [];
  for (const [id, x, z, ry] of ${JSON.stringify(CANDS)}) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    const wood = m(0xb98a5e), roof = m(0x6f8fc9);
    for (const sx of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.3, 6), wood); p.position.set(sx, 1.15, -0.4); g.add(p); }
    const r = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 1.3), roof); r.position.set(0, 2.36, -0.25); r.rotation.x = -0.12; g.add(r);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.45), wood); bench.position.set(0, 0.48, -0.55); g.add(bench);
    for (const sx of [-0.75, 0.75]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.4), wood); l.position.set(sx, 0.23, -0.55); g.add(l); }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), m(0x8a8f99)); post.position.set(1.7, 1.3, 0.2); g.add(post);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), sign('🚏 ' + id.toUpperCase())); s.position.set(1.7, 2.35, 0.27); s.rotation.y = Math.PI; g.add(s);
    const s2 = s.clone(); s2.rotation.y = 0; s2.position.z = 0.13; g.add(s2);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    S.add(g); window.__mockStops.push(g);
  }
  return window.__mockStops.length;
})()`);
for (const [id, x, z, , name] of CANDS) {
  await ev(`__tp(${x - 1.4}, ${z + 2.6})`);
  await b.sleep(2500);
  await b.shot(`${OUT}/${dev}-${id}.png`);
  console.log('shot', id, name);
}
await b.close(); process.exit(0);
