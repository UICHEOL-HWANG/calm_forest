import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APP_BANNER, storeTarget, isHoldout, captureTouch, playReferrer, storeUrl, osLive,
  canShowToday, createAppBanner,
} from '../js/app-banner.js';

// 스펙: dev/active/app-banner-funnel/app-banner-funnel-plan.md (§2 기기 분기 · §3 동작 규칙 · §4 식별자 · §5 이벤트)

const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36',
  instagramAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
};

const LIVE = { ...DEFAULT_APP_BANNER, storeLive: { android: true, ios: true }, iosAppId: '1234567890', iosProviderToken: '999' };

test('storeTarget — 안드로이드·아이폰·아이패드(맥 위장)·PC 를 가른다', () => {
  assert.equal(storeTarget(UA.android, 5), 'android');
  assert.equal(storeTarget(UA.instagramAndroid, 5), 'android', '인스타 인앱 브라우저도 안드로이드');
  assert.equal(storeTarget(UA.iphone, 5), 'ios');
  assert.equal(storeTarget(UA.ipadOS, 5), 'ios', 'iPadOS 13+ 는 Mac 으로 위장 — 터치 지점으로 구분');
  assert.equal(storeTarget(UA.mac, 0), null, '진짜 맥');
  assert.equal(storeTarget(UA.windows, 0), null);
  assert.equal(storeTarget('', 0), null);
});

test('osLive — 스위치가 켜져야 하고 iOS 는 App ID 까지 있어야 한다', () => {
  assert.equal(osLive('android', DEFAULT_APP_BANNER), false, '기본값은 꺼짐(코드 먼저 배포)');
  assert.equal(osLive('ios', DEFAULT_APP_BANNER), false);
  assert.equal(osLive('android', LIVE), true);
  assert.equal(osLive('ios', LIVE), true);
  assert.equal(osLive('ios', { ...LIVE, iosAppId: '' }), false, 'App ID 없으면 막다른 링크라 끔');
  assert.equal(osLive(null, LIVE), false);
});

test('isHoldout — 같은 id 는 늘 같은 결과, 대략 10% 가 홀드아웃', () => {
  assert.equal(isHoldout('client-abc', 10), isHoldout('client-abc', 10));
  let n = 0;
  for (let i = 0; i < 5000; i++) if (isHoldout('c' + i, 10)) n++;
  assert.ok(n > 350 && n < 650, `홀드아웃 ${n}/5000`);
  assert.equal(isHoldout('', 10), false, 'id 가 없으면 배정하지 않는다(노출군)');
  assert.equal(isHoldout('x', 0), false, 'mod 0 이면 홀드아웃 끔');
});

test('captureTouch — jid 는 기기에 한 번 만들고, utm 은 마지막 유료 유입으로 갱신', () => {
  let k = 0; const mk = () => 'jid' + (++k);
  const first = captureTouch('?utm_source=meta&utm_campaign=webapp_202610&utm_content=hook_a', null, 1000, mk);
  assert.deepEqual(first, { jid: 'jid1', ts: 1000, utm: { source: 'meta', medium: '', campaign: 'webapp_202610', content: 'hook_a' } });
  const direct = captureTouch('', first, 2000, mk);
  assert.equal(direct, first, 'utm 없는 재방문은 그대로(같은 객체)');
  const again = captureTouch('?utm_source=meta&utm_content=hook_b', first, 3000, mk);
  assert.equal(again.jid, 'jid1', 'jid 는 바뀌지 않는다');
  assert.equal(again.utm.content, 'hook_b');
  assert.notEqual(again, first, '불변 갱신');
  const organic = captureTouch('?dbg=1', null, 4000, mk);
  assert.deepEqual(organic, { jid: 'jid2', ts: 4000, utm: null });
  const long = captureTouch('?utm_source=' + 'x'.repeat(300), null, 5000, mk);
  assert.equal(long.utm.source.length, 100, '값 길이 제한');
});

test('playReferrer — Play Install Referrer 로 넘길 utm + jid', () => {
  const touch = { jid: 'j1', ts: 1, utm: { source: 'meta', medium: 'paid_social', campaign: 'webapp_202610', content: 'hook_a' } };
  const raw = decodeURIComponent(playReferrer(touch));
  assert.equal(raw, 'utm_source=meta&utm_medium=web_banner&utm_campaign=webapp_202610&utm_content=hook_a&jid=j1');
  const organic = decodeURIComponent(playReferrer({ jid: 'j2', ts: 1, utm: null }));
  assert.equal(organic, 'utm_source=web&utm_medium=web_banner&jid=j2');
});

