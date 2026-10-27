import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLY_TIME, LAND_HOLD, REGIONS, createRegionRig, orbPoint, regionFor, regionFrame } from '../js/world/region-cine.js';
import { UNLOCK_IDS } from '../js/world/unlocks.js';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const finite = (p) => [p.x, p.y, p.z].every(Number.isFinite);
const home = (pos, look) => { Object.assign(pos, { x: 1, y: 14, z: 12 }); Object.assign(look, { x: 1, y: 1.2, z: -4 }); };
const run = (rig, secs, dt = 1 / 60) => { const seen = new Set(); for (let t = 0; t < secs; t += dt) seen.add(rig.update(dt)); return seen; };

test('지역 표: 서식지 5가지 + 물 꾸러미 = 6곳, 그 밖의 완성은 지역 연출이 없다', () => {
  assert.equal(Object.keys(REGIONS).length, 6);
  for (const b of ['water', 'farm', 'kitchen', 'forest', 'mine']) assert.ok(regionFor(b, 'habitat'), b);
  assert.ok(regionFor('water', 'bundles'));
  assert.equal(regionFor('farm', 'bundles'), null);
  assert.equal(regionFor('water', 'bloom'), null);
  assert.equal(regionFor('water', 'chapter'), null);
});

test('지역 표: 솟아오르는 건물은 실제 해금 id 이고, 광산만 솟아오름이 없다', () => {
  for (const r of Object.values(REGIONS)) {
    if (r.place) assert.ok(UNLOCK_IDS.includes(r.place), r.place);
    assert.ok(Number.isFinite(r.at.x) && Number.isFinite(r.at.z));
    assert.ok(['water', 'farm', 'kitchen', 'forest', 'mine'].includes(r.fx));
  }
  assert.equal(regionFor('mine', 'habitat').place, null);
  assert.equal(regionFor('water', 'habitat').place, 'river');
  assert.equal(regionFor('water', 'bundles').place, 'sea');
  assert.deepEqual(Object.values(REGIONS).map(r => r.npc), ['angler', 'ferryman', 'farmer', 'chef', 'forager', 'miner']);
  for (const r of Object.values(REGIONS)) assert.ok(UNLOCK_IDS.includes(r.npc), r.npc);
});

test('지역 좌표는 js/data/places.js 의 입구 좌표와 같다', () => {
  const src = read('js/data/places.js');
  const pos = (name) => { const m = src.match(new RegExp(`export const ${name} = new THREE\\.Vector3\\(([-\\d.]+), 0, ([-\\d.]+)\\)`)); return { x: +m[1], z: +m[2] }; };
  const want = { 'water:habitat': 'DOCK_GATE', 'water:bundles': 'SEA_GATE', 'farm:habitat': 'COOP', 'kitchen:habitat': 'KITCHEN', 'forest:habitat': 'FOREST', 'mine:habitat': 'MINE_GATE' };
  for (const [k, name] of Object.entries(want)) assert.deepEqual(REGIONS[k].at, pos(name), k);
});

test('자막: 승인 문구 그대로 · 엠대시 없음 · 영어 사전에 있다', () => {
  const want = {
    'water:habitat': ['💧 물의 가지', '나루터에 물이 다시 흘러요'],
    'water:bundles': ['💧 물의 가지', '바다로 가는 길이 열렸어요'],
    'farm:habitat': ['🌾 밭의 가지', '닭장에 다시 활기가 돌아요'],
    'kitchen:habitat': ['🍳 부엌의 가지', '부엌에 불이 켜졌어요'],
    'forest:habitat': ['🌲 숲의 가지', '숲길이 다시 열렸어요'],
    'mine:habitat': ['⛏️ 광산의 가지', '동굴에 빛이 돌아왔어요'],
  };
  const en = read('js/i18n-en.js');
  for (const [k, [sub, main]] of Object.entries(want)) {
    assert.equal(REGIONS[k].sub, sub);
    assert.equal(REGIONS[k].main, main);
    assert.ok(!/—/.test(sub + main));
    assert.ok(en.includes(`'${main}'`), main);
  }
});

test('빛 경로: 가지 끝에서 출발해 지역 위에 내려앉고, 가운데는 위로 솟는다', () => {
  const a = { x: 0, y: 7, z: -30 }, b = { x: -4.5, y: 1.4, z: 11.5 };
  assert.deepEqual(orbPoint(a, b, 0), a);
  const end = orbPoint(a, b, 1);
  assert.ok(Math.abs(end.x - b.x) < 1e-9 && Math.abs(end.y - b.y) < 1e-9 && Math.abs(end.z - b.z) < 1e-9);
  assert.ok(orbPoint(a, b, 0.5).y > Math.max(a.y, b.y) + 1);
});

