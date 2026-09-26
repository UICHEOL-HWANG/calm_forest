#!/usr/bin/env node
// =============================================================
//  🧪 리팩터 흐름 점검 — 스모크(공간 순회)가 안 지나가는 "동작"을 헤드리스로 돌려 결과를 남긴다
//  ------------------------------------------------------------
//  사용: node tools/refactor/flows.mjs <라벨> <서버포트> <CDP포트>
//  비교: 원본 스냅샷 서버와 후보 서버에 같은 흐름을 돌리고 JSON 을 diff
//        (node tools/refactor/flows.mjs f-base 8881 9591 ; node tools/refactor/flows.mjs f-new 8882 9592)
//  · 프롤로그 컷신 · 요리 코스 · 조각 · 상점 · 선물 · 밭일 · 낚시 · 배 · 안개 · 건축 · 실내 가구 · 야외 장식
//    · 밤손님 · 서리 예고 · 주민 대화 · 퀘스트 패널 · 사진 — 단계마다 반환값 요약 + 새 에러 + 인벤토리
//  · Supabase·GA 는 막는다(smoke.mjs 와 같은 조건 · 고정 시드 난수)
// =============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../store-shots/cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'refactor-flows');
const [label, srvPort, cdpPort] = process.argv.slice(2);
if (!label || !srvPort || !cdpPort) { console.error('사용: flows.mjs <라벨> <서버포트> <CDP포트>'); process.exit(1); }
const BASE = `http://127.0.0.1:${srvPort}/`;

// 페이지 안에서 돌릴 흐름 — 식은 async 본문(G = game.js 모듈, I = Input, gs = gameState)
const PRE = `const G = await import('/js/game.js'); const I = G.Input; const gs = window.__gs();`;
const STEPS = [
  ['intro-start', `window.__introTest(); return I.introActive();`, 6000, true],
  ['intro-mid', `return I.introActive();`, 9000, true],
  ['intro-end', `return I.introActive();`, 12000, true],
  ['give', `Object.assign(gs.inventory, { wood: 60, stone: 60, carrot: 30, potato: 30, wheat: 30, tomato: 30, fish: 20, berry: 30, mushroom: 30, egg: 20, milk: 20 }); gs.coins = (gs.coins || 0) + 5000; return Object.keys(gs.inventory).length;`, 500],
  ['kitchen-view', `const k = I.getKitchen(); return { n: (k.recipes || k.list || []).length, keys: Object.keys(k) };`, 500],
  ['kitchen-cook', `const k = I.getKitchen(); const r = (k.recipes || k.list || [])[0]; if (!r) return 'no recipe'; const s = I.kitchenStart(r.id); return { id: r.id, s };`, 2000],
  ['kitchen-finish', `const k = I.getKitchen(); const r = (k.recipes || k.list || [])[0]; if (!r) return 'no'; const f = I.kitchenFinish(r.id, { score: 80, offsets: [], maxCombo: 3, judges: { perfect: 2, good: 1, miss: 0 }, durationMs: 5000, abandoned: false }); const c = I.cookResolve('store'); return { f, c, pantry: I.getPantry()?.length ?? null };`, 1500, true],
  ['workshop', `const w = I.getWorkshop(); const o = (w.orders || [])[0]; if (!o) return { keys: Object.keys(w) }; const s = I.carveStart(o.id); return { id: o.id, s };`, 2500, true],
  ['carve-debug', `const r = I.carveDebug('waste', 20); return r ?? null;`, 1500],
  ['carve-abandon', `I.carveAbandon(); return I.getWorkshop().orders?.length ?? null;`, 3000, true],
  ['carve-end', `I.carveSceneEnd?.(); return true;`, 1500],
  ['shop-sell', `return I.sellItem('wood', false);`, 500],
  ['shop-buy', `const b = I.getShopBuy(); return I.buyShop(b[0].id);`, 500],
  ['gift', `const g = I.getGifts(); const c = I.craftGift(g[0].id); return { c, owned: I.ownedGifts?.() };`, 500],
  ['talk', `const t = I.getTalkNpcs(); return Array.isArray(t) ? t.length : t;`, 500],
  ['quests', `return window.__questPanel().length;`, 500],
  ['farm-enter', `window.__space.farm[0](); return I.isAtFarm();`, 2500, true],
  // 밭을 격자로 채우고(성장 90%) 첫 칸 옆에서 도구마다 한 번씩 — 칸 상태 분포가 원본과 같아야 한다
  ['farm-work', `const n = window.__farmMax(); const p0 = window.__plots()[0]; window.__tp(p0.x + 0.9, p0.z); const ids = I.getTools().map(t => t.id); const out = { n, tools: ids };
    for (const id of ['water', 'hoe', 'seed', 'sickle', 'shovel']) { const i = ids.indexOf(id); if (i < 0) continue; I.selectTool(i); I.doAction(); await new Promise(r => setTimeout(r, 900)); }
    const st = {}; for (const q of window.__plots()) { const k = q.state + (q.watered ? '+w' : ''); st[k] = (st[k] || 0) + 1; } out.states = st; return out;`, 1500, true],
  ['farm-exit', `window.__space.farm[1](); return I.isAtFarm();`, 2000],
  ['fish', `window.__tp(-9, -6); const tools = I.getTools(); const rod = tools.findIndex(t => t.id === 'rod'); if (rod >= 0) I.selectTool(rod); I.doAction(); return rod;`, 3000, true],
  ['boat', `window.__boatTest(); window.__space.river[0](); await new Promise(r => setTimeout(r, 2000)); I.startBoatRun(); return I.boatRunsLeft();`, 4000, true],
  ['boat-quit', `I.quitBoatRun(); window.__space.river[1](); return true;`, 2500],
  ['mist', `const d = window.__mistTest(); window.__space.mist[0](); return d ?? null;`, 4000, true],
  ['mist-exit', `window.__space.mist[1](); return true;`, 2000],
  ['build', `return window.__buildTest(1, true);`, 2500, true],
  ['indoor', `window.__house.enter(); await new Promise(r => setTimeout(r, 1500)); const r = window.__decor('bed', 1, 1); return { r: !!r, indoor: I.isIndoor() };`, 2500, true],
  ['indoor-exit', `window.__house.exit(); return I.isIndoor();`, 2000],
  ['outdoor-place', `const o = I.getOutdoor(); const id = (o[0] && (o[0].id || o[0])) || 'bench'; return { id, r: !!window.__place(id, 4, 6) };`, 1500, true],
  ['night', `window.__space.farm[0](); await new Promise(r => setTimeout(r, 1500)); const m = window.__nightForce('boar'); const t = gs.night.traces.at(-1); if (t) window.__tp(t.x + 0.6, t.z); await new Promise(r => setTimeout(r, 800)); I.doAction(); return { m, traces: gs.night.traces.length };`, 4000, true],
  ['night-exit', `window.__space.farm[1](); return gs.night.traces.length;`, 2000],
  ['frost', `return window.__frostTest();`, 1500],
  ['sea', `window.__space.sea[0](); return true;`, 4000, true],
  ['sea-exit', `window.__space.sea[1](); return true;`, 2000],
  ['photo', `const p = I.capturePhoto(); return p ? p.slice(0, 22) : null;`, 500],
];

