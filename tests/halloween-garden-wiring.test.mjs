import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('플래그 선언과 공간 판정 목록', () => {
  assert.match(SRC, /let atHalloween = false;/);
  assert.match(SRC, /_spaceFlags\.atHalloween = atHalloween;/);
  assert.match(read('js/spaces/doors.js'), /inVillage2\(\) \{ return [^}]*!atHalloween/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atHalloween/);
  assert.match(read('js/shadow-scope.js'), /'atHalloween'/);
});

test('클램프 — 기본 else(반경 42) 앞에 정원 분기가 있다', () => {
  const i = SRC.indexOf('} else if (atHalloween) { clampToHalloween(player.position);');
  const e = SRC.indexOf('const maxR = 42');
  assert.ok(i > 0 && e > 0 && i < e);
  assert.match(SRC, /if \(atHalloween\) clampToHalloween\(player\.position\);\n  if \(atMirror\) clampToMirror/);
});

test('저장 — 정원 안에서 저장하면 입구 앞으로 적는다', () => {
  assert.match(SRC, /if \(atHalloween\) gameState\.playerPos = halloweenReturnPos\(\);/);
  assert.match(SRC, /settleHalloween\(\);/);
  assert.match(SRC, /candy: 0/);
});

test('보이기·미니맵·액션·매 프레임', () => {
  assert.match(SRC, /setHalloweenVisible\(atHalloween\);/);
  assert.match(SRC, /atHalloween \? 'halloween' : 'village'/);
  assert.match(SRC, /place === 'halloween'[\s\S]{0,140}halloweenMinimapMarks/);
  assert.match(SRC, /if \(atHalloween \|\| nearDoor === 'halloween'\) return halloweenAction\(nearDoor\);/);
  assert.match(SRC, /updateHalloween\(dt, t\);/);
  assert.match(SRC, /spawnHalloweenGate\(\);/);
});

test('해 위치까지 고정한 정원 조명 블록', () => {
  assert.match(SRC, /if \(atHalloween\) \{\n    hemiLight\.intensity[\s\S]{0,260}sunLight\.position\.set\(HALLOWEEN\.x/);
});

test('사탕 장식 — 직접 구매 막기·보관분만 보이기·조형 분기', () => {
  assert.match(read('js/spaces/indoor.js'), /if \(def\.candy && !fromStore && !silent && !free\) \{ return false; \}/);
  assert.match(read('js/spaces/indoor.js'), /CANDY_DECOR_IDS\.includes\(id\)\) \{\n    g\.add\(buildCandyDecor\(id\)\);/);
  assert.match(SRC, /\.filter\(d => !d\.candy \|\| \(kept\[d\.id\] \|\| 0\) > 0\)/);
  const cat = read('js/data/catalog.js');
  for (const id of ['ghostDoll', 'candyBasket', 'jackLamp']) assert.match(cat, new RegExp(`id: '${id}',[^\\n]*pay: 'candy', candy: true`));
});

test('트래킹 이벤트 이름 · GA4 예약어 없음', () => {
  const hw = read('js/spaces/halloween.js');
  for (const ev of ['hw_enter', 'hw_exit', 'hw_ghost', 'hw_exchange', 'hw_cashout']) assert.match(hw, new RegExp(`trackEvent\\('${ev}'`));
  assert.doesNotMatch(hw, /trackEvent\([^)]*\b(source|medium|campaign|term|content)\s*:/);
});

test('정원 판정은 판매 창 한 곳(halloweenGarden)에서만 온다', () => {
  const hw = read('js/spaces/halloween.js');
  assert.match(hw, /saleOpen\(\{ sale: 'halloweenGarden' \}/);
  assert.doesNotMatch(hw, /2026-1[01]-\d\d/);
});

test('새 화면은 -modal 로 끝나 anyModalOpen 이 입력을 막는다', () => {
  const ui = read('js/halloween/ui.js');
  assert.match(ui, /id = 'hw-arrive-modal'/);
  assert.match(ui, /id = 'hw-stall-modal'/);
  const arrive = ui.slice(ui.indexOf("a.id = 'hw-arrive-modal'"), ui.indexOf("const s = document.createElement('div')"));
  assert.doesNotMatch(arrive, /<b>/);
});
