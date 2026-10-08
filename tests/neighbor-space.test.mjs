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
  assert.equal((SRC.match(/atNeighbor \? 'neighbor' : (?:atMirror \? 'mirror' : )?(?:atDream \? 'dream' : )?atRiver/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR :/);
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR_R :/);
  assert.match(bodyOf('minimapMarks'), /place === 'neighbor'\) \{ neighborMinimapMarks\(marks\);/);
  assert.match(SRC, /\} else if \(atNeighbor\) \{ clampToNeighbor\(player\.position\);/);
  assert.match(bodyOf('handleAction'), /if \(atNeighbor \|\| nearDoor === 'neighbor'\) return neighborAction\(nearDoor\);/);
  assert.match(SRC, /updateObservatory\(dt, t\); updateNeighbor\(dt\);/);
  assert.match(bodyOf('getGameState'), /gameState\.playerPos = atNeighbor \? neighborReturnPos\(\) : (?:atMirror \? mirrorReturnPos\(\) : )?(?:atDream \? dreamReturnPos\(\) : )?\{ x: player\.position\.x, z: player\.position\.z \};/);
  assert.match(SRC, /atObservatory, atOrchard, atNeighbor, atRiver/);
});

test('공간 가드: 문·야외 장식·마을 판정·그림자·도구 페이지', () => {
  assert.match(DOORS, /if \(atNeighbor\) \{/);
  assert.match(DOORS, /nd = neighborDoor\(player\.position\);/);
  assert.match(DOORS, /prompt = nd \? '🚪 내 마을로' : null;/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/shadow-scope.js'), /'atOrchard', 'atNeighbor'(?:, 'atDream')?(?:, 'atMirror')?\]/);
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

// ── 리뷰 1차 수정 ──
const UI = read('js/neighbors/ui.js');
const disposeBody = () => { const i = SCENE.indexOf('dispose() {'); assert.ok(i >= 0); return SCENE.slice(i, SCENE.indexOf('\n    },', i)); };

test('치우기: 트리 안 모든 userData.solid 제거 + 늦게 오는 팻말 등록 차단(화덕·발효통 팻말 포함)', () => {
  const d = disposeBody();
  assert.match(d, /group\.traverse\(o => \{ if \(o\.userData\.solid\) removeSolid\(o\.userData\.solid\); o\.userData\.dead = true; \}\)/);
  // 순서: 치우기(traverse)는 disposeTree 보다 앞
  assert.ok(d.indexOf('group.traverse(o => { if (o.userData.solid)') < d.indexOf('disposeTree(group)'));
});

test('치우기: 🔥 화덕 불꽃 목록에서 이 그룹의 불꽃을 뺀다(방문마다 kilnFlames 가 늘지 않게)', () => {
  assert.match(disposeBody(), /dropKilnFlames\(group\);/);
  const helper = SRC.slice(SRC.indexOf('function dropKilnFlames('), SRC.indexOf('function dropKilnFlames(') + 400);
  assert.match(helper, /kilnFlames\.splice\(i, 1\)/);
  assert.match(helper, /o = o\.parent/);           // 조상 사슬로 그룹 안인지 판정
  assert.match(SRC, /export \{[\s\S]*\bdropKilnFlames\b[\s\S]*\};/);
  assert.ok(disposeBody().indexOf('dropKilnFlames(group)') < disposeBody().indexOf('scene.remove(group)'), '부모 사슬이 살아 있을 때 판정');
});

test('치우기: 재질의 map(팻말 캔버스·나무 텍스처 복제)도 버린다', () => {
  assert.match(disposeBody(), /m\?\.map\?\.dispose\?\.\(\)/);
});

test('놀러 가기: 닫힌 피커에 늦게 온 응답은 순간이동하지 않는다 · 요청 중 닫기 잠금 · 다른 공간에선 입장 거부', () => {
  const go = SPACE.slice(SPACE.indexOf('async function goVisit('), SPACE.indexOf('// ── 입장 · 퇴장'));
  assert.ok(go.indexOf('if (!isPickerOpen()) return;') > go.indexOf('await neighborApi.showcase('), 'await 뒤에 확인');
  assert.match(UI, /export function isPickerOpen\(\)/);
  assert.match(UI, /#nb-pick-modal \.nb-go, #nb-pick-modal \.nb-close/);
  assert.match(bodyOf('enterNeighbor'), /if \(visit \|\| !inVillage2\(\)\) return;/);
});

test('놀러 가기: 검증·짓기·입장 실패는 조용히 삼키지 않는다(evFail showcase/build + 토스트)', () => {
  const go = SPACE.slice(SPACE.indexOf('async function goVisit('), SPACE.indexOf('// ── 입장 · 퇴장'));
  assert.match(go, /try \{[\s\S]*sanitizeShowcase[\s\S]*enterNeighbor\([\s\S]*\} catch \(e\) \{/);
  assert.match(go, /evFail\('showcase', 'build'\)/);
  assert.match(go.slice(go.indexOf('catch (e)')), /ui\.toast\?\.\(FAIL_TOAST, 2600\)/);
});

// ── 최종 리뷰 수정 ──
test('🌫️ 이웃 마당 안개 — 바다처럼 시야를 넓힌다(구경 공간 · 날씨 톤은 유지, setFogExempt 아님)', () => {
  const dn = bodyOf('updateDayNight');
  assert.match(dn, /if \(atNeighbor\) \{ scene\.fog\.near = 24; scene\.fog\.far = 66; \}/);
  assert.ok(dn.indexOf('if (atNeighbor) { scene.fog.near') > dn.indexOf("WEATHER === 'snow'"), '날씨 안개 뒤에 덮어쓴다');
  assert.doesNotMatch(SRC, /setFogExempt\([^)]*[Nn]eighbor/);
});

test('🎒 이웃 공간 분기도 도구 페이지를 넘긴다(ZONE_PAGE.neighbor=none 이 실제로 적용)', () => {
  const i = DOORS.indexOf('if (atNeighbor) {');
  const branch = DOORS.slice(i, DOORS.indexOf('\n  }', i));
  assert.match(branch, /updateToolPageAuto\(\);[^\n]*\n\s*return;/);
});

test('↩️ 돌아오는 자리는 팻말 트리거(중심 z+1.2, r 2.2) 밖 — 프롬프트가 바로 다시 뜨지 않게', () => {
  assert.match(SPACE, /player\.position\.set\(NEIGHBOR_GATE\.x, 0, NEIGHBOR_GATE\.z \+ 3\.6\);/);
  assert.match(SPACE, /export function neighborReturnPos\(\) \{ return \{ x: NEIGHBOR_GATE\.x, z: NEIGHBOR_GATE\.z \+ 3\.6 \}; \}/);
  assert.match(DOORS, /dist2D\(\{ x: NEIGHBOR_GATE\.x, z: NEIGHBOR_GATE\.z \+ 1\.2 \}, player\.position\) < 2\.2/);
  assert.ok(3.6 - 1.2 > 2.2);
});

test('🧱 짓다가 터지면 충돌체·창문 등록을 되돌리고 다시 던진다(z≈700 투명 벽 방지)', () => {
  const b = SCENE.slice(SCENE.indexOf('export function buildNeighborScene('));
  assert.match(b, /\} catch \(e\) \{ built\.dispose\(\); throw e; \}/);
  assert.ok(b.indexOf('try {') < b.indexOf('solidCircle(') && b.indexOf('try {') < b.indexOf('prepHouseMeshes(house)'), '충돌체·창문 등록은 try 안');
  assert.match(disposeBody(), /if \(host\) \{ group\.remove\(host\); disposeSkin\(host\); \}/);
  assert.match(disposeBody(), /if \(sign\) sign\.userData\.dead = true;/);
});
