import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admobImpressionJson } from '../js/tenjin-ad-revenue.js';

test('AdMob 노출 수익을 Tenjin AdMob ILRD 키로 바꾼다', () => {
  const json = admobImpressionJson({
    adUnitId: 'ca-app-pub-1/2',
    valueMicros: 1234,
    currencyCode: 'USD',
    precision: 3,
    networkName: 'com.google.ads.mediation.admob.AdMobAdapter',
    impressionId: 'resp-1',
  });
  assert.deepEqual(json, {
    ad_unit_id: 'ca-app-pub-1/2',
    value_micros: 1234,
    currency_code: 'USD',
    precision_type: 3,
    mediation_adapter_class_name: 'com.google.ads.mediation.admob.AdMobAdapter',
    response_id: 'resp-1',
  });
});

test('빈 문자열 필드는 빼고, 숫자 문자열 수익은 숫자로 바꾼다', () => {
  const json = admobImpressionJson({ adUnitId: 'u', valueMicros: '500', currencyCode: 'KRW', precision: 1, networkName: '', impressionId: '' });
  assert.deepEqual(json, { ad_unit_id: 'u', value_micros: 500, currency_code: 'KRW', precision_type: 1 });
});

test('수익 값이 없거나 숫자가 아니면 보내지 않는다', () => {
  assert.equal(admobImpressionJson(null), null);
  assert.equal(admobImpressionJson({ adUnitId: 'u' }), null);
  assert.equal(admobImpressionJson({ valueMicros: 'abc' }), null);
  assert.equal(admobImpressionJson({ valueMicros: -1 }), null);
});
