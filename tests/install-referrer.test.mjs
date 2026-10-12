// 📲 Play Install Referrer → 설치 채널 귀속 (js/install-referrer.js · js/install-referrer-boot.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseInstallReferrer, attributionFromNative, installUserProps, parseStoredAttribution,
  INSTALL_STORE_KEY,
} from '../js/install-referrer.js';
import { bootInstallReferrer, syncInstallAttribution, cachedInstallAttribution } from '../js/install-referrer-boot.js';

// ── 파싱 ──────────────────────────────────────────────
test('홍보 링크 referrer — utm 세 값을 읽는다', () => {
  assert.deepEqual(
    parseInstallReferrer('utm_source=instagram&utm_medium=social&utm_campaign=play_launch'),
    { source: 'instagram', medium: 'social', campaign: 'play_launch' });
});

test('URL 인코딩된 채로 와도 읽는다(링크의 referrer= 값을 한 번 더 인코딩한 경우)', () => {
  assert.deepEqual(
    parseInstallReferrer('utm_source%3Dthreads%26utm_medium%3Dsocial%26utm_campaign%3Dplay_launch'),
    { source: 'threads', medium: 'social', campaign: 'play_launch' });
});

test('비었거나 구글 기본 referrer 는 organic', () => {
  const organic = { source: 'organic', medium: 'organic', campaign: '(none)' };
  assert.deepEqual(parseInstallReferrer(''), organic);
  assert.deepEqual(parseInstallReferrer(null), organic);
  assert.deepEqual(parseInstallReferrer('utm_source=google-play&utm_medium=organic'), organic);
  assert.deepEqual(parseInstallReferrer('utm_source=(not%20set)&utm_medium=(not%20set)'), organic);
});

test('utm_source 가 없는 referrer(예: gclid 만)는 organic 이 아니라 unknown', () => {
  assert.deepEqual(parseInstallReferrer('gclid=abc123'),
    { source: 'unknown', medium: '(none)', campaign: '(none)' });
});

test('source 만 있으면 medium·campaign 은 (none)', () => {
  assert.deepEqual(parseInstallReferrer('utm_source=kakao'),
    { source: 'kakao', medium: '(none)', campaign: '(none)' });
});

test('값은 소문자·안전 문자·36자로 정리한다(GA4 사용자 속성 값 36자 한도)', () => {
  const r = parseInstallReferrer('utm_source=Instagram%20Story&utm_campaign=' + 'x'.repeat(80) + '<script>');
  assert.equal(r.source, 'instagram_story');
  assert.equal(r.campaign.length, 36);
  assert.match(r.campaign, /^[a-z0-9_.-]+$/);
});

// ── 네이티브 응답 → 귀속 ──────────────────────────────
test('네이티브 ok → referrer 파싱 + 원문·시각 보존', () => {
  const a = attributionFromNative({ status: 'ok', referrer: 'utm_source=littly&utm_medium=bio', clickTs: 100, installTs: 200 });
  assert.equal(a.source, 'littly'); assert.equal(a.medium, 'bio'); assert.equal(a.campaign, '(none)');
  assert.equal(a.raw, 'utm_source=littly&utm_medium=bio');
  assert.equal(a.clickTs, 100); assert.equal(a.installTs, 200);
  assert.equal(a.status, 'ok');
});

test('미지원 기기(FEATURE_NOT_SUPPORTED) → unknown 으로 확정', () => {
  const a = attributionFromNative({ status: 'unsupported' });
  assert.equal(a.source, 'unknown'); assert.equal(a.status, 'unsupported');
});