const summarize = (v) => { try { const s = JSON.stringify(v, (k, x) => typeof x === 'function' ? 'fn' : x); return s && s.length > 400 ? s.slice(0, 400) + '…' : s; } catch { return String(v); } };
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];

mkdirSync(OUT, { recursive: true });
const b = await launch(+cdpPort);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: '(()=>{let s=0x2545F491;Math.random=function(){s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};})()' });
await b.viewport(1280, 720);
await b.goto(BASE + '?dbg=1&weather=clear&time=0.32', 9000);
for (let i = 0; i < 40; i++) {
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
const result = { label, boot: b.logs.splice(0), steps: {} };
for (const [name, body, wait, shot] of STEPS) {
  let ret;
  try { ret = await b.evaluate(`(async () => { ${PRE} ${body} })().then(v => ({ ok: v === undefined ? null : v }), e => ({ err: String(e && e.message || e) }))`); }
  catch (e) { ret = { err: 'CDP ' + e.message }; }
  await b.sleep(wait);
  const inv = await b.evaluate(`(() => { const g = window.__gs(); return JSON.stringify({ inv: g.inventory, coins: g.coins }); })()`).catch(() => null);
  if (shot) await b.shot(path.join(OUT, `${label}-${name}.png`));
  result.steps[name] = { ret: summarize(ret), inv, errors: b.logs.splice(0) };
  console.log(`  ${name.padEnd(15)} ${summarize(ret)?.slice(0, 110)}${result.steps[name].errors.length ? '  ⚠️ ' + result.steps[name].errors.length : ''}`);
}
await b.close();
writeFileSync(path.join(OUT, `${label}.json`), JSON.stringify(result, null, 1));
console.log(`✅ .scratch/refactor-flows/${label}.json`);
