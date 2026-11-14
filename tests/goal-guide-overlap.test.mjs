import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('목표 화살표와 세계수 연출은 중재자에게 묻고, 위 순위 안내가 도는 동안 물러난다', () => {
  const goal = read('js/guide/goal-guide.js');
  assert.match(goal, /!deps\.cameraFree\(\) \|\| deps\.otherGuide\?\.\(goal\.flow\)\) \{ hideArrow\(\); return; \}/);
  assert.match(goal, /if \(waitT >= CINE_DELAY && canCine\(\) && !deps\.otherGuide\?\.\(goal\.flow\)\) startCine/);
  const game = read('js/game.js');
  assert.match(game, /otherGuide: \(flow\) => !guideMay\(flow === 'tut' \? 'coach' : 'goal'\),/);
  assert.match(game, /const guideMay = \(name\) => guideArbiter\.mayShow\(name\);/);
  assert.match(read('js/auction/index.js'), /export function auctionGuideActive\(\) \{ return !!guide\?\.active; \}/);
});

test('안내 열 가지가 모두 중재자에 등록되고 각자 물러날 자리를 묻는다', () => {
  const game = read('js/game.js');
  const registered = [...game.matchAll(/guideArbiter\.register\(\{ name: '(\w+)'/g)].map(m => m[1]);
  assert.deepEqual(registered, ['coach', 'house', 'goal', 'port', 'restaurant', 'yard', 'affinity', 'weekly', 'concert', 'auction']);
  for (const [name, fn] of [['port', 'portGuideActive'], ['restaurant', 'restaurantGuideActive'], ['affinity', 'affinityGuideActive'], ['weekly', 'weeklyGuideActive'], ['concert', 'concertGuideActive'], ['auction', 'auctionGuideActive']]) {
    assert.match(game, new RegExp(`register\\(\\{ name: '${name}', active: ${fn}[ ,]`), name);
  }
  assert.match(game, /updatePortGuide\([^;]*&& guideMay\('port'\)\);/);
  assert.match(game, /updateRestaurantGuide\([^;]*&& guideMay\('restaurant'\)\);/);
  assert.match(game, /updateAffinityGuide\([^;]*&& guideMay\('affinity'\)\);/);
  assert.match(game, /maybeStartPortGuide\([^;]*guideMay\('port'\)/);
  assert.match(game, /maybeStartRestaurantGuide\([^;]*guideMay\('restaurant'\)/);
  assert.match(game, /mayShow: \(\) => guideMay\('house'\)/);
  assert.match(game, /otherGuide: \(name\) => !guideMay\(name\) \};/);
  assert.match(read('js/weekly/index.js'), /otherGuide: env\.otherGuide\('weekly'\)/);
  assert.match(read('js/concert/index.js'), /otherGuide: env\.otherGuide\('concert'\)/);
  assert.match(read('js/weekly/bridge.js'), /otherGuide: \(name\) => g\.otherGuide\(name\) \|\| body\(\)\.contains\('coaching'\)/);
  const auction = read('js/auction/index.js');
  assert.match(auction, /visible: \(\) => cameraFree\(\) && !uiBusy\(\) && guideArbiter\.mayShow\('auction'\)/);
  assert.match(auction, /!intro\?\.open && guideArbiter\.mayShow\('auction'\);/);
  const house = read('js/spaces/house-guide.js');
  assert.match(house, /if \(due && may\) start\(\);/);
  assert.match(house, /if \(!may \|\| distance <= 3\.2/);
  const aff = read('js/affinity/guide.js');
  assert.match(aff, /if \(!guideArbiter\.mayShow\('affinity'\)\) \{ pending = id; return false; \}/);
  assert.match(aff, /if \(!guide && pending && visible\) startAffinityGuide\(pending\);/);
});
