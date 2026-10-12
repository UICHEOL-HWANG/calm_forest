// 🔔 푸시 cron — 후보 조회 → 판정 → 발송(예산 안에서) → 원장·표시 일괄 기록
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { runPush, PUSH_BUDGET } from '../functions/push-cron.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ project_id: 'demo-proj', client_email: 'p@demo.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const NOW = Date.parse('2026-10-13T11:10:00Z');   // KST 20:10
const env = (o = {}) => ({ SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', FCM_SA_KEY: SA,
  NIGHT_SEED_SECRET: 'test-secret', CARDNEWS: { get: async () => 'ya29.cached', put: async () => {} }, ...o });

const away = d => new Date(NOW - d * 86400000).toISOString();
const row = (token, o = {}) => ({ token, user_id: `u-${token}`, lang: 'ko', updated_at: away(4),
  plots: [{ x: 0, z: 0, state: 'growing' }], outdoor: [], truce: null, night_last: null,
  craft: { slots: [] }, returns_7d: 0, ...o });

function fakeFetch(rows, fcm = () => new Response('{}')) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
    if (String(url).endsWith('/rest/v1/rpc/push_candidates')) return new Response(JSON.stringify(rows));
    if (String(url).includes('fcm.googleapis.com')) return fcm(JSON.parse(init.body).message.token);
    return new Response(null, { status: 204 });
  };
  return { fn, calls };
}

test('설정이 없으면 조용히 건너뛴다(fetch 0회)', async () => {
  const f = fakeFetch([]);
  assert.equal((await runPush(env({ FCM_SA_KEY: undefined }), { now: NOW, fetch: f.fn })).skipped, 'not-configured');
  assert.equal(f.calls.length, 0);
});

test('보낼 사람에게만 보내고, 판정한 토큰은 전부 표시한다', async () => {
  const rows = [row('t-return-aaaaaaaaaaaaaaaa'), row('t-quiet-bbbbbbbbbbbbbbbbb', { updated_at: away(1) })];
  const f = fakeFetch(rows);
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.deepEqual({ sent: r.sent, checked: r.checked }, { sent: 1, checked: 2 });

  const cand = f.calls.find(c => c.url.endsWith('rpc/push_candidates'));
  assert.equal(cand.body.p_today, '2026-10-13');
  const send = f.calls.filter(c => c.url.includes('fcm.googleapis.com'));
  assert.equal(send.length, 1);
  const msg = send[0].body.message;
  assert.equal(msg.notification.title, '🍓 수확할 게 생겼을지도 몰라요');
  assert.equal(msg.data.kind, 'return');
  assert.match(msg.data.send_id, /^[0-9a-f-]{36}$/);

  const logs = f.calls.find(c => c.url.endsWith('/rest/v1/push_logs')).body;
  assert.deepEqual(logs.map(l => [l.user_id, l.kind, l.status, l.sent_on]), [['u-t-return-aaaaaaaaaaaaaaaa', 'return', 'sent', '2026-10-13']]);
  assert.equal(logs[0].id, msg.data.send_id, 'GA4 push_open 과 조인할 키');
  const mark = f.calls.find(c => c.url.endsWith('rpc/push_mark')).body;
  assert.deepEqual(mark, { p_today: '2026-10-13', p_checked: rows.map(x => x.token), p_dead: [] });
});

test('400 은 표시(재시도 안 함), 401·403 은 설정 오류라 tick 을 멈추고 아무도 표시하지 않는다', async () => {
  const rows = [row('t-bad-ffffffffffffffffffffff')];
  let f = fakeFetch(rows, () => new Response('{}', { status: 400 }));
  await runPush(env(), { now: NOW, fetch: f.fn });
  assert.deepEqual(f.calls.find(c => c.url.endsWith('rpc/push_mark')).body.p_checked, ['t-bad-ffffffffffffffffffffff']);
  f = fakeFetch([row('t-a-gggggggggggggggggggggggg'), row('t-b-hhhhhhhhhhhhhhhhhhhhhhhh')], () => new Response('{}', { status: 403 }));
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.equal(r.error, 'fcm-auth');
  assert.equal(f.calls.filter(c => c.url.includes('fcm.googleapis.com')).length, 1, '첫 403 에서 멈춘다');
  assert.deepEqual(f.calls.find(c => c.url.endsWith('rpc/push_mark')).body.p_checked, []);
});