test('storeUrl — OS 별 스토어 링크, 꺼진 OS 는 null', () => {
  const touch = { jid: 'j1', ts: 1, utm: { source: 'meta', medium: '', campaign: 'c', content: '' } };
  const a = storeUrl('android', LIVE, touch);
  assert.match(a, /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.cheorish\.lab\.calmforest&referrer=/);
  assert.match(decodeURIComponent(a.split('referrer=')[1]), /jid=j1/);
  const i = storeUrl('ios', LIVE, touch);
  assert.equal(i, 'https://apps.apple.com/app/id1234567890?pt=999&ct=web_banner_meta&mt=8');
  assert.ok(!i.includes('j1'), 'ct 에 개인 ID 를 넣지 않는다');
  assert.equal(storeUrl('android', DEFAULT_APP_BANNER, touch), null);
  assert.ok(storeUrl('ios', LIVE, { jid: 'j', ts: 1, utm: { source: 'x'.repeat(80) } }).split('ct=')[1].split('&')[0].length <= 40);
});

test('canShowToday — 하루 1회, ✕ 두 번이면 영구 숨김(자동 사라짐은 안 셈)', () => {
  assert.equal(canShowToday(null, '2026-10-12', 2), true);
  assert.equal(canShowToday({ day: '2026-10-12', shown: true, dismissN: 0 }, '2026-10-12', 2), false);
  assert.equal(canShowToday({ day: '2026-10-11', shown: true, dismissN: 1 }, '2026-10-12', 2), true);
  assert.equal(canShowToday({ day: '2026-10-01', shown: true, dismissN: 2 }, '2026-10-12', 2), false);
});

// ── 컨트롤러 ────────────────────────────────────────────────
function harness(over = {}) {
  // 실제로는 페이지 로드 때 captureTouch 가 먼저 cf_first_touch 를 저장한다
  const store = new Map(Object.entries({ cf_first_touch: JSON.stringify({ jid: 'jid-test', ts: 1, utm: null }), ...(over.store || {}) }));
  const events = []; const renders = []; const timers = []; const nav = [];
  let hidden = 0; let now = over.now ?? 1_000_000; let guest = over.guest ?? false;
  const b = createAppBanner({
    config: over.config || LIVE,
    platform: over.platform || 'web',
    ua: over.ua || UA.android, maxTouchPoints: 5,
    storage: { get: k => store.has(k) ? JSON.parse(store.get(k)) : null, set: (k, v) => store.set(k, JSON.stringify(v)) },
    now: () => now, today: () => over.today || '2026-10-12',
    isGuest: () => guest, clientId: () => over.clientId ?? 'client-abc',
    holdout: over.holdout ?? (() => false),
    suppressed: over.suppressed || (() => null),
    render: (v) => { renders.push(v); return over.visible ?? true; },
    hide: () => { hidden++; },
    connect: () => { events.push(['connect']); },
    navigate: (u) => nav.push(u),
    track: (n, p) => events.push([n, p]),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeout: () => {},
  });
  return { b, store, events, renders, timers, nav, get hidden() { return hidden; }, setGuest: g => { guest = g; }, tick: ms => { now += ms; } };
}

test('웹이 아니거나, PC 이거나, 스토어가 안 열린 OS 면 아무것도 안 한다', () => {
  for (const h of [harness({ platform: 'android' }), harness({ platform: 'toss' }), harness({ ua: UA.windows }), harness({ config: DEFAULT_APP_BANNER })]) {
    h.b.start();
    h.b.onEvent('harvest_crop');
    assert.equal(h.renders.length, 0);
    assert.equal(h.events.length, 0, '홀드아웃 기록도 없음');
    assert.equal(h.timers.length, 0, '대체 트리거 타이머도 안 건다');
  }
});

test('첫 harvest_crop 에서 한 번 뜨고 shown 을 기록한다', () => {
  const h = harness();
  h.b.start();
  h.b.onEvent('chop_tree');
  assert.equal(h.renders.length, 0);
  h.b.onEvent('harvest_crop');
  assert.deepEqual(h.renders[0], { os: 'android', guest: false });
  assert.deepEqual(h.events[0], ['app_banner_shown', { os: 'android', trigger: 'harvest', is_guest: false }]);
  h.b.onEvent('harvest_crop');
  assert.equal(h.renders.length, 1, '세션 중 다시 안 뜬다');
  assert.equal(JSON.parse(h.store.get('cf_app_banner')).shown, true);
});