test('기존 설치(첫 읽기보다 24시간 이상 먼저 설치) → preexisting — 업데이트로 처음 읽은 옛 사용자를 organic 에 섞지 않는다', () => {
  const now = 1_800_000_000_000;
  const old = attributionFromNative({ status: 'ok', referrer: '', firstInstallMs: now - 3 * 86400_000 }, now);
  assert.equal(old.source, 'preexisting'); assert.equal(old.medium, '(none)'); assert.equal(old.campaign, '(none)');
  const fresh = attributionFromNative({ status: 'ok', referrer: 'utm_source=kakao', firstInstallMs: now - 3600_000 }, now);
  assert.equal(fresh.source, 'kakao');
  const unknownTime = attributionFromNative({ status: 'ok', referrer: 'utm_source=kakao', firstInstallMs: 0 }, now);   // 디버그 테스트 referrer 등
  assert.equal(unknownTime.source, 'kakao');
});

test('일시 장애(SERVICE_UNAVAILABLE)·오류 → null(다음 실행에서 다시 읽는다)', () => {
  assert.equal(attributionFromNative({ status: 'unavailable' }), null);
  assert.equal(attributionFromNative({ status: 'error' }), null);
  assert.equal(attributionFromNative(null), null);
});

test('원문은 500자로 자른다', () => {
  const a = attributionFromNative({ status: 'ok', referrer: 'utm_source=a&x=' + 'y'.repeat(900) });
  assert.equal(a.raw.length, 500);
});

// ── GA4 사용자 속성 ──────────────────────────────────
test('사용자 속성 — install_source · install_campaign 두 개만', () => {
  assert.deepEqual(installUserProps({ source: 'instagram', medium: 'social', campaign: 'play_launch' }),
    { install_source: 'instagram', install_campaign: 'play_launch' });
  assert.deepEqual(installUserProps(null), {});
});

// ── 저장 형식 ────────────────────────────────────────
test('저장 값 파싱 — 깨졌거나 source 없으면 null', () => {
  assert.equal(parseStoredAttribution('nope'), null);
  assert.equal(parseStoredAttribution('{"medium":"x"}'), null);
  assert.equal(parseStoredAttribution('[]'), null);
  const v = parseStoredAttribution(JSON.stringify({ source: 'kakao', medium: 'm', campaign: 'c', synced: ['u1'], ga: true }));
  assert.equal(v.source, 'kakao'); assert.deepEqual(v.synced, ['u1']); assert.equal(v.ga, true);
});

// ── 부팅 바인딩 ──────────────────────────────────────
function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
}

test('첫 실행: 네이티브에서 읽어 저장 · GA4 이벤트 1회 · 사용자 속성 갱신', async () => {
  const storage = memStorage();
  const events = []; const props = [];
  const plugin = { get: async () => ({ status: 'ok', referrer: 'utm_source=instagram&utm_medium=social&utm_campaign=play_launch', clickTs: 1, installTs: 2 }) };
  const a = await bootInstallReferrer({ plugin, storage, track: (n, p) => events.push([n, p]), setUserProps: p => props.push(p) });
  assert.equal(a.source, 'instagram');
  assert.deepEqual(events, [['install_attribution', { install_source: 'instagram', install_medium: 'social', install_campaign: 'play_launch' }]]);
  assert.deepEqual(props, [{ install_source: 'instagram', install_campaign: 'play_launch' }]);
  assert.equal(JSON.parse(storage.getItem(INSTALL_STORE_KEY)).source, 'instagram');
  assert.equal(cachedInstallAttribution(storage).source, 'instagram');
});

test('재실행: 저장된 값이 있으면 네이티브를 부르지 않고 이벤트도 다시 쏘지 않는다', async () => {
  const storage = memStorage({ [INSTALL_STORE_KEY]: JSON.stringify({ source: 'kakao', medium: '(none)', campaign: '(none)', ga: true }) });
  let called = 0; const events = [];
  const a = await bootInstallReferrer({ plugin: { get: async () => { called++; return {}; } }, storage, track: (n) => events.push(n), setUserProps: () => {} });
  assert.equal(a.source, 'kakao'); assert.equal(called, 0); assert.deepEqual(events, []);
});

