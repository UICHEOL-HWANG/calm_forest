import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PHYS, PHYS_V, createSled, stepSled } from '../js/mountain/sled.js';
import { COURSE, centerX } from '../js/mountain/course.js';
import { steerFrom, stickAxis, STICK_R } from '../js/mountain/sled-input.js';

const readSrc = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const at60 = () => ({ ...createSled(0), z: 60, x: centerX(60) });
const hold = (s, steer, ms) => Array.from({ length: ms / 16 }).reduce(a => stepSled(a, 16, steer, COURSE), s);

test('physics version is 4 (inertia model plus v2 moves)', () => {
  assert.equal(PHYS_V, 5);
});

test('a fresh sled starts with no sideways speed', () => {
  assert.equal(createSled(0).vx, 0);
});

test('steering ramps up over a few frames instead of jumping to full speed', () => {
  const one = stepSled(at60(), 16, 1, COURSE);
  assert.ok(one.vx > 0 && one.vx < PHYS.steerRate * 0.5, `vx after one frame ${one.vx}`);
  const held = hold(at60(), 1, 160);
  assert.ok(held.vx > PHYS.steerRate * 0.9, `vx after 0.16s ${held.vx}`);
});

test('sideways speed never exceeds the sled steer rate', () => {
  const held = hold(at60(), 1, 480);
  assert.ok(held.vx <= PHYS.steerRate + 1e-9);
  const skiff = hold({ ...at60(), phys: { ...PHYS, steerRate: 12.3 } }, -1, 320);
  assert.ok(skiff.vx >= -12.3 - 1e-9 && skiff.vx < -PHYS.steerRate);
});

test('letting go keeps sliding briefly, then settles', () => {
  const moving = hold(at60(), 1, 480);
  const glide = hold(moving, 0, 400);
  assert.ok(glide.x > moving.x + 1.2, `glide ${glide.x - moving.x}`);
  const settled = hold(moving, 0, 1504);
  assert.ok(Math.abs(settled.vx) < 0.2, `vx after 1.5s ${settled.vx}`);
});

test('a half tilt gives a gentler line than a full tilt', () => {
  const half = hold(at60(), 0.4, 320), full = hold(at60(), 1, 320);
  assert.ok(half.vx > 0 && half.vx < full.vx * 0.75);
});

test('hitting the course edge bounces the sled back softly', () => {
  const edge = { ...at60(), x: centerX(60) + COURSE.width / 2 - 0.01, vx: PHYS.steerRate };
  const s = stepSled(edge, 50, 0, COURSE);
  assert.ok(s.x <= centerX(s.z) + COURSE.width / 2 + 1e-9);
  assert.ok(s.vx < 0);
});

test('pushing into the edge rides along it without a bounce', () => {
  const edge = { ...at60(), x: centerX(60) - COURSE.width / 2 + 0.01, vx: -PHYS.steerRate };
  const s = hold(edge, -1, 160);
  assert.equal(s.vx, 0);
  assert.ok(Math.abs(s.x - (centerX(s.z) - COURSE.width / 2)) < 1e-9);
});

test('stick axis follows the drag, with a dead zone and a clamp', () => {
  assert.equal(stickAxis(0), 0);
  assert.equal(stickAxis(STICK_R * 0.08), 0);
  assert.equal(stickAxis(STICK_R), 1);
  assert.equal(stickAxis(-STICK_R * 3), -1);
  assert.ok(Math.abs(stickAxis(STICK_R * 0.5) - 0.5) < 1e-9);
});

test('steerFrom mixes keys and the stick axis within -1..1', () => {
  assert.equal(steerFrom({ left: false, right: false, axis: 0.5 }), 0.5);
  assert.equal(steerFrom({ left: false, right: true, axis: 0.5 }), 1);
  assert.equal(steerFrom({ left: true, right: false, axis: -0.3 }), -1);
  assert.equal(steerFrom({ left: true, right: false }), -1);
});

function fakeEnv() {
  const win = Object.assign(new EventTarget(), { innerWidth: 400 });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const target = new EventTarget();
  const ev = (type, props = {}) => Object.assign(new Event(type), props);
  return { win, doc, target, ev };
}

test('a touch drag anywhere becomes a floating stick', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  target.dispatchEvent(ev('pointerdown', { pointerId: 3, clientX: 120, clientY: 300 }));
  assert.equal(input.read().axis, 0);
  assert.deepEqual(input.stick(), { x: 120, y: 300, dx: 0 });
  win.dispatchEvent(ev('pointermove', { pointerId: 3, clientX: 120 + STICK_R, clientY: 310 }));
  assert.equal(input.read().axis, 1);
  assert.equal(input.stick().dx, STICK_R);
  win.dispatchEvent(ev('pointermove', { pointerId: 3, clientX: 120 - STICK_R * 4, clientY: 310 }));
  assert.equal(input.read().axis, -1);
  assert.equal(input.stick().dx, -STICK_R);
  win.dispatchEvent(ev('pointerup', { pointerId: 3 }));
  assert.equal(input.read().axis, 0);
  assert.equal(input.stick(), null);
  assert.equal(input.input(), 'touch');
});

test('a second finger does not steal the stick', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  target.dispatchEvent(ev('pointerdown', { pointerId: 1, clientX: 100, clientY: 300 }));
  target.dispatchEvent(ev('pointerdown', { pointerId: 2, clientX: 350, clientY: 300 }));
  win.dispatchEvent(ev('pointermove', { pointerId: 2, clientX: 10, clientY: 300 }));
  assert.equal(input.read().axis, 0);
  win.dispatchEvent(ev('pointerup', { pointerId: 2 }));
  assert.deepEqual(input.stick(), { x: 100, y: 300, dx: 0 });
});

test('when the steering finger lifts, a finger still down takes over the stick', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  target.dispatchEvent(ev('pointerdown', { pointerId: 1, clientX: 100, clientY: 300 }));
  target.dispatchEvent(ev('pointerdown', { pointerId: 2, clientX: 300, clientY: 320 }));
  win.dispatchEvent(ev('pointermove', { pointerId: 2, clientX: 310, clientY: 320 }));
  win.dispatchEvent(ev('pointerup', { pointerId: 1 }));
  assert.deepEqual(input.stick(), { x: 310, y: 320, dx: 0 });
  win.dispatchEvent(ev('pointermove', { pointerId: 2, clientX: 310 + STICK_R, clientY: 320 }));
  assert.equal(input.read().axis, 1);
  win.dispatchEvent(ev('pointerup', { pointerId: 2 }));
  assert.equal(input.stick(), null);
});

test('steer time is weighted by how far the stick is tilted', () => {
  const s = stepSled(stepSled(at60(), 100, -0.5, COURSE), 100, 0.25, COURSE);
  assert.equal(s.steerLeftMs, 50);
  assert.equal(s.steerRightMs, 25);
});

test('the stick is drawn during the countdown too', () => {
  const src = readSrc('js/spaces/mountain.js');
  const from = src.indexOf("} else if (run.phase === 'countdown') {");
  const count = src.slice(from, src.indexOf("} else if (run.phase === 'sled') {", from));
  assert.match(count, /showStick\(run\.input\.stick\(\)\)/);
});

test('the runtime leans the rider by sideways speed and draws the stick', () => {
  const src = readSrc('js/spaces/mountain.js');
  assert.match(src, /rideSlope\(run\.sled\.vx \/ run\.sled\.phys\.steerRate, dt\)/);
  assert.match(src, /showStick\(run\.input\.stick\(\)\)/);
  assert.match(readSrc('js/mountain/sled-hud.js'), /export function showStick/);
});
