import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOutbox, createShipper, flushDelay, OUTBOX_KEY } from '../js/log-shipper.js';

// 스펙: dev/active/sensor-log-durability/sensor-log-durability-plan.md

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
const ME = 'aaaaaaaa-0000-4000-8000-000000000001';
const OLD = 'bbbbbbbb-0000-4000-8000-000000000002';
let seq = 0;
const row = (o = {}) => ({ client_row_id: `r${++seq}`, user_id: ME, session_id: 's1', char_x: 1, ...o });

function rig(over = {}) {
  let t = 1_000_000;
  const storage = over.storage || memStorage();
  const outbox = createOutbox({ storage, now: () => t, persistEveryMs: 1500, max: over.max ?? 3000 });
  const posts = [];
  let result = true;
  const shipper = createShipper({
    outbox,
    post: async (rows, opts) => { posts.push({ rows, opts }); return typeof result === 'function' ? result(rows, opts) : result; },
    getAuth: () => over.auth ?? { uid: ME, token: 'tok-me', exp: 1_000_000 + 3600_000 },
    maxRows: over.maxRows ?? 200,
    maxBytes: over.maxBytes ?? 48 * 1024,
    now: () => t,
  });
  return { outbox, shipper, posts, storage, tick: ms => { t += ms; }, setResult: r => { result = r; } };
}

// ── 주기 ──
test('전송 주기는 5초 → 15초 → 그 뒤로 30초(바로 나간 유저도 남게)', () => {
  assert.deepEqual([0, 1, 2, 3, 9].map(flushDelay), [5000, 15000, 30000, 30000, 30000]);
});

// ── outbox: 저장·복원 ──
test('넣은 행은 1.5초마다 모아 저장한다(매 샘플마다 쓰지 않는다)', () => {
  const { outbox, storage, tick } = rig();
  outbox.add(row());
  outbox.persistIfDue();
  const first = storage.getItem(OUTBOX_KEY);
  outbox.add(row());
  outbox.persistIfDue();                      // 1.5초 안 지남 — 안 씀
  assert.equal(JSON.parse(storage.getItem(OUTBOX_KEY)).rows.length, JSON.parse(first).rows.length);
  tick(1500);
  outbox.persistIfDue();
  assert.equal(JSON.parse(storage.getItem(OUTBOX_KEY)).rows.length, 2);
});

test('앱을 다시 켜면 못 보낸 행이 그대로 돌아온다(크래시 대비)', () => {
  const storage = memStorage();
  const a = rig({ storage });
  a.outbox.add(row({ client_row_id: 'keep-me' }));
  a.outbox.persistNow();
  const b = rig({ storage });
  assert.deepEqual(b.outbox.peek(10).map(r => r.client_row_id), ['keep-me']);
});

test('저장 상한을 넘으면 오래된 것부터 버린다', () => {
  const { outbox } = rig({ max: 3 });
  for (let i = 0; i < 5; i++) outbox.add(row({ client_row_id: `m${i}` }));
  assert.deepEqual(outbox.peek(10).map(r => r.client_row_id), ['m2', 'm3', 'm4']);
});

test('저장소가 깨졌거나 막혀도 던지지 않는다(메모리로 계속)', () => {
  assert.doesNotThrow(() => rig({ storage: memStorage({ [OUTBOX_KEY]: '{oops' }) }));
  const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} };
  const { outbox } = rig({ storage: blocked });
  assert.doesNotThrow(() => { outbox.add(row()); outbox.persistNow(); });
  assert.equal(outbox.size(), 1);
});

// ── 전송 ──
test('보낸 뒤 서버가 받으면 지우고, 실패하면 남긴다(같은 id 로 다시 — DB 가 중복을 무시)', async () => {
  const { outbox, shipper, posts, setResult } = rig();
  outbox.add(row({ client_row_id: 'x1' }));
  setResult(false);
  await shipper.flush();
  assert.equal(outbox.size(), 1);
  setResult(true);
  await shipper.flush();
  assert.equal(outbox.size(), 0);
  assert.deepEqual(posts.map(p => p.rows[0].client_row_id), ['x1', 'x1']);
});

test("서버가 '버려라'(400·403)면 지운다 — 영영 못 들어가는 행이 대기열을 막지 않게", async () => {
  const { outbox, shipper, setResult } = rig();
  outbox.add(row());
  setResult('drop');
  await shipper.flush();
  assert.equal(outbox.size(), 0);
});

test('나갈 때는 keepalive 로 보낸다', async () => {
  const { outbox, shipper, posts } = rig();
  outbox.add(row());
  await shipper.flush({ keepalive: true });
  assert.equal(posts[0].opts.keepalive, true);
  assert.equal(posts[0].opts.token, 'tok-me');
});

test('한 번에 maxRows 행까지만, 바이트 상한을 넘으면 더 잘게', async () => {
  const { outbox, shipper, posts } = rig({ maxRows: 5, maxBytes: 600 });
  for (let i = 0; i < 12; i++) outbox.add(row({ pad: 'x'.repeat(100) }));
  await shipper.flush();
  assert.ok(posts[0].rows.length <= 5);
  assert.ok(new TextEncoder().encode(JSON.stringify(posts[0].rows)).length <= 600);
  assert.ok(outbox.size() > 0);
});

