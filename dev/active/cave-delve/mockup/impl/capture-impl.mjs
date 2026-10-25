import { launch } from '../../../../../tools/store-shots/cdp.mjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 8052;
const ONLY = process.argv.slice(3);
const BASE = `http://127.0.0.1:${PORT}/`;
const UA_AOS = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const DISMISS = ['intro-skip', 'coach-skip', 'tut-skip', 'seed-ok', 'hint-ok', 'notice-ok'];
const touch = { dsf: 2, touch: true, mobile: true, ua: UA_AOS };
const DEVICES = [
  { id: 'pc', w: 1280, h: 800, opts: { dsf: 1 }, cdp: 9601 },
  { id: 'phone375', w: 375, h: 812, opts: touch, cdp: 9602 },
  { id: 'phone320', w: 320, h: 640, opts: touch, cdp: 9603 },
];

async function enterGame(b) {
  await b.goto(BASE + '?dbg=1&weather=clear&time=0.34', 9000);
  for (let i = 0; i < 30; i++) {
    const ok = await b.evaluate(`(() => { const g=document.getElementById('guest-btn'); if (g && g.offsetParent) { g.click(); return true; } return false; })()`);
    if (ok) break; await b.sleep(1000);
  }
  await b.sleep(3500);
  await b.evaluate(`(() => { const c=[...document.querySelectorAll('#char-grid *')].find(e=>/곰/.test(e.textContent)); c?.click();
    const n=document.getElementById('nick-input'); if (n) { n.value='동굴탐험'; n.dispatchEvent(new Event('input', {bubbles:true})); }
    return true; })()`);
  await b.sleep(600);
  await b.evaluate(`(() => { [...document.querySelectorAll('#char-modal button')].find(x=>/시작|확인|결정|이 친구/.test(x.textContent))?.click(); return true; })()`);
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
  const mine = await import('/js/spaces/mine.js');
  const dl = await import('/js/spaces/delve.js');
  const g = await import('/js/game.js');
  const P = await import('/js/data/places.js');
  const D = await import('/js/data/delve.js');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const frames = (n) => { for (let i = 0; i < n; i++) dl.updateDelve(0.016, 0); };
  const grp = () => g.scene.children.filter(c => c.children && c.children.length > 20 && c.children.some(x => x.isPointLight)).pop();
  const scan = (want, step = 0.25) => { for (let x = -7; x <= 7; x += step) for (let z = -7; z <= 7; z += step) { g.player.position.set(P.DELVE.x + x, 0, P.DELVE.z + z); const p = dl.delvePrompt(); if (p && p.nd === want) return { x, z, p }; } return null; };
  const showPrompt = () => { const p = dl.delvePrompt(); g.$w.nearDoor = p ? p.nd : null; g.ui.setDoorPrompt?.(p ? p.prompt : null); return p; };
  const toFloor0 = () => { if (dl.delveFloorNow() > 0) dl.leaveToFloor0('ladder'); };
  const banner = (key, ico, title, line) => { delete gs.hintsSeen[key]; g.$w.firstHintBanner(key, ico, title, line); };
  window.__c = { gs, mine, dl, g, P, D, sleep, frames, grp, scan, showPrompt, toFloor0, banner, THREE: await import('three') };
  const diag = { coachBefore: g.ui.coachActive?.() };
  for (let i = 0; i < 6 && g.ui.coachActive?.(); i++) { for (const id of ['tut-skip', 'coach-skip']) { const e = document.getElementById(id); if (e && e.offsetParent) e.click(); } document.getElementById('coach-skip')?.click(); await sleep(500); }
  diag.coachAfter = g.ui.coachActive?.();
  try { g.ui.coachActive = () => false; diag.coachPatched = !g.ui.coachActive(); } catch (e) { diag.coachPatched = String(e); }
  const st = document.createElement('style'); st.textContent = '#spot-layer,#coach{display:none !important}'; document.head.appendChild(st);
  return diag;
})()`;

const PRE = `const { gs, mine, dl, g, P, D, sleep, frames, grp, scan, showPrompt, toFloor0, banner } = window.__c;`;

const SCENES = {
  's1-floor0-miner': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 0 }; gs.inventory.coal = 1;
    mine.enterMine(); await sleep(300);
    g.player.position.set(P.MINE.x + 1.6, 0, P.MINE.z - P.MINE_HALF + 5.6);
    g.$w.refreshQuestPanel?.(); frames(3); const p = showPrompt(); g.snapCamera(); await sleep(500);
    return { floor: dl.delveFloorNow(), prompt: p && p.prompt };
  })()`,
  's1b-floor0-lift': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 1 };
    mine.enterMine(); await sleep(300);
    g.player.position.set(P.MINE.x + 5, 0, P.MINE.z - P.MINE_HALF + 5.4);
    g.$w.refreshQuestPanel?.(); frames(3); const p = showPrompt(); g.snapCamera(); await sleep(500);
    return { floor: dl.delveFloorNow(), prompt: p && p.prompt };
  })()`,
  's2-floor1-arrival': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 1 }; delete gs.hintsSeen.delve_common;
    mine.enterMine(); await sleep(200);
    dl.enterFloor(1, 'lift'); frames(20); showPrompt(); await sleep(700);
    return { floor: dl.delveFloorNow() };
  })()`,
  's3-floor1-ladder': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 1 };
    mine.enterMine(); await sleep(200);
    dl.enterFloor(1, 'lift');
    let found = null;
    for (let x = -7; x <= 7 && !found; x += 1.4) for (let z = -7; z <= 7 && !found; z += 1.4) {
      g.player.position.set(P.DELVE.x + x, 0, P.DELVE.z + z);
      for (let k = 0; k < 3; k++) dl.tryDelveMine();
      frames(3);
      if (scan.length >= 0) {}
      const p = dl.delvePrompt(); if (p && p.nd === 'delve_down') found = [x, z];
    }
    for (let x = -7; x <= 7; x += 0.5) for (let z = -7; z <= 7; z += 0.5) { g.player.position.set(P.DELVE.x + x, 0, P.DELVE.z + z); frames(1); }
    const s = scan('delve_down', 0.25);
    if (s) { g.player.position.set(P.DELVE.x + s.x - 0.0, 0, P.DELVE.z + s.z + 1.3); }
    frames(10); const p = showPrompt(); g.snapCamera(); await sleep(900);
    return { floor: dl.delveFloorNow(), ladderNear: !!s, prompt: p && p.prompt, found };
  })()`,
  's4-axolotl-tap': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 4, maxFloor: 4 };
    mine.enterMine(); await sleep(200);
    let s = null, tries = 0;
    for (; tries < 15 && !s; tries++) { dl.enterFloor(4, 'lift'); frames(5); s = scan('delve_tap', 0.25); }
    if (!s) { dl.enterFloor(4, 'lift'); frames(20); showPrompt(); await sleep(700); return { tries, axolotl: false }; }
    delete gs.hintsSeen.delve_axolotl; banner('delve_axolotl', '🦎', '동굴 도롱뇽', '웅덩이 아가미를 톡 치면 뱉어요');
    g.player.position.set(P.DELVE.x + s.x, 0, P.DELVE.z + s.z); frames(5); const p = showPrompt(); g.snapCamera(); await sleep(900);
    return { tries, axolotl: true, prompt: p && p.prompt, actionBtn: document.getElementById('action-btn')?.textContent };
  })()`,
  's4b-crab-bait': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 4, maxFloor: 4 }; gs.inventory.forage = 3;
    mine.enterMine(); await sleep(200);
    let s = null, tries = 0;
    for (; tries < 15 && !s; tries++) { dl.enterFloor(4, 'lift'); frames(5); const lp = [0, 0]; for (let i = 0; i < 400 && !s; i++) { frames(10); s = scan('delve_bait', 0.5); } }
    if (!s) { return { tries, crab: false }; }
    banner('delve_crab', '💎', '수정집게', '먹보예요. 🍄 미끼를 던져요');
    g.player.position.set(P.DELVE.x + s.x, 0, P.DELVE.z + s.z); const p = showPrompt(); g.snapCamera(); await sleep(900);
    return { tries, crab: true, prompt: p && p.prompt, actionBtn: document.getElementById('action-btn')?.textContent };
  })()`,
  's5-floor12-bat': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 4, maxFloor: 12 };
    mine.enterMine(); await sleep(200);
    const hb = document.getElementById('hint-banner'), ti = document.getElementById('hb-title');
    let out = null;
    for (let w = 0; w < 80 && hb.classList.contains('show'); w++) await sleep(100);
    await sleep(500);
    for (let tr = 0; tr < 8; tr++) {
      gs.delve.visited = { date: null, floors: [] };
      dl.enterFloor(12, 'lift'); frames(10);
      const G = grp(); const before = () => G.children.length;
      let dropped = false;
      for (let x = -7; x <= 7 && !dropped; x += 1.0) for (let z = -7; z <= 7 && !dropped; z += 1.0) {
        g.player.position.set(P.DELVE.x + x, 0, P.DELVE.z + z);
        const n0 = before(); for (let k = 0; k < 3; k++) dl.tryDelveMine();
        if (before() >= n0 + 2) dropped = [x, z];
      }
      if (!dropped) continue;
      const ring = G.children.slice(-2).find(c => c.geometry && c.geometry.type === 'RingGeometry');
      const wp = ring.position;
      const lx = wp.x - P.DELVE.x, lz = wp.z - P.DELVE.z, ln = Math.hypot(lx, lz) || 1;
      g.player.position.set(wp.x - lx / ln * 3.2, 0, wp.z - lz / ln * 3.2);
      g.ui.setDoorPrompt?.(null); frames(2); g.snapCamera();
      await sleep(900);
      const t0 = Date.now(); delete gs.hintsSeen.delve_bat; banner('delve_bat', '🦇', '잎귀박쥐', '반짝이면 툭! 조각은 바로 주워요');
      while (Date.now() - t0 < 4000 && !(hb.classList.contains('show') && ti.textContent.includes('박쥐'))) await sleep(100);
      const alive = !!ring.parent && ring.visible;
      out = { tries: tr + 1, dropped, ringAlive: alive, bannerMs: Date.now() - t0, ringAt: [+(wp.x - P.DELVE.x).toFixed(1), +(wp.z - P.DELVE.z).toFixed(1)] };
      if (alive) break;
    }
    return out || { error: 'no drop' };
  })()`,
  'p-perf': `(async () => { ${PRE}
    const out = {}; const perf = () => window.__perf().calls;
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 4, maxFloor: 12 };
    mine.enterMine(); g.snapCamera(); await sleep(2000); out.floor0Gate = perf();
    g.player.position.set(P.MINE.x + 1.6, 0, P.MINE.z - P.MINE_HALF + 5.6); g.snapCamera(); await sleep(1500); out.floor0Miner = perf();
    g.player.position.set(P.MINE.x, 0, P.MINE.z + 2); g.snapCamera(); await sleep(1500); out.floor0 = perf(); out.floor0Center = out.floor0;
    dl.enterFloor(1, 'lift'); frames(20); await sleep(1500); out.floor1 = perf();
    out.floor1Pests = null;
    dl.enterFloor(12, 'lift'); frames(20); await sleep(1500); out.floor12 = perf();
    dl.enterFloor(11, 'lift'); frames(20); await sleep(1500); out.floor11 = perf();
    dl.enterFloor(4, 'lift'); frames(20); await sleep(1500); out.floor4 = perf();
    return out;
  })()`,
  's6-floor10-chest': `(async () => { ${PRE}
    toFloor0(); gs.delve = { ...gs.delve, started: true, stage: 4, maxFloor: 10, stops: [5, 10] }; gs.delve.chests = {};
    mine.enterMine(); await sleep(200);
    dl.enterFloor(10, 'lift'); frames(10);
    const s = scan('delve_chest', 0.25);
    if (s) g.player.position.set(P.DELVE.x + s.x, 0, P.DELVE.z + s.z);
    frames(5); const p = showPrompt(); g.snapCamera(); await sleep(900);
    return { floor: dl.delveFloorNow(), found: !!s, prompt: p && p.prompt };
  })()`,
};

