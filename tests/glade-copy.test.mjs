import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MONO_BANNER, NIGHT_BANNER, SWARM_BANNER, catchText, comboText, perfectText, stringBanner } from '../js/glade/copy.js';

const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
const dex = readFileSync(new URL('../js/data/dex.js', import.meta.url), 'utf8');
const all = [
  ...Object.values(NIGHT_BANNER), ...Object.values(MONO_BANNER), SWARM_BANNER,
].flatMap(c => [c.title, c.line]);

test('mono banners cover every kind except rainbow', () => {
  assert.deepEqual(Object.keys(MONO_BANNER).sort(), ['amber', 'blue', 'ember', 'frost', 'green', 'petal', 'yellow']);
});

test('new copy avoids the em dash and the banned verb', () => {
  const made = [stringBanner(3, 15, 25), stringBanner(11, 240, null)].flatMap(c => [c.title, c.line]);
  for (const s of [...all, ...made, catchText('🟡', '노랑반디', 2), comboText('🟡', '노랑반디', 2, 4), perfectText('🟡', '노랑반디', 4)]) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀아|놀다|놀러/.test(s), s);
  }
});

test('every fixed line has an English entry', () => {
  for (const s of all) assert.ok(en.includes(`'${s}'`), s);
});

test('composed lines have English patterns', () => {
  for (const key of ['줄등 {0}번째 칸이 켜졌어요', '지금까지 {0}마리, 다음 칸은 {1}마리', '줄등이 계곡을 한 바퀴 둘렀어요', '+{0} {1} {2} · 연속 {3}/{4}', '+{0} {1} {2} · 차례를 다 지켰어요', '계곡을 밝힌 이', '줄등을 한 바퀴 다 잇기']) {
    assert.ok(en.includes(`'${key}'`), key);
  }
});

test('string banner shows the next goal or the finish line', () => {
  assert.deepEqual(stringBanner(3, 15, 25), { title: '줄등 3번째 칸이 켜졌어요', line: '지금까지 15마리, 다음 칸은 25마리' });
  assert.equal(stringBanner(11, 240, null).line, '줄등이 계곡을 한 바퀴 둘렀어요');
});

test('catch texts keep the existing +n icon name shape', () => {
  assert.equal(catchText('🟡', '노랑반디', 1), '+1 🟡 노랑반디');
  assert.equal(comboText('🟡', '노랑반디', 2, 4), '+1 🟡 노랑반디 · 연속 2/4');
  assert.equal(perfectText('🟡', '노랑반디', 4), '+4 🟡 노랑반디 · 차례를 다 지켰어요');
});

test('the ring badge exists', () => {
  assert.match(dex, /id: 'glade_ring'/);
});
