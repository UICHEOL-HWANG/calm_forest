import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

function counted(writes, name) {
  const el = { style: {}, hidden: false, querySelector: () => null };
  for (const prop of ['textContent', 'disabled']) {
    let v = prop === 'disabled' ? false : '';
    Object.defineProperty(el, prop, {
      get: () => v,
      set: nv => { writes.push(`${name}.${prop}`); v = nv; },
    });
  }
  return el;
}

function fakeDom() {
  const writes = [];
  const parts = {};
  for (const sel of ['.sled-time', '.sled-acorns', '.sled-count', '.sled-boost', '.sled-result']) parts[sel] = counted(writes, sel);
  const root = { style: {}, innerHTML: '', querySelector: sel => parts[sel] };
  globalThis.document = {
    createElement: tag => (tag === 'div' ? root : { textContent: '' }),
    head: { appendChild() {} },
    body: { appendChild() {} },
  };
  return { writes, parts };
}

test('run HUD writes only the values that changed', async () => {
  const { writes, parts } = fakeDom();
  const { showRunHud } = await import('../js/mountain/sled-hud.js');
  showRunHud({ timeMs: 0, acorns: 2 });
  assert.equal(writes.length, 4);
  assert.equal(parts['.sled-time'].textContent, '⏱️ 0.00');
  assert.equal(parts['.sled-acorns'].textContent, '🌰 2');
  assert.match(parts['.sled-boost'].textContent, / 2$/);
  assert.equal(parts['.sled-boost'].disabled, false);
  writes.length = 0;
  showRunHud({ timeMs: 0, acorns: 2 });
  assert.deepEqual(writes, []);
  showRunHud({ timeMs: 1234, acorns: 2 });
  assert.deepEqual(writes, ['.sled-time.textContent']);
  assert.equal(parts['.sled-time'].textContent, '⏱️ 1.23');
  writes.length = 0;
  showRunHud({ timeMs: 1231, acorns: 2 });
  assert.deepEqual(writes, []);
  showRunHud({ timeMs: 1300, acorns: 0 });
  assert.deepEqual(writes.sort(), ['.sled-acorns.textContent', '.sled-boost.disabled', '.sled-boost.textContent', '.sled-time.textContent']);
  assert.equal(parts['.sled-boost'].disabled, true);
});

test('hudPatch keeps only changed keys', async () => {
  const { hudPatch } = await import('../js/mountain/sled-hud.js');
  assert.deepEqual(hudPatch({}, { a: 1, b: false }), { a: 1, b: false });
  assert.deepEqual(hudPatch({ a: 1, b: false }, { a: 1, b: true }), { b: true });
  assert.deepEqual(hudPatch({ a: 1 }, { a: 1 }), {});
});
