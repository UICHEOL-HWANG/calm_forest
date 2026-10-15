import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';
import { gameSource } from './helpers/game-source.mjs';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../js/mountain/sled-hud.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));

test('runtime starts a run at the summit with a rolled difficulty', () => {
  assert.match(src, /rollDifficulty\('sled'\)/);
  assert.match(src, /sledBegin\(/);
  assert.match(src, /atSummit\(/);
});

test('runtime settles on finish and abandons on exit mid-run', () => {
  assert.match(src, /sledSettle\(/);
  assert.match(src, /sledAbandon\('climb'/);
  assert.match(src, /sledAbandon\('sled'/);
  assert.match(src, /export function exitMountain\(\)\s*\{\s*abandonRun\(\);/);
});

test('acorns are collected during the climb and become boosts', () => {
  assert.match(src, /collectAcorns\(/);
  assert.match(src, /tryBoost\(/);
});

test('player movement is blocked while sledding', () => {
  assert.match(gameSource(), /if \(sledActive\(\)\) return;/);
  assert.match(game, /const closeUp = [^;\n]*sledActive\(\)/);
});

test('the mountain clamp is skipped while sledding', () => {
  const clamp = between(src, 'export function clampToMountain', '\n}');
  assert.match(clamp, /^export function clampToMountain\(p\) \{\s*if \(sledActive\(\)\) return;/);
});

test('the avatar rides the slope and faces downhill during countdown and sled', () => {
  const ride = between(src, 'function rideSlope', '\n}');
  assert.match(ride, /slopePoint\(run\.sled\.z, run\.sled\.x\)/);
  assert.match(ride, /player\.position\.set\(MOUNTAIN\.x \+ p\.x, MOUNTAIN\.y \+ p\.y, MOUNTAIN\.z \+ p\.z\)/);
  assert.match(ride, /player\.rotation\.y = /);
  const upd = between(src, 'export function updateMountain', '\nfunction ');
  assert.ok((upd.match(/rideSlope\(/g) || []).length >= 2);
});

test('world actions and door prompts are swallowed while sledding', () => {
  assert.match(game, /\} else if \(sledActive\(\)\) \{\s*wantAction = false;\s*\} else if \(!mgView && !duelActive && !intro/);
});

test('the regular action button is hidden while sledding and restored after the result closes', () => {
  assert.match(hud, /body\.sled-run #mobile-controls/);
  assert.match(src, /document\.body\.classList\.add\('sled-run'\)/);
  const close = between(src, 'function closeRun', '\n}');
  assert.match(close, /document\.body\.classList\.remove\('sled-run'\)/);
  assert.match(between(src, 'function finishSled', '\n}'), /closeRun/);
  assert.match(between(src, 'export function abandonRun', '\n}'), /closeRun\(\)/);
});

test('the camera rig is released before snapping the camera after a run', () => {
  const fin = between(src, 'function finishSled', '\n}');
  assert.ok(fin.indexOf('setCameraRig(null)') >= 0 && fin.indexOf('setCameraRig(null)') < fin.indexOf('snapCamera()'));
});

test('run context stays integer and physics step is clamped', () => {
  assert.match(src, /Math\.round\(\(now - first\) \/ 86400000\)/);
  assert.match(src, /acornsCollected: run\.taken\.filter\(Boolean\)\.length/);
  assert.match(src, /Math\.min\(50, dt \* 1000\)/);
});

test('sled HUD strings have English', () => {
  for (const ko of ['🛷 출발!', '🌰 부스터', '🏁 완주!', '🏆 새 최고 기록!', '오늘 보상 {0#}판 남음', '오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요', '확인']) {
    assert.ok(EN[ko], ko);
  }
  assert.equal(EN['오늘 보상 {0#}판 남음'], '{0} rewarded runs left today');
});
