#!/usr/bin/env node
// 📸 안내서 사진(2026-10-28 PC·모바일 분리 + 물가 장)
//   사용: python3 -m http.server 8817 --bind 127.0.0.1 &   (워크트리 루트)
//         node dev/active/guide-device/shots.mjs pc [CDP 포트=9411]     → PC 21장(한 세션에서 순서대로)
//         node dev/active/guide-device/shots.mjs phone [CDP 포트=9412]  → 30_mobile_coach
//   산출: OUT(기본 .scratch/guide-shots)/<장면>.png → sips 로 guide/img/<장면>.jpg(q62, 1200×674 / 554×1200)
//   ⚠️ weather=clear·dbg=1 필수(IS_DEV_SESSION) · Supabase·GA 차단(오프라인 게스트, 익명 계정 안 생김)
//   ⚠️ 오프라인 게스트 세이브는 저장되지 않는다 → 리로드하면 처음부터. 장면을 한 세션에서 이어 찍는다
//   ⚠️ 헤드리스는 ~10fps. 상인이 좌판 뒤에 걸려 못 오면 상인 옆으로 순간이동해 '말 걸기 거리(1.6)' 안에 선다
//   ⚠️ 폰: 로딩이 덜 끝난 채 게스트를 누르면 로그인 화면이 게임 위에 남는다 → 게스트 버튼이 보인 뒤 5초 더 기다린다
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { launch } from '../../../tools/store-shots/cdp.mjs';

