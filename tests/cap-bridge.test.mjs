// 📱 Capacitor 네이티브 플러그인 호출 어댑터 — js/cap-bridge.js
//   번들러 없이 @capacitor/core 를 안 불러오면 Capacitor.Plugins 가 비어 있다(2026-09-25 실기기에서 게스트로 빠진 원인).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capPlugin } from '../js/cap-bridge.js';

function fakeCap({ headers = [{ name: 'PlayGames' }], plugins } = {}) {
  const calls = [];
  return {
    calls,
    PluginHeaders: headers,
    Plugins: plugins,
    nativePromise: async (plugin, method, opts) => { calls.push([plugin, method, opts]); return { ok: method }; },
  };
}

test('Capacitor 가 없으면(웹·토스·itch) undefined', () => {
  assert.equal(capPlugin('PlayGames', undefined), undefined);
});

test('Plugins 가 비어 있어도 nativePromise 로 네이티브 메서드를 부른다', async () => {
  const cap = fakeCap({ plugins: {} });
  const p = capPlugin('PlayGames', cap);
  assert.ok(p);
  assert.deepEqual(await p.requestServerSideAccess({ serverClientId: 'x' }), { ok: 'requestServerSideAccess' });
  assert.deepEqual(cap.calls, [['PlayGames', 'requestServerSideAccess', { serverClientId: 'x' }]]);
});

test('옵션 없이 부르면 빈 객체를 넘긴다', async () => {
  const cap = fakeCap();
  await capPlugin('PlayGames', cap).isAuthenticated();
  assert.deepEqual(cap.calls[0], ['PlayGames', 'isAuthenticated', {}]);
});

test('네이티브에 없는 플러그인(헤더 없음)은 undefined — 호출부가 plugin 사유로 폴백', () => {
  assert.equal(capPlugin('Nope', fakeCap()), undefined);
});

test('@capacitor/core 가 이미 등록했으면 그 객체를 그대로 쓴다', () => {
  const real = { isAuthenticated() {} };
  assert.equal(capPlugin('PlayGames', fakeCap({ plugins: { PlayGames: real } })), real);
});

test('then 은 노출하지 않는다 — await 해도 thenable 로 오인되지 않게', async () => {
  const p = capPlugin('PlayGames', fakeCap());
  assert.equal(p.then, undefined);
  assert.equal(await p, p);
});
