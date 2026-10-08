import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auraPoints, lookOf, AURA_R, BAND_Y } from '../js/aura/render.js';
import { MOTIONS, BANDS } from '../js/aura/recipe.js';

const base = { shape: 'dot', motion: 'orbit', band: 'body', count: 14, speed: 1, radius: 1, colors: ['mint', 'cream'] };

test('개수만큼 점을 내고 반경 안에 머문다(모든 움직임·높이)', () => {
  for (const motion of MOTIONS) for (const band of BANDS) for (const radius of [0.7, 1.3]) {
    const pts = auraPoints({ ...base, motion, band, radius }, 3.7);
    assert.equal(pts.length, 14, `${motion}/${band}`);
    for (const p of pts) {
      assert.ok(Math.hypot(p.x, p.z) <= AURA_R * radius * 1.05 + 1e-9, `${motion} 반경`);
      assert.ok(p.y >= 0 && p.y <= BAND_Y[band] + 1.0, `${motion} 높이 ${p.y}`);
      assert.ok(p.k >= 0 && p.k <= 1);
    }
  }
});

test('같은 시각이면 같은 배치, out 배열을 재사용한다', () => {
  const out = [];
  const a = auraPoints(base, 1.25, out);
  assert.equal(a, out);
  assert.deepEqual(auraPoints(base, 1.25).map(p => p.x), a.map(p => p.x));
});

test('lookOf: tune 이 레시피를 덮는다', () => {
  const look = lookOf({ id: 'o', recipe: base, tune: { count: 6, speed: 0.5, radius: 1.3, colors: ['gold', 'snow'] } });
  assert.equal(look.count, 6); assert.equal(look.radius, 1.3); assert.deepEqual(look.colors, ['gold', 'snow']);
  assert.equal(look.shape, 'dot');
});
