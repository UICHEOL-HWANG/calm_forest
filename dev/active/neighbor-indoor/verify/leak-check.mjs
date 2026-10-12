// 🧹 반복 방문 누수 확인 — 마당만 N회 vs 실내까지 N회. renderer.info.memory geoms/tex 추이
import { open } from './harness.mjs';

const PID = '11111111-2222-4333-8444-555555555555';
const N = 4;
const h = await open();
const { b, ev, until, key } = h;
const mem = () => ev(`(() => { const p = window.__perf(); return [p.geoms, p.tex]; })()`);
await h.enterGame('house=3');
await b.sleep(1500);
async function visit(stage, indoor) {
  const data = { nickname: '누수', character: 'bear', equipped: {}, pet: null, houseStage: stage, houseStyle: { roof: 0, wall: 0, door: 0 }, style: null, addons: [], outdoor: [],
    room: [{ id: 'bed', x: 4, z: 3, rot: 0, f: 0 }, { id: 'table', x: 2, z: -2, rot: 0, f: 0 }, { id: 'bookshelf', x: -4, z: 6, rot: 0, f: 0 }, { id: 'piano', x: 3, z: 3, rot: 1, f: 1 }] };
  await ev(`(async () => { const A = (await import('/js/neighbors/net.js')).neighborApi;
    A.today = async () => ({ ok: true, list: [{ public_id: '${PID}', nick: '누수', character: 'bear', house_stage: ${stage}, decor_n: 1, visited_today: false }], rewardedToday: 0 });
    A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 1 });
    A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
    await (await import('/js/spaces/neighbor.js')).openNeighborPicker('leak'); })()`);
  await b.sleep(1000); await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
  await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000); await b.sleep(1200);
  if (indoor) {
    await ev(`(async () => { const g = await import('/js/game.js'); g.player.position.set(0, 0, 704); })()`); await b.sleep(800);
    await key(); await b.sleep(1500);
  }
  await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(2000);
  return mem();
}
const out = { start: await mem(), yard: [], indoor: [] };
for (let i = 0; i < N; i++) out.yard.push(await visit(5, false));
for (let i = 0; i < N; i++) out.indoor.push(await visit(5, true));
await h.close();
console.log(JSON.stringify(out));
process.exit(0);
