import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { appLinkTarget, onRequestGet } from '../functions/app-link.js';
import { DEFAULT_APP_BANNER } from '../js/app-banner.js';
import { guidePage } from '../scripts/lib/guide-page.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  instagramIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};
const LIVE = { storeLive: { android: true, ios: true }, iosAppId: '6821420691', iosProviderToken: '129595134' };
const target = (o) => appLinkTarget({ ua: UA.windows, search: '', cfg: LIVE, ...o });
const referrer = (url) => decodeURIComponent(new URL(url).searchParams.get('referrer'));

test('안드로이드는 Play 로, utm 이 referrer 에 실린다', () => {
  const t = target({ ua: UA.android, search: '?utm_source=instagram&utm_campaign=reel08&utm_content=b' });
  assert.equal(t.kind, 'redirect');
  assert.equal(new URL(t.url).searchParams.get('id'), DEFAULT_APP_BANNER.androidPackage);
  const r = referrer(t.url);
  assert.match(r, /utm_source=instagram/);
  assert.match(r, /utm_medium=app_link/);
  assert.match(r, /utm_campaign=reel08/);
  assert.match(r, /utm_content=b/);
});

test('아이폰(인스타 인앱 포함)은 App Store 로, ct 에 출처가 실린다', () => {
  const t = target({ ua: UA.instagramIphone, search: '?utm_source=instagram' });
  assert.equal(t.kind, 'redirect');
  const u = new URL(t.url);
  assert.equal(u.hostname, 'apps.apple.com');
  assert.equal(u.searchParams.get('pt'), '129595134');
  assert.match(u.searchParams.get('ct'), /^app_link_instagram/);
});

test('PC·크롤러는 안내 페이지', () => {
  assert.deepEqual(target({}), { kind: 'page' });
  assert.deepEqual(target({ ua: UA.googlebot }), { kind: 'page' });
});

test('?os= 로 스토어를 고를 수 있고, utm_medium 을 덮어쓸 수 있다', () => {
  const i = target({ search: '?os=ios&utm_source=littly' });
  assert.equal(new URL(i.url).hostname, 'apps.apple.com');
  const a = target({ ua: UA.instagramIphone, search: '?os=android&utm_medium=qr' });
  assert.equal(new URL(a.url).hostname, 'play.google.com');
  assert.match(referrer(a.url), /utm_medium=qr/);
});

test('스토어가 닫힌 OS 는 안내 페이지로', () => {
  const cfg = { ...LIVE, storeLive: { android: false, ios: true } };
  assert.deepEqual(target({ ua: UA.android, cfg }), { kind: 'page' });
});

test('utm_medium 에 이상한 값이 와도 영숫자·밑줄만 남는다', () => {
  const t = target({ ua: UA.android, search: '?utm_medium=a%26jid%3Dx' });
  assert.match(referrer(t.url), /utm_medium=a_jid_x/);
  assert.ok(!/jid=x/.test(referrer(t.url)));
});

test('onRequestGet — 휴대폰은 302, 캐시 금지·UA 별', async () => {
  const req = new Request('https://calmforest.cloud/app?utm_source=ig', { headers: { 'user-agent': UA.android } });
  const res = await onRequestGet({ request: req, env: {} });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /^https:\/\/play\.google\.com\//);
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.match(res.headers.get('vary'), /User-Agent/i);
});

test('onRequestGet — PC 는 정적 안내 페이지(/app.html)를 자산에서 꺼내 준다', async () => {
  let asked = null;
  const env = { ASSETS: { fetch: async (r) => { asked = new URL(r.url).pathname; return new Response('<html>page</html>', { status: 200 }); } } };
  const req = new Request('https://calmforest.cloud/app', { headers: { 'user-agent': UA.windows } });
  const res = await onRequestGet({ request: req, env });
  assert.equal(res.status, 200);
  assert.equal(asked, '/app');
  assert.match(res.headers.get('vary'), /User-Agent/i);
});

test('워커가 /app 을 정적 자산보다 먼저 가로챈다', () => {
  const w = read('worker/index.js');
  assert.match(w, /import \{ onRequestGet as appLink \} from '\.\.\/functions\/app-link\.js'/);
  assert.match(w, /pathname === '\/app' \|\| pathname === '\/app\/'/);
  assert.ok(w.indexOf("pathname === '/app'") < w.indexOf('env.ASSETS.fetch(request)'));
});

