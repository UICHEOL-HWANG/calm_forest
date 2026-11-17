import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeShowcase } from '../js/neighbors/sanitize.js';
import { neighborPond, neighborPondView, pondCovers } from '../js/neighbors/rules.js';
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
  assert.deepEqual(sanitizeShowcase(base, ctx).pond, { fish: [], sea: null, seas: [], has: false, stage: 1 });
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

test('seas 는 아는 종·양수 무게만, 종 중복 없이 4마리까지', () => {
  const seasOf = (pond) => sanitizeShowcase({ ...base, pond }, ctx).pond.seas;
  const four = [{ sp: 'tuna', w: 70 }, { sp: 'mola', w: 40 }, { sp: 'buri', w: 9.5 }, { sp: 'aji', w: 1 }];
  assert.deepEqual(seasOf({ fish: [], sea: four[0], seas: four }), four);
  assert.deepEqual(seasOf({ fish: [], seas: [...four, { sp: 'tuna', w: 99 }] }), four);
  assert.deepEqual(seasOf({ fish: [], seas: [{ sp: 'tuna', w: 70, extra: 1 }, { sp: 'tuna', w: 60 }, { sp: 'whale', w: 5 }, null, 'aji', { sp: 'aji', w: '3' }, { sp: 'buri', w: 0 }, { sp: 'mola', w: Infinity }, { sp: 'mola', w: -2 }, [], { sp: 'aji', w: 2 }] }), [{ sp: 'tuna', w: 70 }, { sp: 'aji', w: 2 }]);
  assert.deepEqual(seasOf({ fish: [], seas: [] }), []);
});

test('seas 가 없거나 배열이 아니면 sea 한 마리로', () => {
  const seasOf = (pond) => sanitizeShowcase({ ...base, pond }, ctx).pond.seas;
  assert.deepEqual(seasOf({ fish: [], sea: { sp: 'tuna', w: 70 } }), [{ sp: 'tuna', w: 70 }]);
  for (const v of [null, 'tuna', 4, { sp: 'aji', w: 1 }, true]) {
    assert.deepEqual(seasOf({ fish: [], sea: { sp: 'buri', w: 3 }, seas: v }), [{ sp: 'buri', w: 3 }], JSON.stringify(v));
  }
  assert.deepEqual(seasOf({ fish: ['common'] }), []);
  assert.deepEqual(seasOf({ fish: [], sea: { sp: 'whale', w: 3 } }), []);
  const p = sanitizeShowcase({ ...base, pond: { fish: [], seas: [{ sp: 'aji', w: 1 }] } }, ctx).pond;
  assert.equal(p.has, true);
});

test('이웃 연못에 보이는 대어 수는 단계 한도까지', () => {
  const four = [{ sp: 'tuna', w: 70 }, { sp: 'mola', w: 40 }, { sp: 'buri', w: 9.5 }, { sp: 'aji', w: 1 }];
  const pond = (stage) => ({ fish: ['common'], sea: four[0], seas: four, has: true, stage });
  assert.deepEqual(neighborPondView(pond(1)), { fish: ['common'], seas: [four[0]] });
  assert.deepEqual(neighborPondView(pond(2)), { fish: ['common'], seas: four });
  assert.deepEqual(neighborPondView(pond(3)).seas, four);
  assert.deepEqual(neighborPondView({ fish: [], sea: null, has: false, stage: 3 }), { fish: [], seas: [] });
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
  assert.match(SCENE, /p\.setContents\(neighborPondView\(view\.pond\), [^\n]+, pondFishLimits\(ps\.stage\)\);/);
  assert.match(SCENE, /if \(pondCovers\(pond, Math\.cos\(a\) \* R, Math\.sin\(a\) \* R\)\) continue;/);
  assert.match(SCENE, /if \(pondCovers\(pond, x, z, CANOPY_R\)\) continue;/);
  assert.match(SCENE, /new THREE\.ConeGeometry\(CANOPY_R, 2\.4, 7\)/);
  assert.doesNotMatch(SCENE, /pickPondSpot|POND_SPOTS|POND_R\b/);
  assert.ok(readFileSync(new URL('../js/pond/build.js', import.meta.url), 'utf8').includes('const seas = view.seas ?? (view.sea ? [view.sea] : []);'));
});