test('동시에 두 번 보내지 않는다(30초 타이머와 나갈 때가 겹쳐도)', async () => {
  const { outbox, shipper, posts, setResult } = rig();
  let release;
  setResult(() => new Promise(r => { release = () => r(true); }));
  outbox.add(row());
  const a = shipper.flush();
  const b = await shipper.flush({ keepalive: true });
  assert.equal(b, false);
  release(); await a;
  assert.equal(posts.length, 1);
});

test('로그인 전(uid 없음)에 찍힌 행은 로그인 뒤 현재 uid 로 채워 보낸다', async () => {
  const { outbox, shipper, posts } = rig();
  outbox.add(row({ user_id: null }));
  await shipper.flush();
  assert.equal(posts[0].rows[0].user_id, ME);
});

test('아직 아무 로그인도 없으면 보내지 않고 기다린다', async () => {
  const { outbox, shipper, posts } = rig({ auth: { uid: null, token: null } });
  outbox.add(row({ user_id: null }));
  await shipper.flush();
  assert.equal(posts.length, 0);
  assert.equal(outbox.size(), 1);
});

// ── 게스트: 새로고침하면 새 익명 계정 ──
test('이전 계정의 행은 그 계정 토큰이 살아 있으면 그 토큰으로 보낸다', async () => {
  const { outbox, shipper, posts, tick } = rig();
  outbox.setToken(OLD, 'tok-old', 1_000_000 + 3600_000);
  outbox.add(row({ user_id: OLD, client_row_id: 'old1' }));
  outbox.add(row({ user_id: ME, client_row_id: 'me1' }));
  tick(1000);
  await shipper.flush();
  await shipper.flush();
  const byToken = Object.fromEntries(posts.map(p => [p.opts.token, p.rows.map(r => r.client_row_id)]));
  assert.deepEqual(byToken, { 'tok-old': ['old1'], 'tok-me': ['me1'] });
  assert.ok(posts.every(p => p.rows.every(r => r.user_id === (p.opts.token === 'tok-old' ? OLD : ME))));
});

test('이전 계정 토큰이 만료됐으면 그 행은 버린다(RLS 가 어차피 거절 — 대기열을 막지 않게)', async () => {
  const { outbox, shipper, posts, tick } = rig();
  outbox.setToken(OLD, 'tok-old', 1_000_000 + 10_000);
  outbox.add(row({ user_id: OLD }));
  outbox.add(row({ user_id: ME, client_row_id: 'me1' }));
  tick(60_000);
  await shipper.flush();
  assert.equal(outbox.size(), 0);
  assert.deepEqual(posts.map(p => p.rows.map(r => r.client_row_id)), [['me1']]);
});

test('토큰은 저장소에도 남아 재실행 뒤에 쓸 수 있다', () => {
  const storage = memStorage();
  const a = rig({ storage });
  a.outbox.setToken(OLD, 'tok-old', 1_000_000 + 3600_000);
  a.outbox.persistNow();
  const b = rig({ storage });
  assert.equal(b.outbox.tokenFor(OLD), 'tok-old');
});

// ── 연결(소스 확인 — logger·metrics 는 브라우저 전역을 써서 Node 에서 import 하지 않는다) ──
import { readFileSync } from 'node:fs';
const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');

test('logger: 나갈 때(hidden·pagehide) 먼저 기기에 저장하고 keepalive 로 보낸다', () => {
  const s = src('logger.js');
  assert.match(s, /visibilitychange/);
  assert.match(s, /pagehide/);
  assert.match(s, /persistNow\(\);[^]*?flush\(\{ keepalive: true \}\)/);
  assert.doesNotMatch(s, /beforeunload/);
});

test('logger: 행에는 찍는 순간 client_row_id 와 맥락을 붙인다', () => {
  assert.match(src('logger.js'), /client_row_id: newRowId\(\), \.\.\.logRowContext\(\)/);
});

test('metrics: 세션 행은 시작 즉시 한 번 올린다', () => {
  assert.match(src('metrics.js'), /setTimeout\(\(\) => flushSummary\(false\), 0\)/);
});

test('supabase-client: game_logs 는 on_conflict=client_row_id + ignore-duplicates + keepalive', () => {
  const s = src('supabase-client.js');
  assert.match(s, /\?on_conflict=client_row_id/);
  assert.match(s, /resolution=ignore-duplicates/);
  assert.match(s, /keepalive,/);
});

// ── 리뷰 반영(2026-10-13) ──
test('나갈 때는 지금 계정 행부터 보낸다(이전 게스트 행이 앞에 있어도)', async () => {
  const { outbox, shipper, posts } = rig();
  outbox.setToken(OLD, 'tok-old', 1_000_000 + 3600_000);
  outbox.add(row({ user_id: OLD, client_row_id: 'old1' }));
  outbox.add(row({ user_id: ME, client_row_id: 'me1' }));
  await shipper.flush({ keepalive: true });
  assert.deepEqual(posts[0].rows.map(r => r.client_row_id), ['me1']);
});

