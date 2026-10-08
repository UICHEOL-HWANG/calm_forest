import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashLabel, cashFor, PET_CASH_LABEL, wonLabel } from '../js/shop/cash.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PET_KINDS } from '../js/pet/rules.js';

test('등급표 — 코인 가격으로 현금 라벨이 정해진다(스펙 §2-2)', () => {
  assert.equal(cashLabel(600), '₩1,500');
  assert.equal(cashLabel(900), '₩1,500');
  assert.equal(cashLabel(1200), '₩2,500');
  assert.equal(cashLabel(1800), '₩2,500');
  assert.equal(cashLabel(2200), '₩3,900');
  assert.equal(cashLabel(2600), '₩3,900');
  assert.equal(PET_CASH_LABEL, '₩4,900');
});

test('priceId 가 없으면 cash 는 null — 현금 버튼이 안 그려진다', () => {
  assert.equal(cashFor('nope', 1000), null);
});

test('wonLabel — 원화 천 단위', () => {
  assert.equal(wonLabel(4000), '₩4,000');
  assert.equal(wonLabel(3000), '₩3,000');
  assert.equal(wonLabel(12500), '₩12,500');
});

test('cashFor — priceId 없으면 won 이 있어도 null', () => {
  assert.equal(cashFor('nope', null, 4000), null);
});

test('PRICE_IDS 는 꾸미기 35(코인 18 + 프리미엄 4 + 도구 세트 3 + 🎃 할로윈 10) + 펫 4 = 39칸, 값은 null 이거나 pri_ 로 시작', () => {
  const keys = Object.keys(PRICE_IDS);
  assert.equal(keys.length, 39);
  for (const it of ITEMS.filter(i => !i.reward)) assert.ok(keys.includes(it.id), it.id);   // 🤝 초대 보상은 비매품 — 가격 칸이 없다
  for (const it of ITEMS.filter(i => i.reward)) assert.ok(!keys.includes(it.id), `${it.id} 는 팔지 않는다`);
  for (const k of PET_KINDS) assert.ok(keys.includes(k.id), k.id);
  for (const [k, v] of Object.entries(PRICE_IDS)) assert.ok(v === null || /^pri_[a-z0-9]+$/.test(v), `${k}: ${v}`);
  const ids = Object.values(PRICE_IDS).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'priceId 는 항목마다 하나 — 공유하면 역조회가 안 된다');
});

test('카탈로그 cash 칸 — priceId 가 있는 항목만 {priceId,label}, 라벨은 등급표와 일치', () => {
  for (const it of ITEMS) {
    const pid = PRICE_IDS[it.id];
    if (!pid) { assert.equal(it.price.cash, null, it.id); continue; }
    assert.deepEqual(it.price.cash, { priceId: pid, label: it.premium ? wonLabel(it.price.won) : cashLabel(it.price.coins) }, it.id);
  }
  for (const k of PET_KINDS) {
    const pid = PRICE_IDS[k.id];
    if (!pid) { assert.equal(k.cash, null, k.id); continue; }
    assert.deepEqual(k.cash, { priceId: pid, label: PET_CASH_LABEL }, k.id);
  }
});
