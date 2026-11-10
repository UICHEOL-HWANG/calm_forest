import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const game = read('js/game.js');
const doors = read('js/spaces/doors.js');
const ks = read('js/spaces/kitchen-stage.js');
const index = existsSync(new URL('../js/auction/index.js', import.meta.url)) ? read('js/auction/index.js') : '';

test('game.js only wires the auction module', () => {
  const lines = game.split('\n').filter(l => /auction|Auction/.test(l));
  assert.ok(lines.length <= 12, lines.join('\n'));
  assert.doesNotMatch(game, /function \w*[Aa]uction\w*\s*\(/);
  for (const k of ['initAuction()', 'updateAuction(', 'auctionSpotNow()', 'openAuction()', 'auctionScatterBlocks(', 'auctionOutdoorMesh(', 'restoreAuction(saved.auction)', 'auction: auctionDefault()']) assert.ok(game.includes(k), k);
  assert.match(game, /get playerArms\(\)/);
});

test('doors shows the auction prompt and the minigame loop dispatches the auction', () => {
  assert.match(doors, /auctionSpotNow\(\)/);
  assert.match(doors, /auctionPrompt\(\)/);
  assert.match(ks, /mgView\.type === 'auction'/);
});

test('auction modules stay out of game.js internals', () => {
  for (const f of ['rules', 'engine', 'settle', 'scene', 'items', 'stage', 'actors', 'ui', 'layout']) {
    assert.doesNotMatch(readFileSync(`js/auction/${f}.js`, 'utf8'), /from '\.\.\/game\.js'/, f);
  }
});

test('the auction frame runs where the player idle pose cannot overwrite the paddle arm', () => {
  const loop = game.slice(game.indexOf('function animate()'));
  const mgBranch = loop.match(/else if \(!mgView && !duelActive\) \{ updatePlayer\(dt, t\);[^\n]*\n\s*else \{ updateMgScene\(dt, t\);/);
  assert.ok(mgBranch, 'updateMgScene must stay the else of the updatePlayer branch');
});

test('yard decor lookup falls back to the auction items', () => {
  const at = game.indexOf('function outdoorMesh(id) {');
  assert.match(game.slice(at, at + 400), /auctionOutdoorMesh\(id\)/);
  assert.match(index, /export function auctionOutdoorMesh\(id\) \{\s*return auctionItemMesh\(THREE, id\);/);
});

test('index wires the run with real rng, night and the item icon', () => {
  assert.match(index, /rng: Math\.random/);
  assert.match(index, /getNight: \(\) => nightLevel/);
  assert.match(index, /itemIcon:/);
  assert.doesNotMatch(index, /itemThumb/);
  assert.match(index, /trackEvent\('auction_open', \{ item_id: [^,]+, coins[^}]*\}\)/);
});

test('every exit tears the run down and restores the player', () => {
  const at = index.indexOf('function teardown(');
  assert.ok(at >= 0, 'teardown missing');
  const teardown = index.slice(at, index.indexOf('\n}\n', at));
  for (const k of ['panel.close()', 'detachPlayer()', 'dispose()', 'setNpcHidden(', 'heldGroup.visible = heldWas', 'refreshHeldTool()', 'snapCamera()', '$w.mgView = null']) {
    assert.ok(teardown.includes(k), k);
  }
  assert.match(index, /heldGroup\.visible = false/);
  assert.match(index, /onClose: \(\) => teardown\(\)/);
  assert.match(index, /catch \(e\) \{\s*teardown\(\);/);
});

test('copy follows the approved prompts', () => {
  for (const s of ["'🔨 경매 참가'", "'🔨 경매는 저녁에 열려요'", "'🔨 오늘 경매 끝'"]) assert.ok(index.includes(s), s);
  assert.doesNotMatch(index, /—|놀[아다]/);
});

test('the auction stays shut until the auctioneer has moved in', () => {
  assert.match(index, /isOpen,/);
  assert.match(index, /const auctionOpen = \(\) => isOpen\('merchant'\);/);
  const spot = index.slice(index.indexOf('export function auctionSpotNow('));
  assert.match(spot.slice(0, spot.indexOf('\n}\n')), /auctionOpen\(\)/);
  const mode = index.slice(index.indexOf('function modeNow('));
  assert.match(mode.slice(0, mode.indexOf('\n}\n')), /if \(!auctionOpen\(\)\) return \{[^}]*mode: 'hidden' \}/);
  const open = index.slice(index.indexOf('export function openAuction('));
  assert.match(open.slice(0, open.indexOf('\n}\n')), /if \(mode === 'hidden'\) return;/);
  assert.match(index, /PROMPTS\[modeNow\(todayStr\(\)\)\.mode\] \|\| ''/);
  assert.match(doors, /inVillage && auctionSpotNow\(\)\) prompt = auctionPrompt\(\)/);
});

test('only unlocked villagers bid, appear and get hidden', () => {
  assert.match(index, /const openBidders = \(\) => AUCTION_BIDDERS\.filter\(b => isOpen\(b\.id\)\);/);
  const run = index.slice(index.indexOf('function startRun('));
  const body = run.slice(0, run.indexOf('\n}\n'));
  assert.match(body, /const bidders = openBidders\(\);/);
  assert.match(body, /new Set\(\['merchant', \.\.\.bidders\.map\(b => b\.id\)\]\)/);
  assert.match(body, /createActors\(THREE, \{[^}]*bidders \}\)/);
  assert.match(body, /\n\s+bidders,\n/);
  assert.doesNotMatch(index, /IS_MOBILE/);
});

test('reopening a finished auction does not count as an open', () => {
  const open = index.slice(index.indexOf('export function openAuction('));
  assert.match(open.slice(0, open.indexOf('\n}\n')), /if \(mode === 'bid' \|\| mode === 'watch'\) trackEvent\('auction_open'/);
});

test('placed auction decor is solid in the yard', () => {
  const line = game.split('\n').find(l => l.includes("'harvestscarecrow'].includes(id) ? solidCircle") || l.includes("'starvane'].includes(id) ? solidCircle"));
  assert.ok(line, 'solid list line missing');
  for (const id of ['moonswing', 'lanternarch', 'starvane']) assert.ok(line.includes(`'${id}'`), id);
});

test('the village map lists the auction stage once the merchant is unlocked', () => {
  assert.match(game, /\{ ico: '🔨', name: '경매 무대', \.\.\.auctionMapSpot\(\), pri: 1 \}/);
  assert.match(game, /'경매 무대': 'merchant'/);
  assert.match(index, /export function auctionMapSpot\(\) \{ return \{ x: X, z: Z \+ 1 \}; \}/);
  assert.match(read('js/i18n-en.js'), /'경매 무대': 'Auction Stage'/);
});
