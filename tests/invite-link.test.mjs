import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  inviteUrl, readInviteParam, inviteFromReferrer, normalizeInviteCode, canEnterCode, bindMessage, MSG,
} from '../js/referral/rules.js';
import { bindWithCode, captureNativeInvite, INVITE_BOUND_KEY } from '../js/referral/flow.js';
import { INVITE_STORE_KEY } from '../js/referral/rules.js';
import { captureTouch, playReferrer } from '../js/app-banner.js';
import { inviteLinkTarget, onRequestGet as inviteLink, wellKnown } from '../functions/invite-link.js';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const mem = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

test('inviteUrl — 앱·웹·itch 공용 짧은 링크 /i/CODE', () => {
  assert.equal(inviteUrl('ABCD2345'), 'https://calmforest.cloud/i/ABCD2345');
});

test('readInviteParam — /i/CODE 경로 링크도 읽는다(앱 진입 URL·붙여 넣은 링크)', () => {
  assert.equal(readInviteParam('https://calmforest.cloud/i/abcd2345'), 'ABCD2345');
  assert.equal(readInviteParam('https://calmforest.cloud/i/ABCD2345/'), 'ABCD2345');
  assert.equal(readInviteParam('https://calmforest.cloud/i/ABCD2345?utm_source=x'), 'ABCD2345');
  assert.equal(readInviteParam('/i/ABCD2345'), 'ABCD2345');
  assert.equal(readInviteParam('https://calmforest.cloud/i/FOREST24'), null, 'O 가 든 코드는 무효');
  assert.equal(readInviteParam('https://calmforest.cloud/x/i/ABCD2345'), null, '/i/ 는 경로 맨 앞만');
  assert.equal(readInviteParam('?invite=ABCD2345'), 'ABCD2345', '기존 ?invite= 그대로');
  assert.equal(readInviteParam('intoss://calmforest?invite=ABCD2345'), 'ABCD2345', '토스 그대로');
});

test('inviteFromReferrer — Play referrer 원문(한 번 더 인코딩된 것 포함)에서 코드', () => {
  assert.equal(inviteFromReferrer('utm_source=web&utm_medium=login_card&invite=abcd2345'), 'ABCD2345');
  assert.equal(inviteFromReferrer(encodeURIComponent('utm_source=web&invite=ABCD2345')), 'ABCD2345');
  assert.equal(inviteFromReferrer('utm_source=google-play&utm_medium=organic'), null);
  assert.equal(inviteFromReferrer(''), null);
  assert.equal(inviteFromReferrer(null), null);
});

test('normalizeInviteCode — 손으로 넣은 코드: 공백·하이픈 제거, 대문자, 형식 검사', () => {
  assert.equal(normalizeInviteCode(' abcd-2345 '), 'ABCD2345');
  assert.equal(normalizeInviteCode('https://calmforest.cloud/i/abcd2345'), 'ABCD2345', '링크를 통째로 붙여 넣어도');
  assert.equal(normalizeInviteCode('ABCD234'), null);
  assert.equal(normalizeInviteCode('ABCD0O11'), null);
  assert.equal(normalizeInviteCode(''), null);
});

test('canEnterCode — 로그인 계정 · 가입 72시간 안 · 이 기기에서 아직 연결 전', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  const fresh = new Date(now - 3600e3).toISOString();
  const old = new Date(now - 73 * 3600e3).toISOString();
  const base = { isGuest: false, provider: 'google', createdAt: fresh, now, bound: false };
  assert.equal(canEnterCode(base), true);
  assert.equal(canEnterCode({ ...base, isGuest: true, provider: 'anonymous' }), false);
  assert.equal(canEnterCode({ ...base, provider: 'offline' }), false);
  assert.equal(canEnterCode({ ...base, createdAt: old }), false);
  assert.equal(canEnterCode({ ...base, createdAt: null }), false, '가입 시각을 모르면 안 보인다');
  assert.equal(canEnterCode({ ...base, bound: true }), false);
});

test('bindMessage — 손으로 넣었을 때만 "이미 연결" 을 말한다', () => {
  assert.equal(bindMessage({ ok: false, reason: 'already_bound' }), null);
  assert.equal(bindMessage({ ok: false, reason: 'already_bound' }, { manual: true }), MSG.alreadyBound);
  assert.equal(bindMessage({ ok: true }, { manual: true }), MSG.bindOk);
});

