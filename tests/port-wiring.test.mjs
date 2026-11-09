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
