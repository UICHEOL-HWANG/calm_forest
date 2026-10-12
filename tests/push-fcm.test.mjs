// 🔔 FCM HTTP v1 — 서비스 계정 JWT(RS256) 서명·토큰 캐시·발송·죽은 토큰 판정
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { signJwt, getAccessToken, sendFcm } from '../functions/push/fcm.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = {
  project_id: 'demo-proj', client_email: 'push@demo-proj.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  token_uri: 'https://oauth2.googleapis.com/token',
};
const b64json = s => JSON.parse(Buffer.from(s, 'base64url').toString());

function fakeKv() {
  const m = new Map(), puts = [];
  return { m, puts, get: async k => m.get(k) ?? null, put: async (k, v, o) => { m.set(k, v); puts.push({ k, v, o }); } };
}

test('signJwt — RS256 서명이 공개키로 검증되고 claim 이 맞다', async () => {
  const jwt = await signJwt(SA, 1_700_000_000);
  const [h, p, s] = jwt.split('.');
  assert.deepEqual(b64json(h), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(b64json(p), { iss: SA.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: SA.token_uri, iat: 1_700_000_000, exp: 1_700_003_600 });
  const v = createVerify('RSA-SHA256'); v.update(`${h}.${p}`);
  assert.ok(v.verify(publicKey, Buffer.from(s, 'base64url')));
});

test('getAccessToken — 캐시 없으면 교환 후 KV 에 저장, 있으면 fetch 안 함', async () => {
  const kv = fakeKv(); const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return new Response(JSON.stringify({ access_token: 'ya29.x', expires_in: 3599 })); };
  const env = { FCM_SA_KEY: JSON.stringify(SA), CARDNEWS: kv };
  assert.equal(await getAccessToken(env, { fetch, now: 1_700_000_000_000 }), 'ya29.x');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, SA.token_uri);
  assert.match(String(calls[0].init.body), /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=/);
  assert.ok(kv.puts[0].o.expirationTtl <= 3300 && kv.puts[0].o.expirationTtl >= 60);
  assert.equal(await getAccessToken(env, { fetch, now: 1_700_000_000_000 }), 'ya29.x');
  assert.equal(calls.length, 1, '두 번째는 KV 캐시');
});

test('getAccessToken — 키가 없거나 깨졌으면 null(던지지 않음), 교환 실패도 null', async () => {
  const fetch = async () => new Response('{"error":"invalid_grant"}', { status: 400 });
  assert.equal(await getAccessToken({}, { fetch }), null);
  assert.equal(await getAccessToken({ FCM_SA_KEY: '{oops' }, { fetch }), null);
  assert.equal(await getAccessToken({ FCM_SA_KEY: JSON.stringify(SA) }, { fetch }), null);
});

test('sendFcm — v1 메시지 형태 + UNREGISTERED 는 죽은 토큰', async () => {
  let sent;
  const ok = async (url, init) => { sent = { url, init }; return new Response('{"name":"projects/demo-proj/messages/1"}'); };
  const r = await sendFcm({ projectId: 'demo-proj', accessToken: 'ya29.x', token: 'tok1',
    title: 'T', body: 'B', data: { kind: 'night', send_id: '42' } }, { fetch: ok });
  assert.deepEqual(r, { ok: true, status: 200, dead: false });
  assert.equal(sent.url, 'https://fcm.googleapis.com/v1/projects/demo-proj/messages:send');
  assert.equal(sent.init.headers.Authorization, 'Bearer ya29.x');
  const msg = JSON.parse(sent.init.body).message;
  assert.equal(msg.token, 'tok1');
  assert.deepEqual(msg.notification, { title: 'T', body: 'B' });
  assert.deepEqual(msg.data, { kind: 'night', send_id: '42' });
  assert.equal(msg.android.notification.icon, 'ic_stat_leaf');

  const gone = async () => new Response(JSON.stringify({ error: { status: 'NOT_FOUND',
    details: [{ '@type': 'type.googleapis.com/google.firebase.fcm.v1.FcmError', errorCode: 'UNREGISTERED' }] } }), { status: 404 });
  assert.deepEqual(await sendFcm({ projectId: 'p', accessToken: 'a', token: 't', title: 'T', body: 'B' }, { fetch: gone }),
    { ok: false, status: 404, dead: true });
  const wrongProject = async () => new Response(JSON.stringify({ error: { status: 'NOT_FOUND', message: 'Requested entity was not found.' } }), { status: 404 });
  assert.deepEqual(await sendFcm({ projectId: 'p', accessToken: 'a', token: 't', title: 'T', body: 'B' }, { fetch: wrongProject }),
    { ok: false, status: 404, dead: false }, '프로젝트 오설정 404 로 토큰을 지우지 않는다(UNREGISTERED 만)');
  const flaky = async () => new Response('{}', { status: 503 });
  assert.deepEqual(await sendFcm({ projectId: 'p', accessToken: 'a', token: 't', title: 'T', body: 'B' }, { fetch: flaky }),
    { ok: false, status: 503, dead: false }, '일시 장애로 토큰을 지우지 않는다');
  const boom = async () => { throw new Error('net'); };
  assert.deepEqual(await sendFcm({ projectId: 'p', accessToken: 'a', token: 't', title: 'T', body: 'B' }, { fetch: boom }),
    { ok: false, status: 0, dead: false });
});

test('🍎 iOS 알림음 — apns payload 에 sound default', async () => {
  let body;
  await sendFcm({ projectId: 'p', accessToken: 'a', token: 't', title: 'T', body: 'B' }, { fetch: async (u, i) => { body = JSON.parse(i.body); return new Response('{}'); } });
  assert.equal(body.message.apns.payload.aps.sound, 'default');
});
