import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVEAL_COPY, revealModeOf, revealCardOf } from '../js/shop/reveal-pose.js';
import { ITEMS, findItem } from '../js/cosmetics/catalog.js';

test('🎃 프리미엄 상품은 모두 구매 연출 문구가 있다(이름·설명 비어 있지 않음)', () => {
  for (const it of ITEMS.filter(i => i.premium)) {
    const c = REVEAL_COPY[it.id];
    assert.ok(c && c.name && c.desc, `${it.id}: REVEAL_COPY 없음`);
  }
});

test('🎃 연출 모드 — 자국은 spot, 스킨·도구·망토는 boxburst', () => {
  assert.equal(revealModeOf(findItem('pumpkin_glow')), 'spot');
  assert.equal(revealModeOf(findItem('bat_swirl')), 'spot');
  for (const id of ['ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry', 'tools_batnight', 'tools_harvest', 'bat_wing', 'bat_cape']) {
    assert.equal(revealModeOf(findItem(id)), 'boxburst', id);
  }
});

test('🎃 망토 카드 — 걷는 자국이라고 쓰지 않는다', () => {
  assert.deepEqual(revealCardOf(findItem('bat_wing')), { tag: 'PREMIUM · 등 꾸미기', cta: '바로 입어보기' });
  assert.equal(revealCardOf({ slot: 'back', id: 'cape' }).tag, 'PREMIUM · 등 꾸미기');
});

test('🎃 기존 연출은 그대로 — 스킨 카드·도구 카드·자국 카드', () => {
  assert.equal(revealCardOf(findItem('forest_spirit')).tag, 'PREMIUM · 전신 스킨');
  assert.equal(revealCardOf(findItem('tools_moon')).tag, 'PREMIUM · 도구 세트');
  assert.equal(revealCardOf(findItem('firefly')).tag, 'PREMIUM · 걷는 자국');
});
