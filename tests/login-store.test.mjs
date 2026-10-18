import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DEFAULT_APP_BANNER, storeUrl } from '../js/app-banner.js';
import { loginStorePlan, QR_FILES } from '../js/login-store.js';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
};
const LIVE = { ...DEFAULT_APP_BANNER, storeLive: { android: true, ios: true }, iosAppId: '6821420691', iosProviderToken: '129595134' };
const TOUCH = { jid: 'abc123', utm: { source: 'instagram', medium: 'paid', campaign: 'c1', content: 'v2' } };
const plan = (o) => loginStorePlan({ platform: 'web', ua: UA.windows, maxTouchPoints: 0, cfg: LIVE, touch: null, ...o });

test('storeUrl — medium 을 주면 안드로이드 referrer·iOS ct 에 그 값이 실린다', () => {
  const a = decodeURIComponent(new URL(storeUrl('android', LIVE, TOUCH, 'login_card')).searchParams.get('referrer'));
  assert.match(a, /utm_medium=login_card/);
  assert.match(a, /utm_source=instagram/);
  assert.match(a, /jid=abc123/);
  const i = new URL(storeUrl('ios', LIVE, TOUCH, 'login_card'));
  assert.match(i.searchParams.get('ct'), /^login_card_instagram/);
  assert.equal(i.searchParams.get('pt'), '129595134');
});

test('storeUrl — medium 을 안 주면 기존 인게임 배너 값 그대로', () => {
  const a = decodeURIComponent(new URL(storeUrl('android', LIVE, TOUCH)).searchParams.get('referrer'));
  assert.match(a, /utm_medium=web_banner/);
  assert.match(new URL(storeUrl('ios', LIVE, TOUCH)).searchParams.get('ct'), /^web_banner_/);
});

test('PC — 두 스토어 버튼 + QR', () => {
  const p = plan();
  assert.equal(p.device, 'pc');
  assert.deepEqual(p.links.map(l => l.os), ['ios', 'android']);
  assert.equal(p.qr, true);
  for (const l of p.links) assert.ok(l.url.startsWith('https://'));
});

test('폰 — 그 기기 스토어 하나, QR 없음', () => {
  const a = plan({ ua: UA.android, maxTouchPoints: 5 });
  assert.equal(a.device, 'android');
  assert.deepEqual(a.links.map(l => l.os), ['android']);
  assert.equal(a.qr, false);
  const i = plan({ ua: UA.iphone, maxTouchPoints: 5 });
  assert.deepEqual(i.links.map(l => l.os), ['ios']);
  assert.equal(i.qr, false);
});

test('버튼 링크는 login_card 로 귀속된다', () => {
  const a = plan({ ua: UA.android, maxTouchPoints: 5, touch: TOUCH }).links[0].url;
  assert.match(decodeURIComponent(new URL(a).searchParams.get('referrer')), /utm_medium=login_card/);
});

test('웹·itch 에서만 — 앱·토스 안에서는 없다', () => {
  assert.ok(plan({ platform: 'itch' }));
  for (const platform of ['toss', 'android', 'ios']) assert.equal(plan({ platform }), null, platform);
});

test('스토어가 안 열린 OS 는 버튼도 QR 도 뺀다', () => {
  const onlyAndroid = { ...LIVE, storeLive: { android: true, ios: false } };
  const p = plan({ cfg: onlyAndroid });
  assert.deepEqual(p.links.map(l => l.os), ['android']);
  assert.equal(plan({ cfg: onlyAndroid, ua: UA.iphone, maxTouchPoints: 5 }), null);
  assert.equal(plan({ cfg: { ...LIVE, storeLive: { android: false, ios: false } } }), null);
});

test('QR 파일이 있고, login_qr 로 귀속된 스토어 주소를 담고 있다', () => {
  for (const os of ['ios', 'android']) assert.ok(existsSync(new URL(QR_FILES[os], ROOT)), QR_FILES[os]);
  const src = read('assets/qr/README.md');
  assert.match(src, /utm_medium%3Dlogin_qr/);
  assert.match(src, /ct=login_qr_web/);
});

const html = read('index.html');
const en = read('js/i18n-en.js');

