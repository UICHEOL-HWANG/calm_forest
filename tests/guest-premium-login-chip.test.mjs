import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const cafe = read('../js/spaces/cafe.js');
const paddle = read('../js/shop/paddle.js');
const card = read('../js/shop/bundle-card.js');
const bundles = read('../js/shop/bundles.js');
const html = read('../index.html');
const en = read('../js/i18n-en.js');

test('상점 열림 판정은 로그인 여부와 분리된다', () => {
  assert.match(paddle, /export function storeOpen\(\) \{\s*return !!CONFIG\.PADDLE\.storeOpen \|\| IS_DEV_SESSION;\s*\}/);
  assert.match(paddle, /&& storeOpen\(\);/);
});

test('가게 행·환영 상자는 게스트에게도 상점 열림을 넘긴다', () => {
  assert.doesNotMatch(cafe, /storeOpen: cashAvailable\(authState\)/);
  assert.equal((cafe.match(/storeOpen: storeOpen\(\)/g) || []).length >= 2, true);
});

test('게스트 칩 문구와 동작', () => {
  assert.match(cafe, /const PREMIUM_LOGIN_MSG = '🔐 로그인 후 구매 가능';/);
  assert.match(cafe, /mode === 'login'\) buys\.appendChild\(loginChip\(it\.id, 'cosmetic'\)\)/);
  assert.match(cafe, /function loginChipClick\(itemId, kind\)[\s\S]{0,300}ui\.loginNudge\?\.\('shop'\)/);
  assert.match(cafe, /trackEvent\('premium_login_click', \{ item_id: itemId, kind \}\)/);
});

test('펫 탭 — 게스트에게 프리미엄 펫을 숨기지 않고 칩을 단다', () => {
  assert.match(cafe, /petMode === 'login'\) buys\.appendChild\(loginChip\(k\.id, 'pet'\)\)/);
});

test('환영 상자 — 게스트 버튼은 눌리고 로그인으로 보낸다', () => {
  assert.match(bundles, /login: '🔐 로그인 후 구매 가능'/);
  assert.match(card, /btn\.disabled = \(mode !== 'buy' && mode !== 'login'\) \|\| pending;/);
  assert.match(card, /mode === 'login' \? onLogin\?\.\(\) : onOpen\(\)/);
  assert.match(cafe, /onLogin: \(\) => loginChipClick\(WELCOME\.id, 'bundle'\)/);
});

test('로그인 넛지 — 상점에서 열면 상점 제목', () => {
  assert.match(html, /trigger === 'shop' \? '💎 로그인 후 구매 가능'/);
});

test('칩 스타일 — 금빛 외곽선 알약', () => {
  assert.match(html, /\.sh-row \.sh-login \{[^}]*border-radius: 999px[^}]*\}/);
});

test('영어 사전', () => {
  for (const k of ['🔐 로그인 후 구매 가능', '💎 로그인 후 구매 가능']) assert.ok(en.includes(`'${k}'`), k);
});
