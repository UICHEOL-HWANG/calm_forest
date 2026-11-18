import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E7_ARMS, E7_STORE_KEY, armForE7, decideE7, parseE7Stored, e7UserProps, e7SessionMark, namePrefillOn } from '../js/exp-e7.js';
import { armForE6 } from '../js/exp-e6.js';
import { armForE5 } from '../js/exp-e5.js';

const ids = Array.from({ length: 10000 }, (_, i) => `c-${i.toString(36)}-${(i * 7919).toString(16)}`);
const share = (pred) => ids.filter(pred).length / ids.length;
const NEW = { clientId: 'c-abc', newDevice: true, stored: null, dev: false, forced: null };

test('무리 값과 저장 키', () => {
  assert.deepEqual(E7_ARMS, ['control', 'prefill']);
  assert.equal(E7_STORE_KEY, 'cf_e7');
});

test('해시 배정은 결정적이고 50:50 (48~52%)', () => {
  assert.equal(armForE7('c-x'), armForE7('c-x'));
  const p = share(id => armForE7(id) === 'prefill');
  assert.ok(p > 0.48 && p < 0.52, String(p));
});

test('E6·E5 와 독립', () => {
  const e6 = share(id => armForE7(id) === 'prefill' && armForE6(id) === 'old');
  assert.ok(e6 > 0.08 && e6 < 0.12, String(e6));
  const e5 = share(id => armForE7(id) === 'prefill' && armForE5(id) === 'guest_first');
  assert.ok(e5 > 0.22 && e5 < 0.28, String(e5));
});

test('새 기기만 배정하고 저장된 무리는 유지한다', () => {
  const fresh = decideE7(NEW);
  assert.equal(fresh.enrolled, true);
  assert.equal(fresh.reason, 'new');
  assert.equal(fresh.arm, armForE7('c-abc'));
  assert.deepEqual(decideE7({ ...NEW, newDevice: false }), { hashed: armForE7('c-abc'), enrolled: false, arm: null, reason: 'returning' });
  const kept = decideE7({ ...NEW, newDevice: false, stored: { arm: 'prefill' } });
  assert.equal(kept.arm, 'prefill');
  assert.equal(kept.reason, 'device');
});

test('dev 세션은 배정하지 않고 강제 값만 받는다', () => {
  assert.equal(decideE7({ ...NEW, dev: true }).enrolled, false);
  const forced = decideE7({ ...NEW, dev: true, forced: 'prefill' });
  assert.equal(forced.arm, 'prefill');
  assert.equal(forced.reason, 'forced');
  assert.equal(decideE7({ ...NEW, dev: true, forced: 'nope' }).enrolled, false);
});

test('저장 값 파싱', () => {
  assert.deepEqual(parseE7Stored('{"arm":"control"}'), { arm: 'control' });
  assert.equal(parseE7Stored('{"arm":"x"}'), null);
  assert.equal(parseE7Stored('not json'), null);
  assert.equal(parseE7Stored(null), null);
});

test('사용자 속성과 세션 표시', () => {
  const d = { enrolled: true, arm: 'prefill', reason: 'new' };
  assert.deepEqual(e7UserProps(d), { exp_name: 'prefill' });
  assert.equal(e7SessionMark(d), 'e7_prefill');
  assert.deepEqual(e7UserProps({ enrolled: true, arm: 'prefill', reason: 'forced' }), {});
  assert.equal(e7SessionMark({ enrolled: false, arm: null, reason: 'returning' }), null);
});

test('미리 채움은 prefill 무리에서만 켜진다', () => {
  assert.equal(namePrefillOn({ enrolled: true, arm: 'prefill', reason: 'new' }), true);
  assert.equal(namePrefillOn({ enrolled: true, arm: 'prefill', reason: 'forced' }), true);
  assert.equal(namePrefillOn({ enrolled: true, arm: 'control', reason: 'new' }), false);
  assert.equal(namePrefillOn({ enrolled: false, arm: null, reason: 'returning' }), false);
  assert.equal(namePrefillOn(null), false);
});
