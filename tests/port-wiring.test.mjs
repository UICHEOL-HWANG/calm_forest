import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('통배·부표는 새 아이콘 id 로 들어가고 ⛵ 는 그대로', async () => {
  const { ICON_BY_ID, ICON_BY_EMOJI } = await import('../js/icons/toss-icons.js');
  assert.ok(ICON_BY_ID.tub_boat?.startsWith('<svg'));
  assert.ok(ICON_BY_ID.buoy?.startsWith('<svg'));
  assert.equal(ICON_BY_EMOJI['⛵'], undefined);
  assert.match(read('tools/icons/build-game-icons.mjs'), /'tub_boat', 'buoy'/);
});

test('조형은 js/port 로 옮기고 sims 를 import 하지 않는다', () => {
  for (const f of ['js/port/models.js', 'js/port/npc-models.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /sims\//);
    assert.match(src, /from 'three'/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  const m = read('js/port/models.js');
  assert.match(m, /export function tubBoat\(/);
  assert.match(m, /export function buildPortShops\(/);
  assert.doesNotMatch(m, /function marketA|function hutB|SHOP_STYLES/);
  const n = read('js/port/npc-models.js');
  for (const name of ['buildIslandNPC', 'netBuoy', 'beachBuoy', 'npcPortrait', 'setNpcNight']) assert.match(n, new RegExp(`export function ${name}\\(`));
});

test('후미 바탕은 cove, 바다터 입구는 sea, 통배 부두는 port 잠금으로 나뉜다', () => {
  const game = read('js/game.js');
  assert.match(game, /lockFrom\('cove'\); spawnSeaCove\(\); lockTo\(\);/);
  assert.match(game, /lockFrom\('sea'\); spawnSeaGate\(\); lockTo\(\);/);
  assert.match(game, /lockFrom\('port'\); spawnPortPier\(\); lockTo\(\);/);
  const places = read('js/data/places.js');
  assert.match(places, /export const PORT = new THREE\.Vector3\(700, 0, 0\);/);
  assert.match(places, /export const PORT_PIER = /);
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /isOpen\('port'\) && nearPortPier\(player\.position\)/);
  assert.match(doors, /nd = 'port_board'/);
});

test('방파제 바위줄은 바다터 입구와 같이 잠기고 후미에는 없다', () => {
  const sea = read('js/spaces/sea.js');
  const body = name => { const i = sea.indexOf(`export function ${name}(`); return sea.slice(i, sea.indexOf('\nexport function', i + 1)); };
  assert.match(body('spawnSeaGate'), /IcosahedronGeometry\(0\.42 - t \* 0\.14/);
  assert.doesNotMatch(body('spawnSeaCove'), /IcosahedronGeometry\(0\.42 - t \* 0\.14/);
});

test('섬은 바다 공간의 하위 모드로 붙는다', () => {
  const sea = read('js/spaces/sea.js'), game = read('js/game.js'), doors = read('js/spaces/doors.js');
  assert.match(sea, /if \(port\.active\) return updatePort\(dt, t\);/);
  assert.match(sea, /if \(port\.active\) return portCamera\(camera, look, dt\);/);
  assert.match(sea, /leaveMudflat\(\);\n  leaveDive\(\);\n  leavePort\(\);/);
  assert.match(game, /if \(nearDoor === 'port_board' && !atSea\) return enterPort\(\);/);
  assert.match(game, /port\.active \? portAction :/);
  assert.match(game, /else if \(port\.active\) clampPort\(player\.position\);/);
  assert.match(game, /if \(portOwnsMovement\(\)\) return;/);
  assert.match(game, /_wq\.get\('port'\) === '1'/);
  assert.match(doors, /else if \(port\.active\) \{ const pp = portPrompt\(\); nd = pp\.nd; prompt = pp\.prompt; \}/);
});

test('포구 의뢰 카드가 의뢰 패널에 붙고 대화는 아래 대사 박스를 쓴다', () => {
  assert.match(read('js/spaces/npc.js'), /portCard\(gameState\.port, port\.active\)/);
  const idx = read('js/port/index.js');
  assert.match(idx, /from '\.\.\/mirror\/talk-box\.js'/);
  assert.match(idx, /npcPortrait\(/);
  assert.doesNotMatch(idx, /npc-modal|openNPCModal/);
});

test('도착 직후 첫 누름으로 다시 떠나지 않게 섬·마을 부두 모두 잠근다', () => {
  const idx = read('js/port/index.js');
  assert.match(idx, /function arriveIsland\(\) \{[^}]*boardArmed = false/);
  assert.match(idx, /boardGate\(boardArmed,/);
  assert.match(idx, /disarmPortPier\(\)/);
  assert.match(read('js/port/pier.js'), /boardGate\(pierArmed,/);
  assert.match(idx, /PORT_COPY\.noCoins/);
});

test('port 는 기본값으로 시작하고 불러올 때 정규화한다', () => {
  const game = read('js/game.js');
  assert.match(game, /port: defaultPort\(\),/);
  assert.match(game, /gameState\.port = sanitizePort\(saved\.port\);/);
});

test('첫 방문 안내: 시작·매 프레임·숨김·귀항 순서가 연결된다', () => {
  const idx = read('js/port/index.js'), game = read('js/game.js'), doors = read('js/spaces/doors.js'), html = read('index.html');
  assert.doesNotMatch(idx, /const guideActive = \(\) => false/);
  assert.match(idx, /export const guideActive = \(\) => !!guide\?\.active\(\)/);
  for (const f of ['startPortGuide', 'updatePortGuide', 'guideHides']) assert.match(idx, new RegExp(`export (function|const) ${f}\\b`));
  assert.match(idx, /onStep: e => env\.trackEvent\('guide_step', e\)/);
  assert.match(idx, /guideDone: true/);
  assert.match(idx, /if \(guideHides\(\)\) return null;/);
  assert.match(idx, /flushGuideHome\(\);\n  env\.exitSea\(\);/);
  assert.match(game, /updateSeaVisuals\(t\);[^\n]*\n  updatePortGuide\(/);
  assert.match(game, /syncUnlocks\(\);[^\n]*maybeStartPortGuide\(|maybeStartPortGuide\([^\n]*syncUnlocks\(\)/);
  assert.match(game, /setActPoint:/);
  assert.match(doors, /fastUnlocked && !guideHides\(\)/);
  for (const id of ['guide-card', 'guide-mark', 'guide-edge']) assert.match(html, new RegExp(`<div id="${id}" hidden></div>`));
  assert.match(html, /body:has\(#mirror-talk\.show\) #guide-card \{ display: none; \}/);
  assert.match(html, /\.point::after \{ content: '👆'/);
  for (const f of ['js/guide/view.js', 'js/port/guide-steps.js']) assert.doesNotMatch(read(f), /^\s*\/\/|\/\*/m);
});

test('guide_step 이벤트는 분류표에 flow·step·ms 를 담는다', () => {
  const row = read('docs/analysis/event-taxonomy.csv').split('\n').find(l => l.startsWith('guide_step,'));
  assert.ok(row);
  const params = row.split(',')[10].split('|');
  for (const k of ['flow', 'step', 'ms']) assert.ok(params.includes(k), k);
});

test('통배 부두 데크는 물 충돌 원 밖 뭍에서 시작해 걸어서 오를 수 있다', () => {
  const places = read('js/data/places.js'), sea = read('js/spaces/sea.js');
  const a = +places.match(/const PIER_A = coveAt\(SEA_COVE\.r ([+-] [\d.]+)\)/)[1].replace(' ', '');
  const water = -+sea.match(/solidCircle\(SEA_COVE\.x, SEA_COVE\.z, SEA_COVE\.r - ([\d.]+)\)/)[1];
  assert.ok(a > water + 0.45, `deck start r+${a} must clear water r${water} + player radius`);
});

test('안내 free 단계에선 섬 부두 끝 탑승 래치를 켜고, 매 프레임 일은 줄인다', () => {
  const idx = read('js/port/index.js'), view = read('js/guide/view.js');
  assert.match(idx, /if \(guide\?\.current\(\)\?\.id === 'free'\) boardArmed = true;\n  const g = boardGate\(boardArmed,/);
  const upd = idx.slice(idx.indexOf('export function updatePortGuide'));
  assert.doesNotMatch(upd, /SOLIDS\.map|W\(/);
  const ctx = idx.slice(idx.indexOf('function guideCtx'), idx.indexOf('function setPoint'));
  assert.doesNotMatch(ctx, /W\(|\.filter\(/);
  assert.match(idx, /if \(DBG\) window\.__portGuide = /);
  assert.doesNotMatch(idx, /^\s*window\.__portGuide = /m);
  const show = view.slice(view.indexOf('function show'));
  assert.doesNotMatch(show, /getBoundingClientRect/);
  assert.match(view, /addEventListener\('resize'/);
});

test('포구를 떠나면 의뢰 카드를 다시 그리고, 잡은 물고기는 바로 저장하며, 프레임마다 새 배열·Euler 를 만들지 않는다', () => {
  const src = read('js/port/index.js'), body = name => src.slice(src.indexOf(`function ${name}(`), src.indexOf('\n}\n', src.indexOf(`function ${name}(`)));
  assert.match(body('leavePort'), /env\.refreshQuestPanel\(\)/);
  assert.match(body('tapFish'), /addToPantry[\s\S]*env\.requestSave\(\)/);
  assert.doesNotMatch(body('sailTick'), /\[\.\.\.ROUTE\]/);
  assert.match(src, /const ROUTE_BACK = \[\.\.\.FAST_ROUTE\]\.reverse\(\);/);
  assert.doesNotMatch(read('js/guide/view.js'), /new THREE\.Euler/);
  assert.match(read('js/game.js'), /seaGroup\.visible = atSea && !port\.active;/);
});
