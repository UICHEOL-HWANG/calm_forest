import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pillSide, pillX, PILL_HYST, PILL_DX, PILL_HALF } from '../js/hud/mobile-hud.js';
import { giftSpot, GIFT_NEAR, GIFT_AWAY } from '../js/delve/pests.js';
import { HEARTS_SIZE, GIFT_SIZE, heartsCenterY } from '../js/delve/badge-math.js';
import { DELVE_HALF } from '../js/data/delve.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('near pill: stays right without a point to avoid', () => {
  assert.equal(pillSide(1, 300, null), 1);
  assert.equal(pillSide(-1, 300, null), 1);
});

test('near pill: flips to the side away from the pest on screen', () => {
  assert.equal(pillSide(1, 300, 300 + PILL_HYST + 1), -1);
  assert.equal(pillSide(-1, 300, 300 - PILL_HYST - 1), 1);
});

test('near pill: keeps its side while the pest jitters around the player x', () => {
  for (const dx of [-PILL_HYST + 1, -2, 0, 2, PILL_HYST - 1]) {
    assert.equal(pillSide(1, 300, 300 + dx), 1, `right ${dx}`);
    assert.equal(pillSide(-1, 300, 300 + dx), -1, `left ${dx}`);
  }
});

test('near pill: default offset when nothing to avoid or the pest is already clear', () => {
  assert.equal(pillX(300, 1, null), 300 + PILL_DX);
  assert.equal(pillX(300, -1, { x: 360, r: 20 }), 300 - PILL_DX);
  assert.equal(pillX(300, 1, { x: 220, r: 20 }), 300 + PILL_DX);
});

test('near pill: a pest in line with the player pushes the pill further out until it clears', () => {
  for (const side of [1, -1]) {
    for (const a of [{ x: 300, r: 28 }, { x: 305, r: 30 }, { x: 296, r: 12 }]) {
      const cx = pillX(300, side, a);
      assert.ok(side > 0 ? cx - PILL_HALF >= a.x + a.r : cx + PILL_HALF <= a.x - a.r, `${side} ${JSON.stringify(a)} ${cx}`);
      assert.ok(Math.abs(cx - 300) >= PILL_DX);
    }
  }
});

const R = { x: 1, z: 0 };

test('gift far from the player stays where the pest gave up', () => {
  const at = { x: 2, z: 1 };
  assert.deepEqual(giftSpot(at, { x: 2 + GIFT_NEAR + 0.1, z: 1 }, R), at);
  assert.ok(GIFT_NEAR >= 1.0);
});

test('gift next to the player moves sideways on screen to the pest side', () => {
  const s = giftSpot({ x: 0.5, z: 0.3 }, { x: 0, z: 0 }, R);
  assert.ok(Math.abs(s.x - GIFT_AWAY) < 1e-9 && Math.abs(s.z) < 1e-9, JSON.stringify(s));
  const l = giftSpot({ x: -0.2, z: 0.6 }, { x: 0, z: 0 }, R);
  assert.ok(Math.abs(l.x + GIFT_AWAY) < 1e-9 && Math.abs(l.z) < 1e-9, JSON.stringify(l));
  const behind = giftSpot({ x: 1, z: 0.1 }, { x: 1, z: 1 }, R);
  assert.ok(Math.abs(Math.abs(behind.x - 1) - GIFT_AWAY) < 1e-9 && Math.abs(behind.z - 1) < 1e-9, JSON.stringify(behind));
  const rot = { x: Math.SQRT1_2, z: Math.SQRT1_2 };
  const r = giftSpot({ x: 0.3, z: 0.3 }, { x: 0, z: 0 }, rot);
  assert.ok(Math.abs(r.x - rot.x * GIFT_AWAY) < 1e-9 && Math.abs(r.z - rot.z * GIFT_AWAY) < 1e-9, JSON.stringify(r));
});

test('gift stays inside the room and off unbroken rocks', () => {
  const lim = DELVE_HALF - 0.3;
  const wall = giftSpot({ x: lim, z: 0 }, { x: lim - 0.5, z: 0 }, R);
  assert.ok(Math.abs(wall.x) <= lim && Math.abs(wall.z) <= lim);
  assert.ok(Math.abs(d(wall, { x: lim - 0.5, z: 0 }) - GIFT_AWAY) < 1e-9, JSON.stringify(wall));
  const rock = { x: GIFT_AWAY, z: 0 };
  const s = giftSpot({ x: 0.4, z: 0 }, { x: 0, z: 0 }, R, q => d(q, rock) < 0.6);
  assert.ok(d(s, rock) >= 0.6 && Math.abs(d(s, { x: 0, z: 0 }) - GIFT_AWAY) < 1e-9, JSON.stringify(s));
  assert.ok(Math.abs(s.x + GIFT_AWAY) < 1e-9, JSON.stringify(s));
});

test('hearts row and gift are big enough to read on a phone', () => {
  assert.ok(Math.abs(HEARTS_SIZE[0] / 0.66 - 1.7) < 0.05 && Math.abs(HEARTS_SIZE[1] / 0.25 - 1.7) < 0.05);
  assert.ok(GIFT_SIZE >= 1.1 && GIFT_SIZE <= 1.2);
  for (const s of [0.6, 1, 1.15]) assert.ok(-heartsCenterY(s) * HEARTS_SIZE[1] > s / 2);
  assert.match(read('js/delve/state-badge.js'), /setScalar\(GIFT_SIZE\)/);
});

test('delve pest prompts hand the pill a point to avoid, other spaces do not', () => {
  assert.match(read('js/spaces/delve.js'), /avoid: pillAvoid/);
  assert.match(read('js/spaces/doors.js'), /ui\.setDoorPrompt\?\.\(prompt, avoid \? \{ avoid \} : undefined\)/);
  assert.match(read('index.html'), /lastDoorArgs = \[text, !!opts\?\.info, doorIcon, opts\?\.avoid \|\| null\]/);
  assert.match(read('js/hud/mobile-hud.js'), /onDoor\(text, info, icon, avoid\)/);
});

test('bonus toast waits for the counter toast and never fires after leaving the floor', () => {
  const src = read('js/spaces/delve.js');
  assert.match(src, /toastLater\(BONUS_TOAST_MS, PEST_LINES\.bonus\(step\.cur\)/);
  assert.doesNotMatch(src, /ui\.toast\?\.\(PEST_LINES\.bonus/);
  assert.match(read('js/delve/pest-tactics.js'), /export function toastLater\(ms, line, dur\) \{\s*const here = C\.run\(\);\s*setTimeout\(\(\) => \{ if \(C\.run\(\) === here\) ui\.toast\?\.\(line, dur\); \}, ms\);/);
});

test('giftSpot: 자리가 다 막히면 몹이 있던 자리에 그대로 둔다', () => {
  const at = { x: 0.5, z: 0 };
  const s = giftSpot(at, { x: 0, z: 0 }, { x: 1, z: 0 }, () => true);
  assert.deepEqual(s, at);
});