test('bindWithCode — 성공·이미 연결이면 연결 표시를 남기고 보관 코드를 지운다', async () => {
  const s = mem({ [INVITE_STORE_KEY]: 'ABCD2345' });
  const toasts = [], tracks = [], resyncs = [];
  const res = await bindWithCode({
    code: 'ABCD2345', storage: s, platform: 'android', manual: false,
    call: async (a, b) => { assert.equal(a, 'bind'); assert.deepEqual(b, { code: 'ABCD2345', platform: 'android' }); return { ok: true }; },
    toast: (m) => toasts.push(m), track: (n, p) => tracks.push([n, p]), resync: async (r) => resyncs.push(r),
  });
  assert.equal(res.ok, true);
  assert.deepEqual(toasts, [MSG.bindOk]);
  assert.deepEqual(tracks, [['referral_bind', { result: 'ok' }]]);
  assert.deepEqual(resyncs, ['referral_bind']);
  assert.equal(s.getItem(INVITE_STORE_KEY), null);
  assert.equal(s.getItem(INVITE_BOUND_KEY), '1');

  const s2 = mem();
  await bindWithCode({ code: 'ABCD2345', storage: s2, platform: 'web', manual: true, call: async () => ({ ok: false, reason: 'already_bound' }), toast: (m) => toasts.push(m), track: () => {}, resync: async () => {} });
  assert.equal(toasts.at(-1), MSG.alreadyBound);
  assert.equal(s2.getItem(INVITE_BOUND_KEY), '1');
});

test('bindWithCode — 네트워크 실패면 코드를 남기고, 거절이면 지우되 연결 표시는 안 남긴다', async () => {
  const s = mem({ [INVITE_STORE_KEY]: 'ABCD2345' });
  const tracks = [];
  await bindWithCode({ code: 'ABCD2345', storage: s, platform: 'web', call: async () => null, toast: () => {}, track: (n, p) => tracks.push(p), resync: async () => {} });
  assert.equal(s.getItem(INVITE_STORE_KEY), 'ABCD2345');
  assert.deepEqual(tracks.at(-1), { result: 'net_fail' });
  await bindWithCode({ code: 'ABCD2345', storage: s, platform: 'web', call: async () => ({ ok: false, reason: 'not_new' }), toast: () => {}, track: (n, p) => tracks.push(p), resync: async () => {} });
  assert.equal(s.getItem(INVITE_STORE_KEY), null);
  assert.equal(s.getItem(INVITE_BOUND_KEY), null);
});

