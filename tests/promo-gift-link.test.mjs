import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { giftLinkTarget, onGiftRequestGet } from '../functions/invite-link.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('giftLinkTarget — /g/CODE 는 ?gift= 로, 나머지는 /', () => {
  assert.equal(giftLinkTarget('/g/autumn24'), '/?gift=AUTUMN24');
  assert.equal(giftLinkTarget('/g/AB'), '/');
  assert.equal(giftLinkTarget('/g/'), '/');
});

test('302 로 보내고 utm 은 남기고 gift 는 하나만', async () => {
  const r = await onGiftRequestGet({ request: new Request('https://calmforest.cloud/g/AUTUMN24?utm_source=meta&gift=EVIL') });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get('Location'));
  assert.deepEqual(loc.searchParams.getAll('gift'), ['AUTUMN24']);
  assert.equal(loc.searchParams.get('utm_source'), 'meta');
});

test('POST 는 405', async () => {
  const r = await onGiftRequestGet({ request: new Request('https://calmforest.cloud/g/AUTUMN24', { method: 'POST' }) });
  assert.equal(r.status, 405);
});

test('worker·AASA·안드 매니페스트가 /g/ 를 연다', () => {
  assert.match(read('../worker/index.js'), /if \(pathname\.startsWith\('\/g\/'\)\) return await giftLink\(\{ request \}\);/);
  const aasa = JSON.parse(read('../assets/well-known/apple-app-site-association'));
  assert.deepEqual(aasa.applinks.details[0].components, [{ '/': '/i/*' }, { '/': '/g/*' }]);
  assert.match(read('../android/app/src/main/AndroidManifest.xml'), /android:pathPrefix="\/g\/"/);
});
