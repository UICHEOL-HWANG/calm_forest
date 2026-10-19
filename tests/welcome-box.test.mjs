import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUNDLES, bundleById, bundleGrant, choicesLeft, bundleCardMode, BUNDLE_COPY } from '../js/shop/bundles.js';
import { ledgerRows, priceIndex } from '../functions/api/_paddle.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { EN } from '../js/i18n-en.js';

const box = bundleById('welcome_box');

test('숲 환영 상자: 도구 세트 중 하나 + 반딧불, ₩4,900, 코인 없음', () => {
  assert.equal(BUNDLES.length, 1);
  assert.equal(box.won, 4900);
  assert.deepEqual(box.fixed, ['firefly']);
  assert.ok(box.choose.length >= 3);
  for (const id of [...box.fixed, ...box.choose]) assert.equal(findItem(id)?.tier, '프리미엄', id);
  assert.equal(box.coins, undefined);
  assert.ok('welcome_box' in PRICE_IDS);
});

test('정가 합계는 실제 판매가에서 계산한다', () => {
  assert.equal(box.listWon, findItem('firefly').price.won + findItem(box.choose[0]).price.won);
});

test('고른 세트가 허용 목록 밖이면 첫 세트로 준다', () => {
  assert.deepEqual(bundleGrant(box, box.choose[1]), ['firefly', box.choose[1]]);
  assert.deepEqual(bundleGrant(box, 'tools_batnight'), ['firefly', box.choose[0]]);
  assert.deepEqual(bundleGrant(box, undefined), ['firefly', box.choose[0]]);
});

test('고르는 화면에는 아직 없는 세트만', () => {
  assert.deepEqual(choicesLeft(box, [box.choose[1]]), box.choose.filter(id => id !== box.choose[1]));
  assert.deepEqual(choicesLeft(box, []), box.choose);
});

const ctx = (over = {}) => ({ owned: [], platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true, priceId: 'pri_box', ...over });

test('카드 노출: 웹·로그인·상점 열림·가격 있음일 때 buy', () => {
  assert.equal(bundleCardMode(box, ctx()), 'buy');
  assert.equal(bundleCardMode(box, ctx({ isGuest: true })), 'login');
  assert.equal(bundleCardMode(box, ctx({ online: false })), 'unavailable');
});

test('카드 숨김: 웹 밖, 가격 없음, 상점 닫힘, 반딧불 보유, 세트 전부 보유', () => {
  for (const platform of ['toss', 'android', 'ios', 'itch']) assert.equal(bundleCardMode(box, ctx({ platform })), 'hidden', platform);
  assert.equal(bundleCardMode(box, ctx({ priceId: null })), 'hidden');
  assert.equal(bundleCardMode(box, ctx({ tokenSet: false })), 'hidden');
  assert.equal(bundleCardMode(box, ctx({ storeOpen: false })), 'hidden');
  assert.equal(bundleCardMode(box, ctx({ owned: ['firefly'] })), 'hidden');
  assert.equal(bundleCardMode(box, ctx({ owned: [...box.choose] })), 'hidden');
  assert.equal(bundleCardMode(box, ctx({ owned: box.choose.slice(1) })), 'buy');
});

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const idx = new Map([['pri_box', { itemId: 'welcome_box', kind: 'bundle' }], ['pri_hat', { itemId: 'straw_hat', kind: 'cosmetic' }]]);
const evt = (custom = {}) => ({
  event_type: 'transaction.completed', occurred_at: '2026-10-19T01:02:03.000Z',
  data: { id: 'txn_b', currency_code: 'KRW', custom_data: { user_id: UID, ...custom },
          details: { totals: { total: '4900' } }, items: [{ price: { id: 'pri_box' }, quantity: 1 }] },
});

