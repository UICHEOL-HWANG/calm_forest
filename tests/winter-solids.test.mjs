import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plazaPropSolids, winterPropSolids, streetLamps, SCARECROW, PUMPKIN_PILE, LAMP_POSTS, FOUNTAIN_BASIN_R } from '../js/plaza/solids.js';
import { lampSpot } from '../js/plaza/winter-rules.js';
import { PLAZA, PLAZA_BOX, PLAZA_FOUNTAIN } from '../js/data/plaza.js';

const has = (list, x, z) => list.some(([sx, sz, r]) => Math.hypot(sx - x, sz - z) < r);
const w = (x, z) => [PLAZA.x + x, PLAZA.z + z];

test('겨울: 호박 더미는 빠지고 나머지 완공 기물·명판은 막힌다', () => {
  const s = winterPropSolids();
  assert.ok(!has(s, ...w(PUMPKIN_PILE.x, PUMPKIN_PILE.z)));
  assert.ok(has(s, ...w(SCARECROW.x, SCARECROW.z)));
  assert.ok(has(s, PLAZA_BOX.x, PLAZA_BOX.z));
  assert.ok(has(plazaPropSolids(4, 'after'), ...w(PUMPKIN_PILE.x, PUMPKIN_PILE.z)), '수확제 경로는 그대로');
});

test('겨울: 분수와 등불 9개가 막힌다', () => {
  const s = winterPropSolids();
  assert.ok(has(s, ...w(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.z)));
  for (let i = 0; i < 9; i++) { const p = lampSpot(i); assert.ok(has(s, ...w(p.x, p.z)), `등불 ${i}`); }
});

test('겨울: 명판과 분수 사이·광장 가운데로 걸어 들어갈 수 있다', () => {
  const s = winterPropSolids();
  assert.ok(!has(s, PLAZA.x, PLAZA.z + 2));
  assert.ok(!has(s, ...w(-0.4, 3.0)));
});

test('분수 충돌 원은 명판·벤치·나무와 겹치지 않는다', () => {
  const f = w(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.z);
  for (const [x, z, r] of [[PLAZA_BOX.x, PLAZA_BOX.z, 0.6], [...w(3.6, 0), 0.5], [...w(0, 0), 1.0]]) {
    assert.ok(Math.hypot(f[0] - x, f[1] - z) > FOUNTAIN_BASIN_R + r, `${x},${z}`);
  }
});

test('가로등: 수확제는 그대로 세우고 겨울은 빼며 충돌체도 따라간다', () => {
  assert.deepEqual(streetLamps(), LAMP_POSTS);
  assert.deepEqual(streetLamps({ winter: true }), []);
  for (const [x, z] of LAMP_POSTS) {
    assert.ok(has(plazaPropSolids(4, 'after'), ...w(x, z)), `수확제 가로등 ${x}`);
    assert.ok(!has(winterPropSolids(), ...w(x, z)), `겨울 가로등 ${x}`);
  }
});
