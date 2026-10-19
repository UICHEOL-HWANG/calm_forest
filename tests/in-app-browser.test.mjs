import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectInApp, handoffUrl, withAttribution } from '../js/auth/in-app-browser.js';

const UA = {
  igAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36 Instagram 350.0.0.42.95 Android (34/14; 450dpi; 1080x2340; samsung; SM-S918N; dm3q; qcom; ko_KR; 652178923)',
  igIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.27.89 (iPhone15,2; iOS 17_6; ko_KR; ko; scale=3.00; 1179x2556; 650474028)',
  fbAndroid: 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230901.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/479.0.0.48.110;]',
  fbIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/478.0.0.40.109;FBBV/650000000;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/ko_KR;FBOP/5]',
  threads: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Barcelona 350.0.0.20.88 (iPhone15,2; iOS 17_6; ko_KR; ko)',
  kakao: 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36 KAKAOTALK/10.9.5 (INAPP)',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
  desktop: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
};

test('인스타그램 인앱은 OS 까지 가른다', () => {
  assert.deepEqual(detectInApp(UA.igAndroid), { inApp: true, app: 'instagram', os: 'android' });
  assert.deepEqual(detectInApp(UA.igIos), { inApp: true, app: 'instagram', os: 'ios' });
});

test('페이스북 인앱(FB_IAB·FBAN)', () => {
  assert.deepEqual(detectInApp(UA.fbAndroid), { inApp: true, app: 'facebook', os: 'android' });
  assert.deepEqual(detectInApp(UA.fbIos), { inApp: true, app: 'facebook', os: 'ios' });
});

test('스레드(Barcelona)와 카카오톡도 인앱', () => {
  assert.deepEqual(detectInApp(UA.threads), { inApp: true, app: 'threads', os: 'ios' });
  assert.deepEqual(detectInApp(UA.kakao), { inApp: true, app: 'kakaotalk', os: 'android' });
});

test('일반 크롬·사파리·PC 는 인앱이 아니다', () => {
  for (const ua of [UA.chromeAndroid, UA.safariIos, UA.desktop]) assert.equal(detectInApp(ua).inApp, false);
  assert.equal(detectInApp('').inApp, false);
  assert.equal(detectInApp(undefined).inApp, false);
});

const HREF = 'https://calmforest.cloud/?utm_source=meta&utm_medium=paid&fbclid=AbC_1-2';

test('안드로이드는 크롬 intent, 실패하면 같은 주소로 돌아온다', () => {
  const url = handoffUrl({ href: HREF, os: 'android', app: 'instagram' });
  assert.equal(url,
    'intent://calmforest.cloud/?utm_source=meta&utm_medium=paid&fbclid=AbC_1-2#Intent;scheme=https;package=com.android.chrome;'
    + 'S.browser_fallback_url=' + encodeURIComponent(HREF) + ';end');
});

test('iOS 는 사파리 스킴', () => {
  assert.equal(handoffUrl({ href: HREF, os: 'ios', app: 'instagram' }),
    'x-safari-https://calmforest.cloud/?utm_source=meta&utm_medium=paid&fbclid=AbC_1-2');
});

test('카카오톡은 OS 와 상관없이 외부 브라우저 열기 스킴', () => {
  for (const os of ['android', 'ios']) {
    assert.equal(handoffUrl({ href: HREF, os, app: 'kakaotalk' }),
      'kakaotalk://web/openExternal?url=' + encodeURIComponent(HREF));
  }
});

test('https 가 아니거나 OS 를 모르면 넘기지 않는다', () => {
  assert.equal(handoffUrl({ href: 'http://calmforest.cloud/', os: 'android', app: 'instagram' }), null);
  assert.equal(handoffUrl({ href: 'javascript:alert(1)', os: 'ios', app: 'facebook' }), null);
  assert.equal(handoffUrl({ href: HREF, os: 'other', app: 'facebook' }), null);
  assert.equal(handoffUrl({ href: 'not a url', os: 'android', app: 'facebook' }), null);
});

test('주소에 빠진 utm·fbclid·invite 를 보관값으로 다시 싣는다', () => {
  const out = withAttribution('https://calmforest.cloud/', {
    touch: { utm: { source: 'meta', medium: 'paid', campaign: 'c1', content: 'ad 2' } },
    fbc: 'fb.1.1760000000000.AbC_1-2',
    invite: 'ABCD12',
  });
  const q = new URL(out).searchParams;
  assert.equal(q.get('utm_source'), 'meta');
  assert.equal(q.get('utm_medium'), 'paid');
  assert.equal(q.get('utm_campaign'), 'c1');
  assert.equal(q.get('utm_content'), 'ad 2');
  assert.equal(q.get('fbclid'), 'AbC_1-2');
  assert.equal(q.get('invite'), 'ABCD12');
});

test('주소에 이미 있는 값은 덮지 않는다', () => {
  const out = withAttribution('https://calmforest.cloud/?utm_source=threads&fbclid=Live', {
    touch: { utm: { source: 'meta', medium: 'paid' } },
    fbc: 'fb.1.1760000000000.Old',
  });
  const q = new URL(out).searchParams;
  assert.equal(q.get('utm_source'), 'threads');
  assert.equal(q.get('utm_medium'), null);
  assert.equal(q.get('fbclid'), 'Live');
});

test('보관값이 없거나 깨져 있으면 주소 그대로', () => {
  assert.equal(withAttribution('https://calmforest.cloud/?a=1', {}), 'https://calmforest.cloud/?a=1');
  assert.equal(withAttribution('https://calmforest.cloud/', { fbc: 'garbage', touch: { utm: null } }), 'https://calmforest.cloud/');
  assert.equal(withAttribution('not a url', { fbc: 'fb.1.1.X' }), 'not a url');
});
