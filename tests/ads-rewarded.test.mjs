import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRewardedAds, adUnitFor, AD_UNITS } from '../js/ads/rewarded-native.js';

const EV = {
  reward: 'onRewardedVideoAdReward',
  dismissed: 'onRewardedVideoAdDismissed',
  failedToShow: 'onRewardedVideoAdFailedToShow',
  impression: 'onRewardedVideoAdImpression',
};

function fakeAdMob({
  consent = { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: true },
  consentAfterForm = { status: 'OBTAINED', canRequestAds: true },
  consentError = null,
  att = 'notDetermined',
  prepareError = null,
  showError = null,
  script = ['impression', 'reward', 'dismissed'],
  value = { valueMicros: 1234, currencyCode: 'USD', precision: 1 },
} = {}) {
  const calls = [];
  const listeners = {};
  const emit = (name, data) => (listeners[name] || []).slice().forEach(cb => cb(data));
  const plugin = {
    requestConsentInfo: async (o) => { calls.push(['consentInfo', o]); if (consentError) throw consentError; return consent; },
    showConsentForm: async () => { calls.push('consentForm'); return consentAfterForm; },
    trackingAuthorizationStatus: async () => { calls.push('attStatus'); return { status: att }; },
    requestTrackingAuthorization: async () => { calls.push('attRequest'); },
    initialize: async (o) => { calls.push(['init', o]); },
    prepareRewardVideoAd: async (o) => { calls.push(['prepare', o]); if (prepareError) throw prepareError; return { adUnitId: o.adId }; },
    showRewardVideoAd: () => {
      calls.push('show');
      if (showError) return Promise.reject(showError);
      return new Promise((resolve) => {
        queueMicrotask(() => {
          for (const step of script) {
            if (step === 'impression') emit(EV.impression, { adUnitId: 'u', ...value });
            if (step === 'reward') { emit(EV.reward, { type: 'coin', amount: 1 }); resolve({ type: 'coin', amount: 1 }); }
            if (step === 'dismissed') emit(EV.dismissed, {});
            if (step === 'failedToShow') emit(EV.failedToShow, { code: 0, message: 'boom' });
          }
        });
      });
    },
  };
  const listen = (event, cb) => {
    (listeners[event] ||= []).push(cb);
    return { remove: () => { listeners[event] = listeners[event].filter(f => f !== cb); } };
  };
  const live = () => Object.values(listeners).reduce((n, l) => n + l.length, 0);
  return { plugin, listen, calls, live };
}

const kinds = (calls) => calls.map(c => Array.isArray(c) ? c[0] : c);

test('웹·토스·itch는 플러그인을 부르지 않고 바로 unavailable', async () => {
  for (const platform of ['web', 'toss', 'itch']) {
    const f = fakeAdMob();
    const ads = createRewardedAds({ platform, plugin: f.plugin, listen: f.listen });
    assert.deepEqual(await ads.showRewarded('house'), { result: 'unavailable', placement: 'house' });
    assert.deepEqual(f.calls, []);
  }
});

test('앱인데 플러그인이 빠진 빌드면 unavailable', async () => {
  const ads = createRewardedAds({ platform: 'android', plugin: undefined, listen: () => undefined });
  assert.equal((await ads.showRewarded('house')).result, 'unavailable');
});

test('끝까지 보면 complete, 노출 수익을 같이 돌려준다', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.deepEqual(r, {
    result: 'complete', placement: 'house', network: 'admob',
    valueMicros: 1234, currencyCode: 'USD', precision: 1,
  });
  assert.equal(f.live(), 0, '리스너는 끝나면 뗀다');
});

test('보상 전에 닫으면 skip, 수익은 그래도 담는다', async () => {
  const f = fakeAdMob({ script: ['impression', 'dismissed'] });
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('farm');
  assert.equal(r.result, 'skip');
  assert.equal(r.valueMicros, 1234);
  assert.equal(f.live(), 0);
});

test('노출 수익이 오면 onPaid 로 원본 데이터를 넘긴다', async () => {
  const f = fakeAdMob();
  const paid = [];
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen, onPaid: (v) => paid.push(v) });
  await ads.showRewarded('house');
  assert.deepEqual(paid, [{ adUnitId: 'u', valueMicros: 1234, currencyCode: 'USD', precision: 1 }]);
});

