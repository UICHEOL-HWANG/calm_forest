import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const INDOOR = read('js/spaces/indoor.js');
const fnBody = (src, name) => {
  const i = src.indexOf(`export function ${name}(`); assert.ok(i >= 0, `${name} 없음`);
  const j = src.indexOf('\n}\n', i); return src.slice(i, j + 2);
};

test('🏠 buildRoomWith — 내 집 전역을 직접 읽지 않는다(이웃 집도 같은 함수로 짓는다)', () => {
  const b = fnBody(INDOOR, 'buildRoomWith');
  assert.doesNotMatch(b, /gameState|houseWindows|scene\.add|\bINT\b/);
  assert.match(b, /ctx\.windows\.push/);
  assert.match(b, /ctx\.solidCircle\(/);
});

test('🏠 buildRoom 은 내 집 ctx 로 buildRoomWith 를 부르는 어댑터', () => {
  const b = fnBody(INDOOR, 'buildRoom');
  assert.match(b, /buildRoomWith\(def, \{ stage: gameState\.houseStage, style: gameState\.house\.style, origin: INT, windows: houseWindows, solidCircle \}\)/);
  assert.match(b, /scene\.add\(g\)/);
});

test('📍 NEIGHBOR_INT — 마을 밖 다른 인스턴스 공간과 60 이상 떨어져 있다', () => {
  const p = read('js/data/places.js');
  assert.match(p, /export const NEIGHBOR_INT = new THREE\.Vector3\(0, 0, 780\);/);
  const pts = [...p.matchAll(/export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g)]
    .map(m => ({ n: m[1], x: +m[2], z: +m[3] })).filter(q => Math.hypot(q.x, q.z) > 100);
  const me = pts.find(q => q.n === 'NEIGHBOR_INT');
  for (const q of pts) if (q !== me) assert.ok(Math.hypot(q.x - me.x, q.z - me.z) >= 60, `${q.n} 와 너무 가깝다`);
});

test('🔒 indoor-scene.js 는 내 세이브를 모른다 · buildRoomWith 로만 방을 짓고 치울 때 전역 등록을 되돌린다', () => {
  const s = read('js/neighbors/indoor-scene.js');
  assert.doesNotMatch(s, /gameState|\bbuildRoom\(/);
  assert.match(s, /buildRoomWith\(/);
  assert.match(s, /unregisterWindows\(group\)/);
  assert.match(s, /removeSolid\(/);
  assert.match(s, /scene\.remove\(lamp\)/);
});

const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');
const SCENE = read('js/neighbors/scene.js');
const I18N = read('js/i18n-en.js');
const GAME = gameSource();

test('🚪 문구 4개 + 영어', () => {
  for (const k of ['🚪 들어가 보기', '🚪 마당으로', '🏡 {0} 의 집', '🏠 집 안을 불러오지 못했어요']) assert.ok(I18N.includes(`'${k}'`), `i18n 없음: ${k}`);
  assert.ok(SPACE.includes("'🚪 들어가 보기'") && SPACE.includes("'🚪 마당으로'"));
});

test('🏡 doors.js 이웃 분기는 neighborPrompt 하나로 · updateToolPageAuto 유지', () => {
  const i = DOORS.indexOf('if (atNeighbor) {'); const b = DOORS.slice(i, DOORS.indexOf('\n    return;\n', i));
  assert.match(b, /neighborPrompt\(player\.position\)/);
  assert.match(b, /updateToolPageAuto\(\)/);
  assert.doesNotMatch(DOORS, /neighborDoor/);
});

test('🙋 집주인은 문 앞에서 비켜 선다(hostStand)', () => { assert.match(SCENE, /hostStand\(spot\)/); });

test('📷 game.js — 이웃 실내면 실내/루프탑 카메라·미니맵 중심/반경', () => {
  assert.match(GAME, /neighborIndoorElevated\(\)/);
  assert.match(GAME, /neighborIndoorFrame\(\)/);
});

test('📊 실내 입장·퇴장 트래킹 · 실패는 stage indoor', () => {
  assert.match(SPACE, /trackEvent\(\.\.\.evIndoorEnter\(/);
  assert.match(SPACE, /trackEvent\(\.\.\.evIndoorExit\(/);
  assert.match(SPACE, /evFail\('indoor'/);
});

test('🧹 방문 종료 때 실내도 치운다', () => {
  const i = SPACE.indexOf('export function exitNeighbor('); const b = SPACE.slice(i, SPACE.indexOf('\n}\n', i));
  assert.match(b, /leaveIndoor\(false\)/);
  assert.match(b, /indoorBuilt\?\.dispose\(\)/);
});

test('🌧️ 이웃 집 안엔 비·계절 입자·빗소리 없음 · 출입 때 다시 판정', () => {
  const G = 'mode === \'play\' && !indoor && !atMine && !atCafe && !atMuseum && !atObservatory && !atMountain && !atDream && !atMirror && !atHalloween && !neighborIndoorFrame()';
  for (const fn of ['updateSeasonDrift', 'updateRain']) {
    const i = GAME.indexOf(`function ${fn}(`); const b = GAME.slice(i, GAME.indexOf('\n}\n', i));
    assert.ok(b.includes(`const show = ${G};`), `${fn} 가드 없음`);
  }
  assert.ok(GAME.includes(`if (RAIN_DAY && ${G}) startRainSound();`), '빗소리 가드 없음');
  const body = (n) => { const i = SPACE.indexOf(`function ${n}(`); return SPACE.slice(i, SPACE.indexOf('\n}\n', i)); };
  assert.match(body('enterIndoor'), /setSpaceVisible\(\)/);
  assert.match(body('leaveIndoor'), /setSpaceVisible\(\)/);
});

test('🌲 바깥 풍경 C안 — 잔디 원판 + 나무 둘레를 실내 그룹에 붙이되 안개 예외 뒤에(마당처럼 멀수록 흐리게)', () => {
  const s = read('js/neighbors/indoor-scene.js');
  assert.match(s, /export const OUTSIDE = Object\.freeze\(\{ groundR: 40, trees: 14, treeR: 13 \}\)/);
  const fog = s.indexOf('setFogExempt(group, true)'), out = s.indexOf('group.add(buildOutside())');
  assert.ok(fog > 0 && out > fog, '바깥 풍경은 setFogExempt 뒤에 붙인다');
});