const WAIT = { 's2-floor1-arrival': '조각 도둑', 's4-axolotl-tap': '동굴 도롱뇽', 's4b-crab-bait': '수정집게' };
const NOWAIT = new Set(['s5-floor12-bat']);
const waitBanner = (want) => `(async () => { const t0 = Date.now(); const hb = document.getElementById('hint-banner'), ti = document.getElementById('hb-title');
  while (Date.now() - t0 < 20000) { const on = hb.classList.contains('show'); if (${want ? `on && ti.textContent.includes(${JSON.stringify(want)})` : '!on'}) { await new Promise(r => setTimeout(r, 500)); return { waited: Date.now() - t0, ok: true }; } await new Promise(r => setTimeout(r, 200)); }
  return { waited: 20000, ok: false }; })()`;

const MEASURE = `(() => {
  const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden';
  const box = (sel) => { const e = document.querySelector(sel); return vis(e) ? e.getBoundingClientRect() : null; };
  const hit = (a, b) => !!(a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom));
  const hb = box('#hint-banner'), dp = box('#door-prompt'), line = document.getElementById('hb-line');
  const lh = parseFloat(getComputedStyle(line).lineHeight) || 16;
  const o = {};
  for (const s of ['#joy-base', '#action-btn', '#quest-panel', '#minimap', '#hotbar', '#topright', '#story-chip']) { const r = box(s); if (r) o[s] = { banner: hit(hb, r), prompt: hit(dp, r) }; }
  const dpe = document.getElementById('door-prompt');
  const dlh = dpe ? (parseFloat(getComputedStyle(dpe).lineHeight) || 16) : 16;
  const qp = box('#quest-panel');
  return { banner: hb && { top: Math.round(hb.top), left: Math.round(hb.left), w: Math.round(hb.width), h: Math.round(hb.height), text: document.getElementById('hb-title').textContent + ' / ' + line.textContent, lineLines: Math.round(line.getBoundingClientRect().height / lh) },
    prompt: dp && { top: Math.round(dp.top), left: Math.round(dp.left), w: Math.round(dp.width), h: Math.round(dp.height), text: dpe.textContent, lines: Math.round(dp.height / dlh) },
    questPanel: qp && { top: Math.round(qp.top), left: Math.round(qp.left), w: Math.round(qp.width), h: Math.round(qp.height), text: document.getElementById('quest-panel').innerText.slice(0, 80) },
    action: document.getElementById('action-btn')?.textContent,
    overlaps: o, overlapTrue: Object.entries(o).filter(([, v]) => v.banner || v.prompt).map(([k, v]) => k + (v.banner ? ':banner' : '') + (v.prompt ? ':prompt' : '')),
    vw: innerWidth, vh: innerHeight };
})()`;