const [dev = 'pc', port = dev === 'pc' ? '9411' : '9412'] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${process.env.SHOTS_PORT || 8817}/?dbg=1&weather=clear&time=0.36`;
const OUT = process.env.OUT || '.scratch/guide-shots';
mkdirSync(OUT, { recursive: true });

const b = await launch(+port);
await b.send('Network.enable');
await b.send('Network.setCacheDisabled', { cacheDisabled: true });
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
if (dev === 'phone') await b.viewport(360, 780, { dsf: 3, touch: true, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' });
else await b.viewport(1200, 674);
await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
const front = setInterval(() => { b.send('Page.bringToFront').catch(() => {}); }, 700);

const S = (ms) => b.sleep(ms);
const ev = async (e) => { try { return await b.evaluate(`(async()=>{ const v = await (${e}); return typeof v==='object' ? JSON.stringify(v) : v })()`); } catch (x) { return 'ERR ' + x.message; } };
const until = async (e, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(e) === true) return true; await S(500); } console.log('  ⏱️', e); return false; };
const shot = async (name) => { const f = path.join(OUT, `${name}.png`); await b.shot(f); console.log('📸', f); };
const key = async (k, code, vk, hold = 80) => { for (const type of ['keyDown', 'keyUp']) { await b.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: type === 'keyDown' && k.length === 1 ? k : undefined }); await S(hold); } };
const space = () => key(' ', 'Space', 32);
const walk = (dir, ms) => key(`Arrow${dir}`, `Arrow${dir}`, { Up: 38, Down: 40, Left: 37, Right: 39 }[dir], ms);
const click = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); };
const touch = async (pts) => { for (const p of pts) { await b.send('Input.dispatchTouchEvent', { type: p.t, touchPoints: p.t === 'touchEnd' ? [] : [{ x: p.x, y: p.y }] }); await S(p.w || 50); } };
const btn = (scope, re) => ev(`(()=>{ const t=[...document.querySelectorAll('${scope} button')].find(x=>x.getClientRects().length && ${re}.test(x.textContent.trim())); t?.click(); return !!t })()`);
const ok = () => btn('', '/^(알겠어요|닫기|확인)/');
const mod = (p) => `await import('${p}')`;
const spot = () => ev(`document.getElementById('spot-layer').textContent.slice(0, 40)`);

async function enter() {
  await b.goto(BASE, 2000);
  await until(`(()=>{ const g=document.getElementById('guest-btn'); return !!(g && g.getClientRects().length) })()`);
  await S(5000);
  await ev(`document.getElementById('guest-btn').click()`);
  await until(`document.getElementById('char-modal').classList.contains('show')`);
  await ev(`(()=>{ [...document.querySelectorAll('#char-grid *')].find(e=>e.children.length<=2 && /토끼/.test(e.textContent))?.click();
    const i=document.getElementById('nick-input'); i.value='숲속토끼'; i.dispatchEvent(new Event('input',{bubbles:true})); return 1 })()`);
  await S(2500);
  await btn('#char-modal', '/이 친구로/');
  await until(`__introT() > 0`);
  await ev(`document.getElementById('intro-skip').click()`);
  await until(`document.body.classList.contains('spot-on')`);
}

const scene = process.argv[4] || 'core';
const skipHints = async () => { for (let i = 0; i < 8; i++) { const r = await ev(`(()=>{ const s=document.querySelector('#spot-layer .sp-skip.show'); if(!s) return 0; s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); return 1 })()`); if (r !== 1 && r !== '1') break; await S(1500); } };

async function pcCore() {
  await walk('Up', 900); await S(1500);
  await key('1', 'Digit1', 49); await S(1500);
  await key('2', 'Digit2', 50); await S(1500);
  await space(); await S(2500);
  await shot('14_help');
  await skipHints(); await S(2500);
  await btn('#story-modal', '/닫기/'); await S(2500);
}

async function pc() {
  await enter();
  await pcCore();
  if (scene === 'core') {
    await shot('04_coach');
    await ev(`(()=>{ document.getElementById('coach').classList.remove('show'); document.body.classList.remove('coaching'); return 1 })()`);
    await S(2000); await shot('03_village_start');
    return;
  }
  await ev(`(()=>{ document.getElementById('coach').classList.remove('show'); document.body.classList.remove('coaching'); return 1 })()`);
  if (scene === 'mudflat') {
    await ev(`(async()=>{ (${mod('/js/spaces/sea.js')}).enterSea(); return 1 })()`); await S(6000); await ok(); await S(1500);
    await ev(`(async()=>{ (${mod('/js/spaces/mudflat.js')}).enterMudflat({ entry: 'pick' }); return 1 })()`); await S(9000); await ok(); await S(4000);
    await shot('39_mudflat');
  } else if (scene === 'dive') {
    await ev(`(async()=>{ (${mod('/js/spaces/sea.js')}).enterSea(); return 1 })()`); await S(6000); await ok(); await S(1500);
    await ev(`(async()=>{ (${mod('/js/spaces/dive.js')}).enterDive({ entry: 'pick' }); return 1 })()`); await S(8000); await ok(); await S(1500);
    await space(); await S(4500);
    await shot('40_dive');
  } else if (scene === 'dock') {
    await ev(`(async()=>{ (${mod('/js/spaces/river.js')}).enterRiver(); return 1 })()`); await S(6000); await ok(); await S(1500);
    await ev(`(Object.assign(__gs().inventory,{star:620}), __tp(-4, -396.2))`); await S(2500);
    await space(); await S(3000);
    await shot('41_dock');
  }
}

async function phone() {
  await enter();
  await touch([{ t: 'touchStart', x: 88, y: 630, w: 100 }, { t: 'touchMove', x: 88, y: 610, w: 100 }, { t: 'touchMove', x: 88, y: 585, w: 2000 }, { t: 'touchEnd', x: 88, y: 585, w: 200 }]);
  await S(2000); console.log(' ', await spot());
  const tb = await ev(`JSON.stringify((()=>{ const r=document.getElementById('tool-btn').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2] })())`);
  const [tx, ty] = JSON.parse(tb);
  await touch([{ t: 'touchStart', x: tx, y: ty, w: 120 }, { t: 'touchEnd', x: tx, y: ty, w: 200 }]);
  await S(2000); console.log(' ', await spot());
  const fs = await ev(`JSON.stringify((()=>{ const r=document.querySelector('#tool-fan .tf-slot.farm')?.getBoundingClientRect(); return r ? [r.x+r.width/2, r.y+r.height/2] : null })())`);
  if (fs && fs !== 'null') { const [fx, fy] = JSON.parse(fs); await touch([{ t: 'touchStart', x: fx, y: fy, w: 120 }, { t: 'touchEnd', x: fx, y: fy, w: 200 }]); }
  await S(1500);
  const ab = await ev(`JSON.stringify((()=>{ const r=document.getElementById('action-btn').getBoundingClientRect(); return [r.x+r.width/2, r.y+r.height/2] })())`);
  const [ax, ay] = JSON.parse(ab);
  await touch([{ t: 'touchStart', x: ax, y: ay, w: 150 }, { t: 'touchEnd', x: ax, y: ay, w: 200 }]);
  await S(2500); console.log(' ', await spot());
  await skipHints(); await S(3000);
  await btn('#story-modal', '/닫기/'); await S(2500);
  await touch([{ t: 'touchStart', x: tx, y: ty, w: 120 }, { t: 'touchEnd', x: tx, y: ty, w: 200 }]);
  await S(1500);
  await shot('30_mobile_coach');
}

async function guideCheck() {
  await enter();
  if (dev === 'pc') await pcCore(); else { await skipHints(); await S(2000); await btn('#story-modal', '/닫기/'); await S(1500); }
  await ev(`document.getElementById('help-btn').click()`);
  await until(`!!document.querySelector('#guide-body .gd section')`, 30000); await S(1500);
  console.log(await ev(`JSON.stringify((()=>{ const g=document.querySelector('#guide-body .gd'); const vis=d=>[...g.querySelectorAll('[data-dev="'+d+'"]')].filter(e=>e.getClientRects().length).length;
    return { cls: g.className, chips: document.querySelectorAll('#guide-chips button').length, pc: vis('pc'), touch: vis('touch') } })())`));
  await ev(`document.getElementById('sec-03').scrollIntoView()`); await S(1500);
  await shot('guide-' + dev);
  if (dev === 'pc') {
    console.log(await ev(`JSON.stringify({ toc: document.querySelectorAll('#guide-panel .gd-toc a').length, on: document.querySelector('#guide-panel .gd-toc a.on')?.textContent })`));
    await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 1180, y: 380 }); await S(600);
    await shot('guide-pc-toc');
  }
}

if (scene === 'guide') await guideCheck(); else if (dev === 'phone') await phone(); else await pc();
if (b.logs.length) console.log('console errors:', b.logs.slice(0, 8));
clearInterval(front);
await b.close();
process.exit(0);
