import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTossRewarded, TOSS_AD_GROUP } from '../js/ads/toss-rewarded.js';

function fakeSdk(script) {
  const calls = [];
  const fn = (name, steps) => Object.assign((p) => {
    calls.push([name, p.options?.adGroupId]);
    queueMicrotask(() => { for (const s of steps()) (s.error ? p.onError(new Error(s.error)) : p.onEvent(s)); });
    return () => {};
  }, { isSupported: () => script.supported !== false });
  return { calls, loadFullScreenAd: fn('load', () => script.load || [{ type: 'loaded' }]), showFullScreenAd: fn('show', () => script.show || []) };
}

const settle = () => new Promise(r => setTimeout(r, 0));

test('토스 밖이거나 SDK 가 광고를 지원하지 않으면 쓸 수 없다', async () => {
  const off = createTossRewarded({ isToss: false, loadSdk: async () => fakeSdk({}) });
  await settle();
  assert.equal(off.available(), false);
  assert.equal((await off.show('bridge')).result, 'unavailable');
  const old = createTossRewarded({ isToss: true, loadSdk: async () => fakeSdk({ supported: false }) });
  await settle();
  assert.equal(old.available(), false);
});

test('보상 신호 뒤 닫히면 complete, 보상 없이 닫히면 skip', async () => {
  const sdk = fakeSdk({ show: [{ type: 'show' }, { type: 'userEarnedReward', data: { unitType: 'x', unitAmount: 1 } }, { type: 'dismissed' }] });
  const ads = createTossRewarded({ isToss: true, loadSdk: async () => sdk });
  await settle();
  assert.equal(ads.available(), true);
  const r = await ads.show('bridge');
  assert.equal(r.result, 'complete');
  assert.equal(r.network, 'toss');
  assert.deepEqual(sdk.calls.map(c => c[0]), ['load', 'show']);
  assert.ok(sdk.calls.every(c => c[1] === TOSS_AD_GROUP));
  const skip = createTossRewarded({ isToss: true, loadSdk: async () => fakeSdk({ show: [{ type: 'dismissed' }] }) });
  await settle();
  assert.equal((await skip.show('farm2')).result, 'skip');
});

test('불러오기·보여주기 실패는 fail 로 돌려준다', async () => {
  const loadFail = createTossRewarded({ isToss: true, loadSdk: async () => fakeSdk({ load: [{ error: 'no fill' }] }) });
  await settle();
  const a = await loadFail.show('bridge');
  assert.equal(a.result, 'fail');
  assert.match(a.reason, /^load:/);
  const showFail = createTossRewarded({ isToss: true, loadSdk: async () => fakeSdk({ show: [{ type: 'failedToShow' }] }) });
  await settle();
  assert.equal((await showFail.show('bridge')).result, 'fail');
});

test('game.js 는 토스에서 토스 광고를, 앱에서 애드몹을 고른다', async () => {
  const { readFileSync } = await import('node:fs');
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /setPrepassProvider\(IS_TOSS \? createTossRewarded\(\{ isToss: true, loadSdk: loadTossSDK \}\) : \{ available: \(\) => rewardedAvailable, show: showRewarded \}\);/);
});