test('수확이 없으면 5분 대체 트리거', () => {
  const h = harness();
  h.b.start();
  const t = h.timers.find(x => x.ms === LIVE.fallbackSec * 1000);
  assert.ok(t, '5분 타이머');
  t.fn();
  assert.equal(h.events[0][1].trigger, 'time');
});

test('오늘 이미 봤으면 안 뜬다', () => {
  const h = harness({ store: { cf_app_banner: JSON.stringify({ day: '2026-10-12', shown: true, dismissN: 0 }) } });
  h.b.start();
  h.b.onEvent('harvest_crop');
  assert.equal(h.renders.length, 0);
});

test('홀드아웃 — 배너 없이 holdout 만 기록, 하루 1회', () => {
  const h = harness({ holdout: () => true });
  h.b.start();
  h.b.onEvent('harvest_crop');
  assert.equal(h.renders.length, 0);
  assert.deepEqual(h.events, [['app_banner_holdout', { os: 'android', trigger: 'harvest' }]]);
  h.b.onEvent('harvest_crop');
  assert.equal(h.events.length, 1);
});

test('가려진 상태면 노출로 치지 않고 잠시 뒤 다시 시도한다', () => {
  let why = 'menu';
  const h = harness({ suppressed: () => why });
  h.b.start();
  h.b.onEvent('harvest_crop');
  assert.equal(h.renders.length, 0);
  assert.equal(h.events.length, 0, 'shown 을 찍지 않는다');
  const retry = h.timers.filter(x => x.ms === LIVE.retryMs).at(-1);
  assert.ok(retry, '재시도 예약');
  why = null;
  retry.fn();
  assert.equal(h.renders.length, 1);
  assert.equal(h.events[0][0], 'app_banner_shown');
});

test('CSS 가 숨겨서 실제로 안 보이면(render=false) 노출로 치지 않는다', () => {
  const h = harness({ visible: false });
  h.b.start();
  h.b.onEvent('harvest_crop');
  assert.equal(h.events.length, 0);
  assert.equal(h.hidden, 1, '숨겨진 배너를 걷어낸다');
  assert.ok(h.timers.some(x => x.ms === LIVE.retryMs));
});

test('10초 자동 사라짐 — dismiss(reason=timeout), ✕ 횟수에 안 셈', () => {
  const h = harness();
  h.b.start();
  h.b.onEvent('harvest_crop');
  const auto = h.timers.find(x => x.ms === LIVE.autoHideMs);
  auto.fn();
  assert.deepEqual(h.events.at(-1), ['app_banner_dismiss', { os: 'android', reason: 'timeout', dismiss_n: 0 }]);
  assert.equal(h.hidden, 1);
});

test('✕ 닫기 — dismiss(reason=close) 누적, 두 번이면 다음 날도 안 뜸', () => {
  const h = harness({ store: { cf_app_banner: JSON.stringify({ day: '2026-10-11', shown: true, dismissN: 1 }) } });
  h.b.start();
  h.b.onEvent('harvest_crop');
  h.b.dismiss();
  assert.deepEqual(h.events.at(-1), ['app_banner_dismiss', { os: 'android', reason: 'close', dismiss_n: 2 }]);
  assert.equal(canShowToday(JSON.parse(h.store.get('cf_app_banner')), '2026-10-13', LIVE.maxDismiss), false);
});

