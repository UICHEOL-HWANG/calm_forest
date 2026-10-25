import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from '../neighbor-indoor/verify/harness.mjs';

const DEV = process.argv[2] || 'pc';
const OUT = path.resolve(import.meta.dirname, 'shots'); mkdirSync(OUT, { recursive: true });
const PID = '11111111-2222-4333-8444-555555555555';
const h = await open(DEV === 'mobile' ? { w: 390, h: 844, mobile: true, cdpPort: 9371 } : { cdpPort: 9372 });
const { b, ev, until } = h;
const shot = (n) => b.shot(path.join(OUT, `${DEV}-${n}.png`));
await h.enterGame('house=5&time=0.4');
await b.sleep(2000);

await ev(`(async () => { const g = await import('/js/game.js'); g.player.position.set(-4, 0, 29); g.snapCamera(); })()`);
await b.sleep(2500);
await shot('0-gate');

const list = [
  { public_id: PID, nick: '숲속곰돌이', character: 'bear', house_stage: 5, decor_n: 12, visited_today: false },
  { public_id: '22222222-2222-4333-8444-555555555555', nick: '토끼네집', character: 'rabbit', house_stage: 4, decor_n: 3, visited_today: true },
  { public_id: '33333333-2222-4333-8444-555555555555', nick: '고양이마을', character: 'cat', house_stage: 6, decor_n: 27, visited_today: false },
];
const data = { nickname: '숲속곰돌이', character: 'bear', equipped: {}, pet: { kind: 'dog', works: 3 }, houseStage: 5, houseStyle: { roof: 1, wall: 2, door: 0 }, style: null, addons: [],
  outdoor: [{ id: 'flowerbed', x: -5, z: -3, rot: 0 }], room: [{ id: 'bed', x: 4, z: 3, rot: 0, f: 0 }] };
await ev(`(async () => { const A = (await import('/js/neighbors/net.js')).neighborApi;
  A.today = async () => ({ ok: true, list: ${JSON.stringify(list)}, rewardedToday: 1 });
  A.showcase = async () => ({ ok: true, data: ${JSON.stringify(data)}, loadMs: 1 });
  A.viewStart = async () => ({ ok: false, reason: 'offline' }); A.viewEnd = async () => ({ ok: false, reason: 'offline' });
  await (await import('/js/spaces/neighbor.js')).openNeighborPicker('look'); })()`);
await b.sleep(1500);
await shot('1-picker');
await ev(`document.querySelector('#nb-pick-modal .nb-go')?.click()`);
await until(`(async () => (await import('/js/game.js')).atNeighbor)()`, 15000);
await b.sleep(5000);
await shot('2-yard');
const door = await ev(`(async () => { const R = await import('/js/neighbors/indoor-rules.js'); return R.doorSpot({ houseStage: 5, style: null }, { x: 0, z: 700 }); })()`);
await ev(`(async () => { const g = await import('/js/game.js'); g.player.position.set(${door.x} + 0.6, 0, ${door.z} + 1.2); g.snapCamera(); })()`);
await b.sleep(2000);
await shot('3-host');
await h.close();
console.log('ok');
process.exit(0);
