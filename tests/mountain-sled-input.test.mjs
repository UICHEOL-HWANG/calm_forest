import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { steerFrom } from '../js/mountain/sled-input.js';

const readSrc = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('both sides pressed cancel out', () => {
  assert.equal(steerFrom({ left: true, right: true }), 0);
  assert.equal(steerFrom({ left: true, right: false }), -1);
  assert.equal(steerFrom({ left: false, right: true }), 1);
  assert.equal(steerFrom({ left: false, right: false }), 0);
});

test('pointer steering ignores taps on the boost button and the result panel', () => {
  const src = readSrc('js/mountain/sled-input.js');
  assert.match(src, /closest\?\.\('\[data-sled-boost\], \[data-sled-ui\]'\)/);
  assert.doesNotMatch(src, /stopPropagation/);
  const hud = readSrc('js/mountain/sled-hud.js');
  assert.match(hud, /class="sled-boost" data-sled-boost/);
  assert.match(hud, /class="sled-result" data-sled-ui/);
});

function fakeEnv() {
  const win = Object.assign(new EventTarget(), { innerWidth: 400 });
  const doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const target = new EventTarget();
  const added = new Map();
  for (const t of [win, doc, target]) {
    const add = t.addEventListener.bind(t), rem = t.removeEventListener.bind(t);
    t.addEventListener = (type, fn) => { added.set(fn, type); add(type, fn); };
    t.removeEventListener = (type, fn) => { added.delete(fn); rem(type, fn); };
  }
  const ev = (type, props = {}) => Object.assign(new Event(type), props);
  return { win, doc, target, added, ev };
}

test('blur clears held keys and pointers', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  win.dispatchEvent(ev('keydown', { code: 'ArrowLeft' }));
  target.dispatchEvent(ev('pointerdown', { pointerId: 1, clientX: 200, clientY: 300 }));
  win.dispatchEvent(ev('pointermove', { pointerId: 1, clientX: 260, clientY: 300 }));
  assert.deepEqual(input.read(), { left: true, right: false, axis: 1 });
  win.dispatchEvent(ev('blur'));
  assert.deepEqual(input.read(), { left: false, right: false, axis: 0 });
  assert.equal(input.stick(), null);
});

test('hiding the page clears held input, showing it does not', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  win.dispatchEvent(ev('keydown', { code: 'KeyD' }));
  doc.dispatchEvent(ev('visibilitychange'));
  assert.deepEqual(input.read(), { left: false, right: true, axis: 0 });
  doc.visibilityState = 'hidden';
  doc.dispatchEvent(ev('visibilitychange'));
  assert.deepEqual(input.read(), { left: false, right: false, axis: 0 });
});

test('dispose removes every listener it added', async () => {
  const { bindSledInput } = await import('../js/mountain/sled-input.js');
  const { win, doc, target, added, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc });
  assert.ok([...added.values()].includes('blur'));
  assert.ok([...added.values()].includes('visibilitychange'));
  input.dispose();
  assert.equal(added.size, 0);
  win.dispatchEvent(ev('keydown', { code: 'ArrowLeft' }));
  assert.deepEqual(input.read(), { left: false, right: false, axis: 0 });
});

test('input starts from the device and switches on use', async () => {
  const { bindSledInput, initialInput } = await import('../js/mountain/sled-input.js');
  assert.equal(initialInput(true), 'touch');
  assert.equal(initialInput(false), 'keys');
  const { win, doc, target, ev } = fakeEnv();
  const input = bindSledInput(target, () => {}, { win, doc, initial: initialInput(true) });
  assert.equal(input.input(), 'touch');
  win.dispatchEvent(ev('keydown', { code: 'ArrowRight' }));
  assert.equal(input.input(), 'keys');
  const runtime = readSrc('js/spaces/mountain.js');
  assert.match(runtime, /bindSledInput\(document\.body, boost, \{ initial: initialInput\(isTouchDevice\(\)\) \}\)/);
  assert.match(runtime, /input: run\.input \? run\.input\.input\(\) : initialInput\(isTouchDevice\(\)\),/);
});
