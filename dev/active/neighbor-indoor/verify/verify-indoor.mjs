// 🏠 이웃 집 실내 실측 — 가짜 이웃 응답 주입(서버 room 적용 전) · Supabase·GA 차단 헤드리스
//   PORT=8061 node verify-indoor.mjs [pc|mobile] [en]  → ../shots/*.png + stdout JSON
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const DEV = process.argv[2] || 'pc', LANG = process.argv[3] === 'en' ? 'en' : 'ko';
const OUT = path.resolve(import.meta.dirname, '../shots'); mkdirSync(OUT, { recursive: true });
const PID = '11111111-2222-4333-8444-555555555555';
const ROOM = {
  5: [ { id: 'bed', x: 4, z: 3, rot: 0, f: 0 }, { id: 'table', x: 2, z: -2, rot: 0, f: 0 }, { id: 'vase', x: 2, z: -2, rot: 0, f: 0 },
       { id: 'rug', x: 0, z: 1, rot: 0, f: 0 }, { id: 'bookshelf', x: -4, z: 6, rot: 0, f: 0 }, { id: 'piano', x: 3, z: 3, rot: 1, f: 1 },
       { id: 'chandelier', x: 0, z: 2, rot: 0, f: 1 }, { id: 'unknownThing', x: 0, z: 0, rot: 0, f: 0 } ],
  6: [ { id: 'sofa', x: 3, z: 4, rot: 0, f: 0 }, { id: 'grandpiano', x: 2, z: 2, rot: 0, f: 1 }, { id: 'jacuzzi', x: 2, z: 2, rot: 0, f: 2 }, { id: 'firepit', x: -2, z: 3, rot: 0, f: 2 } ],
  7: [ { id: 'bigsofa', x: 3, z: 4, rot: 0, f: 0 }, { id: 'telescope', x: 2, z: 2, rot: 0, f: 2 }, { id: 'plant', x: -3, z: 2, rot: 0, f: 3 } ],
  2: [ { id: 'bed', x: 0, z: 0, rot: 0, f: 0 } ],
};
const SCEN = [
  { name: 's5', stage: 5, style: null },
  { name: 's6', stage: 6, style: null },
  { name: 's7h', stage: 7, style: 'hanok' },
  { name: 's2', stage: 2, style: null },
];

const h = await open(DEV === 'mobile' ? { w: 390, h: 844, mobile: true } : {});
const { b, ev, until, key } = h;
const shot = (n) => b.shot(path.join(OUT, `${DEV}-${LANG}-${n}.png`));
const state = () => ev(`(async () => { const g = await import('/js/game.js'); const p = g.player.position;
  const ind = g.scene.getObjectByName('neighbor-indoor');
  return { atNeighbor: g.atNeighbor, nearDoor: g.nearDoor, prompt: document.getElementById('door-prompt')?.textContent?.trim() || null,
    pos: [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)], indoorVisible: ind ? ind.visible : null,
    title: document.querySelector('#nb-hud-top .nb-title')?.textContent || null,
    buttons: [...document.querySelectorAll('button')].filter(x => x.offsetParent && /🪜/.test(x.textContent)).map(x => x.textContent.trim()) }; })()`);
const tp = (x, z, y = null) => ev(`(async () => { const g = await import('/js/game.js'); g.player.position.set(${x}, ${y ?? 'g.player.position.y'}, ${z}); g.snapCamera(); return true; })()`);
const perf = () => ev(`window.__perf ? (({calls,tex,geoms}) => ({calls,tex,geoms}))(window.__perf()) : null`);
const counts = () => ev(`(async () => { const g = await import('/js/game.js'); let lights = 0; g.scene.traverse(o => { if (o.isPointLight) lights++; });
  return { lights, windows: g.houseWindows.length, farSolids: g.colliders.filter(c => (c.z ?? c.z1) > 740).length, hasIndoor: !!g.scene.getObjectByName('neighbor-indoor') }; })()`);
const log = { dev: DEV, lang: LANG, scen: {} };

