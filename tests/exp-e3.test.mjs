import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E3_ARMS, armForE3, decideE3, parseE3Stored, e3UserProps, spaceLinkOn } from '../js/exp-e3.js';
import { armForE2 } from '../js/exp-e2.js';

const ids = Array.from({ length: 10000 }, (_, i) => `c-${i.toString(36)}-${(i * 7919).toString(16)}`);
const NEW = { clientId: 'c-abc', newDevice: true, stored: null, dev: false, forced: null };

test('해시 배정은 결정적이고 50:50 (48~52%)', () => {
  assert.equal(armForE3('c-x'), armForE3('c-x'));
  const on = ids.filter(id => armForE3(id) === 'on').length / ids.length;
  assert.ok(on > 0.48 && on < 0.52, String(on));
});

test('E2 와 독립 — 교차 칸이 약 25%', () => {
  const both = ids.filter(id => armForE3(id) === 'on' && armForE2(id) === 'skip_login').length / ids.length;
  assert.ok(both > 0.22 && both < 0.28, String(both));
});

test('새 기기만 배정, 기존 기기는 on·속성 없음', () => {
  const n = decideE3(NEW);
  assert.equal(n.enrolled, true); assert.equal(n.reason, 'new'); assert.ok(E3_ARMS.includes(n.arm));
  const old = decideE3({ ...NEW, newDevice: false });
  assert.equal(old.enrolled, false); assert.equal(old.reason, 'returning');
  assert.equal(spaceLinkOn(old), true); assert.deepEqual(e3UserProps(old), {});
});

test('저장 기록이 해시보다 먼저', () => {
  const flip = armForE3('c-abc') === 'on' ? 'off' : 'on';
  const d = decideE3({ ...NEW, newDevice: false, stored: { arm: flip } });
  assert.equal(d.arm, flip); assert.equal(d.reason, 'device');
});

test('dev 는 기록 없이 on, ?e3= 로 강제하되 속성은 안 싣는다', () => {
  const dev = decideE3({ ...NEW, dev: true });
  assert.equal(dev.enrolled, false); assert.equal(spaceLinkOn(dev), true);
  const forced = decideE3({ ...NEW, dev: true, forced: 'off' });
  assert.equal(forced.reason, 'forced'); assert.equal(spaceLinkOn(forced), false);
  assert.deepEqual(e3UserProps(forced), {});
  assert.equal(decideE3({ ...NEW, forced: 'off' }).reason, 'new');
});

test('사용자 속성·스위치', () => {
  const off = { enrolled: true, arm: 'off', reason: 'new' }, on = { enrolled: true, arm: 'on', reason: 'device' };
  assert.deepEqual(e3UserProps(off), { exp_space: 'off' });
  assert.deepEqual(e3UserProps(on), { exp_space: 'on' });
  assert.equal(spaceLinkOn(off), false); assert.equal(spaceLinkOn(on), true); assert.equal(spaceLinkOn(null), true);
});

test('저장 기록 파싱', () => {
  assert.deepEqual(parseE3Stored('{"arm":"off"}'), { arm: 'off' });
  assert.equal(parseE3Stored('{"arm":"x"}'), null);
  assert.equal(parseE3Stored('nope'), null);
  assert.equal(parseE3Stored(null), null);
});
