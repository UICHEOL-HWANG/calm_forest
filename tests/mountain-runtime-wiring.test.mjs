import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';
import { gameSource } from './helpers/game-source.mjs';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const hud = readFileSync(new URL('../js/mountain/sled-hud.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));

test('runtime reaches the hut on the summit, then rolls difficulty when the sled starts', () => {
  assert.match(src, /if \(atHut\(local\) \|\| inYard\(local\)\) arriveHut\(\);/);
  assert.match(between(src, 'function startSled', '\n}'), /rollDifficulty\('sled'\)/);
  assert.match(between(src, 'function startSled', '\n}'), /sledBegin\(/);
});

test('runtime settles on finish and abandons on exit mid-run', () => {
  assert.match(src, /sledSettle\(/);
  assert.match(src, /if \(run\.phase === 'climb' \|\| run\.phase === 'hut'\) sledAbandon\(run\.phase, ctxOf\(\), null\);/);
  assert.match(src, /sledAbandon\('sled'/);
  assert.match(src, /export function exitMountain\(\)\s*\{\s*abandonRun\(\);/);
});

test('acorns are collected during the climb and become boosts', () => {
  assert.match(src, /collectAcorns\(/);
  assert.match(src, /pressSled\(/);
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
  assert.match(ride, /player\.position\.set\(MOUNTAIN\.x \+ p\.x, MOUNTAIN\.y \+ p\.y \+ run\.seat \+ sledLift\(run\.sled\), MOUNTAIN\.z \+ p\.z\)/);
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
  assert.match(between(src, 'function showFinish', '\n}'), /closeRun/);
  assert.match(between(src, 'export function abandonRun', '\n}'), /closeRun\(\)/);
});

test('the finish hands the camera to the runout rig, holds it through the cheer and snaps back on close', () => {
  const fin = between(src, 'function finishSled', '\n}');
  assert.match(fin, /setCameraRig\(runoutCamera\)/);
  assert.doesNotMatch(fin, /snapCamera\(\)/);
  assert.doesNotMatch(between(src, 'function celebrate', '\n}'), /setCameraRig\(null\)/);
  assert.match(between(src, 'function closeRun', '\n}'), /setCameraRig\(null\)/);
  assert.doesNotMatch(between(src, 'function showFinish', '\n}'), /snapCamera\(\)/);
});

test('run context stays integer and physics step is clamped', () => {
  assert.match(readFileSync(new URL('../js/mountain/unlock.js', import.meta.url), 'utf8'), /Math\.round\(\(now - first\) \/ 86400000\)/);
  assert.match(src, /acornsCollected: run\.taken\.filter\(Boolean\)\.length/);
  assert.match(src, /Math\.min\(50, dt \* 1000\)/);
});

test('sled HUD strings have English', () => {
  for (const ko of ['🛷 출발!', '🌰 부스터', '🏁 완주!', '🏆 새 최고 기록!', '오늘 보상 {0#}판 남음', '오늘 보상 1판 남음', '오늘 보상은 다 받았어요. 기록 도전은 계속할 수 있어요', '확인']) {
    assert.ok(EN[ko], ko);
    assert.doesNotMatch(EN[ko], /\u2014/);
  }
  assert.equal(EN['오늘 보상 1판 남음'], '1 rewarded run left today');
  assert.equal(EN['오늘 보상은 다 받았어요. 기록 도전은 계속할 수 있어요'], 'All rewards claimed today. You can keep chasing records');
  for (const old of ['오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요', '🏔️ 뒤 능선길로 올라 정상에서 썰매를 타요. 나갈 땐 남쪽 문']) assert.equal(EN[old], undefined, old);
  assert.equal(EN['오늘 보상 {0#}판 남음'], '{0} rewarded runs left today');
});

test('while sledding the tool bar is hidden and the boost button takes its bottom-centre spot', () => {
  assert.match(hud, /body\.sled-run #hotbar/);
  const boost = hud.match(/#sled-hud \.sled-boost\{[^}]*\}/)[0];
  assert.match(boost, /left:50%/);
  assert.match(boost, /translateX\(-50%\)/);
  assert.doesNotMatch(boost, /right:/);
});

test('hut cafe wiring: exit spot, seated drink, equip slot, no coin purchase of hut decor', () => {
  const m = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  const indoor = readFileSync(new URL('../js/spaces/indoor.js', import.meta.url), 'utf8');
  assert.match(m, /CAFE_EXIT_SPOT/);
  assert.match(m, /cafe\.sit\(player, out\.drink\.cup\);\s*\$w\.sitting = true;/);
  assert.match(m, /trackEvent\('cosmetic_equip', \{ item_id: id, slot: findItem\(id\)\?\.slot, action: 'on', via: 'hut_cafe' \}\)/);
  assert.match(indoor, /def\.hut && !fromStore && !silent && !free/);
});
