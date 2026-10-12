// 🎨 루프탑·정원 바깥 풍경 시안 A/B/C — 코드 변경 없이 런타임에 임시 오브젝트를 얹어 캡처
//   A 지금 그대로(베이지 안개) · B 잔디 바닥 원판 · C 잔디 + 나무 둘레
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const DEV = process.argv[2] || 'pc';
const OUT = path.resolve(import.meta.dirname, '../mock'); mkdirSync(OUT, { recursive: true });
const PID = '11111111-2222-4333-8444-555555555555';
const h = await open(DEV === 'mobile' ? { w: 390, h: 844, mobile: true } : {});
const { b, ev, until } = h;
await h.enterGame('house=3&time=0.4');
await b.sleep(1500);

async function visit(stage, style, room) {
  const data = { nickname: '시안', character: 'bear', equipped: {}, pet: null, houseStage: stage, houseStyle: { roof: 1, wall: 2, door: 0 }, style, addons: [], outdoor: [], room };
  await ev(`(async () => { const A = (await import('/js/neighbors/net.js')).neighborApi;
    A.today = async () => ({ ok: true, list: [{ public_id: '${PID}', nick: '시안', character: 'bear', house_stage: ${stage}, decor_n: 1, visited_today: false }], rewardedToday: 0 });
    A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 1 });
    A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
    await (await import('/js/spaces/neighbor.js')).openNeighborPicker('mock'); })()`);
  await b.sleep(1000); await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
  await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000); await b.sleep(1200);
  await ev(`(async () => { const g = await import('/js/game.js'); const R = await import('/js/neighbors/indoor-rules.js');
    const d = R.doorSpot({ houseStage: ${stage}, style: ${JSON.stringify(style)} }, { x: 0, z: 700 }); g.player.position.set(d.x, 0, d.z + 1); })()`);
  await b.sleep(900);
  await ev(`(async () => (await import('/js/spaces/neighbor.js')).neighborAction('nbenter'))()`); await b.sleep(1800);
}
const goFloor = (f) => ev(`(async () => { const g = await import('/js/game.js'); g.$w.nearDoorFloor = ${f}; (await import('/js/spaces/neighbor.js')).neighborAction('nbfloor'); })()`);
const variant = (v) => ev(`(async () => { const T = await import('three'); const g = await import('/js/game.js');
  const old = g.scene.getObjectByName('mock-outside'); if (old) g.scene.remove(old);
  if ('${v}' === 'A') return 'A';
  const grp = new T.Group(); grp.name = 'mock-outside';
  const ground = new T.Mesh(new T.CircleGeometry(40, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xa9d68f, roughness: 1 }));
  ground.position.set(0, -0.02, 780); grp.add(ground);
  if ('${v}' === 'C') {
    const trunk = new T.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.95, flatShading: true });
    const leaf = new T.MeshStandardMaterial({ color: 0x6fb46a, roughness: 0.9, flatShading: true });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 13 + (i % 3);
      const t = new T.Mesh(new T.CylinderGeometry(0.18, 0.24, 1.2, 6), trunk); t.position.set(Math.cos(a) * r, 0.6, 780 + Math.sin(a) * r); grp.add(t);
      const c = new T.Mesh(new T.ConeGeometry(1.1, 2.4, 7), leaf); c.position.set(Math.cos(a) * r, 2.2, 780 + Math.sin(a) * r); grp.add(c); }
  }
  g.scene.add(grp); return '${v}'; })()`);
const shoot = async (tag) => { for (const v of ['A', 'B', 'C']) { await variant(v); await b.sleep(900); await b.shot(path.join(OUT, `${DEV}-${tag}-${v}.png`)); } await variant('A'); };

// 6단계 루프탑
await visit(6, null, [{ id: 'jacuzzi', x: 2, z: 2, rot: 0, f: 2 }, { id: 'firepit', x: -2, z: 3, rot: 0, f: 2 }, { id: 'sofa', x: 3, z: 4, rot: 0, f: 0 }]);
await goFloor(1); await b.sleep(1500); await goFloor(2); await b.sleep(1800);
await shoot('roof');
await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(2500);
// 7단계 모던 정원
await visit(7, 'modern', [{ id: 'plant', x: -3, z: 2, rot: 0, f: 3 }, { id: 'bigsofa', x: 3, z: 4, rot: 0, f: 0 }]);
await goFloor(3); await b.sleep(1800);
await shoot('garden');
await ev(`document.getElementById('nb-exit')?.click()`); await b.sleep(1500);
await h.close();
console.log('ok');
process.exit(0);