test('로그인 유저 클릭 → click 기록 후 스토어로', () => {
  const h = harness();
  h.b.start();
  h.b.onEvent('harvest_crop');
  h.b.click();
  const click = h.events.find(e => e[0] === 'app_banner_click');
  assert.equal(click[1].os, 'android');
  assert.equal(click[1].is_guest, false);
  assert.ok(click[1].jid, 'jid 를 실어 앱 첫 실행과 잇는다');
  assert.match(h.nav[0], /^https:\/\/play\.google\.com\//);
  assert.ok(h.nav[0].includes(encodeURIComponent('jid=' + click[1].jid)));
});

test('게스트 클릭 → 로그인부터, 로그인 뒤 다음 부팅에 로그인판 배너가 한 번 더 뜬다', () => {
  const h = harness({ guest: true });
  h.b.start();
  h.b.onEvent('harvest_crop');
  assert.deepEqual(h.renders[0], { os: 'android', guest: true });
  h.b.click();
  return Promise.resolve().then(() => {
  assert.deepEqual(h.events.at(-1), ['connect']);
  assert.equal(h.nav.length, 0, '게스트는 바로 스토어로 안 보낸다');
  assert.equal(JSON.parse(h.store.get('cf_app_banner')).pending.os, 'android');

  // 구글 로그인은 페이지 리다이렉트 — 같은 저장소로 새로 부팅
  const h2 = harness({ guest: false, store: Object.fromEntries(h.store) });
  h2.b.start();
  assert.deepEqual(h2.renders[0], { os: 'android', guest: false }, '하루 1회 상한과 무관하게 바로');
  assert.equal(h2.events[0][1].trigger, 'post_login');
  assert.equal(JSON.parse(h2.store.get('cf_app_banner')).pending, null, '한 번만');
  });
});

test('게스트가 로그인 안 하고 돌아오면 pending 은 남지만 배너를 강제로 띄우지 않는다', () => {
  const h = harness({ guest: true, store: { cf_app_banner: JSON.stringify({ day: '2026-10-12', shown: true, dismissN: 0, pending: { os: 'android', ts: 1_000_000 } }) } });
  h.b.start();
  assert.equal(h.renders.length, 0);
});

test('debugShow — 강제 표시(QA 용), 기록·상한 없음', () => {
  const h = harness({ config: DEFAULT_APP_BANNER });
  h.b.debugShow('ios', true);
  assert.deepEqual(h.renders[0], { os: 'ios', guest: true });
  assert.equal(h.events.length, 0);
});

// ── 연결 ────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('연결 — 인증 전에 jid·utm 을 남기고, 플레이 진입 후 배너를 붙인다', () => {
  assert.match(html, /import \{ bootAppBanner, mountAppBanner \} from '\.\/js\/app-banner-ui\.js'/);
  const boot = html.indexOf('bootAppBanner();');
  const initAuthCall = html.indexOf('initAuth(', boot);
  assert.ok(boot > 0 && initAuthCall > boot, 'bootAppBanner 가 initAuth 보다 먼저(구글 리다이렉트가 쿼리를 지우기 전)');
  const enter = html.indexOf('async function enterPlay()');
  const mount = html.indexOf('mountAppBanner({', enter);
  assert.ok(mount > html.indexOf('await enterGame();', enter), 'enterGame 뒤에 붙인다');
  assert.match(html.slice(mount, mount + 600), /platform: PLATFORM/);
  assert.match(html.slice(mount, mount + 600), /devParam: IS_DEV_SESSION \?/, 'QA 파라미터는 dev 세션에서만');
});