const results = {};
for (const d of DEVICES.filter(x => !process.env.DEV || x.id === process.env.DEV)) {
  const b = await launch(d.cdp);
  await b.send('Network.enable');
  await b.send('Network.setCacheDisabled', { cacheDisabled: true });
  await b.send('Network.setBlockedURLs', { urls: ['*supabase.co*', '*googletagmanager*', '*google-analytics*'] });
  await b.viewport(d.w, d.h, d.opts);
  await enterGame(b);
  await b.sleep(2000);
  const r = (results[d.id] = {});
  const perf = async () => b.evaluate(`(() => { const p = window.__perf(); return { calls: p.calls, tris: p.tris, objs: p.objs }; })()`);
  try { r.villagePerf = await perf(); } catch (e) { r.villagePerf = String(e); }
  console.log(d.id, 'setup', await b.evaluate(SETUP), 'village', JSON.stringify(r.villagePerf));
  if (process.env.PROBE) { await b.shot('/private/tmp/claude-501/-Users-uicheol-hwang-calm-forest/0a1ed4c9-eedd-4028-9af6-ba4eee100ae8/scratchpad/probe.png'); console.log(await b.evaluate(`JSON.stringify({coach: document.getElementById('coach').className, body: document.body.className})`)); }
  await b.sleep(1500);
  for (const [id, code] of Object.entries(SCENES)) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    let res;
    try { res = await b.evaluate(code); } catch (e) { res = { error: String(e) }; }
    try { if (!NOWAIT.has(id)) res.banner = await b.evaluate(waitBanner(WAIT[id])); } catch (e) { res.bannerErr = String(e); }
    const m = await b.evaluate(MEASURE);
    let calls = null;
    try { calls = (await perf()).calls; } catch (e) {}
    await b.shot(path.join(OUT, `${d.id}-${id}.png`));
    r[id] = { res, measure: m, calls };
    console.log(d.id, id, JSON.stringify(r[id]));
  }
  const errs = b.logs.filter(l => !/익명 로그인|Anonymous|supabase|ERR_BLOCKED|Failed to load resource/i.test(l));
  r.errors = errs.slice(0, 8);
  if (errs.length) console.log(d.id, 'errors', errs.slice(0, 5));
  await b.close();
}
const file = path.join(OUT, 'results.json');
let prev = {}; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
const merged = { ...prev };
for (const d of Object.keys(results)) merged[d] = { ...(prev[d] || {}), ...results[d] };
fs.writeFileSync(file, JSON.stringify(merged, null, 1));