await h.enterGame(`house=3${LANG === 'en' ? '&lang=en' : ''}`);
await b.sleep(1500);
log.before = { counts: await counts(), perf: await perf() };

for (const sc of SCEN) {
  const r = {}; log.scen[sc.name] = r;
  const data = { nickname: '테스트이웃', character: 'bear', equipped: {}, pet: null, houseStage: sc.stage, houseStyle: { roof: 1, wall: 2, door: 0 },
    style: sc.style, addons: [], outdoor: [], coop: { built: false }, room: ROOM[sc.stage] };
  r.inject = await ev(`(async () => { const n = await import('/js/neighbors/net.js'); const A = n.neighborApi;
    A.today = async () => ({ ok: true, list: [{ public_id: '${PID}', nick: '테스트이웃', character: 'bear', house_stage: ${sc.stage}, decor_n: 3, visited_today: false }], rewardedToday: 0 });
    A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 5 });
    A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
    const s = await import('/js/spaces/neighbor.js'); await s.openNeighborPicker('verify'); return true; })()`);
  await b.sleep(1200);
  await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
  r.arrived = await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000);
  await b.sleep(1500);
  const door = await ev(`(async () => { const R = await import('/js/neighbors/indoor-rules.js'); return R.doorSpot({ houseStage: ${sc.stage}, style: ${JSON.stringify(sc.style)} }, { x: 0, z: 700 }); })()`);
  r.door = door;
  await tp(door.x, door.z + 1.0, 0); await b.sleep(1200);
  r.atDoor = await state();
  await shot(`${sc.name}-1-door`);
  if (sc.stage < 3) { await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(2000); r.home = await state(); continue; }
  await key(); await b.sleep(2500);
  r.inside = await state();
  r.perfInside = await perf();
  await shot(`${sc.name}-2-in-f0`);
  const first = ROOM[sc.stage].find(d => d.f === 0);
  await tp(first.x + 0.9, 780 + first.z, 0); await b.sleep(900);
  r.tag = await state();
  await shot(`${sc.name}-3-tag`);
  // 계단 — stairLayout(7) 중심 (-2.1, -0.35) · 프롬프트 반경 1.9
  await tp(-2.1 + 1.0, 780 - 0.35 + 1.0, 0); await b.sleep(1000);
  r.stair0 = await state();
  if (r.stair0.nearDoor === 'nbfloor') { await key(); await b.sleep(2000); r.f1 = await state(); await shot(`${sc.name}-4-f1`); }
  if (sc.stage >= 6) {   // 2층 계단: 위/아래 두 버튼 → 루프탑
    await tp(-1.8 + 1.0, 780 - 0.3 + 1.0); await b.sleep(1000);
    r.stair1 = await state();
    await ev(`[...document.querySelectorAll('button')].filter(x => x.offsetParent && /🪜/.test(x.textContent)).find(x => !/1층|Ground|1F/.test(x.textContent))?.click()`); await b.sleep(2000);
    r.roof = await state(); await shot(`${sc.name}-5-roof`);
  }
  if (sc.name === 's5') {   // 1층으로 → 문으로 마당 → 다시 들어가기(재사용)
    await ev(`(async () => { const g = await import('/js/game.js'); g.$w.nearDoorFloor = 0; (await import('/js/spaces/neighbor.js')).neighborAction('nbfloor'); })()`); await b.sleep(1500);
    await tp(0, 780 - 7 + 1.0, 0); await b.sleep(1000);
    r.exitDoor = await state();
    await key(); await b.sleep(2000);
    r.backYard = await state(); await shot(`${sc.name}-6-yard`);
    await key(); await b.sleep(2000);
    r.reenter = await state();
  }
  await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(2500);
  r.home = await state();
  r.countsAfter = await counts();
}
log.after = { counts: await counts(), perf: await perf() };
log.errors = b.logs.slice(0, 20);
await h.close();
console.log(JSON.stringify(log, null, 1));
process.exit(0);