test('CSS — 반응형(400·360px)·짧은 화면 상단 배치·숨김 상태', () => {
  assert.match(html, /@media \(max-width: 400px\) \{ #app-banner \.ab-play \{ display: none; \} \}/);
  assert.match(html, /@media \(max-width: 360px\) \{ #app-banner img \{ display: none; \}/);
  assert.match(html, /@media \(max-width: 760px\) and \(max-height: 760px\) \{\s*#app-banner \{ bottom: auto; top: max\(/);
  assert.match(html, /body\.app-banner-on #story-chip, body\.app-banner-on #quest-panel \{ display: none !important; \}/);
  for (const c of ['menu-open', 'sea-mode', 'guide-open', 'mg-open', 'coaching', 'decor-guide', 'mist-guide', 'boat-run', 'dream-cut']) {
    assert.ok(html.includes(`body.${c} #app-banner`), `${c} 상태에서 숨김`);
  }
});

test('영어판 — 배너 문구가 한국어 없이 번역된다', async () => {
  globalThis.location ??= { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/' };
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { EN } = await import('../js/i18n-en.js');
  for (const k of ['이 마을, 앱에서도 만나요', '지금 마을 그대로 이어져요', '로그인하면 지금 마을 그대로 가져가요', '로그인하고 받기', '배너 닫기']) {
    assert.ok(EN[k] && !/[가-힣]/.test(EN[k]), k);
  }
});

test('기본 설정 — 출시 확인 전엔 두 OS 모두 꺼져 있다', async () => {
  const { TUNING } = await import('../js/tuning.js');
  const cfg = { ...DEFAULT_APP_BANNER, ...TUNING.appBanner };
  assert.equal(cfg.androidPackage, 'com.cheorish.lab.calmforest');
  assert.equal(typeof cfg.storeLive.android, 'boolean');
  assert.equal(typeof cfg.storeLive.ios, 'boolean');
});

// ── 리뷰 반영(2026-10-12) ───────────────────────────────────
test('post_login — 가려져 있으면 pending 을 지우지 않고 다시 시도한다', () => {
  let why = 'coaching';
  const h = harness({ suppressed: () => why, store: { cf_app_banner: JSON.stringify({ day: '2026-10-12', shown: true, dismissN: 0, pending: { os: 'android', ts: 1_000_000 } }) } });
  h.b.start();
  assert.equal(h.renders.length, 0);
  assert.deepEqual(JSON.parse(h.store.get('cf_app_banner')).pending, { os: 'android', ts: 1_000_000 }, '아직 안 보였으니 남긴다');
  const retry = h.timers.filter(x => x.ms === LIVE.retryMs).at(-1);
  why = null;
  retry.fn();
  assert.deepEqual(h.renders[0], { os: 'android', guest: false });
  assert.equal(h.events[0][1].trigger, 'post_login');
  assert.equal(JSON.parse(h.store.get('cf_app_banner')).pending, null);
});

test('post_login — 하루 지난 pending 은 버린다(나중에 다른 경로로 로그인한 경우)', () => {
  const h = harness({ now: 1_000_000 + 25 * 3600_000, store: { cf_app_banner: JSON.stringify({ day: '2026-10-11', shown: true, dismissN: 0, pending: { os: 'android', ts: 1_000_000 } }) } });
  h.b.start();
  assert.equal(h.events.some(e => e[1]?.trigger === 'post_login'), false);
  assert.equal(JSON.parse(h.store.get('cf_app_banner')).pending, null);
});

test('post_login — ✕ 두 번(영구 숨김)이면 띄우지 않는다', () => {
  const h = harness({ store: { cf_app_banner: JSON.stringify({ day: '2026-10-12', shown: true, dismissN: 2, pending: { os: 'android', ts: 1_000_000 } }) } });
  h.b.start();
  assert.equal(h.renders.length, 0);
});

test('게스트 연결이 실패(reject)하면 pending 을 지운다', async () => {
  const store = new Map([['cf_first_touch', JSON.stringify({ jid: 'j', ts: 1, utm: null })]]);
  const b = createAppBanner({
    config: LIVE, platform: 'web', ua: UA.android, maxTouchPoints: 5,
    storage: { get: k => store.has(k) ? JSON.parse(store.get(k)) : null, set: (k, v) => store.set(k, JSON.stringify(v)) },
    now: () => 1, today: () => '2026-10-12', isGuest: () => true, clientId: () => 'c', holdout: () => false,
    suppressed: () => null, render: () => true, hide: () => {}, navigate: () => {}, track: () => {},
    connect: () => Promise.reject(new Error('popup closed')),
    setTimeout: () => 0, clearTimeout: () => {},
  });
  b.onEvent('harvest_crop');
  b.click();
  await new Promise(r => setImmediate(r));
  assert.equal(JSON.parse(store.get('cf_app_banner')).pending, null);
});

test('referrer — utm 값 안의 & = 로 jid 를 위조할 수 없다, 값은 60자까지', () => {
  const touch = captureTouch('?utm_source=x&utm_campaign=a%26jid%3Dforged', null, 1, () => 'real');
  const decoded = decodeURIComponent(playReferrer(touch));
  const params = new URLSearchParams(decoded);
  assert.deepEqual(params.getAll('jid'), ['real']);
  assert.equal(params.get('utm_campaign'), 'a&jid=forged');
  const long = playReferrer({ jid: 'j', ts: 1, utm: { source: 'x'.repeat(100), campaign: 'y'.repeat(100) } });
  assert.ok(decodeURIComponent(long).length < 300);
});

test('첫 수확만 트리거 — 재시도가 끝난 뒤 다음 수확으로 다시 뜨지 않는다', () => {
  const h = harness({ suppressed: () => 'modal' });
  h.b.start();
  h.b.onEvent('harvest_crop');
  for (let i = 0; i <= LIVE.maxRetries; i++) h.timers.filter(x => x.ms === LIVE.retryMs).at(-1)?.fn();
  const before = h.timers.length;
  h.b.onEvent('harvest_crop');
  assert.equal(h.timers.length, before, '두 번째 수확은 새로 시도하지 않는다');
});

test('연결부 — 덮인 배너는 노출로 안 친다(elementFromPoint), 나룻배·꿈 연출 중엔 억제', () => {
  const ui = readFileSync(new URL('../js/app-banner-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /document\.elementFromPoint\(/);
  assert.match(ui, /return shownOnTop\(\);/);
  assert.match(ui, /'boat-run', 'dream-cut'/);
});
