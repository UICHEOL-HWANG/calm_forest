// 🍎 gc-auth Worker — 게임센터 신원 서명 → Supabase 세션
//  인증서는 테스트마다 openssl 로 자체 서명본을 만든다(실제 Apple 인증서와 같은 RSA-SHA256 X.509 DER).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSign, X509Certificate, randomBytes } from 'node:crypto';
import worker, { spkiFromCertDer, signedPayload, verifyGcSignature, gcIdentity, checkPublicKeyUrl } from '../gc-auth/src/index.js';

const dir = mkdtempSync(join(tmpdir(), 'gc-auth-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=gc-test',
  '-days', '1', '-keyout', join(dir, 'key.pem'), '-outform', 'DER', '-out', join(dir, 'cert.der')], { stdio: 'pipe' });
const KEY = readFileSync(join(dir, 'key.pem'), 'utf8');
const CERT = readFileSync(join(dir, 'cert.der'));
rmSync(dir, { recursive: true, force: true });

const BUNDLE = 'com.cheorish.lab.calmforest';
const CERT_URL = 'https://static.gc.apple.com/public-key/gc-prod-10.cer';
const ENV = {
  SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'service',
  GC_USER_SECRET: 'salt', GC_BUNDLE_ID: BUNDLE,
};

function sign({ teamPlayerID = 'T:_abc123', bundleID = BUNDLE, timestamp = Date.now(), salt = randomBytes(8) } = {}) {
  const s = createSign('RSA-SHA256');
  s.update(signedPayload({ teamPlayerID, bundleID, timestamp, salt: new Uint8Array(salt) }));
  return { publicKeyUrl: CERT_URL, signature: s.sign(KEY).toString('base64'), salt: Buffer.from(salt).toString('base64'),
           timestamp: String(timestamp), teamPlayerID, bundleID };
}

const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const post = (body) => new Request('https://gc.test/', { method: 'POST', body: JSON.stringify(body) });
function fakeFetch({ tokenOk = true } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url) === CERT_URL) return new Response(CERT, { status: 200 });
    if (String(url).includes('/auth/v1/token')) return tokenOk ? res(200, { access_token: 'at', refresh_token: 'rt' }) : res(400, {});
    if (String(url).includes('/auth/v1/admin/users')) { tokenOk = true; return res(200, {}); }
    throw new Error('unexpected fetch ' + url);
  };
  fn.calls = calls;
  return fn;
}

test('spkiFromCertDer — node 가 읽은 공개키와 같다', () => {
  const expected = new X509Certificate(CERT).publicKey.export({ type: 'spki', format: 'der' });
  assert.deepEqual(Buffer.from(spkiFromCertDer(new Uint8Array(CERT))), expected);
});

test('signedPayload — teamPlayerID ‖ bundleID ‖ timestamp(u64 BE) ‖ salt', () => {
  const p = signedPayload({ teamPlayerID: 'T:1', bundleID: 'b', timestamp: 258, salt: new Uint8Array([9, 9]) });
  assert.deepEqual([...p], [...Buffer.from('T:1b'), 0, 0, 0, 0, 0, 0, 1, 2, 9, 9]);
});

test('verifyGcSignature — 맞는 서명만 통과, 한 글자라도 바뀌면 거절', async () => {
  const b = sign();
  const args = { certDer: new Uint8Array(CERT), signature: b.signature, salt: b.salt, timestamp: b.timestamp, bundleID: BUNDLE };
  assert.equal(await verifyGcSignature({ ...args, teamPlayerID: b.teamPlayerID }), true);
  assert.equal(await verifyGcSignature({ ...args, teamPlayerID: 'T:_someone_else' }), false);
});

test('checkPublicKeyUrl — https 의 apple.com 하위 도메인만', () => {
  assert.equal(checkPublicKeyUrl(CERT_URL), true);
  for (const bad of ['http://static.gc.apple.com/a.cer', 'https://apple.com.evil.test/a.cer', 'https://evilapple.com/a.cer', 'not a url'])
    assert.equal(checkPublicKeyUrl(bad), false, bad);
});

test('gcIdentity — 합성 이메일 도메인 gc.calmforest.local · 원본 id 는 남기지 않는다', async () => {
  const id = await gcIdentity('salt', 'T:_abc123');
  assert.match(id.email, /^gc-[0-9a-f]{32}@gc\.calmforest\.local$/);
  assert.ok(!id.email.includes('abc123'));
  assert.equal(id.password, (await gcIdentity('salt', 'T:_abc123')).password);
  assert.notEqual(id.password, (await gcIdentity('salt', 'T:_other')).password);
});

test('handle — 첫 진입: 검증 → 유저 생성 → 세션', async () => {
  const f = fakeFetch({ tokenOk: false });
  const r = await worker.handle(post(sign()), ENV, { fetch: f });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { access_token: 'at', refresh_token: 'rt' });
  assert.ok(f.calls.some(c => c.url.includes('/admin/users')));
});

test('handle — 거절: 다른 앱 번들 · 오래된 서명 · 위조 서명 · 애플 밖 인증서 URL', async () => {
  const cases = [
    [{ ...sign({ bundleID: 'com.other.app' }) }, 401],
    [{ ...sign({ timestamp: Date.now() - 20 * 60 * 1000 }) }, 401],
    [{ ...sign(), teamPlayerID: 'T:_forged' }, 401],
    [{ ...sign(), publicKeyUrl: 'https://evil.test/key.cer' }, 400],
    [{ teamPlayerID: 'T:1' }, 400],
  ];
  for (const [body, status] of cases) {
    const f = fakeFetch();
    const r = await worker.handle(post(body), ENV, { fetch: f });
    assert.equal(r.status, status, JSON.stringify(body).slice(0, 80));
    assert.ok(!f.calls.some(c => c.url.includes('sb.test')), '검증 전에는 Supabase 를 부르지 않는다');
  }
});

test('handle — 시크릿 미설정이면 500, POST 외 405', async () => {
  const r = await worker.handle(post(sign()), { ...ENV, GC_USER_SECRET: '' }, { fetch: fakeFetch() });
  assert.equal(r.status, 500);
  const g = await worker.handle(new Request('https://gc.test/'), ENV, { fetch: fakeFetch() });
  assert.equal(g.status, 405);
});
