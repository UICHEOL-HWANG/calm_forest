// =============================================================
//  🧪 E2 웹 로그인 화면 건너뛰기 — 배정·대상·행동 규칙 (js/exp-e2.js, 순수)
//  사전등록: analytics/metrics-framework f339846f dev/active/metrics-framework/web-entry-experiment-prereg.md
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  E2_ARMS, armForE2, decideE2, parseE2Stored, hasStoredSession, skipLoginNow, keepGuestSession, e2UserProps,
} from '../js/exp-e2.js';

const NEW = { clientId: 'c-abc', platform: 'web', newDevice: true, stored: null, hasSession: false, hasInvite: false, dev: false };
const ids = Array.from({ length: 4000 }, (_, i) => `c-${i.toString(36)}-${(i * 7919).toString(16)}`);

test('해시 배정은 결정적이고 50:50 에 가깝다', () => {
  assert.equal(armForE2('c-x'), armForE2('c-x'));
  const n = ids.filter(id => armForE2(id) === 'skip_login').length;
  assert.ok(Math.abs(n / ids.length - 0.5) < 0.03, `skip_login 비율 ${n / ids.length}`);
});

test('E1 솔트(e1:web:)와 독립 — 두 배정이 거의 반반으로 엇갈린다', () => {
  // js/exp-e1.js armFor 와 같은 식(FNV-1a + 마무리 섞기)을 E1 솔트로 다시 계산
  const e1 = (id) => {
    const s = `e1:web:${id}`; let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
    return (h >>> 0) & 1;
  };
  const same = ids.filter(id => (armForE2(id) === 'skip_login' ? 1 : 0) === e1(id)).length / ids.length;
  assert.ok(Math.abs(same - 0.5) < 0.03, `E1·E2 일치율 ${same}`);
});

test('웹 첫 방문·세션 없음 → 해시 무리로 등록, first=true', () => {
  const d = decideE2(NEW);
  assert.equal(d.enrolled, true);
  assert.equal(d.arm, armForE2('c-abc'));
  assert.equal(d.first, true);
  assert.equal(d.reason, 'new');
});

test('토스·안드로이드·iOS·itch 는 절대 배정하지 않는다 — 저장된 무리가 있어도', () => {
  for (const platform of ['toss', 'android', 'ios', 'itch']) {
    for (const stored of [null, { arm: 'skip_login' }]) {
      const d = decideE2({ ...NEW, platform, stored });
      assert.equal(d.enrolled, false, platform);
      assert.equal(d.arm, null);
      assert.equal(d.reason, 'platform');
    }
  }
});

test('기존 기기(이번 로드 전에 client_id 가 있었다)는 배정하지 않는다', () => {
  const d = decideE2({ ...NEW, newDevice: false });
  assert.deepEqual([d.enrolled, d.reason], [false, 'returning']);
});

test('저장된 세션이 있는 기기는 배정하지 않는다', () => {
  const d = decideE2({ ...NEW, hasSession: true });
  assert.deepEqual([d.enrolled, d.reason], [false, 'session']);
});

test('초대 링크로 온 첫 방문은 배정하지 않는다 — 하트핀 흐름(로그인 화면 배너)을 그대로 둔다', () => {
  const d = decideE2({ ...NEW, hasInvite: true });
  assert.deepEqual([d.enrolled, d.reason], [false, 'invite']);
});

test('재방문은 저장된 무리를 그대로 — 해시가 달라도, 세션이 생겼어도', () => {
  const other = E2_ARMS.find(a => a !== armForE2('c-abc'));
  const d = decideE2({ ...NEW, newDevice: false, hasSession: true, stored: { arm: other } });
  assert.deepEqual([d.enrolled, d.arm, d.first, d.reason], [true, other, false, 'device']);
});

test('dev 세션은 배정하지 않고, ?e2= 강제는 dev 에서만 먹는다', () => {
  assert.deepEqual([decideE2({ ...NEW, dev: true }).enrolled, decideE2({ ...NEW, dev: true }).reason], [false, 'dev']);
  const f = decideE2({ ...NEW, dev: true, forced: 'skip_login', newDevice: false });
  assert.deepEqual([f.enrolled, f.arm, f.reason], [true, 'skip_login', 'forced']);
  assert.equal(decideE2({ ...NEW, forced: 'skip_login', newDevice: false }).enrolled, false, '운영 세션의 강제 파라미터는 무시');
});

test('해시는 어떤 판정에서도 먼저 구해진다(옛 variant 사고 방지)', () => {
  for (const extra of [{ platform: 'toss' }, { dev: true }, { newDevice: false }, { hasSession: true }]) {
    assert.equal(decideE2({ ...NEW, ...extra }).hashed, armForE2('c-abc'));
  }
});

test('저장값 파싱 — 낯선 값은 버린다', () => {
  assert.deepEqual(parseE2Stored('{"arm":"skip_login"}'), { arm: 'skip_login' });
  for (const raw of [null, '', 'x', '[]', '{"arm":"B"}', '{}']) assert.equal(parseE2Stored(raw), null, String(raw));
});

test('Supabase 저장 세션 키 감지', () => {
  assert.equal(hasStoredSession(['cf_client_id', 'sb-zuyx-auth-token']), true);
  assert.equal(hasStoredSession(['cf_client_id', 'cf_music', 'sb-zuyx-auth-token-code-verifier']), false);
  assert.equal(hasStoredSession([]), false);
});

test('로그인 화면 건너뛰기는 처치 무리·온라인·나가기 직후 아님·초대 없음일 때만', () => {
  const skip = { enrolled: true, arm: 'skip_login' };
  assert.equal(skipLoginNow({ decision: skip, offline: false, justExited: false, hasInvite: false }), true);
  assert.equal(skipLoginNow({ decision: { enrolled: true, arm: 'control' }, offline: false, justExited: false, hasInvite: false }), false);
  assert.equal(skipLoginNow({ decision: { enrolled: false, arm: null }, offline: false, justExited: false, hasInvite: false }), false);
  assert.equal(skipLoginNow({ decision: skip, offline: true, justExited: false, hasInvite: false }), false, '오프라인은 기존 화면');
  assert.equal(skipLoginNow({ decision: skip, offline: false, justExited: true, hasInvite: false }), false, '나가기 직후 = 로그인 화면으로 가는 길');
  assert.equal(skipLoginNow({ decision: skip, offline: false, justExited: false, hasInvite: true }), false, '초대 링크는 하트핀 안내 유지');
});

test('게스트 세션 이어하기는 처치 무리만', () => {
  assert.equal(keepGuestSession({ enrolled: true, arm: 'skip_login' }), true);
  assert.equal(keepGuestSession({ enrolled: true, arm: 'control' }), false);
  assert.equal(keepGuestSession({ enrolled: false, arm: null }), false);
  assert.equal(keepGuestSession(null), false);
  assert.equal(keepGuestSession({ enrolled: true, arm: 'skip_login' }, { hasInvite: true }), false, '초대 링크는 하트핀 흐름');
});

test('GA4 사용자 속성 — 등록된 기기만 exp_entry', () => {
  assert.deepEqual(e2UserProps({ enrolled: true, arm: 'control' }), { exp_entry: 'control' });
  assert.deepEqual(e2UserProps({ enrolled: true, arm: 'skip_login' }), { exp_entry: 'skip_login' });
  assert.deepEqual(e2UserProps({ enrolled: false, arm: null }), {});
});
