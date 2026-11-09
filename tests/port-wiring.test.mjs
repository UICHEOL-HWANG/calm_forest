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
