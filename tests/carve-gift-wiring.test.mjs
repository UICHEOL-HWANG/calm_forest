import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const paramsOf = (src, name) => {
  const at = src.indexOf(name);
  assert.ok(at >= 0, name);
  const open = src.indexOf('{', at);
  let depth = 0, end = open;
  for (; end < src.length; end++) {
    if (src[end] === '{') depth++;
    else if (src[end] === '}' && --depth === 0) break;
  }
  return [...src.slice(open, end).replace(/\/\/.*$/gm, '').matchAll(/(?:^|[,{]\s*)([a-z_]+)(?=\s*[:,}]|\s*$)/gm)].map(m => m[1]);
};

test('old saves restore gifts through restoreGifts', () => {
  assert.match(read('js/game.js'), /if \(saved\.gifts\) gameState\.gifts = restoreGifts\(saved\.gifts\);/);
});

test('carve_result carries combo_max and gem within the GA4 code key cap', () => {
  const keys = paramsOf(read('js/spaces/carving.js'), "'carve_result', {");
  assert.ok(keys.includes('combo_max'));
  assert.ok(keys.includes('gem'));
  assert.ok(keys.length <= 23, keys.join(','));
});

test('new events send at most five params', () => {
  const src = read('js/spaces/carving.js');
  assert.deepEqual(paramsOf(src, "trackEvent('carve_keep'"), ['design', 'tier']);
  assert.deepEqual(paramsOf(src, "trackEvent('gift_wrap'"), ['paper', 'item']);
});

test('carved gifts flow through the shared gift map and give love by tier and wrap', () => {
  const od = read('js/spaces/outdoor-decor.js');
  assert.match(od, /const love = giftLove\(giftId, GIFTS\);/);
  assert.match(od, /addAffinity\(id, love\)/);
  assert.doesNotMatch(od, /'목재';/);
});

test('carve HUD has combo gauge ticks at 5, 10, 15 and the keep and wrap buttons', () => {
  const html = read('index.html');
  for (const at of [5, 10, 15]) assert.match(html, new RegExp(`class="cvg-tick" data-at="${at}"`));
  for (const id of ['cvr-sell', 'cvr-keep', 'cvr-plain', 'cvr-wrapgo', 'cv-combo', 'cv-gem']) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /<button id="cvr-plain">그냥 간직<\/button><button id="cvr-wrapgo" class="cvr-go">🎀 포장하기<\/button>/);
});

test('carving pays at finish, keeping takes the coins back and saves, combo only counts on a finished piece', () => {
  const src = readFileSync(new URL('../js/spaces/carving.js', import.meta.url), 'utf8');
  assert.match(src, /carvePayout\(d\.pay, tier\.mult, kind === 'done' \? best : 0\)/);
  assert.match(src, /  payCarve\(d, coins\);\n  if \(canKeep\) carvePending = \{ d, tier, coins \};/);
  const keep = src.slice(src.indexOf('export function carveResolve('), src.indexOf('export function carveWrap('));
  assert.match(keep, /gameState\.inventory\.coins = Math\.max\(0, \(gameState\.inventory\.coins \|\| 0\) - p\.coins\)/);
  assert.match(keep, /requestSave\(\)/);
  assert.match(src.slice(src.indexOf('export function carveWrap(')), /requestSave\(\)/);
});
