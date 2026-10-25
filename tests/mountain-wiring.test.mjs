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

test('unlock toast waits for modals and coach marks and checks the saved flag first', () => {
  const m = read('js/spaces/mountain.js');
  const body = m.slice(m.indexOf('export function maybeRevealMountain'), m.indexOf('export function updateMountain'));
  assert.match(body, /ui\.anyModalOpen\?\.\(\) \|\| ui\.coachActive\?\.\(\)/);
  assert.ok(body.indexOf('hintsSeen?.mountainReveal') < body.indexOf('mountainOpen()'));
  const exit = m.slice(m.indexOf('export function exitMountain'), m.indexOf('export function clampToMountain'));
  assert.match(exit, /Sound\.blip\(\);[\s\S]*trackEvent\('mountain_exit'\)/);
});

test('map label 설산 has an English key', () => {
  assert.match(src, /\{ ico: '🏔️', name: '설산',/);
  assert.equal(EN['설산'], 'Snow Mountain');
});

test('saving inside the mountain records the spot just south of the gate', () => {
  const space = read('js/spaces/mountain.js');
  assert.match(space, /export function mountainReturnPos\(\) \{\n\s*return \{ x: MOUNTAIN_GATE\.x, z: MOUNTAIN_GATE\.z \+ 4 \};\n\}/);
  assert.match(space, /const back = mountainReturnPos\(\);\n\s*player\.position\.set\(back\.x, 0, back\.z\);/);
  assert.match(src, /atDream \? dreamReturnPos\(\) : atMountain \? mountainReturnPos\(\) : (?:delveFloorNow\(\) > 0 \? \{ x: MINE_GATE\.x, z: MINE_GATE\.z \+ 2 \} : )?\{ x: player\.position\.x, z: player\.position\.z \}/);
});

test('the summit no longer starts the sled by itself: hut arrival, then the start deck button', () => {
  const m = read('js/spaces/mountain.js');
  assert.doesNotMatch(m, /if \(atSummit\(local\)\) startSled\(\);/);
  assert.match(m, /atHut\(local\)/);
  assert.match(m, /'🏠 정상 산장에 도착했어요'/);
  assert.match(m, /nearDoor === 'sledstart'/);
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /nd = 'sledstart'; prompt = '🛷 썰매 타고 내려가기'/);
  assert.ok(EN['🏠 정상 산장에 도착했어요']);
  assert.ok(EN['🛷 썰매 타고 내려가기']);
});

test('finishing slides into the runout instead of teleporting to the plaza', () => {
  const m = read('js/spaces/mountain.js');
  assert.match(m, /phase = 'runout'/);
  assert.doesNotMatch(m, /function finishSled\(\) \{[\s\S]*?player\.position\.set\(MOUNTAIN\.x \+ PLAZA\.x, 0, MOUNTAIN\.z \+ PLAZA\.z\);[\s\S]*?\n\}/);
});

test('finishing plays the finish beat, a hockey stop, a ceremony and only then the result', () => {
  const m = read('js/spaces/mountain.js');
  const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));
  const fin = between(m, 'function finishSled', '\n}');
  assert.match(fin, /Sound\.complete\(\)/);
  assert.match(fin, /spawnConfetti\(/);
  assert.match(between(m, 'function rideRunout', '\n}'), /stopTurn\(run\.runout\)/);
  assert.match(between(m, 'function rideRunout', '\n}'), /spawnSnowBurst\(/);
  const cele = between(m, 'function celebrate', '\n}');
  assert.match(cele, /triggerMoment\(true\)/);
  assert.match(m, /run\.phase = 'cheer'/);
  assert.match(between(m, 'function showFinish', '\n}'), /showResult\(/);
});

test('the hut door prompt and action are wired', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /else if \(hutDoorReady\(\)\) \{ nd = 'hutcafe'; prompt = '☕ 산장 카페 들어가기'; \}/);
  assert.ok(EN['☕ 산장 카페 들어가기']);
  assert.match(read('js/spaces/mountain.js'), /clampSummit\(/);
});

test('arrival fires when a climbing player enters the yard', () => {
  assert.ok(read('js/spaces/mountain.js').includes('if (atHut(local) || inYard(local)) arriveHut();'));
});