test('지역 구도: 폰 세로는 더 물러나고, 시선은 지역 바로 위', () => {
  const at = { x: 7.4, z: -6.4 };
  const land = regionFrame(at, 1280 / 720), port = regionFrame(at, 390 / 844);
  const d = (f) => Math.hypot(f.pos.x - f.look.x, f.pos.y - f.look.y, f.pos.z - f.look.z);
  assert.ok(d(port) > d(land) * 1.2);
  assert.equal(land.look.x, 7.4);
  assert.equal(land.look.z, -6.4);
  assert.ok(land.pos.y > land.look.y + 5);
});

const mkRig = (extra = {}) => {
  let landed = 0;
  const rig = createRegionRig({
    from: { pos: { x: 4, y: 14, z: -10 }, look: { x: 4, y: 6, z: -34 } },
    tip: { x: 0.4, y: 7, z: -30 }, at: { x: -4.5, z: 11.5 }, aspect: 16 / 9, home,
    onLand: () => { landed++; }, ...extra,
  });
  return { rig, landed: () => landed };
};

test('리그: 날기 → 내려앉아 머물기 → 기본 시점 → 끝, 내려앉을 때 한 번만 부른다', () => {
  const { rig, landed } = mkRig();
  assert.equal(rig.phase, 'fly');
  const seen = run(rig, FLY_TIME + LAND_HOLD + 2);
  assert.deepEqual([...seen], ['fly', 'land', 'out', 'done']);
  assert.equal(landed(), 1);
  assert.ok(finite(rig.cur.pos) && finite(rig.cur.look));
  assert.deepEqual(rig.cur.pos, { x: 1, y: 14, z: 12 });
});

test('리그: 빛은 날기 동안에만 보이고, 끝나면 지역 위에 있다', () => {
  const { rig } = mkRig();
  rig.update(FLY_TIME / 2);
  assert.ok(rig.orb.visible);
  assert.ok(finite(rig.orb));
  rig.update(FLY_TIME / 2 + 0.01);
  assert.equal(rig.phase, 'land');
  assert.equal(rig.orb.visible, false);
});

test('리그: 날던 중 넘기면 그래도 내려앉음을 부르고 짧게 돌아온다', () => {
  const { rig, landed } = mkRig();
  rig.update(0.5);
  rig.skip();
  assert.equal(landed(), 1);
  assert.equal(rig.phase, 'out');
  const seen = run(rig, 0.8);
  assert.ok(seen.has('done'));
  assert.equal(landed(), 1);
});

test('리그: 머무는 중 넘겨도 내려앉음은 한 번뿐', () => {
  const { rig, landed } = mkRig();
  run(rig, FLY_TIME + 0.3);
  rig.skip();
  run(rig, 1);
  assert.equal(landed(), 1);
  assert.equal(rig.phase, 'done');
});

test('연결: 조망샷이 지역 리그로 이어지고, 넘기면 지역 표시를 바로 푼다', () => {
  const src = read('js/spaces/world-tree.js');
  assert.match(src, /createRegionRig/);
  assert.match(src, /regionFor\(/);
  assert.match(src, /releasePlaceReveal/);
  assert.match(src, /holdPlaceReveal/);
  assert.match(src, /startReturnWalk/);
  assert.match(src, /region:/);
});

test('게임: 해금 건물 숨김은 만료가 있어 영원히 숨지 않는다', () => {
  const src = read('js/game.js');
  assert.match(src, /holdPlaceReveal, keepPlaceReveal, releasePlaceReveal, startReturnWalk,/);
  assert.match(src, /revealHolds\.set\(id, Date\.now\(\) \+ REVEAL_HOLD_MS\)/);
  assert.match(src, /isOpen\(id\) && !\(revealHolds\.get\(id\) > Date\.now\(\)\)/);
  assert.match(src, /afterModals\(\(\) => startReturnWalk\(id\)\)/);
  assert.match(src, /return until > Date\.now\(\) \? lockHolders\[id\]\?\.group \|\| null : null;/);
  assert.match(read('js/spaces/world-tree.js'), /for \(const q of shotQueue\) if \(q\.region\?\.place\) keepPlaceReveal\(q\.region\.place\);/);
});
