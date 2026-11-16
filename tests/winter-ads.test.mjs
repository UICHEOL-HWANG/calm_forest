import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLOT_CAPS, AD_PARTS, slotLeft, bumpDay, adQuiet } from '../js/guide/prepass-rules.js';
import { rvGroup } from '../js/tenjin-events.js';

test('slot caps: fountain short and double are 2 a day', () => {
  assert.equal(SLOT_CAPS.fountain_short, 2);
  assert.equal(SLOT_CAPS.fountain_double, 2);
  const day = '2026-12-20';
  const used = bumpDay(bumpDay(null, day, 'fountain_short'), day, 'fountain_short');
  assert.equal(slotLeft(used, 'fountain_short', { day }), 0);
  assert.equal(slotLeft(used, 'fountain_short', { day: '2026-12-21' }), 2);
});

test('button copy', () => {
  assert.deepEqual(AD_PARTS.fountain_short, ['광고 보고', ' ', '재료 채우기']);
  assert.deepEqual(AD_PARTS.fountain_double, ['광고 보고', ' ', '한 번 더 받기']);
});

test('tenjin groups', () => {
  assert.equal(rvGroup('fountain_short'), 'house');
  assert.equal(rvGroup('fountain_double'), 'double');
});

test('quiet during tutorial and modal queue, winter.js goes through adPill', () => {
  assert.equal(adQuiet({ tutorial: true }), true);
  assert.equal(adQuiet({ modalQueue: true }), true);
  const src = readFileSync(new URL('../js/plaza/winter.js', import.meta.url), 'utf8');
  assert.ok(src.includes("adPill('fountain_short'"));
  assert.ok(src.includes("adPill('fountain_double'"));
});

test('ad quiet treats only the tutorial window as coaching, not every open card modal', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.ok(!src.includes(".querySelector('.show > .tut-card')"));
  assert.match(src, /coaching: b\.contains\('coaching'\) \|\| !!document\.querySelector\('#tutorial-modal\.show'\)/);
});

test('fill-materials ad is offered only when the current stage is actually short', () => {
  const src = readFileSync(new URL('../js/plaza/winter.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('function adShort'), src.indexOf("adPill('fountain_short'"));
  assert.match(body, /if \(!Object\.keys\(shortFill\(stageRows\(st\(\)\), gameState\.inventory\)\)\.length\) return null;/);
});
