import { test } from 'node:test';
import assert from 'node:assert/strict';
import { welcomeOffer, isDevSession, topPriceLine, fertBlockedByWatering } from '../js/first-loop.js';

test('welcomeOffer: 목재 5개면 30코인 제안', () => {
  assert.deepEqual(welcomeOffer({ wood: 5, fish: 0 }), { item: 'wood', qty: 5, gain: 30 });
});
test('welcomeOffer: 물고기 1마리면 25코인 제안', () => {
  assert.deepEqual(welcomeOffer({ wood: 2, fish: 1 }), { item: 'fish', qty: 1, gain: 25 });
});
test('welcomeOffer: 둘 다 있으면 목재 우선', () => {
  assert.equal(welcomeOffer({ wood: 9, fish: 3 }).item, 'wood');
});
test('welcomeOffer: 조건 미달이면 null', () => {
  assert.equal(welcomeOffer({ wood: 4, fish: 0 }), null);
  assert.equal(welcomeOffer({}), null);
});

test('isDevSession: dev 파라미터가 있으면 true', () => {
  assert.equal(isDevSession('?house=6'), true);
  assert.equal(isDevSession('?platform=toss&coop=1'), true);
  assert.equal(isDevSession('?weather=rain'), true);
  assert.equal(isDevSession('?farm=1&farmstage=3'), true);   // 🌾 밭 증축 미리보기
  assert.equal(isDevSession('?farmmax=1'), true);            // 🌾 드로우콜 최악 상태 재현
  assert.equal(isDevSession('?spawn=3,4'), true);
  assert.equal(isDevSession('?sea=1'), true);
  assert.equal(isDevSession('?give=wood'), true);
  assert.equal(isDevSession('?plazaSeason=dev-plaza'), true); // 🌾 광장 dev 시즌 — 맨 localhost 는 운영 기록
  assert.equal(isDevSession('?forceVariant=beta_A&forceMapOrder=sea_first&betaDay=3'), true);
});
test('isDevSession: 일반 진입은 false', () => {
  assert.equal(isDevSession(''), false);
  assert.equal(isDevSession('?platform=toss'), false);
  assert.equal(isDevSession('?lang=en'), false);
});

test('topPriceLine: 가장 비싼 품목과 문구', () => {
  const r = topPriceLine({ crop: 97, fish: 117, wood: 110 }, { crop: '🥕', fish: '🐟', wood: '🪵' });
  assert.deepEqual(r, { key: 'fish', pct: 17, text: '🐟 오늘 비싸요 +17%' });
});
test('topPriceLine: 전부 기본가 이하면 +0%', () => {
  const r = topPriceLine({ crop: 90, fish: 100 }, { crop: '🥕', fish: '🐟' });
  assert.equal(r.text, '🐟 오늘 비싸요 +0%');
});

test('fertBlockedByWatering: 물조리개 + 마른 흙이면 물주기 우선', () => {
  assert.equal(fertBlockedByWatering('water', 'farm', false), true);
});
test('fertBlockedByWatering: 흙이 젖었거나 다른 도구·맨손이면 비료 가능', () => {
  assert.equal(fertBlockedByWatering('water', 'farm', true), false);
  assert.equal(fertBlockedByWatering('hoe', 'farm', false), false);
  assert.equal(fertBlockedByWatering('water', 'none', false), false);
});

// 🔓 마을 해금(새 세이브) — 첫 수확으로도 상인이 돌아온다 (E1 처치는 당근 4개부터 거둔다)
test('welcomeOffer: reworld 면 작물 4개로도 제안(25코인)', () => {
  assert.deepEqual(welcomeOffer({ crop: 4 }, { reworld: true }), { item: 'crop', qty: 4, gain: 25 });
  assert.equal(welcomeOffer({ crop: 3 }, { reworld: true }), null);
});
test('welcomeOffer: reworld 아니면 작물은 무시(해금 꺼짐·옛 세이브 = 예전 그대로)', () => {
  assert.equal(welcomeOffer({ crop: 9 }), null);
  assert.equal(welcomeOffer({ crop: 9 }, { reworld: false }), null);
});
test('welcomeOffer: reworld 에서도 목재·물고기가 작물보다 먼저', () => {
  assert.equal(welcomeOffer({ wood: 5, crop: 4 }, { reworld: true }).item, 'wood');
  assert.equal(welcomeOffer({ fish: 1, crop: 4 }, { reworld: true }).item, 'fish');
});
test('welcomeOffer: 작물 환영가는 정가(5🪙×4)보다 조금만 높다 — E1 경제 가드레일', () => {
  const o = welcomeOffer({ crop: 4 }, { reworld: true });
  assert.ok(o.gain <= o.qty * 5 * 1.5);   // 5 = js/data/catalog.js SELL_PRICE.crop (three 를 끌어와서 직접 import 안 함)
});
