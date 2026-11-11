import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auctionLayout, auctionCamera } from '../js/auction/layout.js';

test('one device class drives the panel', () => {
  assert.equal(auctionLayout(1024, 768), 'side');
  assert.equal(auctionLayout(1440, 900), 'side');
  assert.equal(auctionLayout(768, 1024), 'side');
  assert.equal(auctionLayout(375, 812), 'sheet');
  assert.equal(auctionLayout(390, 844), 'sheet');
  assert.equal(auctionLayout(844, 390), 'side-short');
  assert.equal(auctionLayout(667, 375), 'side-short');
  assert.equal(auctionLayout(932, 430), 'side-short');
});

test('the camera follows the same device class', () => {
  for (const [w, h] of [[1024, 768], [375, 812], [844, 390], [768, 1024], [667, 375]]) {
    const c = auctionCamera(w, h);
    assert.equal(c.layout, auctionLayout(w, h));
    assert.deepEqual(c.shift, c.layout === 'sheet' ? [0, 150] : [150, 0]);
  }
  assert.deepEqual(auctionCamera(1024, 768).pos, [0.2, 7.6, 12]);
  assert.deepEqual(auctionCamera(844, 390).pos, [0.2, 7.6, 12]);
  assert.deepEqual(auctionCamera(375, 812).pos, [0.1, 13.7, 19.8]);
  assert.deepEqual(auctionCamera(768, 1024).pos, [0.1, 13.7, 19.8]);
});
