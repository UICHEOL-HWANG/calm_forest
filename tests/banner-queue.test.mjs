import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BANNER_PRIORITY, BANNER_BURST_MS, BANNER_FEATURE_GAP_MS, BANNER_STATS0,
  enqueueBanner, pickBanner, noteBannerShown,
} from '../js/guide/banner-queue.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const ctx = (over = {}) => ({ visible: true, tutorial: false, now: 100_000, sessionStart: 0, ...BANNER_STATS0, ...over });
const q = (...items) => items.reduce(enqueueBanner, []);

test('priority: tutorial > quest > place > feature > misc', () => {
  const ranks = ['tutorial', 'quest', 'place', 'feature', 'misc'].map(k => BANNER_PRIORITY[k]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
  const queue = q({ kind: 'misc', key: 'a' }, { kind: 'feature', key: 'b' }, { kind: 'quest', key: 'c' }, { kind: 'place', key: 'd' });
  assert.equal(pickBanner(queue, ctx()).item.key, 'c');
});

test('equal priority keeps arrival order and an unknown kind counts as misc', () => {
  const queue = q({ kind: 'place', key: 'x' }, { kind: 'place', key: 'y' }, { key: 'z' });
  const first = pickBanner(queue, ctx());
  assert.equal(first.item.key, 'x');
  assert.deepEqual(first.rest.map(i => i.key), ['y', 'z']);
});

test('same key queued twice shows once; the queue is frozen', () => {
  const a = q({ kind: 'feature', key: 'weekly' });
  const b = enqueueBanner(a, { kind: 'feature', key: 'weekly' });
  assert.equal(b, a);
  assert.throws(() => { a.push(1); });
  assert.equal(enqueueBanner(a, { kind: 'misc' }).length, 2);
  assert.equal(enqueueBanner(enqueueBanner(a, { kind: 'misc' }), { kind: 'misc' }).length, 3);
});

test('nothing shows while the banner area is hidden; it stays queued', () => {
  const queue = q({ kind: 'place', key: 'p' });
  assert.equal(pickBanner(queue, ctx({ visible: false })), null);
  assert.equal(queue.length, 1);
});

test('during the tutorial only tutorial banners show', () => {
  const queue = q({ kind: 'quest', key: 'q' }, { kind: 'tutorial', key: 't' });
  assert.equal(pickBanner(queue, ctx({ tutorial: true })).item.key, 't');
  assert.equal(pickBanner(q({ kind: 'quest' }), ctx({ tutorial: true })), null);
});

test('first minute: at most one feature banner, then 20 s apart', () => {
  const queue = q({ kind: 'feature', key: 'weekly' }, { kind: 'feature', key: 'neighbor' }, { kind: 'feature', key: 'auction' });
  const start = 1_000;
  const p1 = pickBanner(queue, ctx({ now: start + 400, sessionStart: start }));
  assert.equal(p1.item.key, 'weekly');
  const s1 = noteBannerShown(BANNER_STATS0, p1.item, start + 400);
  assert.equal(pickBanner(p1.rest, ctx({ now: start + 30_000, sessionStart: start, ...s1 })), null);
  assert.equal(pickBanner(p1.rest, ctx({ now: start + BANNER_BURST_MS - 1, sessionStart: start, ...s1 })), null);
  const p2 = pickBanner(p1.rest, ctx({ now: start + BANNER_BURST_MS, sessionStart: start, ...s1 }));
  assert.equal(p2.item.key, 'neighbor');
  const s2 = noteBannerShown(s1, p2.item, start + BANNER_BURST_MS);
  assert.equal(pickBanner(p2.rest, ctx({ now: start + BANNER_BURST_MS + BANNER_FEATURE_GAP_MS - 1, sessionStart: start, ...s2 })), null);
  assert.equal(pickBanner(p2.rest, ctx({ now: start + BANNER_BURST_MS + BANNER_FEATURE_GAP_MS, sessionStart: start, ...s2 })).item.key, 'auction');
});

test('a held feature banner does not block place or quest banners', () => {
  const queue = q({ kind: 'feature', key: 'f' }, { kind: 'place', key: 'p' });
  const stats = noteBannerShown(BANNER_STATS0, { kind: 'feature' }, 900);
  assert.equal(pickBanner(queue, ctx({ now: 1_000, sessionStart: 0, ...stats })).item.key, 'p');
});

test('only feature banners move the feature stats and stats are never mutated', () => {
  const s0 = Object.freeze({ ...BANNER_STATS0 });
  assert.equal(noteBannerShown(s0, { kind: 'place' }, 5), s0);
  assert.deepEqual(noteBannerShown(s0, { kind: 'feature' }, 5), { lastFeatureAt: 5, featuresShown: 1 });
});

test('index.html picks banners through the queue and checks they can be seen', () => {
  const html = read('../index.html');
  assert.match(html, /from '\.\/js\/guide\/banner-queue\.js'/);
  const next = html.slice(html.indexOf('function nextHintBanner('), html.indexOf('// 🗺️ 마지막으로 받은 마을 지명'));
  assert.match(next, /pickBanner\(hintBQ, bannerCtx\(\)\)/);
  assert.match(next, /item\.burn\?\.\(\)/);
  assert.match(html, /function bannerVisibleNow\(\)[\s\S]{0,400}getComputedStyle\(\$\('hint-banner'\)\)\.display !== 'none'/);
  assert.match(html, /body\.hb-chain #story-chip \{ display: none !important; \}/);
});

test('callers tag their banners and burn once-flags only when shown', () => {
  const game = read('../js/game.js');
  const fhb = game.slice(game.indexOf('function firstHintBanner('), game.indexOf('let indoor = false;'));
  assert.match(fhb, /kind: 'place', key/);
  assert.match(fhb, /burn: \(\) => \{ gameState\.hintsSeen\[key\] = true;/);
  assert.match(read('../js/weekly/bridge.js'), /kind: 'feature', key: 'weekly-market'/);
  assert.match(read('../js/weekly/index.js'), /env\.showBanner\(\(\) => markBanner\(s\.week\)\)/);
  assert.match(read('../js/spaces/neighbor.js'), /kind: 'feature', key: 'neighbor-daily'/);
  assert.match(read('../js/auction/index.js'), /kind: 'feature', key: 'auction'/);
  assert.match(read('../js/decor-drops/index.js'), /kind: 'feature', key: `decor-\$\{def\.set\}`/);
  assert.match(read('../js/game-ui/guide-panel.js'), /kind: 'tutorial'/);
});
