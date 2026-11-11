import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREPASS_CAPS, repeatOpen, sellBonus, rushSlots, rushTargets } from '../js/guide/prepass-rules.js';

test('반복 자리는 집을 다 지은 뒤에만 연다', () => {
  assert.equal(repeatOpen(2), false);
  assert.equal(repeatOpen(3), true);
  assert.equal(repeatOpen(undefined), false);
});

test('판매 웃돈은 절반, 코인 상한까지', () => {
  assert.equal(sellBonus(30), 15);
  assert.equal(sellBonus(5), 3);
  assert.equal(sellBonus(1000), PREPASS_CAPS.coins);
  assert.equal(sellBonus(0), 0);
  assert.equal(sellBonus(NaN), 0);
});

test('가공 즉시 완성은 그 시설 칸만 어제로 돌려 새 배열로 준다', () => {
  const slots = [{ item: 'charcoal', qty: 1, grade: 1, day: '2026-11-11' }, { item: 'juice', qty: 1, grade: 1, day: '2026-11-11' }];
  const out = rushSlots(slots, (sl) => sl.item === 'charcoal', '2026-11-10');
  assert.notEqual(out, slots);
  assert.equal(out[0].day, '2026-11-10');
  assert.equal(out[1].day, '2026-11-11');
  assert.equal(slots[0].day, '2026-11-11');
});

test('텃밭 즉시 성장 대상은 심어서 자라는 칸뿐', () => {
  const c = { id: 'wheat' };
  const plots = [{ state: 'growing', cropType: c }, { state: 'mature', cropType: c }, { state: 'growing', cropType: null }, { state: 'empty' }];
  assert.deepEqual(rushTargets(plots), [plots[0]]);
});

test('광고로 앞당긴 가공은 받을 때 rushed 로 구분되고 세이브에도 남는다', async () => {
  const { claimAll, sanitizeSlots } = await import('../js/craft/slots.js');
  const slots = rushSlots([{ item: 'charcoal', qty: 3, grade: 1, day: '2026-11-11' }], () => true, '2026-11-10');
  assert.equal(slots[0].rushed, true);
  assert.equal(sanitizeSlots(slots)[0].rushed, true);
  assert.equal(sanitizeSlots([{ item: 'charcoal', qty: 3, grade: 1, day: '2026-11-11' }])[0].rushed, undefined);
  assert.equal(claimAll(slots, '2026-11-11').claimed[0].rushed, true);
});

test('판매 웃돈 광고는 받은 뒤 버튼을 넘겨 상점이 지울 수 있다(한 판매에 한 번)', async () => {
  const { readFileSync } = await import('node:fs');
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const fn = game.slice(game.indexOf('function sellAdButton('), game.indexOf('function dailyAdButton('));
  assert.match(fn, /\(ok, btn\) => onDone\?\.\(ok, btn\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Input\.sellAdButton\(k, gain, \(ok\) => \{ if \(!ok\) return; box\.replaceChildren\(\); renderShop\(\); \}\)/);
});

test('부족 줄 광고 버튼: 세계수 판·카페 손님 카드가 같은 shortAdButton 을 쓴다', async () => {
  const { readFileSync } = await import('node:fs');
  const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const game = read('js/game.js');
  const fn = game.slice(game.indexOf('function shortAdButton('), game.indexOf('function dailyAdButton('));
  assert.match(fn, /const give = prepassGrant\(list, caps\);/);
  assert.match(fn, /rewarded\?\.offer\(slot\)/);
  assert.match(fn, /shortAdParts\(give, LANG\)/);
  assert.match(game, /export function guideShortAd\(slot, list, onDone, caps\) \{ return shortAdButton\(slot, list, onDone, caps\); \}/);
  const wt = read('js/spaces/world-tree.js');
  assert.match(wt, /adButton: \(g\) => \(g\.shortList\?\.length \? guideShortAd\(`branch_\$\{g\.branch\}`, g\.shortList, \(ok\) => \{ if \(ok\) rerender\(\); \}\) : null\)/);
  assert.match(read('js/world/tree-board-ui.js'), /const b = actions\?\.adButton\?\.\(g\);\n  if \(b\) card\.append\(b\);/);
  const gg = read('js/guide/goal-guide.js');
  assert.match(gg, /st\.key === 'cafe_short' \? deps\.adButton\?\.\('cafe_order', st\.shortList\) : null/);
  assert.match(gg, /#goal-arrow \.ga-card \.rw-ad\{pointer-events:auto/);
  assert.match(game, /adButton: \(slot, list\) => shortAdButton\(slot, list, null, CAFE_CAPS\),/);
});