test('지금 계정 토큰이 만료됐으면 보내지 않는다(401 헛요청 방지 — 갱신을 기다림)', async () => {
  const { outbox, shipper, posts } = rig({ auth: { uid: ME, token: 'tok-me', exp: 1_000_000 - 1 } });
  outbox.add(row());
  await shipper.flush();
  assert.equal(posts.length, 0);
  assert.equal(outbox.size(), 1);
});

test("이전 계정이 401('unauth')이면 그 계정 행을 버린다(대기열 앞을 막지 않게) — 지금 계정이면 남긴다", async () => {
  const a = rig();
  a.outbox.setToken(OLD, 'tok-old', 1_000_000 + 3600_000);
  a.outbox.add(row({ user_id: OLD }));
  a.setResult('unauth');
  await a.shipper.flush();
  assert.equal(a.outbox.size(), 0);
  const b = rig();
  b.outbox.add(row());
  b.setResult('unauth');
  await b.shipper.flush();
  assert.equal(b.outbox.size(), 1);
});

test('keepalive 묶음은 32KB 이하(브라우저 keepalive 합계 64KB 를 다른 요청과 나눠 쓴다)', async () => {
  const { outbox, shipper, posts } = rig();
  for (let i = 0; i < 200; i++) outbox.add(row({ pad: 'x'.repeat(300) }));
  await shipper.flush({ keepalive: true });
  assert.ok(new TextEncoder().encode(JSON.stringify(posts[0].rows)).length <= 32 * 1024);
});

test('보낸 뒤에도 많이 남았으면 이어서 보낸다(밀린 행 빨리 비우기)', async () => {
  const { outbox, shipper, posts } = rig({ maxRows: 5 });
  for (let i = 0; i < 12; i++) outbox.add(row());
  await shipper.drain(3);
  assert.equal(posts.length, 3);
  assert.equal(outbox.size(), 0);
});

// ── 여러 탭 · 로그아웃(2026-10-13) ──
function keyedStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
    key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}

test('탭마다 자기 키에 저장한다 — 다른 탭의 미전송 행을 덮어쓰지 않는다', () => {
  const storage = keyedStorage();
  const a = createOutbox({ storage, key: `${OUTBOX_KEY}:tabA` });
  const b = createOutbox({ storage, key: `${OUTBOX_KEY}:tabB` });
  a.add(row({ client_row_id: 'a1' })); a.persistNow();
  b.add(row({ client_row_id: 'b1' })); b.persistNow();
  assert.ok(storage.getItem(`${OUTBOX_KEY}:tabA`).includes('a1'));
  assert.ok(storage.getItem(`${OUTBOX_KEY}:tabB`).includes('b1'));
});

test('시작할 때 다른(끝난) 탭·옛 키에 남은 행을 데려와 보낸다', () => {
  const storage = keyedStorage({
    [OUTBOX_KEY]: JSON.stringify({ v: 1, rows: [row({ client_row_id: 'legacy' })], tokens: {} }),
    [`${OUTBOX_KEY}:dead`]: JSON.stringify({ v: 1, rows: [row({ client_row_id: 'dead1' })], tokens: { [OLD]: { t: 'tok-old', exp: 1_000_000 + 3600_000 } } }),
    unrelated: 'x',
  });
  const o = createOutbox({ storage, key: `${OUTBOX_KEY}:me`, now: () => 1_000_000 });
  o.adoptOrphans();
  assert.deepEqual(o.peek(10).map(r => r.client_row_id).sort(), ['dead1', 'legacy']);
  assert.equal(o.tokenFor(OLD), 'tok-old');
  assert.equal(storage.getItem(OUTBOX_KEY), null);
  assert.equal(storage.getItem(`${OUTBOX_KEY}:dead`), null);
  assert.equal(storage.getItem('unrelated'), 'x');
});

test('로그아웃하면 그 계정 행과 토큰을 기기에서 지운다(공용 기기)', () => {
  const { outbox, storage } = rig();
  outbox.setToken(ME, 'tok-me', 1_000_000 + 3600_000);
  outbox.add(row({ user_id: ME }));
  outbox.add(row({ user_id: OLD, client_row_id: 'keep' }));
  outbox.forget(ME);
  assert.deepEqual(outbox.peek(10).map(r => r.client_row_id), ['keep']);
  assert.equal(outbox.tokenFor(ME), null);
  assert.ok(!storage.getItem(OUTBOX_KEY).includes('tok-me'));
});

test('logger: 로그아웃 신호에 마지막으로 보내고 그 계정을 지운다 · 탭별 키', () => {
  const s = src('logger.js');
  assert.match(s, /cf:signout/);
  assert.match(s, /forget\(/);
  assert.match(s, /adoptOrphans\(\)/);
  assert.match(src('supabase-client.js'), /new CustomEvent\('cf:signout'/);
});
