import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutAnchors } from '../js/glade/string-layout.js';

const R = 7;
const at = (a, d = R + 1.9) => ({ x: Math.cos(a) * d, z: Math.sin(a) * d });
const real = [-0.89, -0.32, 0.25, 0.82, 1.39, 1.96, 2.53].map(a => at(a));
const TAU = Math.PI * 2;
const gaps = (list) => list.map((p, i) => ((list[(i + 1) % list.length].a - p.a) + TAU) % TAU || TAU);

test('seven real trees get four posts in the empty arc and form eleven anchors', () => {
  const list = layoutAnchors(real, R);
  assert.equal(list.length, 11);
  assert.equal(list.filter(p => p.post).length, 4);
  assert.ok(Math.max(...gaps(list)) < 0.75);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].a > list[i - 1].a);
});

test('tree anchors sit a little inside the trunk, posts sit just outside the floor', () => {
  const list = layoutAnchors(real, R);
  for (const p of list) {
    const d = Math.hypot(p.x, p.z);
    if (p.post) assert.ok(Math.abs(d - (R + 1.5)) < 1e-6);
    else assert.ok(Math.abs(d - (R + 1.9 - 0.7)) < 1e-6);
  }
});

test('trees outside the ring band are ignored', () => {
  const list = layoutAnchors([...real, at(3.5, R + 9), at(-2, 2)], R);
  assert.equal(list.filter(p => !p.post).length, 7);
});

test('no trees gives eleven evenly spaced posts', () => {
  const list = layoutAnchors([], R);
  assert.equal(list.length, 11);
  assert.ok(list.every(p => p.post));
  assert.ok(Math.max(...gaps(list)) - Math.min(...gaps(list)) < 1e-6);
});

test('a full ring of eleven trees needs no posts and extra trees are dropped', () => {
  const full = Array.from({ length: 11 }, (_, i) => at((i / 11) * TAU - Math.PI + 0.01));
  assert.equal(layoutAnchors(full, R).filter(p => p.post).length, 0);
  const crowded = Array.from({ length: 14 }, (_, i) => at((i / 14) * TAU - Math.PI + 0.01));
  const list = layoutAnchors(crowded, R);
  assert.equal(list.length, 11);
  assert.equal(list.filter(p => p.post).length, 0);
});
