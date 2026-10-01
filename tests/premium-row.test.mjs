import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiumRowMode } from '../js/shop/premium-row.js';

const it = { id: 'firefly', premium: true, price: { coins: null, won: 4000, cash: { priceId: 'pri_x', label: '₩4,000' } } };
const base = { owned: false, platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true };

test('보유 — 어느 플랫폼이든 owned', () => {
  assert.equal(premiumRowMode(it, { ...base, owned: true }), 'owned');
  assert.equal(premiumRowMode(it, { ...base, owned: true, platform: 'toss' }), 'owned');
});

test('웹 + 로그인 + 토큰 + priceId + 상점 열림 → buy', () => {
  assert.equal(premiumRowMode(it, base), 'buy');
});

test('웹 게스트 → login', () => {
  assert.equal(premiumRowMode(it, { ...base, isGuest: true }), 'login');
});

test('오프라인 · 토큰 없음 · priceId 없음 · 상점 닫힘 → unavailable', () => {
  assert.equal(premiumRowMode(it, { ...base, online: false }), 'unavailable');
  assert.equal(premiumRowMode(it, { ...base, tokenSet: false }), 'unavailable');
  assert.equal(premiumRowMode({ ...it, price: { ...it.price, cash: null } }, base), 'unavailable');
  assert.equal(premiumRowMode(it, { ...base, storeOpen: false }), 'unavailable');
});

test('상점 닫힘·토큰 없음이면 게스트도 login 이 아니라 unavailable', () => {
  assert.equal(premiumRowMode(it, { ...base, isGuest: true, storeOpen: false }), 'unavailable');
  assert.equal(premiumRowMode(it, { ...base, isGuest: true, tokenSet: false }), 'unavailable');
});

test('토스 · 안드로이드 · itch → hidden(외부 결제 안내 금지)', () => {
  for (const platform of ['toss', 'android', 'itch']) assert.equal(premiumRowMode(it, { ...base, platform }), 'hidden', platform);
});
