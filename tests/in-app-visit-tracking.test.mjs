import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handoffId, arrivalHandoff, withAttribution } from '../js/auth/in-app-browser.js';
import { mountInAppLogin, trackHandoffArrival } from '../js/auth/in-app-login.js';

const IG_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36 Instagram 350.0.0.42.95 Android (34/14; 450dpi; 1080x2340; samsung; SM-S918N; dm3q; qcom; ko_KR; 652178923)';
const CHROME = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36';

test('넘김 id 는 소문자·숫자 8자', () => {
  const seq = [0.1, 0.5, 0.9, 0.25, 0.75, 0.33, 0.66, 0.01];
  let i = 0;
  const id = handoffId(() => seq[i++ % seq.length]);
  assert.match(id, /^[a-z0-9]{8}$/);
  assert.match(handoffId(), /^[a-z0-9]{8}$/);
});

test('외부로 넘길 주소에 넘김 id(ho)를 싣는다', () => {
  const q = new URL(withAttribution('https://calmforest.cloud/?utm_source=meta', { handoff: 'ab12cd34' })).searchParams;
  assert.equal(q.get('ho'), 'ab12cd34');
  assert.equal(q.get('utm_source'), 'meta');
});

test('형식이 틀린 넘김 id 는 싣지 않는다', () => {
  for (const bad of ['', 'AB12CD34', 'ab12', 'ab12cd34<x>', null, 42]) {
    const q = new URL(withAttribution('https://calmforest.cloud/', { handoff: bad })).searchParams;
    assert.equal(q.get('ho'), null, String(bad));
  }
});

test('도착 주소에서 넘김 id 를 읽는다', () => {
  assert.equal(arrivalHandoff('?utm_source=meta&ho=ab12cd34'), 'ab12cd34');
  assert.equal(arrivalHandoff('?ho=AB12CD34'), null);
  assert.equal(arrivalHandoff('?ho=ab12cd34%3Cscript'), null);
  assert.equal(arrivalHandoff(''), null);
  assert.equal(arrivalHandoff(undefined), null);
});

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('넘어온 방문은 세션에 한 번만 inapp_arrive 로 남긴다', () => {
  const calls = [];
  const track = (name, p) => calls.push([name, p]);
  const storage = memoryStorage();
  assert.equal(trackHandoffArrival({ track, search: '?ho=ab12cd34', ua: CHROME, storage }), 'ab12cd34');
  assert.equal(trackHandoffArrival({ track, search: '?ho=ab12cd34', ua: CHROME, storage }), null);
  assert.deepEqual(calls, [['inapp_arrive', { hid: 'ab12cd34', in_app: false, os: 'android' }]]);
});

test('넘김이 실패해 다시 인앱으로 열리면 in_app: true 로 남는다', () => {
  const calls = [];
  trackHandoffArrival({ track: (n, p) => calls.push([n, p]), search: '?ho=ab12cd34', ua: IG_ANDROID, storage: memoryStorage() });
  assert.deepEqual(calls, [['inapp_arrive', { hid: 'ab12cd34', in_app: true, os: 'android' }]]);
});

test('넘김 id 가 없으면 아무것도 남기지 않는다', () => {
  const calls = [];
  assert.equal(trackHandoffArrival({ track: (n) => calls.push(n), search: '?utm_source=meta', ua: CHROME, storage: memoryStorage() }), null);
  assert.equal(calls.length, 0);
});

test('저장소가 막혀 있어도 기록은 남기고 멈추지 않는다', () => {
  const calls = [];
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(trackHandoffArrival({ track: (n) => calls.push(n), search: '?ho=ab12cd34', ua: CHROME, storage: broken }), 'ab12cd34');
  assert.deepEqual(calls, ['inapp_arrive']);
});

const fakeEl = () => {
  const listeners = {};
  return {
    listeners,
    classList: { add() {} },
    append() {},
    before() {},
    addEventListener(type, fn) { listeners[type] = fn; },
  };
};

const withFakeBrowser = (fn) => {
  const saved = { document: globalThis.document, location: globalThis.location, localStorage: globalThis.localStorage, setTimeout: globalThis.setTimeout };
  const els = [];
  globalThis.document = { body: fakeEl(), visibilityState: 'visible', createElement: () => { const e = fakeEl(); els.push(e); return e; } };
  globalThis.location = { href: 'https://calmforest.cloud/?utm_source=meta&utm_content=halloween' };
  globalThis.localStorage = memoryStorage();
  globalThis.setTimeout = () => 0;
  try { return fn(els); } finally { Object.assign(globalThis, saved); }
};

test('인앱으로 열리면 inapp_view 를 남긴다', () => {
  withFakeBrowser(() => {
    const calls = [];
    const r = mountInAppLogin({ $: () => fakeEl(), track: (n, p) => calls.push([n, p]), platform: 'web', ua: IG_ANDROID });
    assert.equal(r.inApp, true);
    assert.deepEqual(calls, [['inapp_view', { app: 'instagram', os: 'android' }]]);
  });
});

test('inapp_view 는 세션에 한 번만 남긴다', () => {
  withFakeBrowser(() => {
    const calls = [];
    const saved = globalThis.sessionStorage;
    globalThis.sessionStorage = memoryStorage();
    try {
      mountInAppLogin({ $: () => fakeEl(), track: (n) => calls.push(n), platform: 'web', ua: IG_ANDROID });
      mountInAppLogin({ $: () => fakeEl(), track: (n) => calls.push(n), platform: 'web', ua: IG_ANDROID });
    } finally { globalThis.sessionStorage = saved; }
    assert.deepEqual(calls, ['inapp_view']);
  });
});

test('인앱이 아니거나 웹이 아니면 inapp_view 를 남기지 않는다', () => {
  withFakeBrowser(() => {
    const calls = [];
    mountInAppLogin({ $: () => fakeEl(), track: (n) => calls.push(n), platform: 'web', ua: CHROME });
    mountInAppLogin({ $: () => fakeEl(), track: (n) => calls.push(n), platform: 'android', ua: IG_ANDROID });
    assert.equal(calls.length, 0);
  });
});

test('외부로 열기를 누르면 같은 넘김 id 를 이벤트와 주소에 함께 싣는다', () => {
  withFakeBrowser((els) => {
    const calls = [];
    mountInAppLogin({ $: () => fakeEl(), track: (n, p) => calls.push([n, p]), platform: 'web', ua: IG_ANDROID });
    const btn = els.find((e) => e.listeners.click);
    btn.listeners.click();
    const [name, p] = calls[1];
    assert.equal(name, 'inapp_handoff');
    assert.match(p.hid, /^[a-z0-9]{8}$/);
    assert.equal(p.ok, true);
    assert.ok(globalThis.location.href.startsWith('intent://'));
    const fallback = decodeURIComponent(globalThis.location.href.match(/S\.browser_fallback_url=([^;]+)/)[1]);
    assert.equal(new URL(fallback).searchParams.get('ho'), p.hid);
    assert.equal(new URL(fallback).searchParams.get('utm_content'), 'halloween');
  });
});

test('index.html 은 인증 전에 넘어온 방문을 기록한다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /import \{[^}]*\btrackHandoffArrival\b[^}]*\} from '\.\/js\/auth\/in-app-login\.js'/);
  assert.match(html, /trackHandoffArrival\(\{ track: trackEvent, search: location\.search, ua: navigator\.userAgent, storage: sessionStorage \}\)/);
  const at = html.indexOf('trackHandoffArrival({ track');
  const boot = html.indexOf('bootMetaPixel();');
  assert.ok(at > 0 && Math.abs(at - boot) < 600);
});
