import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODAL_PRIORITY, MODAL_GAP_MS, enqueueModal, nextModal, createModalQueue } from '../js/guide/modal-queue.js';
import { NUDGE_QUIET_MS, startNudgeClock, nudgeAllowed, noteNudge } from '../js/guide/nudge-cap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function harness(opts = {}) {
  let t = 0;
  const due = [];
  const q = createModalQueue({ now: () => t, schedule: (fn, ms) => due.push({ at: t + ms, fn }), ...opts });
  const advance = (ms) => {
    const end = t + ms;
    for (;;) {
      due.sort((a, b) => a.at - b.at);
      if (!due.length || due[0].at > end) break;
      const next = due.shift();
      t = next.at;
      next.fn();
    }
    t = end;
  };
  return { q, advance, now: () => t };
}

test('priority runs story first and login nudge last', () => {
  const kinds = ['story', 'daily', 'result', 'giftBox', 'promo', 'affinity', 'neighbor', 'push', 'nudge'];
  const ranks = kinds.map(k => MODAL_PRIORITY[k]);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => b - a));
  const items = ['nudge', 'push', 'story', 'daily'].reduce((acc, kind) => enqueueModal(acc, { kind }), []);
  assert.equal(nextModal(items, { blocked: false, clearFor: MODAL_GAP_MS }).kind, 'story');
});

test('nothing runs while blocked or before the gap', () => {
  const items = enqueueModal([], { kind: 'push' });
  assert.equal(nextModal(items, { blocked: true, clearFor: 1e9 }), null);
  assert.equal(nextModal(items, { blocked: false, clearFor: MODAL_GAP_MS - 1 }), null);
});

test('same key queued twice runs once and the queue is never mutated', () => {
  const a = enqueueModal([], { kind: 'nudge', key: 'nudge' });
  const b = enqueueModal(a, { kind: 'nudge', key: 'nudge' });
  assert.equal(b, a);
  assert.equal(b.length, 1);
  assert.throws(() => { a.push(1); });
});

test('an item that is not ready lets lower ones pass', () => {
  const items = [{ kind: 'story', ready: () => false }, { kind: 'push' }].reduce(enqueueModal, []);
  assert.equal(nextModal(items, { blocked: false, clearFor: MODAL_GAP_MS }).kind, 'push');
});

test('the tutorial blocks with no time cap and the queue flushes when it ends', () => {
  const { q, advance } = harness();
  let tutorial = true;
  const shown = [];
  q.addGate(() => tutorial);
  q.request({ kind: 'nudge', show: () => shown.push('nudge') });
  q.request({ kind: 'promo', show: () => shown.push('promo') });
  advance(30 * 60 * 1000);
  assert.deepEqual(shown, []);
  tutorial = false;
  q.flush();
  advance(MODAL_GAP_MS + 400);
  assert.deepEqual(shown, ['promo']);
});

test('one modal at a time with a gap after the last one closes', () => {
  const { q, advance } = harness();
  let open = null;
  const shown = [];
  q.addGate(() => !!open);
  q.request({ kind: 'push', show: () => { shown.push('push'); open = 'push'; } });
  q.request({ kind: 'daily', show: () => { shown.push('daily'); open = 'daily'; } });
  advance(MODAL_GAP_MS + 400);
  assert.deepEqual(shown, ['daily']);
  advance(60000);
  assert.deepEqual(shown, ['daily']);
  open = null;
  advance(MODAL_GAP_MS - 300);
  assert.deepEqual(shown, ['daily']);
  advance(800);
  assert.deepEqual(shown, ['daily', 'push']);
  assert.equal(q.pending(), false);
});

test('pending(kind) reports only that kind', () => {
  const { q } = harness();
  q.addGate(() => true);
  q.request({ kind: 'nudge', show: () => {} });
  assert.equal(q.pending('story'), false);
  assert.equal(q.pending('nudge'), true);
  assert.equal(q.pending(), true);
});

