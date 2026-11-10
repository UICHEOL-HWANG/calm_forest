import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onScreen, edgePoint, distLabel, nearBlockers, GUIDE_TUNING } from '../js/auction/guide.js';
import { introStepView } from '../js/auction/intro.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('onScreen keeps a margin and rejects a missing projection', () => {
  assert.equal(onScreen({ x: 100, y: 100 }, 1024, 768), true);
  assert.equal(onScreen({ x: 10, y: 100 }, 1024, 768, 24), false);
  assert.equal(onScreen({ x: 100, y: 760 }, 1024, 768, 24), false);
  assert.equal(onScreen(null, 1024, 768), false);
});

test('edgePoint lands on the inset rectangle in the target direction', () => {
  const rect = { x1: 40, y1: 100, x2: 984, y2: 640 };
  const right = edgePoint(512, 384, 1000, 0, rect);
  assert.deepEqual([Math.round(right.x), Math.round(right.y)], [984, 384]);
  assert.ok(Math.abs(right.angle - Math.PI / 2) < 1e-9);
  const up = edgePoint(512, 384, 0, -5, rect);
  assert.deepEqual([Math.round(up.x), Math.round(up.y)], [512, 100]);
  assert.ok(Math.abs(up.angle) < 1e-9);
  const corner = edgePoint(512, 384, -1000, 1000, rect);
  assert.ok(corner.x >= rect.x1 - 1e-6 && corner.y <= rect.y2 + 1e-6);
  assert.ok(Math.abs(corner.x - rect.x1) < 1e-6 || Math.abs(corner.y - rect.y2) < 1e-6);
});

test('distance label is whole meters and never zero', () => {
  assert.equal(distLabel(12.4), '12m');
  assert.equal(distLabel(0.2), '1m');
});

test('nearBlockers keeps only what is around the leg', () => {
  const all = [{ x: 0, z: 0, r: 2 }, { x: 100, z: 100, r: 2 }, { x1: 5, z1: 5, x2: 6, z2: 6 }, { x1: -90, z1: -90, x2: -80, z2: -80 }];
  const near = nearBlockers(all, { x: -5, z: 0 }, { x: 5, z: 0 }, 10);
  assert.deepEqual(near, [all[0], all[2]]);
});

test('the guide sits under the stage reach', () => {
  assert.ok(GUIDE_TUNING.reach < 2.4);
  assert.ok(GUIDE_TUNING.edge.top > 90);
});

test('intro steps carry dots and the last flag', () => {
  assert.deepEqual(introStepView(0).dots, [true, false, false]);
  assert.equal(introStepView(0).last, false);
  assert.equal(introStepView(2).last, true);
  assert.equal(introStepView(2).btn, '알겠어요');
});

test('intro sheet is a -modal so the world swallows input under it, and keys advance it', () => {
  const src = read('js/auction/intro.js');
  assert.match(src, /root\.id = 'auction-intro-modal'/);
  assert.match(src, /class="e1-sheet"/);
  assert.match(src, /e\.code !== 'Space' && e\.code !== 'Enter'/);
  assert.match(src, /window\.removeEventListener\('keydown', onKey\)/);
  assert.doesNotMatch(src, /from '\.\.\/game\.js'/);
});

test('guide draws CSS arrows only', () => {
  const src = read('js/auction/guide.js');
  assert.doesNotMatch(src, /[⬇⬆⬅➡↓↑←→▼▲]/u);
  assert.match(src, /clip-path:polygon/);
  assert.doesNotMatch(src, /from '\.\.\/game\.js'/);
});

test('index gates the banner and shows the intro before the first window', () => {
  const index = read('js/auction/index.js');
  const tick = index.slice(index.indexOf('function tickBanner('));
  const body = tick.slice(0, tick.indexOf('\n}\n'));
  for (const k of ['auctionOpen()', 'inVillage', '!mgView', 'cameraFree()', '!uiBusy()', 'BANNER_FAR', 'auctionOpenAt(gameState.timeOfDay)']) assert.ok(body.includes(k) || index.includes(k), k);
  const open = index.slice(index.indexOf('export function openAuction('));
  assert.match(open.slice(0, open.indexOf('\n}\n')), /if \(introNeeded\(gameState\.auction, mode\)\) \{ ensureIntro\(\)\.show\(\); return; \}/);
  assert.match(index, /introSeen: true/);
  const busy = index.slice(index.indexOf('function uiBusy('));
  for (const k of ['anyModalOpen', 'coachActive', "'spot-on'"]) assert.ok(busy.slice(0, busy.indexOf('\n}\n')).includes(k), k);
  assert.match(index, /onTap: \(\) => \{ trackEvent\('auction_banner', \{ act: 'tap'/);
});
