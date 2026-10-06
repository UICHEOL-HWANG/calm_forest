import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiumRowMode, slotVisible } from '../js/shop/premium-row.js';

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

test('slotVisible — 프리미엄만 있는 칸이 웹 밖에서 전부 hidden 이면 탭을 숨긴다', () => {
  const ctx = (p) => () => ({ ...base, platform: p });
  assert.equal(slotVisible([it, it], ctx('web')), true);
  assert.equal(slotVisible([it, it], ctx('toss')), false);
});
test('slotVisible — 산 게 있으면(owned) 웹 밖에서도 보인다 · 코인 상품이 있으면 늘 보인다', () => {
  assert.equal(slotVisible([it], () => ({ ...base, platform: 'toss', owned: true })), true);
  const coin = { id: 'cap', price: { coins: 1500 } };
  assert.equal(slotVisible([coin], () => ({ ...base, platform: 'toss' })), true);
});

const sale = { ...it, id: 'pumpkin_glow', sale: 'halloween' };
const IN = Date.parse('2026-10-28T03:00:00Z'), BEFORE = Date.parse('2026-10-10T03:00:00Z'), AFTER = Date.parse('2026-11-10T03:00:00Z');

test('🎃 한정 상품 — 기간 안에서만 안 산 사람에게 보인다', () => {
  assert.equal(premiumRowMode(sale, { ...base, now: IN }), 'buy');
  assert.equal(premiumRowMode(sale, { ...base, now: BEFORE }), 'hidden');
  assert.equal(premiumRowMode(sale, { ...base, now: AFTER }), 'hidden');
});

test('🎃 산 사람은 기간과 무관하게 owned — 옷장·가게에서 계속 보인다', () => {
  assert.equal(premiumRowMode(sale, { ...base, owned: true, now: AFTER }), 'owned');
  assert.equal(premiumRowMode(sale, { ...base, owned: true, now: BEFORE, platform: 'toss' }), 'owned');
});

test('🎃 웹 밖은 기간 안이어도 hidden · 게스트는 기간 안에서 login', () => {
  assert.equal(premiumRowMode(sale, { ...base, platform: 'android', now: IN }), 'hidden');
  assert.equal(premiumRowMode(sale, { ...base, isGuest: true, now: IN }), 'login');
});

test('🎃 sale 키가 없는 기존 프리미엄은 기간과 무관(영향 없음)', () => {
  assert.equal(premiumRowMode(it, { ...base, now: AFTER }), 'buy');
});