test('onPaid 가 던져도 광고 결과는 그대로다', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen, onPaid: () => { throw new Error('x'); } });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
  assert.equal(f.live(), 0);
});

test('수익 콜백이 없으면 valueMicros 키가 없다', async () => {
  const f = fakeAdMob({ script: ['reward', 'dismissed'] });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.equal(r.result, 'complete');
  assert.ok(!('valueMicros' in r));
});

test('채울 광고가 없으면 nofill (Android 코드 3, iOS 코드 1)', async () => {
  for (const [platform, code] of [['android', '3'], ['ios', '1']]) {
    const f = fakeAdMob({ prepareError: Object.assign(new Error('No fill'), { code }) });
    const ads = createRewardedAds({ platform, plugin: f.plugin, listen: f.listen });
    const r = await ads.showRewarded('house');
    assert.equal(r.result, 'nofill', platform);
    assert.ok(!f.calls.includes('show'));
  }
});

test('그 밖의 로드 오류는 fail, 사유를 남긴다', async () => {
  const f = fakeAdMob({ prepareError: Object.assign(new Error('Network error'), { code: '2' }) });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.equal(r.result, 'fail');
  assert.equal(r.reason, 'load:2:Network error');
});

test('화면에 못 띄우면 fail', async () => {
  const f = fakeAdMob({ script: ['failedToShow'] });
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.equal(r.result, 'fail');
  assert.match(r.reason, /^show:/);
  assert.equal(f.live(), 0);
});

test('show 호출이 거절되면 fail', async () => {
  const f = fakeAdMob({ showError: new Error('Reward Video is Not Ready Yet') });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.equal(r.result, 'fail');
  assert.equal(f.live(), 0);
});

test('닫힘 이벤트가 영영 안 오면 시간 초과로 fail', async () => {
  const f = fakeAdMob({ script: [] });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen, showTimeoutMs: 20 });
  const r = await ads.showRewarded('house');
  assert.deepEqual([r.result, r.reason], ['fail', 'timeout']);
  assert.equal(f.live(), 0);
});

test('닫힌 직후 늦게 온 보상도 complete로 친다', async () => {
  const f = fakeAdMob({ script: ['dismissed', 'reward'] });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
});

test('보는 중에 또 부르면 두 번째는 busy로 fail', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const [a, b] = await Promise.all([ads.showRewarded('house'), ads.showRewarded('farm')]);
  assert.equal(a.result, 'complete');
  assert.deepEqual([b.result, b.reason], ['fail', 'busy']);
});

test('초기화는 한 번만: 동의 정보 → (iOS) 추적 허가 → SDK 시작', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen });
  await ads.showRewarded('house');
  await ads.showRewarded('house');
  const setup = kinds(f.calls).filter(k => k !== 'show' && k !== 'prepare');
  assert.deepEqual(setup, ['consentInfo', 'attStatus', 'attRequest', 'init']);
});

test('Android는 추적 허가를 묻지 않는다', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  await ads.showRewarded('house');
  assert.ok(!f.calls.includes('attStatus'));
  assert.ok(!f.calls.includes('attRequest'));
});

test('이미 답한 추적 허가는 다시 묻지 않는다', async () => {
  const f = fakeAdMob({ att: 'denied' });
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
  assert.ok(!f.calls.includes('attRequest'));
});

test('동의가 필요한 지역이면 동의창을 띄운다', async () => {
  const f = fakeAdMob({ consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false } });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
  assert.ok(f.calls.includes('consentForm'));
});

test('동의창 뒤에도 광고 요청 불가면 consent 사유로 fail, 광고를 부르지 않는다', async () => {
  const f = fakeAdMob({
    consent: { status: 'REQUIRED', isConsentFormAvailable: true, canRequestAds: false },
    consentAfterForm: { status: 'REQUIRED', canRequestAds: false },
  });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.deepEqual([r.result, r.reason], ['fail', 'consent']);
  assert.ok(!kinds(f.calls).includes('prepare'));
});