test('captureNativeInvite — 앱 링크 진입 우선, 없으면 설치 기록, 보관된 코드는 설치 기록이 덮지 않는다', () => {
  const tracks = [];
  const track = (n, p) => tracks.push([n, p]);
  const a = mem();
  assert.equal(captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/ABCD2345', referrerRaw: 'invite=WXYZ2345', storage: a, track }), 'ABCD2345');
  assert.deepEqual(tracks.at(-1), ['invite_land', { from: 'link' }]);
  const b = mem();
  assert.equal(captureNativeInvite({ launchUrl: '', referrerRaw: 'utm_source=web&invite=WXYZ2345', storage: b, track }), 'WXYZ2345');
  assert.deepEqual(tracks.at(-1), ['invite_land', { from: 'install' }]);
  const n = tracks.length;
  const c = mem({ [INVITE_STORE_KEY]: 'ABCD2345' });
  assert.equal(captureNativeInvite({ launchUrl: null, referrerRaw: 'invite=WXYZ2345', storage: c, track }), 'ABCD2345');
  assert.equal(tracks.length, n, '설치 기록은 이미 보관된 코드를 덮지 않고 다시 세지도 않는다');
  const d = mem({ [INVITE_STORE_KEY]: 'ABCD2345' });
  assert.equal(captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/WXYZ2345', referrerRaw: '', storage: d, track }), 'WXYZ2345', '새로 누른 링크는 새 코드');
  assert.equal(captureNativeInvite({ launchUrl: null, referrerRaw: null, storage: mem(), track }), null);
});

test('captureNativeInvite — 한 번 처리한 링크 진입이 다시 넘어와도 또 보관·집계하지 않는다(최근 앱 복원)', () => {
  const tracks = [];
  const track = (n, p) => tracks.push([n, p]);
  const s = mem();
  captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/ABCD2345', referrerRaw: null, storage: s, track });
  s.removeItem(INVITE_STORE_KEY);
  const n = tracks.length;
  assert.equal(captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/ABCD2345', referrerRaw: null, storage: s, track }), null);
  assert.equal(s.getItem(INVITE_STORE_KEY), null);
  assert.equal(tracks.length, n);
  assert.equal(captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/WXYZ2345', referrerRaw: null, storage: s, track }), 'WXYZ2345', '다른 코드는 새 링크');
});

test('captureNativeInvite — 이 기기에서 이미 연결됐으면 링크·설치 기록 모두 무시', () => {
  const s = mem({ [INVITE_BOUND_KEY]: '1' });
  assert.equal(captureNativeInvite({ launchUrl: 'https://calmforest.cloud/i/ABCD2345', referrerRaw: 'invite=WXYZ2345', storage: s, track: () => assert.fail('집계 금지') }), null);
  assert.equal(s.getItem(INVITE_STORE_KEY), null);
});

test('bindWithCode — 같은 코드로 이미 연결 중이면 두 번째 호출은 서버를 부르지 않는다', async () => {
  let calls = 0, release;
  const gate = new Promise(r => { release = r; });
  const deps = { code: 'ABCD2345', storage: mem(), platform: 'android', toast: () => {}, track: () => {}, resync: async () => {}, call: async () => { calls++; await gate; return { ok: true }; } };
  const first = bindWithCode(deps);
  const second = await bindWithCode(deps);
  assert.equal(second, null);
  release();
  await first;
  assert.equal(calls, 1);
  await bindWithCode({ ...deps, call: async () => { calls++; return { ok: false, reason: 'already_bound' }; } });
  assert.equal(calls, 2, '끝난 뒤에는 다시 부를 수 있다');
});

test('captureTouch — ?invite= 를 첫 방문 기록에 담는다(직접 재방문도), 없으면 키 자체가 없다', () => {
  let k = 0; const mk = () => 'j' + (++k);
  const first = captureTouch('?invite=abcd2345', null, 1, mk);
  assert.deepEqual(first, { jid: 'j1', ts: 1, utm: null, invite: 'ABCD2345' });
  const plain = captureTouch('', null, 2, mk);
  assert.equal('invite' in plain, false);
  const later = captureTouch('?invite=WXYZ2345', plain, 3, mk);
  assert.equal(later.invite, 'WXYZ2345');
  assert.equal(later.jid, plain.jid);
  const kept = captureTouch('', later, 4, mk);
  assert.equal(kept, later, '쿼리 없는 재방문은 그대로');
  const paid = captureTouch('?utm_source=meta', later, 5, mk);
  assert.equal(paid.invite, 'WXYZ2345', '유료 유입 갱신이 초대 코드를 지우지 않는다');
});

test('playReferrer — 초대 코드가 있으면 invite 를 싣고, 값 위조는 막는다', () => {
  const raw = decodeURIComponent(playReferrer({ jid: 'j1', utm: null, invite: 'ABCD2345' }, 'login_card'));
  assert.equal(raw, 'utm_source=web&utm_medium=login_card&jid=j1&invite=ABCD2345');
  const forged = decodeURIComponent(playReferrer({ jid: 'j1', utm: { source: 'x&invite=WXYZ2345' } }));
  assert.equal(new URLSearchParams(forged).getAll('invite').length, 0);
  assert.equal(inviteFromReferrer(playReferrer({ jid: 'j', utm: null, invite: 'ABCD2345' })), 'ABCD2345', '앱 쪽 파서와 짝이 맞는다');
});

test('Worker /i/CODE — 웹 게임 ?invite= 로, 틀린 코드는 첫 화면으로', async () => {
  assert.equal(inviteLinkTarget('/i/abcd2345'), '/?invite=ABCD2345');
  assert.equal(inviteLinkTarget('/i/ABCD2345/'), '/?invite=ABCD2345');
  assert.equal(inviteLinkTarget('/i/<script>'), '/');
  assert.equal(inviteLinkTarget('/i/'), '/');
  const res = await inviteLink({ request: new Request('https://calmforest.cloud/i/ABCD2345?utm_source=kakao') });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://calmforest.cloud/?invite=ABCD2345&utm_source=kakao');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const post = await inviteLink({ request: new Request('https://calmforest.cloud/i/ABCD2345', { method: 'POST' }) });
  assert.equal(post.status, 405);
});

test('Worker .well-known — AASA 는 확장자가 없어도 application/json', async () => {
  const env = { ASSETS: { fetch: async () => new Response('{"applinks":{}}', { headers: { 'content-type': 'application/octet-stream' } }) } };
  const res = await wellKnown({ request: new Request('https://calmforest.cloud/.well-known/apple-app-site-association'), env });
  assert.equal(res.headers.get('content-type'), 'application/json');
  assert.equal(await res.text(), '{"applinks":{}}');
});

test('worker/index.js 가 /i/ 와 AASA 경로를 연결한다', () => {
  const w = read('worker/index.js');
  assert.match(w, /from '\.\.\/functions\/invite-link\.js'/);
  assert.match(w, /pathname\.startsWith\('\/i\/'\)/);
  assert.match(w, /pathname === '\/\.well-known\/apple-app-site-association'/);
});

test('.well-known 원본 — assetlinks 는 Play 서명 지문 3개, AASA 는 팀ID.번들ID 와 /i/*', () => {
  const al = JSON.parse(read('assets/well-known/assetlinks.json'));
  assert.equal(al[0].target.package_name, 'com.cheorish.lab.calmforest');
  assert.deepEqual(al[0].relation, ['delegate_permission/common.handle_all_urls']);
  assert.equal(al[0].target.sha256_cert_fingerprints.length, 3);
  for (const f of al[0].target.sha256_cert_fingerprints) assert.match(f, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  const aasa = JSON.parse(read('assets/well-known/apple-app-site-association'));
  assert.deepEqual(aasa.applinks.details[0].appIDs, ['YW465H4L6Q.com.cheorish.lab.calmforest']);
  assert.deepEqual(aasa.applinks.details[0].components, [{ '/': '/i/*' }]);
});

test('build-web·serve.py 가 .well-known 두 파일을 내보낸다', () => {
  const b = read('scripts/build-web.mjs');
  assert.match(b, /\['assets\/well-known\/assetlinks\.json', '\.well-known\/assetlinks\.json'\]/);
  assert.match(b, /\['assets\/well-known\/apple-app-site-association', '\.well-known\/apple-app-site-association'\]/);
  const s = read('scripts/serve.py');
  assert.match(s, /'\/\.well-known\/assetlinks\.json': 'assets\/well-known\/assetlinks\.json'/);
  assert.match(s, /'\/\.well-known\/apple-app-site-association': 'assets\/well-known\/apple-app-site-association'/);
});

test('안드로이드 — /i/ 링크를 앱이 연다(autoVerify)', () => {
  const m = read('android/app/src/main/AndroidManifest.xml');
  assert.match(m, /<intent-filter android:autoVerify="true">[\s\S]*?android\.intent\.action\.VIEW[\s\S]*?android\.intent\.category\.BROWSABLE[\s\S]*?android:scheme="https"[\s\S]*?android:host="calmforest\.cloud"[\s\S]*?android:pathPrefix="\/i\/"[\s\S]*?<\/intent-filter>/);
});

test('iOS — Associated Domains 에 applinks:calmforest.cloud', () => {
  const e = read('ios/App/App/App.entitlements');
  assert.match(e, /<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>\s*<string>applinks:calmforest\.cloud<\/string>\s*<\/array>/);
});

test('@capacitor/app 이 두 앱에 들어간다', () => {
  const p = JSON.parse(read('package.json'));
  assert.ok(p.dependencies['@capacitor/app'], 'package.json');
  assert.ok(existsSync(new URL('node_modules/@capacitor/app/package.json', ROOT)), 'node_modules');
});

test('referral/index.js — 네이티브 진입 코드를 연결 전에 기다리고, 켜진 앱 재진입도 받는다', () => {
  const src = read('js/referral/index.js');
  assert.match(src, /capPlugin\('App'\)/);
  assert.match(src, /capListen\('App', 'appUrlOpen'/);
  assert.match(src, /if \(memo\.nativeBoot\) await withTimeout\(memo\.nativeBoot, null\);/);
  assert.match(src, /captureNativeInvite\(/);
});
