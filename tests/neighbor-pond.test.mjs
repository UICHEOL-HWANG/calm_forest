import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeShowcase } from '../js/neighbors/sanitize.js';
import { neighborPond, pondCovers } from '../js/neighbors/rules.js';
import { POND_BIG_SPOT, POND_SPOTS } from '../js/data/pond.js';

const ctx = {
  outdoorIds: new Set(['bench']), decorIds: new Set(), animalIds: new Set(['bear']), fallbackAnimal: 'bear',
  yard: { x: -8, z: -8 },
  pondRiverIds: ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'],
  seaIds: ['aji', 'buri', 'mola', 'tuna'],
};
const base = { houseStage: 3, nickname: 'a', character: 'bear', outdoor: [] };
const SCENE = readFileSync(new URL('../js/neighbors/scene.js', import.meta.url), 'utf8');

test('pond 없으면 has=false', () => {
  assert.deepEqual(sanitizeShowcase(base, ctx).pond, { fish: [], sea: null, has: false, stage: 1 });
});

test('모르는 id·중복·8개 이상은 버린다', () => {
  const raw = { ...base, pond: { fish: ['common', 'common', 'shark', 'rare', 1, 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout'], sea: { sp: 'tuna', w: 70 } } };
  const p = sanitizeShowcase(raw, ctx).pond;
  assert.deepEqual(p.fish, ['common', 'rare', 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout']);
  assert.deepEqual(p.sea, { sp: 'tuna', w: 70 });
});

test('깨진 대어는 null', () => {
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'whale', w: 9 } } }, ctx).pond.sea, null);
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'aji', w: -1 } } }, ctx).pond.sea, null);
});

test('stage 는 1~3 정수만 받고 나머지는 1', () => {
  const stageOf = (pond) => sanitizeShowcase({ ...base, pond }, ctx).pond.stage;
  assert.equal(stageOf({ fish: ['common'], stage: 2 }), 2);
  assert.equal(stageOf({ fish: ['common'], stage: 3 }), 3);
  assert.equal(stageOf({ fish: ['common'] }), 1);
  for (const v of [0, 4, '2', 2.5, null, -1, NaN, true, [2], { n: 2 }]) {
    assert.equal(stageOf({ fish: ['common'], stage: v }), 1, `stage ${JSON.stringify(v)}`);
  }
});

test('연못 자리 · 1단계는 빈 작은 자리, 2~3단계는 늘 큰 자리', () => {
  const pond = (stage) => ({ fish: ['common'], sea: null, has: true, stage });
  assert.equal(neighborPond({ fish: [], sea: null, has: false, stage: 3 }, []), null);
  assert.equal(neighborPond(undefined, []), null);
  assert.deepEqual(neighborPond(pond(1), []), { ...POND_SPOTS[0], r: 2, stage: 1 });
  assert.deepEqual(neighborPond(pond(1), [{ dx: POND_SPOTS[0].dx, dz: POND_SPOTS[0].dz }]), { ...POND_SPOTS[1], r: 2, stage: 1 });
  assert.equal(neighborPond(pond(1), POND_SPOTS.map(s => ({ dx: s.dx, dz: s.dz }))), null);
  const inWay = [...POND_SPOTS, POND_BIG_SPOT].map(s => ({ dx: s.dx, dz: s.dz }));
  assert.deepEqual(neighborPond(pond(2), inWay), { ...POND_BIG_SPOT, r: 2.9, stage: 2 });
  assert.deepEqual(neighborPond(pond(3), inWay), { ...POND_BIG_SPOT, r: 3.9, stage: 3 });
});

test('큰 연못에 걸리는 울타리 기둥과 나무만 뺀다', () => {
  const at = (stage) => neighborPond({ fish: ['common'], sea: null, has: true, stage }, []);
  const posts = Array.from({ length: 48 }, (_, i) => (i / 48) * Math.PI * 2).map(a => [Math.cos(a) * 17.2, Math.sin(a) * 17.2]);
  const trees = [[-15, -8], [-17, 3], [-13, 11], [15, -8], [17, 3], [13, 11], [-7, -16], [7, -16]];
  const hit = (pond, list, pad) => list.filter(([x, z]) => pondCovers(pond, x, z, pad));
  assert.equal(pondCovers(null, -16, -1), false);
  assert.equal(hit(at(1), posts).length + hit(at(1), trees, 1.1).length, 0);
  assert.deepEqual(hit(at(2), trees), []);
  assert.deepEqual(hit(at(2), trees, 1.1), [[-17, 3]]);
  assert.deepEqual(hit(at(3), trees, 1.1), [[-17, 3]]);
  assert.equal(hit(at(2), posts).length, 3);
  assert.equal(hit(at(3), posts).length, 4);
  for (const stage of [2, 3]) {
    const p = at(stage);
    for (const [x, z] of posts) assert.equal(pondCovers(p, x, z), Math.hypot(x - p.dx, z - p.dz) < p.r + 0.6);
  }
});

test('scene.js 는 단계에 맞는 연못을 짓고 고정 세트가 그 자리를 비킨다', () => {
  assert.match(SCENE, /const ps = neighborPond\(view\.pond, view\.outdoor\);/);
  assert.match(SCENE, /group\.add\(fixedSet\(ps\)\);/);
  assert.match(SCENE, /buildPond\(\{ fishMesh, mergeGeos, paintGeo, emojiSprite, r: ps\.r, stage: ps\.stage \}\)/);
  assert.match(SCENE, /p\.setContents\(view\.pond, [^\n]+, pondFishLimits\(ps\.stage\)\);/);
  assert.match(SCENE, /if \(pondCovers\(pond, Math\.cos\(a\) \* R, Math\.sin\(a\) \* R\)\) continue;/);
  assert.match(SCENE, /if \(pondCovers\(pond, x, z, CANOPY_R\)\) continue;/);
  assert.match(SCENE, /new THREE\.ConeGeometry\(CANOPY_R, 2\.4, 7\)/);
  assert.doesNotMatch(SCENE, /pickPondSpot|POND_SPOTS|POND_R\b/);
  assert.ok(readFileSync(new URL('../js/pond/build.js', import.meta.url), 'utf8').includes('const seas = view.seas ?? (view.sea ? [view.sea] : []);'));
});
