import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBootTiming, hasPriorData } from '../js/boot-timing.js';

function fake(start = 0) {
  let t = start;
  const sent = [];
  const store = new Map();
  const bt = createBootTiming({
    now: () => t,
    storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
  });
  bt.use((name, params) => sent.push({ name, params }));
  return { bt, sent, at: (ms) => { t = ms; } };
}

test('marks keep the first time per stage and send one event at play', () => {
  const { bt, sent, at } = fake();
  at(1200); bt.mark('m');
  at(1300); bt.mark('m');
  at(8000); bt.mark('W');
  at(9500); bt.mark('P');
  assert.equal(bt.send('play'), true);
  assert.equal(bt.send('play'), false);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { name: 'boot_timing', params: { first_run: 1, reached: 'play', total_ms: 9500, world_ms: 8000, steps: 'm12,W80,P95' } });
});

test('second launch on the same device is not first_run', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  const runs = [];
  for (let i = 0; i < 2; i++) {
    const bt = createBootTiming({ now: () => 100, storage });
    bt.use((name, params) => runs.push(params.first_run));
    bt.mark('W');
    bt.send('play');
  }
  assert.deepEqual(runs, [1, 0]);
});

test('going to the background sends one partial event and the play event still follows', () => {
  const { bt, sent, at } = fake();
  at(4000); bt.mark('m');
  at(30000);
  assert.equal(bt.send(null), true);
  assert.equal(bt.send(null), false);
  at(31000); bt.mark('P');
  assert.equal(bt.send('play'), true);
  assert.deepEqual(sent.map(e => [e.params.reached, e.params.total_ms, e.params.first_run]), [['bg_m', 30000, 1], ['play', 31000, 1]]);
  assert.equal(sent[1].params.steps, 'm40,P310');
});

test('marks after sending are ignored and the steps string stays within 100 chars', () => {
  const { bt, sent, at } = fake();
  for (let i = 0; i < 40; i++) { at(i * 100000); bt.mark(`k${i}`); }
  bt.send('play');
  bt.mark('late');
  assert.ok(sent[0].params.steps.length <= 100);
  assert.ok(!sent[0].params.steps.includes('late'));
});

test('nothing is sent before a tracker is attached', () => {
  const bt = createBootTiming({ now: () => 5, storage: null });
  bt.mark('m');
  assert.equal(bt.send('play'), false);
});

test('boot script and game mark every stage and send at play or when hidden', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  for (const k of ['b', 'm', 'W', 'e', 'L', 'P']) assert.ok(html.includes(`bootTiming.mark('${k}')`), k);
  for (const k of ['r', 'w', 'h', 'n', 'x', 's', 'v']) assert.ok(game.includes(`bootTiming.mark('${k}')`), k);
  assert.match(html, /await enterGame\(\);[^\n]*\n\s*bootTiming\.mark\('P'\);\n\s*bootTiming\.send\('play'\);/);
  assert.match(html, /visibilitychange', \(\) => \{ if \(document\.hidden\) bootTiming\.send\(null\); \}/);
  assert.match(html, /bootTiming\.use\(trackEvent\);/);
});

const firstRunOf = (opts) => {
  const out = [];
  const bt = createBootTiming({ now: () => 1, ...opts });
  bt.use((_, p) => out.push(p.first_run));
  bt.send('play');
  return out[0];
};

test('an existing player upgrading to this version is not counted as a first run', () => {
  assert.equal(firstRunOf({ storage: { getItem: () => null, setItem: () => {} }, prior: true }), 0);
});

test('unknown storage reports -1 instead of a first run', () => {
  assert.equal(firstRunOf({ storage: null }), -1);
  assert.equal(firstRunOf({ storage: { getItem: () => { throw new Error('x'); }, setItem: () => {} } }), -1);
});

test('a write failure keeps the launch count it read', () => {
  assert.equal(firstRunOf({ storage: { getItem: () => '5', setItem: () => { throw new Error('x'); } } }), 0);
});

test('hasPriorData looks for a saved Supabase session key', () => {
  const keys = (list) => ({ length: list.length, key: (i) => list[i] });
  assert.equal(hasPriorData(keys(['cf_lang', 'sb-abc-auth-token'])), true);
  assert.equal(hasPriorData(keys(['cf_lang'])), false);
  assert.equal(hasPriorData(null), false);
});