test('안내 페이지 — 확정 문구·공식 배지·QR 하나, 웹 빌드에 실린다', () => {
  const page = read('pages/app.html');
  assert.match(page, /📱 폰에서도 만나요/);
  assert.match(page, /폰 카메라로 QR을 비춰 주세요/);
  assert.match(page, /🌿 게임 하러 가기/);
  assert.match(page, /\/assets\/badges\/app-store-ko\.svg/);
  assert.match(page, /\/assets\/badges\/google-play-ko\.png/);
  assert.match(page, /\/app\?os=ios/);
  assert.match(page, /\/app\?os=android/);
  assert.match(page, /\/assets\/qr\/app-link\.svg/);
  assert.ok(!page.includes('—'));
  assert.ok(existsSync(new URL('assets/qr/app-link.svg', ROOT)));
  const web = read('scripts/build-web.mjs');
  assert.match(web, /\['pages\/app\.html', 'app\.html'\]/);
  assert.match(web, /'assets\/qr\/app-link\.svg'/);
  assert.match(read('assets/qr/README.md'), /https:\/\/calmforest\.cloud\/app\?utm_source=app_page&utm_medium=qr/);
});

test('구조화 데이터에 두 스토어 주소', () => {
  const html = read('index.html');
  const ld = JSON.parse(html.slice(html.indexOf('{', html.indexOf('application/ld+json')), html.indexOf('</script>', html.indexOf('application/ld+json'))));
  assert.ok(ld.sameAs.includes('https://apps.apple.com/kr/app/id6821420691'));
  assert.ok(ld.sameAs.includes('https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest'));
});

test('PWA manifest 에 관련 앱(Play·App Store), 웹 설치는 그대로', () => {
  const m = JSON.parse(read('assets/pwa/manifest.webmanifest'));
  assert.equal(m.prefer_related_applications, false);
  const play = m.related_applications.find(a => a.platform === 'play');
  assert.equal(play.id, 'com.cheorish.lab.calmforest');
  assert.ok(m.related_applications.some(a => a.platform === 'itunes' && a.url.includes('id6821420691')));
});

test('공개 안내서 페이지 끝에 스토어 배지(언어별), 게임 안 fragment 에는 없다', () => {
  const ko = guidePage('<section><h2>x</h2></section>', { lang: 'ko', path: '/guide/', title: 't', description: 'd' });
  assert.match(ko, /class="gp-apps"/);
  assert.match(ko, /href="\/app\?os=ios&amp;utm_source=guide"/);
  assert.match(ko, /href="\/app\?os=android&amp;utm_source=guide"/);
  assert.match(ko, /app-store-ko\.svg/);
  const en = guidePage('<section><h2>x</h2></section>', { lang: 'en', path: '/guide/en/', title: 't', description: 'd' });
  assert.match(en, /app-store-en\.svg/);
  assert.match(en, /google-play-en\.png/);
  for (const f of ['guide/guide.html', 'guide/guide-en.html']) assert.ok(!/apps\.apple\.com|play\.google\.com|\/app\?/.test(read(f)), f);
});

test('봇·링크 미리보기는 UA 에 Android 가 있어도, ?os= 가 있어도 안내 페이지', () => {
  const bots = [
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd)',
    'kakaotalk-scrap/1.0',
    'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
    'Twitterbot/1.0',
  ];
  for (const ua of bots) {
    assert.deepEqual(target({ ua }), { kind: 'page' }, ua);
    assert.deepEqual(target({ ua, search: '?os=android' }), { kind: 'page' }, ua);
  }
});

test('PC 안내 페이지는 5분 캐시, 스토어 리다이렉트는 캐시 금지', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<html></html>', { status: 200 }) } };
  const page = await onRequestGet({ request: new Request('https://calmforest.cloud/app', { headers: { 'user-agent': UA.windows } }), env });
  assert.equal(page.headers.get('cache-control'), 'public, max-age=300');
});

test('인앱 브라우저의 실제 사용자는 봇으로 보지 않는다', () => {
  const xApp = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 TwitterAndroid';
  const kakao = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 KAKAOTALK 10.8.0';
  for (const ua of [xApp, kakao]) assert.equal(target({ ua }).kind, 'redirect', ua);
});
