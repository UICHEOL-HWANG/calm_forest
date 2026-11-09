import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureTouch, storeUrl, DEFAULT_APP_BANNER } from '../js/app-banner.js';
import { tenjinClickUrl } from '../js/tenjin-web-to-app.js';

const cfg = {
  ...DEFAULT_APP_BANNER,
  storeLive: { android: true, ios: true },
  androidPackage: 'com.cheorish.lab.calmforest',
  iosAppId: '6821420691',
  tenjinClickUrls: {
    ios: 'https://track.tenjin.com/v0/metapixel/example?jsr=true&platform=ios',
    android: '',
  },
};

test('W2 Meta 클릭에는 광고 세트·소재·Meta 식별자를 Tenjin 매개변수로 보낸다', () => {
  const touch = captureTouch(
    '?utm_source=meta&utm_campaign=webapp_202610&utm_term=w2_general_sea_v2&utm_content=w2_general_sea_v2&campaign_id=120249037000000217',
    null, 1, () => 'jid1',
  );
  const url = new URL(tenjinClickUrl('ios', cfg, touch, { fbp: 'fb.1.1.abc', fbclid: 'click-1' }));
  assert.equal(url.searchParams.get('campaign_name'), 'w2_general_sea_v2');
  assert.equal(url.searchParams.get('campaign_id'), '120249037000000217');
  assert.equal(url.searchParams.get('creative_name'), 'w2_general_sea_v2');
  assert.equal(url.searchParams.get('tenjin_parameter_0'), 'fb.1.1.abc');
  assert.equal(url.searchParams.get('tenjin_parameter_1'), 'click-1');
  assert.equal(url.searchParams.get('platform'), 'ios');
});

test('비광고 방문과 W1은 Tenjin에 보내지 않고 기존 스토어 주소는 보존한다', () => {
  const old = captureTouch('?utm_source=meta&utm_content=w1_general_v1', null, 1, () => 'jid1');
  assert.equal(tenjinClickUrl('ios', cfg, old), null);
  assert.equal(tenjinClickUrl('ios', cfg, { utm: { source: 'organic', content: 'w2_general_sea_v2' } }), null);
  assert.equal(tenjinClickUrl('android', cfg, { utm: { source: 'meta', content: 'w2_general_sea_v2' } }), null);
  assert.match(storeUrl('android', cfg, old), /play\.google\.com/);
  assert.match(storeUrl('ios', cfg, old), /apps\.apple\.com/);
});
