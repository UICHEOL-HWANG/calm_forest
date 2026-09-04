import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFeatures, FEATURE_ORDER, WINDOW_SIZE } from '../js/features.js';

const cases = JSON.parse(readFileSync(new URL('./fixtures/feature_parity.json', import.meta.url), 'utf8'));

test('픽스처가 비어있지 않다', () => {
  assert.ok(cases.length > 0, 'ml/tests/make_parity_fixture.py 를 먼저 돌린다');
});

test('SQL 이 계산한 값과 일치한다', () => {
  for (const c of cases) {
    const got = computeFeatures(c.rows, {
      isFirstSession: c.is_first_session,
      triggerKind: c.trigger_kind,
    });
    for (const [k, want] of Object.entries(c.expected)) {
      if (want === null) {
        assert.equal(got[k], null, `${c.session_id}/${k}: SQL 은 NULL 인데 JS 는 ${got[k]}`);
        continue;
      }
      const diff = Math.abs(got[k] - want);
      const tol = Math.max(1e-6, Math.abs(want) * 1e-9);
      assert.ok(diff <= tol, `${c.session_id}/${k}: JS ${got[k]} vs SQL ${want} (차 ${diff})`);
    }
  }
});

test('결측(net_disp=0) 사례가 픽스처에 실제로 들어 있다', () => {
  const n = cases.filter(c => c.expected.wander_ratio === null).length;
  assert.ok(n > 0, '0 나눗셈 경로가 검증되지 않는다');
});

test('FEATURE_ORDER 는 8개이고 중복이 없다', () => {
  assert.equal(FEATURE_ORDER.length, 8);
  assert.equal(new Set(FEATURE_ORDER).size, 8);
});

test('net_disp 가 0이면 wander_ratio 는 null', () => {
  const still = Array.from({ length: WINDOW_SIZE }, () => ({ char_x: 1, char_z: 2, cam_yaw: 0, mouse_x: 5, mouse_y: 5 }));
  const f = computeFeatures(still, { isFirstSession: true, triggerKind: 'time15' });
  assert.equal(f.net_disp, 0);
  assert.equal(f.wander_ratio, null);
  assert.equal(f.idle_ratio, 1, '전부 정지면 유휴 비율 1');
});

test('trigger_kind 는 quest 일 때만 1', () => {
  const rows = Array.from({ length: WINDOW_SIZE }, (_, i) => ({ char_x: i, char_z: 0, cam_yaw: 0, mouse_x: 0, mouse_y: 0 }));
  assert.equal(computeFeatures(rows, { isFirstSession: false, triggerKind: 'quest' }).trigger_kind, 1);
  assert.equal(computeFeatures(rows, { isFirstSession: false, triggerKind: 'time15' }).trigger_kind, 0);
});

test('행이 WINDOW_SIZE 개가 아니면 던진다', () => {
  assert.throws(() => computeFeatures([], { isFirstSession: true, triggerKind: 'time15' }), /10/);
});
