import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ZONE_KIT, ZONE_PAGE, ZONE_TOOL } from '../js/data/tools.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const game = read('js/game.js');
const html = read('index.html');
const fan = read('js/hud/tool-fan.js');
const en = read('js/i18n-en.js');
const KIT_HINT = '이동 WASD/방향키 · 1 괭이 · 2 맨손 · 상호작용 Space/클릭';

test('mine kit is the hoe only, on top of the existing farm page and hoe pick', () => {
  assert.deepEqual(ZONE_KIT, { mine: ['hoe'] });
  assert.equal(ZONE_PAGE.mine, 'farm');
  assert.equal(ZONE_TOOL.mine, 'hoe');
});

test('game exposes the kit, maps digits to kit slots, and redraws the bar on zone change', () => {
  assert.match(game, /toolKit\(\) \{ return ZONE_KIT\[toolZoneKey\(\)\] \|\| null; \}/);
  assert.match(game, /pickKitSlot\(n\) \{/);
  assert.match(game, /if \(\/\^Digit\[1-6\]\$\/\.test\(e\.code\) && Input\.pickKitSlot\(parseInt\(e\.code\.slice\(5\)\) - 1\)\) ui\.act\?\.\('toolpick'\);\n\s*else if \(e\.code === 'Digit1'\)/);
  assert.match(game, /\} else if \(toolPage === 'none' && pageBeforeAuto\) \{\n.*\n  \}\n  ui\.setTool\?\.\(currentTool, TOOLS, toolPage\);\n\}/);
});

test('mining in the mine always swings the hoe instead of nagging about tool sets', () => {
  assert.doesNotMatch(game, /괭이\(2\)로 캐야 해요/);
  assert.match(game, /if \(atMine\) \{\n\s*if \(toolPage !== 'farm'\) setToolPage\('farm', true\);\n\s*selectToolAuto\('hoe'\);\n\s*return delveFloorNow\(\) > 0 \? tryDelveMine\(\) : tryMine\(\);/);
});

test('desktop bar and mobile fan show only kit tools plus bare hands', () => {
  assert.match(html, /hand\.id = 'tool-bare'/);
  assert.match(html, /const kit = Input\.toolKit\?\.\(\) \|\| null;/);
  assert.match(html, /\$\('tool-page'\)\.hidden = !!kit;/);
  assert.match(html, new RegExp(`'${KIT_HINT}'`));
  assert.match(fan, /const kit = Input\.toolKit\?\.\(\);/);
  assert.match(fan, /stepTool\(kit \? order\(\)\.filter\(i => kit\.includes\(tools\[i\]\.id\)\) : order\(\), cur, dir\)/);
  assert.ok(en.includes(`'${KIT_HINT}'`));
});

test('kit fan spreads its few slots right above the tool button, not over the joystick', async () => {
  const { kitLayout, FAN } = await import('../js/hud/fan-layout.js');
  const [a, b] = kitLayout({ cx: 200, cy: 600, n: 2 });
  assert.ok(a.x < 200 && b.x > 200, 'one left, one right of the button');
  assert.ok(a.y < 600 && b.y < 600, 'both above the button');
  assert.ok(Math.abs(Math.hypot(a.x - 200, a.y - 600) - FAN.rIn) < 1e-9);
  assert.match(fan, /const raw = kit \? kitLayout\(\{ \.\.\.at, n: items\.length \}\) : fanLayout/);
});

test('bare hands picked inside the mine are temporary: leaving brings the set back', () => {
  assert.match(game, /const keep = id === 'none' && Input\.toolKit\(\);\n\s*pageBeforeAuto = keep \? \(toolPage !== 'none' \? toolPage : pageBeforeAuto\) : null;/);
});
