#!/usr/bin/env node
// =============================================================
//  🪞 거울 마을 통과 검수 — 조형물 중심에 세워 밀려나는지 본다(안 밀리면 걸어서 통과 = 결함)
//  ------------------------------------------------------------
//  사용: 워크트리 루트를 8033 으로 서빙(python3 scripts/serve.py 8033) 후
//        node tools/mirror/collide.mjs [pc] [CDP 포트=9425]   → PASS/FAIL
//  ⚠️ 함정(tools/dream/qa.mjs 와 같다)
//   · 헤드리스 탭이 hidden 이면 rAF 0 → 포커스 에뮬레이션 + 0.7초마다 bringToFront
//   · 헤드리스는 ≈5fps — 탑승 연출은 시간 대기 대신 __mirror.state() 폴링
//   · 맨 localhost 는 운영 Supabase 에 기록된다 — 차단 URL 없이 열지 말 것
//   · window.__mirror 훅은 localhost 전용(js/game.js)
// =============================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../store-shots/cdp.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'mirror', 'qa');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc', port = +(process.argv[3] || 9421), lang = process.argv[4] || '';
const D = dev === 'pc' ? { w: 1280, h: 720, dsf: 1 } : { w: 390, h: 844, dsf: 2, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' };
const b = await launch(port);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(D.w, D.h, D);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = () => b.send('Page.bringToFront');   // ⚠️ 헤드리스 탭이 hidden 으로 바뀌면 rAF 가 0 — 게임 루프가 멈춘다(실측)
setInterval(() => { front().catch(() => {}); }, 700);
const ev = async (e) => { try { return await Promise.race([b.evaluate(e), new Promise(r => setTimeout(() => r('TIMEOUT'), 8000))]); } catch (x) { return 'ERR ' + x.message; } };
const results = [];
const check = (name, ok, info = '') => { results.push([ok ? 'PASS' : 'FAIL', name, info]); console.log(ok ? '✅' : '❌', name, info); };
const KEYS = { Space: [' ', 32], Escape: ['Escape', 27], ArrowUp: ['ArrowUp', 38], ArrowDown: ['ArrowDown', 40], ArrowLeft: ['ArrowLeft', 37], ArrowRight: ['ArrowRight', 39], KeyC: ['c', 67], Digit3: ['3', 51], Enter: ['Enter', 13] };
const key = async (code, type) => { const [k, vk] = KEYS[code]; await b.send('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); };
const press = async (code) => { await key(code, 'keyDown'); await b.sleep(80); await key(code, 'keyUp'); };
const hold = async (code, ms) => { await key(code, 'keyDown'); await b.sleep(ms); await key(code, 'keyUp'); };
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
await b.goto(`http://127.0.0.1:8033/?dbg=1&weather=clear&time=0.42${lang ? '&lang=' + lang : ''}`, 9000);
for (let i = 0; i < 30; i++) { if (await ev(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`) === true) break; await b.sleep(1000); }

await b.sleep(3500);
// 🐻 캐릭터 고르기 — 헤드리스가 느리면 창이 늦게 뜬다: 창이 닫힐 때까지 다시 누른다
for (let i = 0; i < 30; i++) {
  const r = await ev(`(() => { const m=document.getElementById('char-modal'); if (!m || !m.classList.contains('show')) return 'closed'; const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰|Bear/.test(e.textContent)); c?.click(); [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구|Start|OK/.test(x.textContent))?.click(); return 'open'; })()`);
  if (r === 'closed' && i > 2) break;
  await b.sleep(1000);
}
await b.sleep(2500);
for (let i = 0; i < 12; i++) { const hit = await ev(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } } const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인|Skip|Got it|Close|OK)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`); if (!hit && i > 3) break; await b.sleep(1500); }

const ms = () => ev('__mirror.state()');
const until = async (fn, ms_ = 20000) => { const t = Date.now(); while (Date.now() - t < ms_) { const v = await fn(); if (v) return v; await b.sleep(300); } return null; };
const waitRide = async () => until(async () => { const s = await ms(); return s && s.ride === false && s.sleeping === false ? s : null; }, 240000);
// 거울 마을로(Esc 건너뛰기)
await ev('__mirror.reset()'); await ev('__mirror.day()'); await ev('__mirror.stop()');
await until(async () => (await ms()).nearDoor === 'mirrorgo');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape'); await waitRide();
await ev(`document.getElementById('mirror-arrive-ok')?.click()`); await b.sleep(800);
const LY = `(await import('/js/mirror/layout.js'))`;
const L = await ev(`(async () => { const M = ${LY}; return { lm: M.LANDMARKS, houses: M.HOUSES, npcs: M.NPC_SPOTS, park: M.MIRROR_PARK, spots: M.SPOTS }; })()`);
const lm = Object.fromEntries(L.lm.map(l => [l.id, l]));
// [이름, 로컬 x, z, 막혀야 하나] — 덤불·바위 덮개는 물건을 줍는 자리라 걸어 들어가도 된다(막지 않는 게 맞다)
const T = [
  ['연못', 0, 0, true], ['우물', lm.well.x, lm.well.z, true], ['시계탑', lm.clock.x, lm.clock.z, true],
  ['등불 기둥', lm.lamp.x, lm.lamp.z, true], ['정류장 기둥(서)', lm.stop.x - 1.1, lm.stop.z + 0.4, true], ['정류장 기둥(동)', lm.stop.x + 1.1, lm.stop.z + 0.4, true],
  ['정박 마차', L.park.x, L.park.z, true],
  ...L.houses.flatMap((h, i) => { const c = Math.cos(h.ry), s = Math.sin(h.ry); return [['집' + (i + 1), h.x, h.z, true],
    ...[[1.5, 1.3], [-1.5, 1.3], [1.5, -1.3], [-1.5, -1.3]].map(([lx, lz], k) => [`집${i + 1} 모서리${k + 1}`, h.x + lx * c + lz * s, h.z - lx * s + lz * c, true, h])]; }),
  ...L.npcs.map((n, i) => [['농부', '낚시꾼', '요리사'][i] + ' 쌍둥이', n.x, n.z, true]),
  ...L.spots.filter(s => s.cover === 'tree').map(s => [`덮개 나무 ${s.id}`, s.x, s.z - 0.3, true]),
  ['가장자리 나무(동)', 20.5, 0, true],
];
// 집 모서리는 "밀렸나"가 아니라 "밀린 뒤 몸(PLAYER_R 0.42)이 돌린 벽(3×2.6)과 안 겹치나"로 본다
const wallGap = (h, x, z) => { const c = Math.cos(h.ry), s = Math.sin(h.ry), dx = x - h.x, dz = z - h.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.hypot(Math.max(Math.abs(lx) - 1.5, 0), Math.max(Math.abs(lz) - 1.3, 0)); };
for (const [name, x, z, should, house] of T) {
  await ev(`__mirror.tp(${x}, ${z})`); await b.sleep(900);
  const p = (await ms()).pos, d = Math.hypot(p[0] - x, p[1] - (-700 + z));
  if (house) { const g = wallGap(house, p[0], p[1] + 700); check(`${name} 몸이 벽 밖`, g >= 0.4, `벽까지 ${g.toFixed(2)}`); continue; }
  check(`${name} ${should ? '막힘' : '통과'}`, (d > 0.3) === should, `밀린 거리 ${d.toFixed(2)}`);
}
// 마을 쪽 — 정류장·정박 마차(낮)
await ev(`__mirror.tp(2.5, 13.2)`); await until(async () => (await ms()).nearDoor === 'mirrorback');
await press('Space'); await until(async () => (await ms()).ride === true, 6000); await b.sleep(300); await press('Escape'); await waitRide();
const probe = async (name, x, z, should) => {
  await ev(`window.__tp(${x}, ${z})`); await b.sleep(900);
  const p = (await ms()).pos, d = Math.hypot(p[0] - x, p[1] - z);
  check(`${name} ${should ? '막힘' : '통과'}`, (d > 0.3) === should, `밀린 거리 ${d.toFixed(2)}`);
};
await probe('마을 정류장', 16, 17, true); await probe('마을 정류장 벤치', 16, 17.55, true); await probe('마을 정박 마차(낮)', 19.2, 16.6, true);
await probe('마을 탑승 자리', 16, 15.6, false);
await ev('__mirror.night()'); await b.sleep(1200);
await probe('마을 정박 마차 자리(밤 — 마차 없음)', 19.2, 16.6, false);
// 밤에 마차 자리에 서 있다가 날이 밝으면 — 튕기지 않고, 비킨 뒤엔 다시 막힌다
await ev('__mirror.day()'); await b.sleep(1500);
{ const p = (await ms()).pos; check('날이 밝아도 서 있던 자리에서 안 튕김', Math.hypot(p[0] - 19.2, p[1] - 16.6) < 0.3, JSON.stringify(p)); }
await ev('window.__tp(19.2, 13.6)'); await b.sleep(1200);
await probe('비킨 뒤 마을 정박 마차 다시 막힘', 19.2, 16.6, true);
const fails = results.filter(r => r[0] === 'FAIL').length;
console.log(`\n${results.length - fails} / ${results.length} PASS`);
await b.close(); process.exit(fails ? 1 : 0);
