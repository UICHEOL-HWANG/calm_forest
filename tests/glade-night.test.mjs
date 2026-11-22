import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONO_SHARE, NIGHT_KINDS, TUNE, monoKind, nightKind, pickKindId, streamPoint } from '../js/glade/night.js';

const days = Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2026, 10, 22 + i)).toISOString().slice(0, 10));

test('nightKind returns a known kind and is stable for a date', () => {
  for (const d of days) {
    assert.ok(NIGHT_KINDS.includes(nightKind(d)));
    assert.equal(nightKind(d), nightKind(d));
  }
});

test('nightKind shares over a year stay near 40/20/20/20', () => {
  const count = {};
  for (const d of days) count[nightKind(d)] = (count[nightKind(d)] || 0) + 1;
  assert.ok(count.plain / 365 > 0.3 && count.plain / 365 < 0.5);
  for (const k of ['stream', 'mono', 'low']) assert.ok(count[k] / 365 > 0.12 && count[k] / 365 < 0.28, k);
});

test('nightKind does not repeat the same kind for more than a week', () => {
  let run = 1, longest = 1;
  for (let i = 1; i < days.length; i++) {
    run = nightKind(days[i]) === nightKind(days[i - 1]) ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  assert.ok(longest <= 7);
});

test('monoKind never picks rainbow and is stable for a date', () => {
  const open = ['rainbow', 'frost', 'green', 'blue', 'yellow'];
  for (const d of days) {
    const id = monoKind(d, open);
    assert.notEqual(id, 'rainbow');
    assert.ok(open.includes(id));
    assert.equal(id, monoKind(d, open));
  }
  assert.equal(monoKind('2026-11-22', ['rainbow']), null);
  assert.equal(monoKind('2026-11-22', []), null);
});

test('pickKindId uses the mono kind only on mono nights and only within its share', () => {
  assert.equal(pickKindId('mono', 'green', () => MONO_SHARE - 0.01, () => 'yellow'), 'green');
  assert.equal(pickKindId('mono', 'green', () => MONO_SHARE + 0.01, () => 'yellow'), 'yellow');
  assert.equal(pickKindId('plain', 'green', () => 0, () => 'yellow'), 'yellow');
  assert.equal(pickKindId('mono', null, () => 0, () => 'yellow'), 'yellow');
});

test('TUNE covers every kind and only the low night eases catching', () => {
  for (const k of NIGHT_KINDS) for (const f of ['respawn', 'speed', 'yMin', 'yMax', 'fleeDist', 'dimChance']) assert.equal(typeof TUNE[k][f], 'number');
  assert.equal(TUNE.plain.dimChance, 0.35);
  assert.equal(TUNE.low.dimChance, 0.6);
  assert.equal(TUNE.stream.respawn, 0.5);
  assert.ok(TUNE.low.yMax < TUNE.plain.yMin + 0.3);
});

test('streamPoint stays inside the radius', () => {
  for (let u = 0; u < 7; u += 0.1) {
    const p = streamPoint(u, 6);
    assert.ok(Math.hypot(p.x, p.z) <= 6);
  }
});
