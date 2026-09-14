// GA4 예약 파라미터 가드 — 게임 내부 출처가 유입 소스를 덮어쓰지 않는지.
//   2026-09-14: econ_tx 의 source='daily_bonus' 가 세션 유입을 갈아치운 사고 회귀 방지.
import test from 'node:test';
import assert from 'node:assert/strict';
import { renameReservedParams, RESERVED_TRAFFIC_KEYS } from '../js/ga-params.js';

test('econ_tx 의 source 가 GA4 유입을 덮어쓰지 않게 src 로 바뀐다', () => {
  const out = renameReservedParams({ source: 'daily_bonus', item: 'coin', amount: 50 });
  assert.equal(out.src, 'daily_bonus');
  assert.ok(!('source' in out), 'source 키가 남아 있으면 GA4 가 캠페인으로 가로챈다');
  assert.equal(out.item, 'coin');
  assert.equal(out.amount, 50);
});

test('nickname_set 의 source 도 동일하게 처리된다', () => {
  const out = renameReservedParams({ source: 'new', len: 3 });
  assert.deepEqual(out, { src: 'new', len: 3 });
});

test('예약 키 전부가 안전한 이름으로 바뀐다', () => {
  const input = Object.fromEntries(Object.keys(RESERVED_TRAFFIC_KEYS).map(k => [k, k]));
  const out = renameReservedParams(input);
  for (const [bad, safe] of Object.entries(RESERVED_TRAFFIC_KEYS)) {
    assert.ok(!(bad in out), `${bad} 가 남았다`);
    assert.equal(out[safe], bad);
  }
});

test('예약어가 아닌 파라미터는 그대로 통과한다', () => {
  const params = { tree_id: 7, wood: 3, platform: 'toss', ts: 123 };
  assert.deepEqual(renameReservedParams(params), params);
});

test('원본 객체를 변경하지 않는다', () => {
  const params = { source: 'shop_sell', amount: 10 };
  renameReservedParams(params);
  assert.deepEqual(params, { source: 'shop_sell', amount: 10 });
});

test('빈 입력에도 안전하다', () => {
  assert.deepEqual(renameReservedParams(), {});
  assert.deepEqual(renameReservedParams({}), {});
});
