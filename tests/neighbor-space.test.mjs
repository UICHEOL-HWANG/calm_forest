import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = gameSource();
const SCENE = read('js/neighbors/scene.js');
const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');

function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('🔒 scene.js 는 내 세이브를 아예 모른다(읽지도 쓰지도 않는다)', () => {
  assert.doesNotMatch(SCENE, /gameState/);
});

test('🔒 spaces/neighbor.js 가 쓰는 게임 상태는 neighbors · hintsSeen.neighborPublic 뿐', () => {
  const writes = [...SPACE.matchAll(/gameState(?:\.[\w$]+|\[[^\]]+\])+\s*(?:=(?!=)|\+=|-=|\+\+|--)/g)].map(m => m[0].replace(/\s+/g, ''));
  assert.ok(writes.length > 0);
  for (const w of writes) assert.ok(/^gameState\.(neighbors|hintsSeen\.neighborPublic)=$/.test(w), `허용 밖 쓰기: ${w}`);
});

test('places.js: 공간 좌표', () => {
  const p = read('js/data/places.js');
  assert.match(p, /export const NEIGHBOR = new THREE\.Vector3\(0, 0, 700\);/);
  assert.match(p, /export const NEIGHBOR_R = 16;/);
  assert.match(p, /export const NEIGHBOR_GATE = new THREE\.Vector3\(-4, 0, 25\);/);
});

test('game.js 공간 플래그 배선(천문대와 같은 자리)', () => {
  assert.match(SRC, /let atNeighbor = false;/);
  assert.match(SRC, /get atNeighbor\(\) \{ return atNeighbor; \}, set atNeighbor\(v\) \{ atNeighbor = v; \}/);
  assert.match(SRC, /_spaceFlags = \{[^}]*atNeighbor: false/);
  assert.match(bodyOf('spaceFlags'), /_spaceFlags\.atNeighbor = atNeighbor/);
  assert.match(bodyOf('toolZoneKey'), /if \(atNeighbor\) return 'neighbor'/);
  assert.equal((SRC.match(/atNeighbor \? 'neighbor' : atRiver/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR :/);
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR_R :/);
  assert.match(bodyOf('minimapMarks'), /place === 'neighbor'\) \{ neighborMinimapMarks\(marks\);/);
  assert.match(SRC, /\} else if \(atNeighbor\) \{ clampToNeighbor\(player\.position\);/);
  assert.match(bodyOf('handleAction'), /if \(atNeighbor \|\| nearDoor === 'neighbor'\) return neighborAction\(nearDoor\);/);
  assert.match(SRC, /updateObservatory\(dt, t\); updateNeighbor\(dt\);/);
  assert.match(bodyOf('getGameState'), /gameState\.playerPos = atNeighbor \? neighborReturnPos\(\) : \{ x: player\.position\.x, z: player\.position\.z \};/);
  assert.match(SRC, /atObservatory, atOrchard, atNeighbor, atRiver/);
});

test('공간 가드: 문·야외 장식·마을 판정·그림자·도구 페이지', () => {
  assert.match(DOORS, /if \(atNeighbor\) \{/);
  assert.match(DOORS, /nd = neighborDoor\(player\.position\);/);
  assert.match(DOORS, /prompt = nd \? '🚪 내 마을로' : null;/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/shadow-scope.js'), /'atOrchard', 'atNeighbor'\]/);
  assert.match(read('js/data/tools.js'), /neighbor: 'none'/);
});

test('입장·퇴장: 퇴장 때 치우고 8장 훅 · 반응 보상은 원장 출처 neighbor_visit', () => {
  assert.match(bodyOf('enterNeighbor'), /atNeighbor = true/);   // gameSource 가 `$w.` 를 벗긴다
  assert.match(bodyOf('enterNeighbor'), /setSpaceVisible\(\)/);
  const exit = bodyOf('exitNeighbor');
  assert.match(exit, /v\.built\.dispose\(\)/);
  assert.match(exit, /gameState\.neighbors = recordVisit\(gameState\.neighbors\)/);
  assert.match(exit, /syncStory\('neighbor_visit'\)/);
  assert.match(exit, /trackEvent\(\.\.\.evVisitEnd\(/);
  assert.match(SPACE, /giveReward\(\{ coins: REWARD_COINS \}, 'neighbor_visit', v\.publicId\)/);
  assert.match(SPACE, /authState\.isGuest \? \{ ok: false, reason: 'login' \}/);
});

test('치우기: 캐릭터는 disposeSkin 만(재질 공유) · 창문 점등 해제 · 충돌체 제거', () => {
  assert.match(SCENE, /group\.remove\(host\); disposeSkin\(host\);/);
  assert.match(SCENE, /if \(pet\) group\.remove\(pet\);/);
  assert.match(SCENE, /unregisterWindows\(group\);/);
  assert.match(SCENE, /for \(const c of solids\) removeSolid\(c\);/);
  assert.match(SCENE, /sign\.userData\.dead = true;/);
  assert.doesNotMatch(SCENE, /registerAddonAnims/);   // 내 집 구성품 애니메이션 목록을 덮어쓴다
});

test('미니맵: 이웃 공간 라벨·바닥색', () => {
  const html = read('index.html');
  assert.match(html, /d\.place === 'neighbor' \? 'rgba\(150,200,120,0\.75\)'/);
  assert.match(html, /d\.place === 'neighbor' \? '🏡 이웃의 숲'/);
});
