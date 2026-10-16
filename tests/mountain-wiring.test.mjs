import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { EN } from '../js/i18n-en.js';

const src = gameSource();
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('atMountain flag is declared, exposed and part of space flags', () => {
  assert.match(src, /let atMountain = false, mountainGroup = null;/);
  assert.match(src, /get atMountain\(\)/);
  assert.match(src, /set atMountain\(v\)/);
  assert.match(src, /if \(mountainGroup\) mountainGroup\.visible = atMountain;/);
});

test('shadow scope freezes village shadows inside the mountain', () => {
  assert.match(read('js/shadow-scope.js'), /'atMountain'/);
});

test('dispatch: action, clamp, minimap, per-frame update, gate spawn, reveal', () => {
  assert.match(src, /if \(atMountain \|\| nearDoor === 'mountain'\) return mountainAction\(nearDoor\);/);
  assert.match(src, /else if \(atMountain\) \{ clampToMountain\(player\.position\);/);
  assert.match(src, /place === 'mountain'\) \{ mountainMinimapMarks\(marks\);/);
  assert.match(src, /updateMountain\(dt\);/);
  assert.match(src, /spawnMountainGate\(\);/);
  assert.match(src, /maybeRevealMountain\(\);/);
});

test('doors know the gate and the inside exit, and inVillage2 excludes the mountain', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /nd = 'mountain'/);
  assert.match(doors, /nd = 'mountainexit'/);
  assert.match(doors, /!atMountain/);
});

test('new visible strings have English', () => {
  for (const ko of ['🏔️ 설산', '🏔️ 설산 오르기', '🏔️ 내일 열려요', '🏔️ 설산이 열렸어요!', '🏔️ 뒤쪽 능선길로 올라가 정상에서 썰매를 타요', '🏔️ 썰매 타러 가는 길', '🚪 마을로 돌아가기']) {
    assert.ok(EN[ko], ko);
  }
});

test('minimap label in index.html', () => {
  assert.match(read('index.html'), /'🏔️ 설산'/);
});

test('reveal waits for modals and coach marks, checks the saved flag first, and is cut short on leaving the village', () => {
  const m = read('js/spaces/mountain.js');
  const body = m.slice(m.indexOf('export function maybeRevealMountain'), m.indexOf('export function updateMountain'));
  assert.match(body, /ui\.anyModalOpen\?\.\(\) \|\| ui\.coachActive\?\.\(\)/);
  assert.ok(body.indexOf('hintsSeen?.mountainReveal') < body.indexOf('mountainOpen()'));
  assert.match(m, /reveal\.finish\(\)/);
  const exit = m.slice(m.indexOf('export function exitMountain'), m.indexOf('export function clampToMountain'));
  assert.match(exit, /Sound\.blip\(\);[\s\S]*trackEvent\('mountain_exit'\)/);
});