test('index.html — 카드 안 줄·QR 카드가 로그인 화면 안에 있다', () => {
  const card = html.slice(html.indexOf('<div id="login-screen">'), html.indexOf('<form id="email-step"'));
  assert.match(card, /id="login-store" hidden/);
  assert.match(card, /📱 앱으로도 만나요/);
  const screen = html.slice(html.indexOf('<div id="login-screen">'));
  assert.match(screen, /id="login-qr" hidden/);
  assert.match(screen, /📱 폰에서도 만나요/);
  assert.match(screen, /폰 카메라로 QR을 비춰 주세요/);
});

test('index.html — 부팅에서 붙이고, 로그인 화면이 뜰 때 노출을 잰다', () => {
  assert.match(html, /import \{ mountLoginStore \} from '\.\/js\/login-store-ui\.js'/);
  assert.match(html, /mountLoginStore\(\{[\s\S]{0,200}TUNING\.appBanner/);
  const fn = html.slice(html.indexOf('function showLoginScreen'), html.indexOf('let started = false'));
  assert.match(fn, /loginStore\?\.shown\(\)/);
});

test('영어 사전 — 확정 문구 3개', () => {
  assert.match(en, /'📱 앱으로도 만나요': '📱 Also on mobile'/);
  assert.match(en, /'📱 폰에서도 만나요': '📱 Take it with you'/);
  assert.match(en, /'폰 카메라로 QR을 비춰 주세요': 'Point your phone camera at the QR'/);
});

test('웹·itch 빌드가 QR 이미지를 싣는다', () => {
  const web = read('scripts/build-web.mjs');
  for (const f of Object.values(QR_FILES)) assert.ok(web.includes(`'${f}'`), f);
  assert.match(read('scripts/build-itch.mjs'), /replaceAll\('data-src="assets\/', `data-src="\$\{API_ORIGIN\}\/assets\//);
});

test('TUNING.appBanner 처럼 일부 값만 있는 설정도 기본값과 합쳐 완전한 주소를 만든다', async () => {
  const { TUNING } = await import('../js/tuning.js');
  const p = loginStorePlan({ platform: 'web', ua: UA.windows, maxTouchPoints: 0, cfg: TUNING.appBanner, touch: null });
  const a = p.links.find(l => l.os === 'android').url;
  assert.equal(new URL(a).searchParams.get('id'), 'com.cheorish.lab.calmforest');
  assert.ok(!p.links.some(l => l.url.includes('undefined')));
});

test('QR 이미지는 data-src 로만 두어 앱 번들(QR 파일 없음)에서 요청이 나가지 않는다', () => {
  const screen = html.slice(html.indexOf('<div id="login-qr"'), html.indexOf('<!-- 피드백 모달 -->'));
  assert.ok(!/<img src=/.test(screen));
  assert.equal((screen.match(/data-src="assets\/qr\//g) || []).length, 2);
  assert.ok(!html.includes(':has(#login-main[hidden])'));
});

const BADGES = ['assets/badges/app-store-ko.svg', 'assets/badges/app-store-en.svg', 'assets/badges/google-play-ko.png', 'assets/badges/google-play-en.png'];

test('공식 스토어 배지 4종이 있고, 웹 빌드에 실리며, 언어별 템플릿에 data-src 로만 걸린다', () => {
  const web = read('scripts/build-web.mjs');
  for (const f of BADGES) {
    assert.ok(existsSync(new URL(f, ROOT)), f);
    assert.ok(web.includes(`'${f}'`), f);
  }
  const tpl = html.slice(html.indexOf('<template id="store-badges">'), html.indexOf('</template>', html.indexOf('<template id="store-badges">')));
  for (const os of ['ios', 'android']) for (const lang of ['ko', 'en']) {
    assert.match(tpl, new RegExp(`data-os="${os}" data-lang="${lang}" data-src="assets/badges/`));
  }
  assert.ok(!/\ssrc="/.test(tpl));
});

test('Apple SVG 배지는 스크립트 없는 순수 SVG 다', () => {
  for (const f of BADGES.filter(f => f.endsWith('.svg'))) assert.ok(!/<script|on\w+=/i.test(read(f)), f);
});

test('언어를 넘겨 부팅한다', () => {
  assert.match(html, /mountLoginStore\(\{[^}]*lang: LANG/);
});
