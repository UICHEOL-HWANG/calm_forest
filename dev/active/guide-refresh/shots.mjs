#!/usr/bin/env node
// 📸 안내서 2부 사진 촬영 — tools/store-shots/cdp.mjs 재사용(헤드리스 Chrome CDP)
//   사용: node dev/active/guide-refresh/shots.mjs <포트> [장면 접두어]
//   산출: 스크래치 디렉터리(OUT 환경변수)/<장면>.png — 1200×674(안내서 기존 사진과 같은 크기)
//   ⚠️ weather=clear 등 개발 파라미터 필수 — IS_DEV_SESSION 이 켜져야 원장·GA4 기록이 안 남는다
//   ⚠️ Supabase·GA 차단 → 오프라인 게스트(운영 DB 에 익명 계정 안 생김)
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { launch } from '../../../tools/store-shots/cdp.mjs';

const [port = '50488', only] = process.argv.slice(2);
const BASE = `http://127.0.0.1:${port}/`;
const OUT = process.env.OUT || '.scratch/guide-shots';
mkdirSync(OUT, { recursive: true });

const DEX1 = `(() => { const d = __gs().dex, t = Date.now();
  for (const id of ['carrot','tomato','blueberry','pumpkin','wheat','corn','grape']) d.crop[id] = t;
  for (const id of ['common','uncommon','rare']) d.fish[id] = t;
  for (const id of ['stone','coal']) d.ore[id] = t; return true; })()`;

// [이름, 쿼리, 동작들(순서대로, 사이 2.5초)]
const SCENES = [
  ['22_farm_stage3', 'time=0.34&farmstage=3&farmmax=1', ['__space.farm[0]()', 'DISMISS', '__spawnWorkers()', "__pet.give('leaf')"]],
  ['23_kitchen_menu', 'time=0.36&give=crop:12,forage:8,fish:4', ['__tp(7.4, -4.6)', '__kitchenOpen()']],
  ['24_npc_window', 'time=0.36', ['__tp(5, 5.8)', 'KEY']],
  ['25_museum', 'time=0.36', [DEX1, '__space.museum[0]()', 'DISMISS']],
  ['26_shop', 'time=0.36', ['(__gs().inventory.coins = 5000, true)', '__tp(-17.5, -1.4)', 'KEY']],
];
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
const CLEAN = `(() => { document.body.classList.remove('hintbanner');
  for (const el of document.querySelectorAll('#topleft *')) if (el.childNodes.length===1 && el.firstChild.nodeType===3 && /오프라인/.test(el.textContent)) el.textContent = el.textContent.replace('(오프라인)','');
  document.querySelectorAll('#toast').forEach(e => e.style.display='none');
  for (const el of document.querySelectorAll('body *')) if (el.children.length===0 && /초보자 안내서가 있어요/.test(el.textContent)) { let c=el; while (c && c!==document.body && getComputedStyle(c).position!=='fixed') c=c.parentElement; if (c && c!==document.body) c.style.display='none'; }
  return true; })()`;

async function enterGame(b, params) {
  await b.goto(BASE + '?dbg=1&weather=clear&' + params, 9000);
  for (let i = 0; i < 30; i++) {
    const ok = await b.evaluate(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`);
    if (ok) break; await b.sleep(1000);
  }
  await b.sleep(3500);
  await b.evaluate(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/토끼/.test(e.textContent)); c?.click();
    [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구/.test(x.textContent))?.click(); return true; })()`);
  await b.sleep(2500);
  for (let i = 0; i < 12; i++) {
    const hit = await b.evaluate(`(() => { for (const id of ${JSON.stringify(DISMISS)}) { const e=document.getElementById(id); if (e && e.offsetParent) { e.click(); return id; } }
      const t=[...document.querySelectorAll('button')].find(x=>x.offsetParent && /^(건너뛰기|알겠어요|닫기|확인)/.test(x.textContent.trim())); if (t) { t.click(); return 1; } return null; })()`);
    if (!hit && i > 3) break;
    await b.sleep(1500);
  }
}

const b = await launch(9344);
await b.send('Network.enable');
await b.send('Network.setCacheDisabled', { cacheDisabled: true });
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(1200, 674);
for (const [name, params, acts] of SCENES) {
  if (only && !name.startsWith(only)) continue;
  await enterGame(b, params);
  await b.sleep(2000);
  for (const a of acts) {
    if (a === 'KEY') {   // 실제 Space 입력 — __act() 는 제스처만 내고 대화·가게 창은 안 연다
      for (const type of ['keyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: type === 'keyDown' ? ' ' : undefined });
      await b.sleep(2500); continue;
    }
    if (a === 'DISMISS') {   // 공간 첫 방문 안내 카드("알겠어요 🌱")
      await b.evaluate(`(() => { const t=[...document.querySelectorAll('button')].find(x=>x.getClientRects().length && /^알겠어요/.test(x.textContent.trim())); t?.click(); return !!t; })()`);
      await b.sleep(2000); continue;
    }
    const r = await b.evaluate(`(()=>{ try { const v = ${a}; return typeof v === 'object' ? JSON.stringify(v)?.slice(0, 120) : String(v); } catch (e) { return 'ERR ' + e.message } })()`);
    console.log('  ', name, a.slice(0, 40).replace(/\s+/g, ' '), '→', r);
    await b.sleep(2500);
  }
  await b.evaluate(CLEAN); await b.sleep(1500);
  const file = path.join(OUT, `${name}.png`);
  await b.shot(file);
  console.log('📸', file);
}
if (b.logs.length) console.log('console errors:', b.logs.slice(0, 8));
await b.close();