test('한 행이 터져도 앞서 보낸 사람은 표시된다(하루 두 통 방지)', async () => {
  const rows = [row('t-ok-iiiiiiiiiiiiiiiiiiiiiii'), row('t-boom-jjjjjjjjjjjjjjjjjjjjj', { craft: { slots: 'corrupt' } })   /* .filter 가 없어 판정 중 TypeError */];
  const f = fakeFetch(rows);
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.equal(r.sent, 1);
  assert.deepEqual(f.calls.find(c => c.url.endsWith('rpc/push_mark')).body.p_checked, ['t-ok-iiiiiiiiiiiiiiiiiiiiiii', 't-boom-jjjjjjjjjjjjjjjjjjjjj'],
    '터진 행도 표시해 매 tick 다시 터지지 않게');
});

test('죽은 토큰은 지우고, 일시 장애는 표시하지 않아 다음 tick 이 재시도한다', async () => {
  const rows = [row('t-dead-cccccccccccccccccccc'), row('t-flaky-ddddddddddddddddd')];
  const f = fakeFetch(rows, tok => tok.startsWith('t-dead')
    ? new Response(JSON.stringify({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 })
    : new Response('{}', { status: 503 }));
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.deepEqual({ sent: r.sent, dead: r.dead, failed: r.failed }, { sent: 0, dead: 1, failed: 1 });
  const mark = f.calls.find(c => c.url.endsWith('rpc/push_mark')).body;
  assert.deepEqual(mark.p_dead, ['t-dead-cccccccccccccccccccc']);
  assert.deepEqual(mark.p_checked, ['t-dead-cccccccccccccccccccc']);
});

test(`예산(${PUSH_BUDGET}통)을 넘으면 멈추고 남은 사람은 표시하지 않는다`, async () => {
  const rows = Array.from({ length: PUSH_BUDGET + 5 }, (_, i) => row(`t-${String(i).padStart(24, '0')}`));
  const f = fakeFetch(rows);
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.equal(r.sent, PUSH_BUDGET);
  assert.equal(f.calls.find(c => c.url.endsWith('rpc/push_mark')).body.p_checked.length, PUSH_BUDGET);
  assert.ok(f.calls.length <= 50, `Workers 무료 subrequest 50 — 실제 ${f.calls.length}`);
});

test('🦝 밤손님 — 내일 날짜 판정이 visited 인 사람에게 예고', async () => {
  // 이 secret·uid 로 2026-10-14 에 오는 사람을 찾는다(결정적)
  const { judgeNight } = await import('../functions/api/_night-judge.js');
  let uid = null;
  for (let i = 0; i < 50 && !uid; i++) {
    const v = await judgeNight({ secret: 'test-secret', uid: `u-n${i}`, date: '2026-10-14', plotCount: 1, scarecrow: false, fence: false });
    if (v.visited) uid = `u-n${i}`;
  }
  assert.ok(uid);
  const rows = [{ ...row('t-night-eeeeeeeeeeeeeeeeee', { updated_at: away(0.2), night_last: '2026-10-13' }), user_id: uid }];   // 오늘 접속한 사람
  const f = fakeFetch(rows);
  const r = await runPush(env(), { now: NOW, fetch: f.fn });
  assert.equal(r.sent, 1);
  assert.equal(f.calls.find(c => c.url.includes('fcm')).body.message.data.kind, 'night');
});

test('cron 분 분기 — 0·20·40 은 ai-pregen(9회 그대로), 10·30·50 은 푸시', async () => {
  const { isPushTick } = await import('../functions/push-cron.js');
  const at = m => Date.parse(`2026-10-13T11:${String(m).padStart(2, '0')}:00Z`);
  assert.deepEqual([0, 10, 20, 30, 40, 50].map(m => isPushTick(at(m))), [false, true, false, true, false, true]);
  const { readFileSync } = await import('node:fs');
  const w = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(w, /if \(isPushTick\(event\.scheduledTime\)\)/);
});