test('동의 정보 조회가 실패하면 광고를 요청하지 않고, 다음 호출에서 다시 묻는다', async () => {
  const f = fakeAdMob({ consentError: new Error('Request consent info failed') });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.deepEqual([r.result, r.reason], ['fail', 'consent']);
  assert.ok(!kinds(f.calls).includes('prepare'));
  f.plugin.requestConsentInfo = async () => ({ status: 'NOT_REQUIRED', canRequestAds: true });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
});

test('canRequestAds가 빠진 응답은 요청 불가로 본다', async () => {
  const f = fakeAdMob({ consent: { status: 'UNKNOWN' } });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  assert.equal((await ads.showRewarded('house')).reason, 'consent');
});

test('보상을 받은 뒤라면 시간 초과·표시 실패여도 complete', async () => {
  for (const script of [['impression', 'reward'], ['impression', 'reward', 'failedToShow']]) {
    const f = fakeAdMob({ script });
    const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen, showTimeoutMs: 30 });
    const r = await ads.showRewarded('house');
    assert.equal(r.result, 'complete', script.join(','));
    assert.equal(r.valueMicros, 1234);
  }
});

test('닫힌 뒤 늦게 온 수익 콜백도 담는다', async () => {
  const f = fakeAdMob({ script: ['reward', 'dismissed', 'impression'] });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const r = await ads.showRewarded('house');
  assert.equal(r.result, 'complete');
  assert.equal(r.valueMicros, 1234);
});

test('개인정보 옵션 창: 앱에서만 열고 웹은 unavailable', async () => {
  const f = fakeAdMob();
  let opened = 0;
  f.plugin.showPrivacyOptionsForm = async () => { opened += 1; };
  const app = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  assert.equal(await app.showPrivacyOptions(), 'shown');
  assert.equal(opened, 1);
  const web = createRewardedAds({ platform: 'web', plugin: f.plugin, listen: f.listen });
  assert.equal(await web.showPrivacyOptions(), 'unavailable');
});

test('동의 정보에서 개인정보 옵션이 필요한지 알려 준다', async () => {
  const f = fakeAdMob({ consent: { status: 'OBTAINED', canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' } });
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  assert.deepEqual(await ads.warmUp(), { canRequestAds: true, privacyOptionsRequired: true });
});

test('초기화가 실패하면 fail, 다음 호출에서 다시 시도한다', async () => {
  const f = fakeAdMob();
  let n = 0;
  const init = f.plugin.initialize;
  f.plugin.initialize = async (o) => { n += 1; if (n === 1) throw new Error('init boom'); return init(o); };
  const ads = createRewardedAds({ platform: 'android', plugin: f.plugin, listen: f.listen });
  const first = await ads.showRewarded('house');
  assert.equal(first.result, 'fail');
  assert.match(first.reason, /^init:/);
  assert.equal((await ads.showRewarded('house')).result, 'complete');
});

test('테스트 모드는 구글 테스트 단위와 initializeForTesting을 쓴다', async () => {
  const f = fakeAdMob();
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen, testMode: true });
  await ads.showRewarded('house');
  const init = f.calls.find(c => Array.isArray(c) && c[0] === 'init')[1];
  const prep = f.calls.find(c => Array.isArray(c) && c[0] === 'prepare')[1];
  assert.equal(init.initializeForTesting, true);
  assert.equal(prep.adId, AD_UNITS.test.ios);
});

test('운영 단위는 플랫폼별 calm forest 단위', () => {
  assert.equal(adUnitFor('android', false), 'ca-app-pub-4372856890021592/5636922678');
  assert.equal(adUnitFor('ios', false), 'ca-app-pub-4372856890021592/5078072368');
  assert.equal(adUnitFor('android', true), 'ca-app-pub-3940256099942544/5224354917');
  assert.equal(adUnitFor('ios', true), 'ca-app-pub-3940256099942544/1712485313');
  assert.equal(adUnitFor('web', false), undefined);
});

test('테스트 빌드만: 동의 조회가 실패해도 테스트 광고는 띄운다', async () => {
  const f = fakeAdMob({ consentError: new Error('no form(s) configured') });
  const ads = createRewardedAds({ platform: 'ios', plugin: f.plugin, listen: f.listen, testMode: true });
  assert.equal((await ads.showRewarded('house')).result, 'complete');
});
