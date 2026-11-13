import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeThumbs } from '../js/weekly/thumbs.js';

const quiet = (fn) => {
  const warn = console.warn;
  console.warn = () => {};
  try { return fn(); } finally { console.warn = warn; }
};

test('a renderer that cannot be created gives null urls and never throws', () => {
  const THREE = { WebGLRenderer: class { constructor() { throw new Error('no webgl'); } } };
  const thumbs = makeThumbs(THREE, () => ({}));
  assert.deepEqual(quiet(() => thumbs(['a', 'b'])), { a: null, b: null });
});

test('a failed attempt is remembered and not retried', () => {
  let made = 0;
  const THREE = { WebGLRenderer: class { constructor() { made++; throw new Error('no webgl'); } } };
  const thumbs = makeThumbs(THREE, () => ({}));
  quiet(() => { thumbs(['a']); thumbs(['a']); });
  assert.equal(made, 1);
});

test('ids the builder does not know get null and the renderer is released', () => {
  const log = [];
  class Renderer {
    constructor() { log.push('new'); this.domElement = { toDataURL: () => 'data:x' }; }
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() { log.push('dispose'); }
    forceContextLoss() { log.push('loss'); }
  }
  const thumbs = makeThumbs({ WebGLRenderer: Renderer }, () => null);
  assert.deepEqual(thumbs(['a']), { a: null });
  assert.deepEqual(log, ['new', 'dispose', 'loss']);
  assert.deepEqual(thumbs(['a']), { a: null });
  assert.equal(log.length, 3);
});

test('thumbnails are created only when asked for', () => {
  let made = 0;
  const THREE = { WebGLRenderer: class { constructor() { made++; throw new Error('x'); } } };
  makeThumbs(THREE, () => null);
  assert.equal(made, 0);
});
