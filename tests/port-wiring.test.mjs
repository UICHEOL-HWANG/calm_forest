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
