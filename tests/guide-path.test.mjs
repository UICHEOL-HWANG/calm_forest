import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNav } from '../js/guide/path.js';

test('clear line goes straight to the target', () => {
  const nav = createNav([[{ x: 5, z: 5 }, 1]]);
  const t = { x: 10, z: 0 };
  assert.equal(nav.route({ x: 0, z: 0 }, t), t);
});

test('a wall of small circles is walked around its end, not into it', () => {
  const wall = Array.from({ length: 13 }, (_, i) => [{ x: 5, z: -3 + i * 0.5 }, 0.3]);
  const nav = createNav(wall);
  const w = nav.route({ x: 0, z: 0 }, { x: 10, z: 0 });
  assert.ok(Math.abs(w.z) > 3, `goes round an end: ${w.x},${w.z}`);
});

test('a target inside a solid (a resident) is still reachable', () => {
  const nav = createNav([[{ x: 5, z: 0 }, 0.6], [{ x: 2.5, z: 0 }, 0.8]]);
  const w = nav.route({ x: 0, z: 0 }, { x: 5, z: 0 });
  assert.ok(Math.abs(w.z) > 0.8);
});