test('일시 장애면 저장하지 않는다 — 다음 실행에서 다시 시도', async () => {
  const storage = memStorage(); const events = [];
  const a = await bootInstallReferrer({ plugin: { get: async () => ({ status: 'unavailable' }) }, storage, track: (n) => events.push(n), setUserProps: () => {} });
  assert.equal(a, null); assert.equal(storage.getItem(INSTALL_STORE_KEY), null); assert.deepEqual(events, []);
});

test('플러그인이 없거나(구버전 앱) 던져도 게임을 막지 않는다', async () => {
  const storage = memStorage();
  assert.equal(await bootInstallReferrer({ plugin: undefined, storage, track: () => {}, setUserProps: () => {} }), null);
  assert.equal(await bootInstallReferrer({ plugin: { get: async () => { throw new Error('x'); } }, storage, track: () => {}, setUserProps: () => {} }), null);
});

test('네이티브가 응답하지 않으면 타임아웃 후 null', async () => {
  const storage = memStorage();
  const a = await bootInstallReferrer({ plugin: { get: () => new Promise(() => {}) }, storage, track: () => {}, setUserProps: () => {}, timeoutMs: 20 });
  assert.equal(a, null);
});

// ── Supabase 동기화(계정이 바뀌어도 살아남게 — 계정마다 1행) ──────
test('온라인 계정마다 한 번씩 넣는다 — 게스트 → 정식 계정으로 바뀌면 새 계정도 넣는다', async () => {
  const storage = memStorage({ [INSTALL_STORE_KEY]: JSON.stringify({ source: 'threads', medium: 'social', campaign: 'play_launch', raw: 'r', ga: true }) });
  const rows = [];
  const insert = async (row) => { rows.push(row); return { ok: true }; };
  await syncInstallAttribution({ auth: { online: true, userId: 'anon-1', clientId: 'c1' }, storage, insert });
  await syncInstallAttribution({ auth: { online: true, userId: 'anon-1', clientId: 'c1' }, storage, insert });   // 같은 계정 — 다시 안 넣는다
  await syncInstallAttribution({ auth: { online: true, userId: 'pgs-9', clientId: 'c1' }, storage, insert });
  assert.deepEqual(rows.map(r => r.user_id), ['anon-1', 'pgs-9']);
  assert.equal(rows[0].source, 'threads'); assert.equal(rows[0].client_id, 'c1'); assert.equal(rows[0].raw_referrer, 'r');
  assert.deepEqual(JSON.parse(storage.getItem(INSTALL_STORE_KEY)).synced, ['anon-1', 'pgs-9']);
});

test('같은 계정으로 동시에 두 번 불려도 한 번만 넣는다(콜백 연타)', async () => {
  const storage = memStorage({ [INSTALL_STORE_KEY]: JSON.stringify({ source: 'kakao', medium: '(none)', campaign: '(none)' }) });
  let n = 0; const insert = async () => { n++; await new Promise(r => setTimeout(r, 5)); return { ok: true }; };
  const auth = { online: true, userId: 'u', clientId: 'c' };
  await Promise.all([syncInstallAttribution({ auth, storage, insert }), syncInstallAttribution({ auth, storage, insert })]);
  assert.equal(n, 1);
});

test('오프라인·귀속 없음·실패면 synced 에 남기지 않는다(다음 기회에 재시도)', async () => {
  const storage = memStorage();
  let n = 0; const insert = async () => { n++; return { ok: false }; };
  await syncInstallAttribution({ auth: { online: true, userId: 'u', clientId: 'c' }, storage, insert });   // 귀속 없음
  assert.equal(n, 0);
  storage.setItem(INSTALL_STORE_KEY, JSON.stringify({ source: 'kakao', medium: '(none)', campaign: '(none)' }));
  await syncInstallAttribution({ auth: { online: false, userId: 'local', clientId: 'c' }, storage, insert });   // 오프라인
  assert.equal(n, 0);
  await syncInstallAttribution({ auth: { online: true, userId: 'u', clientId: 'c' }, storage, insert });    // 실패
  assert.equal(n, 1);
  assert.equal(JSON.parse(storage.getItem(INSTALL_STORE_KEY)).synced, undefined);
});
