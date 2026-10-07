import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = gameSource();
const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');

function vec3(name) {
  const m = new RegExp(`const ${name} = new THREE\\.Vector3\\(\\s*(-?[\\d.]+)\\s*,\\s*-?[\\d.]+\\s*,\\s*(-?[\\d.]+)\\s*\\)`).exec(SRC);
  assert.ok(m, `${name} 좌표를 못 찾았다`);
  return { x: +m[1], z: +m[2] };
}
const num = (name) => { const m = new RegExp(`const ${name} = (-?[\\d.]+)`).exec(SRC); assert.ok(m, name); return +m[1]; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 없음`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('🏡 팻말 자리가 다른 장소·주민·나무 링과 겹치지 않는다', () => {
  const G = vec3('NEIGHBOR_GATE');
  const RING = 2.6;   // buildGlade/buildForest 링 = R + 1.2~1.4 + 1.2~1.4 (tests/village-places 와 같은 근사)
  assert.ok(dist(G, vec3('GLADE')) > num('GLADE_R') + RING + 1, '🌟계곡 나무 링과 겹친다');
  assert.ok(dist(G, vec3('FOREST')) > num('FOREST_R') + RING + 1, '🍄숲 나무 링과 겹친다');
  for (const n of ['COOP', 'CAFE_GATE', 'FARM_GATE', 'OBSERVATORY_GATE', 'MUSEUM_GATE', 'HOUSE_POS']) assert.ok(dist(G, vec3(n)) > 6, n);
  const npcs = [...read('js/data/npcs.js').matchAll(/pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/g)].map(m => ({ x: +m[1], z: +m[2] }));
  assert.ok(npcs.length >= 11);
  for (const p of npcs) assert.ok(dist(G, p) > 3, `주민 자리 ${p.x},${p.z} 와 가깝다`);
  const kiln = JSON.parse(/export const KILN_SPOTS = (\[\[.*?\]\]);/.exec(read('js/data/catalog.js'))[1]);
  for (const [x, z] of kiln) assert.ok(dist(G, { x, z }) > 3, `화덕 후보 ${x},${z}`);
  assert.ok(Math.hypot(G.x, G.z) < 40, '마을 이동 반경(42) 안');
});

test('팻말 세우기 · 나무/꽃 산포 제외 · 지도 지명 · 문 프롬프트', () => {
  assert.match(bodyOf('buildEnvironment'), /spawnNeighborGate\(\);/);
  assert.match(SRC, /\|\| dist2D\(\{ x, z \}, NEIGHBOR_GATE\) < 3/);
  assert.match(SRC, /if \(dist2D\(\{ x, z \}, NEIGHBOR_GATE\) < 1\.5\) continue;/);
  assert.match(SRC, /\{ ico: '🏡', name: '이웃 마을 가는 길', x: NEIGHBOR_GATE\.x, z: NEIGHBOR_GATE\.z, pri: 1 \}/);
  assert.match(DOORS, /nd = 'neighbor'; prompt = '🏡 이웃 마을 가는 길';/);
  assert.match(DOORS, /firstHintBanner\('neighborGate', '🏡', '이웃 마을 가는 길', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'\)/);
  assert.match(SPACE, /makeSignpost\('🏡 이웃 마을 가는 길', 0, 0\)/);
});

test('세이브 필드 neighbors — 기본값·복원·부팅 알림', () => {
  assert.match(SRC, /neighbors: neighborsDefault\(\),/);
  assert.match(bodyOf('applySave'), /gameState\.neighbors = restoreNeighbors\(saved\.neighbors\);/);
  assert.match(SRC, /syncStory\(\); storyBooted = true;[^\n]*\n\s*initNeighbors\(\);/);
  assert.match(SPACE, /openVisitorsModal\(view, \(\) => \{ gameState\.neighbors = markSeen\(gameState\.neighbors, asked\); requestSave\(\); firstPublicNotice\(\); \}\)/);
  assert.match(SPACE, /trackEvent\(\.\.\.evNotice\(view\.rows\.length, view\.total\)\)/);
  assert.match(SPACE, /gameState\.hintsSeen\.neighborPublic = true;/);
  assert.match(SPACE, /ui\.toast\?\.\('🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', 4200\)/);
});

test('설정 토글 — 성공하면 상태·GA4, 실패하면 토스트+실패 이벤트, 게스트는 숨김', () => {
  assert.match(SPACE, /trackEvent\(\.\.\.evToggle\(villagePublic\)\)/);
  assert.match(SPACE, /trackEvent\(\.\.\.evFail\('toggle', r\.reason\)\); ui\.toast\?\.\(FAIL_TOAST, 2400\)/);
  assert.match(SPACE, /setVillagePublicUi\(villagePublic, member\)/);
});

test('8장 해제 — 기존 4장 완료자처럼 7장 완료자에게도 새 장 토스트', () => {
  assert.match(bodyOf('syncStory'), /if \(!storyBooted && !retro && \(st\.ch === 4 \|\| st\.ch === 7\)\)/);
});