test('웹훅: 상자 결제 1건 → 표식 줄 + 품목 줄 2개, 매출은 표식 줄에만', () => {
  const pick = box.choose[2];
  const { rows, skipped } = ledgerRows(evt({ choice: pick }), idx);
  assert.deepEqual(skipped, []);
  assert.deepEqual(rows.map(r => [r.event_id, r.item_id, r.kind, r.amount]), [
    ['txn_b:pri_box', 'welcome_box', 'bundle', 4900],
    ['txn_b:pri_box:firefly', 'firefly', 'cosmetic', null],
    [`txn_b:pri_box:${pick}`, pick, 'cosmetic', null],
  ]);
  for (const r of rows) {
    assert.equal(r.transaction_id, 'txn_b');
    assert.equal(r.user_id, UID);
    assert.equal(r.price_id, 'pri_box');
  }
});

test('웹훅: choice 가 엉뚱하면 첫 세트로 지급(결제는 이미 끝났다)', () => {
  const { rows } = ledgerRows(evt({ choice: 'forest_spirit' }), idx);
  assert.deepEqual(rows.map(r => r.item_id), ['welcome_box', 'firefly', box.choose[0]]);
});

test('웹훅: 단품 결제는 그대로', () => {
  const e = evt(); e.data.items = [{ price: { id: 'pri_hat' } }]; e.data.details.totals.total = '2500';
  const { rows } = ledgerRows(e, idx);
  assert.deepEqual(rows.map(r => [r.event_id, r.item_id, r.amount]), [['txn_b:pri_hat', 'straw_hat', 2500]]);
});

test('priceIndex: 상자 가격이 있으면 kind bundle 로 들어간다', () => {
  for (const [, v] of priceIndex()) assert.ok(['cosmetic', 'pet', 'sled', 'bundle'].includes(v.kind));
  const pid = PRICE_IDS.welcome_box;
  if (pid) assert.deepEqual(priceIndex().get(pid), { itemId: 'welcome_box', kind: 'bundle' });
});

test('원장 kind 에 bundle 을 허용하는 마이그레이션', () => {
  const sql = readFileSync(new URL('../sql/migrations/migrate_purchases_bundle_kind.sql', import.meta.url), 'utf8');
  assert.match(sql, /check \(kind in \('cosmetic', 'pet', 'decor', 'sled', 'bundle'\)\)/);
});

test('카드 문구는 영어 사전에 있고 엠대시가 없다', () => {
  for (const ko of Object.values(BUNDLE_COPY)) {
    assert.ok(EN[ko], ko);
    assert.ok(!ko.includes('—'), ko);
  }
});

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('결제창: 고른 세트를 customData.choice 로 싣고, 완료 처리에서도 알 수 있게 들고 있다', () => {
  const p = src('js/shop/paddle.js');
  assert.match(p, /export async function openCheckout\(\{ priceId, itemId, kind, userId, email, choice \}\)/);
  assert.match(p, /current = \{ priceId, itemId, kind, choice, funnel:/);
  assert.match(p, /customData: \{ user_id: userId, item_id: itemId, kind, \.\.\.\(choice \? \{ choice \} : \{\}\), attr: safeAttr\(\) \}/);
});

test('꾸미기 가게: 맨 위에 상자 카드, 결제 완료는 고른 세트 지급을 기다린다', () => {
  const c = src('js/spaces/cafe.js');
  assert.match(c, /import \{ drawBundleCard \} from '\.\.\/shop\/bundle-card\.js';/);
  assert.match(c, /drawBundleCard\(box, /);
  assert.match(c, /c\.kind === 'bundle'/);
  assert.match(c, /bundleGrant\(/);
});

test('상자 카드 모듈: 문구 A안', () => {
  assert.equal(BUNDLE_COPY.pick, '어떤 도구 세트를 고를까요?');
  assert.equal(BUNDLE_COPY.pickBuy, '이 세트로 열기 · {0}');
  assert.equal(BUNDLE_COPY.pickNote, '🌟 반딧불 발자국은 함께 들어 있어요');
  const m = src('js/shop/bundle-card.js');
  assert.match(m, /export function drawBundleCard\(/);
});