test('turn() holds the queue until the caller releases it', async () => {
  const { q, advance } = harness();
  const shown = [];
  const turn = q.turn('promo');
  q.request({ kind: 'nudge', show: () => shown.push('nudge') });
  advance(MODAL_GAP_MS + 400);
  const release = await turn;
  advance(10000);
  assert.deepEqual(shown, []);
  release();
  await new Promise(r => setImmediate(r));
  advance(MODAL_GAP_MS + 400);
  assert.deepEqual(shown, ['nudge']);
});

test('a hold that is never released expires', async () => {
  const { q, advance } = harness({ holdMs: 5000 });
  const shown = [];
  q.turn('promo');
  q.request({ kind: 'nudge', show: () => shown.push('nudge') });
  advance(MODAL_GAP_MS + 400);
  advance(5000 + MODAL_GAP_MS + 400);
  assert.deepEqual(shown, ['nudge']);
});

test('a throwing gate or show does not stop the queue', () => {
  const { q, advance } = harness();
  const shown = [];
  q.addGate(() => { throw new Error('x'); });
  q.request({ kind: 'story', show: () => { throw new Error('y'); } });
  q.request({ kind: 'push', show: () => shown.push('push') });
  advance(3 * (MODAL_GAP_MS + 400));
  assert.deepEqual(shown, ['push']);
});

test('login nudge: one in the first 14 minutes, then the old rules', () => {
  const t0 = 1_000_000;
  const fresh = startNudgeClock(null, t0);
  assert.deepEqual(fresh, { first: t0, shown: 0 });
  assert.equal(startNudgeClock(fresh, t0 + 5), fresh);
  assert.equal(nudgeAllowed(fresh, t0 + 60_000), true);
  const once = noteNudge(fresh, t0 + 94_000);
  assert.deepEqual(once, { first: t0, shown: 1 });
  assert.equal(nudgeAllowed(once, t0 + 5 * 60_000), false);
  assert.equal(nudgeAllowed(once, t0 + NUDGE_QUIET_MS - 1), false);
  assert.equal(nudgeAllowed(once, t0 + NUDGE_QUIET_MS), true);
  assert.equal(NUDGE_QUIET_MS, 14 * 60 * 1000);
  assert.equal(nudgeAllowed(null, t0), true);
});

test('automatic modals go through the queue and the 120 s caps are gone', () => {
  assert.doesNotMatch(read('../js/signup-gift/index.js'), /maxMs|whenIdle/);
  assert.doesNotMatch(read('../js/promo-gift/index.js'), /maxMs|whenIdle/);
  assert.match(read('../js/signup-gift/index.js'), /modalQueue\.request\(\{ kind: 'giftBox'/);
  assert.match(read('../js/signup-gift/index.js'), /queueLoginNudge\(trigger, ui\)/);
  assert.match(read('../js/promo-gift/index.js'), /modalQueue\.turn\('promo'\)/);
  assert.match(read('../js/push-ui.js'), /modalQueue\.request\(\{ kind: 'push', key: 'push'/);
  assert.match(read('../js/spaces/farm-auto.js'), /modalQueue\.request\(\{ kind: 'result'/);
  assert.match(read('../js/spaces/night-visit.js'), /modalQueue\.request\(\{ kind: 'result'/);
  assert.match(read('../js/spaces/neighbor.js'), /modalQueue\.request\(\{ kind: 'neighbor'/);
  assert.doesNotMatch(read('../js/spaces/e1-start.js'), /nudgeWaiting/);
  const game = read('../js/game.js');
  assert.match(game, /queueLoginNudge\('dex' \+ total, ui\)/);
  assert.match(game, /modalQueue\.request\(\{ kind: 'daily'/);
  assert.match(game, /modalQueue\.request\(\{ kind: 'story'/);
  assert.match(game, /modalQueue\.addGate\(/);
  const html = read('../index.html');
  assert.match(html, /modalQueue\.request\(\{ kind: 'affinity'/);
  assert.match(html, /modalQueue\.addGate\(/);
  const end = html.slice(html.indexOf('function endCoach('), html.indexOf('// 좌측 상단 로그인 상태 표시'));
  assert.match(end, /modalQueue\.flush\(\)/);
});
