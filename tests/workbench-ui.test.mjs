import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cardHtml, tileParts, starsHtml, meterHtml, strikesHtml } from '../js/workbench/forge-ui.js';
import { STAR_EFFECT } from '../js/workbench/rules.js';

const view = (over = {}) => ({
  tool: 'rod', name: '튼튼한 낚싯대', ico: '🎣', owned: true, star: 1, effects: [...STAR_EFFECT.rod],
  check: { state: 'ready', star: 1, next: 2, cost: { coins: 240, stone: 10, fish: 8 }, missing: [] },
  ...over,
});

test('stars mark owned and next', () => {
  assert.equal(starsHtml(1, 2), '<span class="fg-stars"><i class="on">★</i><i class="next">★</i><i>★</i></span>');
  assert.equal(starsHtml(3, 0), '<span class="fg-stars"><i class="on">★</i><i class="on">★</i><i class="on">★</i></span>');
});

test('ready card shows now and next, chips and the button', () => {
  const h = cardHtml(view());
  assert.match(h, /입질 여유 <span class="now">3\.0초<\/span><i class="chev"><\/i><span class="nxt">3\.4초<\/span>/);
  assert.match(h, /<span class="chip ok">🪙 240<\/span><span class="chip ok">🪨 10<\/span><span class="chip ok">🐟 8<\/span>/);
  assert.match(h, /<button class="upc-go" data-go="rod">🔨 ★2로 강화하기<\/button>/);
  assert.match(h, /망치질 5번 · 내일 아침 완성 · 그동안도 쓸 수 있어요/);
});

test('short card marks missing chips and dims the button', () => {
  const h = cardHtml(view({ check: { state: 'short', star: 1, next: 2, cost: { coins: 240, stone: 10, fish: 8 }, missing: ['fish'] } }));
  assert.match(h, /<span class="chip lack">🐟 8<\/span>/);
  assert.match(h, /class="upc-go off"/);
});

test('busy, pending and max cards', () => {
  const busy = cardHtml(view({ check: { state: 'busy', star: 1, next: 2, cost: { coins: 240, stone: 10, fish: 8 }, busyTool: 'pot' } }));
  assert.match(busy, /disabled/);
  assert.match(busy, /모루에 다른 도구가 있어요/);
  const pending = cardHtml(view({ check: { state: 'pending', star: 1, next: 2 } }));
  assert.doesNotMatch(pending, /upc-go/);
  assert.match(pending, /🌙 내일 아침 ★2가 돼요\. 그동안도 쓸 수 있어요/);
  const max = cardHtml(view({ star: 3, check: { state: 'max', star: 3 } }));
  assert.doesNotMatch(max, /chev/);
  assert.match(max, /최고 별이에요/);
});

test('tiles follow the sim', () => {
  assert.deepEqual(tileParts(view()), { badge: '<span class="fg-badge"><i class="on">★</i></span>', buff: '입질 여유 3.0초', tag: '' });
  assert.equal(tileParts(view({ star: 0 })).badge, '');
  assert.equal(tileParts(view({ check: { state: 'pending', star: 1, next: 2 } })).tag, '🌙 ★2 내일');
  assert.equal(tileParts(view({ tool: 'hammer', star: 0, effects: [...STAR_EFFECT.hammer] })).buff, '목재 30% 덜');
});

test('result meter lights the band and strikes show each mark', () => {
  assert.match(meterHtml(8), /<div class="on">8~9점<br>20%<\/div>/);
  assert.equal((meterHtml(8).match(/class="on"/g) || []).length, 1);
  assert.equal(strikesHtml([2, 1, 0, null, null]), '<i class="sk p"></i><i class="sk g"></i><i class="sk m"></i><i class="sk"></i><i class="sk"></i>');
});
