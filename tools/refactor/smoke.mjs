#!/usr/bin/env node
// =============================================================
//  🧪 리팩터 실행 증명 — 게임을 헤드리스로 띄워 공간을 순회하고 "지문"을 남긴다
//  ------------------------------------------------------------
//  사용: node tools/refactor/smoke.mjs <라벨> [서버포트=8791] [CDP포트=9341]
//        (먼저 python3 scripts/serve.py <서버포트> 를 이 트리 루트에서 띄운다)
//  산출: .scratch/refactor-smoke/<라벨>.json  +  <라벨>-<공간>.png
//  비교: node tools/refactor/smoke-diff.mjs <기준1> <기준2> <후보>
//        기준 두 번의 측정에서 이미 흔들리는 값(랜덤·시각)은 잡음으로 보고 비교에서 뺀다.
//
//  · Supabase·GA 를 막아 오프라인 게스트로 진입 → 운영 DB·GA4 를 건드리지 않는다
//  · 지문: 공간마다 예외/console.error · 드로우콜 · 메시 수 · 삼각형 · 지오메트리/텍스처 수,
//          마지막에 세이브 상태(getGameState) 전체
// =============================================================
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../store-shots/cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, '.scratch', 'refactor-smoke');
const [label, srvPort = '8791', cdpPort = '9341'] = process.argv.slice(2);
if (!label) { console.error('사용: smoke.mjs <라벨> [서버포트] [CDP포트]'); process.exit(1); }
const BASE = `http://127.0.0.1:${srvPort}/`;

// [이름, 들어가는 식, 나오는 식] — __space 는 ?dbg=1 에서만 노출된다(game.js)
const STOPS = [
  ['village', '__tp(1.5, 3)', null],
  ['glade', '__tp(7, 24)', '__tp(1.5, 3)'],
  ['forest', '__tp(-18, 21)', '__tp(1.5, 3)'],
  ['farm', '__space.farm[0]()', '__space.farm[1]()'],
  ['mine', '__space.mine[0]()', '__space.mine[1]()'],
  ['cafe', '__space.cafe[0]()', '__space.cafe[1]()'],
  ['museum', '__space.museum[0]()', '__space.museum[1]()'],
  ['house', '__space.house[0]()', '__space.house[1]()'],
  ['river', '__space.river[0]()', '__space.river[1]()'],
  ['mist', '__space.mist[0]()', '__space.mist[1]()'],
  ['sea', '__space.sea[0]()', '__space.sea[1]()'],
];
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];

async function enterGame(b, params) {
  await b.goto(BASE + '?dbg=1&weather=clear&' + params, 9000);
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
}

const run = (b, expr) => b.evaluate(`(()=>{ try { const r = ${expr}; return r === undefined ? null : (typeof r === 'object' ? 'obj' : r); } catch (e) { return 'ERR ' + e.message } })()`);
const perf = (b) => b.evaluate(`(()=>{ const p = window.__perf(); return { calls: p.calls, tris: p.tris, geoms: p.geoms, tex: p.tex, meshes: p.objs[0], visible: p.objs[1] }; })()`);

mkdirSync(OUT, { recursive: true });
const b = await launch(+cdpPort);
await b.send('Network.enable');
await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
await b.viewport(1280, 720);

const result = { label, at: new Date().toISOString(), boot: {}, stops: {}, night: {}, state: null };
await enterGame(b, 'time=0.32');
result.boot = { errors: b.logs.splice(0), ready: await b.evaluate(`typeof window.__space === 'object' && typeof window.__perf === 'function'`) };
if (!result.boot.ready) { console.error('❌ 디버그 훅이 없다 — 부팅 실패로 본다', result.boot.errors); }

for (const [name, enter, exit] of STOPS) {
  if (!result.boot.ready) break;
  const entered = await run(b, enter);
  await b.sleep(3000);
  const p = await perf(b);
  await b.shot(path.join(OUT, `${label}-${name}.png`));
  const exited = exit ? await run(b, exit) : null;
  await b.sleep(1500);
  result.stops[name] = { entered, exited, ...p, errors: b.logs.splice(0) };
  console.log(`  ${name.padEnd(8)} calls=${p.calls} meshes=${p.meshes} errors=${result.stops[name].errors.length}`);
}
if (result.boot.ready) result.state = await b.evaluate(`JSON.parse(JSON.stringify(window.__gs()))`);

// 🌙 밤 — 반딧불 계곡은 밤에만 열린다
await enterGame(b, 'time=0.80');
const nightReady = await b.evaluate(`typeof window.__perf === 'function'`);
if (nightReady) {
  await run(b, '__tp(7, 24)'); await b.sleep(3000);
  result.night = { ...(await perf(b)), errors: b.logs.splice(0) };
  await b.shot(path.join(OUT, `${label}-night-glade.png`));
} else result.night = { errors: b.logs.splice(0), ready: false };

await b.close();
const file = path.join(OUT, `${label}.json`);
writeFileSync(file, JSON.stringify(result, null, 1));
const errs = result.boot.errors.length + Object.values(result.stops).reduce((a, s) => a + s.errors.length, 0) + (result.night.errors?.length || 0);
console.log(`✅ ${path.relative(ROOT, file)} — 공간 ${Object.keys(result.stops).length} · 에러 ${errs}`);
