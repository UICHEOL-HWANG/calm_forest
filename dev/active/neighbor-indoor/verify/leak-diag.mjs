// 🔎 누수 진단 — 나가기 직전 이웃 그룹의 지오메트리마다 dispose 리스너를 달고, 나간 뒤 안 버려진 것을 하위 트리별로 센다
//   PORT=8061 node dev/active/neighbor-indoor/verify/leak-diag.mjs
import { open } from './harness.mjs';

const PID = '11111111-2222-4333-8444-555555555555';
const h = await open({ cdpPort: 9362 });
const { b, ev, until } = h;
await h.enterGame('house=3');
await b.sleep(1500);
const data = { nickname: '누수', character: 'bear', equipped: {}, pet: { kind: 'spirit', stage: 2 }, houseStage: 5, houseStyle: { roof: 0, wall: 0, door: 0 }, style: null, addons: [], outdoor: [], room: [] };
await ev(`(async () => { const A = (await import('/js/neighbors/net.js')).neighborApi;
  A.today = async () => ({ ok: true, list: [{ public_id: '${PID}', nick: '누수', character: 'bear', house_stage: 5, decor_n: 1, visited_today: false }], rewardedToday: 0 });
  A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 1 });
  A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
  await (await import('/js/spaces/neighbor.js')).openNeighborPicker('leak'); })()`);
await b.sleep(1000); await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
console.log('at', await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000)); await b.sleep(1200);
console.log(await ev(`(async () => { const g = await import('/js/game.js'); const grp = g.scene.getObjectByName('neighbor');
  window.__diag = [];
  grp.children.forEach((c, i) => { const label = i + ':' + (c.name || c.type) + (c.userData?.part ? '' : '');
    const seen = new Set();
    c.traverse(o => { if (o.isMesh && o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); const rec = { label, type: o.geometry.type, gone: false };
      o.geometry.addEventListener('dispose', () => { rec.gone = true; }); window.__diag.push(rec); } }); });
  //  내 캐릭터(+따라오는 펫) 지오메트리 — 이웃 쪽과 겹치면 안 되고, 나간 뒤에도 하나도 버려지면 안 된다
  const mine = new Set(); g.scene.traverse(o => { if (o.isMesh && o.geometry && !grp.getObjectById(o.id)) mine.add(o.geometry); });
  let pMine = 0; g.player.traverse(o => { if (o.isMesh && o.geometry) { pMine++; const mesh = o; o.geometry.addEventListener('dispose', () => { window.__mineGone = (window.__mineGone || 0) + 1; (window.__mineLive ||= []).push(!!g.player.getObjectById(mesh.id)); }); } });
  const shared = window.__diag.length; let overlap = 0; grp.traverse(o => { if (o.isMesh && mine.has(o.geometry)) overlap++; });
  return JSON.stringify({ children: grp.children.length, playerMeshes: pMine, overlapWithWorld: overlap }); })()`));
await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(2000);
console.log(await ev(`JSON.stringify((() => { const by = {}; for (const r of window.__diag) { const k = r.label; by[k] ??= { total: 0, leaked: 0, types: {} }; by[k].total++; if (!r.gone) { by[k].leaked++; by[k].types[r.type] = (by[k].types[r.type] || 0) + 1; } } return by; })(), null, 1)`));
console.log('mine disposed after exit:', await ev(`window.__mineGone || 0`), 'still attached to player:', await ev(`(window.__mineLive || []).filter(Boolean).length`));
await h.close();
process.exit(0);
