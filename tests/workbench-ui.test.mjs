import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starsHtml, meterHtml, strikesHtml, resultTitle } from '../js/workbench/forge-ui.js';

test('stars mark owned and next', () => {
  assert.equal(starsHtml(1, 2), '<span class="fg-stars"><i class="on">★</i><i class="next">★</i><i>★</i></span>');
  assert.equal(starsHtml(3, 0), '<span class="fg-stars"><i class="on">★</i><i class="on">★</i><i class="on">★</i></span>');
});

test('result meter lights the band and strikes show each mark', () => {
  assert.match(meterHtml(8), /<div class="on">8~9점<br>20%<\/div>/);
  assert.equal((meterHtml(8).match(/class="on"/g) || []).length, 1);
  assert.equal(strikesHtml([2, 1, 0, null, null]), '<i class="sk p"></i><i class="sk g"></i><i class="sk m"></i><i class="sk"></i><i class="sk"></i>');
});

test('result title follows the refund band so a missed run is not praised', () => {
  assert.equal(resultTitle(0), '아쉬운 망치질이에요');
  assert.equal(resultTitle(4), '아쉬운 망치질이에요');
  assert.equal(resultTitle(5), '괜찮은 망치질이에요');
  assert.equal(resultTitle(9), '좋은 망치질이에요!');
  assert.equal(resultTitle(10), '완벽한 망치질이에요!');
});
