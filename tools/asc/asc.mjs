#!/usr/bin/env node
// =============================================================
//  🍎 App Store Connect API 최소 클라이언트 — 의존성 0 (Node 22 fetch + crypto)
//  키는 맥 키체인에서만 읽는다(저장소 PUBLIC — 파일·환경변수에 두지 않는다):
//    calmforest-asc-p8(base64 .p8) · calmforest-asc-key-id · calmforest-asc-issuer
//  사용: node tools/asc/asc.mjs GET /v1/apps?filter[bundleId]=com.cheorish.lab.calmforest
//        node tools/asc/asc.mjs PATCH /v1/... '{"data":{...}}'
//  라이브러리로: import { asc } from './asc.mjs'
// =============================================================
import { execFileSync } from 'node:child_process';
import { createPrivateKey, sign } from 'node:crypto';

const kc = (s) => execFileSync('security', ['find-generic-password', '-a', 'calmforest', '-s', s, '-w'], { encoding: 'utf8' }).trim();
const b64url = (b) => Buffer.from(b).toString('base64url');

function token() {
  const key = createPrivateKey(Buffer.from(kc('calmforest-asc-p8'), 'base64').toString('utf8'));
  const head = { alg: 'ES256', kid: kc('calmforest-asc-key-id'), typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iss: kc('calmforest-asc-issuer'), iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const input = `${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(body))}`;
  const sig = sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(sig)}`;
}

export async function asc(method, path, body) {
  const res = await fetch('https://api.appstoreconnect.apple.com' + path, {
    method, headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) throw Object.assign(new Error(`ASC ${method} ${path} → ${res.status}: ${text.slice(0, 600)}`), { status: res.status, json });
  return json;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [method = 'GET', path, body] = process.argv.slice(2);
  asc(method, path, body).then(j => console.log(JSON.stringify(j, null, 2))).catch(e => { console.error(e.message); process.exit(1); });
}
