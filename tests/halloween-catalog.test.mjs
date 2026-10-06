// tests/halloween-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, itemsOf, findItem } from '../js/cosmetics/catalog.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

const HALLOWEEN = {
  pumpkin_glow:   { slot: 'trail', won: 4000 },
  bat_swirl:      { slot: 'trail', won: 4000 },
  ghost_nightcap: { slot: 'skin',  won: 4900 },
  ghost_cloud:    { slot: 'skin',  won: 4900 },
  witch_classic:  { slot: 'skin',  won: 4900 },
  witch_starry:   { slot: 'skin',  won: 4900 },
  tools_batnight: { slot: 'tools', won: 4500 },
  tools_harvest:  { slot: 'tools', won: 4500 },
  bat_wing:       { slot: 'back',  won: 4500 },
  bat_cape:       { slot: 'back',  won: 4500 },
};

test('🎃 할로윈 10종 — 슬롯·금액·현금 전용·sale 키', () => {
  for (const [id, want] of Object.entries(HALLOWEEN)) {
    const it = findItem(id);
    assert.ok(it, `${id} 가 카탈로그에 없다`);
    assert.equal(it.slot, want.slot, id);
    assert.equal(it.price.won, want.won, id);
    assert.equal(it.price.coins, null, id);
    assert.equal(it.premium, true, id);
    assert.equal(it.sale, 'halloween', id);
    assert.equal(it.tier, '프리미엄', id);
  }
  assert.equal(ITEMS.filter(i => i.sale === 'halloween').length, 10);
});

test('🎃 금액은 모두 ₩4,000대', () => {
  for (const id of Object.keys(HALLOWEEN)) {
    const w = findItem(id).price.won;
    assert.ok(w >= 4000 && w < 5000, `${id}: ${w}`);
  }
});

test('🎃 망토 2종은 등(back) 앵커 · 라이브 priceId 등록됨', () => {
  assert.equal(findItem('bat_wing').anchor, 'back');
  assert.equal(findItem('bat_cape').anchor, 'back');
  for (const id of Object.keys(HALLOWEEN)) {
    assert.ok(id in PRICE_IDS, `${id}: price-ids.js 에 칸이 없다`);
    assert.match(PRICE_IDS[id], /^pri_[a-z0-9]+$/, id);
    const won = HALLOWEEN[id].won;
    const label = `₩${won.toLocaleString('en-US')}`;
    assert.deepEqual(findItem(id).price.cash, { priceId: PRICE_IDS[id], label }, id);
  }
  const mine = Object.keys(HALLOWEEN).map(id => PRICE_IDS[id]);
  assert.equal(new Set(mine).size, 10, '10개 모두 서로 달라야 한다');
  const others = Object.entries(PRICE_IDS).filter(([k, v]) => v && !(k in HALLOWEEN)).map(([, v]) => v);
  for (const v of mine) assert.ok(!others.includes(v), `${v}: 기존 id 와 겹침`);
});

test('🎃 슬롯별 순서 — 자국은 프리미엄 뒤에 이어 붙고, 스킨·도구·등은 기존 프리미엄 뒤', () => {
  assert.deepEqual(itemsOf('trail').slice(0, 4).map(i => i.id), ['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl']);
  assert.deepEqual(itemsOf('skin').map(i => i.id),
    ['forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry']);
  assert.deepEqual(itemsOf('tools').map(i => i.id),
    ['tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest']);
  assert.deepEqual(itemsOf('back').map(i => i.id), ['pack', 'basket', 'cape', 'bat_wing', 'bat_cape']);
});
