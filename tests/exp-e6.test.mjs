import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E6_ARMS, E6_OLD_SHARE, armForE6, decideE6, parseE6Stored, e6UserProps, e6SessionMark, guideRevampOn } from '../js/exp-e6.js';
import { armForE3 } from '../js/exp-e3.js';
import { prepassArm } from '../js/guide/prepass-rules.js';

const ids = Array.from({ length: 10000 }, (_, i) => `c-${i.toString(36)}-${(i * 7919).toString(16)}`);
const NEW = { clientId: 'c-abc', newDevice: true, stored: null, dev: false, forced: null };
const share = (pred) => ids.filter(pred).length / ids.length;

test('해시 배정은 결정적이고 예전 안내가 20% (18~22%)', () => {
  assert.equal(E6_OLD_SHARE, 20);
  assert.equal(armForE6('c-x'), armForE6('c-x'));
  const old = share(id => armForE6(id) === 'old');
  assert.ok(old > 0.18 && old < 0.22, String(old));
});

test('광고 실험·E3 와 독립', () => {
  const both = share(id => armForE6(id) === 'old' && prepassArm(id, 'web') === 'control');
  assert.ok(both > 0.08 && both < 0.12, String(both));
  const e3 = share(id => armForE6(id) === 'old' && armForE3(id) === 'off');
  assert.ok(e3 > 0.08 && e3 < 0.12, String(e3));
});

test('새 기기만 배정, 기존 기기는 새 안내·속성 없음', () => {
  const n = decideE6(NEW);
  assert.equal(n.enrolled, true); assert.equal(n.reason, 'new'); assert.ok(E6_ARMS.includes(n.arm));
  const back = decideE6({ ...NEW, newDevice: false });
  assert.equal(back.enrolled, false); assert.equal(back.reason, 'returning');
  assert.equal(guideRevampOn(back), true); assert.deepEqual(e6UserProps(back), {});
});

test('저장 기록이 해시보다 먼저', () => {
  const flip = armForE6('c-abc') === 'old' ? 'new' : 'old';
  const d = decideE6({ ...NEW, newDevice: false, stored: { arm: flip } });
  assert.equal(d.arm, flip); assert.equal(d.reason, 'device');
});

test('dev 는 기록 없이 새 안내, ?e6= 로 강제하되 속성은 안 싣는다', () => {
  const dev = decideE6({ ...NEW, dev: true });
  assert.equal(dev.enrolled, false); assert.equal(guideRevampOn(dev), true);
  const forced = decideE6({ ...NEW, dev: true, forced: 'old' });
  assert.equal(forced.reason, 'forced'); assert.equal(guideRevampOn(forced), false);
  assert.deepEqual(e6UserProps(forced), {});
  assert.equal(decideE6({ ...NEW, forced: 'old' }).reason, 'new');
});

test('사용자 속성·스위치', () => {
  const old = { enrolled: true, arm: 'old', reason: 'new' }, neu = { enrolled: true, arm: 'new', reason: 'device' };
  assert.deepEqual(e6UserProps(old), { exp_guide: 'old' });
  assert.deepEqual(e6UserProps(neu), { exp_guide: 'new' });
  assert.equal(guideRevampOn(old), false); assert.equal(guideRevampOn(neu), true); assert.equal(guideRevampOn(null), true);
});

test('저장 기록 파싱', () => {
  assert.deepEqual(parseE6Stored('{"arm":"old"}'), { arm: 'old' });
  assert.equal(parseE6Stored('{"arm":"x"}'), null);
  assert.equal(parseE6Stored('nope'), null);
  assert.equal(parseE6Stored(null), null);
});

test('e6SessionMark — 등록된 무리만', () => {
  assert.equal(e6SessionMark(decideE6({ ...NEW, clientId: ids.find(i => armForE6(i) === 'old') })), 'e6_old');
  assert.equal(e6SessionMark(decideE6({ stored: { arm: 'new' } })), 'e6_new');
  assert.equal(e6SessionMark(decideE6({ dev: true, forced: 'old' })), null);
  assert.equal(e6SessionMark(null), null);
});

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('배선 — GA4 사용자 속성·session_logs·안내 진입점', () => {
  const an = read('../js/analytics.js'), me = read('../js/metrics.js'), game = read('../js/game.js'), npc = read('../js/spaces/npc.js'), tree = read('../js/spaces/world-tree.js');
  assert.ok(an.includes('...e6UserProps(e6Decision())'));
  assert.ok(me.includes('e6SessionMark(e6Decision())'));
  assert.match(game, /const guideRevamp = guideRevampOn\(e6Decision\(\)\)/);
  assert.match(game, /houseShort = guideRevamp \? createHouseShort\(/);
  assert.match(game, /goalGuide = guideRevamp \? createGoalGuide\(/);
  assert.ok(npc.includes('const guideRevamp = guideRevampOn(e6Decision())') && npc.includes('houseStage === 0 && guideRevamp ?'));
  assert.ok(tree.includes('advice: guideRevampOn(e6Decision()) ? adviceOf(tree, def.id) : null'));
});
